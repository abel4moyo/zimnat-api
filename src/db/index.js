/*const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/environment');

// Create connection pool
const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL connection error:', err);
});

// Initialize database (run migrations and seeds)
async function initializeDatabase() {
  try {
    logger.info('Initializing database...');
    
    // Run migrations
    await runMigrations();
    
    // Run seeds (only in development)
    if (config.NODE_ENV === 'development') {
      await runSeeds();
    }
    
    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Run database migrations
async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  try {
    const migrationFiles = await fs.readdir(migrationsDir);
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');
      
      logger.info(`Running migration: ${file}`);
      await pool.query(sql);
    }
    
    logger.info(`Completed ${sqlFiles.length} migrations`);
  } catch (error) {
    logger.error('Migration error:', error);
    throw error;
  }
}

// Run database seeds
async function runSeeds() {
  const seedsDir = path.join(__dirname, 'seeds');
  
  try {
    const seedFiles = await fs.readdir(seedsDir);
    const sqlFiles = seedFiles
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of sqlFiles) {
      const filePath = path.join(seedsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');
      
      logger.info(`Running seed: ${file}`);
      await pool.query(sql);
    }
    
    logger.info(`Completed ${sqlFiles.length} seeds`);
  } catch (error) {
    logger.error('Seed error:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initializeDatabase,
  runMigrations,
  runSeeds
};  */


// src/db/index.js
// Basic database connection with fallbacks

const logger = require('../utils/logger');

let pg, knex, pool, db;

// Try to load PostgreSQL modules
try {
  pg = require('pg');
  knex = require('knex');
} catch (error) {
  console.warn('Database modules not available:', error.message);
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'S@turday123',
  database: process.env.DB_NAME || 'FCB',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

if (pg && knex) {
  // Full database setup
  pool = new pg.Pool({
    ...dbConfig,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS) || 2000,
  });

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client (PostgreSQL Pool):', { 
      error: err.message, 
      stack: err.stack 
    });
  });

  // Knex configuration
  const knexConfig = {
    client: 'pg',
    connection: dbConfig,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10
    },
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './src/db/seeds'
    }
  };

  db = knex(knexConfig);

  logger.info('Database connection configured', {
    host: dbConfig.host,
    database: dbConfig.database,
    ssl: !!dbConfig.ssl
  });
} else {
  // Mock database for testing/fallback
  console.warn('⚠️  Database not available - using mock implementation');
  
  pool = {
    connect: () => Promise.resolve({
      query: () => Promise.resolve({ rows: [] }),
      release: () => {}
    }),
    end: () => Promise.resolve()
  };

  db = {
    migrate: {
      latest: () => Promise.resolve()
    },
    seed: {
      run: () => Promise.resolve()
    }
  };
}

// Database initialization function
async function initializeDatabase() {
  try {
    if (db && db.migrate) {
      logger.info('Running database migrations...');
      await db.migrate.latest();
      logger.info('Database migrations completed successfully.');

      // Run seeds in development
      if (process.env.NODE_ENV === 'development') {
        try {
          logger.info('Running database seeds...');
          await db.seed.run();
          logger.info('Database seeding completed successfully.');
        } catch (error) {
          logger.warn('Database seeding failed (this is usually okay):', { 
            error: error.message 
          });
        }
      }
    } else {
      logger.info('Database initialization skipped (no migrations available)');
    }
  } catch (error) {
    logger.error('Database initialization failed:', { 
      error: error.message, 
      stack: error.stack 
    });
    
    if (process.env.NODE_ENV === 'production') {
      throw error; // Fail hard in production
    } else {
      logger.warn('Continuing without database in development mode');
    }
  }
}

// Test database connection
async function testConnection() {
  if (!pool) return false;
  
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', { error: error.message });
    return false;
  }
}

module.exports = { 
  pool, 
  db, 
  initializeDatabase, 
  testConnection 
};