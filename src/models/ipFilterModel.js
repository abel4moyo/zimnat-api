const logger = require('../utils/logger');

// Try to load database
let pool;
try {
  const db = require('../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for IP filter model');
}

class IpFilter {
  static async addOrUpdate(ipAddress, filterType, description = null) {
    try {
      if (!pool) {
        throw new Error('Database connection not available');
      }
      
      const client = await pool.connect();
      try {
        // Try to create the table if it doesn't exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS fcb_ip_filters (
            id SERIAL PRIMARY KEY,
            ip_address INET UNIQUE NOT NULL,
            filter_type VARCHAR(20) NOT NULL CHECK (filter_type IN ('whitelist', 'blacklist')),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Insert or update the IP filter
        const result = await client.query(`
          INSERT INTO fcb_ip_filters (ip_address, filter_type, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (ip_address) 
          DO UPDATE SET filter_type = $2, description = $3, updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [ipAddress, filterType, description]);
        
        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('IP Filter add/update error:', error);
      throw error;
    }
  }

  static async remove(ipAddress) {
    try {
      if (!pool) {
        return 0;
      }
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'DELETE FROM fcb_ip_filters WHERE ip_address = $1',
          [ipAddress]
        );
        return result.rowCount;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('IP Filter remove error:', error);
      return 0;
    }
  }

  static async getByType(filterType) {
    try {
      if (!pool) {
        return [];
      }
      
      const client = await pool.connect();
      try {
        // Try to create the table if it doesn't exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS fcb_ip_filters (
            id SERIAL PRIMARY KEY,
            ip_address INET UNIQUE NOT NULL,
            filter_type VARCHAR(20) NOT NULL CHECK (filter_type IN ('whitelist', 'blacklist')),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        const result = await client.query(
          'SELECT ip_address, description, created_at FROM fcb_ip_filters WHERE filter_type = $1',
          [filterType]
        );
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('IP Filter getByType error:', error);
      return [];
    }
  }

  static async findAll() {
    try {
      if (!pool) {
        return [];
      }
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM fcb_ip_filters ORDER BY filter_type, ip_address'
        );
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('IP Filter findAll error:', error);
      return [];
    }
  }

  static async isWhitelisted(ipAddress) {
    try {
      if (!pool) {
        return false;
      }
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT 1 FROM fcb_ip_filters WHERE ip_address = $1 AND filter_type = $2',
          [ipAddress, 'whitelist']
        );
        return result.rows.length > 0;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('IP Filter isWhitelisted error:', error);
      return false;
    }
  }

  static async isBlacklisted(ipAddress) {
    try {
      if (!pool) {
        return false;
      }
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT 1 FROM fcb_ip_filters WHERE ip_address = $1 AND filter_type = $2',
          [ipAddress, 'blacklist']
        );
        return result.rows.length > 0;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('IP Filter isBlacklisted error:', error);
      return false;
    }
  }
}

module.exports = IpFilter;