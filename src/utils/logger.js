/*const winston = require('winston');
const path = require('path');
const config = require('../config/environment');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.dirname(config.LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'fcb-zimnat-api' },
  transports: [
    // Write all logs to file
    new winston.transports.File({
      filename: config.LOG_FILE,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Write errors to separate file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 50 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Add console transport for development
if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger; */

// src/utils/logger.js
// Basic logger implementation with fallback to console

let winston;
try {
  winston = require('winston');
} catch (error) {
  console.warn('Winston not available, using console fallback');
}

let logger;

if (winston) {
  // Full Winston logger if available
  const { NODE_ENV } = process.env;
  
  logger = winston.createLogger({
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

  // Add file transports in production
  if (NODE_ENV === 'production') {
    logger.add(new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }));
    logger.add(new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }));
  }
} else {
  // Fallback logger using console
  logger = {
    info: (message, meta = {}) => {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
    },
    warn: (message, meta = {}) => {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
    },
    error: (message, meta = {}) => {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta);
    },
    debug: (message, meta = {}) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
      }
    }
  };
}

module.exports = logger;