

const logger = require('../utils/logger');

// In-memory storage for development (use Redis in production)
const idempotencyStore = new Map();

const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];

  // Only apply to POST requests with idempotency key
  if (req.method !== 'POST' || !idempotencyKey) {
    return next();
  }

  try {
    const cacheKey = `${req.path}:${idempotencyKey}`;

    // Check if we've seen this idempotency key before
    if (idempotencyStore.has(cacheKey)) {
      const cachedResponse = idempotencyStore.get(cacheKey);
      
      logger.info('Idempotent request served from cache', { 
        idempotencyKey, 
        path: req.path, 
        ip: req.ip 
      });

      return res.status(cachedResponse.statusCode).json(cachedResponse.body);
    }

    // Capture the response
    const originalJson = res.json;
    const originalStatus = res.status;
    
    let responseStatusCode = 200;
    let responseBody = null;

    // Override res.status to capture status code
    res.status = function(code) {
      responseStatusCode = code;
      return originalStatus.call(this, code);
    };

    // Override res.json to capture response
    res.json = function(body) {
      responseBody = body;

      // Store the response for future idempotent requests
      idempotencyStore.set(cacheKey, {
        statusCode: responseStatusCode,
        body: responseBody,
        timestamp: new Date().toISOString()
      });

      // Clean up old entries (simple TTL - 1 hour)
      setTimeout(() => {
        idempotencyStore.delete(cacheKey);
      }, 60 * 60 * 1000);

      // Call original json method
      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    logger.error('Idempotency middleware error', { 
      error: error.message, 
      stack: error.stack,
      idempotencyKey
    });
    
    // On error, continue without idempotency
    next();
  }
};

module.exports = idempotencyMiddleware;