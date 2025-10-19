/**
 * ===================================================================
 * ZIMNAT API v2.1 - Payment Transaction Service
 * File: src/services/zimnatPaymentService.js
 * ===================================================================
 *
 * Handles payment processing for ZIMNAT API v2.1 specification
 */

const db = require('../db/knex');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ReceiptService = require('./receiptService');
const WebhookService = require('./webhookService');

class ZimnatPaymentService {

  /**
   * Generate unique transaction reference
   * Format: TXN-{timestamp}-{random}
   * @returns {String} Transaction reference
   */
  static generateTxnReference() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }

  /**
   * Process payment for policy
   * @param {Object} paymentData - Payment details
   * @returns {Object} Payment transaction and receipt details
   */
  static async processPayment(paymentData) {
    const trx = await db.transaction();

    try {
      const {
        externalReference,
        policyHolderId,
        policyNumber,
        currency,
        amount,
        paymentMethod,
        customerName,
        customerEmail,
        customerMobileNo,
        insurance_type,
        policyType,
        processed_at,
        return_url,
        callback_url
      } = paymentData;

      // Validate external reference uniqueness
      const existingPayment = await trx('zimnat_payment_transactions')
        .where('external_reference', externalReference)
        .first();

      if (existingPayment) {
        await trx.rollback();
        throw {
          status: 400,
          code: 'DUPLICATE_REFERENCE',
          message: 'External reference already exists'
        };
      }

      // Generate transaction reference
      const txnReference = this.generateTxnReference();

      // Get policy details
      const policy = await trx('fcb_policies')
        .where('policy_number', policyNumber)
        .first();

      // Create payment transaction
      const [result] = await trx('zimnat_payment_transactions').insert({
        external_reference: externalReference,
        txn_reference: txnReference,
        policy_holder_id: policyHolderId,
        policy_number: policyNumber,
        policy_id: policy?.policy_id,
        insurance_type: insurance_type,
        policy_type: policyType || 'Motor',
        amount: amount,
        currency: currency,
        payment_method: paymentMethod,
        status: 'pending',
        customer_name: customerName,
        customer_email: customerEmail,
        customer_mobile: customerMobileNo,
        return_url: return_url,
        callback_url: callback_url,
        processed_at: processed_at || new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      const paymentId = result.id || result;

      logger.info('Payment transaction created', {
        paymentId,
        txnReference,
        externalReference,
        amount,
        currency
      });

      // Generate receipt (pass transaction to ensure atomicity)
      const receipt = await ReceiptService.createReceipt(paymentId, policy?.policy_id, trx);

      await trx.commit();

      // Send webhook notification if callback URL provided
      if (callback_url) {
        WebhookService.sendPaymentWebhook(
          callback_url,
          {
            txnReference,
            externalReference,
            policyNumber,
            amount,
            currency,
            status: 'pending',
            receiptNumber: receipt.receipt_number,
            processedAt: processed_at || new Date()
          },
          'payment.pending'
        ).catch(err => {
          logger.error('Payment webhook delivery failed', {
            txnReference,
            error: err.message
          });
        });
      }

      // Return payment and receipt details
      return {
        paymentId,
        txnReference,
        externalReference,
        receiptNumber: receipt.receipt_number,
        amount,
        currency,
        status: 'pending',
        processedAt: processed_at || new Date()
      };

    } catch (error) {
      await trx.rollback();

      if (error.code) {
        throw error;
      }

      logger.error('Payment processing failed', {
        externalReference: paymentData.externalReference,
        error: error.message,
        stack: error.stack
      });

      throw {
        status: 500,
        code: 'PAYMENT_PROCESSING_ERROR',
        message: 'Failed to process payment'
      };
    }
  }

  /**
   * Get payment status by external reference
   * @param {String} externalReference - External reference
   * @returns {Object} Payment details with receipt and policy info
   */
  static async getPaymentByExternalReference(externalReference) {
    try {
      const payment = await db('zimnat_payment_transactions as pt')
        .leftJoin('zimnat_payment_receipts as r', 'pt.id', 'r.payment_transaction_id')
        .leftJoin('fcb_policies as p', 'pt.policy_id', 'p.policy_id')
        .where('pt.external_reference', externalReference)
        .select(
          'pt.*',
          'r.receipt_number',
          'r.status as receipt_status',
          'r.allocated_at',
          'p.policy_number as policy_num',
          'p.customer_info'
        )
        .first();

      if (!payment) {
        throw {
          status: 404,
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found'
        };
      }

      return this.formatPaymentResponse(payment);

    } catch (error) {
      if (error.code) {
        throw error;
      }

      logger.error('Failed to get payment by external reference', {
        externalReference,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get payment status by transaction reference
   * @param {String} txnReference - Transaction reference
   * @returns {Object} Payment details
   */
  static async getPaymentByTxnReference(txnReference) {
    try {
      const payment = await db('zimnat_payment_transactions as pt')
        .leftJoin('zimnat_payment_receipts as r', 'pt.id', 'r.payment_transaction_id')
        .leftJoin('fcb_policies as p', 'pt.policy_id', 'p.policy_id')
        .where('pt.txn_reference', txnReference)
        .select(
          'pt.*',
          'r.receipt_number',
          'r.status as receipt_status',
          'r.allocated_at',
          'p.policy_number as policy_num',
          'p.customer_info'
        )
        .first();

      if (!payment) {
        throw {
          status: 404,
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found'
        };
      }

      return this.formatPaymentResponse(payment);

    } catch (error) {
      if (error.code) {
        throw error;
      }

      logger.error('Failed to get payment by txn reference', {
        txnReference,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update payment status
   * @param {String} txnReference - Transaction reference
   * @param {String} status - New status (pending, completed, failed, cancelled, reversed)
   * @param {Object} gatewayResponse - Gateway response data (optional)
   * @returns {Object} Updated payment
   */
  static async updatePaymentStatus(txnReference, status, gatewayResponse = null) {
    try {
      const validStatuses = ['pending', 'completed', 'failed', 'cancelled', 'reversed'];

      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid payment status: ${status}`);
      }

      const updateData = {
        status: status,
        updated_at: new Date()
      };

      if (gatewayResponse) {
        updateData.gateway_response = JSON.stringify(gatewayResponse);
      }

      if (status === 'completed') {
        updateData.processed_at = new Date();
        updateData.reconciliation_status = 'matched';
      }

      await db('zimnat_payment_transactions')
        .where('txn_reference', txnReference)
        .update(updateData);

      // If payment completed, apply the receipt
      if (status === 'completed') {
        const receipt = await ReceiptService.getReceiptByPaymentId(
          (await db('zimnat_payment_transactions')
            .where('txn_reference', txnReference)
            .first()).id
        );

        if (receipt) {
          await ReceiptService.applyReceipt(receipt.receipt_number);
        }
      }

      logger.info('Payment status updated', {
        txnReference,
        newStatus: status
      });

      return await this.getPaymentByTxnReference(txnReference);

    } catch (error) {
      logger.error('Failed to update payment status', {
        txnReference,
        status,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Format payment response according to ZIMNAT API v2.1 spec
   * @param {Object} payment - Payment data from database
   * @returns {Object} Formatted payment response
   */
  static formatPaymentResponse(payment) {
    const customerInfo = payment.customer_info ? JSON.parse(payment.customer_info) : {};

    return {
      policyHolder: {
        fullName: payment.customer_name || customerInfo.full_name || '',
        identifier: payment.policy_holder_id || customerInfo.id_number || ''
      },
      paymentDetails: {
        currency: payment.currency,
        amount: parseFloat(payment.amount),
        externalReference: payment.external_reference,
        txnReference: payment.txn_reference,
        processedAt: payment.processed_at,
        status: payment.status,
        paymentMethod: payment.payment_method,
        message: this.getStatusMessage(payment.status)
      },
      receiptDetails: payment.receipt_number ? {
        receiptNumber: payment.receipt_number,
        allocatedAt: payment.allocated_at,
        status: payment.receipt_status
      } : null,
      policyDetails: {
        policyNumber: payment.policy_number,
        insuranceType: payment.insurance_type,
        policyType: payment.policy_type
      }
    };
  }

  /**
   * Get status message
   * @param {String} status - Payment status
   * @returns {String} Status message
   */
  static getStatusMessage(status) {
    const messages = {
      'pending': 'Payment is being processed',
      'completed': 'Payment completed successfully',
      'failed': 'Payment failed',
      'cancelled': 'Payment was cancelled',
      'reversed': 'Payment has been reversed'
    };

    return messages[status] || 'Unknown status';
  }

  /**
   * Get payments for reconciliation
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @param {Number} page - Page number
   * @param {Number} pageSize - Page size (max 500)
   * @returns {Object} Paginated payment list
   */
  static async getPaymentsForReconciliation(fromDate, toDate, page = 1, pageSize = 500) {
    try {
      // Ensure pageSize doesn't exceed 500
      pageSize = Math.min(pageSize, 500);

      const offset = (page - 1) * pageSize;

      // Get total count
      const [{ count }] = await db('zimnat_payment_transactions')
        .whereBetween('processed_at', [fromDate, toDate])
        .count('* as count');

      // Get paginated data
      const payments = await db('zimnat_payment_transactions as pt')
        .leftJoin('zimnat_payment_receipts as r', 'pt.id', 'r.payment_transaction_id')
        .whereBetween('pt.processed_at', [fromDate, toDate])
        .select(
          'pt.*',
          'r.receipt_number',
          'r.status as receipt_status',
          'r.allocated_at'
        )
        .orderBy('pt.processed_at', 'desc')
        .limit(pageSize)
        .offset(offset);

      const totalPages = Math.ceil(count / pageSize);

      return {
        payments: payments.map(p => this.formatPaymentResponse(p)),
        pagination: {
          page: page,
          pageSize: pageSize,
          total: parseInt(count),
          totalPages: totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      };

    } catch (error) {
      logger.error('Failed to get payments for reconciliation', {
        fromDate,
        toDate,
        page,
        pageSize,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ZimnatPaymentService;
