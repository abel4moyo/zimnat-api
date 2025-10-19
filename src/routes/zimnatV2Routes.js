const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Try to load required modules with fallbacks
let authenticateZimnat, policyService, paymentService;

try {
  authenticateZimnat = require('../middleware/authenticateZimnat');
} catch (error) {
  console.warn('Zimnat auth middleware not available, using fallback');
  authenticateZimnat = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const requestId = req.headers['x-request-id'];

    if (authHeader && requestId) {
      req.zimnat = { authenticated: true, user: 'zimnat_user' };
      req.requestId = requestId;
      next();
    } else {
      res.status(401).json({
        success: false,
        error: {
          status: 'UNAUTHORIZED',
          errorCode: 'UNAUTHORIZED',
          errorMessage: 'Authentication failed. Invalid API key or token.'
        },
        meta: {
          requestId: requestId || 'missing',
          processedAt: new Date().toISOString()
        }
      });
    }
  };
}

try {
  policyService = require('../services/policyService');
  paymentService = require('../services/paymentService');
} catch (error) {
  console.warn('Zimnat services not available:', error.message);
}

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      error: {
        status: 'BAD_REQUEST',
        errorCode: 'INVALID_PARAMETER',
        errorMessage: `The field '${firstError.path}' is required but missing`,
        details: {
          field: firstError.path,
          issue: 'missing'
        }
      },
      meta: {
        requestId: req.headers['x-request-id'] || 'missing',
        processedAt: new Date().toISOString()
      }
    });
  }
  next();
};

/**
 * Policy Lookup/Enquiry
 * GET /api/v1/policy/search
 */
