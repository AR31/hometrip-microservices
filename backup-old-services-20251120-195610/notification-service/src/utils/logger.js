const fs = require('fs');
const path = require('path');

// Créer le répertoire logs s'il n'existe pas
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel =
  logLevels[process.env.LOG_LEVEL || 'info'] || logLevels.info;

/**
 * Format un message de log avec timestamp
 */
const formatMessage = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
};

/**
 * Écrit dans les fichiers log
 */
const writeToFile = (level, message) => {
  const logFile = path.join(logsDir, `${level}.log`);
  const allLogsFile = path.join(logsDir, 'all.log');

  try {
    fs.appendFileSync(logFile, message + '\n');
    fs.appendFileSync(allLogsFile, message + '\n');
  } catch (error) {
    console.error(`Failed to write to log file: ${error.message}`);
  }
};

/**
 * Enregistre un message d'erreur
 */
const error = (message, data = null) => {
  if (currentLogLevel >= logLevels.error) {
    const formatted = formatMessage('error', message, data);
    console.error(formatted);
    writeToFile('error', formatted);
  }
};

/**
 * Enregistre un message d'avertissement
 */
const warn = (message, data = null) => {
  if (currentLogLevel >= logLevels.warn) {
    const formatted = formatMessage('warn', message, data);
    console.warn(formatted);
    writeToFile('warn', formatted);
  }
};

/**
 * Enregistre un message d'information
 */
const info = (message, data = null) => {
  if (currentLogLevel >= logLevels.info) {
    const formatted = formatMessage('info', message, data);
    console.log(formatted);
    writeToFile('info', formatted);
  }
};

/**
 * Enregistre un message de débogage
 */
const debug = (message, data = null) => {
  if (currentLogLevel >= logLevels.debug) {
    const formatted = formatMessage('debug', message, data);
    console.log(formatted);
    writeToFile('debug', formatted);
  }
};

/**
 * Enregistre les erreurs non capturées
 */
const logUncaughtError = (error) => {
  const message = formatMessage('error', 'Uncaught Error', {
    message: error.message,
    stack: error.stack,
  });
  console.error(message);
  writeToFile('error', message);
};

/**
 * Enregistre les promesses rejetées non gérées
 */
const logUnhandledRejection = (reason, promise) => {
  const message = formatMessage('error', 'Unhandled Promise Rejection', {
    reason: reason.message || reason,
    stack: reason.stack,
  });
  console.error(message);
  writeToFile('error', message);
};

module.exports = {
  error,
  warn,
  info,
  debug,
  logUncaughtError,
  logUnhandledRejection,
};
