const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const config = require('../config/environment');

// Create rate limiter with Redis store
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.RATE_LIMIT_WINDOW, // 15 minutes
    max: config.RATE_LIMIT_MAX, // limit each IP to 1000 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });

      res.status(429).json(options.message || defaultOptions.message);
    },
    ...options
  };

  // Use Redis store if available
  try {
    const redisClient = getRedisClient();
    if (redisClient) {
      const RedisStore = require('rate-limit-redis');
      defaultOptions.store = new RedisStore({
        client: redisClient,
        prefix: 'fcb_api_rl:'
      });
    }
  } catch (error) {
    logger.warn('Redis not available for rate limiting, using memory store', {
      error: error.message
    });
  }

  return rateLimit(defaultOptions);
};

// Different rate limiters for different endpoints
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // general API calls
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // authentication attempts
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // admin operations
  message: {
    success: false,
    error: 'Too many admin requests, please try again later.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  }
});

const zimnatLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Zimnat API calls
  message: {
    success: false,
    error: 'Too many Zimnat API requests, please try again later.',
    code: 'ZIMNAT_RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  adminLimiter,
  zimnatLimiter,
  createRateLimiter
};
