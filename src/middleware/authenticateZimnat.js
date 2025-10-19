


const logger = require('../utils/logger');

const authenticateZimnat = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];
    const zimnatApiKey = req.headers['x-zimnat-api-key'];

    let isAuthenticated = false;
    let authMethod = 'none';

    // Check Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Simple token validation (enhance with JWT verification)
      if (token && token.length > 10) {
        isAuthenticated = true;
        authMethod = 'bearer';
        req.zimnat = {
          authenticated: true,
          user: 'zimnat_user',
          authMethod: 'bearer',
          token: token
        };
      }
    }

    // Check X-API-Key
    if (!isAuthenticated && apiKey) {
      // Check against known Zimnat API keys
      const validZimnatKeys = [
        process.env.ZIMNAT_API_KEY,
        'zimnat-api-key-12345', // Default for development
        'zimnat-production-key' // Example production key
      ].filter(Boolean);

      if (validZimnatKeys.includes(apiKey)) {
        isAuthenticated = true;
        authMethod = 'api_key';
        req.zimnat = {
          authenticated: true,
          user: 'zimnat_api_user',
          authMethod: 'api_key',
          apiKey: apiKey
        };
      }
    }

    // Check X-Zimnat-API-Key (Zimnat specific header)
    if (!isAuthenticated && zimnatApiKey) {
      const validZimnatSpecificKeys = [
        'zimnat-specific-key-12345',
        process.env.ZIMNAT_SPECIFIC_API_KEY
      ].filter(Boolean);

      if (validZimnatSpecificKeys.includes(zimnatApiKey)) {
        isAuthenticated = true;
        authMethod = 'zimnat_specific';
        req.zimnat = {
          authenticated: true,
          user: 'zimnat_specific_user',
          authMethod: 'zimnat_specific',
          apiKey: zimnatApiKey
        };
      }
    }

    if (!isAuthenticated) {
      logger.warn('Zimnat authentication failed: Invalid or missing credentials', { 
        ip: req.ip, 
        path: req.path,
        hasAuthHeader: !!authHeader,
        hasApiKey: !!apiKey,
        hasZimnatKey: !!zimnatApiKey
      });

      return res.status(401).json({
        status: 'ERROR',
        errorCode: 'AUTH_REQUIRED',
        errorMessage: 'Authentication required. Provide Authorization Bearer token, X-API-Key, or X-Zimnat-API-Key header.',
        hint: 'Use one of: Authorization: Bearer <token>, X-API-Key: <key>, or X-Zimnat-API-Key: <key>'
      });
    }

    logger.info('Zimnat authentication successful', {
      authMethod,
      user: req.zimnat.user,
      ip: req.ip,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('Zimnat authentication service error', { 
      error: error.message, 
      stack: error.stack, 
      ip: req.ip, 
      path: req.path 
    });

    res.status(500).json({
      status: 'ERROR',
      errorCode: 'AUTH_SERVICE_ERROR',
      errorMessage: 'Authentication service error'
    });
  }
};

module.exports = authenticateZimnat;