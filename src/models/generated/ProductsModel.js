// src/models/generated/ProductsModel.js - Auto-generated model for fcb_products
const logger = require('../../utils/logger');

// Try to load database pool
let pool;
try {
  const db = require('../../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for ProductsModel');
}

class ProductsModel {
  
  /**
   * Find all records
   * @param {Object} options - Query options
   * @returns {Array} Array of records
   */
  static async findAll(options = {}) {
    if (!pool) {
      logger.warn('Database not available for ProductsModel.findAll');
      return [];
    }

    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM fcb_products';
      const conditions = [];
      const values = [];
      
      
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC';
      
      if (options.limit) {
        query += ' LIMIT $' + (values.length + 1);
        values.push(options.limit);
      }
      
      const result = await client.query(query, values);
      
      logger.debug('ProductsModel.findAll', { 
        count: result.rows.length,
        options 
      });
      
      return result.rows;
      
    } catch (error) {
      logger.error('Error in ProductsModel.findAll', { 
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
      throw new Error('Database not available for ProductsModel.create');
    }

    const client = await pool.connect();
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => '$' + (index + 1)).join(', ');
      
      const query = `
        INSERT INTO fcb_products (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      logger.info('ProductsModel.create', { 
        
        fields: fields.length 
      });
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error in ProductsModel.create', { 
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
      let query = 'SELECT COUNT(*) FROM fcb_products';
      const whereConditions = [];
      const values = [];
      
      
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const result = await client.query(query, values);
      
      return parseInt(result.rows[0].count);
      
    } catch (error) {
      logger.error('Error in ProductsModel.count', { 
        error: error.message,
        conditions 
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ProductsModel;
