const { body, param, query } = require('express-validator');

const zimnatChemaValidationRules = {
  // Application creation validation
  createApplication: [
    // Contract Details validation (using kebab-case as per Postman)
    body('contract-details.package-level')
      .notEmpty()
      .withMessage('Package level is required')
      .isIn(['plan-1', 'plan-2'])
      .withMessage('Package level must be plan-1 or plan-2'),
    
    body('contract-details.payment-frequency')
      .notEmpty()
      .withMessage('Payment frequency is required')
      .isIn(['monthly', 'quarterly', 'half-yearly', 'yearly'])
      .withMessage('Payment frequency must be monthly, quarterly, half-yearly, or yearly'),
    
    body('contract-details.signed-date')
      .notEmpty()
      .withMessage('Signed date is required')
      .isInt({ min: 19000101, max: 99991231 })
      .withMessage('Signed date must be in YYYYMMDD format (e.g., 20230626)')
      .custom((value) => {
        const dateStr = value.toString();
        if (dateStr.length !== 8) {
          throw new Error('Date must be 8 digits in YYYYMMDD format');
        }
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6));
        const day = parseInt(dateStr.substring(6, 8));
        
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          throw new Error('Invalid date format');
        }
        return true;
      }),
    
    body('contract-details.agent-contract-id')
      .notEmpty()
      .withMessage('Agent contract ID is required')
      .isLength({ max: 50 })
      .withMessage('Agent contract ID must not exceed 50 characters'),
    
    body('contract-details.paypoint-contract-id')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Paypoint contract ID must not exceed 50 characters'),

    // Life Assured Details validation (using kebab-case)
    body('life-assured-details.first-names')
      .notEmpty()
      .withMessage('First names are required')
      .isLength({ min: 2, max: 100 })
      .withMessage('First names must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('First names must contain only letters and spaces'),
    
    body('life-assured-details.surname')
      .notEmpty()
      .withMessage('Surname is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Surname must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Surname must contain only letters and spaces'),
    
    body('life-assured-details.date-of-birth')
      .notEmpty()
      .withMessage('Date of birth is required')
      .isInt({ min: 19000101, max: 99991231 })
      .withMessage('Date of birth must be in YYYYMMDD format (e.g., 19851030)')
      .custom((value) => {
        const dateStr = value.toString();
        if (dateStr.length !== 8) {
          throw new Error('Date must be 8 digits in YYYYMMDD format');
        }
        
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6));
        const day = parseInt(dateStr.substring(6, 8));
        
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          throw new Error('Invalid date format');
        }
        
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age < 18 || age > 65) {
          throw new Error('Age must be between 18 and 65 years');
        }
        return true;
      }),
    
    body('life-assured-details.gender')
      .notEmpty()
      .withMessage('Gender is required')
      .isIn(['male', 'female'])
      .withMessage('Gender must be male or female'),
    
    body('life-assured-details.id-type')
      .notEmpty()
      .withMessage('ID type is required')
      .isIn(['ID', 'PASSPORT', 'DRIVERS', 'TAX'])
      .withMessage('ID type must be ID, PASSPORT, DRIVERS, or TAX'),
    
    body('life-assured-details.id-number')
      .notEmpty()
      .withMessage('ID number is required')
      .isLength({ min: 5, max: 20 })
      .withMessage('ID number must be between 5 and 20 characters'),
    
    body('life-assured-details.id-country')
      .optional()
      .isLength({ max: 3 })
      .withMessage('ID country must not exceed 3 characters'),
    
    body('life-assured-details.marital-status')
      .optional()
      .isIn(['single', 'married', 'divorced', 'widower', 'widow'])
      .withMessage('Invalid marital status'),
    
    body('life-assured-details.title')
      .optional()
      .isIn(['adv', 'dr', 'miss', 'mr', 'mrs', 'ms', 'prof', 'rev'])
      .withMessage('Invalid title'),

    // Contact Details validation (using kebab-case)
    body('life-assured-contact-details.cell-phone')
      .notEmpty()
      .withMessage('Cell phone number is required')
      .matches(/^\+\d{10,15}$/)
      .withMessage('Cell phone must include country code (e.g., +263771234567)'),
    
    body('life-assured-contact-details.email')
      .optional()
      .isEmail()
      .withMessage('Valid email address is required'),

    // Address validation (optional fields, using kebab-case)
    body('life-assured-address.building')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Building address must not exceed 100 characters'),
    
    body('life-assured-address.street')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Street address must not exceed 100 characters'),
    
    body('life-assured-address.suburb')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Suburb must not exceed 50 characters'),
    
    body('life-assured-address.town')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Town must not exceed 50 characters'),
    
    body('life-assured-address.area-code')
      .optional()
      .isLength({ max: 10 })
      .withMessage('Area code must not exceed 10 characters'),

    // Payment Details validation (using kebab-case)
    body('payment-details.debit-order')
      .notEmpty()
      .withMessage('Debit order preference is required')
      .isIn(['Y', 'N'])
      .withMessage('Debit order must be Y or N'),
    
    body('payment-details.mobile-wallet')
      .optional()
      .isIn(['Y', 'N'])
      .withMessage('Mobile wallet must be Y or N'),
    
    body('payment-details.cash')
      .optional()
      .isIn(['Y', 'N'])
      .withMessage('Cash payment must be Y or N'),

    // Beneficiaries validation (array of up to 4 beneficiaries)
    body('beneficiaryDetails')
      .isArray({ max: 4 })
      .withMessage('Maximum of 4 beneficiaries allowed'),
    
    body('beneficiaryDetails.*.beneficiaryRole')
      .notEmpty()
      .withMessage('Beneficiary role is required')
      .isIn(['BENEFICIARY-1', 'BENEFICIARY-2', 'BENEFICIARY-3', 'BENEFICIARY-4', 'BENEFICIARY-5', 'BENEFICIARY-6'])
      .withMessage('Invalid beneficiary role'),
    
    body('beneficiaryDetails.*.firstNames')
      .notEmpty()
      .withMessage('Beneficiary first names are required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Beneficiary first names must be between 2 and 100 characters'),
    
    body('beneficiaryDetails.*.surname')
      .notEmpty()
      .withMessage('Beneficiary surname is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Beneficiary surname must be between 2 and 50 characters'),
    
    body('beneficiaryDetails.*.dateOfBirth')
      .notEmpty()
      .withMessage('Beneficiary date of birth is required')
      .isISO8601()
      .withMessage('Beneficiary date of birth must be a valid date'),
    
    body('beneficiaryDetails.*.cellPhone')
      .notEmpty()
      .withMessage('Beneficiary cell phone is required')
      .matches(/^\+\d{10,15}$/)
      .withMessage('Beneficiary cell phone must include country code'),
    
    body('beneficiaryDetails.*.relationship')
      .notEmpty()
      .withMessage('Beneficiary relationship is required')
      .isIn([
        'AUNT', 'BROTHER', 'BROTHER-IN-LAW', 'COUSIN', 'DAUGHTER', 'DAUGHTER-IN-LAW',
        'ESTATE', 'EX-SPOUSE', 'FATHER', 'FATHER-IN-LAW', 'FIANCE', 'FRIEND',
        'GOD-DAUGHTER', 'GOD-FATHER', 'GOD-MOTHER', 'GOD-SON', 'GRANDCHILD',
        'GRANDFATHER', 'GRANDMOTHER', 'GUARDIAN', 'MAIN', 'MOTHER', 'MOTHER-IN-LAW',
        'NEPHEW', 'NIECE', 'PARTNER', 'PAYER', 'PARENT', 'SISTER', 'SISTER-IN-LAW',
        'SON', 'SON-IN-LAW', 'SPOUSE', 'TESTAMENT', 'TRUST', 'UNCLE'
      ])
      .withMessage('Invalid beneficiary relationship'),
    
    body('beneficiaryDetails.*.benefitSplit')
      .notEmpty()
      .withMessage('Benefit split is required')
      .isFloat({ min: 0.01, max: 100.00 })
      .withMessage('Benefit split must be between 0.01 and 100.00'),

    // Custom validation for benefit split totaling 100%
    body('beneficiaryDetails')
      .custom((beneficiaries) => {
        if (beneficiaries && Array.isArray(beneficiaries)) {
          const totalSplit = beneficiaries.reduce((sum, beneficiary) => {
            return sum + parseFloat(beneficiary.benefitSplit || 0);
          }, 0);
          
          if (Math.abs(totalSplit - 100.00) > 0.01) {
            throw new Error('Beneficiary benefit splits must total 100.00%');
          }
        }
        return true;
      })
  ],

  // Policy modification validation
  modifyPolicy: [
    body('contract-details.contract-id')
      .notEmpty()
      .withMessage('Contract ID is required')
      .isLength({ max: 50 })
      .withMessage('Contract ID must not exceed 50 characters'),
    
    body('contract-details.effective-date')
      .notEmpty()
      .withMessage('Effective date is required')
      .isInt({ min: 19000101, max: 99991231 })
      .withMessage('Effective date must be in YYYYMMDD format (e.g., 20230626)'),
    
    body('contract-details.package-level')
      .optional()
      .isIn(['plan-1', 'plan-2'])
      .withMessage('Package level must be plan-1 or plan-2'),
    
    body('contract-details.payment-frequency')
      .optional()
      .isIn(['monthly', 'quarterly', 'half-yearly', 'yearly'])
      .withMessage('Payment frequency must be monthly, quarterly, half-yearly, or yearly'),
    
    // All other fields are optional for modification
    body('lifeAssuredDetails.firstNames')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('First names must be between 2 and 100 characters'),
    
    body('lifeAssuredDetails.cellPhone')
      .optional()
      .matches(/^\+\d{10,15}$/)
      .withMessage('Cell phone must include country code'),
    
    body('lifeAssuredContactDetails.email')
      .optional()
      .isEmail()
      .withMessage('Valid email address is required')
  ],

  // Status update validation  
  updateStatus: [
    body('contract-details.contract-id')
      .notEmpty()
      .withMessage('Contract ID is required')
      .isLength({ max: 50 })
      .withMessage('Contract ID must not exceed 50 characters'),
    
    body('new-contract-status.effective-date')
      .notEmpty()
      .withMessage('Effective date is required')
      .isInt({ min: 19000101, max: 99991231 })
      .withMessage('Effective date must be in YYYYMMDD format (e.g., 20230626)'),
    
    body('new-contract-status.contract-status')
      .notEmpty()
      .withMessage('Contract status is required')
      .isIn(['INACTIVE', 'ACTIVE'])
      .withMessage('Contract status must be INACTIVE or ACTIVE'),
    
    body('new-contract-status.contract-status-reason')
      .notEmpty()
      .withMessage('Contract status reason is required')
      .isIn(['ACTIVE', 'CANCELLED', 'DECLINED', 'FRAUD', 'REINSTATED'])
      .withMessage('Invalid contract status reason'),
    
    body('new-contract-status.contract-status-description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Contract status description must not exceed 500 characters')
  ],

  // Premium calculation validation
  calculatePremium: [
    body('packageLevel')
      .notEmpty()
      .withMessage('Package level is required')
      .isIn(['PLAN-1', 'PLAN-2'])
      .withMessage('Package level must be PLAN-1 or PLAN-2'),
    
    body('paymentFrequency')
      .notEmpty()
      .withMessage('Payment frequency is required')
      .isIn(['MONTHLY', 'QUARTERLY', 'HALF-YEARLY', 'YEARLY'])
      .withMessage('Payment frequency must be MONTHLY, QUARTERLY, HALF-YEARLY, or YEARLY'),
    
    body('customerData.age')
      .optional()
      .isInt({ min: 18, max: 65 })
      .withMessage('Age must be between 18 and 65'),
    
    body('customerData.gender')
      .optional()
      .isIn(['MALE', 'FEMALE'])
      .withMessage('Gender must be MALE or FEMALE')
  ],

  // Policy lookup validation
  getPolicyDetails: [
    param('contractId')
      .notEmpty()
      .withMessage('Contract ID is required')
      .isLength({ max: 50 })
      .withMessage('Contract ID must not exceed 50 characters')
  ],

  // Policy search validation
  searchPolicies: [
    query('contractId')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Contract ID must not exceed 50 characters'),
    
    query('packageLevel')
      .optional()
      .isIn(['PLAN-1', 'PLAN-2'])
      .withMessage('Package level must be PLAN-1 or PLAN-2'),
    
    query('status')
      .optional()
      .isIn(['ACTIVE', 'INACTIVE', 'CANCELLED'])
      .withMessage('Status must be ACTIVE, INACTIVE, or CANCELLED'),
    
    query('customerId')
      .optional()
      .isLength({ min: 5, max: 20 })
      .withMessage('Customer ID must be between 5 and 20 characters'),
    
    query('customerName')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Customer name must be between 2 and 100 characters'),
    
    query('effectiveDateFrom')
      .optional()
      .isISO8601()
      .withMessage('Effective date from must be a valid date'),
    
    query('effectiveDateTo')
      .optional()
      .isISO8601()
      .withMessage('Effective date to must be a valid date'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
  ],

  // Date validation helper
  validateDateRange: (startField, endField) => {
    return body(endField).custom((endDate, { req }) => {
      const startDate = req.body[startField];
      if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        throw new Error(`${endField} must be after ${startField}`);
      }
      return true;
    });
  },

  // Phone number validation helper
  validatePhoneNumber: (field) => {
    return body(field)
      .matches(/^\+\d{10,15}$/)
      .withMessage(`${field} must include country code (e.g., +263771234567)`);
  },

  // ID number validation based on type
  validateIdByType: () => {
    return body('lifeAssuredDetails.idNumber').custom((idNumber, { req }) => {
      const idType = req.body.lifeAssuredDetails?.idType;
      
      if (idType === 'ID' && idNumber) {
        // Zimbabwe National ID validation (simplified)
        if (!/^\d{2}-\d{6,7}[A-Z]\d{2}$/.test(idNumber)) {
          throw new Error('Invalid Zimbabwe National ID format');
        }
      } else if (idType === 'PASSPORT' && idNumber) {
        // Passport validation (simplified)
        if (!/^[A-Z0-9]{6,12}$/.test(idNumber)) {
          throw new Error('Invalid passport number format');
        }
      }
      
      return true;
    });
  }
};

module.exports = zimnatChemaValidationRules;