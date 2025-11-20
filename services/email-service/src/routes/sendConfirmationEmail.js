const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

router.post("/", async (req, res) => {
  const {
    email,          // invité
    hostEmail,      // hôte
    listingTitle,
    checkIn,
    checkOut,
    guestCount,
    total,
    hostName,
    guestName,
    guestEmail,
    address,
    messageToHost = "" // valeur par défaut vide
  } = req.body;

  // 🧪 Vérification des champs requis
  const requiredFields = { email, hostEmail, listingTitle, checkIn, checkOut, guestCount, total, hostName, guestName, guestEmail, address };
  const missingFields = Object.entries(requiredFields).filter(([_, v]) => !v);
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Champs manquants : ${missingFields.map(([k]) => k).join(", ")}` });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // 📩 Email pour le voyageur
  const mailToGuest = {
    from: `"Hometrip 🏡" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Confirmation de votre réservation 🏡",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #2E8B57;">Merci pour votre réservation !</h2>
        <p><strong>${listingTitle}</strong><br>Adresse : ${address}</p>
        <p><strong>Dates :</strong> du ${checkIn} au ${checkOut}</p>
        <p><strong>Nombre de voyageurs :</strong> ${guestCount}</p>
        <p><strong>Total payé :</strong> ${total} €</p>
        <p><strong>Hôte :</strong> ${hostName}</p>
        <hr />
        <p>Nous vous souhaitons un excellent séjour 🌟</p>
        <p>L’équipe <strong>Hoptrip</strong></p>
      </div>
    `
  };

  // 📩 Email pour l’hôte
  const mailToHost = {
    from: `"Hometrip 🏡" <${process.env.EMAIL_USER}>`,
    to: hostEmail,
    subject: "📩 Nouvelle réservation reçue",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #d35400;">Nouvelle réservation reçue !</h2>
        <p><strong>${guestName}</strong> a réservé votre logement : <strong>${listingTitle}</strong></p>
        <p><strong>Dates :</strong> du ${checkIn} au ${checkOut}</p>
        <p><strong>Nombre de voyageurs :</strong> ${guestCount}</p>
        <p><strong>Total payé :</strong> ${total} €</p>
        <p><strong>Email du voyageur :</strong> ${guestEmail}</p>
        ${messageToHost ? `
          <div style="margin-top: 20px; padding: 10px; border-left: 4px solid #2E8B57; background: #f9f9f9;">
            <p><strong>Message du voyageur :</strong></p>
            <p>${messageToHost}</p>
          </div>
        ` : ""}
        <hr />
        <p>Connectez-vous à votre tableau de bord pour plus de détails</p>
        <p>— L’équipe <strong>Hoptrip</strong></p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailToGuest);
    await transporter.sendMail(mailToHost);
    console.log("✅ Emails envoyés à :", email, "et", hostEmail);
    res.status(200).json({ message: "Emails envoyés ✅" });
  } catch (err) {
    console.error("❌ Erreur lors de l'envoi des emails :", err);
    res.status(500).json({ error: "Échec de l’envoi des emails" });
  }
});

module.exports = router;
