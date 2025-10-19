// src/routes/authRoutes.js - Using correct fcb_partners table
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Try to load database pool
let pool;
try {
  const db = require('../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for auth routes');
}

// Import AuthService
let AuthService;
try {
  AuthService = require('../services/authService');
  console.log('✅ AuthService loaded successfully');
} catch (error) {
  console.error('❌ Failed to load AuthService:', error.message);
}

// Import logger with fallback
let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.log
  };
}

/**
 * POST /api/v1/auth/login
 * Partner login to get JWT token (using fcb_partners table)
 * NOTE: This route is disabled in favor of ZIMNAT v2.1 authentication in zimnatAuthRoutes.js
 * ZIMNAT v2.1 uses camelCase (apiKey, partnerCode) instead of snake_case
 */
/* DISABLED - Using ZIMNAT v2.1 auth instead
router.post('/api/v1/auth/login', [
  body('partner_code').notEmpty().withMessage('Partner code is required'),
  body('api_key').notEmpty().withMessage('API key is required')
], async (req, res) => {
  try {
    console.log('🔐 Login attempt started');
    console.log('Request body:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { partner_code, api_key } = req.body;

    // Find partner by partner_code using CORRECT table name
    let partner = null;
    
    if (pool) {
      const client = await pool.connect();
      try {
        console.log('🔍 Querying fcb_partners table...');
        const result = await client.query(
          'SELECT * FROM fcb_partners WHERE UPPER(partner_code) = UPPER($1) AND is_active = true',
          [partner_code]
        );
        
        if (result.rows.length > 0) {
          partner = result.rows[0];
          console.log('✅ Partner found in database:', partner.partner_name);
        } else {
          console.log('❌ Partner not found in database:', partner_code);
        }
      } finally {
        client.release();
      }
    } else {
      // Fallback for development (if database not available)
      console.log('⚠️ Database not available, using fallback partners');
      const defaultPartners = {
        'fcb': { 
          id: 1, 
          partner_code: 'fcb', 
          partner_name: 'FCB Bank',
          api_key: 'fcb-api-key-12345',
          integration_type: 'banking',
          is_active: true,
          roles: ['partner']
        },
        'zimnat': { 
          id: 2, 
          partner_code: 'zimnat', 
          partner_name: 'Zimnat Insurance',
          api_key: 'zimnat-api-key-12345',
          integration_type: 'insurance',
          is_active: true,
          roles: ['partner']
        },
        'test': { 
          id: 3, 
          partner_code: 'test', 
          partner_name: 'Test Partner',
          api_key: 'test-api-key-12345',
          integration_type: 'testing',
          is_active: true,
          roles: ['partner', 'admin']
        }
      };
      partner = defaultPartners[partner_code];
    }

    if (!partner || !partner.is_active) {
      logger.warn('Login Failed: Invalid partner code', { 
        partner_code,
        ip: req.ip 
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid partner credentials',
        code: 'INVALID_PARTNER'
      });
    }

    // Verify API key
    let isValidKey = false;
    
    if (partner.api_key_hash) {
      // Use hashed API key verification
      isValidKey = await AuthService.verifyApiKey(api_key, partner.api_key_hash);
      console.log('🔐 Using hashed API key verification');
    } else if (partner.api_key) {
      // Fallback to plain text comparison
      isValidKey = (api_key === partner.api_key);
      console.log('⚠️ Using plain text API key verification');
    }

    if (!isValidKey) {
      logger.warn('Login Failed: Invalid API key', { 
        partner_code,
        ip: req.ip 
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid partner credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT tokens
    const accessToken = AuthService.generateToken(partner);
    const refreshToken = AuthService.generateRefreshToken(partner);

    logger.info('Partner Login Successful', {
      partner_code: partner.partner_code,
      partner_name: partner.partner_name,
      ip: req.ip
    });

    const response = {
      success: true,
      message: 'Authentication successful',
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: '24h',
        partner: {
          code: partner.partner_code,
          name: partner.partner_name,
          type: partner.integration_type,
          id: partner.id
        }
      }
    };

    console.log('✅ Login successful for:', partner.partner_name);
    res.json(response);

  } catch (error) {
    console.error('💥 Login error:', error.message);
    console.error('Stack:', error.stack);
    
    logger.error('Login Error', { 
      error: error.message, 
      stack: error.stack,
      ip: req.ip 
    });
    
    res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR',
      debug: error.message
    });
  }
});
*/ // End of disabled login route

/**
 * POST /api/v1/auth/refresh
 * Refresh JWT token using refresh token
 */
router.post('/api/v1/auth/refresh', [
  body('refresh_token').notEmpty().withMessage('Refresh token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { refresh_token } = req.body;

    // Verify refresh token
    const decoded = AuthService.verifyRefreshToken(refresh_token);
    
    // Get partner data using correct table name
    let partner = null;
    
    if (pool) {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM fcb_partners WHERE UPPER(partner_code) = UPPER($1) AND is_active = true',
          [decoded.sub]
        );
        
        if (result.rows.length > 0) {
          partner = result.rows[0];
        }
      } finally {
        client.release();
      }
    } else {
      // Fallback for development
      const defaultPartners = {
        'fcb': { 
          id: 1, 
          partner_code: 'fcb', 
          partner_name: 'FCB Bank',
          integration_type: 'banking',
          is_active: true,
          roles: ['partner']
        },
        'zimnat': { 
          id: 2, 
          partner_code: 'zimnat', 
          partner_name: 'Zimnat Insurance',
          integration_type: 'insurance',
          is_active: true,
          roles: ['partner']
        }
      };
      partner = defaultPartners[decoded.sub];
    }

    if (!partner || !partner.is_active) {
      logger.warn('Token Refresh Failed: Invalid partner', {
        partner_code: decoded.sub,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new access token
    const newAccessToken = AuthService.generateToken(partner);

    logger.info('Token Refreshed Successfully', {
      partner_code: partner.partner_code,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: '24h',
        partner: {
          code: partner.partner_code,
          name: partner.partner_name,
          type: partner.integration_type
        }
      }
    });

  } catch (error) {
    logger.error('Token Refresh Error', { 
      error: error.message,
      ip: req.ip 
    });
    
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token',
      code: 'REFRESH_TOKEN_ERROR'
    });
  }
});

/**
 * GET /api/v1/auth/verify
 * Verify current JWT token
 * DISABLED - Using ZIMNAT v2.1 verify endpoint in zimnatAuthRoutes.js instead
 */
/* DISABLED - Using ZIMNAT v2.1 auth verify instead
router.get('/api/v1/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
        code: 'MISSING_TOKEN'
      });
    }

    const token = AuthService.extractTokenFromHeader(authHeader);
    const decoded = AuthService.verifyToken(token);

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        partner_code: decoded.sub,
        partner_name: decoded.partner_name,
        roles: decoded.roles,
        expires_at: decoded.exp,
        issued_at: decoded.iat
      }
    });

  } catch (error) {
    logger.warn('Token Verification Failed', {
      error: error.message,
      ip: req.ip
    });

    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
});
*/ // End of disabled verify route

console.log('✅ Auth routes loaded (using fcb_partners table)');
module.exports = router;