const { body, param } = require('express-validator');

const adminValidationRules = {
  // Partner creation validation
  createPartner: [
    body('partner_code')
      .notEmpty()
      .withMessage('Partner code is required')
      .isLength({ min: 3, max: 20 })
      .withMessage('Partner code must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Partner code can only contain letters, numbers, underscores, and hyphens'),
    
    body('partner_name')
      .notEmpty()
      .withMessage('Partner name is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Partner name must be between 3 and 100 characters'),
    
    body('integration_type')
      .notEmpty()
      .withMessage('Integration type is required')
      .isLength({ max: 50 })
      .withMessage('Integration type must not exceed 50 characters'),
    
    body('fee_percentage')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Fee percentage must be between 0 and 1'),
    
    body('contact_email')
      .optional()
      .isEmail()
      .withMessage('Valid contact email is required'),
    
    body('webhook_url')
      .optional()
      .isURL()
      .withMessage('Valid webhook URL is required')
  ],

  // Product creation validation
  createProduct: [
    body('product_code')
      .notEmpty()
      .withMessage('Product code is required')
      .isLength({ min: 3, max: 20 })
      .withMessage('Product code must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Product code can only contain letters, numbers, underscores, and hyphens'),
    
    body('product_name')
      .notEmpty()
      .withMessage('Product name is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Product name must be between 3 and 100 characters'),
    
    body('category_code')
      .notEmpty()
      .withMessage('Category code is required')
      .isLength({ max: 20 })
      .withMessage('Category code must not exceed 20 characters'),
    
    body('partner_code')
      .notEmpty()
      .withMessage('Partner code is required')
      .isLength({ max: 20 })
      .withMessage('Partner code must not exceed 20 characters'),
    
    body('identifier_type')
      .isIn(['policy_number', 'customer_id', 'reference_number'])
      .withMessage('Invalid identifier type'),
    
    body('allow_partial_payment')
      .optional()
      .isBoolean()
      .withMessage('Allow partial payment must be true or false'),
    
    body('base_premium')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Base premium must be a non-negative number')
  ],

  // IP filter management validation
  addIpFilter: [
    body('ip_address')
      .notEmpty()
      .withMessage('IP address is required')
      .isIP()
      .withMessage('Invalid IP address format'),
    
    body('filter_type')
      .isIn(['whitelist', 'blacklist'])
      .withMessage('Filter type must be "whitelist" or "blacklist"'),
    
    body('description')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Description must not exceed 255 characters')
  ],

  removeIpFilter: [
    param('ipAddress')
      .notEmpty()
      .withMessage('IP address is required')
      .isIP()
      .withMessage('Invalid IP address format')
  ]
};

module.exports = adminValidationRules;