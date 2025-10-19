/**
 * ===================================================================
 * ZIMNAT API v2.1 - Payment Routes
 * File: src/routes/zimnatPaymentRoutes.js
 * ===================================================================
 *
 * Routes for payment processing, status, and reversal endpoints
 */

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const ZimnatPaymentController = require('../controllers/zimnatPaymentController');
const ReversalService = require('../services/reversalService');
const ZimnatPaymentService = require('../services/zimnatPaymentService');
const { validateJWT } = require('../middleware/jwtMiddleware');
const { validateRequestId } = require('../middleware/requestIdMiddleware');
const { formatResponse, formatErrorResponse, ERROR_CODES } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

// Apply middleware to all routes
router.use(validateRequestId);
router.use(validateJWT);

/**
 * POST /api/v1/payment/process
 * Process payment for insurance policy
 */
router.post('/api/v1/payment/process',
  [
    body('externalReference').notEmpty().withMessage('External reference is required'),
    body('policyHolderId').notEmpty().withMessage('Policy holder ID is required'),
    body('policyNumber').notEmpty().withMessage('Policy number is required'),
    body('currency').isIn(['USD', 'ZWG']).withMessage('Currency must be USD or ZWG'),
    body('amount').isNumeric().withMessage('Amount must be numeric'),
    body('paymentMethod').notEmpty().withMessage('Payment method is required'),
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('customerEmail').isEmail().withMessage('Valid email is required'),
    body('customerMobileNo').notEmpty().withMessage('Customer mobile number is required'),
    body('insurance_type').notEmpty().withMessage('Insurance type is required'),
    body('policyType').notEmpty().withMessage('Policy type is required')
  ],
  ZimnatPaymentController.processPayment
);

/**
 * GET /api/v1/payments/status/externalReference/:externalReference
 * Get payment status by external reference
 */
router.get('/api/v1/payments/status/externalReference/:externalReference',
  param('externalReference').notEmpty().withMessage('External reference is required'),
  ZimnatPaymentController.getPaymentStatusByExternalRef
);

/**
 * GET /api/v1/payments/status/txnReference/:txnReference
 * Get payment status by transaction reference
 */
router.get('/api/v1/payments/status/txnReference/:txnReference',
  param('txnReference').notEmpty().withMessage('Transaction reference is required'),
  ZimnatPaymentController.getPaymentStatusByTxnRef
);

/**
 * POST /api/v1/payments/reversal
 * Request payment reversal
 */
router.post('/api/v1/payments/reversal',
  [
    body('externalReference').optional().notEmpty().withMessage('External reference cannot be empty'),
    body('originalExternalReference').notEmpty().withMessage('Original external reference is required'),
    body('receiptNumber').optional().notEmpty().withMessage('Receipt number cannot be empty'),
    body('reason').notEmpty().withMessage('Reversal reason is required'),
    body('initiatedBy').notEmpty().withMessage('Initiated by is required'),
    body('requestedAt').optional().isISO8601().withMessage('Requested at must be ISO 8601 format')
  ],
  async (req, res) => {
    try {
      const requestId = req.headers['x-request-id'];
      const reversalData = req.body;

      logger.info('Reversal request received', {
        originalExternalReference: reversalData.originalExternalReference,
        receiptNumber: reversalData.receiptNumber,
        initiatedBy: reversalData.initiatedBy,
        requestId,
        clientId: req.user?.clientId
      });

      try {
        const reversal = await ReversalService.requestReversal(reversalData);

        logger.info('Reversal request created successfully', {
          reversalReference: reversal.reversalReference,
          originalExternalReference: reversalData.originalExternalReference,
          requestId
        });

        return res.status(200).json(formatResponse(reversal, requestId));

      } catch (error) {
        if (error.code === 'PAYMENT_NOT_FOUND') {
          return res.status(404).json(formatErrorResponse(
            ERROR_CODES.PAYMENT_NOT_FOUND,
            error.message,
            requestId
          ));
        }

        if (error.code === 'PAYMENT_ALREADY_REVERSED' || error.code === 'REVERSAL_NOT_ALLOWED') {
          return res.status(400).json(formatErrorResponse(
            error.code,
            error.message,
            requestId
          ));
        }

        throw error;
      }

    } catch (error) {
      logger.error('Reversal request error', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while processing reversal request',
        req.headers['x-request-id']
      ));
    }
  }
);

/**
 * GET /v1/payments/reconciliations
 * Get payment reconciliation data (paginated)
 */
router.get('/v1/payments/reconciliations',
  async (req, res) => {
    try {
      const requestId = req.headers['x-request-id'];
      const { from, to, page = 1, pageSize = 500 } = req.query;

      // Validate required parameters
      if (!from) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'from date parameter is required (YYYY-MM-DD)',
          requestId
        ));
      }

      if (!to) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'to date parameter is required (YYYY-MM-DD)',
          requestId
        ));
      }

      // Validate date format
      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (isNaN(fromDate.getTime())) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_DATE_FORMAT,
          'Invalid from date format. Use YYYY-MM-DD',
          requestId
        ));
      }

      if (isNaN(toDate.getTime())) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_DATE_FORMAT,
          'Invalid to date format. Use YYYY-MM-DD',
          requestId
        ));
      }

      // Validate date range
      if (fromDate > toDate) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_FIELD_VALUE,
          'from date must be before to date',
          requestId
        ));
      }

      // Validate date range not exceeding 31 days
      const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
      if (daysDiff > 31) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_FIELD_VALUE,
          'Date range cannot exceed 31 days',
          requestId
        ));
      }

      logger.info('Reconciliation request', {
        from,
        to,
        page,
        pageSize,
        requestId,
        clientId: req.user?.clientId
      });

      const result = await ZimnatPaymentService.getPaymentsForReconciliation(
        fromDate,
        toDate,
        parseInt(page),
        parseInt(pageSize)
      );

      logger.info('Reconciliation data retrieved', {
        from,
        to,
        page,
        totalPayments: result.pagination.total,
        requestId
      });

      return res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
        meta: {
          requestId: requestId,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Reconciliation request error', {
        error: error.message,
        stack: error.stack,
        query: req.query,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while retrieving reconciliation data',
        req.headers['x-request-id']
      ));
    }
  }
);

module.exports = router;
