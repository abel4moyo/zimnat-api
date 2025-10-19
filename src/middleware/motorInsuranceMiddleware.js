// ===================================================================
// 11. MOTOR INSURANCE MIDDLEWARE
// File: middleware/motorInsuranceMiddleware.js
// ===================================================================

const logger = require('../utils/logger');
const motorInsuranceService = require('../services/motorInsuranceService');

const motorInsuranceMiddleware = {
  
  // Check if quote exists and is valid
  validateQuoteExists: async (req, res, next) => {
    try {
      const { quoteId } = req.params;
      
      const quote = await motorInsuranceService.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({
          status: 'ERROR',
          errorCode: 'QUOTE_NOT_FOUND',
          errorMessage: 'Quote not found'
        });
      }
      
      // Check if quote is expired
      if (new Date() > new Date(quote.valid_until)) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'QUOTE_EXPIRED',
          errorMessage: 'Quote has expired'
        });
      }
      
      // Attach quote to request object
      req.quote = quote;
      next();
      
    } catch (error) {
      logger.error('Error validating quote existence', { 
        quoteId: req.params.quoteId, 
        error: error.message 
      });
      next({
        status: 500,
        message: 'Error validating quote',
        code: 'QUOTE_VALIDATION_ERROR'
      });
    }
  },

  // Rate limiting for quote generation
  rateLimitQuoteGeneration: async (req, res, next) => {
    try {
      const clientIP = req.ip || req.connection.remoteAddress;
      const cacheKey = `quote_rate_limit:${clientIP}`;
      
      // In a real implementation, you'd use Redis or similar
      // For now, we'll just log and continue
      logger.info('Quote generation rate limit check', { clientIP });
      
      next();
      
    } catch (error) {
      logger.error('Error in rate limiting', { error: error.message });
      next();
    }
  },

  // Validate business hours for certain operations
  validateBusinessHours: (req, res, next) => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Business hours: Monday-Friday 8AM-6PM, Saturday 8AM-1PM
    const isBusinessHours = (
      (day >= 1 && day <= 5 && hour >= 8 && hour < 18) || // Mon-Fri 8AM-6PM
      (day === 6 && hour >= 8 && hour < 13) // Saturday 8AM-1PM
    );
    
    if (!isBusinessHours) {
      logger.info('Request outside business hours', { 
        day, 
        hour, 
        path: req.path 
      });
      
      // For certain operations, we might want to restrict access
      if (req.path.includes('/approve')) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'OUTSIDE_BUSINESS_HOURS',
          errorMessage: 'Quote approvals are only available during business hours (Mon-Fri 8AM-6PM, Sat 8AM-1PM CAT)',
          businessHours: {
            monday_friday: '08:00 - 18:00 CAT',
            saturday: '08:00 - 13:00 CAT',
            sunday: 'Closed'
          }
        });
      }
    }
    
    next();
  },

  // Log motor insurance operations
  logMotorOperation: (operationType) => {
    return (req, res, next) => {
      const startTime = Date.now();
      
      logger.info(`Motor insurance operation started: ${operationType}`, {
        operationType,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: operationType === 'QUOTE_GENERATION' ? {
          vrn: req.body.vrn,
          insuranceType: req.body.insuranceType,
          vehicleValue: req.body.vehicleValue
        } : undefined
      });
      
      // Override res.json to log response
      const originalJson = res.json;
      res.json = function(body) {
        const duration = Date.now() - startTime;
        
        logger.info(`Motor insurance operation completed: ${operationType}`, {
          operationType,
          duration,
          statusCode: res.statusCode,
          success: res.statusCode < 400,
          responseSize: JSON.stringify(body).length
        });
        
        return originalJson.call(this, body);
      };
      
      next();
    };
  },

  // Validate VRN format for Zimbabwe
  validateZimbabweanVRN: (req, res, next) => {
    const { vrn } = req.body;
    
    if (!vrn) {
      return next();
    }
    
    // Zimbabwe VRN patterns:
    // AAA-1234 (old format)
    // AAA1234 (new format)
    // Government: GVT-1234
    // Diplomatic: CD-1234, CC-1234
    const vrnPatterns = [
      /^[A-Z]{3}[0-9]{4}$/,           // AAA1234
      /^[A-Z]{3}-[0-9]{4}$/,         // AAA-1234
      /^GVT-[0-9]{4}$/,              // Government
      /^(CD|CC)-[0-9]{4}$/,          // Diplomatic
      /^[A-Z]{2}[0-9]{3}[A-Z]$/      // AA123A (some commercial)
    ];
    
    const isValidVRN = vrnPatterns.some(pattern => pattern.test(vrn.toUpperCase()));
    
    if (!isValidVRN) {
      return res.status(400).json({
        status: 'ERROR',
        errorCode: 'INVALID_VRN_FORMAT',
        errorMessage: 'Invalid Zimbabwean Vehicle Registration Number format',
        acceptedFormats: [
          'AAA1234',
          'AAA-1234', 
          'GVT-1234 (Government)',
          'CD-1234 / CC-1234 (Diplomatic)'
        ]
      });
    }
    
    // Normalize VRN format
    req.body.vrn = vrn.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    next();
  }
};

module.exports = motorInsuranceMiddleware;
