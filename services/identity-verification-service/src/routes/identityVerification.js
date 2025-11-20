const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const IdentityVerification = require("../models/IdentityVerification");
const Verification = require("../models/Verification");
const User = require("../models/User");

// ========== USER ROUTES ==========

/**
 * POST /api/identity-verification/submit
 * Soumettre une demande de vérification d'identité
 */
router.post("/submit", auth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      nationality,
      idType,
      idNumber,
      idFrontImage,
      idBackImage,
      selfieImage,
      address,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !dateOfBirth || !idType || !idNumber || !idFrontImage || !selfieImage) {
      return res.status(400).json({
        message: "Tous les champs obligatoires doivent être remplis"
      });
    }

    // Vérifier si l'utilisateur a déjà une vérification en attente
    const existingVerification = await IdentityVerification.findOne({
      user: req.user.id,
      status: "pending"
    });

    if (existingVerification) {
      return res.status(400).json({
        message: "Vous avez déjà une demande de vérification en attente"
      });
    }

    // Créer la nouvelle vérification
    const verification = await IdentityVerification.create({
      user: req.user.id,
      firstName,
      lastName,
      dateOfBirth,
      nationality,
      idType,
      idNumber,
      idFrontImage,
      idBackImage,
      selfieImage,
      address,
      status: "pending",
      submittedAt: new Date(),
    });

    // Mettre à jour le statut de l'utilisateur
    await User.findByIdAndUpdate(req.user.id, {
      "verificationStatus.identitySubmitted": true
    });

    res.status(201).json({
      message: "Demande de vérification soumise avec succès",
      verification,
    });
  } catch (error) {
    console.error("Error submitting verification:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * GET /api/identity-verification/my-status
 * Récupérer le statut de vérification de l'utilisateur connecté
 */
router.get("/my-status", auth, async (req, res) => {
  try {
    const verification = await IdentityVerification.findOne({
      user: req.user.id
    }).sort({ createdAt: -1 });

    if (!verification) {
      return res.json({ status: "not_submitted" });
    }

    res.json({
      status: verification.status,
      verification,
    });
  } catch (error) {
    console.error("Error fetching verification status:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ========== ADMIN ROUTES ==========

/**
 * GET /api/identity-verification/admin/all
 * Récupérer toutes les demandes de vérification
 */
router.get("/admin/all", auth, isAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { verificationType: "identity" };
    if (status && status !== "all") {
      filter.status = status;
    }

    // Utiliser le model Verification au lieu de IdentityVerification
    const verifications = await Verification.find(filter)
      .populate("user", "fullName email avatar")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Pour chaque vérification d'identité, récupérer le selfie associé
    const verificationsWithSelfie = await Promise.all(
      verifications.map(async (verification) => {
        const selfie = await Verification.findOne({
          user: verification.user._id,
          verificationType: "selfie"
        }).sort({ createdAt: -1 });

        const verificationObj = verification.toObject();

        // Ajouter le selfie aux documents si il existe
        if (selfie && selfie.documents && selfie.documents.length > 0) {
          verificationObj.documents = [...verificationObj.documents, ...selfie.documents];
        }

        return verificationObj;
      })
    );

    const total = await Verification.countDocuments(filter);

    res.json({
      verifications: verificationsWithSelfie,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching verifications:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * GET /api/identity-verification/admin/:id
 * Récupérer les détails d'une vérification
 */
router.get("/admin/:id", auth, isAdmin, async (req, res) => {
  try {
    const verification = await Verification.findById(req.params.id)
      .populate("user", "fullName email avatar phoneNumber address");

    if (!verification) {
      return res.status(404).json({ message: "Vérification non trouvée" });
    }

    res.json({ verification });
  } catch (error) {
    console.error("Error fetching verification:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * PUT /api/identity-verification/admin/:id/approve
 * Approuver une vérification d'identité
 */
router.put("/admin/:id/approve", auth, isAdmin, async (req, res) => {
  try {
    const { notes } = req.body;

    const verification = await Verification.findById(req.params.id);
    if (!verification) {
      return res.status(404).json({ message: "Vérification non trouvée" });
    }

    if (verification.status !== "pending") {
      return res.status(400).json({
        message: "Cette vérification a déjà été traitée"
      });
    }

    // Mettre à jour la vérification
    verification.status = "verified";
    verification.verifiedAt = new Date();
    if (notes) verification.reviewNotes = notes;
    await verification.save();

    const updateData = {
      "verificationStatus.identity": true,
      isVerified: true,
    };

    // ✅ AMÉLIORATION : Chercher le selfie dans plusieurs endroits
    let selfieUrl = null;

    // 1. D'abord, chercher dans les documents de cette vérification même
    const selfieDoc = verification.documents?.find(doc => doc.type === "selfie");
    if (selfieDoc?.url) {
      selfieUrl = selfieDoc.url;
    }

    // 2. Si pas trouvé, chercher une vérification selfie séparée
    if (!selfieUrl) {
      const selfieVerification = await Verification.findOne({
        user: verification.user,
        verificationType: "selfie"
      }).sort({ createdAt: -1 });

      if (selfieVerification?.documents?.[0]?.url) {
        selfieUrl = selfieVerification.documents[0].url;
      }
    }

    // 3. Si un selfie est trouvé, mettre à jour l'avatar
    if (selfieUrl) {
      updateData.avatar = selfieUrl;
      console.log(`✅ Avatar mis à jour avec le selfie pour l'utilisateur ${verification.user}`);
    } else {
      console.log(`⚠️ Aucun selfie trouvé pour l'utilisateur ${verification.user}`);
    }

    // Mettre à jour le statut de l'utilisateur et récupérer les nouvelles données
    const updatedUser = await User.findByIdAndUpdate(
      verification.user,
      updateData,
      { new: true } // Retourne le document mis à jour
    );

    res.json({
      message: "Vérification approuvée avec succès",
      verification,
      user: {
        id: updatedUser._id,
        isVerified: updatedUser.isVerified,
        avatar: updatedUser.avatar
      }
    });
  } catch (error) {
    console.error("Error approving verification:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * PUT /api/identity-verification/admin/:id/reject
 * Rejeter une vérification d'identité
 */
router.put("/admin/:id/reject", auth, isAdmin, async (req, res) => {
  try {
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        message: "La raison du rejet est obligatoire"
      });
    }

    const verification = await Verification.findById(req.params.id);
    if (!verification) {
      return res.status(404).json({ message: "Vérification non trouvée" });
    }

    if (verification.status !== "pending") {
      return res.status(400).json({
        message: "Cette vérification a déjà été traitée"
      });
    }

    // Mettre à jour la vérification
    verification.status = "rejected";
    verification.rejectionReason = reason;
    if (notes) verification.reviewNotes = notes;
    await verification.save();

    // Mettre à jour le statut de l'utilisateur
    await User.findByIdAndUpdate(verification.user, {
      "verificationStatus.identity": false,
      isVerified: false,
    });

    res.json({
      message: "Vérification rejetée",
      verification,
    });
  } catch (error) {
    console.error("Error rejecting verification:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * PUT /api/identity-verification/admin/:id/request-resubmit
 * Demander une nouvelle soumission
 */
router.put("/admin/:id/request-resubmit", auth, isAdmin, async (req, res) => {
  try {
    const { notes } = req.body;

    const verification = await Verification.findById(req.params.id);
    if (!verification) {
      return res.status(404).json({ message: "Vérification non trouvée" });
    }

    verification.status = "resubmit_required";
    if (notes) verification.reviewNotes = notes;
    await verification.save();

    res.json({
      message: "Demande de nouvelle soumission envoyée",
      verification,
    });
  } catch (error) {
    console.error("Error requesting resubmit:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * GET /api/identity-verification/admin/stats
 * Statistiques des vérifications
 */
router.get("/admin/stats/summary", auth, isAdmin, async (req, res) => {
  try {
    const pending = await Verification.countDocuments({
      verificationType: "identity",
      status: "pending"
    });
    const approved = await Verification.countDocuments({
      verificationType: "identity",
      status: "verified"
    });
    const rejected = await Verification.countDocuments({
      verificationType: "identity",
      status: "rejected"
    });
    const resubmitRequired = await Verification.countDocuments({
      verificationType: "identity",
      status: "resubmit_required"
    });

    res.json({
      stats: {
        pending,
        approved,
        rejected,
        resubmitRequired,
        total: pending + approved + rejected + resubmitRequired,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
