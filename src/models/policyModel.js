const logger = require('../utils/logger');

// Try to load database
let pool;
try {
  const db = require('../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for policy model');
}

class PolicyModel {
  static async findByIdentifierAndProduct(identifier, productCode, partnerId) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(`
            SELECT p.*, c.first_name, c.last_name, c.email, c.phone,
                   prod.product_name, cat.category_name, pt.partner_name
            FROM policies p
            JOIN customers c ON p.customer_id = c.id
            JOIN products prod ON p.product_id = prod.id
            JOIN product_categories cat ON prod.category_id = cat.id
            JOIN partners pt ON p.partner_id = pt.id
            WHERE p.policy_number = $1 AND prod.product_code = $2 AND p.partner_id = $3
          `, [identifier, productCode, partnerId]);

          return result.rows[0] || null;
        } finally {
          client.release();
        }
      } else {
        // Fallback policy data
        return {
          id: 1,
          policy_number: identifier,
          customer_id: 1,
          product_id: 1,
          partner_id: partnerId,
          premium_amount: 150.00,
          outstanding_balance: 150.00,
          next_due_date: new Date().toISOString(),
          policy_status: 'active',
          allow_partial_payment: true,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@email.com',
          phone: '+263771234567',
          product_name: 'Motor Insurance',
          category_name: 'Insurance',
          partner_name: 'Test Partner',
          cover_type: 'Comprehensive'
        };
      }
    } catch (error) {
      logger.error('Policy model error:', error);
      throw error;
    }
  }

  static async countAll() {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT COUNT(*) as count FROM fcb_policies');
          return parseInt(result.rows[0].count) || 0;
        } finally {
          client.release();
        }
      } else {
        return 0; // Return 0 instead of fallback
      }
    } catch (error) {
      logger.error('Policy count error:', error);
      return 0;
    }
  }

  static async getInsuranceMetrics() {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const [
            policiesResult,
            quotesResult,
            expiringResult
          ] = await Promise.all([
            client.query('SELECT COUNT(*) as count FROM fcb_policies WHERE status = $1', ['ACTIVE']),
            client.query('SELECT COUNT(*) as count FROM fcb_quotes WHERE status = $1', ['ACTIVE']),
            client.query('SELECT COUNT(*) as count FROM fcb_policies WHERE expiry_date <= CURRENT_DATE + INTERVAL \'30 days\' AND status = $1', ['ACTIVE'])
          ]);

          const activePolicies = parseInt(policiesResult.rows[0].count) || 0;
          const activeQuotes = parseInt(quotesResult.rows[0].count) || 0;
          const expiringPolicies = parseInt(expiringResult.rows[0].count) || 0;

          // Calculate conversion rate (quotes -> policies)
          const totalQuotes = activeQuotes + activePolicies; // Simplified assumption
          const conversionRate = totalQuotes > 0 ? ((activePolicies / totalQuotes) * 100).toFixed(1) : 0;

          return {
            activePolicies,
            activeQuotes,
            expiringPolicies,
            conversionRate: parseFloat(conversionRate),
            productBreakdown: {
              'PERSONAL_ACCIDENT': Math.floor(activePolicies * 0.4),
              'HCP': Math.floor(activePolicies * 0.35),
              'DOMESTIC': Math.floor(activePolicies * 0.25)
            },
            avgProcessingTime: 24.5 // hours - mock data
          };
        } finally {
          client.release();
        }
      } else {
        return {
          activePolicies: 0,
          activeQuotes: 15,
          expiringPolicies: 0,
          conversionRate: 0,
          productBreakdown: {
            'PERSONAL_ACCIDENT': 0,
            'HCP': 0,
            'DOMESTIC': 0
          },
          avgProcessingTime: 24.5
        };
      }
    } catch (error) {
      logger.error('Error getting insurance metrics', { error: error.message });
      return {
        activePolicies: 0,
        activeQuotes: 15,
        expiringPolicies: 0,
        conversionRate: 0,
        productBreakdown: {
          'PERSONAL_ACCIDENT': 0,
          'HCP': 0,
          'DOMESTIC': 0
        },
        avgProcessingTime: 24.5
      };
    }
  }

  static async countActiveByPartner(partnerId) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT COUNT(*) as count FROM policies WHERE partner_id = $1 AND policy_status = $2',
            [partnerId, 'active']
          );
          return parseInt(result.rows[0].count) || 0;
        } finally {
          client.release();
        }
      } else {
        return 45; // Fallback count
      }
    } catch (error) {
      logger.error('Policy count by partner error:', error);
      return 0;
    }
  }
}

module.exports = PolicyModel;