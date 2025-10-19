const logger = require('../utils/logger');

const requestLogging = (req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  logger.info('Incoming Request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request Completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
};

module.exports = requestLogging;