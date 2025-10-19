/**
 * ===================================================================
 * ZIMNAT API v2.1 - JWT Authentication Service (RS256)
 * File: src/services/jwtService.js
 * ===================================================================
 *
 * Implements JWT token generation and validation using RS256 algorithm
 * as required by ZIMNAT API Specification v2.1
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const db = require('../db/knex');

class JWTService {

  /**
   * Generate RSA key pair if not exists
   * This should be run once during setup
   */
  static async generateKeyPair() {
    try {
      const keysDir = path.join(__dirname, '../../config/keys');

      // Create keys directory if it doesn't exist
      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
      }

      const privateKeyPath = path.join(keysDir, 'private.pem');
      const publicKeyPath = path.join(keysDir, 'public.pem');

      // Check if keys already exist
      if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
        logger.info('RSA key pair already exists');
        return {
          privateKeyPath,
          publicKeyPath
        };
      }

      // Generate RSA key pair (2048-bit for RS256)
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Write keys to files
      fs.writeFileSync(privateKeyPath, privateKey);
      fs.writeFileSync(publicKeyPath, publicKey);

      logger.info('RSA key pair generated successfully', {
        privateKeyPath,
        publicKeyPath
      });

      return {
        privateKeyPath,
        publicKeyPath
      };
    } catch (error) {
      logger.error('Failed to generate RSA key pair', { error: error.message });
      throw error;
    }
  }

  /**
   * Get private key for signing tokens
   * @returns {String} Private key in PEM format
   */
  static getPrivateKey() {
    try {
      const privateKeyPath = path.join(__dirname, '../../config/keys/private.pem');

      if (!fs.existsSync(privateKeyPath)) {
        throw new Error('Private key not found. Run generateKeyPair() first.');
      }

      return fs.readFileSync(privateKeyPath, 'utf8');
    } catch (error) {
      logger.error('Failed to read private key', { error: error.message });
      throw error;
    }
  }

  /**
   * Get public key for verifying tokens
   * @returns {String} Public key in PEM format
   */
  static getPublicKey() {
    try {
      const publicKeyPath = path.join(__dirname, '../../config/keys/public.pem');

      if (!fs.existsSync(publicKeyPath)) {
        throw new Error('Public key not found. Run generateKeyPair() first.');
      }

      return fs.readFileSync(publicKeyPath, 'utf8');
    } catch (error) {
      logger.error('Failed to read public key', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate JWT access token with RS256
   * @param {Object} partnerData - Partner information
   * @param {String} scope - Token scope (e.g., 'api:read api:write')
   * @returns {Object} Token object with token and expiration
   */
  static async generateAccessToken(partnerData, scope = 'api:all') {
    try {
      const privateKey = this.getPrivateKey();
      const now = Math.floor(Date.now() / 1000);

      // Parse JWT_EXPIRES_IN (supports formats like "24h", "3600", etc.)
      let expiresIn = 3600; // Default: 1 hour
      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '3600';
      if (jwtExpiresIn.endsWith('h')) {
        expiresIn = parseInt(jwtExpiresIn) * 3600;
      } else if (jwtExpiresIn.endsWith('m')) {
        expiresIn = parseInt(jwtExpiresIn) * 60;
      } else if (jwtExpiresIn.endsWith('d')) {
        expiresIn = parseInt(jwtExpiresIn) * 86400;
      } else {
        expiresIn = parseInt(jwtExpiresIn);
      }

      const payload = {
        clientId: partnerData.partner_code,
        scope: scope,
        iss: 'fcb-zimnat-api',
        aud: 'zimnat-api-v2',
        iat: now,
        exp: now + expiresIn,
        jti: crypto.randomUUID()
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256'
      });

      // Hash token for storage
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Store token in database
      await db('zimnat_api_tokens').insert({
        partner_id: partnerData.partner_id,
        token_hash: tokenHash,
        api_key_hash: partnerData.api_key_hash,
        scope: scope,
        expires_at: new Date((now + expiresIn) * 1000),
        created_at: new Date(),
        updated_at: new Date()
      });

      logger.info('Access token generated', {
        partner_code: partnerData.partner_code,
        scope: scope,
        expires_in: expiresIn,
        jti: payload.jti
      });

      return {
        access_token: token,
        token_type: 'Bearer',
        expires_in: expiresIn,
        scope: scope
      };

    } catch (error) {
      logger.error('Failed to generate access token', {
        error: error.message,
        partner_code: partnerData?.partner_code
      });
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Verify JWT token
   * @param {String} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  static async verifyToken(token) {
    try {
      const publicKey = this.getPublicKey();

      // Verify token signature and expiration
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: 'fcb-zimnat-api',
        audience: 'zimnat-api-v2'
      });

      // Check if token is revoked
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const tokenRecord = await db('zimnat_api_tokens')
        .where({ token_hash: tokenHash })
        .first();

      if (!tokenRecord) {
        throw new Error('Token not found in database');
      }

      if (tokenRecord.revoked) {
        throw new Error('Token has been revoked');
      }

      // Update last used timestamp
      await db('zimnat_api_tokens')
        .where({ token_hash: tokenHash })
        .update({
          last_used_at: new Date()
        });

      return decoded;

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw error;
      }
    }
  }

  /**
   * Revoke a token
   * @param {String} token - Token to revoke
   */
  static async revokeToken(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      await db('zimnat_api_tokens')
        .where({ token_hash: tokenHash })
        .update({
          revoked: true,
          revoked_at: new Date()
        });

      logger.info('Token revoked', { tokenHash });

    } catch (error) {
      logger.error('Failed to revoke token', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  static async cleanupExpiredTokens() {
    try {
      const deletedCount = await db('zimnat_api_tokens')
        .where('expires_at', '<', new Date())
        .del();

      logger.info('Expired tokens cleaned up', { count: deletedCount });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   * @param {String} authHeader - Authorization header value
   * @returns {String} JWT token
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format. Expected: Bearer <token>');
    }
    return authHeader.split(' ')[1];
  }

  /**
   * Validate API key and partner code
   * @param {String} apiKey - API key from request
   * @param {String} partnerCode - Partner code from request
   * @returns {Object} Partner data if valid
   */
  static async validateCredentials(apiKey, partnerCode) {
    try {
      // Hash the API key for comparison
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Find partner by partner code and API key (case-insensitive)
      const partner = await db('fcb_partners')
        .whereRaw('UPPER(partner_code) = UPPER(?)', [partnerCode])
        .where({ is_active: true })
        .first();

      if (!partner) {
        throw new Error('Invalid partner credentials');
      }

      // Compare API key hash
      const storedApiKeyHash = crypto.createHash('sha256').update(partner.api_key).digest('hex');

      if (apiKeyHash !== storedApiKeyHash) {
        throw new Error('Invalid API key');
      }

      return {
        partner_id: partner.partner_id,
        partner_code: partner.partner_code,
        partner_name: partner.partner_name,
        api_key_hash: apiKeyHash
      };

    } catch (error) {
      logger.error('Credential validation failed', {
        error: error.message,
        partner_code: partnerCode
      });
      throw error;
    }
  }
}

module.exports = JWTService;
