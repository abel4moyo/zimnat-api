// =============================================================================
// Response Helper Utility
// File: src/utils/responseHelper.js
// =============================================================================

/**
 * Standardized response helper for consistent API responses
 * Provides success and error response formatters
 */

// =============================================================================
// Response Helper Utility
// File: src/utils/responseHelper.js
// =============================================================================

/**
 * Standardized response helper for consistent API responses
 * Provides success and error response formatters
 */

/**
 * Generate standardized success response
 * @param {*} data - Response data
 * @param {string} message - Success message (optional)
 * @param {number} status - HTTP status code (default: 200)
 * @returns {Object} Formatted success response
 */
function successResponse(data, message = 'Operation completed successfully', status = 200) {
  return {
    success: true,
    status: 'SUCCESS',
    message,
    data,
    timestamp: new Date().toISOString(),
    statusCode: status
  };
}

/**
 * Generate standardized error response
 * @param {number} status - HTTP status code
 * @param {string} code - Error code identifier
 * @param {string} message - Error message
 * @param {*} details - Additional error details (optional)
 * @returns {Object} Formatted error response
 */
function errorResponse(status = 500, code = 'INTERNAL_ERROR', message = 'An error occurred', details = null) {
  const response = {
    success: false,
    status: 'ERROR',
    error: {
      code,
      message,
      statusCode: status
    },
    timestamp: new Date().toISOString()
  };

  // Add details if provided
  if (details) {
    response.error.details = details;
  }

  // Add reconciliation flag for certain error types
  if (status >= 500 || ['PAYMENT_FAILED', 'POLICY_CREATION_FAILED', 'DATABASE_ERROR'].includes(code)) {
    response.reconciliationRequired = true;
  }

  return response;
}

/**
 * Generate validation error response
 * @param {Array} validationErrors - Array of validation error objects
 * @param {string} message - Custom message (optional)
 * @returns {Object} Formatted validation error response
 */
function validationErrorResponse(validationErrors, message = 'Validation failed') {
  return errorResponse(400, 'VALIDATION_ERROR', message, {
    validationErrors,
    fields: validationErrors.map(err => err.field || err.param).filter(Boolean)
  });
}

/**
 * Generate not found error response
 * @param {string} resource - Resource that was not found
 * @param {string} identifier - Resource identifier
 * @returns {Object} Formatted not found error response
 */
function notFoundResponse(resource = 'Resource', identifier = null) {
  const message = identifier 
    ? `${resource} with identifier '${identifier}' not found`
    : `${resource} not found`;
    
  return errorResponse(404, 'NOT_FOUND', message);
}

/**
 * Generate unauthorized error response
 * @param {string} message - Custom message (optional)
 * @returns {Object} Formatted unauthorized error response
 */
function unauthorizedResponse(message = 'Authentication required') {
  return errorResponse(401, 'UNAUTHORIZED', message);
}

/**
 * Generate forbidden error response
 * @param {string} message - Custom message (optional)
 * @returns {Object} Formatted forbidden error response
 */
function forbiddenResponse(message = 'Access denied') {
  return errorResponse(403, 'FORBIDDEN', message);
}

/**
 * Generate rate limit error response
 * @param {string} message - Custom message (optional)
 * @returns {Object} Formatted rate limit error response
 */
function rateLimitResponse(message = 'Rate limit exceeded') {
  return errorResponse(429, 'RATE_LIMIT_EXCEEDED', message);
}

/**
 * Generate paginated response for list endpoints
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination information
 * @param {string} message - Success message (optional)
 * @returns {Object} Formatted paginated response
 */
function paginatedResponse(data, pagination, message = 'Data retrieved successfully') {
  return successResponse({
    items: data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || data.length,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / (pagination.limit || 10)),
      hasNext: pagination.hasNext || false,
      hasPrev: pagination.hasPrev || false
    }
  }, message);
}

/**
 * Generate quote response with expiry information
 * @param {Object} quoteData - Quote data
 * @param {string} message - Success message (optional)
 * @returns {Object} Formatted quote response
 */
