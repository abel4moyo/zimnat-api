// src/app.js - Clean version with safe module loading and proper auth routes
/*const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');
const domesticRoutes = require('./routes/domesticRoutes');
const motorInsuranceRoutes = require('./routes/motorInsuranceRoutes');
const iceCashRoutes = require('./routes/zimnatIcecashRoutes');

// Swagger/OpenAPI imports with fallbacks
let swaggerUi, swaggerJsdoc, yaml;
try {
  swaggerUi = require('swagger-ui-express');
  swaggerJsdoc = require('swagger-jsdoc');
  yaml = require('js-yaml');
  console.log('✅ Swagger dependencies loaded');
} catch (error) {
  console.warn('⚠️  Swagger dependencies not available:', error.message);
  console.log('💡 To enable API documentation, run: npm install swagger-ui-express swagger-jsdoc js-yaml');
}

// Import middleware (with fallbacks for missing modules)
let metricsMiddleware, ipFilterMiddleware, errorHandler, notFoundHandler;

try {
  const metrics = require('./utils/metrics');
  metricsMiddleware = metrics.metricsMiddleware || ((req, res, next) => next());
} catch (error) {
  console.warn('Metrics middleware not available:', error.message);
  metricsMiddleware = (req, res, next) => next();
}

try {
  ipFilterMiddleware = require('./middleware/ipFilter');
} catch (error) {
  console.warn('IP filter middleware not available:', error.message);
  ipFilterMiddleware = (req, res, next) => next();
}

try {
  errorHandler = require('./middleware/errorHandler');
} catch (error) {
  console.warn('Error handler not available:', error.message);
  errorHandler = (err, req, res, next) => {
    logger.error('Error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR'
    });
  };
}

try {
  notFoundHandler = require('./middleware/notFoundHandler');
} catch (error) {
  console.warn('Not found handler not available:', error.message);
  notFoundHandler = (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      message: `${req.method} ${req.originalUrl} is not available`,
      code: 'NOT_FOUND'
    });
  };
}

// Safe route loader function
function loadRoute(routeName) {
  try {
    const routeModule = require(`./routes/${routeName}`);
    
    if (routeModule && typeof routeModule === 'function') {
      console.log(`✅ Loaded ${routeName}`);
      return routeModule;
    } else if (routeModule && routeModule.router && typeof routeModule.router === 'function') {
      console.log(`✅ Loaded ${routeName} (with router property)`);
      return routeModule.router;
    } else {
      console.warn(`⚠️  ${routeName} is not a valid Express router, creating fallback`);
      const fallbackRouter = express.Router();
      fallbackRouter.all('*', (req, res) => {
        res.status(501).json({
          success: false,
          error: 'Route not implemented',
          message: `${routeName} is not properly configured`,
          code: 'NOT_IMPLEMENTED'
        });
      });
      return fallbackRouter;
    }
  } catch (error) {
    console.warn(`⚠️  Failed to load ${routeName}:`, error.message);
    const fallbackRouter = express.Router();
    fallbackRouter.all('*', (req, res) => {
      res.status(501).json({
        success: false,
        error: 'Route not available',
        message: `${routeName} failed to load: ${error.message}`,
        code: 'ROUTE_LOAD_ERROR'
      });
    });
    return fallbackRouter;
  }
}

// Load route modules safely
const routes = {};

const routeModules = [
  'healthRoutes',
  'partnerRoutes', 
  'productRoutes',
  'customerRoutes',
  'transactionRoutes',
  'policyRoutes',
  'paymentRoutes',
  'adminRoutes',
  'authRoutes'  // ✅ Added auth routes here
];

routeModules.forEach(routeName => {
  routes[routeName] = loadRoute(routeName);
});

// Load optional routes with safe handling
const optionalRoutes = {};

// Load HCP routes
try {
  const hcpRoutes = loadRoute('hcpRoutes');
  if (hcpRoutes) {
    optionalRoutes.hcpRoutes = hcpRoutes;
    console.log('✅ HCP routes loaded');
  }
} catch (error) {
  console.warn('⚠️  HCP routes not available:', error.message);
}

// Load Personal Accident routes
try {
  const personalAccidentRoutes = loadRoute('personalAccidentRoutes');
  if (personalAccidentRoutes) {
    optionalRoutes.personalAccidentRoutes = personalAccidentRoutes;
    console.log('✅ Personal Accident routes loaded');
  }
} catch (error) {
  console.warn('⚠️  Personal Accident routes not available:', error.message);
}

// Load Dashboard routes
try {
  const dashboardRoute = loadRoute('dashboardRoutes');
  if (dashboardRoute) {
    routes.dashboardRoutes = dashboardRoute;
    console.log('✅ Dashboard routes loaded');
  }
} catch (error) {
  console.warn('⚠️  Dashboard routes not available:', error.message);
}

// Load Zimnat routes
try {
  const zimnatRoutes = loadRoute('zimnatRoutes');
  if (zimnatRoutes) {
    optionalRoutes.zimnatRoutes = zimnatRoutes;
    console.log('✅ Zimnat routes loaded');
  }
} catch (error) {
  console.warn('⚠️  Zimnat routes not available:', error.message);
}

// ✅ CREATE EXPRESS APP HERE (AFTER route loading)
const app = express();

// Mount existing routes (motorInsuranceRoutes will be mounted after ZIMNAT routes for proper precedence)
app.use('/api/domestic', domesticRoutes);
app.use('/', iceCashRoutes);

// =============================================================================
// OpenAPI Specification
// =============================================================================

const getOpenAPISpec = () => {
  let packageInfo;
  try {
    packageInfo = require('../package.json');
  } catch (error) {
    packageInfo = { version: '3.0.0' };
  }
  
  return {
    openapi: "3.1.0",
    info: {
      title: "FCB Multi-Partner Integration API",
      version: packageInfo.version || "3.0.0",
      description: `
A production-ready, scalable API for integrating multiple partners and products,
with robust features including authentication, transaction tracking,
IP filtering, idempotency, and a real-time dashboard.

## Features
- Multi-partner support with individual API keys
- Scalable product management across categories
- Real-time transaction processing
- Comprehensive monitoring and analytics
- IP-based security controls
- Idempotent payment processing
- Hospital Cash Plan (HCP) insurance
- Personal Accident insurance
- JWT Authentication and API key management

## Authentication
Most endpoints require authentication via API keys or JWT tokens:
- Partner endpoints: \`X-API-Key\` header or \`Authorization: Bearer <token>\`
- Admin endpoints: \`X-Admin-API-Key\` header
- Auth endpoints: \`/api/v1/auth/login\` for JWT token generation
      `,
      contact: {
        name: "FCB Integration Team",
        email: "integration@fcb.co.zw"
      },
      license: {
        name: "Proprietary",
        url: "https://fcb.co.zw/terms"
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.fcb.co.zw' 
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' 
          ? 'Production Server' 
          : 'Development Server'
      }
    ],
    security: [
      { ApiKeyAuth: [] },
      { AdminApiKeyAuth: [] },
      { BearerAuth: [] }
    ],
    tags: [
      { name: "General", description: "General API information and health checks" },
      { name: "Authentication", description: "JWT authentication and token management" },
      { name: "Partners", description: "Partner management and information" },
      { name: "Products", description: "Product catalog management" },
      { name: "Policy Operations", description: "Endpoints for policy lookup and management" },
      { name: "Payment Operations", description: "Endpoints for processing and checking payments" },
      { name: "Customer Management", description: "Customer information and management" },
      { name: "Transaction Management", description: "Comprehensive transaction history and tracking" },
      { name: "Administration", description: "Administrative endpoints for system management" },
      { name: "Monitoring", description: "Metrics, health monitoring, and dashboard" },
      { name: "Hospital Cash Plan", description: "Hospital Cash Plan insurance endpoints" },
      { name: "Personal Accident", description: "Personal Accident insurance endpoints" }
    ],
    paths: {
      "/": {
        get: {
          tags: ["General"],
          summary: "Get API Information",
          description: "Provides basic information about the API, version, status, and available endpoints",
          security: [],
          responses: {
            "200": {
              description: "Successful response with API details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string", example: "🏦 FCB Multi-Partner Integration API" },
                      version: { type: "string", example: "3.0.0" },
                      status: { type: "string", example: "running" },
                      timestamp: { type: "string", format: "date-time" },
                      features: {
                        type: "array",
                        items: { type: "string" },
                        example: ["Multi-partner support", "JWT Authentication", "Real-time dashboard", "Transaction tracking", "HCP Insurance", "Personal Accident"]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/health": {
        get: {
          tags: ["General", "Monitoring"],
          summary: "Health Check",
          description: "Comprehensive health check of API server and dependencies",
          security: [],
          responses: {
            "200": {
              description: "System is healthy",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" }
                }
              }
            }
          }
        }
      },
      "/api/v1/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "Partner Login",
          description: "Authenticate partner and receive JWT tokens",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    partner_code: { type: "string", example: "fcb" },
                    api_key: { type: "string", example: "fcb-api-key-12345" }
                  },
                  required: ["partner_code", "api_key"]
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Authentication successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string", example: "Authentication successful" },
                      data: {
                        type: "object",
                        properties: {
                          access_token: { type: "string" },
                          refresh_token: { type: "string" },
                          token_type: { type: "string", example: "Bearer" },
                          expires_in: { type: "string", example: "24h" },
                          partner: {
                            type: "object",
                            properties: {
                              code: { type: "string" },
                              name: { type: "string" },
                              type: { type: "string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": { $ref: "#/components/responses/Unauthorized" }
          }
        }
      },
      "/api/v1/auth/refresh": {
        post: {
          tags: ["Authentication"],
          summary: "Refresh JWT Token",
          description: "Refresh access token using refresh token",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    refresh_token: { type: "string" }
                  },
                  required: ["refresh_token"]
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Token refreshed successfully"
            },
            "401": { $ref: "#/components/responses/Unauthorized" }
          }
        }
      },
      "/api/v1/auth/verify": {
        get: {
          tags: ["Authentication"],
          summary: "Verify JWT Token",
          description: "Verify the validity of a JWT token",
          security: [{ BearerAuth: [] }],
          responses: {
            "200": {
              description: "Token is valid"
            },
            "401": { $ref: "#/components/responses/Unauthorized" }
          }
        }
      },
      "/api/hcp/health": {
        get: {
          tags: ["Hospital Cash Plan"],
          summary: "HCP Service Health Check",
          description: "Check Hospital Cash Plan service health",
          responses: {
            "200": {
              description: "HCP service is healthy"
            }
          }
        }
      },
      "/api/hcp/packages": {
        get: {
          tags: ["Hospital Cash Plan"],
          summary: "Get HCP Packages",
          description: "Get available Hospital Cash Plan packages",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: {
            "200": {
              description: "HCP packages retrieved successfully"
            }
          }
        }
      },
      "/api/hcp/quote": {
        post: {
          tags: ["Hospital Cash Plan"],
          summary: "Generate HCP Quote",
          description: "Generate a Hospital Cash Plan quote",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: {
            "200": {
              description: "Quote generated successfully"
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Partner API key for authentication"
        },
        AdminApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-Admin-API-Key",
          description: "Administrative API key for admin endpoints"
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for authenticated endpoints"
        }
      },
      responses: {
        BadRequest: {
          description: "Invalid request payload or parameters",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        },
        Unauthorized: {
          description: "Authentication failed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        }
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "An error occurred" },
            message: { type: "string" },
            code: { type: "string", example: "ERROR_CODE" }
          },
          required: ["success", "error"]
        },
        HealthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            status: { type: "string", enum: ["healthy", "unhealthy"] },
            timestamp: { type: "string", format: "date-time" },
            version: { type: "string", example: "3.0.0" },
            uptime: { type: "integer", example: 3600 },
            database: { type: "string", enum: ["connected", "disconnected"] }
          }
        }
      }
    }
  };
};

// =============================================================================
// Swagger/OpenAPI Setup
// =============================================================================

let openApiSpec = null;
if (swaggerUi && swaggerJsdoc) {
  try {
    openApiSpec = getOpenAPISpec();
    console.log('✅ OpenAPI specification loaded');
  } catch (error) {
    console.warn('⚠️  Failed to load OpenAPI specification:', error.message);
  }
}

// =============================================================================
// Global Middleware Setup
// =============================================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "https://zimnat.co.zw"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"]
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(compression());

// Body parsing middleware
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  keyGenerator: (req) => req.ip,
});

app.use('/api/', apiLimiter);
app.use(metricsMiddleware);

if (process.env.NODE_ENV === 'production') {
  app.use('/api/', ipFilterMiddleware);
}

// Request logging
app.use((req, res, next) => {
  logger.info('Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// =============================================================================
// Documentation Routes
// =============================================================================

if (openApiSpec && swaggerUi) {
  // Swagger UI options
  const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
      persistAuthorization: true
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .scheme-container { 
        background: #fafafa; 
        padding: 15px; 
        border-radius: 4px;
      }
    `,
    customSiteTitle: "FCB Multi-Partner API Documentation"
  };

  // Main Swagger UI documentation
  app.use('/docs', swaggerUi.serve);
  app.get('/docs', swaggerUi.setup(openApiSpec, swaggerOptions));

  // OpenAPI JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(openApiSpec);
    } catch (error) {
      console.error('Error serving OpenAPI JSON:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to serve OpenAPI specification',
        message: error.message
      });
    }
  });

  console.log('✅ API Documentation available at:');
  console.log('   📚 Interactive Docs: /docs');
  console.log('   📋 OpenAPI JSON: /api-docs.json');
} else {
  console.log('⚠️  API Documentation not available (missing swagger dependencies)');
  console.log('💡 To enable, run: npm install swagger-ui-express swagger-jsdoc js-yaml');
  
  // Provide fallback endpoints
  app.get(['/docs', '/api-portal'], (req, res) => {
    res.status(501).json({
      success: false,
      error: 'Documentation not available',
      message: 'Swagger dependencies not installed',
      solution: 'Run: npm install swagger-ui-express swagger-jsdoc js-yaml'
    });
  });

  app.get(['/api-docs.json'], (req, res) => {
    res.status(501).json({
      success: false,
      error: 'OpenAPI specification not available',
      message: 'Swagger dependencies not installed'
    });
  });
}

// =============================================================================
// Route Definitions
// =============================================================================

// Mount routes safely (order matters - most specific first)
const mountRoute = (path, router, description) => {
  try {
    if (router && typeof router === 'function') {
      app.use(path, router);
      console.log(`✅ Mounted ${description}: ${path}`);
    } else {
      console.warn(`⚠️  Skipped mounting ${description}: invalid router`);
    }
  } catch (error) {
    console.error(`❌ Failed to mount ${description}:`, error.message);
  }
};

// Mount core routes
mountRoute('/', routes.healthRoutes, 'health routes (/, /health, /metrics)');

// ✅ Mount auth routes EARLY (before protected routes)
mountRoute('/', routes.authRoutes, 'auth routes (/api/v1/auth/*)');

if (routes.dashboardRoutes) {
  mountRoute('/', routes.dashboardRoutes, 'dashboard routes (/dashboard)');
}

mountRoute('/', routes.partnerRoutes, 'partner routes (/partners)');
mountRoute('/', routes.productRoutes, 'product routes (/products)');
mountRoute('/', routes.adminRoutes, 'admin routes (/api/v1/admin/*)');

// Mount ZIMNAT v2.1 routes FIRST (before old payment/policy routes to avoid conflicts)
if (optionalRoutes.zimnatRoutes) {
  mountRoute('/', optionalRoutes.zimnatRoutes, 'Zimnat v2.1 routes (takes precedence)');
}

// Mount motorInsuranceRoutes AFTER ZIMNAT routes
mountRoute('/api/motor', motorInsuranceRoutes, 'motor insurance routes (/api/motor/*)');

mountRoute('/', routes.policyRoutes, 'policy routes (/api/v1/policy/*)');
mountRoute('/', routes.paymentRoutes, 'payment routes (/api/v1/payment/*)');
mountRoute('/', routes.customerRoutes, 'customer routes (/api/v1/customers)');
mountRoute('/', routes.transactionRoutes, 'transaction routes (/api/v1/transactions)');

// Mount optional routes
if (optionalRoutes.hcpRoutes) {
  mountRoute('/api/hcp', optionalRoutes.hcpRoutes, 'HCP routes (/api/hcp/*)');
}

if (optionalRoutes.personalAccidentRoutes) {
  mountRoute('/api/pa', optionalRoutes.personalAccidentRoutes, 'Personal Accident routes (/api/pa/*)');
}

// =============================================================================
// Error Handling Middleware (must be last)
// =============================================================================

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// =============================================================================
// Application Info
// =============================================================================

console.log('\n🚀 FCB Multi-Partner Integration API');
console.log('=====================================');
console.log('📚 Available endpoints:');
console.log('   GET  /              - API information');
console.log('   GET  /health        - Health check');
console.log('   GET  /metrics       - Prometheus metrics');
console.log('   GET  /partners      - List partners');
console.log('   GET  /products      - List products');

console.log('\n🔐 Authentication endpoints:');
console.log('   POST /api/v1/auth/login   - Partner login (get JWT)');
console.log('   POST /api/v1/auth/refresh - Refresh JWT token');
console.log('   GET  /api/v1/auth/verify  - Verify JWT token');

if (optionalRoutes.hcpRoutes) {
  console.log('\n🏥 HCP Insurance:');
  console.log('     GET  /api/hcp/health    - HCP health check');
  console.log('     GET  /api/hcp/packages  - Get HCP packages');
  console.log('     POST /api/hcp/quote     - Generate HCP quote');
  console.log('     POST /api/hcp/policy    - Create HCP policy');
  console.log('     POST /api/hcp/payment   - Process HCP payment');
}

if (optionalRoutes.personalAccidentRoutes) {
  console.log('\n🚑 Personal Accident Insurance:');
  console.log('     GET  /api/pa/packages   - Get PA packages');
  console.log('     POST /api/pa/quote      - Generate PA quote');
  console.log('     POST /api/pa/policy     - Create PA policy');
}

if (openApiSpec) {
  console.log('\n📖 Documentation:');
  console.log('   📚 Interactive: /docs');
  console.log('   📋 OpenAPI: /api-docs.json');
}

console.log('=====================================\n');

module.exports = app;  */

