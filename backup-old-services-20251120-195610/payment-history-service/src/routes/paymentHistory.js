const express = require("express");
const Reservation = require("../models/Reservation");
const Listing = require("../models/Listing");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payment History
 *   description: Historique des paiements de l'hôte
 */

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Obtenir l'historique des paiements de l'hôte
 *     tags: [Payment History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historique des paiements retourné
 */
router.get("/history", auth, async (req, res) => {
  try {
    const hostId = req.user.id;
    const listings = await Listing.find({ host: hostId });
    const listingIds = listings.map(l => l._id);

    const reservations = await Reservation.find({ listing: { $in: listingIds } }).sort({ startDate: -1 });

    const payments = reservations.map(res => ({
      reservationId: res._id,
      listing: res.listing,
      startDate: res.startDate,
      endDate: res.endDate,
      totalPrice: res.totalPrice
    }));

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
