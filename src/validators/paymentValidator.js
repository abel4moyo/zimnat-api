const { body, param } = require('express-validator');

const paymentValidationRules = {
  // Payment processing validation
  processPayment: [
    body('policy_number')
      .notEmpty()
      .withMessage('Policy number is required')
      .isLength({ max: 50 })
      .withMessage('Policy number must not exceed 50 characters'),
    
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    
    body('external_reference')
      .notEmpty()
      .withMessage('External reference is required')
      .isLength({ max: 100 })
      .withMessage('External reference must not exceed 100 characters'),
    
    body('payment_method')
      .isIn(['card', 'bank_transfer', 'mobile_money', 'ecocash', 'onemoney'])
      .withMessage('Invalid payment method'),
    
    body('customer_details')
      .optional()
      .isObject()
      .withMessage('Customer details must be a valid object'),
    
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be a valid object')
  ],

  // Payment status inquiry validation
  getPaymentStatus: [
    param('transactionId')
      .notEmpty()
      .withMessage('Transaction ID is required')
      .isLength({ max: 100 })
      .withMessage('Transaction ID must not exceed 100 characters')
  ],

  // Payment confirmation validation (for webhooks)
  confirmPayment: [
    body('transaction_reference')
      .notEmpty()
      .withMessage('Transaction reference is required'),
    
    body('status')
      .isIn(['success', 'failed', 'pending'])
      .withMessage('Invalid payment status'),
    
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be a valid number'),
    
    body('external_reference')
      .notEmpty()
      .withMessage('External reference is required'),
    
    body('timestamp')
      .isISO8601()
      .withMessage('Valid timestamp is required'),
    
    body('signature')
      .optional()
      .notEmpty()
      .withMessage('Signature cannot be empty if provided')
  ]
};

module.exports = paymentValidationRules;