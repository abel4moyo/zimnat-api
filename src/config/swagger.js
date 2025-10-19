// src/config/swagger.js
/*const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FCB-Zimnat Enterprise Integration API',
      version: '3.0.0',
      description: `
        # FCB-Zimnat Integration Platform API

        A comprehensive API solution for integrating First Capital Bank (FCB) 
        with Zimnat Insurance Company and other partners, providing a complete 
        insurance and financial services ecosystem.

        ## Features
        - 🔐 **Multi-tier Authentication**: Partner API keys and Admin access
        - 🛡️ **IP Filtering**: Whitelist/blacklist security
        - 📊 **Real-time Metrics**: Performance monitoring and analytics
        - 🔄 **Idempotency**: Safe retry mechanisms for critical operations
        - 📱 **Partner Management**: Multi-partner integration support
        - 💳 **Payment Processing**: Secure payment workflows
        - 📋 **Policy Management**: Comprehensive policy lookup and management

        ## Authentication
        This API uses two types of authentication:
        - **Partner API Key**: For standard operations (X-API-Key header)
        - **Admin API Key**: For administrative operations (X-Admin-API-Key header)

        ## Rate Limiting
        - Standard endpoints: 100 requests per minute
        - Admin endpoints: 50 requests per minute
        - Payment endpoints: 30 requests per minute

        ## Error Handling
        All errors follow a consistent format with appropriate HTTP status codes.
      `,
      contact: {
        name: 'FCB API Support Team',
        email: 'api-support@fcb.co.zw',
        url: 'https://fcb.co.zw/api-support'
      },
      license: {
        name: 'Proprietary',
        url: 'https://fcb.co.zw/api-license'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.fcb.co.zw' 
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
      {
        url: 'https://api-staging.fcb.co.zw',
        description: 'Staging server'
      }
    ],
    components: {
      securitySchemes: {
        AdminApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Admin-API-Key',
          description: 'Admin API key for administrative operations (partner management, IP filtering, etc.)'
        },
        PartnerApiKey: {
          type: 'apiKey',
          in: 'header', 
          name: 'X-API-Key',
          description: 'Partner API key for standard operations (policy lookup, payments, etc.)'
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50
          }
        },
        SearchParam: {
          name: 'search',
          in: 'query',
          description: 'Search term for filtering results',
          required: false,
          schema: {
            type: 'string'
          }
        }
      },
      schemas: {
        // Error Schemas
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-30T13:20:15.848Z'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Validation failed'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  value: { type: 'string' }
                }
              }
            },
            code: {
              type: 'string',
              example: 'VALIDATION_ERROR'
            }
          }
        },

        // Success Response Wrapper
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // Pagination Schema
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 50
            },
            total: {
              type: 'integer',
              example: 156
            },
            pages: {
              type: 'integer',
              example: 4
            }
          }
        },

        // Policy Schemas
        PolicyLookupRequest: {
          type: 'object',
          required: ['policy_identifier', 'product_code'],
          properties: {
            policy_identifier: {
              type: 'string',
              example: 'POL123456',
              description: 'Policy number, VRN, or customer reference'
            },
            product_code: {
              type: 'string',
              example: 'MOTOR_COMP',
              description: 'Product code for the policy type'
            }
          }
        },
        PolicyResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                policy_number: {
                  type: 'string',
                  example: 'POL123456'
                },
                customer_name: {
                  type: 'string',
                  example: 'John Doe'
                },
                premium_amount: {
                  type: 'number',
                  format: 'decimal',
                  example: 1250.00
                },
                status: {
                  type: 'string',
                  enum: ['ACTIVE', 'LAPSED', 'CANCELLED', 'SUSPENDED'],
                  example: 'ACTIVE'
                },
                start_date: {
                  type: 'string',
                  format: 'date',
                  example: '2025-01-01'
                },
                end_date: {
                  type: 'string',
                  format: 'date',
                  example: '2025-12-31'
                },
                cover_type: {
                  type: 'string',
                  example: 'COMPREHENSIVE'
                },
                vehicle_details: {
                  type: 'object',
                  properties: {
                    make: { type: 'string', example: 'Toyota' },
                    model: { type: 'string', example: 'Camry' },
                    year: { type: 'integer', example: 2023 },
                    vrn: { type: 'string', example: 'ABC123ZW' }
                  }
                }
              }
            }
          }
        },

        // Payment Schemas
        PaymentRequest: {
          type: 'object',
          required: ['policy_number', 'amount', 'external_reference', 'payment_method'],
          properties: {
            policy_number: {
              type: 'string',
              example: 'POL123456',
              description: 'Policy number for payment'
            },
            amount: {
              type: 'number',
              format: 'decimal',
              example: 1250.00,
              description: 'Payment amount in USD'
            },
            external_reference: {
              type: 'string',
              example: 'FCB_TXN_789012',
              description: 'Partner transaction reference'
            },
            payment_method: {
              type: 'string',
              enum: ['CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CASH'],
              example: 'CARD',
              description: 'Payment method used'
            },
            customer_account: {
              type: 'string',
              example: '1234567890',
              description: 'Customer account number (optional)'
            },
            metadata: {
              type: 'object',
              description: 'Additional payment metadata',
              properties: {
                branch_code: { type: 'string' },
                agent_id: { type: 'string' },
                channel: { type: 'string' }
              }
            }
          }
        },
        PaymentResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                transaction_id: {
                  type: 'string',
                  example: 'TXN_12345678'
                },
                status: {
                  type: 'string',
                  enum: ['SUCCESS', 'FAILED', 'PENDING', 'PROCESSING'],
                  example: 'SUCCESS'
                },
                receipt_number: {
                  type: 'string',
                  example: 'REC456789'
                },
                processed_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-07-30T13:20:15.848Z'
                },
                fees: {
                  type: 'object',
                  properties: {
                    partner_fee: { type: 'number', example: 25.00 },
                    processing_fee: { type: 'number', example: 5.00 }
                  }
                }
              }
            }
          }
        },

        // Partner Management Schemas
        PartnerRequest: {
          type: 'object',
          required: ['partner_code', 'partner_name', 'integration_type'],
          properties: {
            partner_code: {
              type: 'string',
              example: 'NEWBANK',
              description: 'Unique partner code (3-10 characters)'
            },
            partner_name: {
              type: 'string',
              example: 'New Bank Ltd',
              description: 'Partner display name'
            },
            integration_type: {
              type: 'string',
              enum: ['banking', 'insurance', 'payment', 'aggregator', 'other'],
              example: 'banking',
              description: 'Type of integration'
            },
            fee_percentage: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              maximum: 1,
              example: 0.025,
              description: 'Fee percentage (0.0 to 1.0)'
            },
            contact_email: {
              type: 'string',
              format: 'email',
              example: 'integration@newbank.com'
            },
            webhook_url: {
              type: 'string',
              format: 'uri',
              example: 'https://api.newbank.com/webhooks/fcb'
            }
          }
        },
        PartnerResponse: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            partner_code: { type: 'string', example: 'NEWBANK' },
            partner_name: { type: 'string', example: 'New Bank Ltd' },
            integration_type: { type: 'string', example: 'banking' },
            api_key: { type: 'string', example: 'pk_live_...' },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            statistics: {
              type: 'object',
              properties: {
                total_transactions: { type: 'integer', example: 1250 },
                total_revenue: { type: 'number', example: 125000.00 },
                success_rate: { type: 'number', example: 0.98 }
              }
            }
          }
        },

        // Product Schemas
        ProductRequest: {
          type: 'object',
          required: ['product_code', 'product_name', 'category_id', 'partner_id'],
          properties: {
            product_code: {
              type: 'string',
              example: 'MOTOR_COMP',
              description: 'Unique product code'
            },
            product_name: {
              type: 'string',
              example: 'Motor Comprehensive Insurance'
            },
            category_id: {
              type: 'integer',
              example: 1,
              description: 'Product category ID'
            },
            partner_id: {
              type: 'integer',
              example: 1,
              description: 'Partner ID'
            },
            base_premium: {
              type: 'number',
              format: 'decimal',
              example: 500.00
            },
            rating_factors: {
              type: 'object',
              description: 'Rating calculation factors'
            }
          }
        },

        // Customer Schema
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            customer_reference: { type: 'string', example: 'CUST001' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john.doe@email.com' },
            phone: { type: 'string', example: '+263771234567' },
            policies_count: { type: 'integer', example: 3 },
            total_premiums: { type: 'number', example: 3750.00 },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // Transaction Schema
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            transaction_id: { type: 'string', example: 'TXN_12345678' },
            policy_number: { type: 'string', example: 'POL123456' },
            amount: { type: 'number', example: 1250.00 },
            status: { 
              type: 'string', 
              enum: ['SUCCESS', 'FAILED', 'PENDING', 'PROCESSING'],
              example: 'SUCCESS' 
            },
            payment_method: { type: 'string', example: 'CARD' },
            partner_name: { type: 'string', example: 'First Capital Bank' },
            created_at: { type: 'string', format: 'date-time' },
            processed_at: { type: 'string', format: 'date-time' }
          }
        },

        // IP Filter Schema
        IPFilterRequest: {
          type: 'object',
          required: ['ip_address', 'filter_type'],
          properties: {
            ip_address: {
              type: 'string',
              example: '192.168.1.100',
              pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$',
              description: 'IP address to filter'
            },
            filter_type: {
              type: 'string',
              enum: ['whitelist', 'blacklist'],
              example: 'whitelist',
              description: 'Type of filter'
            },
            description: {
              type: 'string',
              example: 'Head Office IP address',
              description: 'Optional description for the IP filter'
            }
          }
        },

        // Health Check Schema
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', example: 123456 },
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'connected' },
                response_time: { type: 'number', example: 12 }
              }
            },
            memory: {
              type: 'object',
              properties: {
                used: { type: 'number', example: 45.6 },
                total: { type: 'number', example: 512 }
              }
            }
          }
        },

        // Metrics Schema
        MetricsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                total_requests: { type: 'integer', example: 15420 },
                success_rate: { type: 'number', example: 0.985 },
                average_response_time: { type: 'number', example: 145.6 },
                active_partners: { type: 'integer', example: 8 },
                daily_revenue: { type: 'number', example: 25600.00 },
                top_endpoints: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      endpoint: { type: 'string' },
                      requests: { type: 'integer' },
                      avg_response_time: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health & Status',
        description: 'Health checks and system status endpoints'
      },
      {
        name: 'Policies',
        description: 'Policy lookup and management operations'
      },
      {
        name: 'Payments',
        description: 'Payment processing and transaction management'
      },
      {
        name: 'Customers',
        description: 'Customer information and management'
      },
      {
        name: 'Transactions',
        description: 'Transaction history and reporting'
      },
      {
        name: 'Products',
        description: 'Insurance products and categories'
      },
      {
        name: 'Metrics',
        description: 'API analytics and performance metrics'
      },
      {
        name: 'Admin - Partners',
        description: 'Partner management (Admin only)'
      },
      {
        name: 'Admin - Products',
        description: 'Product management (Admin only)'
      },
      {
        name: 'Admin - Security',
        description: 'IP filtering and security management (Admin only)'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

// Swagger UI customization
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // Add any default headers or modifications here
      return req;
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
    .swagger-ui .scheme-container { background: #fafafa; padding: 15px; border-radius: 4px; }
  `,
  customSiteTitle: "FCB-Zimnat API Documentation",
  customfavIcon: "/favicon.ico"
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};  */

