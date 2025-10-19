// =============================================================================
// POLICY PAYMENT SERVICE - PostgreSQL Implementation
// File: src/services/policyPaymentService.js
// Description: Handles policy payment tracking in local PostgreSQL database
// =============================================================================

const knex = require('knex');
const logger = require('../utils/logger');

class PolicyPaymentService {
  constructor() {
    // Use existing knex configuration
    this.db = require('../config/database');
  }

  /**
   * Generate unique payment reference
   */
  generatePaymentReference(currency) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${currency}-POL-${timestamp}-${random}`;
  }

  /**
   * Create a new payment record
   */
  async createPayment(policyData, paymentData) {
    const trx = await this.db.transaction();
    
    try {
      const paymentReference = paymentData.paymentReference || 
        this.generatePaymentReference(paymentData.currency);

      const paymentRecord = {
        // Policy Information
        policy_number: policyData.policy_number,
        policy_holder_name: policyData.policy_holder_name,
        product_category: policyData.product_category,
        insurance_type: policyData.insurance_type,
        
        // Payment Details
        payment_reference: paymentReference,
        amount: parseFloat(paymentData.amount || policyData.package_premium || 0),
        currency: paymentData.currency,
        payment_method: paymentData.paymentMethod,
        payment_status: 'INITIATED',
        
        // Customer Details
        customer_name: policyData.policy_holder_name,
        customer_email: paymentData.customerDetails?.email,
        customer_phone: paymentData.customerDetails?.phone || policyData.mobile,
        
        // Technical Details
        database_source: policyData.database,
        partner_id: paymentData.partnerId || null,
        
        // URLs
        return_url: paymentData.returnUrl,
        callback_url: paymentData.callbackUrl,
        
        // Gateway Information
        payment_gateway: paymentData.paymentGateway || 'MANUAL',
        gateway_reference: paymentData.gatewayReference,
        
        // Expiry (30 minutes from now)
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        
        // Metadata
        metadata: {
          policy_status: policyData.policy_status,
          cover_start_date: policyData.cover_start_date,
          expiry_date: policyData.expiry_date,
          agent: policyData.agent,
          original_request: {
            user_agent: paymentData.userAgent,
            ip_address: paymentData.ipAddress,
            initiated_by: paymentData.initiatedBy
          }
        }
      };

      const [paymentId] = await trx('policy_payments')
        .insert(paymentRecord)
        .returning('id');

      await trx.commit();

      logger.info('Payment record created', {
        paymentId,
        paymentReference,
        policyNumber: policyData.policy_number,
        amount: paymentRecord.amount,
        currency: paymentData.currency
      });

      return {
        success: true,
        paymentId,
        paymentReference,
        expiresAt: paymentRecord.expires_at
      };

    } catch (error) {
      await trx.rollback();
      logger.error('Error creating payment record', {
        error: error.message,
        policyNumber: policyData.policy_number,
        paymentReference: paymentData.paymentReference
      });
      throw error;
    }
  }

  /**
   * Update payment status from callback
   */
  async updatePaymentStatus(paymentReference, callbackData) {
    const trx = await this.db.transaction();
    
    try {
      // Get current payment record
      const currentPayment = await trx('policy_payments')
        .where('payment_reference', paymentReference)
        .first();

      if (!currentPayment) {
        throw new Error(`Payment not found: ${paymentReference}`);
      }

      // Update payment record
      const updateData = {
        payment_status: callbackData.status,
        transaction_id: callbackData.transactionId,
        gateway_reference: callbackData.gatewayReference || currentPayment.gateway_reference,
        gateway_response: callbackData,
        callback_received_at: new Date(),
        notes: callbackData.notes || `Payment ${callbackData.status.toLowerCase()} via callback`
      };

      // Set paid_at for successful payments (handled by trigger, but explicit here)
      if (callbackData.status === 'SUCCESS') {
        updateData.paid_at = new Date();
      }

      await trx('policy_payments')
        .where('payment_reference', paymentReference)
        .update(updateData);

      await trx.commit();

      logger.info('Payment status updated', {
        paymentReference,
        oldStatus: currentPayment.payment_status,
        newStatus: callbackData.status,
        transactionId: callbackData.transactionId
      });

      return {
        success: true,
        oldStatus: currentPayment.payment_status,
        newStatus: callbackData.status,
        updated: true
      };

    } catch (error) {
      await trx.rollback();
      logger.error('Error updating payment status', {
        error: error.message,
        paymentReference,
        callbackData
      });
      throw error;
    }
  }

  /**
   * Get payment by reference
   */
  async getPaymentByReference(paymentReference) {
    try {
      const payment = await this.db('policy_payments')
        .where('payment_reference', paymentReference)
        .first();

      if (!payment) {
        return {
          success: false,
          message: 'Payment not found'
        };
      }

      return {
        success: true,
        payment
      };

    } catch (error) {
      logger.error('Error getting payment by reference', {
        error: error.message,
        paymentReference
      });
      throw error;
    }
  }

  /**
   * Get payment history for a policy
   */
  async getPaymentHistory(policyNumber, options = {}) {
    try {
      let query = this.db('policy_payments')
        .where('policy_number', policyNumber);

      // Add filters
      if (options.currency) {
        query = query.where('currency', options.currency);
      }

      if (options.status) {
        query = query.where('payment_status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const payments = await query
        .orderBy('initiated_at', 'desc')
        .select('*');

      // Get status change log if requested
      if (options.includeStatusLog && payments.length > 0) {
        const paymentIds = payments.map(p => p.id);
        const statusLog = await this.db('payment_status_log')
          .whereIn('payment_id', paymentIds)
          .orderBy('changed_at', 'desc');

        // Add status log to each payment
        payments.forEach(payment => {
          payment.status_log = statusLog.filter(log => log.payment_id === payment.id);
        });
      }

      return {
        success: true,
        payments,
        totalPayments: payments.length
      };

    } catch (error) {
      logger.error('Error getting payment history', {
        error: error.message,
        policyNumber
      });
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(options = {}) {
    try {
      let query = this.db('policy_payments');

      // Add date filters
      if (options.startDate) {
        query = query.where('initiated_at', '>=', options.startDate);
      }
      
      if (options.endDate) {
        query = query.where('initiated_at', '<=', options.endDate);
      }

      if (options.currency) {
        query = query.where('currency', options.currency);
      }

      const stats = await query
        .select(
          this.db.raw('COUNT(*) as total_payments'),
          this.db.raw('SUM(amount) as total_amount'),
          this.db.raw('AVG(amount) as average_amount'),
          this.db.raw('COUNT(CASE WHEN payment_status = ? THEN 1 END) as successful_payments', ['SUCCESS']),
          this.db.raw('COUNT(CASE WHEN payment_status = ? THEN 1 END) as failed_payments', ['FAILED']),
          this.db.raw('COUNT(CASE WHEN payment_status = ? THEN 1 END) as pending_payments', ['PENDING'])
        )
        .first();

      return {
        success: true,
        stats: {
          total_payments: parseInt(stats.total_payments),
          total_amount: parseFloat(stats.total_amount) || 0,
          average_amount: parseFloat(stats.average_amount) || 0,
          successful_payments: parseInt(stats.successful_payments),
          failed_payments: parseInt(stats.failed_payments),
          pending_payments: parseInt(stats.pending_payments),
          success_rate: stats.total_payments > 0 ? 
            (stats.successful_payments / stats.total_payments * 100).toFixed(2) + '%' : '0%'
        }
      };

    } catch (error) {
      logger.error('Error getting payment statistics', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Clean up expired payments
   */
  async cleanupExpiredPayments() {
    try {
      const result = await this.db('policy_payments')
        .where('payment_status', 'INITIATED')
        .where('expires_at', '<', new Date())
        .update({
          payment_status: 'EXPIRED',
          notes: 'Automatically expired due to timeout'
        });

      logger.info('Expired payments cleaned up', {
        expiredCount: result
      });

      return {
        success: true,
        expiredCount: result
      };

    } catch (error) {
      logger.error('Error cleaning up expired payments', {
        error: error.message
      });
      throw error;
    }
  }
}

// Create singleton instance
const policyPaymentService = new PolicyPaymentService();

module.exports = policyPaymentService;