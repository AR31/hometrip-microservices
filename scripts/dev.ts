#!/usr/bin/env tsx

/**
 * CLI pour gérer les microservices HomeTrip
 *
 * Usage:
 *   tsx scripts/dev.ts start [service]   - Démarre un ou tous les services
 *   tsx scripts/dev.ts stop [service]    - Arrête un ou tous les services
 *   tsx scripts/dev.ts restart [service] - Redémarre un ou tous les services
 *   tsx scripts/dev.ts status            - Affiche le statut de tous les services
 *   tsx scripts/dev.ts list              - Liste tous les services disponibles
 */

import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

// Liste des services disponibles
const SERVICES = [
  { name: 'api-gateway', port: 3100, dir: 'services/api-gateway' },
  { name: 'auth-service', port: 3001, dir: 'services/auth-service' },
  { name: 'user-service', port: 3002, dir: 'services/user-service' },
  { name: 'listing-service', port: 3003, dir: 'services/listing-service' },
  { name: 'booking-service', port: 3004, dir: 'services/booking-service' },
  { name: 'payment-service', port: 3005, dir: 'services/payment-service' },
  { name: 'message-service', port: 3006, dir: 'services/message-service' },
  { name: 'notification-service', port: 3007, dir: 'services/notification-service' },
  { name: 'review-service', port: 3008, dir: 'services/review-service' },
  { name: 'search-service', port: 3009, dir: 'services/search-service' },
  { name: 'analytics-service', port: 3010, dir: 'services/analytics-service' },
  { name: 'websocket-gateway', port: 3011, dir: 'services/websocket-gateway' },
  { name: 'logger-service', port: 3012, dir: 'services/logger-service' },
  { name: 'experience-service', port: 4011, dir: 'services/experience-service' },
  { name: 'wishlist-service', port: 4012, dir: 'services/wishlist-service' },
  { name: 'gift-card-service', port: 4013, dir: 'services/gift-card-service' },
  { name: 'dispute-service', port: 4014, dir: 'services/dispute-service' },
  { name: 'identity-verification-service', port: 4015, dir: 'services/identity-verification-service' },
  { name: 'cancellation-policy-service', port: 4016, dir: 'services/cancellation-policy-service' },
  { name: 'coupon-service', port: 4017, dir: 'services/coupon-service' },
  { name: 'two-factor-service', port: 4018, dir: 'services/two-factor-service' },
  { name: 'payout-service', port: 4019, dir: 'services/payout-service' },
  { name: 'email-service', port: 4020, dir: 'services/email-service' },
  { name: 'payment-history-service', port: 4021, dir: 'services/payment-history-service' },
]

const PIDS_DIR = path.join(process.env.HOME || '', 'hometrip-microservices', 'pids')
const LOGS_DIR = path.join(process.env.HOME || '', 'hometrip-microservices', 'logs')

// Créer les dossiers si nécessaire
if (!fs.existsSync(PIDS_DIR)) {
  fs.mkdirSync(PIDS_DIR, { recursive: true })
}
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

async function isPortInUse(port: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`lsof -i:${port}`)
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

async function getPidFromPort(port: number): Promise<number | null> {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`)
    const pid = parseInt(stdout.trim(), 10)
    return isNaN(pid) ? null : pid
  } catch {
    return null
  }
}

function savePid(serviceName: string, pid: number) {
  const pidFile = path.join(PIDS_DIR, `${serviceName}.pid`)
  fs.writeFileSync(pidFile, pid.toString())
}

function loadPid(serviceName: string): number | null {
  const pidFile = path.join(PIDS_DIR, `${serviceName}.pid`)
  try {
    if (fs.existsSync(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10)
      return isNaN(pid) ? null : pid
    }
  } catch {
    return null
  }
  return null
}

function removePid(serviceName: string) {
  const pidFile = path.join(PIDS_DIR, `${serviceName}.pid`)
  try {
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile)
    }
  } catch {}
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function startService(service: typeof SERVICES[0]): Promise<boolean> {
  const serviceDir = path.resolve(service.dir)

  // Vérifier si le dossier existe
  if (!fs.existsSync(serviceDir)) {
    console.log(`❌ Service ${service.name}: dossier non trouvé (${serviceDir})`)
    return false
  }

  // Vérifier si le port est déjà utilisé
  const portInUse = await isPortInUse(service.port)
  if (portInUse) {
    console.log(`⚠️  ${service.name}: port ${service.port} déjà utilisé`)
    return false
  }

  console.log(`🚀 Démarrage de ${service.name} sur le port ${service.port}...`)

  // Créer les fichiers de log
  const timestamp = new Date().toISOString().split('T')[0]
  const logFile = path.join(LOGS_DIR, `${service.name}_${timestamp}.log`)
  const errorLogFile = path.join(LOGS_DIR, `${service.name}_${timestamp}_error.log`)

  // Ouvrir les fichiers pour les logs
  const outFd = fs.openSync(logFile, 'a')
  const errFd = fs.openSync(errorLogFile, 'a')

  // Démarrer le service
  const child = spawn('npm', ['run', 'dev'], {
    cwd: serviceDir,
    detached: true,
    stdio: ['ignore', outFd, errFd],
    env: {
      ...process.env,
      PORT: service.port.toString(),
    },
  })

  child.unref()

  if (child.pid) {
    savePid(service.name, child.pid)
  }

  // Fermer les file descriptors après un court délai
  setTimeout(() => {
    try {
      fs.closeSync(outFd)
      fs.closeSync(errFd)
    } catch (e) {
      // Ignore errors
    }
  }, 1000)

  // Attendre un peu pour vérifier
  await new Promise((resolve) => setTimeout(resolve, 2000))

  if (child.pid && isProcessRunning(child.pid)) {
    console.log(`✅ ${service.name} démarré (PID: ${child.pid})`)
    return true
  } else {
    console.log(`❌ ${service.name} n'a pas pu démarrer`)
    return false
  }
}

