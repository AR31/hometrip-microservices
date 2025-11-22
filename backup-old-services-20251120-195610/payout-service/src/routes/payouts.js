const express = require("express");
const auth = require("../middleware/auth");
const Payout = require("../models/Payout");
const Reservation = require("../models/Reservation");
const User = require("../models/User");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

/**
 * GET /api/payouts
 * Obtenir l'historique des paiements de l'hôte
 * Query params: status, page, limit
 */
router.get("/", auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { host: req.user.id };
    if (status) {
      query.status = status;
    }

    const payouts = await Payout.find(query)
      .populate("reservation")
      .populate("host", "fullName email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payout.countDocuments(query);

    // Statistiques
    const stats = await Payout.aggregate([
      { $match: { host: req.user.id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$amount" }
        }
      }
    ]);

    res.json({
      payouts,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/payouts/stats
 * Obtenir les statistiques de paiement de l'hôte
 */
router.get("/stats", auth, async (req, res) => {
  try {
    const totalEarned = await Payout.aggregate([
      { $match: { host: req.user.id, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const pendingAmount = await Payout.aggregate([
      { $match: { host: req.user.id, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const monthlyEarnings = await Payout.aggregate([
      { 
        $match: { 
          host: req.user.id, 
          status: "paid",
          paidAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) }
        } 
      },
      {
        $group: {
          _id: { 
            year: { $year: "$paidAt" },
            month: { $month: "$paidAt" }
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    res.json({
      totalEarned: totalEarned[0]?.total || 0,
      pendingAmount: pendingAmount[0]?.total || 0,
      monthlyEarnings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/payouts/:id
 * Obtenir les détails d'un paiement
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const payout = await Payout.findOne({
      _id: req.params.id,
      host: req.user.id
    })
    .populate("reservation")
    .populate("host", "fullName email");

    if (!payout) {
      return res.status(404).json({ error: "Paiement non trouvé" });
    }

    res.json(payout);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/payouts/request
 * Demander un paiement (pour les fonds en attente)
 */
router.post("/request", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.stripeAccountId) {
      return res.status(400).json({ 
        error: "Vous devez d'abord connecter votre compte Stripe" 
      });
    }

    // Vérifier les fonds disponibles
    const availablePayouts = await Payout.find({
      host: req.user.id,
      status: "pending",
      scheduledPayoutDate: { $lte: new Date() }
    });

    if (availablePayouts.length === 0) {
      return res.status(400).json({ 
        error: "Aucun fonds disponible pour le paiement" 
      });
    }

    const totalAmount = availablePayouts.reduce((sum, p) => sum + p.amount, 0);

    // Créer le transfert Stripe
    const transfer = await stripe.transfers.create({
      amount: Math.round(totalAmount * 100),
      currency: "eur",
      destination: user.stripeAccountId
    });

    // Mettre à jour les payouts
    await Payout.updateMany(
      { _id: { $in: availablePayouts.map(p => p._id) } },
      { 
        status: "processing",
        stripeTransferId: transfer.id
      }
    );

    res.json({ 
      message: "Demande de paiement envoyée",
      amount: totalAmount,
      transferId: transfer.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;