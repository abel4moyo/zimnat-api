// src/routes/domesticRoutes.js
const express = require('express');
const router = express.Router();
const DomesticController = require('../controllers/domesticController');
const authenticatePartner = require('../middleware/authenticatePartner');
const { body, param } = require('express-validator');

// Middleware to authenticate all domestic routes
router.use(authenticatePartner);

/**
 * GET /api/domestic/packages
 * Get available Domestic Insurance packages
 */
router.get('/packages', DomesticController.getPackages);

/**
 * POST /api/domestic/calculate
 * Calculate Domestic Insurance premium
 */
router.post('/calculate', [
  body('packageType')
    .notEmpty()
    .withMessage('Package type is required')
    .isIn(['DOMESTIC_STANDARD', 'DOMESTIC_PRESTIGE', 'DOMESTIC_PREMIER'])
    .withMessage('Invalid package type'),
  body('coverType')
    .optional()
    .isIn(['HOMEOWNERS', 'HOUSEHOLDERS'])
    .withMessage('Cover type must be HOMEOWNERS or HOUSEHOLDERS'),
  body('propertyValue')
    .if(body('coverType').equals('HOMEOWNERS'))
    .isFloat({ min: 1 })
    .withMessage('Property value must be greater than 0 for homeowners cover'),
  body('contentsValue')
    .if(body('coverType').equals('HOUSEHOLDERS'))
    .isFloat({ min: 1 })
    .withMessage('Contents value must be greater than 0 for householders cover'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Duration must be between 1 and 12 months')
], DomesticController.calculatePremium);

/**
 * POST /api/domestic/quote
 * Generate Domestic Insurance quote
 */
router.post('/quote', [
  body('packageType')
    .notEmpty()
    .withMessage('Package type is required')
    .isIn(['DOMESTIC_STANDARD', 'DOMESTIC_PRESTIGE', 'DOMESTIC_PREMIER'])
    .withMessage('Invalid package type'),
  body('customerInfo.firstName')
    .notEmpty()
    .withMessage('Customer first name is required'),
  body('customerInfo.lastName')
    .notEmpty()
    .withMessage('Customer last name is required'),
  body('customerInfo.email')
    .isEmail()
    .withMessage('Valid customer email is required'),
  body('customerInfo.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number required if provided'),
  body('coverType')
    .optional()
    .isIn(['HOMEOWNERS', 'HOUSEHOLDERS'])
    .withMessage('Cover type must be HOMEOWNERS or HOUSEHOLDERS'),
  body('propertyValue')
    .if(body('coverType').equals('HOMEOWNERS'))
    .isFloat({ min: 1 })
    .withMessage('Property value must be greater than 0 for homeowners cover'),
  body('contentsValue')
    .if(body('coverType').equals('HOUSEHOLDERS'))
    .isFloat({ min: 1 })
    .withMessage('Contents value must be greater than 0 for householders cover')
], DomesticController.generateQuote);

/**
 * POST /api/domestic/policy
 * Create Domestic Insurance policy from quote
 */
router.post('/policy', [
  body('quotationNumber')
    .notEmpty()
    .withMessage('Quotation number is required')
    .matches(/^DOM-\d{13}-[A-F0-9]{8}$/)
    .withMessage('Invalid quotation number format'),
  body('paymentBreakdown.principalAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Principal amount must be greater than 0'),
  body('paymentBreakdown.bankTransactionId')
    .notEmpty()
    .withMessage('Bank transaction ID is required'),
  body('paymentBreakdown.bankReferenceNumber')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Bank reference number cannot be empty if provided'),
  body('consentToDataSharing')
    .optional()
    .isBoolean()
    .withMessage('Consent to data sharing must be true or false'),
  body('deliveryMethod')
    .optional()
    .isIn(['EMAIL', 'SMS', 'POSTAL'])
    .withMessage('Invalid delivery method')
], DomesticController.createPolicy);

/**
 * POST /api/domestic/payment
 * Process Domestic Insurance payment
 */
router.post('/payment', [
  body('policyNumber')
    .notEmpty()
    .withMessage('Policy number is required')
    .matches(/^DOM-POL-\d{13}-[A-F0-9]{12}$/)
    .withMessage('Invalid policy number format'),
  body('amountPaid')
    .isFloat({ min: 0.01 })
    .withMessage('Amount paid must be greater than 0'),
  body('bankTransactionId')
    .notEmpty()
    .withMessage('Bank transaction ID is required'),
  body('customerEmail')
    .optional()
    .isEmail()
    .withMessage('Valid email required if provided'),
  body('paymentDateTime')
    .optional()
    .isISO8601()
    .withMessage('Payment date time must be in ISO8601 format')
], DomesticController.processPayment);

/**
 * GET /api/domestic/policy/:policyNumber
 * Get Domestic Insurance policy details
 */
router.get('/policy/:policyNumber', [
  param('policyNumber')
    .matches(/^DOM-POL-\d{13}-[A-F0-9]{12}$/)
    .withMessage('Invalid policy number format')
], DomesticController.getPolicyDetails);

/**
 * GET /api/domestic/quote/:quoteNumber
 * Get Domestic Insurance quote details
 */
router.get('/quote/:quoteNumber', [
  param('quoteNumber')
    .matches(/^DOM-\d{13}-[A-F0-9]{8}$/)
    .withMessage('Invalid quote number format')
], DomesticController.getQuoteDetails);

module.exports = router;