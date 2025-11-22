const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const Coupon = require("../models/Coupon");
const Reservation = require("../models/Reservation");

/**
 * POST /api/coupons/validate
 * Valider un code promo
 */
router.post("/validate", auth, async (req, res) => {
  try {
    const { code, bookingAmount, listingId } = req.body;

    if (!code || !bookingAmount) {
      return res.status(400).json({
        success: false,
        message: "Code et montant requis"
      });
    }

    // Rechercher le coupon
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Code promo invalide ou expiré"
      });
    }

    // Vérifier la validité
    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Ce code promo n'est plus valide"
      });
    }

    // Vérifier le montant minimum
    if (bookingAmount < coupon.minimumBookingAmount) {
      return res.status(400).json({
        success: false,
        message: `Le montant minimum pour ce code est de ${coupon.minimumBookingAmount}€`
      });
    }

    // Vérifier la limite par utilisateur
    const userUsageCount = coupon.usedBy.filter(
      usage => usage.user.toString() === req.user.id
    ).length;

    if (userUsageCount >= coupon.usageLimitPerUser) {
      return res.status(400).json({
        success: false,
        message: "Vous avez déjà utilisé ce code le maximum de fois autorisé"
      });
    }

    // Vérifier si c'est pour une première réservation uniquement
    if (coupon.restrictions.firstBookingOnly) {
      const existingReservations = await Reservation.countDocuments({
        user: req.user.id,
        status: { $in: ["confirmed", "completed"] }
      });

      if (existingReservations > 0) {
        return res.status(400).json({
          success: false,
          message: "Ce code est réservé aux nouveaux utilisateurs"
        });
      }
    }

    // Vérifier les restrictions de listing
    if (
      coupon.restrictions.applicableListings &&
      coupon.restrictions.applicableListings.length > 0
    ) {
      if (!listingId || !coupon.restrictions.applicableListings.includes(listingId)) {
        return res.status(400).json({
          success: false,
          message: "Ce code ne s'applique pas à ce logement"
        });
      }
    }

    // Calculer la réduction
    const discountAmount = coupon.calculateDiscount(bookingAmount);

    res.json({
      success: true,
      message: "Code promo valide",
      coupon: {
        id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount
      },
      discountAmount
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la validation du code promo",
      error: error.message
    });
  }
});

/**
 * POST /api/coupons/apply
 * Appliquer un coupon à une réservation (appelé lors du paiement)
 */
router.post("/apply", auth, async (req, res) => {
  try {
    const { couponId, reservationId } = req.body;

    const coupon = await Coupon.findById(couponId);
    if (!coupon || !coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Code promo invalide"
      });
    }

    // Enregistrer l'utilisation
    coupon.usedBy.push({
      user: req.user.id,
      reservation: reservationId,
      usedAt: new Date()
    });
    coupon.usageCount += 1;

    await coupon.save();

    res.json({
      success: true,
      message: "Code promo appliqué"
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'application du code",
      error: error.message
    });
  }
});

// ========== ADMIN ROUTES ==========

/**
 * GET /api/coupons/admin/all
 * Liste tous les coupons (Admin)
 */
router.get("/admin/all", auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = {};
    if (status === "active") {
      query.isActive = true;
      query.validUntil = { $gte: new Date() };
    } else if (status === "expired") {
      query.validUntil = { $lt: new Date() };
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const coupons = await Coupon.find(query)
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Coupon.countDocuments(query);

    res.json({
      success: true,
      coupons,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCoupons: count
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des coupons",
      error: error.message
    });
  }
});

/**
 * POST /api/coupons/admin/create
 * Créer un nouveau coupon (Admin)
 */
router.post("/admin/create", auth, isAdmin, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumBookingAmount,
      maxDiscountAmount,
      validFrom,
      validUntil,
      usageLimit,
      usageLimitPerUser,
      restrictions
    } = req.body;

    // Validation
    if (!code || !description || !discountType || !discountValue || !validFrom || !validUntil) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs requis doivent être remplis"
      });
    }

    // Vérifier que le code n'existe pas déjà
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Ce code existe déjà"
      });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minimumBookingAmount: minimumBookingAmount || 0,
      maxDiscountAmount,
      validFrom,
      validUntil,
      usageLimit,
      usageLimitPerUser: usageLimitPerUser || 1,
      restrictions: restrictions || {},
      createdBy: req.user.id
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: "Coupon créé avec succès",
      coupon
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création du coupon",
      error: error.message
    });
  }
});

/**
 * PUT /api/coupons/admin/:id
 * Mettre à jour un coupon (Admin)
 */
router.put("/admin/:id", auth, isAdmin, async (req, res) => {
  try {
    const updates = req.body;

    // Ne pas permettre de changer le code une fois créé
    delete updates.code;
    delete updates.usageCount;
    delete updates.usedBy;

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon non trouvé"
      });
    }

    res.json({
      success: true,
      message: "Coupon mis à jour",
      coupon
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour",
      error: error.message
    });
  }
});

/**
 * DELETE /api/coupons/admin/:id
 * Supprimer un coupon (Admin)
 */
router.delete("/admin/:id", auth, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon non trouvé"
      });
    }

    res.json({
      success: true,
      message: "Coupon supprimé"
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression",
      error: error.message
    });
  }
});

/**
 * PUT /api/coupons/admin/:id/toggle
 * Activer/désactiver un coupon
 */
router.put("/admin/:id/toggle", auth, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon non trouvé"
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({
      success: true,
      message: `Coupon ${coupon.isActive ? "activé" : "désactivé"}`,
      coupon
    });
  } catch (error) {
    console.error("Error toggling coupon:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du changement de statut",
      error: error.message
    });
  }
});

/**
 * GET /api/coupons/admin/:id/stats
 * Statistiques d'utilisation d'un coupon
 */
router.get("/admin/:id/stats", auth, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate("usedBy.user", "fullName email")
      .populate("usedBy.reservation")
      .lean();

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon non trouvé"
      });
    }

    // Calculer les statistiques
    const totalDiscount = coupon.usedBy.reduce((sum, usage) => {
      if (usage.reservation && usage.reservation.pricing) {
        // Estimer la réduction basée sur le type
        if (coupon.discountType === "fixed_amount") {
          return sum + coupon.discountValue;
        } else {
          const discount = (usage.reservation.pricing.subtotal * coupon.discountValue) / 100;
          return sum + Math.min(discount, coupon.maxDiscountAmount || discount);
        }
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      coupon,
      stats: {
        usageCount: coupon.usageCount,
        usageLimit: coupon.usageLimit || "Illimité",
        remainingUses: coupon.usageLimit ? coupon.usageLimit - coupon.usageCount : null,
        totalDiscountGiven: totalDiscount,
        uniqueUsers: new Set(coupon.usedBy.map(u => u.user._id.toString())).size
      }
    });
  } catch (error) {
    console.error("Error fetching coupon stats:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques",
      error: error.message
    });
  }
});

module.exports = router;
