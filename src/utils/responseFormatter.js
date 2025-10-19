/**
 * ===================================================================
 * ZIMNAT API v2.1 - Response Formatter Utility
 * File: src/utils/responseFormatter.js
 * ===================================================================
 *
 * Standardizes API responses according to ZIMNAT API v2.1 specification
 */

const crypto = require('crypto');

/**
 * Generate a unique request ID if not provided
 * Format: GW-{timestamp}-{random}
 */
function generateRequestId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `GW-${timestamp}-${random}`;
}

/**
 * Get current ISO 8601 timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Format successful response
 * @param {Object} data - Response data
 * @param {String} requestId - Request ID from header or generated
 * @returns {Object} Formatted response
 */
function formatResponse(data, requestId = null) {
  return {
    success: true,
    data: data,
    meta: {
      requestId: requestId || generateRequestId(),
      generatedAt: getCurrentTimestamp()
    }
  };
}

/**
 * Format error response
 * @param {String} code - Error code
 * @param {String} message - Error message
 * @param {String} requestId - Request ID from header or generated
 * @param {Object} details - Additional error details (optional)
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(code, message, requestId = null, details = null) {
  const response = {
    success: false,
    error: {
      code: code,
      message: message
    },
    meta: {
      requestId: requestId || generateRequestId(),
      generatedAt: getCurrentTimestamp()
    }
  };

  if (details) {
    response.error.details = details;
  }

  return response;
}

/**
 * Format validation error response
 * @param {Array} errors - Array of validation errors
 * @param {String} requestId - Request ID from header or generated
 * @returns {Object} Formatted validation error response
 */
function formatValidationErrorResponse(errors, requestId = null) {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: {
        errors: errors
      }
    },
    meta: {
      requestId: requestId || generateRequestId(),
      generatedAt: getCurrentTimestamp()
    }
  };
}

/**
 * Format paginated response
 * @param {Array} data - Response data array
 * @param {Number} page - Current page number
 * @param {Number} pageSize - Number of items per page
 * @param {Number} total - Total number of items
 * @param {String} requestId - Request ID from header or generated
 * @returns {Object} Formatted paginated response
 */
function formatPaginatedResponse(data, page, pageSize, total, requestId = null) {
  const totalPages = Math.ceil(total / pageSize);

  return {
    success: true,
    data: data,
    pagination: {
      page: page,
      pageSize: pageSize,
      total: total,
      totalPages: totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    },
    meta: {
      requestId: requestId || generateRequestId(),
      generatedAt: getCurrentTimestamp()
    }
  };
}

/**
 * Format payment response with policy and receipt details
 * @param {Object} paymentDetails - Payment transaction details
 * @param {Object} policyDetails - Policy details (optional)
 * @param {Object} receiptDetails - Receipt details (optional)
 * @param {String} requestId - Request ID
 * @returns {Object} Formatted payment response
 */
function formatPaymentResponse(paymentDetails, policyDetails = null, receiptDetails = null, requestId = null) {
  const responseData = {
    paymentDetails: paymentDetails
  };

  if (policyDetails) {
    responseData.policyDetails = policyDetails;
  }

  if (receiptDetails) {
    responseData.receiptDetails = receiptDetails;
  }

  return formatResponse(responseData, requestId);
}

/**
 * Format quote response
 * @param {Object} quoteData - Quote details
 * @param {String} requestId - Request ID
 * @returns {Object} Formatted quote response
 */
function formatQuoteResponse(quoteData, requestId = null) {
  return formatResponse({
    quote: quoteData
  }, requestId);
}

/**
 * Standard error codes
 */
const ERROR_CODES = {
  // Authentication errors (4xx)
  MISSING_API_KEY: 'MISSING_API_KEY',
  MISSING_PARTNER_CODE: 'MISSING_PARTNER_CODE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  REVOKED_TOKEN: 'REVOKED_TOKEN',

  // Request errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_VALUE: 'INVALID_FIELD_VALUE',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  DUPLICATE_REFERENCE: 'DUPLICATE_REFERENCE',
  MISSING_REQUEST_ID: 'MISSING_REQUEST_ID',

  // Resource errors (4xx)
  POLICY_NOT_FOUND: 'POLICY_NOT_FOUND',
  QUOTE_NOT_FOUND: 'QUOTE_NOT_FOUND',
  QUOTE_EXPIRED: 'QUOTE_EXPIRED',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  RECEIPT_NOT_FOUND: 'RECEIPT_NOT_FOUND',

  // Business logic errors (4xx)
  QUOTE_ALREADY_ACCEPTED: 'QUOTE_ALREADY_ACCEPTED',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  REVERSAL_NOT_ALLOWED: 'REVERSAL_NOT_ALLOWED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
};

module.exports = {
  formatResponse,
  formatErrorResponse,
  formatValidationErrorResponse,
  formatPaginatedResponse,
  formatPaymentResponse,
  formatQuoteResponse,
  generateRequestId,
  getCurrentTimestamp,
  ERROR_CODES
};
