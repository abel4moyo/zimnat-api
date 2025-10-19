const { body, query, param } = require('express-validator');

const transactionValidationRules = {
  // Transaction search/pagination validation
  searchTransactions: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('status')
      .optional()
      .isIn(['pending', 'completed', 'failed', 'cancelled'])
      .withMessage('Invalid transaction status'),
    
    query('date_from')
      .optional()
      .isISO8601()
      .withMessage('Valid date_from is required (YYYY-MM-DD format)'),
    
    query('date_to')
      .optional()
      .isISO8601()
      .withMessage('Valid date_to is required (YYYY-MM-DD format)')
  ],

  // Transaction creation validation
  createTransaction: [
    body('policy_id')
      .isInt({ min: 1 })
      .withMessage('Valid policy ID is required'),
    
    body('customer_id')
      .isInt({ min: 1 })
      .withMessage('Valid customer ID is required'),
    
    body('transaction_type')
      .isIn(['payment', 'refund', 'adjustment'])
      .withMessage('Invalid transaction type'),
    
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    
    body('payment_method')
      .optional()
      .isIn(['card', 'bank_transfer', 'mobile_money', 'cash'])
      .withMessage('Invalid payment method'),
    
    body('external_reference')
      .optional()
      .isLength({ max: 100 })
      .withMessage('External reference must not exceed 100 characters'),
    
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be a valid object')
  ],

  // Transaction status update validation
  updateTransactionStatus: [
    param('transactionId')
      .notEmpty()
      .withMessage('Transaction ID is required'),
    
    body('status')
      .isIn(['pending', 'completed', 'failed', 'cancelled'])
      .withMessage('Invalid transaction status'),
    
    body('reason')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Reason must not exceed 255 characters')
  ]
};

module.exports = transactionValidationRules;