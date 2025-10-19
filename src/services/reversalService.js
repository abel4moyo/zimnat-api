/**
 * ===================================================================
 * ZIMNAT API v2.1 - Payment Reversal Service
 * File: src/services/reversalService.js
 * ===================================================================
 *
 * Handles payment reversal operations for ZIMNAT API v2.1
 */

const db = require('../db/knex');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ReceiptService = require('./receiptService');
const ZimnatPaymentService = require('./zimnatPaymentService');
const WebhookService = require('./webhookService');

class ReversalService {

  /**
   * Generate unique reversal reference
   * Format: REV-{timestamp}-{random}
   * @returns {String} Reversal reference
   */
  static generateReversalReference() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `REV-${timestamp}-${random}`;
  }

  /**
   * Request payment reversal
   * @param {Object} reversalData - Reversal request data
   * @returns {Object} Reversal details
   */
  static async requestReversal(reversalData) {
    const trx = await db.transaction();

    try {
      const {
        externalReference,
        originalExternalReference,
        receiptNumber,
        reason,
        initiatedBy,
        requestedAt
      } = reversalData;

      // Validate original payment exists
      const originalPayment = await trx('zimnat_payment_transactions')
        .where('external_reference', originalExternalReference)
        .first();

      if (!originalPayment) {
        await trx.rollback();
        throw {
          status: 404,
          code: 'PAYMENT_NOT_FOUND',
          message: 'Original payment not found'
        };
      }

      // Check if payment is already reversed
      if (originalPayment.status === 'reversed') {
        await trx.rollback();
        throw {
          status: 400,
          code: 'PAYMENT_ALREADY_REVERSED',
          message: 'Payment has already been reversed'
        };
      }

      // Check if payment is in completed status
      if (originalPayment.status !== 'completed') {
        await trx.rollback();
        throw {
          status: 400,
          code: 'REVERSAL_NOT_ALLOWED',
          message: 'Only completed payments can be reversed'
        };
      }

      // Validate receipt if provided
      let receipt = null;
      if (receiptNumber) {
        receipt = await trx('zimnat_payment_receipts')
          .where('receipt_number', receiptNumber)
          .where('payment_transaction_id', originalPayment.id)
          .first();

        if (!receipt) {
          await trx.rollback();
          throw {
            status: 404,
            code: 'RECEIPT_NOT_FOUND',
            message: 'Receipt not found for this payment'
          };
        }

        if (receipt.status === 'reversed') {
          await trx.rollback();
          throw {
            status: 400,
            code: 'RECEIPT_ALREADY_REVERSED',
            message: 'Receipt has already been reversed'
          };
        }
      }

      // Generate reversal reference
      const reversalReference = externalReference || this.generateReversalReference();

      // Create reversal record
      const [reversalId] = await trx('zimnat_payment_reversals').insert({
        reversal_reference: reversalReference,
        original_payment_id: originalPayment.id,
        original_external_reference: originalExternalReference,
        receipt_number: receiptNumber,
        reason: reason,
        initiated_by: initiatedBy,
        requested_at: requestedAt || new Date(),
        status: 'pending',
        reversal_amount: originalPayment.amount,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      logger.info('Reversal request created', {
        reversalId,
        reversalReference,
        originalExternalReference,
        receiptNumber,
        initiatedBy
      });

      await trx.commit();

      return await this.getReversalByReference(reversalReference);

    } catch (error) {
      await trx.rollback();

      if (error.code) {
        throw error;
      }

      logger.error('Reversal request failed', {
        originalExternalReference: reversalData.originalExternalReference,
        error: error.message,
        stack: error.stack
      });

      throw {
        status: 500,
        code: 'REVERSAL_REQUEST_ERROR',
        message: 'Failed to process reversal request'
      };
    }
  }

  /**
   * Process (approve) reversal
   * @param {String} reversalReference - Reversal reference
   * @returns {Object} Reversal details
   */
  static async processReversal(reversalReference) {
    const trx = await db.transaction();

    try {
      // Get reversal record
      const reversal = await trx('zimnat_payment_reversals')
        .where('reversal_reference', reversalReference)
        .first();

      if (!reversal) {
        await trx.rollback();
        throw {
          status: 404,
          code: 'REVERSAL_NOT_FOUND',
          message: 'Reversal not found'
        };
      }

      if (reversal.status === 'completed') {
        await trx.rollback();
        throw {
          status: 400,
          code: 'REVERSAL_ALREADY_PROCESSED',
          message: 'Reversal has already been processed'
        };
      }

      // Update payment status to reversed
      await trx('zimnat_payment_transactions')
        .where('id', reversal.original_payment_id)
        .update({
          status: 'reversed',
          updated_at: new Date()
        });

      // Reverse receipt if exists
      if (reversal.receipt_number) {
        await trx('zimnat_payment_receipts')
          .where('receipt_number', reversal.receipt_number)
          .update({
            status: 'reversed',
            reversal_reason: reversal.reason,
            reversed_at: new Date(),
            reversed_by: reversal.initiated_by,
            updated_at: new Date()
          });
      }

      // Update reversal status
      await trx('zimnat_payment_reversals')
        .where('reversal_reference', reversalReference)
        .update({
          status: 'completed',
          processed_at: new Date(),
          updated_at: new Date()
        });

      logger.info('Reversal processed successfully', {
        reversalReference,
        originalPaymentId: reversal.original_payment_id
      });

      await trx.commit();

      const reversalDetails = await this.getReversalByReference(reversalReference);

      // Get original payment to retrieve callback URL
      const originalPayment = await db('zimnat_payment_transactions')
        .where('id', reversal.original_payment_id)
        .first();

      // Send webhook notification if callback URL exists
      if (originalPayment?.callback_url) {
        WebhookService.sendReversalWebhook(
          originalPayment.callback_url,
          {
            reversalReference: reversalDetails.reversalReference,
            originalExternalReference: reversalDetails.originalExternalReference,
            originalTxnReference: reversalDetails.originalTxnReference,
            receiptNumber: reversalDetails.receiptNumber,
            amount: reversalDetails.amount,
            currency: reversalDetails.currency,
            reason: reversalDetails.reason,
            status: reversalDetails.status,
            processedAt: reversalDetails.processedAt
          },
          'reversal.completed'
        ).catch(err => {
          logger.error('Reversal webhook delivery failed', {
            reversalReference,
            error: err.message
          });
        });
      }

      return reversalDetails;

    } catch (error) {
      await trx.rollback();

      if (error.code) {
        throw error;
      }

      logger.error('Reversal processing failed', {
        reversalReference,
        error: error.message,
        stack: error.stack
      });

      throw {
        status: 500,
        code: 'REVERSAL_PROCESSING_ERROR',
        message: 'Failed to process reversal'
      };
    }
  }

  /**
   * Get reversal by reference
   * @param {String} reversalReference - Reversal reference
   * @returns {Object} Reversal details
   */
  static async getReversalByReference(reversalReference) {
    try {
      const reversal = await db('zimnat_payment_reversals as rev')
        .leftJoin('zimnat_payment_transactions as pt', 'rev.original_payment_id', 'pt.id')
        .where('rev.reversal_reference', reversalReference)
        .select(
          'rev.*',
          'pt.external_reference as original_external_ref',
          'pt.txn_reference as original_txn_ref',
          'pt.policy_number',
          'pt.amount as original_amount',
          'pt.currency'
        )
        .first();

      if (!reversal) {
        throw {
          status: 404,
          code: 'REVERSAL_NOT_FOUND',
          message: 'Reversal not found'
        };
      }

      return this.formatReversalResponse(reversal);

    } catch (error) {
      if (error.code) {
        throw error;
      }

      logger.error('Failed to get reversal', {
        reversalReference,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Format reversal response
   * @param {Object} reversal - Reversal data from database
   * @returns {Object} Formatted reversal response
   */
  static formatReversalResponse(reversal) {
    return {
      reversalReference: reversal.reversal_reference,
      originalExternalReference: reversal.original_external_reference,
      originalTxnReference: reversal.original_txn_ref,
      receiptNumber: reversal.receipt_number,
      policyNumber: reversal.policy_number,
      amount: parseFloat(reversal.reversal_amount || reversal.original_amount),
      currency: reversal.currency,
      reason: reversal.reason,
      initiatedBy: reversal.initiated_by,
      requestedAt: reversal.requested_at,
      processedAt: reversal.processed_at,
      status: reversal.status,
      message: this.getStatusMessage(reversal.status)
    };
  }

  /**
   * Get status message
   * @param {String} status - Reversal status
   * @returns {String} Status message
   */
  static getStatusMessage(status) {
    const messages = {
      'pending': 'Reversal request is pending approval',
      'approved': 'Reversal has been approved',
      'rejected': 'Reversal request was rejected',
      'completed': 'Reversal has been completed successfully'
    };

    return messages[status] || 'Unknown status';
  }
}

module.exports = ReversalService;
