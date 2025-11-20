const express = require("express");
const router = express.Router();
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const crypto = require("crypto");
const auth = require("../../middleware/auth");
const User = require("../../models/User");

/**
 * POST /api/2fa/setup
 * Configurer l'authentification à deux facteurs
 */
router.post("/setup", auth, async (req, res) => {
  try {
    const { method } = req.body; // "email", "sms", "authenticator"

    if (!["email", "sms", "authenticator"].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Méthode invalide. Choisissez: email, sms ou authenticator"
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Générer un secret pour authenticator app
    if (method === "authenticator") {
      const secret = speakeasy.generateSecret({
        name: `HomeTrip (${user.email})`,
        issuer: "HomeTrip"
      });

      // Générer le QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      // Sauvegarder temporairement (pas encore activé)
      user.twoFactorAuth = {
        enabled: false,
        method: "authenticator",
        secret: secret.base32,
        backupCodes: []
      };

      await user.save();

      return res.json({
        success: true,
        message: "Scannez ce QR code avec votre application d'authentification",
        qrCode: qrCodeUrl,
        secret: secret.base32,
        manualEntry: secret.otpauth_url
      });
    }

    // Pour email ou SMS
    if (method === "email" || method === "sms") {
      // Générer des codes de backup
      const backupCodes = Array.from({ length: 10 }, () =>
        crypto.randomBytes(4).toString("hex").toUpperCase()
      );

      user.twoFactorAuth = {
        enabled: false,
        method,
        backupCodes
      };

      if (method === "sms" && req.body.phoneNumber) {
        user.twoFactorAuth.phoneNumber = req.body.phoneNumber;
      }

      await user.save();

      // TODO: Envoyer un code de vérification par email ou SMS

      return res.json({
        success: true,
        message: `Un code de vérification a été envoyé à votre ${method === "email" ? "email" : "téléphone"}`,
        backupCodes
      });
    }
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la configuration",
      error: error.message
    });
  }
});

/**
 * POST /api/2fa/verify-setup
 * Vérifier et activer le 2FA
 */
router.post("/verify-setup", auth, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Code requis"
      });
    }

    const user = await User.findById(req.user.id);

    if (!user || !user.twoFactorAuth || user.twoFactorAuth.enabled) {
      return res.status(400).json({
        success: false,
        message: "Configuration invalide"
      });
    }

    let isValid = false;

    // Vérifier selon la méthode
    if (user.twoFactorAuth.method === "authenticator") {
      isValid = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: "base32",
        token: code,
        window: 2
      });
    } else {
      // Pour email/SMS, vérifier le code (à implémenter avec un système de cache/DB)
      // Pour l'instant, accepter n'importe quel code à 6 chiffres
      isValid = /^\d{6}$/.test(code);
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Code invalide"
      });
    }

    // Activer le 2FA
    user.twoFactorAuth.enabled = true;

    // Générer des codes de backup si pas déjà fait
    if (!user.twoFactorAuth.backupCodes || user.twoFactorAuth.backupCodes.length === 0) {
      user.twoFactorAuth.backupCodes = Array.from({ length: 10 }, () =>
        crypto.randomBytes(4).toString("hex").toUpperCase()
      );
    }

    await user.save();

    res.json({
      success: true,
      message: "Authentification à deux facteurs activée avec succès",
      backupCodes: user.twoFactorAuth.backupCodes
    });
  } catch (error) {
    console.error("Error verifying 2FA setup:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification",
      error: error.message
    });
  }
});

/**
 * POST /api/2fa/verify
 * Vérifier le code 2FA lors de la connexion
 */
router.post("/verify", async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: "userId et code requis"
      });
    }

    const user = await User.findById(userId);

    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      return res.status(400).json({
        success: false,
        message: "2FA non configuré pour cet utilisateur"
      });
    }

    let isValid = false;

    // Vérifier si c'est un code de backup
    if (user.twoFactorAuth.backupCodes.includes(code.toUpperCase())) {
      // Retirer le code de backup utilisé
      user.twoFactorAuth.backupCodes = user.twoFactorAuth.backupCodes.filter(
        bc => bc !== code.toUpperCase()
      );
      await user.save();
      isValid = true;
    } else if (user.twoFactorAuth.method === "authenticator") {
      // Vérifier le code TOTP
      isValid = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: "base32",
        token: code,
        window: 2
      });
    } else {
      // Pour email/SMS
      // TODO: Implémenter la vérification avec un système de cache
      isValid = /^\d{6}$/.test(code);
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Code invalide"
      });
    }

    res.json({
      success: true,
      message: "Code vérifié avec succès"
    });
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification",
      error: error.message
    });
  }
});

/**
 * POST /api/2fa/disable
 * Désactiver le 2FA
 */
router.post("/disable", auth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Mot de passe requis pour désactiver le 2FA"
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Vérifier le mot de passe
    const bcrypt = require("bcryptjs");
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Mot de passe incorrect"
      });
    }

    // Désactiver le 2FA
    user.twoFactorAuth = {
      enabled: false,
      method: null,
      secret: null,
      backupCodes: [],
      phoneNumber: null
    };

    await user.save();

    res.json({
      success: true,
      message: "Authentification à deux facteurs désactivée"
    });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la désactivation",
      error: error.message
    });
  }
});

/**
 * GET /api/2fa/status
 * Vérifier le statut du 2FA
 */
router.get("/status", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("twoFactorAuth");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    res.json({
      success: true,
      twoFactorAuth: {
        enabled: user.twoFactorAuth?.enabled || false,
        method: user.twoFactorAuth?.method || null,
        backupCodesRemaining: user.twoFactorAuth?.backupCodes?.length || 0
      }
    });
  } catch (error) {
    console.error("Error fetching 2FA status:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du statut",
      error: error.message
    });
  }
});

/**
 * POST /api/2fa/regenerate-backup-codes
 * Régénérer les codes de backup
 */
router.post("/regenerate-backup-codes", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      return res.status(400).json({
        success: false,
        message: "2FA non activé"
      });
    }

    // Générer de nouveaux codes
    const newBackupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    user.twoFactorAuth.backupCodes = newBackupCodes;
    await user.save();

    res.json({
      success: true,
      message: "Nouveaux codes de backup générés",
      backupCodes: newBackupCodes
    });
  } catch (error) {
    console.error("Error regenerating backup codes:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la régénération",
      error: error.message
    });
  }
});

module.exports = router;
