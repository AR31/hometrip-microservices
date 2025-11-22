const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    stripeAccountId: { type: String },
    role: { type: String, enum: ["user", "host", "guest", "admin"], default: "guest" },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 500 },
    favorites: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }], default: [] },

    // Statut du compte
    accountStatus: {
      isActive: { type: Boolean, default: true },
      isBanned: { type: Boolean, default: false },
      isSuspended: { type: Boolean, default: false },
      suspendedUntil: { type: Date },
      banReason: { type: String },
      suspensionReason: { type: String }
    },

    // Authentification à deux facteurs
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ["email", "sms", "authenticator"] },
      secret: { type: String }, // Pour authenticator apps
      backupCodes: [String],
      phoneNumber: { type: String }
    },

    // Champs de vérification d'identité
    verificationStatus: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      identity: { type: Boolean, default: false },
      selfie: { type: Boolean, default: false }
    },
    phoneNumber: { type: String },
    dateOfBirth: { type: Date },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String }
    },
    // Badge de vérification (pour affichage)
    isVerified: { type: Boolean, default: false },

    // Paramètres de notification
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false }
    },

    // Préférences utilisateur
    preferences: {
      language: { type: String, default: "fr" },
      currency: { type: String, default: "EUR" },
      theme: { type: String, enum: ["light", "dark"], default: "light" }
    },

    // Sécurité
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    lastPasswordChange: { type: Date },

    // Reset de mot de passe
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // Appareils connectés
    devices: [{
      deviceId: { type: String },
      deviceName: { type: String },
      deviceType: { type: String }, // mobile, tablet, desktop
      browser: { type: String },
      os: { type: String },
      ipAddress: { type: String },
      lastActive: { type: Date, default: Date.now },
      createdAt: { type: Date, default: Date.now }
    }],

    // Champ isHost pour déterminer si l'utilisateur est hôte
    isHost: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index pour améliorer les performances
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'accountStatus.isActive': 1 });

module.exports = mongoose.model("User", userSchema);
