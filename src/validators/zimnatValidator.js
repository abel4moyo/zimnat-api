const { body, param, query } = require('express-validator');

const zimnatValidationRules = {
  // Authentication validation
  authenticate: [
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],

  // Policy lookup validation
  policyLookup: [
    body('identifier')
      .notEmpty()
      .withMessage('Identifier is required')
      .isLength({ max: 50 })
      .withMessage('Identifier must not exceed 50 characters'),
    
    body('identifierType')
      .isIn(['VRN', 'POLICY_NUMBER'])
      .withMessage('Identifier type must be VRN or POLICY_NUMBER'),
    
    body('productType')
      .isIn(['MOTOR', 'TRAVEL', 'PERSONAL_ACCIDENT', 'PET', 'LEGAL', 'MY_BUSINESS_PROTECTOR', 'HOSPITAL_CASH_PLAN'])
      .withMessage('Invalid product type'),
    
    body('coverOptions')
      .optional()
      .isObject()
      .withMessage('Cover options must be a valid object'),
    
    body('coverOptions.motorCoverType')
      .optional()
      .isIn([
        'FULL_THIRD_PARTY_ONLY', 'FULL_THIRD_PARTY_ZINARA', 'FULL_THIRD_PARTY_ZINARA_RADIO',
        'THIRD_PARTY_ONLY', 'THIRD_PARTY_ZINARA', 'THIRD_PARTY_ZINARA_RADIO',
        'COMPREHENSIVE_ONLY', 'COMPREHENSIVE_ZINARA', 'COMPREHENSIVE_ZINARA_RADIO', 'MOTOR_ADD_ONS'
      ])
      .withMessage('Invalid motor cover type')
  ],

  // Premium payment confirmation validation
  premiumPaymentConfirmation: [
    body('policyNumber')
      .notEmpty()
      .withMessage('Policy number is required')
      .isLength({ max: 50 })
      .withMessage('Policy number must not exceed 50 characters'),
    
    body('amountPaid')
      .isFloat({ min: 0.01 })
      .withMessage('Amount paid must be greater than 0'),
    
    body('bankTransactionId')
      .notEmpty()
      .withMessage('Bank transaction ID is required')
      .isLength({ max: 100 })
      .withMessage('Bank transaction ID must not exceed 100 characters'),
    
    body('paymentDateTime')
      .isISO8601()
      .withMessage('Valid payment date time is required'),
    
    body('customerAccountNumber')
      .notEmpty()
      .withMessage('Customer account number is required')
      .isLength({ max: 50 })
      .withMessage('Customer account number must not exceed 50 characters'),
    
    body('bankReferenceNumber')
      .notEmpty()
      .withMessage('Bank reference number is required')
      .isLength({ max: 100 })
      .withMessage('Bank reference number must not exceed 100 characters'),
    
    body('customerEmail')
      .isEmail()
      .withMessage('Valid customer email is required'),
    
    body('paymentBreakdown')
      .isObject()
      .withMessage('Payment breakdown is required'),
    
    body('paymentBreakdown.principalAmount')
      .isFloat({ min: 0 })
      .withMessage('Principal amount must be a valid number'),
    
    body('paymentBreakdown.taxAmount')
      .isFloat({ min: 0 })
      .withMessage('Tax amount must be a valid number'),
    
    body('paymentBreakdown.transactionChargeAmount')
      .isFloat({ min: 0 })
      .withMessage('Transaction charge amount must be a valid number')
  ],

  // Quote generation validation
  quoteGeneration: [
    body('productType')
      .isIn(['MOTOR', 'TRAVEL', 'PERSONAL_ACCIDENT', 'PET', 'LEGAL', 'MY_BUSINESS_PROTECTOR', 'HOSPITAL_CASH_PLAN'])
      .withMessage('Invalid product type'),
    
    body('packageType')
      .notEmpty()
      .withMessage('Package type is required')
      .isLength({ max: 50 })
      .withMessage('Package type must not exceed 50 characters'),
    
    body('customerInfo')
      .isObject()
      .withMessage('Customer info is required'),
    
    body('customerInfo.firstName')
      .notEmpty()
      .withMessage('Customer first name is required'),
    
    body('customerInfo.lastName')
      .notEmpty()
      .withMessage('Customer last name is required'),
    
    body('customerInfo.idNumber')
      .notEmpty()
      .withMessage('Customer ID number is required'),
    
    body('customerInfo.email')
      .isEmail()
      .withMessage('Valid customer email is required'),
    
    body('riskFactors')
      .isObject()
      .withMessage('Risk factors are required')
  ],

  // Policy creation validation
  policyCreation: [
    body('quotationNumber')
      .notEmpty()
      .withMessage('Quotation number is required')
      .isLength({ max: 50 })
      .withMessage('Quotation number must not exceed 50 characters'),
    
    body('customerInfo')
      .isObject()
      .withMessage('Customer info is required'),
    
    body('customerInfo.firstName')
      .notEmpty()
      .withMessage('Customer first name is required'),
    
    body('customerInfo.lastName')
      .notEmpty()
      .withMessage('Customer last name is required'),
    
    body('customerInfo.idNumber')
      .notEmpty()
      .withMessage('Customer ID number is required'),
    
    body('customerInfo.email')
      .isEmail()
      .withMessage('Valid customer email is required'),
    
    body('customerInfo.mobileNumber')
      .notEmpty()
      .withMessage('Customer mobile number is required'),
    
    body('customerInfo.homeAddress')
      .isObject()
      .withMessage('Customer home address is required'),
    
    body('customerInfo.homeAddress.street')
      .notEmpty()
      .withMessage('Street address is required'),
    
    body('customerInfo.homeAddress.city')
      .notEmpty()
      .withMessage('City is required'),
    
    body('paymentBreakdown')
      .isObject()
      .withMessage('Payment breakdown is required'),
    
    body('paymentBreakdown.principalAmount')
      .isFloat({ min: 0 })
      .withMessage('Principal amount must be a valid number'),
    
    body('paymentBreakdown.taxAmount')
      .isFloat({ min: 0 })
      .withMessage('Tax amount must be a valid number'),
    
    body('paymentBreakdown.transactionChargeAmount')
      .isFloat({ min: 0 })
      .withMessage('Transaction charge amount must be a valid number'),
    
    body('consentToDataSharing')
      .isBoolean()
      .withMessage('Consent to data sharing must be true or false')
  ],

  // Claim processing validation
  claimProcessing: [
    body('claimNumber')
      .notEmpty()
      .withMessage('Claim number is required')
      .isLength({ max: 50 })
      .withMessage('Claim number must not exceed 50 characters'),
    
    body('policyNumber')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Policy number must not exceed 50 characters'),
    
    body('claimDetails')
      .isObject()
      .withMessage('Claim details are required'),
    
    body('claimDetails.incidentDate')
      .optional()
      .isISO8601()
      .withMessage('Valid incident date is required'),
    
    body('claimDetails.description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters')
  ]
};

module.exports = zimnatValidationRules;