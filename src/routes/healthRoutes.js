const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Try to load database
let pool;
try {
  const db = require('../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for health routes');
}

// For metrics endpoint (if using Prometheus)
let register;
try {
  const metrics = require('../utils/metrics');
  register = metrics.register;
} catch (error) {
  console.warn('Metrics not available:', error.message);
}

router.get('/health', async (req, res) => {
  let dbConnected = false;
  let client;
  
  try {
    if (pool) {
      client = await pool.connect();
      await client.query('SELECT 1');
      dbConnected = true;
    }
  } catch (error) {
    logger.error('Health check: Database connection failed', { error: error.message });
  } finally {
    if (client) client.release();
  }

  res.json({
    success: true,
    status: dbConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    uptime: Math.floor(process.uptime()),
    database: dbConnected ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Prometheus metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    if (register) {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else {
      res.status(503).json({ 
        error: 'Metrics not available',
        message: 'Prometheus client not configured'
      });
    }
  } catch (error) {
    logger.error('Error fetching Prometheus metrics', { error: error.message });
    res.status(500).send('Error fetching metrics');
  }
});

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏦 FCB Multi-Partner Integration API',
    version: '3.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    features: [
      'Multi-partner support',
      'Scalable product management',
      'Real-time dashboard',
      'Database persistence',
      'Transaction tracking',
      'Partner analytics',
      'Robust error handling',
      'IP Whitelisting/Blacklisting',
      'Idempotent API calls',
      'Prometheus Metrics'
    ],
    endpoints: {
      dashboard: '/dashboard',
      health: '/health',
      metrics: '/metrics',
      partners: '/partners',
      products: '/products',
      policy_lookup: '/api/v1/policy/lookup',
      payment_process: '/api/v1/payment/process',
      payment_status: '/api/v1/payment/status/:id',
      customers: '/api/v1/customers',
      transactions: '/api/v1/transactions',
      admin_partners: 'POST /api/v1/admin/partners',
      admin_products: 'POST /api/v1/admin/products',
      admin_ip_filter_add: 'POST /api/v1/admin/ip-filter',
      admin_ip_filter_remove: 'DELETE /api/v1/admin/ip-filter/:ipAddress'
    }
  });
});

// CRITICAL: Must export the router, not an object
module.exports = router;