async function stopService(serviceName: string): Promise<boolean> {
  const service = SERVICES.find((s) => s.name === serviceName)
  if (!service) {
    console.log(`❌ Service ${serviceName} introuvable`)
    return false
  }

  const savedPid = loadPid(service.name)
  const portPid = await getPidFromPort(service.port)

  const pid = portPid || savedPid

  if (!pid) {
    console.log(`⚠️  ${service.name} n'est pas en cours d'exécution`)
    removePid(service.name)
    return false
  }

  if (!isProcessRunning(pid)) {
    console.log(`⚠️  ${service.name} n'est pas en cours d'exécution (PID obsolète: ${pid})`)
    removePid(service.name)
    return false
  }

  console.log(`�� Arrêt de ${service.name} (PID: ${pid})...`)

  try {
    process.kill(pid, 'SIGTERM')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    if (!isProcessRunning(pid)) {
      console.log(`✅ ${service.name} arrêté`)
      removePid(service.name)
      return true
    }

    // Force kill si nécessaire
    process.kill(pid, 'SIGKILL')
    console.log(`✅ ${service.name} arrêté (force kill)`)
    removePid(service.name)
    return true
  } catch (error) {
    console.log(`❌ Erreur lors de l'arrêt de ${service.name}`)
    return false
  }
}

async function getServiceStatus(service: typeof SERVICES[0]) {
  const portPid = await getPidFromPort(service.port)
  const savedPid = loadPid(service.name)

  const running = portPid !== null && isProcessRunning(portPid)

  return {
    name: service.name,
    port: service.port,
    running,
    pid: portPid || savedPid,
  }
}

async function showStatus() {
  console.log('\n📊 Status des Microservices HomeTrip')
  console.log('═'.repeat(60))

  for (const service of SERVICES) {
    const status = await getServiceStatus(service)
    const icon = status.running ? '✅' : '❌'
    const state = status.running ? 'Running' : 'Stopped'
    const pid = status.pid ? `(PID: ${status.pid})` : ''

    console.log(`\n${icon} ${service.name}`)
    console.log(`   Status: ${state} ${pid}`)
    console.log(`   Port: ${service.port}`)
    console.log(`   URL: http://localhost:${service.port}`)
  }

  console.log('\n' + '═'.repeat(60) + '\n')
}

async function startAll() {
  console.log('🚀 Démarrage de tous les services...\n')

  for (const service of SERVICES) {
    await startService(service)
    // Petit délai entre chaque service
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  console.log('\n✅ Tous les services ont été démarrés\n')
  await showStatus()
}

async function stopAll() {
  console.log('🛑 Arrêt de tous les services...\n')

  for (const service of SERVICES) {
    await stopService(service.name)
  }

  console.log('\n✅ Tous les services ont été arrêtés\n')
}

function listServices() {
  console.log('\n📦 Services disponibles:\n')
  SERVICES.forEach((service, index) => {
    console.log(`${index + 1}. ${service.name.padEnd(25)} - Port ${service.port}`)
  })
  console.log('')
}

async function main() {
  const command = process.argv[2] || 'help'
  const target = process.argv[3]

  switch (command) {
    case 'start':
      if (target) {
        const service = SERVICES.find((s) => s.name === target)
        if (service) {
          await startService(service)
        } else {
          console.log(`❌ Service ${target} introuvable`)
          listServices()
        }
      } else {
        await startAll()
      }
      break

    case 'stop':
      if (target) {
        await stopService(target)
      } else {
        await stopAll()
      }
      break

    case 'restart':
      if (target) {
        await stopService(target)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const service = SERVICES.find((s) => s.name === target)
        if (service) {
          await startService(service)
        }
      } else {
        await stopAll()
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await startAll()
      }
      break

    case 'status':
      await showStatus()
      break

    case 'list':
      listServices()
      break

    case 'help':
    default:
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║        HomeTrip Microservices Manager                     ║
╚═══════════════════════════════════════════════════════════╝

📦 Commandes:

  start [service]     Démarre un ou tous les services
  stop [service]      Arrête un ou tous les services
  restart [service]   Redémarre un ou tous les services
  status              Affiche le statut de tous les services
  list                Liste tous les services disponibles
  help                Affiche cette aide

📝 Exemples:

  tsx scripts/dev.ts start                  # Démarre tous les services
  tsx scripts/dev.ts start api-gateway      # Démarre api-gateway uniquement
  tsx scripts/dev.ts stop auth-service      # Arrête auth-service
  tsx scripts/dev.ts restart booking-service # Redémarre booking-service
  tsx scripts/dev.ts status                 # Affiche le statut
  tsx scripts/dev.ts list                   # Liste les services

🔗 Services:
${SERVICES.map((s) => `  • ${s.name.padEnd(25)} - Port ${s.port}`).join('\n')}
      `)
      break
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('❌ Erreur:', error.message)
  process.exit(1)
})
