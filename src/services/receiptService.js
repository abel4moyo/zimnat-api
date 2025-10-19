/**
 * ===================================================================
 * ZIMNAT API v2.1 - Receipt Service
 * File: src/services/receiptService.js
 * ===================================================================
 *
 * Handles receipt generation and management for payment transactions
 */

const db = require('../db/knex');
const crypto = require('crypto');
const logger = require('../utils/logger');

class ReceiptService {

  /**
   * Generate unique receipt number
   * Format: RCP-{timestamp}-{random}
   * @returns {String} Receipt number
   */
  static generateReceiptNumber() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `RCP-${timestamp}-${random}`;
  }

  /**
   * Create receipt for payment transaction
   * @param {Number} paymentTransactionId - Payment transaction ID
   * @param {Number} policyId - Policy ID (optional)
   * @param {Object} trx - Database transaction (optional)
   * @returns {Object} Receipt details
   */
  static async createReceipt(paymentTransactionId, policyId = null, trx = null) {
    try {
      const receiptNumber = this.generateReceiptNumber();
      const dbConn = trx || db; // Use transaction if provided, otherwise use default db

      const [result] = await dbConn('zimnat_payment_receipts').insert({
        receipt_number: receiptNumber,
        payment_transaction_id: paymentTransactionId,
        policy_id: policyId,
        allocated_at: new Date(),
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      // Extract ID from result (handles both {id: X} and X formats)
      const receiptId = result.id || result;

      logger.info('Receipt created', {
        receiptId,
        receiptNumber,
        paymentTransactionId,
        policyId
      });

      return await this.getReceiptById(receiptId, trx);

    } catch (error) {
      logger.error('Failed to create receipt', {
        paymentTransactionId,
        policyId,
        error: error.message,
        stack: error.stack
      });
      throw new Error('Failed to create receipt');
    }
  }

  /**
   * Get receipt by ID
   * @param {Number} receiptId - Receipt ID
   * @param {Object} trx - Database transaction (optional)
   * @returns {Object} Receipt details
   */
  static async getReceiptById(receiptId, trx = null) {
    try {
      const dbConn = trx || db; // Use transaction if provided, otherwise use default db

      const receipt = await dbConn('zimnat_payment_receipts')
        .where('id', receiptId)
        .first();

      return receipt;

    } catch (error) {
      logger.error('Failed to get receipt by ID', {
        receiptId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get receipt by receipt number
   * @param {String} receiptNumber - Receipt number
   * @param {Object} trx - Database transaction (optional)
   * @returns {Object} Receipt details
   */
  static async getReceiptByNumber(receiptNumber, trx = null) {
    try {
      const dbConn = trx || db; // Use transaction if provided, otherwise use default db

      const receipt = await dbConn('zimnat_payment_receipts')
        .where('receipt_number', receiptNumber)
        .first();

      if (!receipt) {
        throw {
          status: 404,
          code: 'RECEIPT_NOT_FOUND',
          message: 'Receipt not found'
        };
      }

      return receipt;

    } catch (error) {
      if (error.code) {
        throw error;
      }

      logger.error('Failed to get receipt by number', {
        receiptNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get receipt by payment transaction ID
   * @param {Number} paymentTransactionId - Payment transaction ID
   * @returns {Object} Receipt details
   */
  static async getReceiptByPaymentId(paymentTransactionId) {
    try {
      const receipt = await db('zimnat_payment_receipts')
        .where('payment_transaction_id', paymentTransactionId)
        .first();

      return receipt;

    } catch (error) {
      logger.error('Failed to get receipt by payment ID', {
        paymentTransactionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update receipt status
   * @param {String} receiptNumber - Receipt number
   * @param {String} status - New status (pending, applied, reversed)
   * @returns {Object} Updated receipt
   */
  static async updateReceiptStatus(receiptNumber, status) {
    try {
      const validStatuses = ['pending', 'applied', 'reversed'];

      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid receipt status: ${status}`);
      }

      await db('zimnat_payment_receipts')
        .where('receipt_number', receiptNumber)
        .update({
          status: status,
          updated_at: new Date()
        });

      logger.info('Receipt status updated', {
        receiptNumber,
        newStatus: status
      });

      return await this.getReceiptByNumber(receiptNumber);

    } catch (error) {
      logger.error('Failed to update receipt status', {
        receiptNumber,
        status,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Apply receipt to policy (mark as applied)
   * @param {String} receiptNumber - Receipt number
   * @returns {Object} Updated receipt
   */
  static async applyReceipt(receiptNumber) {
    try {
      await db('zimnat_payment_receipts')
        .where('receipt_number', receiptNumber)
        .update({
          status: 'applied',
          allocated_at: new Date(),
          updated_at: new Date()
        });

      logger.info('Receipt applied', { receiptNumber });

      return await this.getReceiptByNumber(receiptNumber);

    } catch (error) {
      logger.error('Failed to apply receipt', {
        receiptNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Reverse receipt
   * @param {String} receiptNumber - Receipt number
   * @param {String} reason - Reversal reason
   * @param {String} reversedBy - User/system that initiated reversal
   * @returns {Object} Updated receipt
   */
  static async reverseReceipt(receiptNumber, reason, reversedBy) {
    try {
      const receipt = await this.getReceiptByNumber(receiptNumber);

      if (receipt.status === 'reversed') {
        throw {
          status: 400,
          code: 'RECEIPT_ALREADY_REVERSED',
          message: 'Receipt has already been reversed'
        };
      }

      await db('zimnat_payment_receipts')
        .where('receipt_number', receiptNumber)
        .update({
          status: 'reversed',
          reversal_reason: reason,
          reversed_at: new Date(),
          reversed_by: reversedBy,
          updated_at: new Date()
        });

      logger.info('Receipt reversed', {
        receiptNumber,
        reason,
        reversedBy
      });

      return await this.getReceiptByNumber(receiptNumber);

    } catch (error) {
      if (error.code) {
        throw error;
      }

      logger.error('Failed to reverse receipt', {
        receiptNumber,
        reason,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get receipt with full payment and policy details
   * @param {String} receiptNumber - Receipt number
   * @returns {Object} Complete receipt details
   */
  static async getReceiptWithDetails(receiptNumber) {
    try {
      const receipt = await db('zimnat_payment_receipts as r')
        .leftJoin('zimnat_payment_transactions as pt', 'r.payment_transaction_id', 'pt.id')
        .leftJoin('fcb_policies as p', 'r.policy_id', 'p.policy_id')
        .where('r.receipt_number', receiptNumber)
        .select(
          'r.*',
          'pt.external_reference',
          'pt.txn_reference',
          'pt.amount',
          'pt.currency',
          'pt.payment_method',
          'pt.status as payment_status',
          'p.policy_number',
          'p.policy_type'
        )
        .first();

      if (!receipt) {
        throw {
          status: 404,
          code: 'RECEIPT_NOT_FOUND',
          message: 'Receipt not found'
        };
      }

      return receipt;

    } catch (error) {
      if (error.code) {
        throw error;
      }

      logger.error('Failed to get receipt with details', {
        receiptNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all receipts for a payment transaction
   * @param {Number} paymentTransactionId - Payment transaction ID
   * @returns {Array} List of receipts
   */
  static async getReceiptsByPaymentId(paymentTransactionId) {
    try {
      const receipts = await db('zimnat_payment_receipts')
        .where('payment_transaction_id', paymentTransactionId)
        .orderBy('created_at', 'desc');

      return receipts;

    } catch (error) {
      logger.error('Failed to get receipts by payment ID', {
        paymentTransactionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all receipts for a policy
   * @param {Number} policyId - Policy ID
   * @returns {Array} List of receipts
   */
  static async getReceiptsByPolicyId(policyId) {
    try {
      const receipts = await db('zimnat_payment_receipts')
        .where('policy_id', policyId)
        .orderBy('created_at', 'desc');

      return receipts;

    } catch (error) {
      logger.error('Failed to get receipts by policy ID', {
        policyId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ReceiptService;
