/**
 * ===================================================================
 * ZIMNAT API v2.1 - Authentication Controller
 * File: src/controllers/zimnatAuthController.js
 * ===================================================================
 *
 * Handles JWT authentication for ZIMNAT API v2.1
 * Endpoint: POST /api/v1/auth/login
 */

const JWTService = require('../services/jwtService');
const logger = require('../utils/logger');
const { formatResponse, formatErrorResponse } = require('../utils/responseFormatter');

class ZimnatAuthController {

  /**
   * POST /api/v1/auth/login
   * Generate JWT access token using API key and partner code
   */
  static async login(req, res, next) {
    try {
      const { apiKey, partnerCode } = req.body;
      const requestId = req.headers['x-request-id'];

      // Validate required fields
      if (!apiKey) {
        return res.status(400).json(formatErrorResponse(
          'MISSING_API_KEY',
          'API key is required',
          requestId
        ));
      }

      if (!partnerCode) {
        return res.status(400).json(formatErrorResponse(
          'MISSING_PARTNER_CODE',
          'Partner code is required',
          requestId
        ));
      }

      // Validate credentials
      let partnerData;
      try {
        partnerData = await JWTService.validateCredentials(apiKey, partnerCode);
      } catch (error) {
        logger.warn('Authentication failed - Invalid credentials', {
          partnerCode,
          ip: req.ip,
          requestId,
          error: error.message
        });

        return res.status(401).json(formatErrorResponse(
          'INVALID_CREDENTIALS',
          'Invalid API key or partner code',
          requestId
        ));
      }

      // Generate JWT token
      const tokenData = await JWTService.generateAccessToken(partnerData);

      logger.info('Authentication successful', {
        partner_code: partnerData.partner_code,
        partner_name: partnerData.partner_name,
        ip: req.ip,
        requestId,
        expires_in: tokenData.expires_in
      });

      // Return token in ZIMNAT API v2.1 format
      return res.status(200).json(formatResponse({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope
      }, requestId));

    } catch (error) {
      logger.error('Authentication error', {
        error: error.message,
        stack: error.stack,
        partnerCode: req.body.partnerCode,
        ip: req.ip,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        'INTERNAL_ERROR',
        'An error occurred during authentication',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * POST /api/v1/auth/logout (optional - revokes token)
   * Revoke current access token
   */
  static async logout(req, res, next) {
    try {
      const requestId = req.headers['x-request-id'];
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json(formatErrorResponse(
          'MISSING_TOKEN',
          'Authorization header is required',
          requestId
        ));
      }

      try {
        const token = JWTService.extractTokenFromHeader(authHeader);
        await JWTService.revokeToken(token);

        logger.info('Token revoked successfully', {
          requestId,
          ip: req.ip
        });

        return res.status(200).json(formatResponse({
          message: 'Logout successful'
        }, requestId));

      } catch (error) {
        logger.warn('Logout failed', {
          error: error.message,
          requestId,
          ip: req.ip
        });

        return res.status(401).json(formatErrorResponse(
          'INVALID_TOKEN',
          error.message,
          requestId
        ));
      }

    } catch (error) {
      logger.error('Logout error', {
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        'INTERNAL_ERROR',
        'An error occurred during logout',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * GET /api/v1/auth/verify (optional - verifies token validity)
   * Verify if the current token is valid
   * Note: The validateJWT middleware has already verified the token
   */
  static async verify(req, res, next) {
    try {
      const requestId = req.headers['x-request-id'];

      // Token has already been validated by middleware
      // req.user contains the decoded token
      return res.status(200).json(formatResponse({
        valid: true,
        clientId: req.user.clientId,
        scope: req.user.scope,
        expires_at: req.user.exp
      }, requestId));

    } catch (error) {
      logger.error('Token verification error', {
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        'INTERNAL_ERROR',
        'An error occurred during token verification',
        req.headers['x-request-id']
      ));
    }
  }
}

module.exports = ZimnatAuthController;
