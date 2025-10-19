// src/services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require('../utils/logger');

class AuthService {
  
  /**
   * Extract token from Authorization header
   * @param {String} authHeader - Authorization header value
   * @returns {String} JWT token
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }
    return authHeader.split(' ')[1];
  }

  /**
   * Generate JWT token for partners (matches your working pattern)
   * @param {Object} partnerData - Partner information
   * @returns {String} JWT token
   */
  static generateToken(partnerData) {
    try {
      const jti = crypto.randomUUID();
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const now = Math.floor(Date.now() / 1000);
      
      // Use the EXACT same payload structure as your working JWT
      const payload = {
        sub: partnerData.partner_code, // Subject (partner identifier)
        iss: 'fcb-zimnat-api', // Issuer
        aud: 'fcb-partners', // Audience
        iat: now, // Issued at
        exp: now + (24 * 60 * 60), // 24 hours expiration
        roles: partnerData.roles || ['partner'],
        partner_code: partnerData.partner_code, // Add this for compatibility
        partner_name: partnerData.partner_name,
        integration_type: partnerData.integration_type,
        jti: jti, // JWT ID for blacklisting if needed
        timestamp: timestamp
      };

      // Use the EXACT same secret as your environment
      const secret = process.env.JWT_SECRET || 'fcb-zimnat-super-secret-key-change-in-production';
      
      const token = jwt.sign(payload, secret, {
        algorithm: 'HS256'
      });

      logger.info('JWT Generated', {
        partner_code: partnerData.partner_code,
        expires_in: '24h',
        jti: jti,
        timestamp: timestamp
      });

      return token;
      
    } catch (error) {
      logger.error('JWT Generation Error', { 
        error: error.message, 
        stack: error.stack,
        partner_code: partnerData?.partner_code 
      });
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Generate refresh token
   * @param {Object} partnerData - Partner information
   * @returns {String} Refresh token
   */
  static generateRefreshToken(partnerData) {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      const payload = {
        sub: partnerData.partner_code,
        iss: 'fcb-zimnat-api',
        aud: 'fcb-partners',
        iat: now,
        exp: now + (7 * 24 * 60 * 60), // 7 days
        type: 'refresh',
        jti: crypto.randomUUID()
      };

      const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fcb-zimnat-refresh-secret-key';
      
      return jwt.sign(payload, refreshSecret, {
        algorithm: 'HS256'
      });
      
    } catch (error) {
      logger.error('Refresh Token Generation Error', { 
        error: error.message,
        partner_code: partnerData?.partner_code 
      });
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify JWT token with enhanced validation and debugging
   * @param {String} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyToken(token) {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Token is required and must be a string');
      }

      // Use the EXACT same secret as generation
      const secret = process.env.JWT_SECRET || 'fcb-zimnat-super-secret-key-change-in-production';
      
      console.log('🔍 JWT Verification Debug:', {
        secretLength: secret.length,
        secretPrefix: secret.substring(0, 15) + '...',
        tokenPrefix: token.substring(0, 30) + '...'
      });
      
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: 'fcb-zimnat-api',
        audience: 'fcb-partners'
      });

      // Additional validation
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp < now) {
        const expiredBy = now - decoded.exp;
        throw new Error(`Token expired ${expiredBy} seconds ago`);
      }

      if (!decoded.sub || !decoded.roles) {
        throw new Error('Invalid token structure - missing sub or roles');
      }

      logger.debug('JWT Verified', {
        partner_code: decoded.sub,
        roles: decoded.roles,
        jti: decoded.jti,
        timestamp: decoded.timestamp,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      });

      return decoded;
      
    } catch (error) {
      // Enhanced error logging for debugging
      console.log('❌ JWT Verification Error Details:', {
        errorMessage: error.message,
        errorName: error.name,
        tokenProvided: !!token,
        tokenLength: token ? token.length : 0,
        secretSet: !!process.env.JWT_SECRET
      });

      logger.warn('JWT Verification Failed', { 
        error: error.message,
        errorName: error.name,
        token_prefix: token ? token.substring(0, 20) + '...' : 'none'
      });
      
      throw error;
    }
  }

  /**
   * Verify refresh token
   * @param {String} refreshToken - Refresh token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyRefreshToken(refreshToken) {
    try {
      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new Error('Refresh token is required and must be a string');
      }

      const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fcb-zimnat-refresh-secret-key';
      
      const decoded = jwt.verify(refreshToken, refreshSecret, {
        algorithms: ['HS256'],
        issuer: 'fcb-zimnat-api',
        audience: 'fcb-partners'
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }

      return decoded;
      
    } catch (error) {
      logger.warn('Refresh Token Verification Failed', { 
        error: error.message,
        token_prefix: refreshToken ? refreshToken.substring(0, 20) + '...' : 'none'
      });
      throw error;
    }
  }

  /**
   * Generate complete token response (access + refresh)
   * @param {Object} partnerData - Partner information
   * @returns {Object} Complete token response
   */
  static generateTokens(partnerData) {
    try {
      const accessToken = this.generateToken(partnerData);
      const refreshToken = this.generateRefreshToken(partnerData);
      
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: '24h',
        partner: {
          code: partnerData.partner_code,
          name: partnerData.partner_name,
          type: partnerData.integration_type,
          id: partnerData.id
        }
      };
      
    } catch (error) {
      logger.error('Token Generation Error', { 
        error: error.message,
        partner_code: partnerData?.partner_code 
      });
      throw new Error('Failed to generate tokens');
    }
  }

  /**
   * Hash password for secure storage
   * @param {String} password - Plain text password
   * @returns {String} Hashed password
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   * @param {String} password - Plain text password
   * @param {String} hash - Hashed password
   * @returns {Boolean} Password match result
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate secure API key
   * @returns {String} New API key
   */
  static generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate API key format
   * @param {String} apiKey - API key to validate
   * @returns {Boolean} Validation result
   */
  static isValidApiKey(apiKey) {
    return typeof apiKey === 'string' && apiKey.length >= 16;
  }
}

module.exports = AuthService;