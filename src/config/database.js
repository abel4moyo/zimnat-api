const config = require('./environment');

const databaseConfig = {
  development: {
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  test: {
    host: config.DB_HOST || 'localhost',
    port: config.DB_PORT || 5432,
    database: `${config.DB_NAME}_test` || 'fcb_zimnat_test',
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    ssl: false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 1000,
  },
  
  production: {
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  }
};

module.exports = databaseConfig[config.NODE_ENV] || databaseConfig.development;