// src/app.js - Updated version with comprehensive OpenAPI YAML loading
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const domesticRoutes = require('./routes/domesticRoutes');
const motorInsuranceRoutes = require('./routes/motorInsuranceRoutes');
const iceCashRoutes = require('./routes/zimnatIcecashRoutes');

// Swagger/OpenAPI imports with fallbacks
let swaggerUi, swaggerJsdoc, yaml;
try {
  swaggerUi = require('swagger-ui-express');
  swaggerJsdoc = require('swagger-jsdoc');
  yaml = require('js-yaml');
  console.log('✅ Swagger dependencies loaded');
} catch (error) {
  console.warn('⚠️  Swagger dependencies not available:', error.message);
  console.log('💡 To enable API documentation, run: npm install swagger-ui-express swagger-jsdoc js-yaml');
}

// Import middleware (with fallbacks for missing modules)
let metricsMiddleware, ipFilterMiddleware, errorHandler, notFoundHandler;

try {
  const metrics = require('./utils/metrics');
  metricsMiddleware = metrics.metricsMiddleware || ((req, res, next) => next());
} catch (error) {
  console.warn('Metrics middleware not available:', error.message);
  metricsMiddleware = (req, res, next) => next();
}

try {
  ipFilterMiddleware = require('./middleware/ipFilter');
} catch (error) {
  console.warn('IP filter middleware not available:', error.message);
  ipFilterMiddleware = (req, res, next) => next();
}

