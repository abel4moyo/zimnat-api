/**
 * ===================================================================
 * Knex Database Connection
 * File: src/db/knex.js
 * ===================================================================
 *
 * Initializes and exports the Knex database connection instance
 */

const knex = require('knex');
const knexConfig = require('../../knexfile');

// Get environment (default to development)
const environment = process.env.NODE_ENV || 'development';

// Initialize knex with the appropriate configuration
const db = knex(knexConfig[environment]);

module.exports = db;
