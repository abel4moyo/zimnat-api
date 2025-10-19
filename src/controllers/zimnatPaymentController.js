/**
 * ===================================================================
 * ZIMNAT API v2.1 - Payment Controller
 * File: src/controllers/zimnatPaymentController.js
 * ===================================================================
 *
 * Handles payment processing endpoints for ZIMNAT API v2.1
 */

const ZimnatPaymentService = require('../services/zimnatPaymentService');
const logger = require('../utils/logger');
const { formatResponse, formatErrorResponse, formatPaymentResponse, ERROR_CODES } = require('../utils/responseFormatter');

class ZimnatPaymentController {

  /**
   * POST /api/v1/payment/process
   * Process payment for insurance policy
   */
  static async processPayment(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const paymentData = req.body;

      // Validate required fields
      const requiredFields = [
        'externalReference',
        'policyHolderId',
        'policyNumber',
        'currency',
        'amount',
        'paymentMethod',
        'customerName',
        'customerEmail',
        'customerMobileNo',
        'insurance_type',
        'policyType'
      ];

      for (const field of requiredFields) {
        if (!paymentData[field]) {
          return res.status(400).json(formatErrorResponse(
            ERROR_CODES.MISSING_REQUIRED_FIELD,
            `${field} is required`,
            requestId
          ));
        }
      }

      // Validate currency
      if (!['USD', 'ZWG'].includes(paymentData.currency.toUpperCase())) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_CURRENCY,
          'Currency must be USD or ZWG',
          requestId
        ));
      }

      // Validate amount
      if (parseFloat(paymentData.amount) <= 0) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_FIELD_VALUE,
          'Amount must be greater than 0',
          requestId
        ));
      }

      logger.info('Payment processing request', {
        externalReference: paymentData.externalReference,
        policyNumber: paymentData.policyNumber,
        amount: paymentData.amount,
        currency: paymentData.currency,
        requestId,
        clientId: req.user?.clientId
      });

      // Process payment
      try {
        const result = await ZimnatPaymentService.processPayment(paymentData);

        logger.info('Payment processed successfully', {
          txnReference: result.txnReference,
          externalReference: result.externalReference,
          receiptNumber: result.receiptNumber,
          requestId
        });

        return res.status(200).json(formatPaymentResponse(
          {
            txnReference: result.txnReference,
            externalReference: result.externalReference,
            amount: result.amount,
            currency: result.currency,
            status: result.status,
            processedAt: result.processedAt,
            paymentMethod: paymentData.paymentMethod
          },
          {
            policyNumber: paymentData.policyNumber,
            insuranceType: paymentData.insurance_type,
            policyType: paymentData.policyType
          },
          {
            receiptNumber: result.receiptNumber,
            status: 'pending',
            allocatedAt: result.processedAt
          },
          requestId
        ));

      } catch (error) {
        if (error.code === 'DUPLICATE_REFERENCE') {
          return res.status(400).json(formatErrorResponse(
            ERROR_CODES.DUPLICATE_REFERENCE,
            error.message,
            requestId
          ));
        }
        throw error;
      }

    } catch (error) {
      logger.error('Payment processing error', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while processing payment',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * GET /api/v1/payments/status/externalReference/:externalReference
   * Get payment status by external reference
   */
  static async getPaymentStatusByExternalRef(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const { externalReference } = req.params;

      logger.info('Payment status request by external reference', {
        externalReference,
        requestId,
        clientId: req.user?.clientId
      });

      try {
        const payment = await ZimnatPaymentService.getPaymentByExternalReference(externalReference);

        return res.status(200).json(formatResponse(payment, requestId));

      } catch (error) {
        if (error.code === 'PAYMENT_NOT_FOUND') {
          return res.status(404).json(formatErrorResponse(
            ERROR_CODES.PAYMENT_NOT_FOUND,
            error.message,
            requestId
          ));
        }
        throw error;
      }

    } catch (error) {
      logger.error('Payment status retrieval error', {
        error: error.message,
        stack: error.stack,
        externalReference: req.params.externalReference,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while retrieving payment status',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * GET /api/v1/payments/status/txnReference/:txnReference
   * Get payment status by transaction reference
   */
  static async getPaymentStatusByTxnRef(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const { txnReference } = req.params;

      logger.info('Payment status request by txn reference', {
        txnReference,
        requestId,
        clientId: req.user?.clientId
      });

      try {
        const payment = await ZimnatPaymentService.getPaymentByTxnReference(txnReference);

        return res.status(200).json(formatResponse(payment, requestId));

      } catch (error) {
        if (error.code === 'PAYMENT_NOT_FOUND') {
          return res.status(404).json(formatErrorResponse(
            ERROR_CODES.PAYMENT_NOT_FOUND,
            error.message,
            requestId
          ));
        }
        throw error;
      }

    } catch (error) {
      logger.error('Payment status retrieval error', {
        error: error.message,
        stack: error.stack,
        txnReference: req.params.txnReference,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while retrieving payment status',
        req.headers['x-request-id']
      ));
    }
  }
}

module.exports = ZimnatPaymentController;