try {
  errorHandler = require('./middleware/errorHandler');
} catch (error) {
  console.warn('Error handler not available:', error.message);
  errorHandler = (err, req, res, next) => {
    logger.error('Error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR'
    });
  };
}

try {
  notFoundHandler = require('./middleware/notFoundHandler');
} catch (error) {
  console.warn('Not found handler not available:', error.message);
  notFoundHandler = (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      message: `${req.method} ${req.originalUrl} is not available`,
      code: 'NOT_FOUND'
    });
  };
}

// Safe route loader function
function loadRoute(routeName) {
  try {
    const routeModule = require(`./routes/${routeName}`);
    
    if (routeModule && typeof routeModule === 'function') {
      console.log(`✅ Loaded ${routeName}`);
      return routeModule;
    } else if (routeModule && routeModule.router && typeof routeModule.router === 'function') {
      console.log(`✅ Loaded ${routeName} (with router property)`);
      return routeModule.router;
    } else {
      console.warn(`⚠️  ${routeName} is not a valid Express router, creating fallback`);
      const fallbackRouter = express.Router();
      fallbackRouter.all('*', (req, res) => {
        res.status(501).json({
          success: false,
          error: 'Route not implemented',
          message: `${routeName} is not properly configured`,
          code: 'NOT_IMPLEMENTED'
        });
      });
      return fallbackRouter;
    }
  } catch (error) {
    console.warn(`⚠️  Failed to load ${routeName}:`, error.message);
    const fallbackRouter = express.Router();
    fallbackRouter.all('*', (req, res) => {
      res.status(501).json({
        success: false,
        error: 'Route not available',
        message: `${routeName} failed to load: ${error.message}`,
        code: 'ROUTE_LOAD_ERROR'
      });
    });
    return fallbackRouter;
  }
}

