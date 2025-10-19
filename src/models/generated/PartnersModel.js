// src/models/generated/PartnersModel.js - Auto-generated model for fcb_partners
const logger = require('../../utils/logger');

// Try to load database pool
let pool;
try {
  const db = require('../../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for PartnersModel');
}

class PartnersModel {
  
  /**
   * Find all records
   * @param {Object} options - Query options
   * @returns {Array} Array of records
   */
  static async findAll(options = {}) {
    if (!pool) {
      logger.warn('Database not available for PartnersModel.findAll');
      return [];
    }

    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM fcb_partners';
      const conditions = [];
      const values = [];
      
      
      // Filter by active status if not specified otherwise
      if (options.includeInactive !== true) {
        conditions.push('is_active = $' + (values.length + 1));
        values.push(true);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC';
      
      if (options.limit) {
        query += ' LIMIT $' + (values.length + 1);
        values.push(options.limit);
      }
      
      const result = await client.query(query, values);
      
      logger.debug('PartnersModel.findAll', { 
        count: result.rows.length,
        options 
      });
      
      return result.rows;
      
    } catch (error) {
      logger.error('Error in PartnersModel.findAll', { 
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  

  /**
   * Create new record
   * @param {Object} data - Record data
   * @returns {Object} Created record
   */
  static async create(data) {
    if (!pool) {
      throw new Error('Database not available for PartnersModel.create');
    }

    const client = await pool.connect();
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => '$' + (index + 1)).join(', ');
      
      const query = `
        INSERT INTO fcb_partners (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      logger.info('PartnersModel.create', { 
        
        fields: fields.length 
      });
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error in PartnersModel.create', { 
        error: error.message,
        data 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  

  /**
   * Count records
   * @param {Object} conditions - Query conditions
   * @returns {number} Record count
   */
  static async count(conditions = {}) {
    if (!pool) {
      return 0;
    }

    const client = await pool.connect();
    try {
      let query = 'SELECT COUNT(*) FROM fcb_partners';
      const whereConditions = [];
      const values = [];
      
      
      if (conditions.includeInactive !== true) {
        whereConditions.push('is_active = $' + (values.length + 1));
        values.push(true);
      }
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const result = await client.query(query, values);
      
      return parseInt(result.rows[0].count);
      
    } catch (error) {
      logger.error('Error in PartnersModel.count', { 
        error: error.message,
        conditions 
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PartnersModel;
