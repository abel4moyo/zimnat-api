// ===================================================================
// KNEX CONFIGURATION FILE
// File: knexfile.js (project root)
// ===================================================================

require('dotenv').config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'FCB',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'S@turday123'
    },
    migrations: {
      directory: './src/db/migrations'
    },
    seeds: {
      directory: './src/db/seeds'
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './src/db/migrations'
    },
    seeds: {
      directory: './src/db/seeds'
    },
    pool: {
      min: 2,
      max: 20
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './src/db/migrations'
    },
    seeds: {
      directory: './src/db/seeds'
    },
    pool: {
      min: 5,
      max: 30
    },
    acquireConnectionTimeout: 60000
  }
};