router.get('/api/v1/policy/search',
  authenticateZimnat,
  [
    query('policyNumber').notEmpty().withMessage('Policy number is required'),
    query('currency').notEmpty().withMessage('Currency is required'),
    query('insuranceType').notEmpty().withMessage('Insurance type is required')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { policyNumber, currency, insuranceType } = req.query;

      logger.info('Policy lookup request', { policyNumber, currency, insuranceType });

      // Mock policy lookup data (replace with real service call)
      const policyData = {
        policyHolder: {
          fullName: "Mr BARRY RONALD",
          identifier: "BARRYRONALD"
        },
        policyDetails: {
          policyNumber: policyNumber,
          insuranceType: insuranceType,
          policyType: "Engineering",
          currency: currency,
          ratingType: "FLAT_RATE",
          coverageAmount: "75000.00",
          premiumAmount: "1639.72",
          startDate: "2024-09-01",
          endDate: "2025-08-31",
          renewalFrequency: "Annually",
          paymentFrequency: "Quarterly",
          latestCoverStart: "2025-08-01",
          latestCoverEnd: "2025-08-31",
          latestCoverStatus: "ACTIVE"
        },
        searchCriteria: {
          policyNumber: policyNumber,
          currency: currency,
          insuranceType: insuranceType
        },
        totalFound: 1
      };

      res.json({
        success: true,
        data: policyData,
        meta: {
          processedAt: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'missing'
        }
      });

    } catch (error) {
      logger.error('Policy lookup error', { error: error.message, query: req.query });
      res.status(500).json({
        success: false,
        error: {
          status: 'INTERNAL_SERVER_ERROR',
          errorCode: 'SERVER_ERROR',
          errorMessage: 'An unexpected error occurred. Please try again later.'
        },
        meta: {
          requestId: req.headers['x-request-id'] || 'missing',
          processedAt: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * Payment Notification
 * POST /api/v1/payment/process
 */
router.post('/api/v1/payment/process',
  authenticateZimnat,
  [
    body('externalReference').notEmpty().withMessage('External reference is required'),
    body('policyHolderId').notEmpty().withMessage('Policy holder ID is required'),
    body('policyNumber').notEmpty().withMessage('Policy number is required'),
    body('currency').notEmpty().withMessage('Currency is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('paymentMethod').notEmpty().withMessage('Payment method is required'),
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('customerEmail').isEmail().withMessage('Valid customer email is required'),
    body('customerMobileNo').notEmpty().withMessage('Customer mobile number is required'),
    body('insurance_type').notEmpty().withMessage('Insurance type is required'),
    body('policyType').notEmpty().withMessage('Policy type is required'),
    body('processed_at').isISO8601().withMessage('Valid processed timestamp is required'),
    body('callback_url').isURL().withMessage('Valid callback URL is required')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const paymentData = req.body;

      logger.info('Payment notification received', {
        externalReference: paymentData.externalReference,
        policyNumber: paymentData.policyNumber,
        amount: paymentData.amount
      });

      // Generate transaction reference
      const txnReference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Mock payment processing (replace with real service call)
      const responseData = {
        policyHolder: {
          fullName: paymentData.customerName,
          identifier: paymentData.policyHolderId
        },
        paymentDetails: {
          currency: paymentData.currency,
          amount: paymentData.amount.toString(),
          externalReference: paymentData.externalReference,
          txnReference: txnReference,
          processedAt: new Date().toISOString(),
          status: "completed",
          paymentMethod: paymentData.paymentMethod,
          message: "Payment processed successfully"
        },
        receiptDetails: {
          receiptNumber: "",
          allocatedAt: "",
          status: "pending"
        },
        policyDetails: {
          policyNumber: paymentData.policyNumber,
          insuranceType: paymentData.insurance_type,
          policyType: paymentData.policyType
        }
      };

      res.json({
        success: true,
        data: responseData,
        meta: {
          processedAt: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'missing'
        }
      });

    } catch (error) {
      logger.error('Payment processing error', { error: error.message, body: req.body });
      res.status(500).json({
        success: false,
        error: {
          status: 'INTERNAL_SERVER_ERROR',
          errorCode: 'SERVER_ERROR',
          errorMessage: 'An unexpected error occurred. Please try again later.'
        },
        meta: {
          requestId: req.headers['x-request-id'] || 'missing',
          processedAt: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * Payment Status Enquiry - by external reference
 * GET /api/v1/payments/status/externalReference={externalReference}
 */
router.get('/api/v1/payments/status/externalReference=:externalReference',
  authenticateZimnat,
  async (req, res, next) => {
    try {
      const { externalReference } = req.params;

      logger.info('Payment status enquiry by external reference', { externalReference });

      // Mock payment status data (replace with real service call)
      const statusData = {
        policyHolder: {
          fullName: "Mr BARRY RONALD",
          identifier: "BARRYRONALD"
        },
        paymentDetails: {
          currency: "USD",
          amount: "40.00",
          externalReference: externalReference,
          txnReference: "TXN-1757685736788-KL494F",
          processedAt: "2025-09-05T12:05:15.250Z",
          status: "completed",
          paymentMethod: "CARD",
          message: "Payment processed successfully"
        },
        receiptDetails: {
          receiptNumber: "RCPT57685736788",
          allocatedAt: "2025-09-05T12:05:15.250Z",
          status: "completed"
        },
        policyDetails: {
          policyNumber: "T1/AHL/USP/027148",
          insuranceType: "General",
          policyType: "Engineering"
        }
      };

      res.json({
        success: true,
        data: statusData,
        meta: {
          processedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'missing'
        }
      });

    } catch (error) {
      logger.error('Payment status enquiry error', { error: error.message, externalReference: req.params.externalReference });
      res.status(500).json({
        success: false,
        error: {
          status: 'INTERNAL_SERVER_ERROR',
          errorCode: 'SERVER_ERROR',
          errorMessage: 'An unexpected error occurred. Please try again later.'
        },
        meta: {
          requestId: req.headers['x-request-id'] || 'missing',
          processedAt: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * Payment Status Enquiry - by transaction reference
 * GET /api/v1/payments/status/txnReference={txnReference}
 */
router.get('/api/v1/payments/status/txnReference=:txnReference',
  authenticateZimnat,
  async (req, res, next) => {
    try {
      const { txnReference } = req.params;

      logger.info('Payment status enquiry by transaction reference', { txnReference });

      // Mock payment status data (replace with real service call)
      const statusData = {
        policyHolder: {
          fullName: "Mr BARRY RONALD",
          identifier: "BARRYRONALD"
        },
        paymentDetails: {
          currency: "USD",
          amount: "40.00",
          externalReference: "EXT-1757682990116-QJSXKX",
          txnReference: txnReference,
          processedAt: "2025-09-05T12:05:15.250Z",
          status: "completed",
          paymentMethod: "CARD",
          message: "Payment processed successfully"
        },
        receiptDetails: {
          receiptNumber: "RCPT57685736788",
          allocatedAt: "2025-09-05T12:05:15.250Z",
          status: "completed"
        },
        policyDetails: {
          policyNumber: "T1/AHL/USP/027148",
          insuranceType: "General",
          policyType: "Engineering"
        }
      };

      res.json({
        success: true,
        data: statusData,
        meta: {
          processedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'missing'
        }
      });

    } catch (error) {
      logger.error('Payment status enquiry error', { error: error.message, txnReference: req.params.txnReference });
      res.status(500).json({
        success: false,
        error: {
          status: 'INTERNAL_SERVER_ERROR',
          errorCode: 'SERVER_ERROR',
          errorMessage: 'An unexpected error occurred. Please try again later.'
        },
        meta: {
          requestId: req.headers['x-request-id'] || 'missing',
          processedAt: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * Payment Reversals
 * POST /api/v1/payments/reversal
 */
router.post('/api/v1/payments/reversal',
  authenticateZimnat,
  [
    body('extReference').notEmpty().withMessage('External reference is required'),
    body('originalExtReference').notEmpty().withMessage('Original external reference is required'),
    body('receiptNumber').notEmpty().withMessage('Receipt number is required'),
    body('reason').notEmpty().withMessage('Reason is required'),
    body('initiatedBy').notEmpty().withMessage('Initiated by is required'),
    body('requestedAt').isISO8601().withMessage('Valid requested timestamp is required')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const reversalData = req.body;

      logger.info('Payment reversal request', {
        extReference: reversalData.extReference,
        originalExtReference: reversalData.originalExtReference,
        reason: reversalData.reason
      });

      // Generate reversal reference
      const reversalReference = `REV${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Mock reversal processing (replace with real service call)
      const responseData = {
        paymentDetails: {
          currency: "USD",
          amount: "40.00",
          externalReference: "EXT-1757682990116-QJSXKX",
          txnReference: reversalData.originalExtReference,
          processedAt: "2025-09-05T12:05:15.250Z",
          status: "COMPLETED",
          paymentMethod: "CARD",
          message: "Payment and receipt successfully reversed"
        },
        receiptDetails: {
          receiptNumber: reversalData.receiptNumber,
          allocatedAt: "2025-09-05T12:05:15.250Z",
          status: "REVERSED"
        },
        reversalDetails: {
          status: "REVERSED",
          reversalReference: reversalReference,
          reason: reversalData.reason,
          reversedAt: new Date().toISOString(),
          message: "Payment and receipt successfully reversed"
        }
      };

      res.json({
        success: true,
        data: responseData,
        meta: {
          requestId: req.headers['x-request-id'] || 'missing',
          processedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Payment reversal error', { error: error.message, body: req.body });
      res.status(500).json({
        success: false,
        error: {
          status: 'INTERNAL_SERVER_ERROR',
          errorCode: 'SERVER_ERROR',
          errorMessage: 'An unexpected error occurred. Please try again later.'
        },
        meta: {
          requestId: req.headers['x-request-id'] || 'missing',
          processedAt: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * Payments Reconciliation Export
 * GET /v1/payments/reconciliations
 */
router.get('/v1/payments/reconciliations',
  authenticateZimnat,
  [
    query('from').isISO8601().withMessage('Valid from date is required (YYYY-MM-DD)'),
    query('to').isISO8601().withMessage('Valid to date is required (YYYY-MM-DD)'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 500 }).withMessage('Page size must be between 1 and 500')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { from, to, page = 1, pageSize = 500 } = req.query;

      logger.info('Payments reconciliation export request', { from, to, page, pageSize });

      // Mock reconciliation data (replace with real service call)
      const reconciliationData = [
        {
          policyHolder: {
            fullName: "Mr BARRY RONALD",
            identifier: "BARRYRONALD"
          },
          paymentDetails: {
            currency: "ZWL",
            amount: "5500.00",
            externalReference: "EXT-1757682990116-QJSXKX",
            txnReference: "ZIM987654321",
            gatewayReference: "GW-554433",
            processedAt: "2025-09-05T12:05:15.250Z",
            status: "MATCHED",
            paymentMethod: "MOBILE_MONEY",
            message: "Payment matched successfully"
          },
          receiptDetails: {
            receiptNumber: "RCPT20250905-001",
            allocatedAt: "2025-09-05T12:06:22.180Z",
            status: "applied"
          },
          policyDetails: {
            policyNumber: "T1/AHL/USP/027148",
            insuranceType: "General",
            policyType: "Engineering"
          },
          reversalDetails: {
            status: "",
            reversalReference: "",
            reason: "",
            reversedAt: "",
            message: ""
          },
          meta: {
            processedAt: "2025-09-05T12:05:15.250Z",
            updatedAt: "2025-09-05T12:07:05.420Z",
            requestId: "GW-1757685737808-KFEJ7Z"
          }
        },
        {
          policyHolder: {
            fullName: "Jane Doe",
            identifier: "JANEDOE"
          },
          paymentDetails: {
            currency: "USD",
            amount: "120.00",
            externalReference: "EXT-1757682990117-KJSDF",
            txnReference: "ZIM123456789",
            gatewayReference: "GW-887766",
            processedAt: "2025-09-05T13:15:30.100Z",
            status: "PENDING",
            paymentMethod: "CARD",
            message: "Awaiting allocation"
          },
          receiptDetails: {
            receiptNumber: null,
            allocatedAt: null,
            status: "pending"
          },
          policyDetails: {
            policyNumber: "HE/TRV/USP/005462",
            insuranceType: "Life",
            policyType: "Travel"
          },
          reversalDetails: {
            status: "REVERSED",
            reversalReference: "REV202509120001",
            reason: "Customer requested reversal due to timeout",
            reversedAt: "2025-09-12T15:36:10.420Z",
            message: "Payment and receipt successfully reversed"
          },
          meta: {
            processedAt: "2025-09-05T13:15:30.100Z",
            updatedAt: "2025-09-05T13:20:00.400Z",
            requestId: "GW-1757685737810-JSD88F"
          }
        }
      ];

      res.json({
        success: true,
        data: reconciliationData,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          nextToken: null,
          totalRecords: reconciliationData.length
        }
      });

    } catch (error) {
      logger.error('Payments reconciliation export error', { error: error.message, query: req.query });
      res.status(500).json({
        success: false,
        error: {
          status: 'INTERNAL_SERVER_ERROR',
          errorCode: 'SERVER_ERROR',
          errorMessage: 'An unexpected error occurred. Please try again later.'
        },
        meta: {
          requestId: req.headers['x-request-id'] || 'missing',
          processedAt: new Date().toISOString()
        }
      });
    }
  }
);

module.exports = router;