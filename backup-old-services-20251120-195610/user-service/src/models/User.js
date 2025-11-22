const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'host', 'guest', 'admin'], default: 'guest', index: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },

    // Account Status
    accountStatus: {
      isActive: { type: Boolean, default: true },
      isBanned: { type: Boolean, default: false },
      isSuspended: { type: Boolean, default: false },
      suspendedUntil: { type: Date },
      banReason: { type: String },
      suspensionReason: { type: String }
    },

    // Two-Factor Authentication
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ['email', 'sms', 'authenticator'] },
      secret: { type: String },
      backupCodes: [String],
      phoneNumber: { type: String }
    },

    // Identity Verification Fields
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
    isVerified: { type: Boolean, default: false },

    // Notification Settings
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false }
    },

    // User Preferences
    preferences: {
      language: { type: String, default: 'fr' },
      currency: { type: String, default: 'EUR' },
      theme: { type: String, enum: ['light', 'dark'], default: 'light' }
    },

    // Security
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    lastPasswordChange: { type: Date },

    // Stripe Account
    stripeAccountId: { type: String },

    // Favorites (References to Listings)
    favorites: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
      default: [],
      index: true
    },

    // Device Management
    devices: [
      {
        deviceId: { type: String },
        deviceName: { type: String },
        deviceType: { type: String }, // mobile, tablet, desktop
        browser: { type: String },
        os: { type: String },
        ipAddress: { type: String },
        lastActive: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Host Information
    isHost: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// Create indexes for better query performance
userSchema.index({ email: 1, role: 1 });
userSchema.index({ isHost: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ favorites: 1 });

module.exports = mongoose.model('User', userSchema);