function quoteResponse(quoteData, message = 'Quote generated successfully') {
  const now = new Date();
  const expiresAt = new Date(quoteData.expiresAt || quoteData.expires_at);
  const timeToExpiry = Math.max(0, expiresAt.getTime() - now.getTime());
  
  return successResponse({
    ...quoteData,
    expiryInfo: {
      expiresAt: expiresAt.toISOString(),
      timeToExpiryMs: timeToExpiry,
      timeToExpiryHours: Math.floor(timeToExpiry / (1000 * 60 * 60)),
      isExpired: timeToExpiry <= 0,
      isExpiringSoon: timeToExpiry <= (6 * 60 * 60 * 1000) // 6 hours
    }
  }, message);
}

/**
 * Generate policy response with status information
 * @param {Object} policyData - Policy data
 * @param {string} message - Success message (optional)
 * @returns {Object} Formatted policy response
 */
function policyResponse(policyData, message = 'Policy operation completed successfully') {
  const now = new Date();
  const effectiveDate = new Date(policyData.effectiveDate || policyData.effective_date);
  const expiryDate = new Date(policyData.expiryDate || policyData.expiry_date);
  
  return successResponse({
    ...policyData,
    policyStatus: {
      isActive: policyData.status === 'ACTIVE',
      isEffective: now >= effectiveDate,
      isExpired: now > expiryDate,
      daysToExpiry: Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      effectiveDate: effectiveDate.toISOString(),
      expiryDate: expiryDate.toISOString()
    }
  }, message);
}

/**
 * Generate payment response
 * @param {Object} paymentData - Payment data
 * @param {string} message - Success message (optional)
 * @returns {Object} Formatted payment response
 */
function paymentResponse(paymentData, message = 'Payment processed successfully') {
  return successResponse({
    ...paymentData,
    paymentInfo: {
      isSuccessful: paymentData.status === 'SUCCESS',
      processedAt: paymentData.processedAt || new Date().toISOString(),
      canRetry: ['FAILED', 'CANCELLED'].includes(paymentData.status)
    }
  }, message);
}

/**
 * Generate health check response
 * @param {Object} healthData - Health check data
 * @param {boolean} isHealthy - Whether the service is healthy
 * @returns {Object} Formatted health check response
 */
function healthResponse(healthData, isHealthy = true) {
  const status = isHealthy ? 'healthy' : 'unhealthy';
  const httpStatus = isHealthy ? 200 : 503;
  
  return {
    success: isHealthy,
    status: status.toUpperCase(),
    message: `Service is ${status}`,
    data: {
      ...healthData,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    },
    timestamp: new Date().toISOString(),
    statusCode: httpStatus
  };
}

/**
 * Generate ICE Cash compatible response
 * @param {Object} data - Response data
 * @param {string} partnerReference - Partner reference
 * @param {string} version - API version
 * @param {boolean} success - Whether operation was successful
 * @returns {Object} ICE Cash formatted response
 */
function iceCashResponse(data, partnerReference, version = '2.1', success = true) {
  return {
    PartnerReference: partnerReference,
    Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
    Version: version,
    Response: {
      Result: success ? '1' : '0',
      Message: success ? 'Success' : 'Error',
      ...data
    }
  };
}

/**
 * Express middleware to handle error objects
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(error, req, res, next) {
  // Log the error
  const logger = require('./logger');
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle known error types
  if (error.status && error.code) {
    return res.status(error.status).json(errorResponse(error.status, error.code, error.message));
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json(validationErrorResponse(error.details || []));
  }

  // Handle database errors
  if (error.code === 'ECONNREFUSED' || error.code === '23505' || error.routine) {
    return res.status(500).json(errorResponse(500, 'DATABASE_ERROR', 'Database operation failed'));
  }

  // Default server error
  res.status(500).json(errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred'));
}

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  rateLimitResponse,
  paginatedResponse,
  quoteResponse,
  policyResponse,
  paymentResponse,
  healthResponse,
  iceCashResponse,
  errorHandler
};