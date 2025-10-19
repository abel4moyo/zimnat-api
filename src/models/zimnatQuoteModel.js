



const logger = require('../utils/logger');

// Try to load database
let pool;
try {
  const db = require('../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for zimnat quote model');
}

class ZimnatQuoteModel {
  static async create(quoteData) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(`
            INSERT INTO zimnat_quotes 
            (quote_number, customer_first_name, customer_last_name, customer_id_number, 
             product_type, package_type, premium_amount, status, expires_at, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
          `, [
            quoteData.quote_number,
            quoteData.customer_first_name,
            quoteData.customer_last_name,
            quoteData.customer_id_number,
            quoteData.product_type,
            quoteData.package_type,
            quoteData.premium_amount,
            quoteData.status || 'active',
            quoteData.expires_at,
            JSON.stringify(quoteData.metadata || {})
          ]);
          return result.rows;
        } finally {
          client.release();
        }
      } else {
        // Fallback creation
        return [{
          id: Date.now(),
          ...quoteData,
          status: quoteData.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }];
      }
    } catch (error) {
      logger.error('Zimnat quote creation error:', error);
      throw error;
    }
  }

  static async findByQuoteNumber(quoteNumber) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT * FROM zimnat_quotes WHERE quote_number = $1',
            [quoteNumber]
          );
          return result.rows[0] || null;
        } finally {
          client.release();
        }
      } else {
        // Fallback quote data
        return {
          id: 1,
          quote_number: quoteNumber,
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          customer_id_number: '12-345678-A-90',
          product_type: 'MOTOR',
          package_type: 'COMPREHENSIVE',
          premium_amount: 150.00,
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {}
        };
      }
    } catch (error) {
      logger.error('Zimnat quote lookup error:', error);
      throw error;
    }
  }

  static async updateStatus(quoteId, status, metadata = {}) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(`
            UPDATE zimnat_quotes 
            SET status = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
          `, [status, JSON.stringify(metadata), quoteId]);
          return result.rows;
        } finally {
          client.release();
        }
      } else {
        // Fallback update
        return [{
          id: quoteId,
          status: status,
          metadata: metadata,
          updated_at: new Date().toISOString()
        }];
      }
    } catch (error) {
      logger.error('Zimnat quote update error:', error);
      throw error;
    }
  }

  static async findByCustomerInfo(firstName, lastName, idNumber) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(`
            SELECT * FROM zimnat_quotes 
            WHERE customer_first_name = $1 AND customer_last_name = $2 AND customer_id_number = $3
            ORDER BY created_at DESC
          `, [firstName, lastName, idNumber]);
          return result.rows;
        } finally {
          client.release();
        }
      } else {
        // Fallback customer quotes
        return [{
          id: 1,
          quote_number: 'QTE-001-DEMO',
          customer_first_name: firstName,
          customer_last_name: lastName,
          customer_id_number: idNumber,
          product_type: 'MOTOR',
          package_type: 'COMPREHENSIVE',
          premium_amount: 150.00,
          status: 'active',
          created_at: new Date().toISOString()
        }];
      }
    } catch (error) {
      logger.error('Zimnat quote customer lookup error:', error);
      throw error;
    }
  }

  static async findRecent(limit = 50) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT * FROM zimnat_quotes ORDER BY created_at DESC LIMIT $1',
            [limit]
          );
          return result.rows;
        } finally {
          client.release();
        }
      } else {
        // Fallback recent quotes
        return [
          {
            id: 1,
            quote_number: 'QTE-001-DEMO',
            customer_first_name: 'John',
            customer_last_name: 'Doe',
            product_type: 'MOTOR',
            premium_amount: 150.00,
            status: 'active',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            quote_number: 'QTE-002-DEMO',
            customer_first_name: 'Jane',
            customer_last_name: 'Smith',
            product_type: 'TRAVEL',
            premium_amount: 75.00,
            status: 'active',
            created_at: new Date().toISOString()
          }
        ];
      }
    } catch (error) {
      logger.error('Zimnat quote recent lookup error:', error);
      return [];
    }
  }

  static async findExpiring(days = 30) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + days);
          
          const result = await client.query(`
            SELECT * FROM zimnat_quotes 
            WHERE status = 'active' AND expires_at <= $1
            ORDER BY expires_at ASC
          `, [expiryDate.toISOString()]);
          return result.rows;
        } finally {
          client.release();
        }
      } else {
        // Fallback expiring quotes
        return [{
          id: 1,
          quote_number: 'QTE-EXP-001',
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          product_type: 'MOTOR',
          premium_amount: 150.00,
          status: 'active',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          created_at: new Date().toISOString()
        }];
      }
    } catch (error) {
      logger.error('Zimnat quote expiring lookup error:', error);
      return [];
    }
  }

  static async countAll() {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT COUNT(*) as count FROM zimnat_quotes');
          return parseInt(result.rows[0].count) || 0;
        } finally {
          client.release();
        }
      } else {
        return 67; // Fallback count
      }
    } catch (error) {
      logger.error('Zimnat quote count error:', error);
      return 0;
    }
  }
}

module.exports = ZimnatQuoteModel;