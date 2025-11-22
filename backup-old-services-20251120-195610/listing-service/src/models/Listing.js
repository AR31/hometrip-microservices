const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    // Structure du logement
    structure: {
      type: String,
      enum: [
        "Appartement",
        "Maison",
        "Cabane",
        "Tiny House",
        "Villa",
        "Chalet",
        "Mobil-home",
        "Bateau",
        "Tente",
        "Autre",
        "Dôme",
        "Hutte",
        "Riad",
        "Igloo",
        "Maison troglodyte",
        "Train",
        "Bus",
        "Avion",
        "Ferme",
        "Grange",
        "Tour",
        "Château",
        "Phare",
        "Maison dans les arbres",
        "Loft",
        "Studio",
        "Yourte",
        "Tipi",
        "Bulle",
        "Container",
        "Maison flottante",
        "Hôtel",
        "Auberge",
        "Gîte",
        "Chambre d'hôtes"
      ],
      required: true,
    },

    // Type de location (privé/entier/partagé)
    propertyType: {
      type: String,
      enum: ["entire", "private", "shared"],
      required: true
    },

    // Prix et calculs
    price: { type: Number, required: true },             // Prix de base par nuit
    serviceFee: { type: Number, default: 0 },            // Frais de service calculé
    totalWithFees: { type: Number, default: 0 },         // Prix total affiché au client
    cleaningFee: { type: Number, default: 0 },           // Frais de ménage

    // Réductions pour séjours longue durée
    discounts: {
      weekly: { type: Number, default: 0, min: 0, max: 100 },      // % de réduction pour 7+ nuits
      monthly: { type: Number, default: 0, min: 0, max: 100 }      // % de réduction pour 28+ nuits
    },

    // Tarification saisonnière
    seasonalPricing: [{
      name: { type: String },                            // Ex: "Haute saison été"
      startDate: { type: Date },
      endDate: { type: Date },
      pricePerNight: { type: Number },
      minimumStay: { type: Number, default: 1 }
    }],

    // Tarifs pour jours spécifiques
    customPricing: [{
      date: { type: Date },
      pricePerNight: { type: Number },
      reason: { type: String }                           // Ex: "Événement spécial"
    }],

    // Géolocalisation et adresse
    location: String, // ex: "12 rue Victor Hugo, Lyon"
    lat: Number,
    lng: Number,
    address: {
      streetNumber: String,
      street: String,
      zipCode: String,
      city: String,
      country: String,
      fullAddress: String
    },

    // Infos logement
    images: [String],
    guests: { type: Number, default: 1 },
    bedrooms: { type: Number, default: 1 },
    beds: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },

    // Équipements et options
    amenities: [String],
    accessibleFeatures: [String],
    hostLanguage: String,

    // Options de réservation
    petsAllowed: { type: Boolean, default: false },
    instantBooking: { type: Boolean, default: false },
    selfCheckIn: { type: Boolean, default: false },
    freeParking: { type: Boolean, default: false },
    topRated: { type: Boolean, default: false },

    // Règles de la maison
    houseRules: {
      checkInTime: { type: String, default: "15:00" },
      checkOutTime: { type: String, default: "11:00" },
      smokingAllowed: { type: Boolean, default: false },
      partiesAllowed: { type: Boolean, default: false },
      childrenAllowed: { type: Boolean, default: true },
      additionalRules: [String]
    },

    // Durées de séjour
    stayRequirements: {
      minimumNights: { type: Number, default: 1 },
      maximumNights: { type: Number, default: 365 },
      advanceNotice: { type: Number, default: 0 },        // Jours avant arrivée
      preparationTime: { type: Number, default: 1 }        // Jours entre réservations
    },

    // Dates bloquées/indisponibles
    blockedDates: [{
      startDate: { type: Date },
      endDate: { type: Date },
      reason: { type: String }
    }],

    // Politique d'annulation détaillée
    cancellationPolicy: {
      type: {
        type: String,
        enum: ["flexible", "moderate", "strict", "super_strict"],
        default: "moderate"
      },
      details: {
        flexible: {
          fullRefundDays: { type: Number, default: 1 },
          partialRefundDays: { type: Number, default: 0 },
          partialRefundPercent: { type: Number, default: 0 }
        },
        moderate: {
          fullRefundDays: { type: Number, default: 5 },
          partialRefundDays: { type: Number, default: 1 },
          partialRefundPercent: { type: Number, default: 50 }
        },
        strict: {
          fullRefundDays: { type: Number, default: 7 },
          partialRefundDays: { type: Number, default: 0 },
          partialRefundPercent: { type: Number, default: 0 }
        }
      }
    },

    // Statut de l'annonce
    isActive: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },

    // Hôte
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Notation
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Indexes pour améliorer les performances
listingSchema.index({ host: 1 });
listingSchema.index({ isActive: 1, isPublished: 1 });
listingSchema.index({ location: "text", title: "text", description: "text" });
listingSchema.index({ price: 1 });
listingSchema.index({ guests: 1 });
listingSchema.index({ lat: 1, lng: 1 });
listingSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Listing", listingSchema);