// src/config/swagger.js - Updated to use new OpenAPI specification
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const fs = require('fs');
const path = require('path');

let openApiSpec;

function loadOpenAPISpec() {
  try {
    // Load the comprehensive YAML file you provided
    const yamlPath = path.join(__dirname, '../../openapi.yaml');
    
    if (fs.existsSync(yamlPath)) {
      // Load from your comprehensive YAML file
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      openApiSpec = YAML.load(yamlContent);
      console.log('✅ Loaded comprehensive OpenAPI specification from openapi.yaml');
    } else {
      console.log('⚠️  openapi.yaml not found, falling back to generated spec');
      
      // Fallback to generated spec if YAML file doesn't exist
      const options = {
        definition: {
          openapi: '3.0.0',
          info: {
            title: 'FCB-Zimnat Integration Gateway API',
            version: '2.0.0',
            description: 'Comprehensive API gateway for FCB-Zimnat insurance and banking integration',
          },
          servers: [
            {
              url: 'http://localhost:3000',
              description: 'Development Server',
            },
            {
              url: 'https://api.fcb-zimnat.com',
              description: 'Production Environment',
            },
          ],
        },
        apis: ['./src/routes/*.js'], // paths to files containing OpenAPI definitions
      };
      
      openApiSpec = swaggerJsdoc(options);
    }
    
    return openApiSpec;
  } catch (error) {
    console.error('❌ Error loading OpenAPI specification:', error);
    return null;
  }
}

// Load the specification
openApiSpec = loadOpenAPISpec();

// Enhanced Swagger UI configuration
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

module.exports = {
  openApiSpec,
  swaggerUi,
  swaggerOptions,
  loadOpenAPISpec
};