

const logger = require('../utils/logger');

// Try to load IP filter model
let IpFilterModel;
try {
  IpFilterModel = require('../models/ipFilterModel');
} catch (error) {
  console.warn('IpFilterModel not available');
}

const ipFilterMiddleware = async (req, res, next) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Skip IP filtering for localhost in development
    if (process.env.NODE_ENV === 'development' && 
        (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1')) {
      return next();
    }

    if (IpFilterModel) {
      // Check if IP is blacklisted
      const isBlacklisted = await IpFilterModel.isBlacklisted(clientIP);
      if (isBlacklisted) {
        logger.warn('Request blocked: IP is blacklisted', { 
          ip: clientIP, 
          path: req.path,
          method: req.method
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied: IP address is blocked',
          code: 'IP_BLACKLISTED'
        });
      }

      // If there are whitelisted IPs, check if this IP is whitelisted
      const whitelistedIPs = await IpFilterModel.getByType('whitelist');
      if (whitelistedIPs.length > 0) {
        const isWhitelisted = await IpFilterModel.isWhitelisted(clientIP);
        if (!isWhitelisted) {
          logger.warn('Request blocked: IP not in whitelist', { 
            ip: clientIP, 
            path: req.path,
            method: req.method
          });
          return res.status(403).json({
            success: false,
            error: 'Access denied: IP address not authorized',
            code: 'IP_NOT_WHITELISTED'
          });
        }
      }
    }

    // IP is allowed, continue
    next();
  } catch (error) {
    logger.error('IP filter middleware error', { 
      error: error.message, 
      stack: error.stack,
      ip: req.ip
    });
    
    // On error, allow the request to continue (fail open)
    next();
  }
};

module.exports = ipFilterMiddleware;