// Load route modules safely
const routes = {};

const routeModules = [
  'healthRoutes',
  'partnerRoutes', 
  'productRoutes',
  'customerRoutes',
  'transactionRoutes',
  'policyRoutes',
  'paymentRoutes',
  'adminRoutes',
  'authRoutes'  // ✅ Added auth routes here
];

routeModules.forEach(routeName => {
  routes[routeName] = loadRoute(routeName);
});

// Load optional routes with safe handling
const optionalRoutes = {};

// Load HCP routes
try {
  const hcpRoutes = loadRoute('hcpRoutes');
  if (hcpRoutes) {
    optionalRoutes.hcpRoutes = hcpRoutes;
    console.log('✅ HCP routes loaded');
  }
} catch (error) {
  console.warn('⚠️  HCP routes not available:', error.message);
}

// Load Personal Accident routes
try {
  const personalAccidentRoutes = loadRoute('personalAccidentRoutes');
  if (personalAccidentRoutes) {
    optionalRoutes.personalAccidentRoutes = personalAccidentRoutes;
    console.log('✅ Personal Accident routes loaded');
  }
} catch (error) {
  console.warn('⚠️  Personal Accident routes not available:', error.message);
}

// Load Dashboard routes
try {
  const dashboardRoute = loadRoute('dashboardRoutes');
  if (dashboardRoute) {
    routes.dashboardRoutes = dashboardRoute;
    console.log('✅ Dashboard routes loaded');
  }
} catch (error) {
  console.warn('⚠️  Dashboard routes not available:', error.message);
}

