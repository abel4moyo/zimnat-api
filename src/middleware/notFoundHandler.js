const logger = require('../utils/logger');

const notFoundHandler = (req, res) => {
  logger.warn('Endpoint Not Found', { 
    method: req.method, 
    path: req.originalUrl, 
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} is not available`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
    available_endpoints_hint: [
      'GET /',
      'GET /health',
      'GET /metrics',
      'GET /dashboard',
      'GET /partners',
      'GET /products',
      'POST /api/v1/policy/lookup',
      'POST /api/v1/payment/process',
      'GET /api/v1/payment/status/:id',
      'GET /api/v1/customers',
      'GET /api/v1/transactions',
      'POST /api/v1/admin/partners (Admin)',
      'POST /api/v1/admin/products (Admin)',
      'POST /api/v1/admin/ip-filter (Admin)',
      'DELETE /api/v1/admin/ip-filter/:ipAddress (Admin)'
    ]
  });
};

module.exports = notFoundHandler;