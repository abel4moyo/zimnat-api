/**
 * ===================================================================
 * ZIMNAT API v2.1 - Request ID Middleware
 * File: src/middleware/requestIdMiddleware.js
 * ===================================================================
 *
 * Validates and generates X-Request-Id header for request tracking
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const { formatErrorResponse, ERROR_CODES, generateRequestId } = require('../utils/responseFormatter');

/**
 * Middleware to validate or generate X-Request-Id header
 * According to ZIMNAT API v2.1 spec, X-Request-Id is required and must be a unique UUID
 */
function validateRequestId(req, res, next) {
  try {
    let requestId = req.headers['x-request-id'];

    // If X-Request-Id is missing, generate one
    if (!requestId) {
      requestId = generateRequestId();
      req.headers['x-request-id'] = requestId;

      logger.warn('X-Request-Id header missing, generated new ID', {
        requestId,
        ip: req.ip,
        path: req.path,
        method: req.method
      });
    } else {
      // Validate format (should be UUID or custom format)
      // For flexibility, we'll accept any non-empty string
      if (typeof requestId !== 'string' || requestId.trim().length === 0) {
        logger.warn('Invalid X-Request-Id header format', {
          requestId,
          ip: req.ip,
          path: req.path
        });

        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.MISSING_REQUEST_ID,
          'X-Request-Id header must be a non-empty string',
          generateRequestId()
        ));
      }
    }

    // Attach request ID to response header
    res.setHeader('X-Request-Id', requestId);

    // Attach to request object for easy access
    req.requestId = requestId;

    logger.info('Request received', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    next();

  } catch (error) {
    logger.error('Request ID middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path
    });

    return res.status(500).json(formatErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An error occurred while processing request',
      generateRequestId()
    ));
  }
}

/**
 * Middleware to enforce strict UUID format for X-Request-Id
 * Use this for production to ensure compliance with strict UUID requirements
 */
function enforceUUIDRequestId(req, res, next) {
  try {
    let requestId = req.headers['x-request-id'];

    // UUID v4 regex pattern
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!requestId) {
      // Generate UUID v4
      requestId = crypto.randomUUID();
      req.headers['x-request-id'] = requestId;

      logger.warn('X-Request-Id header missing, generated UUID', {
        requestId,
        ip: req.ip,
        path: req.path
      });
    } else if (!uuidV4Regex.test(requestId)) {
      logger.warn('X-Request-Id is not a valid UUID v4', {
        requestId,
        ip: req.ip,
        path: req.path
      });

      return res.status(400).json(formatErrorResponse(
        ERROR_CODES.MISSING_REQUEST_ID,
        'X-Request-Id header must be a valid UUID v4',
        crypto.randomUUID()
      ));
    }

    res.setHeader('X-Request-Id', requestId);
    req.requestId = requestId;

    logger.info('Request received', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    next();

  } catch (error) {
    logger.error('Request ID middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path
    });

    return res.status(500).json(formatErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An error occurred while processing request',
      crypto.randomUUID()
    ));
  }
}

module.exports = {
  validateRequestId,
  enforceUUIDRequestId
};
