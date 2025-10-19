


const logger = require('../utils/logger');

// Try to load database
let pool;
try {
  const db = require('../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for transaction model');
}

class TransactionModel {
  static async findPaginated(partnerId, page, limit, status, dateFrom, dateTo) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          let query = `
            SELECT t.*, 
                   pol.policy_number,
                   c.first_name, c.last_name,
                   prod.product_name
            FROM fcb_payment_transactions t
            LEFT JOIN policies pol ON t.policy_id = pol.id
            LEFT JOIN customers c ON t.customer_id = c.id
            LEFT JOIN products prod ON pol.product_id = prod.id
            WHERE t.partner_id = $1
          `;
          const params = [partnerId];
          let paramCount = 1;

          if (status) {
            paramCount++;
            query += ` AND t.status = $${paramCount}`;
            params.push(status);
          }

          if (dateFrom) {
            paramCount++;
            query += ` AND t.created_at >= $${paramCount}`;
            params.push(dateFrom);
          }

          if (dateTo) {
            paramCount++;
            query += ` AND t.created_at <= $${paramCount}`;
            params.push(dateTo);
          }

          query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
          params.push(limit, (page - 1) * limit);

          const result = await client.query(query, params);

          // Get total count
          let countQuery = 'SELECT COUNT(*) FROM fcb_payment_transactions t WHERE t.partner_id = $1';
          const countParams = [partnerId];
          let countParamCount = 1;

          if (status) {
            countParamCount++;
            countQuery += ` AND t.status = $${countParamCount}`;
            countParams.push(status);
          }

          if (dateFrom) {
            countParamCount++;
            countQuery += ` AND t.created_at >= $${countParamCount}`;
            countParams.push(dateFrom);
          }

          if (dateTo) {
            countParamCount++;
            countQuery += ` AND t.created_at <= $${countParamCount}`;
            countParams.push(dateTo);
          }

          const countResult = await client.query(countQuery, countParams);
          const total = parseInt(countResult.rows[0].count) || 0;

          return { data: result.rows, total };
        } finally {
          client.release();
        }
      } else {
        // Fallback data
        const fallbackData = [
          {
            id: 1,
            transaction_reference: 'TXN-001-DEMO',
            amount: '150.00',
            status: 'completed',
            payment_method: 'bank_transfer',
            external_reference: 'BANK-REF-001',
            created_at: new Date().toISOString(),
            policy_number: 'POL-123456',
            first_name: 'John',
            last_name: 'Doe',
            product_name: 'Motor Insurance'
          },
          {
            id: 2,
            transaction_reference: 'TXN-002-DEMO',
            amount: '275.50',
            status: 'pending',
            payment_method: 'mobile_money',
            external_reference: 'MOB-REF-002',
            created_at: new Date().toISOString(),
            policy_number: 'POL-123457',
            first_name: 'Jane',
            last_name: 'Smith',
            product_name: 'Travel Insurance'
          }
        ];

        // Apply filters
        let filteredData = fallbackData;
        if (status) {
          filteredData = filteredData.filter(t => t.status === status);
        }

        return { data: filteredData, total: filteredData.length };
      }
    } catch (error) {
      logger.error('Transaction model error:', error);
      throw error;
    }
  }

  static async countAll() {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT COUNT(*) as count FROM fcb_payment_transactions');
          return parseInt(result.rows[0].count) || 0;
        } finally {
          client.release();
        }
      } else {
        return 267; // Fallback count
      }
    } catch (error) {
      logger.error('Transaction count error:', error);
      return 0;
    }
  }

  static async sumCompletedAmount() {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM fcb_payment_transactions WHERE status = $1',
            ['completed']
          );
          return parseFloat(result.rows[0].total) || 0;
        } finally {
          client.release();
        }
      } else {
        return 45678.90; // Fallback amount
      }
    } catch (error) {
      logger.error('Transaction sum error:', error);
      return 0;
    }
  }

  static async findRecent(limit = 10) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          // First try to get column information to avoid errors
          const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'fcb_payment_transactions' 
            AND column_name IN ('partner_id', 'partner_code', 'policy_id', 'customer_id')
          `);
          
          const availableColumns = columnCheck.rows.map(row => row.column_name);
          
          // Build query based on available columns
          let query = `
            SELECT t.*,
                   COALESCE(p.partner_name, 'Unknown Partner') as partner_name,
                   COALESCE(t.transaction_id, t.id::text) as transaction_id,
                   COALESCE(t.amount, 0) as amount,
                   COALESCE(t.status, 'unknown') as status
            FROM fcb_payment_transactions t`;
          
          if (availableColumns.includes('partner_id')) {
            query += ` LEFT JOIN fcb_partners p ON t.partner_id = p.id`;
          } else if (availableColumns.includes('partner_code')) {
            // If no partner_id column, try to join by partner_code
            query += ` LEFT JOIN fcb_partners p ON t.partner_code = p.partner_code`;
          } else {
            // No partner relationship available
            query += ` LEFT JOIN fcb_partners p ON false`;
          }
          
          query += ` ORDER BY t.created_at DESC LIMIT $1`;
          
          const result = await client.query(query, [limit]);
          return result.rows;
        } finally {
          client.release();
        }
      } else {
        // Fallback recent transactions
        return [
          {
            id: 1,
            transaction_reference: 'TXN-001-DEMO',
            amount: '150.00',
            status: 'completed',
            partner_name: 'FCB Bank',
            policy_number: 'POL-123456',
            first_name: 'John',
            last_name: 'Doe',
            product_name: 'Motor Insurance',
            created_at: new Date().toISOString()
          }
        ];
      }
    } catch (error) {
      logger.error('Transaction recent error:', error);
      return [];
    }
  }

  static async countByPartner(partnerId) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT COUNT(*) as count FROM fcb_payment_transactions WHERE partner_id = $1',
            [partnerId]
          );
          return parseInt(result.rows[0].count) || 0;
        } finally {
          client.release();
        }
      } else {
        return 125; // Fallback count
      }
    } catch (error) {
      logger.error('Transaction count by partner error:', error);
      return 0;
    }
  }

  static async sumRevenueByPartner(partnerId) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM fcb_payment_transactions WHERE partner_id = $1 AND status = $2',
            [partnerId, 'completed']
          );
          return parseFloat(result.rows[0].total) || 0;
        } finally {
          client.release();
        }
      } else {
        return 15000.00; // Fallback revenue
      }
    } catch (error) {
      logger.error('Transaction revenue by partner error:', error);
      return 0;
    }
  }
}

module.exports = TransactionModel;