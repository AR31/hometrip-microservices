const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

const seedUsers = async () => {
  try {
    // Connexion à MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hometrip-auth';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    // Supprimer les utilisateurs existants (optionnel - décommenter si nécessaire)
    // await User.deleteMany({});
    // console.log('🗑️  Anciennes données supprimées');

    // Hash du mot de passe par défaut
    const defaultPassword = await bcrypt.hash('Password123!', 10);

    // Données de test
    const testUsers = [
      // Utilisateurs réguliers
      {
        fullName: 'Jean Dupont',
        email: 'jean.dupont@example.com',
        password: defaultPassword,
        role: 'user',
        isHost: false,
        phoneNumber: '+33612345678',
        dateOfBirth: new Date('1990-05-15'),
        address: {
          street: '123 Rue de la Paix',
          city: 'Paris',
          state: 'Île-de-France',
          zipCode: '75001',
          country: 'France'
        },
        verificationStatus: {
          email: true,
          phone: true,
          identity: false,
          selfie: false
        },
        isVerified: false,
        bio: 'Voyageur passionné, j\'adore découvrir de nouveaux endroits.',
        avatar: 'https://i.pravatar.cc/150?img=1'
      },
      {
        fullName: 'Marie Martin',
        email: 'marie.martin@example.com',
        password: defaultPassword,
        role: 'user',
        isHost: false,
        phoneNumber: '+33623456789',
        dateOfBirth: new Date('1988-08-22'),
        address: {
          street: '45 Avenue des Champs',
          city: 'Lyon',
          state: 'Auvergne-Rhône-Alpes',
          zipCode: '69001',
          country: 'France'
        },
        verificationStatus: {
          email: true,
          phone: true,
          identity: true,
          selfie: true
        },
        isVerified: true,
        bio: 'Amoureuse des voyages et de la gastronomie.',
        avatar: 'https://i.pravatar.cc/150?img=5'
      },
      {
        fullName: 'Pierre Dubois',
        email: 'pierre.dubois@example.com',
        password: defaultPassword,
        role: 'guest',
        isHost: false,
        phoneNumber: '+33634567890',
        dateOfBirth: new Date('1995-03-10'),
        verificationStatus: {
          email: true,
          phone: false,
          identity: false,
          selfie: false
        },
        isVerified: false,
        bio: 'Jeune voyageur en quête d\'aventures.',
        avatar: 'https://i.pravatar.cc/150?img=12'
      },

      // Hôtes
      {
        fullName: 'Sophie Bernard',
        email: 'sophie.bernard@example.com',
        password: defaultPassword,
        role: 'host',
        isHost: true,
        phoneNumber: '+33645678901',
        dateOfBirth: new Date('1985-11-30'),
        address: {
          street: '78 Boulevard Saint-Michel',
          city: 'Marseille',
          state: 'Provence-Alpes-Côte d\'Azur',
          zipCode: '13001',
          country: 'France'
        },
        verificationStatus: {
          email: true,
          phone: true,
          identity: true,
          selfie: true
        },
        isVerified: true,
        stripeAccountId: 'acct_test_host1',
        bio: 'Hôte expérimentée avec plusieurs propriétés en bord de mer.',
        avatar: 'https://i.pravatar.cc/150?img=20'
      },
      {
        fullName: 'Thomas Leroy',
        email: 'thomas.leroy@example.com',
        password: defaultPassword,
        role: 'host',
        isHost: true,
        phoneNumber: '+33656789012',
        dateOfBirth: new Date('1982-07-18'),
        address: {
          street: '12 Rue du Commerce',
          city: 'Nice',
          state: 'Provence-Alpes-Côte d\'Azur',
          zipCode: '06000',
          country: 'France'
        },
        verificationStatus: {
          email: true,
          phone: true,
          identity: true,
          selfie: true
        },
        isVerified: true,
        stripeAccountId: 'acct_test_host2',
        bio: 'Propriétaire de plusieurs appartements de luxe sur la Côte d\'Azur.',
        avatar: 'https://i.pravatar.cc/150?img=33'
      },
      {
        fullName: 'Isabelle Moreau',
        email: 'isabelle.moreau@example.com',
        password: defaultPassword,
        role: 'host',
        isHost: true,
        phoneNumber: '+33667890123',
        dateOfBirth: new Date('1978-12-05'),
        address: {
          street: '56 Rue de la République',
          city: 'Bordeaux',
          state: 'Nouvelle-Aquitaine',
          zipCode: '33000',
          country: 'France'
        },
        verificationStatus: {
          email: true,
          phone: true,
          identity: true,
          selfie: false
        },
        isVerified: true,
        stripeAccountId: 'acct_test_host3',
        bio: 'Hôte depuis 5 ans, spécialisée dans les maisons de campagne.',
        avatar: 'https://i.pravatar.cc/150?img=44'
      },

      // Administrateurs
      {
        fullName: 'Admin Principal',
        email: 'admin@hometrip.com',
        password: defaultPassword,
        role: 'admin',
        isHost: false,
        phoneNumber: '+33678901234',
        dateOfBirth: new Date('1980-01-01'),
        verificationStatus: {
          email: true,
          phone: true,
          identity: true,
          selfie: true
        },
        isVerified: true,
        bio: 'Administrateur principal de la plateforme.',
        avatar: 'https://i.pravatar.cc/150?img=68'
      },
      {
        fullName: 'Support Technique',
        email: 'support@hometrip.com',
        password: defaultPassword,
        role: 'admin',
        isHost: false,
        phoneNumber: '+33689012345',
        verificationStatus: {
          email: true,
          phone: true,
          identity: true,
          selfie: true
        },
        isVerified: true,
        bio: 'Équipe de support technique.',
        avatar: 'https://i.pravatar.cc/150?img=70'
      },

      // Utilisateurs avec différents statuts de compte
      {
        fullName: 'Compte Suspendu',
        email: 'suspended@example.com',
        password: defaultPassword,
        role: 'user',
        isHost: false,
        accountStatus: {
          isActive: false,
          isBanned: false,
          isSuspended: true,
          suspendedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
          suspensionReason: 'Non-respect des conditions d\'utilisation'
        },
        verificationStatus: {
          email: true,
          phone: false,
          identity: false,
          selfie: false
        },
        avatar: 'https://i.pravatar.cc/150?img=15'
      },
      {
        fullName: 'Compte Banni',
        email: 'banned@example.com',
        password: defaultPassword,
        role: 'user',
        isHost: false,
        accountStatus: {
          isActive: false,
          isBanned: true,
          isSuspended: false,
          banReason: 'Fraude détectée'
        },
        verificationStatus: {
          email: true,
          phone: false,
          identity: false,
          selfie: false
        },
        avatar: 'https://i.pravatar.cc/150?img=25'
      },

      // Utilisateur avec 2FA activé
      {
        fullName: 'Sécurité Avancée',
        email: 'secure.user@example.com',
        password: defaultPassword,
        role: 'user',
        isHost: false,
        phoneNumber: '+33690123456',
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          phoneNumber: '+33690123456'
        },
        verificationStatus: {
          email: true,
          phone: true,
          identity: true,
          selfie: true
        },
        isVerified: true,
        bio: 'Utilisateur soucieux de la sécurité.',
        avatar: 'https://i.pravatar.cc/150?img=32'
      }
    ];

    // Insérer les utilisateurs
    const insertedUsers = await User.insertMany(testUsers);
    console.log(`✅ ${insertedUsers.length} utilisateurs insérés avec succès!`);

    // Afficher un résumé
    console.log('\n📊 Résumé des utilisateurs créés:');
    console.log('─────────────────────────────────────────────────');

    const summary = {
      admin: insertedUsers.filter(u => u.role === 'admin').length,
      host: insertedUsers.filter(u => u.role === 'host').length,
      user: insertedUsers.filter(u => u.role === 'user').length,
      guest: insertedUsers.filter(u => u.role === 'guest').length,
    };

    console.log(`👑 Admins: ${summary.admin}`);
    console.log(`🏠 Hôtes: ${summary.host}`);
    console.log(`👤 Utilisateurs: ${summary.user}`);
    console.log(`🎫 Invités: ${summary.guest}`);
    console.log('─────────────────────────────────────────────────');

    console.log('\n🔑 Identifiants de connexion:');
    console.log('─────────────────────────────────────────────────');
    console.log('Mot de passe pour tous les comptes: Password123!');
    console.log('\nExemples de connexion:');
    console.log('  Admin:    admin@hometrip.com');
    console.log('  Hôte:     sophie.bernard@example.com');
    console.log('  User:     marie.martin@example.com');
    console.log('  Guest:    pierre.dubois@example.com');
    console.log('─────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
};

// Exécuter le script
seedUsers();
