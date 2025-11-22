const express = require('express');
const router = express.Router();
const {
  calculateRefund,
  getPolicyDetails,
  getAllPolicies,
  isEligibleForRefund,
} = require('../utils/cancellationCalculator');
const Reservation = require('../models/Reservation');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/cancellation-policy
 * @desc    Obtenir toutes les politiques d'annulation
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    const policies = getAllPolicies();
    res.json({
      success: true,
      policies,
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des politiques',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/cancellation-policy/:type
 * @desc    Obtenir les détails d'une politique spécifique
 * @access  Public
 */
router.get('/:type', (req, res) => {
  try {
    const { type } = req.params;
    const policy = getPolicyDetails(type);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Politique d\'annulation non trouvée',
      });
    }

    res.json({
      success: true,
      policy,
    });
  } catch (error) {
    console.error('Error fetching policy details:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la politique',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/cancellation-policy/calculate
 * @desc    Calculer le remboursement pour une réservation
 * @access  Private
 */
router.post('/calculate', auth, async (req, res) => {
  try {
    const { reservationId } = req.body;

    // Récupérer la réservation
    const reservation = await Reservation.findById(reservationId).populate('listing');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée',
      });
    }

    // Vérifier que l'utilisateur est propriétaire de la réservation
    if (reservation.guest.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à calculer le remboursement pour cette réservation',
      });
    }

    // Obtenir la politique d'annulation du listing
    const policyType = reservation.listing.cancellationPolicy?.type || 'moderate';

    // Calculer le remboursement
    const refundDetails = calculateRefund(reservation, policyType);

    res.json({
      success: true,
      refund: refundDetails,
      reservation: {
        id: reservation._id,
        checkInDate: reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
        totalPrice: reservation.totalPrice,
        status: reservation.status,
      },
    });
  } catch (error) {
    console.error('Error calculating refund:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul du remboursement',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/cancellation-policy/check-eligibility
 * @desc    Vérifier l'éligibilité au remboursement
 * @access  Private
 */
router.post('/check-eligibility', auth, async (req, res) => {
  try {
    const { reservationId } = req.body;

    const reservation = await Reservation.findById(reservationId).populate('listing');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée',
      });
    }

    if (reservation.guest.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé',
      });
    }

    const policyType = reservation.listing.cancellationPolicy?.type || 'moderate';
    const eligible = isEligibleForRefund(reservation.checkInDate, policyType);

    res.json({
      success: true,
      eligible,
      policyType,
      checkInDate: reservation.checkInDate,
    });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de l\'éligibilité',
      error: error.message,
    });
  }
});

module.exports = router;
