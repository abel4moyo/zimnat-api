const client = require('prom-client');
const logger = require('./logger');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'fcb-zimnat-api'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({
  register,
  timeout: 10000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10
});

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'partner']
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const databaseConnections = new client.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

const zimnatApiCalls = new client.Counter({
  name: 'zimnat_api_calls_total',
  help: 'Total number of Zimnat API calls',
  labelNames: ['endpoint', 'status']
});

const transactionProcessingTime = new client.Histogram({
  name: 'transaction_processing_duration_seconds',
  help: 'Time taken to process transactions',
  labelNames: ['transaction_type', 'partner'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const premiumCalculations = new client.Counter({
  name: 'premium_calculations_total',
  help: 'Total number of premium calculations',
  labelNames: ['product_type', 'rating_type']
});

// Register custom metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(databaseConnections);
register.registerMetric(zimnatApiCalls);
register.registerMetric(transactionProcessingTime);
register.registerMetric(premiumCalculations);

// Middleware to collect HTTP metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const partner = req.partner ? req.partner.partner_code : 'unknown';
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString(), partner)
      .inc();
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
  });
  
  next();
};

module.exports = {
  register,
  metricsMiddleware,
  httpRequestsTotal,
  httpRequestDuration,
  databaseConnections,
  zimnatApiCalls,
  transactionProcessingTime,
  premiumCalculations
};
