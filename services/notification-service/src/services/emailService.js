const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

const initializeTransporter = () => {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || process.env.SMTP_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    auth: {
      user:
        process.env.EMAIL_USER ||
        process.env.SMTP_USER ||
        process.env.EMAIL_ADDRESS,
      pass:
        process.env.EMAIL_PASSWORD ||
        process.env.SMTP_PASSWORD ||
        process.env.EMAIL_PASS,
    },
  });

  // Vérifier la connexion
  transporter.verify((error, success) => {
    if (error) {
      logger.error('Email service verification error:', error);
    } else {
      logger.info('Email service ready');
    }
  });

  return transporter;
};

/**
 * Fonction générique pour envoyer un email
 */
const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  try {
    if (!transporter) {
      initializeTransporter();
    }

    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'HomeTrip'}" <${
        process.env.EMAIL_FROM ||
        process.env.SMTP_FROM ||
        process.env.EMAIL_USER
      }>`,
      to,
      subject,
      text,
      html,
      attachments,
    });

    logger.info(`Email sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Email: Confirmation d'inscription utilisateur
 */
const sendUserConfirmationEmail = async ({ email, name, confirmLink }) => {
  const subject = 'Bienvenue sur HomeTrip - Confirmez votre email';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #f43f5e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bienvenue ${name}!</h1>
        </div>
        <div class="content">
          <p>Nous sommes heureux de vous accueillir sur HomeTrip!</p>
          <p>Pour confirmer votre email et activer votre compte, veuillez cliquer sur le bouton ci-dessous:</p>
          <div style="text-align: center;">
            <a href="${confirmLink}" class="button">Confirmer mon email</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Ce lien expire dans 24 heures.</p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé par ${process.env.APP_NAME || 'HomeTrip'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Bienvenue ${name}!

Pour confirmer votre email, cliquez sur le lien: ${confirmLink}

Ce lien expire dans 24 heures.
  `;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Email: Nouvelle demande de réservation
 */
const sendNewReservationRequestEmail = async ({
  hostEmail,
  hostName,
  guestName,
  listingTitle,
  checkIn,
  checkOut,
  guests,
  totalPrice,
  conversationId,
}) => {
  const subject = `Nouvelle demande de réservation pour ${listingTitle}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: 600; color: #6b7280; }
        .detail-value { color: #111827; }
        .button { display: inline-block; background: #f43f5e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 5px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nouvelle demande de réservation</h1>
        </div>
        <div class="content">
          <p>Bonjour ${hostName},</p>
          <p>Vous avez reçu une nouvelle demande de réservation de <strong>${guestName}</strong> pour votre logement <strong>${listingTitle}</strong>.</p>

          <div class="card">
            <h3>Détails de la réservation</h3>
            <div class="detail-row">
              <span class="detail-label">Arrivée</span>
              <span class="detail-value">${new Date(checkIn).toLocaleDateString(
                'fr-FR',
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }
              )}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Départ</span>
              <span class="detail-value">${new Date(checkOut).toLocaleDateString(
                'fr-FR',
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }
              )}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Nombre de voyageurs</span>
              <span class="detail-value">${guests} voyageur(s)</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Prix total</span>
              <span class="detail-value" style="font-weight: bold; font-size: 18px;">${totalPrice} €</span>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/messages/${conversationId}" class="button">Voir la demande et répondre</a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            <strong>Important:</strong> Vous avez 24 heures pour accepter ou refuser cette demande.
          </p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé par ${process.env.APP_NAME || 'HomeTrip'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Nouvelle demande de réservation

Bonjour ${hostName},

Vous avez reçu une nouvelle demande de réservation de ${guestName} pour ${listingTitle}.

Détails:
- Arrivée: ${new Date(checkIn).toLocaleDateString('fr-FR')}
- Départ: ${new Date(checkOut).toLocaleDateString('fr-FR')}
- Voyageurs: ${guests}
- Prix total: ${totalPrice} €

Consultez la demande: ${process.env.FRONTEND_URL}/messages/${conversationId}

Important: Vous avez 24 heures pour répondre.
  `;

  return sendEmail({ to: hostEmail, subject, html, text });
};

/**
 * Email: Réservation confirmée
 */
const sendReservationConfirmedEmail = async ({
  guestEmail,
  guestName,
  hostName,
  listingTitle,
  checkIn,
  checkOut,
  guests,
  totalPrice,
  reservationId,
}) => {
  const subject = `Réservation confirmée - ${listingTitle}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Réservation confirmée!</h1>
        </div>
        <div class="content">
          <p>Bonjour ${guestName},</p>
          <p>Votre réservation pour <strong>${listingTitle}</strong> est confirmée!</p>

          <div class="card">
            <h3>Détails de votre séjour</h3>
            <div class="detail-row">
              <span>Numéro de réservation</span>
              <span style="font-family: monospace; font-weight: bold;">#${reservationId}</span>
            </div>
            <div class="detail-row">
              <span>Logement</span>
              <span>${listingTitle}</span>
            </div>
            <div class="detail-row">
              <span>Arrivée</span>
              <span>${new Date(checkIn).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}</span>
            </div>
            <div class="detail-row">
              <span>Départ</span>
              <span>${new Date(checkOut).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}</span>
            </div>
            <div class="detail-row">
              <span>Voyageurs</span>
              <span>${guests}</span>
            </div>
            <div class="detail-row">
              <span>Total payé</span>
              <span style="font-weight: bold; font-size: 18px;">${totalPrice} €</span>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reservations/${reservationId}" class="button">Voir ma réservation</a>
          </div>

          <div class="card">
            <h3>Prochaines étapes</h3>
            <p>Vous pouvez désormais communiquer avec ${hostName} via la messagerie</p>
            <p>Les coordonnées complètes seront disponibles 48h avant votre arrivée</p>
            <p>N'oubliez pas de laisser un avis après votre séjour</p>
          </div>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé par ${process.env.APP_NAME || 'HomeTrip'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Réservation confirmée!

Numéro: #${reservationId}
Logement: ${listingTitle}
Arrivée: ${new Date(checkIn).toLocaleDateString('fr-FR')}
Départ: ${new Date(checkOut).toLocaleDateString('fr-FR')}
Voyageurs: ${guests}
Total payé: ${totalPrice} €

Voir votre réservation: ${process.env.FRONTEND_URL}/reservations/${reservationId}
  `;

  return sendEmail({ to: guestEmail, subject, html, text });
};

/**
 * Email: Réservation refusée
 */
const sendReservationCancelledEmail = async ({
  guestEmail,
  guestName,
  hostName,
  listingTitle,
  reason,
}) => {
  const subject = `Réservation annulée - ${listingTitle}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #f43f5e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Réservation annulée</h1>
        </div>
        <div class="content">
          <p>Bonjour ${guestName},</p>
          <p>${hostName} a annulé votre réservation pour <strong>${listingTitle}</strong>.</p>
          ${reason ? `<p><strong>Raison:</strong> ${reason}</p>` : ''}
          <p>Ne vous inquiétez pas! Il existe de nombreux autres logements magnifiques sur HomeTrip.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/search" class="button">Continuer ma recherche</a>
          </div>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé par ${process.env.APP_NAME || 'HomeTrip'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Réservation annulée

Bonjour ${guestName},

${hostName} a annulé votre réservation pour ${listingTitle}.
${reason ? `Raison: ${reason}` : ''}

Continuer votre recherche: ${process.env.FRONTEND_URL}/search
  `;

  return sendEmail({ to: guestEmail, subject, html, text });
};

/**
 * Email: Paiement échoué
 */
const sendPaymentFailedEmail = async ({
  userEmail,
  userName,
  reason,
  reservationId,
}) => {
  const subject = `Échec du paiement - HomeTrip`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .error-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Paiement Échoué</h1>
        </div>
        <div class="content">
          <p>Bonjour ${userName},</p>
          <p>Malheureusement, nous n'avons pas pu traiter votre paiement.</p>
          <div class="error-box">
            <strong>Raison:</strong> ${reason}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/checkout?retry=${reservationId}" class="button">Réessayer le paiement</a>
          </div>
        </div>
        <div class="footer">
          <p>Besoin d'aide ? Contactez notre support.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Paiement Échoué

Bonjour ${userName},

Malheureusement, nous n'avons pas pu traiter votre paiement.

Raison: ${reason}

Réessayer: ${process.env.FRONTEND_URL}/checkout?retry=${reservationId}
  `;

  return sendEmail({ to: userEmail, subject, html, text });
};

/**
 * Email: Remboursement effectué
 */
const sendRefundConfirmationEmail = async ({
  userEmail,
  userName,
  refundAmount,
}) => {
  const subject = `Remboursement effectué - HomeTrip`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0575E6 0%, #021B79 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .refund-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Remboursement Effectué</h1>
        </div>
        <div class="content">
          <p>Bonjour ${userName},</p>
          <p>Votre remboursement a été traité avec succès.</p>
          <div class="refund-box">
            <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Montant remboursé</div>
            <div style="font-size: 32px; font-weight: bold; color: #2196f3;">${refundAmount.toFixed(
              2
            )} €</div>
          </div>
          <p>Le montant apparaîtra sur votre compte bancaire sous 5-10 jours ouvrés.</p>
        </div>
        <div class="footer">
          <p>Merci de votre confiance !</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Remboursement Effectué

Bonjour ${userName},

Votre remboursement a été traité avec succès.

Montant remboursé: ${refundAmount.toFixed(2)} €

Le montant apparaîtra sur votre compte bancaire sous 5-10 jours ouvrés.

Merci de votre confiance !
  `;

  return sendEmail({ to: userEmail, subject, html, text });
};

/**
 * Email: Nouveau message reçu
 */
const sendNewMessageEmail = async ({
  to,
  recipientName,
  senderName,
  messagePreview,
  conversationId,
}) => {
  const subject = `Nouveau message de ${senderName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f43f5e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .message-box { background: white; padding: 20px; border-left: 4px solid #f43f5e; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; background: #f43f5e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Nouveau message</h2>
        </div>
        <div class="content">
          <p>Bonjour ${recipientName},</p>
          <p><strong>${senderName}</strong> vous a envoyé un message:</p>
          <div class="message-box">
            <p>${messagePreview}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/messages/${conversationId}" class="button">Répondre au message</a>
          </div>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé par ${process.env.APP_NAME || 'HomeTrip'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Nouveau message de ${senderName}

${messagePreview}

Répondre: ${process.env.FRONTEND_URL}/messages/${conversationId}
  `;

  return sendEmail({ to, subject, html, text });
};

/**
 * Email: Avis reçu
 */
const sendReviewReceivedEmail = async ({
  userEmail,
  userName,
  reviewerName,
  rating,
  comment,
  reviewLink,
}) => {
  const subject = `Vous avez reçu un avis de ${reviewerName}`;

  const starRating = '★'.repeat(rating) + '☆'.repeat(5 - rating);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .review-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .stars { font-size: 24px; color: #f59e0b; margin: 10px 0; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Vous avez reçu un nouvel avis!</h1>
        </div>
        <div class="content">
          <p>Bonjour ${userName},</p>
          <p><strong>${reviewerName}</strong> a laissé un avis sur votre logement.</p>
          <div class="review-box">
            <div class="stars">${starRating}</div>
            <p>${rating}/5 étoiles</p>
            <p>"${comment}"</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewLink}" class="button">Voir l'avis complet</a>
          </div>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé par ${process.env.APP_NAME || 'HomeTrip'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Vous avez reçu un nouvel avis!

Bonjour ${userName},

${reviewerName} a laissé un avis sur votre logement.

Note: ${starRating} (${rating}/5)

Commentaire: "${comment}"

Voir l'avis complet: ${reviewLink}
  `;

  return sendEmail({ to: userEmail, subject, html, text });
};

module.exports = {
  initializeTransporter,
  sendEmail,
  sendUserConfirmationEmail,
  sendNewReservationRequestEmail,
  sendReservationConfirmedEmail,
  sendReservationCancelledEmail,
  sendPaymentFailedEmail,
  sendRefundConfirmationEmail,
  sendNewMessageEmail,
  sendReviewReceivedEmail,
};
