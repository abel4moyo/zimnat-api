const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Validation middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      errors: errors.array(),
      path: req.path,
      method: req.method,
      body: req.body
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

// TPI Quote validation
const validateTPIQuote = [
  body('originalPartnerReference')
    .notEmpty()
    .withMessage('Original partner reference is required'),
  
  body('cardNumber')
    .optional()
    .isString()
    .withMessage('Card number must be a string'),
  
  body('transactionDate')
    .notEmpty()
    .isISO8601()
    .withMessage('Transaction date must be a valid ISO 8601 date'),
  
  body('transactionCode')
    .notEmpty()
    .isString()
    .withMessage('Transaction code is required'),
  
  body('insuranceID')
    .notEmpty()
    .isString()
    .withMessage('Insurance ID is required'),
  
  body('quotes')
    .isArray({ min: 1 })
    .withMessage('At least one quote is required'),
  
  body('quotes.*.VRN')
    .notEmpty()
    .isString()
    .withMessage('Vehicle registration number is required'),
  
  body('quotes.*.InsuranceType')
    .isInt({ min: 0 })
    .withMessage('Insurance type must be a valid integer'),
  
  body('quotes.*.VehicleValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Vehicle value must be a positive number'),
  
  body('quotes.*.DurationMonths')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('Duration must be between 1 and 60 months'),

  handleValidationErrors
];

// TPI Quote Update validation
const validateTPIQuoteUpdate = [
  body('identifier')
    .notEmpty()
    .isString()
    .withMessage('Identifier is required'),
  
  body('msisdn')
    .optional()
    .isMobilePhone()
    .withMessage('MSISDN must be a valid mobile phone number'),
  
  body('vehicles')
    .isArray({ min: 1 })
    .withMessage('At least one vehicle is required'),
  
  body('vehicles.*.VRN')
    .notEmpty()
    .isString()
    .withMessage('Vehicle registration number is required'),
  
  body('vehicles.*.CustomerReference')
    .notEmpty()
    .isString()
    .withMessage('Customer reference is required'),

  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('username')
    .notEmpty()
    .isString()
    .withMessage('Username is required'),
  
  body('password')
    .notEmpty()
    .isString()
    .isLength({ min: 6 })
    .withMessage('Password is required and must be at least 6 characters'),

  handleValidationErrors
];

// License quote validation
const validateLicenseQuote = [
  body('vrn')
    .notEmpty()
    .isString()
    .withMessage('Vehicle registration number is required'),
  
  body('licenceID')
    .notEmpty()
    .isString()
    .withMessage('License ID is required'),
  
  body('customerReference')
    .notEmpty()
    .isString()
    .withMessage('Customer reference is required'),

  handleValidationErrors
];

// Claim validation
const validateClaim = [
  query('ClaimId')
    .notEmpty()
    .isString()
    .withMessage('Claim ID is required'),

  handleValidationErrors
];

module.exports = {
  validateTPIQuote,
  validateTPIQuoteUpdate,
  validateLogin,
  validateLicenseQuote,
  validateClaim,
  handleValidationErrors
};