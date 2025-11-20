const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const checkData = async () => {
  try {
    // Connexion à MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hometrip-auth';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB\n');

    // Récupérer tous les utilisateurs
    const users = await User.find({}).select('-password -twoFactorSecret -resetPasswordToken');

    if (users.length === 0) {
      console.log('⚠️  Aucun utilisateur trouvé dans la base de données.');
      console.log('💡 Exécutez: node seed-data.js pour ajouter des données de test\n');
      return;
    }

    console.log(`📊 Total d'utilisateurs: ${users.length}\n`);

    // Statistiques par rôle
    const roleStats = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Statistiques par rôle:');
    console.log('─────────────────────────────────────────────────');
    Object.entries(roleStats).forEach(([role, count]) => {
      const icon = {
        admin: '👑',
        host: '🏠',
        user: '👤',
        guest: '🎫'
      }[role] || '❓';
      console.log(`${icon} ${role.toUpperCase()}: ${count}`);
    });
    console.log('─────────────────────────────────────────────────\n');

    // Statistiques de vérification
    const verifiedCount = users.filter(u => u.isVerified).length;
    const emailVerified = users.filter(u => u.verificationStatus?.email).length;
    const phoneVerified = users.filter(u => u.verificationStatus?.phone).length;
    const identityVerified = users.filter(u => u.verificationStatus?.identity).length;

    console.log('✅ Statistiques de vérification:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Badge vérifié: ${verifiedCount}/${users.length}`);
    console.log(`Email vérifié: ${emailVerified}/${users.length}`);
    console.log(`Téléphone vérifié: ${phoneVerified}/${users.length}`);
    console.log(`Identité vérifiée: ${identityVerified}/${users.length}`);
    console.log('─────────────────────────────────────────────────\n');

    // Afficher les détails des utilisateurs
    console.log('👥 Liste des utilisateurs:');
    console.log('─────────────────────────────────────────────────');

    users.forEach((user, index) => {
      const statusIcon = user.accountStatus?.isBanned ? '🚫' :
                        user.accountStatus?.isSuspended ? '⏸️' :
                        user.isVerified ? '✅' : '⚪';
      const roleIcon = {
        admin: '👑',
        host: '🏠',
        user: '👤',
        guest: '🎫'
      }[user.role] || '❓';

      console.log(`${index + 1}. ${statusIcon} ${roleIcon} ${user.fullName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rôle: ${user.role}${user.isHost ? ' (Hôte)' : ''}`);
      console.log(`   Vérifié: ${user.isVerified ? 'Oui' : 'Non'}`);

      if (user.accountStatus?.isBanned) {
        console.log(`   ⚠️  Banni - Raison: ${user.accountStatus.banReason}`);
      }
      if (user.accountStatus?.isSuspended) {
        console.log(`   ⚠️  Suspendu jusqu'au: ${user.accountStatus.suspendedUntil?.toLocaleDateString('fr-FR')}`);
      }
      if (user.twoFactorAuth?.enabled) {
        console.log(`   🔐 2FA activé (${user.twoFactorAuth.method})`);
      }
      console.log('');
    });

    console.log('─────────────────────────────────────────────────\n');
    console.log('💡 Mot de passe pour tous les comptes: Password123!\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
};

checkData();
