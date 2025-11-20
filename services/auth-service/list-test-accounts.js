#!/usr/bin/env node

/**
 * Script pour afficher les comptes de test disponibles
 * Utilisation: node list-test-accounts.js
 */

console.log('\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  🔐 COMPTES DE TEST - HOMETRIP AUTH SERVICE');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n');

console.log('🔑 MOT DE PASSE UNIVERSEL: Password123!');
console.log('   (Tous les comptes utilisent le même mot de passe)\n');

console.log('───────────────────────────────────────────────────────────────');
console.log('👑 ADMINISTRATEURS (Accès complet)');
console.log('───────────────────────────────────────────────────────────────');
console.log('1. Admin Principal');
console.log('   Email:    admin@hometrip.com');
console.log('   Statut:   ✅ Vérifié');
console.log('   Usage:    Tests admin, gestion plateforme\n');

console.log('2. Support Technique');
console.log('   Email:    support@hometrip.com');
console.log('   Statut:   ✅ Vérifié');
console.log('   Usage:    Tests support client\n');

console.log('───────────────────────────────────────────────────────────────');
console.log('🏠 HÔTES (Avec propriétés)');
console.log('───────────────────────────────────────────────────────────────');
console.log('3. Sophie Bernard');
console.log('   Email:    sophie.bernard@example.com');
console.log('   Ville:    Marseille');
console.log('   Statut:   ✅ Vérifié + Stripe');
console.log('   Usage:    Tests listings, réservations hôte\n');

console.log('4. Thomas Leroy');
console.log('   Email:    thomas.leroy@example.com');
console.log('   Ville:    Nice');
console.log('   Statut:   ✅ Vérifié + Stripe');
console.log('   Usage:    Tests multi-hôtes\n');

console.log('5. Isabelle Moreau');
console.log('   Email:    isabelle.moreau@example.com');
console.log('   Ville:    Bordeaux');
console.log('   Statut:   ✅ Vérifié + Stripe');
console.log('   Usage:    Tests hôte alternatif\n');

console.log('───────────────────────────────────────────────────────────────');
console.log('👤 UTILISATEURS RÉGULIERS');
console.log('───────────────────────────────────────────────────────────────');
console.log('6. Jean Dupont');
console.log('   Email:    jean.dupont@example.com');
console.log('   Ville:    Paris');
console.log('   Statut:   ⚪ Non vérifié');
console.log('   Usage:    Tests utilisateur basique\n');

console.log('7. Marie Martin');
console.log('   Email:    marie.martin@example.com');
console.log('   Ville:    Lyon');
console.log('   Statut:   ✅ Vérifié complet');
console.log('   Usage:    Tests utilisateur vérifié\n');

console.log('───────────────────────────────────────────────────────────────');
console.log('🎫 INVITÉS');
console.log('───────────────────────────────────────────────────────────────');
console.log('8. Pierre Dubois');
console.log('   Email:    pierre.dubois@example.com');
console.log('   Statut:   ⚪ Email vérifié seulement');
console.log('   Usage:    Tests compte invité\n');

console.log('───────────────────────────────────────────────────────────────');
console.log('🔐 COMPTES SPÉCIAUX (Tests de sécurité)');
console.log('───────────────────────────────────────────────────────────────');
console.log('9. Sécurité Avancée');
console.log('   Email:    secure.user@example.com');
console.log('   Statut:   ✅ Vérifié + 2FA (Email)');
console.log('   Usage:    Tests authentification 2 facteurs\n');

console.log('10. Compte Suspendu');
console.log('    Email:    suspended@example.com');
console.log('    Statut:   ⏸️  Suspendu (30 jours)');
console.log('    Raison:   Non-respect des conditions');
console.log('    Usage:    Tests restrictions compte\n');

console.log('11. Compte Banni');
console.log('    Email:    banned@example.com');
console.log('    Statut:   🚫 Banni définitivement');
console.log('    Raison:   Fraude détectée');
console.log('    Usage:    Tests compte banni\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 RÉSUMÉ');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Total:        11 utilisateurs');
console.log('Admins:       2');
console.log('Hôtes:        3 (avec Stripe)');
console.log('Users:        2');
console.log('Guests:       1');
console.log('Spéciaux:     3 (2FA, Suspendu, Banni)');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('🧪 EXEMPLES DE TEST:\n');

console.log('# Test connexion admin');
console.log('curl -X POST http://localhost:3001/api/auth/login \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"email":"admin@hometrip.com","password":"Password123!"}\'');
console.log('');

console.log('# Test connexion hôte');
console.log('curl -X POST http://localhost:3001/api/auth/login \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"email":"sophie.bernard@example.com","password":"Password123!"}\'');
console.log('');

console.log('# Test compte suspendu (devrait échouer)');
console.log('curl -X POST http://localhost:3001/api/auth/login \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"email":"suspended@example.com","password":"Password123!"}\'');
console.log('');

console.log('═══════════════════════════════════════════════════════════════');
console.log('📚 COMMANDES UTILES');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Insérer les données:     node seed-data.js');
console.log('Vérifier la DB:          node check-data.js');
console.log('Afficher cette liste:    node list-test-accounts.js');
console.log('Démarrer le service:     npm run dev');
console.log('═══════════════════════════════════════════════════════════════\n');
