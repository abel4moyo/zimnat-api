// =============================================================================
// POSTGRESQL PAYMENT SERVICE
// File: src/services/postgresPaymentService.js
// Description: Service for handling policy payments in local PostgreSQL database
// =============================================================================

const { Pool } = require('pg');
const logger = require('../utils/logger');
const ZimnatHelper = require('../utils/zimnatHelper');

class PostgreSQLPaymentService {
  constructor() {
    this.pool = new Pool({
      user: process.env.POSTGRES_USER || 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      database: process.env.POSTGRES_DB || 'FCB',
      password: process.env.POSTGRES_PASSWORD || 'S@turday123',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });
  }

  /**
   * Initialize and test database connection
   */
  async initialize() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('PostgreSQL Payment Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize PostgreSQL Payment Service:', error.message);
      return false;
    }
  }

  /**
   * Create a new payment record
   */
  async createPayment(paymentData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Generate payment reference if not provided
      const paymentReference = paymentData.payment_reference || ZimnatHelper.generateCustomerReference('PAY');
      
      const insertQuery = `
        INSERT INTO policy_payments (
          policy_number,
          policy_holder_name,
          product_category,
          insurance_type,
          payment_reference,
          transaction_id,
          amount,
          currency,
          payment_method,
          payment_status,
          customer_name,
          customer_email,
          customer_phone,
          database_source,
          partner_id,
          return_url,
          callback_url,
          payment_gateway,
          expires_at,
          created_by,
          notes,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
      `;

      const values = [
        paymentData.policy_number,
        paymentData.policy_holder_name,
        paymentData.product_category,
        paymentData.insurance_type || 'General',
        paymentReference,
        paymentData.transaction_id,
        paymentData.amount,
        paymentData.currency || 'USD',
        paymentData.payment_method,
        paymentData.payment_status || 'INITIATED',
        paymentData.customer_name || paymentData.policy_holder_name,
        paymentData.customer_email,
        paymentData.customer_phone,
        paymentData.database_source,
        paymentData.partner_id,
        paymentData.return_url,
        paymentData.callback_url,
        paymentData.payment_gateway,
        paymentData.expires_at || new Date(Date.now() + 30 * 60 * 1000), // 30 minutes default
        paymentData.created_by || 'API',
        paymentData.notes,
        paymentData.metadata || {}
      ];

      const result = await client.query(insertQuery, values);
      await client.query('COMMIT');

      const payment = result.rows[0];
      
      logger.info('Payment record created', {
        paymentId: payment.id,
        paymentReference: payment.payment_reference,
        policyNumber: payment.policy_number,
        amount: payment.amount,
        currency: payment.currency
      });

      return {
        success: true,
        payment: payment,
        paymentReference: payment.payment_reference
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating payment record:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentReference, status, updateData = {}) {
    const client = await this.pool.connect();
    try {
      const updateQuery = `
        UPDATE policy_payments 
        SET 
          payment_status = $2,
          gateway_reference = COALESCE($3, gateway_reference),
          gateway_response = COALESCE($4, gateway_response),
          callback_received_at = CASE WHEN $5 THEN NOW() ELSE callback_received_at END,
          notes = COALESCE($6, notes),
          updated_at = NOW()
        WHERE payment_reference = $1
        RETURNING *
      `;

      const values = [
        paymentReference,
        status,
        updateData.gateway_reference,
        updateData.gateway_response ? JSON.stringify(updateData.gateway_response) : null,
        updateData.callback_received || false,
        updateData.notes
      ];

      const result = await client.query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Payment not found: ${paymentReference}`);
      }

      const payment = result.rows[0];
      
      logger.info('Payment status updated', {
        paymentReference,
        oldStatus: updateData.oldStatus,
        newStatus: status,
        gatewayReference: updateData.gateway_reference
      });

      return {
        success: true,
        payment: payment
      };

    } catch (error) {
      logger.error('Error updating payment status:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payment by reference
   */
  async getPaymentByReference(paymentReference) {
    try {
      const query = `
        SELECT * FROM policy_payments 
        WHERE payment_reference = $1
      `;
      
      const result = await this.pool.query(query, [paymentReference]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Payment not found',
          paymentReference
        };
      }

      return {
        success: true,
        payment: result.rows[0]
      };

    } catch (error) {
      logger.error('Error getting payment by reference:', error.message);
      throw error;
    }
  }

  /**
   * Get payment status for partner API
   */
  async getPaymentStatus(transactionReference, partnerId = null) {
    try {
      let query = `
        SELECT 
          payment_reference as transaction_reference,
          payment_status as status,
          amount,
          currency,
          policy_number,
          policy_holder_name as customer_name,
          product_category as product_name,
          payment_method,
          gateway_reference as external_reference,
          initiated_at as created_at,
          paid_at as processed_at
        FROM policy_payments 
        WHERE payment_reference = $1
      `;

      const params = [transactionReference];

      if (partnerId) {
        query += ' AND partner_id = $2';
        params.push(partnerId);
      }
      
      const result = await this.pool.query(query, params);
      
      if (result.rows.length === 0) {
        throw {
          status: 404,
          message: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        };
      }

      const payment = result.rows[0];
      
      // Calculate partner fee (1% for example)
      const partnerFee = parseFloat(payment.amount) * 0.01;
      const netAmount = parseFloat(payment.amount) - partnerFee;

      return {
        transaction_reference: payment.transaction_reference,
        status: payment.status.toLowerCase(),
        amount: parseFloat(payment.amount),
        partner_fee: partnerFee,
        net_amount: netAmount,
        currency: payment.currency,
        policy_number: payment.policy_number,
        customer_name: payment.customer_name,
        product_name: payment.product_name,
        payment_method: payment.payment_method,
        external_reference: payment.external_reference,
        processed_at: payment.processed_at,
        created_at: payment.created_at
      };

    } catch (error) {
      logger.error('Error getting payment status:', error.message);
      throw error;
    }
  }

  /**
   * Process payment with partner data
   */
  async processPayment(partner, paymentData) {
    try {
      // Generate transaction reference
      const transactionReference = ZimnatHelper.generateCustomerReference('TXN');
      
      // Prepare payment record data
      const paymentRecord = {
        policy_number: paymentData.policy_number,
        policy_holder_name: paymentData.customer_name || 'Unknown',
        product_category: paymentData.product_name || 'Insurance',
        insurance_type: paymentData.insurance_type || 'General',
        payment_reference: transactionReference,
        transaction_id: paymentData.external_reference,
        amount: parseFloat(paymentData.amount),
        currency: paymentData.currency || 'USD',
        payment_method: paymentData.payment_method,
        payment_status: 'PENDING',
        customer_name: paymentData.customer_name,
        customer_email: paymentData.customer_email,
        customer_phone: paymentData.customer_phone,
        database_source: paymentData.currency === 'ZIG' ? 'ZIMNATZIG' : 'ZIMNATUSD',
        partner_id: partner.id,
        return_url: paymentData.return_url,
        callback_url: paymentData.callback_url,
        payment_gateway: paymentData.payment_gateway || 'default',
        created_by: `partner_${partner.id}`,
        notes: `Payment initiated by ${partner.partner_name}`,
        metadata: {
          partner_name: partner.partner_name,
          original_request: paymentData
        }
      };

      // Create payment record
      const createResult = await this.createPayment(paymentRecord);
      
      if (!createResult.success) {
        throw new Error('Failed to create payment record');
      }

      // Simulate payment processing (replace with actual gateway integration)
      const gatewayResult = await this.simulatePaymentGateway(createResult.payment);
      
      // Update payment status based on gateway result
      await this.updatePaymentStatus(
        transactionReference,
        gatewayResult.success ? 'SUCCESS' : 'FAILED',
        {
          gateway_reference: gatewayResult.gateway_reference,
          gateway_response: gatewayResult,
          notes: gatewayResult.message
        }
      );

      // Calculate fees
      const amount = parseFloat(paymentData.amount);
      const partnerFee = amount * 0.01;
      const netAmount = amount - partnerFee;

      return {
        transaction_reference: transactionReference,
        status: gatewayResult.success ? 'completed' : 'failed',
        amount: amount,
        partner_fee: partnerFee,
        net_amount: netAmount,
        policy_number: paymentData.policy_number,
        external_reference: paymentData.external_reference,
        payment_method: paymentData.payment_method,
        processed_at: new Date().toISOString(),
        gateway_reference: gatewayResult.gateway_reference,
        message: gatewayResult.message
      };

    } catch (error) {
      logger.error('Error processing payment:', error.message);
      throw error;
    }
  }

  /**
   * Simulate payment gateway processing (replace with actual gateway)
   */
  async simulatePaymentGateway(payment) {
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate 90% success rate
      const isSuccess = Math.random() > 0.1;
      const gatewayReference = ZimnatHelper.generateCustomerReference('GW');

      if (isSuccess) {
        return {
          success: true,
          gateway_reference: gatewayReference,
          message: 'Payment processed successfully',
          processed_at: new Date(),
          transaction_fee: parseFloat(payment.amount) * 0.005 // 0.5% gateway fee
        };
      } else {
        return {
          success: false,
          gateway_reference: null,
          message: 'Payment failed - insufficient funds or card declined',
          processed_at: new Date(),
          error_code: 'PAYMENT_DECLINED'
        };
      }

    } catch (error) {
      logger.error('Gateway simulation error:', error);
      return {
        success: false,
        gateway_reference: null,
        message: 'Payment gateway error',
        processed_at: new Date(),
        error_code: 'GATEWAY_ERROR'
      };
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(partnerId = null, dateFrom = null, dateTo = null) {
    try {
      let query = `
        SELECT 
          payment_status,
          currency,
          insurance_type,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM policy_payments 
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;

      if (partnerId) {
        paramCount++;
        query += ` AND partner_id = $${paramCount}`;
        params.push(partnerId);
      }

      if (dateFrom) {
        paramCount++;
        query += ` AND initiated_at >= $${paramCount}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        paramCount++;
        query += ` AND initiated_at <= $${paramCount}`;
        params.push(dateTo);
      }

      query += ` GROUP BY payment_status, currency, insurance_type ORDER BY count DESC`;
      
      const result = await this.pool.query(query, params);
      
      return {
        success: true,
        statistics: result.rows
      };

    } catch (error) {
      logger.error('Error getting payment statistics:', error.message);
      throw error;
    }
  }

  /**
   * Close database connection pool
   */
  async close() {
    try {
      await this.pool.end();
      logger.info('PostgreSQL Payment Service connections closed');
    } catch (error) {
      logger.error('Error closing PostgreSQL Payment Service:', error.message);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await this.pool.query('SELECT NOW(), COUNT(*) as payment_count FROM policy_payments');
      return {
        status: 'healthy',
        connected: true,
        timestamp: result.rows[0].now,
        total_payments: parseInt(result.rows[0].payment_count)
      };
    } catch (error) {
      logger.error('PostgreSQL Payment Service health check failed:', error.message);
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const postgresPaymentService = new PostgreSQLPaymentService();

module.exports = postgresPaymentService;