// Load Zimnat routes
try {
  const zimnatRoutes = loadRoute('zimnatRoutes');
  if (zimnatRoutes) {
    optionalRoutes.zimnatRoutes = zimnatRoutes;
    console.log('✅ Zimnat routes loaded');
  }
} catch (error) {
  console.warn('⚠️  Zimnat routes not available:', error.message);
}

// ✅ CREATE EXPRESS APP HERE (AFTER route loading)
const app = express();

// Mount existing routes (motorInsuranceRoutes will be mounted after ZIMNAT routes for proper precedence)
app.use('/api/domestic', domesticRoutes);
app.use('/', iceCashRoutes);

// =============================================================================
// 🆕 COMPREHENSIVE OPENAPI SPECIFICATION LOADER
// =============================================================================

function loadComprehensiveOpenAPISpec() {
  let openApiSpec = null;
  
  // Try to load the comprehensive YAML file first
  const yamlPaths = [
    path.join(__dirname, '../openapi.yaml'),           // Project root
    path.join(__dirname, '../docs/openapi.yaml'),      // Docs folder
    path.join(__dirname, './config/openapi.yaml'),     // Config folder
    path.join(__dirname, '../api-spec.yaml'),          // Alternative name
  ];
  
  for (const yamlPath of yamlPaths) {
    try {
      if (fs.existsSync(yamlPath)) {
        console.log(`📋 Loading OpenAPI specification from: ${yamlPath}`);
        const yamlContent = fs.readFileSync(yamlPath, 'utf8');
        openApiSpec = yaml.load(yamlContent);
        
        // Update server URLs based on environment
        if (openApiSpec && openApiSpec.servers) {
          openApiSpec.servers = openApiSpec.servers.map(server => {
            if (server.url.includes('localhost') && process.env.NODE_ENV === 'production') {
              return {
                ...server,
                url: process.env.API_BASE_URL || 'https://api.fcb-zimnat.com',
                description: 'Production Environment'
              };
            }
            return server;
          });
        }
        
        console.log('✅ Comprehensive OpenAPI specification loaded successfully');
        console.log(`📊 Found ${Object.keys(openApiSpec.paths || {}).length} endpoints`);
        console.log(`🏷️  API Version: ${openApiSpec.info?.version || 'unknown'}`);
        console.log(`📚 Categories: ${(openApiSpec.tags || []).length} tags`);
        
        return openApiSpec;
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load YAML from ${yamlPath}:`, error.message);
      continue;
    }
  }
  
  // Fallback to basic specification if YAML not found
  console.log('📋 YAML file not found, using fallback OpenAPI specification');
  return getFallbackOpenAPISpec();
}

function getFallbackOpenAPISpec() {
  let packageInfo;
  try {
    packageInfo = require('../package.json');
  } catch (error) {
    packageInfo = { version: '3.0.0' };
  }
  
  return {
    openapi: "3.1.0",
    info: {
      title: "FCB Multi-Partner Integration API",
      version: packageInfo.version || "3.0.0",
      description: `
A production-ready, scalable API for integrating multiple partners and products,
with robust features including authentication, transaction tracking,
IP filtering, idempotency, and a real-time dashboard.

## ⚠️ Note
This is a fallback specification. For the complete API documentation,
please ensure the comprehensive openapi.yaml file is available.

## Features
- Multi-partner support with individual API keys
- Scalable product management across categories
- Real-time transaction processing
- Comprehensive monitoring and analytics
- IP-based security controls
- Idempotent payment processing
- Hospital Cash Plan (HCP) insurance
- Personal Accident insurance
- JWT Authentication and API key management

## Authentication
Most endpoints require authentication via API keys or JWT tokens:
- Partner endpoints: \`X-API-Key\` header or \`Authorization: Bearer <token>\`
- Admin endpoints: \`X-Admin-API-Key\` header
- Auth endpoints: \`/api/v1/auth/login\` for JWT token generation
      `,
      contact: {
        name: "FCB Integration Team",
        email: "integration@fcb.co.zw"
      },
      license: {
        name: "Proprietary",
        url: "https://fcb.co.zw/terms"
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? (process.env.API_BASE_URL || 'https://api.fcb-zimnat.com')
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' 
          ? 'Production Server' 
          : 'Development Server'
      }
    ],
    security: [
      { ApiKeyAuth: [] },
      { AdminApiKeyAuth: [] },
      { BearerAuth: [] }
    ],
    tags: [
      { name: "General", description: "General API information and health checks" },
      { name: "Authentication", description: "JWT authentication and token management" },
      { name: "Partners", description: "Partner management and information" },
      { name: "Products", description: "Product catalog management" },
      { name: "Policy Operations", description: "Endpoints for policy lookup and management" },
      { name: "Payment Operations", description: "Endpoints for processing and checking payments" },
      { name: "Customer Management", description: "Customer information and management" },
      { name: "Transaction Management", description: "Comprehensive transaction history and tracking" },
      { name: "Administration", description: "Administrative endpoints for system management" },
      { name: "Monitoring", description: "Metrics, health monitoring, and dashboard" },
      { name: "Hospital Cash Plan", description: "Hospital Cash Plan insurance endpoints" },
      { name: "Personal Accident", description: "Personal Accident insurance endpoints" }
    ],
    paths: {
      "/": {
        get: {
          tags: ["General"],
          summary: "Get API Information",
          description: "Provides basic information about the API, version, status, and available endpoints",
          security: [],
          responses: {
            "200": {
              description: "Successful response with API details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string", example: "🏦 FCB Multi-Partner Integration API" },
                      version: { type: "string", example: "3.0.0" },
                      status: { type: "string", example: "running" },
                      timestamp: { type: "string", format: "date-time" },
                      features: {
                        type: "array",
                        items: { type: "string" },
                        example: ["Multi-partner support", "JWT Authentication", "Real-time dashboard", "Transaction tracking", "HCP Insurance", "Personal Accident"]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/health": {
        get: {
          tags: ["General", "Monitoring"],
          summary: "Health Check",
          description: "Comprehensive health check of API server and dependencies",
          security: [],
          responses: {
            "200": {
              description: "System is healthy",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" }
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Partner API key for authentication"
        },
        AdminApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-Admin-API-Key",
          description: "Administrative API key for admin endpoints"
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for authenticated endpoints"
        }
      },
      responses: {
        BadRequest: {
          description: "Invalid request payload or parameters",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        },
        Unauthorized: {
          description: "Authentication failed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        }
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "An error occurred" },
            message: { type: "string" },
            code: { type: "string", example: "ERROR_CODE" }
          },
          required: ["success", "error"]
        },
        HealthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            status: { type: "string", enum: ["healthy", "unhealthy"] },
            timestamp: { type: "string", format: "date-time" },
            version: { type: "string", example: "3.0.0" },
            uptime: { type: "integer", example: 3600 },
            database: { type: "string", enum: ["connected", "disconnected"] }
          }
        }
      }
    }
  };
}

// =============================================================================
// Load OpenAPI Specification
// =============================================================================

let openApiSpec = null;
if (swaggerUi && yaml) {
  try {
    openApiSpec = loadComprehensiveOpenAPISpec();
  } catch (error) {
    console.error('❌ Failed to load OpenAPI specification:', error.message);
    openApiSpec = null;
  }
}

// =============================================================================
// Global Middleware Setup
// =============================================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "https://zimnat.co.zw"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"]
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(compression());

// Body parsing middleware
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  keyGenerator: (req) => req.ip,
});

