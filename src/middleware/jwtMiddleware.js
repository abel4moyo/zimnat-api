/**
 * ===================================================================
 * ZIMNAT API v2.1 - JWT Authentication Middleware
 * File: src/middleware/jwtMiddleware.js
 * ===================================================================
 *
 * Validates JWT tokens for protected endpoints
 */

const JWTService = require('../services/jwtService');
const logger = require('../utils/logger');
const { formatErrorResponse, ERROR_CODES } = require('../utils/responseFormatter');

/**
 * Middleware to validate JWT token
 * Checks Authorization header for Bearer token
 * Verifies token signature and expiration
 * Attaches decoded token to req.user
 */
async function validateJWT(req, res, next) {
  try {
    const requestId = req.headers['x-request-id'];
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      logger.warn('Missing Authorization header', {
        requestId,
        ip: req.ip,
        path: req.path
      });

      return res.status(401).json(formatErrorResponse(
        ERROR_CODES.MISSING_TOKEN,
        'Authorization header is required',
        requestId
      ));
    }

    // Extract token from header
    let token;
    try {
      token = JWTService.extractTokenFromHeader(authHeader);
    } catch (error) {
      logger.warn('Invalid Authorization header format', {
        requestId,
        ip: req.ip,
        path: req.path,
        error: error.message
      });

      return res.status(401).json(formatErrorResponse(
        ERROR_CODES.INVALID_TOKEN,
        'Invalid authorization header format. Expected: Bearer <token>',
        requestId
      ));
    }

    // Verify token
    try {
      const decoded = await JWTService.verifyToken(token);

      // Attach decoded token to request object
      req.user = decoded;
      req.token = token;

      logger.info('JWT validated successfully', {
        requestId,
        clientId: decoded.clientId,
        scope: decoded.scope,
        path: req.path
      });

      next();

    } catch (error) {
      logger.warn('JWT validation failed', {
        requestId,
        ip: req.ip,
        path: req.path,
        error: error.message
      });

      let errorCode = ERROR_CODES.INVALID_TOKEN;
      let errorMessage = error.message;

      if (error.message.includes('expired')) {
        errorCode = ERROR_CODES.EXPIRED_TOKEN;
      } else if (error.message.includes('revoked')) {
        errorCode = ERROR_CODES.REVOKED_TOKEN;
      }

      return res.status(401).json(formatErrorResponse(
        errorCode,
        errorMessage,
        requestId
      ));
    }

  } catch (error) {
    logger.error('JWT middleware error', {
      error: error.message,
      stack: error.stack,
      requestId: req.headers['x-request-id'],
      path: req.path
    });

    return res.status(500).json(formatErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An error occurred during authentication',
      req.headers['x-request-id']
    ));
  }
}

/**
 * Optional middleware to validate JWT but allow request to proceed if no token
 * Useful for endpoints that work differently for authenticated vs unauthenticated users
 */
async function optionalJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, proceed without authentication
      req.user = null;
      return next();
    }

    // Token provided, validate it
    try {
      const token = JWTService.extractTokenFromHeader(authHeader);
      const decoded = await JWTService.verifyToken(token);

      req.user = decoded;
      req.token = token;

      next();

    } catch (error) {
      // Invalid token, but don't block the request
      req.user = null;
      next();
    }

  } catch (error) {
    logger.error('Optional JWT middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path
    });

    req.user = null;
    next();
  }
}

/**
 * Middleware to check if user has specific scope
 * @param {String} requiredScope - Required scope (e.g., 'api:write')
 */
function requireScope(requiredScope) {
  return (req, res, next) => {
    const requestId = req.headers['x-request-id'];

    if (!req.user) {
      return res.status(401).json(formatErrorResponse(
        ERROR_CODES.MISSING_TOKEN,
        'Authentication required',
        requestId
      ));
    }

    const userScopes = req.user.scope ? req.user.scope.split(' ') : [];

    if (!userScopes.includes(requiredScope) && !userScopes.includes('api:all')) {
      logger.warn('Insufficient scope', {
        requestId,
        clientId: req.user.clientId,
        userScopes,
        requiredScope,
        path: req.path
      });

      return res.status(403).json(formatErrorResponse(
        'INSUFFICIENT_SCOPE',
        `This endpoint requires '${requiredScope}' scope`,
        requestId
      ));
    }

    next();
  };
}

module.exports = {
  validateJWT,
  optionalJWT,
  requireScope
};
