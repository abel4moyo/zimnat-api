require('dotenv').config();

module.exports = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,
  
  // Database Configuration
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || 'fcb_zimnat_db',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  
  // API Keys
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'admin-super-secret-key-change-in-production',
  JWT_SECRET: process.env.JWT_SECRET || 'jwt-super-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // Zimnat Configuration
  ZIMNAT_BASE_URL: process.env.ZIMNAT_BASE_URL || 'http://10.200.4.20:9510',
  ZIMNAT_USERNAME: process.env.ZIMNAT_USERNAME || 'zimnat_user',
  ZIMNAT_PASSWORD: process.env.ZIMNAT_PASSWORD || 'zimnat_password',
  
  // Redis Configuration (for caching)
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  
  // External Services
  EMAIL_SERVICE_URL: process.env.EMAIL_SERVICE_URL || '',
  SMS_SERVICE_URL: process.env.SMS_SERVICE_URL || '',
  
  // Security
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || './logs/app.log',
  
  // Feature Flags
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER !== 'false',
  ENABLE_METRICS: process.env.ENABLE_METRICS !== 'false',
  ENABLE_IP_FILTERING: process.env.ENABLE_IP_FILTERING !== 'false'
};
