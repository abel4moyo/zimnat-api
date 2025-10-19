

const logger = require('../utils/logger');

const authenticateAdmin = (req, res, next) => {
  try {
    const adminApiKey = req.headers['x-admin-api-key'];
    const authHeader = req.headers['authorization'];

    if (!adminApiKey && !authHeader) {
      logger.warn('Admin Authentication Failed: Missing credentials', { 
        ip: req.ip, 
        path: req.path 
      });
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required. Provide X-Admin-API-Key header.',
        code: 'ADMIN_AUTH_001'
      });
    }

    let isValidAdmin = false;

    // Check X-Admin-API-Key
    if (adminApiKey) {
      const validAdminKeys = [
        process.env.ADMIN_API_KEY,
        'supersecret-admin-key-123', // Default for development
        'admin-key-dev-123' // Additional development key
      ].filter(Boolean); // Remove undefined values

      isValidAdmin = validAdminKeys.includes(adminApiKey);
    }

    // Check Bearer token for admin (you can enhance this)
    if (!isValidAdmin && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Simple admin token check (enhance with JWT verification)
      if (token === 'admin-bearer-token-123') {
        isValidAdmin = true;
      }
    }

    if (!isValidAdmin) {
      logger.warn('Admin Authentication Failed: Invalid credentials', { 
        ip: req.ip, 
        path: req.path,
        providedKey: adminApiKey ? 'provided' : 'missing'
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials',
        code: 'ADMIN_AUTH_002'
      });
    }

    // Attach admin info to request
    req.admin = {
      role: 'admin',
      authenticated_at: new Date().toISOString(),
      ip: req.ip
    };

    logger.info('Admin authentication successful', {
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    logger.error('Admin authentication service error', { 
      error: error.message, 
      stack: error.stack, 
      ip: req.ip, 
      path: req.path 
    });

    res.status(500).json({
      success: false,
      error: 'Admin authentication service error',
      code: 'ADMIN_AUTH_SERVICE_ERROR'
    });
  }
};

module.exports = authenticateAdmin;