app.use('/api/', apiLimiter);
app.use(metricsMiddleware);

if (process.env.NODE_ENV === 'production') {
  app.use('/api/', ipFilterMiddleware);
}

// Request logging
app.use((req, res, next) => {
  logger.info('Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// =============================================================================
// 🆕 ENHANCED DOCUMENTATION ROUTES
// =============================================================================

if (openApiSpec && swaggerUi) {
  // Enhanced Swagger UI options
  const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      displayOperationId: false,
      displayRequestDuration: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .scheme-container { 
        background: #fafafa; 
        padding: 15px; 
        border-radius: 4px;
        margin-bottom: 20px;
      }
      .swagger-ui .auth-wrapper {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 20px;
      }
      .swagger-ui .btn.authorize {
        background-color: #4CAF50;
        border-color: #4CAF50;
      }
      .swagger-ui .operation-tag-content {
        max-width: none;
      }
      .swagger-ui .opblock.opblock-post {
        border-color: #49cc90;
        background: rgba(73, 204, 144, 0.1);
      }
      .swagger-ui .opblock.opblock-get {
        border-color: #61affe;
        background: rgba(97, 175, 254, 0.1);
      }
      .swagger-ui .opblock.opblock-delete {
        border-color: #f93e3e;
        background: rgba(249, 62, 62, 0.1);
      }
      .swagger-ui .opblock.opblock-put {
        border-color: #fca130;
        background: rgba(252, 161, 48, 0.1);
      }
    `,
    customSiteTitle: "FCB-Zimnat Integration Gateway API Documentation",
    customfavIcon: "/favicon.ico"
  };

  // Main Swagger UI documentation
  app.use('/docs', swaggerUi.serve);
  app.get('/docs', swaggerUi.setup(openApiSpec, swaggerOptions));
  
  // Alternative endpoint for API docs
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(openApiSpec, swaggerOptions));

  // OpenAPI JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(openApiSpec);
    } catch (error) {
      console.error('Error serving OpenAPI JSON:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to serve OpenAPI specification',
        message: error.message
      });
    }
  });

  // API Portal - Enhanced landing page
  app.get('/api-portal', (req, res) => {
    const totalEndpoints = Object.keys(openApiSpec.paths || {}).length;
    const totalTags = (openApiSpec.tags || []).length;
    const apiVersion = openApiSpec.info?.version || '3.0.0';
    
    const portalHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>FCB-Zimnat API Portal</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; padding: 40px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 50px; }
          .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
          .card { 
            background: rgba(255,255,255,0.1); 
            padding: 30px; 
            border-radius: 10px; 
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            transition: transform 0.3s ease;
          }
          .card:hover { transform: translateY(-5px); }
          .card h3 { margin-top: 0; color: #fff; }
          .card a { 
            color: #4fc3f7; 
            text-decoration: none; 
            font-weight: 500;
            display: inline-block;
            margin-top: 10px;
          }
          .card a:hover { color: #29b6f6; text-decoration: underline; }
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 30px; }
          .stat { text-align: center; }
          .stat-number { font-size: 2em; font-weight: bold; color: #4fc3f7; }
          .badge { 
            background: rgba(76, 195, 247, 0.3); 
            padding: 4px 12px; 
            border-radius: 15px; 
            font-size: 0.8em; 
            margin-left: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏦 FCB-Zimnat Integration Gateway API</h1>
            <p>Comprehensive API for insurance and banking integration</p>
            <span class="badge">v${apiVersion}</span>
            <div class="stats">
              <div class="stat">
                <div class="stat-number">${totalEndpoints}</div>
                <div>API Endpoints</div>
              </div>
              <div class="stat">
                <div class="stat-number">${totalTags}</div>
                <div>Categories</div>
              </div>
              <div class="stat">
                <div class="stat-number">Multi-Partner</div>
                <div>Integration</div>
              </div>
            </div>
          </div>
          
          <div class="cards">
            <div class="card">
              <h3>📚 Interactive Documentation</h3>
              <p>Explore and test API endpoints with Swagger UI</p>
              <a href="/docs">Open Swagger UI →</a>
            </div>
            
            <div class="card">
              <h3>📋 OpenAPI Specification</h3>
              <p>Raw OpenAPI JSON specification for integration</p>
              <a href="/api-docs.json">Download JSON →</a>
            </div>
            
            <div class="card">
              <h3>📊 API Dashboard</h3>
              <p>Monitor API performance and system metrics</p>
              <a href="/dashboard">Open Dashboard →</a>
            </div>
            
            <div class="card">
              <h3>💚 Health Status</h3>
              <p>Check API health and system status</p>
              <a href="/health">Check Health →</a>
            </div>
            
            <div class="card">
              <h3>🏥 Hospital Cash Plan</h3>
              <p>HCP insurance endpoints and documentation</p>
              <a href="/api/hcp/health">HCP Health →</a>
            </div>
            
            <div class="card">
              <h3>🚑 Personal Accident</h3>
              <p>Personal Accident insurance endpoints</p>
              <a href="/api/pa/packages">PA Packages →</a>
            </div>
          </div>
        </div>
      </body>
    </html>`;
    res.send(portalHTML);
  });

  console.log('✅ API Documentation available at:');
  console.log('   📚 Interactive Docs: /docs or /api-docs');
  console.log('   🏠 API Portal: /api-portal');
  console.log('   📋 OpenAPI JSON: /api-docs.json');
  console.log(`   📊 Total Endpoints: ${Object.keys(openApiSpec.paths || {}).length}`);
} else {
  console.log('⚠️  API Documentation not available (missing swagger dependencies)');
  console.log('💡 To enable, run: npm install swagger-ui-express swagger-jsdoc js-yaml');
  
  // Provide fallback endpoints
  app.get(['/docs', '/api-docs', '/api-portal'], (req, res) => {
    res.status(501).json({
      success: false,
      error: 'Documentation not available',
      message: 'Swagger dependencies not installed or OpenAPI YAML not found',
      solution: 'Run: npm install swagger-ui-express swagger-jsdoc js-yaml'
    });
  });

  app.get(['/api-docs.json'], (req, res) => {
    res.status(501).json({
      success: false,
      error: 'OpenAPI specification not available',
      message: 'Swagger dependencies not installed or YAML file not found'
    });
  });
}

// =============================================================================
// Route Definitions
// =============================================================================

// Mount routes safely (order matters - most specific first)
const mountRoute = (path, router, description) => {
  try {
    if (router && typeof router === 'function') {
      app.use(path, router);
      console.log(`✅ Mounted ${description}: ${path}`);
    } else {
      console.warn(`⚠️  Skipped mounting ${description}: invalid router`);
    }
  } catch (error) {
    console.error(`❌ Failed to mount ${description}:`, error.message);
  }
};

// Mount core routes
mountRoute('/', routes.healthRoutes, 'health routes (/, /health, /metrics)');

// ✅ Mount auth routes EARLY (before protected routes)
mountRoute('/', routes.authRoutes, 'auth routes (/api/v1/auth/*)');

if (routes.dashboardRoutes) {
  mountRoute('/', routes.dashboardRoutes, 'dashboard routes (/dashboard)');
}

mountRoute('/', routes.partnerRoutes, 'partner routes (/partners)');
mountRoute('/', routes.productRoutes, 'product routes (/products)');
mountRoute('/', routes.adminRoutes, 'admin routes (/api/v1/admin/*)');

// Mount ZIMNAT v2.1 routes FIRST (before old payment/policy routes to avoid conflicts)
if (optionalRoutes.zimnatRoutes) {
  mountRoute('/', optionalRoutes.zimnatRoutes, 'Zimnat v2.1 routes (takes precedence)');
}

// Mount motorInsuranceRoutes AFTER ZIMNAT routes
mountRoute('/api/motor', motorInsuranceRoutes, 'motor insurance routes (/api/motor/*)');

mountRoute('/', routes.policyRoutes, 'policy routes (/api/v1/policy/*)');
mountRoute('/', routes.paymentRoutes, 'payment routes (/api/v1/payment/*)');
mountRoute('/', routes.customerRoutes, 'customer routes (/api/v1/customers)');
mountRoute('/', routes.transactionRoutes, 'transaction routes (/api/v1/transactions)');

// Mount optional routes
if (optionalRoutes.hcpRoutes) {
  mountRoute('/api/hcp', optionalRoutes.hcpRoutes, 'HCP routes (/api/hcp/*)');
}

if (optionalRoutes.personalAccidentRoutes) {
  mountRoute('/api/pa', optionalRoutes.personalAccidentRoutes, 'Personal Accident routes (/api/pa/*)');
}

// =============================================================================
// Error Handling Middleware (must be last)
// =============================================================================

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// =============================================================================
// Application Info
// =============================================================================

console.log('\n🚀 FCB Multi-Partner Integration API');
console.log('=====================================');

if (openApiSpec) {
  console.log(`📊 API Version: ${openApiSpec.info?.version || '3.0.0'}`);
  console.log(`📚 Total Endpoints: ${Object.keys(openApiSpec.paths || {}).length}`);
  console.log(`🏷️  Categories: ${(openApiSpec.tags || []).length} tags`);
}

console.log('\n📚 Available endpoints:');
console.log('   GET  /              - API information');
console.log('   GET  /health        - Health check');
console.log('   GET  /metrics       - Prometheus metrics');
console.log('   GET  /partners      - List partners');
console.log('   GET  /products      - List products');

console.log('\n🔐 Authentication endpoints:');
console.log('   POST /api/v1/auth/login   - Partner login (get JWT)');
console.log('   POST /api/v1/auth/refresh - Refresh JWT token');
console.log('   GET  /api/v1/auth/verify  - Verify JWT token');

if (optionalRoutes.hcpRoutes) {
  console.log('\n🏥 HCP Insurance:');
  console.log('     GET  /api/hcp/health    - HCP health check');
  console.log('     GET  /api/hcp/packages  - Get HCP packages');
  console.log('     POST /api/hcp/quote     - Generate HCP quote');
  console.log('     POST /api/hcp/policy    - Create HCP policy');
  console.log('     POST /api/hcp/payment   - Process HCP payment');
}

if (optionalRoutes.personalAccidentRoutes) {
  console.log('\n🚑 Personal Accident Insurance:');
  console.log('     GET  /api/pa/packages   - Get PA packages');
  console.log('     POST /api/pa/quote      - Generate PA quote');
  console.log('     POST /api/pa/policy     - Create PA policy');
}

if (openApiSpec) {
  console.log('\n📖 Documentation:');
  console.log('   📚 Interactive: /docs');
  console.log('   🏠 API Portal: /api-portal');
  console.log('   📋 OpenAPI: /api-docs.json');
  
  // Show comprehensive API categories if loaded
  if (openApiSpec.tags && openApiSpec.tags.length > 10) {
    console.log('\n🎯 API Categories Available:');
    openApiSpec.tags.forEach(tag => {
      console.log(`   • ${tag.name}: ${tag.description || 'No description'}`);
    });
  }
}

console.log('=====================================\n');

module.exports = app;