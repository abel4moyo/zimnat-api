// src/routes/hcpRoutes.js
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const HCPController = require('../controllers/hcpController');
const authenticateZimnat = require('../middleware/authenticateZimnat');
const logger = require('../utils/logger');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// Request logging middleware for HCP routes
const logHCPRequest = (req, res, next) => {
  logger.info('HCP API Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
};

// Apply middleware to all HCP routes
router.use(logHCPRequest);

/**
 * GET /api/hcp/packages
 * Get available HCP packages with benefits and limits
 */
router.get('/packages', 
  authenticateZimnat,
  HCPController.getPackages
);

/**
 * POST /api/hcp/calculate
 * Calculate HCP premium for given parameters
 */
router.post('/calculate',
  authenticateZimnat,
  [
    body('packageType')
      .notEmpty()
      .withMessage('Package type is required')
      .isIn(['HCP_INDIVIDUAL', 'HCP_FAMILY'])
      .withMessage('Package type must be HCP_INDIVIDUAL or HCP_FAMILY'),
    body('familySize')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Family size must be between 1 and 10'),
    body('duration')
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('Duration must be between 1 and 12 months')
  ],
  handleValidationErrors,
  HCPController.calculatePremium
);

/**
 * POST /api/hcp/quote
 * Generate HCP insurance quote
 */
router.post('/quote',
  authenticateZimnat,
  [
    body('packageType')
      .notEmpty()
      .withMessage('Package type is required')
      .isIn(['HCP_INDIVIDUAL', 'HCP_FAMILY'])
      .withMessage('Package type must be HCP_INDIVIDUAL or HCP_FAMILY'),
    body('customerInfo')
      .isObject()
      .withMessage('Customer info must be an object'),
    body('customerInfo.firstName')
      .notEmpty()
      .withMessage('Customer first name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('customerInfo.lastName')
      .notEmpty()
      .withMessage('Customer last name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('customerInfo.email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('customerInfo.phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number required'),
    body('customerInfo.idNumber')
      .optional()
      .isLength({ min: 8, max: 20 })
      .withMessage('ID number must be between 8 and 20 characters'),
    body('familySize')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Family size must be between 1 and 10'),
    body('duration')
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('Duration must be between 1 and 12 months'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],
  handleValidationErrors,
  HCPController.generateQuote
);

/**
 * POST /api/hcp/policy
 * Create HCP policy from an existing quote
 */
router.post('/policy',
  authenticateZimnat,
  [
    body('quotationNumber')
      .notEmpty()
      .withMessage('Quotation number is required')
      .matches(/^HCP-\d+-[A-F0-9]+$/)
      .withMessage('Invalid quotation number format'),
    body('paymentBreakdown')
      .isObject()
      .withMessage('Payment breakdown is required'),
    body('paymentBreakdown.principalAmount')
      .isNumeric()
      .withMessage('Principal amount must be numeric')
      .custom(value => value > 0)
      .withMessage('Principal amount must be greater than 0'),
    body('paymentBreakdown.bankTransactionId')
      .notEmpty()
      .withMessage('Bank transaction ID is required'),
    body('paymentBreakdown.bankReferenceNumber')
      .optional()
      .isString()
      .withMessage('Bank reference number must be a string'),
    body('paymentBreakdown.customerAccountNumber')
      .optional()
      .isString()
      .withMessage('Customer account number must be a string'),
    body('paymentBreakdown.customerEmail')
      .optional()
      .isEmail()
      .withMessage('Valid customer email required'),
    body('paymentBreakdown.paymentDateTime')
      .optional()
      .isISO8601()
      .withMessage('Payment date time must be in ISO 8601 format'),
    body('consentToDataSharing')
      .optional()
      .isBoolean()
      .withMessage('Consent to data sharing must be boolean'),
    body('deliveryMethod')
      .optional()
      .isIn(['EMAIL', 'SMS', 'POSTAL'])
      .withMessage('Delivery method must be EMAIL, SMS, or POSTAL')
  ],
  handleValidationErrors,
  HCPController.createPolicy
);

/**
 * POST /api/hcp/payment
 * Process payment for HCP policy
 */
router.post('/payment',
  authenticateZimnat,
  [
    body('policyNumber')
      .notEmpty()
      .withMessage('Policy number is required')
      .matches(/^HCP-POL-\d+-[A-F0-9]+$/)
      .withMessage('Invalid HCP policy number format'),
    body('amountPaid')
      .isNumeric()
      .withMessage('Amount paid must be numeric')
      .custom(value => value > 0)
      .withMessage('Amount paid must be greater than 0'),
    body('bankTransactionId')
      .notEmpty()
      .withMessage('Bank transaction ID is required'),
    body('bankReferenceNumber')
      .optional()
      .isString()
      .withMessage('Bank reference number must be a string'),
    body('customerAccountNumber')
      .optional()
      .isString()
      .withMessage('Customer account number must be a string'),
    body('customerEmail')
      .optional()
      .isEmail()
      .withMessage('Valid customer email required'),
    body('paymentDateTime')
      .optional()
      .isISO8601()
      .withMessage('Payment date time must be in ISO 8601 format')
  ],
  handleValidationErrors,
  HCPController.processPayment
);

/**
 * GET /api/hcp/policy/:policyNumber
 * Get HCP policy details
 */
router.get('/policy/:policyNumber',
  authenticateZimnat,
  [
    param('policyNumber')
      .matches(/^HCP-POL-\d+-[A-F0-9]+$/)
      .withMessage('Invalid HCP policy number format')
  ],
  handleValidationErrors,
  HCPController.getPolicyDetails
);

/**
 * GET /api/hcp/quote/:quoteNumber
 * Get HCP quote details
 */
router.get('/quote/:quoteNumber',
  authenticateZimnat,
  [
    param('quoteNumber')
      .matches(/^HCP-\d+-[A-F0-9]+$/)
      .withMessage('Invalid HCP quote number format')
  ],
  handleValidationErrors,
  HCPController.getQuoteDetails
);

/**
 * GET /api/hcp/health
 * Health check for HCP service
 */
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity for HCP tables
    const { db } = require('../db');
    
    const packageCount = await db('rating_packages')
      .where('product_id', 'HCP')
      .count('* as count')
      .first();

    const quoteCount = await db('quotes')
      .where('product_id', 'HCP')
      .count('* as count')
      .first();

    res.json({
      success: true,
      service: 'Hospital Cash Plan API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      data: {
        packages_available: parseInt(packageCount.count),
        total_quotes: parseInt(quoteCount.count),
        database_connection: 'OK'
      }
    });

  } catch (error) {
    logger.error('HCP health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      service: 'Hospital Cash Plan API',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// Error handling middleware for HCP routes
router.use((error, req, res, next) => {
  logger.error('HCP Route Error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  // Handle specific error types
  if (error.status && error.code) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code,
      reconciliationRequired: error.reconciliationRequired || false
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred in HCP service',
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred while processing your HCP request'
  });
});

module.exports = router;