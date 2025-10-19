const { body, query } = require('express-validator');

const customerValidationRules = {
  // Customer creation validation
  createCustomer: [
    body('first_name')
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    
    body('last_name')
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    
    body('id_number')
      .notEmpty()
      .withMessage('ID number is required')
      .isLength({ min: 5, max: 20 })
      .withMessage('ID number must be between 5 and 20 characters'),
    
    body('date_of_birth')
      .optional()
      .isISO8601()
      .withMessage('Valid date of birth is required (YYYY-MM-DD format)'),
    
    body('address')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Address must not exceed 255 characters')
  ],

  // Customer search/pagination validation
  searchCustomers: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('search')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Search term must not exceed 100 characters')
  ],

  // Customer update validation
  updateCustomer: [
    body('first_name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    
    body('last_name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    
    body('address')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Address must not exceed 255 characters')
  ]
};

module.exports = customerValidationRules;