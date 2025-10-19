// ===================================================================
// 10. MOTOR INSURANCE VALIDATORS
// File: validators/motorInsuranceValidator.js
// ===================================================================

const { body, param, query } = require('express-validator');

const motorInsuranceValidators = {
  
  // Quote generation validation
  validateQuoteRequest: [
    body('vrn')
      .notEmpty()
      .withMessage('Vehicle Registration Number (VRN) is required')
      .isLength({ min: 3, max: 20 })
      .withMessage('VRN must be between 3 and 20 characters'),
    
    body('vehicleValue')
      .isNumeric()
      .withMessage('Vehicle value must be numeric')
      .isFloat({ min: 100 })
      .withMessage('Vehicle value must be at least $100'),
    
    body('insuranceType')
      .isIn(['1', '2', '3', '4'])
      .withMessage('Invalid insurance type. Must be 1 (RTA), 2 (FTP), 3 (FTPF), or 4 (FTPFT)'),
    
    body('vehicleType')
      .isIn(['1', '2', '3', '4', '5', '6', '7'])
      .withMessage('Invalid vehicle type'),
    
    body('durationMonths')
      .isIn(['4', '6', '12'])
      .withMessage('Duration must be 4, 6, or 12 months'),
    
    body('make')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Make must not exceed 50 characters'),
    
    body('model')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Model must not exceed 50 characters'),
    
    body('yearManufacture')
      .optional()
      .isInt({ min: 1980, max: new Date().getFullYear() + 1 })
      .withMessage('Year of manufacture must be between 1980 and current year'),
    
    // Client details validation
    body('clientDetails.idNumber')
      .notEmpty()
      .withMessage('Client ID number is required')
      .isLength({ min: 5, max: 20 })
      .withMessage('ID number must be between 5 and 20 characters'),
    
    body('clientDetails.firstName')
      .notEmpty()
      .withMessage('Client first name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    
    body('clientDetails.lastName')
      .notEmpty()
      .withMessage('Client last name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    
    body('clientDetails.msisdn')
      .notEmpty()
      .withMessage('Client mobile number is required')
      .matches(/^(\+263|0)[0-9]{9}$/)
      .withMessage('Invalid Zimbabwean mobile number format'),
    
    body('clientDetails.email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format'),
    
    body('clientDetails.address1')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Address line 1 must not exceed 100 characters'),
    
    // License options validation (optional)
    body('licenseOptions.licFrequency')
      .optional()
      .isIn(['1', '2', '3'])
      .withMessage('Invalid license frequency'),
    
    body('licenseOptions.radioTvUsage')
      .optional()
      .isIn(['0', '1'])
      .withMessage('Radio/TV usage must be 0 (No) or 1 (Yes)')
  ],

  // Quote approval validation
  validateApprovalRequest: [
    param('quoteId')
      .notEmpty()
      .withMessage('Quote ID is required')
      .matches(/^MQ[0-9]+$/)
      .withMessage('Invalid quote ID format'),
    
    body('paymentMethod')
      .isIn(['1', '2', '3', '4', '5', '6', '7'])
      .withMessage('Invalid payment method'),
    
    body('deliveryMethod')
      .isIn(['1', '2'])
      .withMessage('Invalid delivery method. Must be 1 (POSTAL) or 2 (OFFICE COLLECTION)'),
    
    body('paymentDetails')
      .optional()
      .isObject()
      .withMessage('Payment details must be an object'),
    
    body('paymentDetails.cardNumber')
      .optional()
      .isCreditCard()
      .withMessage('Invalid credit card number'),
    
    body('paymentDetails.expiryDate')
      .optional()
      .matches(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
      .withMessage('Invalid expiry date format (MM/YY)'),
    
    body('paymentDetails.cvv')
      .optional()
      .matches(/^[0-9]{3,4}$/)
      .withMessage('Invalid CVV format')
  ],

  // ICEcash TPI quote validation
  validateTPIQuoteRequest: [
    body('PartnerReference')
      .notEmpty()
      .withMessage('PartnerReference is required')
      .isUUID()
      .withMessage('PartnerReference must be a valid UUID'),
    
    body('Date')
      .notEmpty()
      .withMessage('Date is required')
      .matches(/^[0-9]{14}$/)
      .withMessage('Date must be in YYYYMMDDHHMMSS format'),
    
    body('Version')
      .notEmpty()
      .withMessage('Version is required')
      .isFloat()
      .withMessage('Version must be a number'),
    
    body('PartnerToken')
      .notEmpty()
      .withMessage('PartnerToken is required')
      .isLength({ min: 10, max: 50 })
      .withMessage('PartnerToken must be between 10 and 50 characters'),
    
    body('Request.Function')
      .equals('TPIQuotes')
      .withMessage('Function must be TPIQuotes'),
    
    body('Request.Vehicles')
      .isArray({ min: 1 })
      .withMessage('Vehicles must be a non-empty array'),
    
    body('Request.Vehicles.*.VRN')
      .notEmpty()
      .withMessage('VRN is required for each vehicle'),
    
    body('Request.Vehicles.*.IDNumber')
      .notEmpty()
      .withMessage('IDNumber is required for each vehicle'),
    
    body('Request.Vehicles.*.InsuranceType')
      .isIn(['1', '2', '3', '4'])
      .withMessage('Invalid InsuranceType for vehicle'),
    
    body('Request.Vehicles.*.VehicleValue')
      .isNumeric()
      .withMessage('VehicleValue must be numeric for each vehicle')
  ],

  // Quote retrieval validation
  validateQuoteRetrieval: [
    param('quoteId')
      .notEmpty()
      .withMessage('Quote ID is required')
      .matches(/^MQ[0-9]+$/)
      .withMessage('Invalid quote ID format')
  ],

  // Search/filter validation
  validateQuoteSearch: [
    query('status')
      .optional()
      .isIn(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'])
      .withMessage('Invalid status filter'),
    
    query('vrn')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('VRN filter must be between 3 and 20 characters'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO format'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO format')
  ]
};

module.exports = motorInsuranceValidators;