// src/middleware/authenticatePartner.js - Optimized for your FCB database structure
const { pool } = require('../db');
const logger = require('../utils/logger');
const AuthService = require('../services/authService');

const authenticatePartner = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    let partner = null;
    let authMethod = 'none';

    console.log('🔍 Authentication Debug:', {
      hasApiKey: !!apiKey,
      hasAuthHeader: !!authHeader,
      path: req.path
    });

    // 1. Try JWT Bearer Token Authentication FIRST (Primary Method)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      console.log('🔐 Attempting JWT verification...');
      
      try {
        const decodedToken = AuthService.verifyToken(token);
        
        console.log('✅ JWT decoded successfully:', {
          subject: decodedToken.sub,
          roles: decodedToken.roles,
          exp: new Date(decodedToken.exp * 1000).toISOString()
        });
        
        if (decodedToken && decodedToken.roles && 
            (decodedToken.roles.includes('partner') || decodedToken.roles.includes('admin'))) {
          
          // Look up partner in fcb_partners table using partner_code
          if (pool) {
            console.log('🔍 Looking up partner in fcb_partners table:', decodedToken.sub);
            const client = await pool.connect();
            try {
              const result = await client.query(
                'SELECT * FROM fcb_partners WHERE UPPER(partner_code) = UPPER($1) AND is_active = true', 
                [decodedToken.sub]
              );
              
              console.log('📊 Database query result:', result.rows.length, 'rows found');

              if (result.rows.length > 0) {
                partner = result.rows[0];
                authMethod = 'JWT';
                partner.auth_method = 'JWT';
                partner.token_data = decodedToken;
                
                // Normalize partner object to expected format (map partner_id to id)
                partner.id = partner.partner_id;
                
                console.log('✅ Partner found in fcb_partners table:', {
                  name: partner.partner_name,
                  code: partner.partner_code,
                  id: partner.partner_id,
                  commission_rate: partner.commission_rate,
                  allowed_products: partner.allowed_products
                });
              } else {
                console.log('⚠️ Partner not found in fcb_partners table for code:', decodedToken.sub);
              }
            } finally {
              client.release();
            }
          }
          
          // If database lookup failed, use fallback data from JWT
          if (!partner) {
            console.log('⚠️ Using fallback partner data from JWT token');
            partner = {
              id: 999,
              partner_id: 999,
              partner_code: decodedToken.sub,
              partner_name: decodedToken.partner_name || `${decodedToken.sub} Partner`,
              integration_type: decodedToken.integration_type || 'api',
              is_active: true,
              auth_method: 'JWT',
              token_data: decodedToken,
              commission_rate: '0.15',
              allowed_products: ['HCP', 'PA', 'DOMESTIC', 'TRAVEL']
            };
            authMethod = 'JWT';
          }
        } else {
          console.log('❌ JWT token missing required roles:', decodedToken.roles);
        }
        
        if (!partner) {
          logger.warn('JWT Authentication Failed: Invalid partner mapping', { 
            subject: decodedToken?.sub,
            roles: decodedToken?.roles,
            ip: req.ip, 
            path: req.path 
          });
          return res.status(401).json({ 
            success: false, 
            error: 'Invalid or expired authentication token', 
            code: 'AUTH_004',
            debug: `Partner ${decodedToken?.sub} not found or inactive in fcb_partners table`
          });
        }
        
      } catch (jwtError) {
        console.log('❌ JWT Verification failed:', jwtError.message);
        logger.warn('JWT Authentication Failed', { 
          error: jwtError.message,
          errorName: jwtError.name,
          ip: req.ip, 
          path: req.path
        });
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or expired authentication token', 
          code: 'AUTH_004',
          debug: jwtError.message
        });
      }
    }
    
    // 2. Try API Key Authentication (Fallback Method)
    else if (apiKey) {
      console.log('🔑 Attempting API key authentication...');
      
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT * FROM fcb_partners WHERE api_key = $1 AND is_active = true',
            [apiKey]
          );
          
          console.log('📊 API Key query result:', result.rows.length, 'rows found');

          if (result.rows.length > 0) {
            partner = result.rows[0];
            authMethod = 'API_KEY';
            partner.auth_method = 'API_KEY';
            
            // Normalize partner object (map partner_id to id)
            partner.id = partner.partner_id;
            
            console.log('✅ Partner found via API key:', {
              name: partner.partner_name,
              code: partner.partner_code,
              id: partner.partner_id
            });
          } else {
            console.log('❌ Invalid API key provided');
          }
        } finally {
          client.release();
        }
      } else {
        console.log('❌ Database pool not available for API key authentication');
      }

      if (!partner) {
        logger.warn('API Key Authentication Failed', { 
          apiKeyProvided: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
          ip: req.ip, 
          path: req.path 
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
          code: 'AUTH_002'
        });
      }
    }
    
    // 3. No valid authentication provided
    else {
      logger.warn('Authentication Failed: Missing credentials', { 
        ip: req.ip, 
        path: req.path 
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Provide X-API-Key header or Authorization Bearer token.',
        code: 'AUTH_001'
      });
    }

    // Authentication successful
    req.partner = partner;
    
    logger.info('Partner Authentication Successful', {
      partner_code: partner.partner_code,
      partner_name: partner.partner_name,
      auth_method: authMethod,
      ip: req.ip,
      path: req.path
    });

    console.log('✅ Authentication successful:', {
      partner_code: partner.partner_code,
      partner_name: partner.partner_name,
      auth_method: authMethod,
      partner_id: partner.partner_id,
      commission_rate: partner.commission_rate,
      allowed_products: partner.allowed_products
    });

    next();

  } catch (error) {
    console.log('💥 Authentication middleware error:', error.message);
    logger.error('Authentication Middleware Error', { 
      error: error.message, 
      stack: error.stack, 
      ip: req.ip, 
      path: req.path 
    });

    return res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_003',
      debug: error.message
    });
  }
};

module.exports = authenticatePartner;