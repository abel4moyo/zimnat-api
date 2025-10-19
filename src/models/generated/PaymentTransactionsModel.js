// src/models/generated/PaymentTransactionsModel.js - Auto-generated model for fcb_payment_transactions
const logger = require('../../utils/logger');

// Try to load database pool
let pool;
try {
  const db = require('../../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for PaymentTransactionsModel');
}

class PaymentTransactionsModel {
  
  /**
   * Find all records
   * @param {Object} options - Query options
   * @returns {Array} Array of records
   */
  static async findAll(options = {}) {
    if (!pool) {
      logger.warn('Database not available for PaymentTransactionsModel.findAll');
      return [];
    }

    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM fcb_payment_transactions';
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
      
      logger.debug('PaymentTransactionsModel.findAll', { 
        count: result.rows.length,
        options 
      });
      
      return result.rows;
      
    } catch (error) {
      logger.error('Error in PaymentTransactionsModel.findAll', { 
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  
  /**
   * Find record by ID
   * @param {number} id - Record ID
   * @returns {Object|null} Record object or null
   */
  static async findById(id) {
    if (!pool) {
      return null;
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM fcb_payment_transactions WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } catch (error) {
      logger.error('Error in PaymentTransactionsModel.findById', { 
        error: error.message, 
        id 
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
      throw new Error('Database not available for PaymentTransactionsModel.create');
    }

    const client = await pool.connect();
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => '$' + (index + 1)).join(', ');
      
      const query = `
        INSERT INTO fcb_payment_transactions (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      logger.info('PaymentTransactionsModel.create', { 
        id: result.rows[0].id,
        fields: fields.length 
      });
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error in PaymentTransactionsModel.create', { 
        error: error.message,
        data 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  
  /**
   * Update record by ID
   * @param {number} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Object} Updated record
   */
  static async update(id, data) {
    if (!pool) {
      throw new Error('Database not available for PaymentTransactionsModel.update');
    }

    const client = await pool.connect();
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map((field, index) => 
        `${field} = $${index + 1}`
      ).join(', ');
      
      
      // Add updated_at timestamp
      const updateQuery = `
        UPDATE fcb_payment_transactions 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${values.length + 1}
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [...values, id]);
      
      if (result.rows.length === 0) {
        throw new Error(`payment_transactions with ID ${id} not found`);
      }
      
      logger.info('PaymentTransactionsModel.update', { 
        id,
        fields: fields.length 
      });
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error in PaymentTransactionsModel.update', { 
        error: error.message,
        id,
        data 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete record by ID
   * @param {number} id - Record ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    if (!pool) {
      throw new Error('Database not available for PaymentTransactionsModel.delete');
    }

    const client = await pool.connect();
    try {
      
      // Hard delete
      const result = await client.query(
        'DELETE FROM fcb_payment_transactions WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`payment_transactions with ID ${id} not found`);
      }
      
      logger.info('PaymentTransactionsModel.delete', { id });
      
      return true;
      
    } catch (error) {
      logger.error('Error in PaymentTransactionsModel.delete', { 
        error: error.message,
        id 
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
      let query = 'SELECT COUNT(*) FROM fcb_payment_transactions';
      const whereConditions = [];
      const values = [];
      
      
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const result = await client.query(query, values);
      
      return parseInt(result.rows[0].count);
      
    } catch (error) {
      logger.error('Error in PaymentTransactionsModel.count', { 
        error: error.message,
        conditions 
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PaymentTransactionsModel;
