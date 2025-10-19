


// ===================================================================
// IMPROVED ERROR HANDLING MIDDLEWARE
// File: src/middleware/errorHandler.js
// ===================================================================

const logger = require('../utils/logger');

/**
 * Global error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  logger.error('Global Error Handler', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query
  });

  // Default error response
  let statusCode = error.status || error.statusCode || 500;
  let errorResponse = {
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.code = 'VALIDATION_ERROR';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse.code = 'UNAUTHORIZED';
  } else if (error.message && error.message.includes('not found')) {
    statusCode = 404;
    errorResponse.code = 'NOT_FOUND';
  }

  // Add ICE Cash specific fields for ICE Cash API routes
  if (req.path.includes('/api/icecash/') && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    errorResponse.PartnerReference = req.body?.PartnerReference || '';
    errorResponse.Date = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    errorResponse.Version = req.body?.Version || '2.1';
    errorResponse.Result = 0;
    errorResponse.Message = error.message || 'Internal server error';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.error = 'Internal server error';
    delete errorResponse.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
