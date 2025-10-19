const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const PersonalAccidentController = require('../controllers/personalAccidentController');
const authenticatePartner = require('../middleware/authenticatePartner');

// Validation rules
const calculatePremiumValidation = [
  body('packageId')
    .notEmpty()
    .withMessage('Package ID is required')
    .isIn(['PA_STANDARD', 'PA_PRESTIGE', 'PA_PREMIER'])
    .withMessage('Invalid package ID'),
  body('customerData.age')
    .optional()
    .isInt({ min: 18, max: 80 })
    .withMessage('Age must be between 18 and 80'),
  body('customerData.occupation')
    .optional()
    .isString()
    .withMessage('Occupation must be a string')
];

const generateQuoteValidation = [
  body('packageId')
    .notEmpty()
    .withMessage('Package ID is required')
    .isIn(['PA_STANDARD', 'PA_PRESTIGE', 'PA_PREMIER'])
    .withMessage('Invalid package ID'),
  body('customerInfo.firstName')
    .notEmpty()
    .withMessage('First name is required'),
  body('customerInfo.lastName')
    .notEmpty()
    .withMessage('Last name is required'),
  body('customerInfo.email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required'),
  body('customerInfo.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('customerInfo.age')
    .optional()
    .isInt({ min: 18, max: 80 })
    .withMessage('Age must be between 18 and 80')
];

const createPolicyValidation = [
  body('quoteNumber')
    .notEmpty()
    .withMessage('Quote number is required'),
  body('paymentData.amount')
    .isNumeric()
    .withMessage('Payment amount is required and must be numeric'),
  body('paymentData.paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required'),
  body('paymentData.transactionId')
    .notEmpty()
    .withMessage('Transaction ID is required')
];

const processPaymentValidation = [
  body('policyNumber')
    .notEmpty()
    .withMessage('Policy number is required'),
  body('amount')
    .isNumeric()
    .withMessage('Amount is required and must be numeric'),
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required'),
  body('externalReference')
    .notEmpty()
    .withMessage('External reference is required')
];

// Routes
router.get('/api/personal-accident/packages', 
  PersonalAccidentController.getPackages
);

router.post('/api/personal-accident/calculate',
  authenticatePartner,
  calculatePremiumValidation,
  PersonalAccidentController.calculatePremium
);

router.post('/api/personal-accident/quote',
  authenticatePartner,
  generateQuoteValidation,
  PersonalAccidentController.generateQuote
);

router.post('/api/personal-accident/policy',
  authenticatePartner,
  createPolicyValidation,
  PersonalAccidentController.createPolicy
);

router.post('/api/personal-accident/payment',
  authenticatePartner,
  processPaymentValidation,
  PersonalAccidentController.processPayment
);

module.exports = router;