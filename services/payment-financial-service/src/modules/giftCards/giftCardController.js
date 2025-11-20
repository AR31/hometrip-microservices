const GiftCard = require('../models/GiftCard');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const moment = require('moment');

// Purchase gift card
exports.purchaseGiftCard = async (req, res) => {
  try {
    const { amount, recipientEmail, recipientName, message, paymentIntentId } = req.body;

    const code = await GiftCard.generateCode();
    const expiresAt = moment().add(1, 'year').toDate();

    const giftCard = new GiftCard({
      code,
      amount,
      balance: amount,
      purchasedBy: req.user.id,
      recipientEmail,
      recipientName,
      message,
      paymentIntentId,
      paymentStatus: 'pending',
      expiresAt,
    });

    await giftCard.save();

    await eventBus.publish('gift-card.purchased', {
      giftCardId: giftCard._id,
      code: giftCard.code,
      purchasedBy: req.user.id,
      recipientEmail,
      amount,
    });

    logger.info(`Gift card purchased: ${giftCard._id}`);

    res.status(201).json({
      success: true,
      data: giftCard,
    });
  } catch (error) {
    logger.error('Error purchasing gift card:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get user's purchased gift cards
exports.getPurchasedGiftCards = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [giftCards, total] = await Promise.all([
      GiftCard.find({ purchasedBy: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      GiftCard.countDocuments({ purchasedBy: req.user.id }),
    ]);

    res.json({
      success: true,
      data: giftCards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching gift cards:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get gift card by code
exports.getGiftCardByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const giftCard = await GiftCard.findOne({ code: code.toUpperCase() }).lean();

    if (!giftCard) {
      return res.status(404).json({
        success: false,
        error: 'Gift card not found',
      });
    }

    // Return only public info
    res.json({
      success: true,
      data: {
        code: giftCard.code,
        balance: giftCard.balance,
        currency: giftCard.currency,
        status: giftCard.status,
        expiresAt: giftCard.expiresAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching gift card:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Redeem gift card
exports.redeemGiftCard = async (req, res) => {
  try {
    const { code, amount, reservationId } = req.body;

    const giftCard = await GiftCard.findOne({ code: code.toUpperCase() });

    if (!giftCard) {
      return res.status(404).json({
        success: false,
        error: 'Gift card not found',
      });
    }

    // Validate
    if (giftCard.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Gift card is ${giftCard.status}`,
      });
    }

    if (moment().isAfter(giftCard.expiresAt)) {
      giftCard.status = 'expired';
      await giftCard.save();
      return res.status(400).json({
        success: false,
        error: 'Gift card has expired',
      });
    }

    if (giftCard.balance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: ${giftCard.balance}`,
      });
    }

    // Redeem
    giftCard.balance -= amount;
    giftCard.transactions.push({
      reservationId,
      amount,
      date: new Date(),
    });

    if (giftCard.balance === 0) {
      giftCard.status = 'redeemed';
      giftCard.redeemedAt = new Date();
      giftCard.redeemedBy = req.user.id;
    }

    await giftCard.save();

    await eventBus.publish('gift-card.redeemed', {
      giftCardId: giftCard._id,
      code: giftCard.code,
      amount,
      reservationId,
      remainingBalance: giftCard.balance,
    });

    logger.info(`Gift card redeemed: ${giftCard.code} - Amount: ${amount}`);

    res.json({
      success: true,
      data: {
        code: giftCard.code,
        amountRedeemed: amount,
        remainingBalance: giftCard.balance,
        status: giftCard.status,
      },
    });
  } catch (error) {
    logger.error('Error redeeming gift card:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Confirm payment (webhook handler)
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, status } = req.body;

    const giftCard = await GiftCard.findOne({ paymentIntentId });

    if (!giftCard) {
      return res.status(404).json({
        success: false,
        error: 'Gift card not found',
      });
    }

    giftCard.paymentStatus = status === 'succeeded' ? 'completed' : 'failed';
    await giftCard.save();

    if (status === 'succeeded') {
      await eventBus.publish('gift-card.payment.completed', {
        giftCardId: giftCard._id,
        code: giftCard.code,
        recipientEmail: giftCard.recipientEmail,
      });
    }

    res.json({
      success: true,
      data: giftCard,
    });
  } catch (error) {
    logger.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
