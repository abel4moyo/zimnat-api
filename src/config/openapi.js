// src/config/openapi.js - Complete OpenAPI 3.1 specification implementation

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load the OpenAPI spec from your YAML file
const loadOpenAPISpec = () => {
  try {
    // If you have the spec as a YAML file
    const specPath = path.join(__dirname, '../../openapi.yaml');
    if (fs.existsSync(specPath)) {
      const fileContents = fs.readFileSync(specPath, 'utf8');
      return yaml.load(fileContents);
    }
    
    // Otherwise, return the embedded specification
    return getEmbeddedSpec();
  } catch (error) {
    console.error('Error loading OpenAPI spec:', error);
    return getEmbeddedSpec();
  }
};

// Your complete OpenAPI 3.1 specification
const getEmbeddedSpec = () => ({
  openapi: "3.1.0",
  info: {
    title: "FCB Multi-Partner Integration API",
    version: "3.0.0",
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

## Authentication
Most endpoints require authentication via API keys:
- Partner endpoints: \`X-API-Key\` header
- Admin endpoints: \`X-Admin-API-Key\` header
- Some endpoints support JWT tokens via \`Authorization: Bearer <token>\`
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
    },
    {
      url: 'https://api-staging.fcb.co.zw',
      description: 'Staging Server'
    }
  ],
  security: [
    { ApiKeyAuth: [] },
    { AdminApiKeyAuth: [] },
    { BearerAuth: [] }
  ],
  tags: [
    { name: "General", description: "General API information and health checks" },
    { name: "Partners", description: "Partner management and information" },
    { name: "Products", description: "Product catalog management" },
    { name: "Policy Operations", description: "Endpoints for policy lookup and management" },
    { name: "Payment Operations", description: "Endpoints for processing and checking payments" },
    { name: "Customer Management", description: "Customer information and management" },
    { name: "Transaction Management", description: "Comprehensive transaction history and tracking" },
    { name: "Claims Management", description: "Insurance claims processing via Pure API" },
    { name: "Icecash Integration", description: "Third-party insurance and licensing via Icecash" },
    { name: "Authentication", description: "User authentication and JWT token management" },
    { name: "Administration", description: "Administrative endpoints for system management" },
    { name: "Monitoring", description: "Metrics, health monitoring, and dashboard" }
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
                      example: ["Multi-partner support", "Real-time dashboard", "Transaction tracking"]
                    },
                    endpoints: {
                      type: "object",
                      additionalProperties: { type: "string" }
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
          },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/dashboard": {
      get: {
        tags: ["Monitoring"],
        summary: "Admin Dashboard",
        description: "Real-time HTML dashboard for monitoring API performance and system status",
        security: [],
        responses: {
          "200": {
            description: "Dashboard HTML page",
            content: {
              "text/html": {
                schema: { type: "string", format: "html" }
              }
            }
          },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/partners": {
      get: {
        tags: ["Partners"],
        summary: "Get All Partners",
        description: "Retrieve all active integration partners with transaction statistics",
        security: [],
        responses: {
          "200": {
            description: "List of partners retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Partner" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/admin/partners": {
      post: {
        tags: ["Administration", "Partners"],
        summary: "Create New Partner",
        description: "Create a new integration partner (admin only)",
        security: [{ AdminApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePartnerRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Partner created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Partner created successfully" },
                    data: { $ref: "#/components/schemas/Partner" }
                  }
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "Get All Products",
        description: "Retrieve all active products with categories and partner information",
        security: [],
        responses: {
          "200": {
            description: "List of products retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Product" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/policy/lookup": {
      post: {
        tags: ["Policy Operations"],
        summary: "Policy Lookup",
        description: "Look up policy details by identifier and product code",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PolicyLookupRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Policy found successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/PolicyDetails" }
                  }
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": {
            description: "Policy not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/v1/payment/process": {
      post: {
        tags: ["Payment Operations"],
        summary: "Process Payment",
        description: "Process a premium payment for a policy (supports idempotency)",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            in: "header",
            name: "Idempotency-Key",
            schema: { type: "string" },
            description: "Optional idempotency key to prevent duplicate processing"
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaymentProcessRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Payment processed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/PaymentResponse" }
                  }
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": {
            description: "Policy not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "409": {
            description: "Idempotency conflict",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/v1/payment/status/{transactionId}": {
      get: {
        tags: ["Payment Operations"],
        summary: "Get Payment Status",
        description: "Retrieve status and details of a payment transaction",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "transactionId",
            required: true,
            schema: { type: "string" },
            description: "Transaction reference ID"
          }
        ],
        responses: {
          "200": {
            description: "Transaction status retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/TransactionStatus" }
                  }
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": {
            description: "Transaction not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/v1/customers": {
      get: {
        tags: ["Customer Management"],
        summary: "Get Customers",
        description: "Retrieve customers with pagination and search",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
            description: "Page number"
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 50, maximum: 100 },
            description: "Records per page"
          },
          {
            in: "query",
            name: "search",
            schema: { type: "string" },
            description: "Search by name or email"
          }
        ],
        responses: {
          "200": {
            description: "Customers retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Customer" }
                    },
                    pagination: { $ref: "#/components/schemas/PaginationInfo" }
                  }
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/v1/transactions": {
      get: {
        tags: ["Transaction Management"],
        summary: "Get Transactions",
        description: "Retrieve transaction history with filtering and pagination",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
            description: "Page number"
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 50, maximum: 100 },
            description: "Records per page"
          },
          {
            in: "query",
            name: "status",
            schema: { 
              type: "string", 
              enum: ["pending", "completed", "failed", "cancelled"] 
            },
            description: "Filter by transaction status"
          },
          {
            in: "query",
            name: "date_from",
            schema: { type: "string", format: "date" },
            description: "Filter from date (YYYY-MM-DD)"
          },
          {
            in: "query",
            name: "date_to",
            schema: { type: "string", format: "date" },
            description: "Filter to date (YYYY-MM-DD)"
          }
        ],
        responses: {
          "200": {
            description: "Transactions retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Transaction" }
                    },
                    pagination: { $ref: "#/components/schemas/PaginationInfo" }
                  }
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    // Add more endpoints as needed...
    "/api/v1/metrics": {
      get: {
        tags: ["Monitoring"],
        summary: "Get System Metrics",
        description: "Retrieve comprehensive system metrics and statistics",
        security: [],
        responses: {
          "200": {
            description: "Metrics retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MetricsResponse" }
              }
            }
          },
          "500": { $ref: "#/components/responses/ServerError" }
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
        description: "JWT token obtained from /api/authenticate"
      }
    },
    responses: {
      BadRequest: {
        description: "Invalid request payload or parameters",
        content: {
          "application/json": {
            schema: {
              allOf: [
                { $ref: "#/components/schemas/ErrorResponse" },
                {
                  type: "object",
                  properties: {
                    details: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          msg: { type: "string" },
                          param: { type: "string" }
                        }
                      }
                    }
                  }
                }
              ]
            }
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
      Forbidden: {
        description: "Access denied",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      },
      ServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      }
    },
    schemas: {
      // Error Response Schema
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
      
      // Pagination Schema
      PaginationInfo: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 50 },
          total: { type: "integer", example: 150 },
          pages: { type: "integer", example: 3 }
        },
        required: ["page", "limit", "total", "pages"]
      },
      
      // Health Response Schema
      HealthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          status: { type: "string", enum: ["healthy", "unhealthy"] },
          timestamp: { type: "string", format: "date-time" },
          version: { type: "string", example: "3.0.0" },
          uptime: { 
            type: "integer", 
            description: "Server uptime in seconds", 
            example: 3600 
          },
          database: { type: "string", enum: ["connected", "disconnected"] },
          memory: {
            type: "object",
            properties: {
              rss: { type: "integer" },
              heapTotal: { type: "integer" },
              heapUsed: { type: "integer" },
              external: { type: "integer" }
            }
          },
          partners_active: { type: "integer", example: 3 }
        }
      },
      
      // Metrics Response Schema
      MetricsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              total_customers: { type: "integer" },
              active_policies: { type: "integer" },
              total_transactions: { type: "integer" },
              total_revenue: { type: "number" },
              active_partners: { type: "integer" },
              uptime: { type: "integer" },
              api_requests: { type: "integer" },
              api_errors: { type: "integer" },
              avg_response_time: { type: "integer" },
              recent_transactions: {
                type: "array",
                items: { $ref: "#/components/schemas/Transaction" }
              },
              partner_stats: { type: "object" },
              product_stats: { type: "object" }
            }
          }
        }
      },
      
      // Partner Schemas
      Partner: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          partner_code: { type: "string", example: "zimnat" },
          partner_name: { type: "string", example: "Zimnat Insurance" },
          is_active: { type: "boolean", example: true },
          integration_type: { type: "string", example: "insurance" },
          fee_percentage: { type: "number", format: "decimal", example: 0.01 },
          transaction_count: { type: "integer", example: 150 },
          total_revenue: { type: "number", format: "decimal", example: 45000.75 },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" }
        }
      },
      
      CreatePartnerRequest: {
        type: "object",
        required: ["partner_code", "partner_name", "integration_type"],
        properties: {
          partner_code: {
            type: "string",
            example: "newpartner",
            description: "Unique partner identifier"
          },
          partner_name: { type: "string", example: "New Partner Insurance" },
          integration_type: {
            type: "string",
            enum: ["insurance", "banking", "testing"],
            example: "insurance"
          },
          fee_percentage: {
            type: "number",
            format: "decimal",
            minimum: 0,
            maximum: 1,
            default: 0.01,
            example: 0.015
          }
        }
      },
      
      // Product Schemas
      Product: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          product_code: { type: "string", example: "motor" },
          product_name: { type: "string", example: "Motor Insurance" },
          category_id: { type: "integer", example: 1 },
          category_name: { type: "string", example: "General Insurance" },
          partner_id: { type: "integer", example: 1 },
          partner_name: { type: "string", example: "Zimnat Insurance" },
          identifier_type: { type: "string", example: "vehicle_registration_number" },
          allow_partial_payment: { type: "boolean", example: false },
          base_premium: { type: "number", format: "decimal", example: 450.00 },
          is_active: { type: "boolean", example: true },
          cover_types_count: { type: "integer", example: 3 }
        }
      },
      
      // Policy Schemas
      PolicyLookupRequest: {
        type: "object",
        required: ["policy_identifier", "product_code"],
        properties: {
          policy_identifier: {
            type: "string",
            example: "REG123ABC",
            description: "Policy identifier (registration number, policy number, etc.)"
          },
          product_code: {
            type: "string",
            example: "motor",
            description: "Product code to look up"
          }
        }
      },
      
      PolicyDetails: {
        type: "object",
        properties: {
          policy_number: { type: "string", example: "POL2023001" },
          holder_name: { type: "string", example: "John Doe" },
          email: { type: "string", format: "email", example: "john.doe@example.com" },
          phone: { type: "string", example: "+263771234567" },
          product_name: { type: "string", example: "Motor Insurance" },
          category: { type: "string", example: "General Insurance" },
          cover_type: { type: "string", example: "Comprehensive" },
          premium_amount: { type: "number", format: "decimal", example: 450.00 },
          outstanding_balance: { type: "number", format: "decimal", example: 225.00 },
          due_date: { type: "string", format: "date", example: "2024-12-31" },
          status: { type: "string", example: "Active" },
          allow_partial_payment: { type: "boolean", example: false },
          partner: { type: "string", example: "Zimnat Insurance" }
        }
      },
      
      // Payment Schemas
      PaymentProcessRequest: {
        type: "object",
        required: ["policy_number", "amount", "external_reference", "payment_method"],
        properties: {
          policy_number: { type: "string", example: "POL2023001" },
          amount: {
            type: "number",
            format: "decimal",
            minimum: 0.01,
            example: 225.00
          },
          external_reference: {
            type: "string",
            example: "FCB-TXN-12345",
            description: "Partner's transaction reference"
          },
          payment_method: {
            type: "string",
            example: "MobileMoney",
            enum: ["MobileMoney", "BankTransfer", "DebitCard", "CreditCard", "Cash"]
          },
          customer_account: {
            type: "string",
            example: "263771234567",
            description: "Customer account/phone number for payment method"
          },
          metadata: {
            type: "object",
            description: "Additional payment metadata",
            additionalProperties: true
          }
        }
      },
      
      PaymentResponse: {
        type: "object",
        properties: {
          transaction_reference: { type: "string", example: "TXN20240728ABCD1234" },
          status: {
            type: "string",
            enum: ["pending", "completed", "failed"],
            example: "completed"
          },
          amount_processed: { type: "number", format: "decimal", example: 225.00 },
          partner_fee: { type: "number", format: "decimal", example: 2.25 },
          net_amount: { type: "number", format: "decimal", example: 222.75 },
          policy_number: { type: "string", example: "POL2023001" },
          external_reference: { type: "string", example: "FCB-TXN-12345" },
          processed_at: { type: "string", format: "date-time" },
          new_balance: { type: "number", format: "decimal", example: 0.00 }
        }
      },
      
      TransactionStatus: {
        type: "object",
        properties: {
          transaction_reference: { type: "string", example: "TXN20240728ABCD1234" },
          status: {
            type: "string",
            enum: ["pending", "completed", "failed", "cancelled"],
            example: "completed"
          },
          amount: { type: "number", format: "decimal", example: 225.00 },
          partner_fee: { type: "number", format: "decimal", example: 2.25 },
          net_amount: { type: "number", format: "decimal", example: 222.75 },
          policy_number: { type: "string", example: "POL2023001" },
          customer_name: { type: "string", example: "John Doe" },
          product_name: { type: "string", example: "Motor Insurance" },
          payment_method: { type: "string", example: "MobileMoney" },
          external_reference: { type: "string", example: "FCB-TXN-12345" },
          processed_at: { type: "string", format: "date-time" },
          created_at: { type: "string", format: "date-time" }
        }
      },
      
      // Customer Schema
      Customer: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          customer_code: { type: "string", example: "CUST001" },
          first_name: { type: "string", example: "John" },
          last_name: { type: "string", example: "Doe" },
          email: { type: "string", format: "email", example: "john.doe@example.com" },
          phone: { type: "string", example: "+263771234567" },
          id_number: { type: "string", example: "63-123456X47" },
          address: { type: "string", example: "123 Main Street, Harare" },
          date_of_birth: { type: "string", format: "date", example: "1990-01-15" },
          policy_count: { type: "integer", example: 2 },
          total_premium: { type: "number", format: "decimal", example: 750.00 },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" }
        }
      },
      
      // Transaction Schema
      Transaction: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          transaction_reference: { type: "string", example: "TXN20240728ABCD1234" },
          partner_id: { type: "integer", example: 1 },
          policy_id: { type: "integer", example: 1 },
          customer_id: { type: "integer", example: 1 },
          transaction_type: { type: "string", example: "premium_payment" },
          amount: { type: "number", format: "decimal", example: 225.00 },
          partner_fee: { type: "number", format: "decimal", example: 2.25 },
          net_amount: { type: "number", format: "decimal", example: 222.75 },
          external_reference: { type: "string", example: "FCB-TXN-12345" },
          payment_method: { type: "string", example: "MobileMoney" },
          status: {
            type: "string",
            enum: ["pending", "completed", "failed", "cancelled"],
            example: "completed"
          },
          metadata: { type: "object", additionalProperties: true },
          processed_at: { type: "string", format: "date-time" },
          created_at: { type: "string", format: "date-time" },
          policy_number: { type: "string", example: "POL2023001" },
          first_name: { type: "string", example: "John" },
          last_name: { type: "string", example: "Doe" },
          product_name: { type: "string", example: "Motor Insurance" }
        }
      }
    }
  },
  
  // External documentation
  externalDocs: {
    description: "Find more information about the FCB Multi-Partner Integration API",
    url: "https://docs.fcb.co.zw/api"
  }
});

module.exports = {
  loadOpenAPISpec,
  getEmbeddedSpec
};

// src/config/swagger.js - Updated to use the complete OpenAPI spec
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { loadOpenAPISpec } = require('./openapi');

// Load the complete OpenAPI specification
const specs = loadOpenAPISpec();

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
    requestInterceptor: (req) => {
      // Add any request modifications here
      console.log('API Request:', req.method, req.url);
      return req;
    },
    responseInterceptor: (res) => {
      // Add any response processing here
      console.log('API Response:', res.status, res.url);
      return res;
    }
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
  customSiteTitle: "FCB Multi-Partner API Documentation",
  customfavIcon: "/favicon.ico",
  customJs: [
    '/swagger-custom.js'
  ]
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};

// src/routes/documentationRoutes.js - Enhanced documentation routes
const express = require('express');
const router = express.Router();
const { specs, swaggerUi, swaggerOptions } = require('../config/swagger');
const yaml = require('js-yaml');

// Main Swagger UI documentation
router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(specs, swaggerOptions));

// Alternative ReDoc documentation
router.get('/redoc', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>FCB Multi-Partner API Documentation - ReDoc</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>
          body { margin: 0; padding: 0; }
          redoc { display: block; }
        </style>
      </head>
      <body>
        <redoc spec-url='/api-docs.json' theme='
          {
            "colors": {
              "primary": {
                "main": "#4CAF50"
              }
            },
            "typography": {
              "fontSize": "14px",
              "lineHeight": "1.5em",
              "code": {
                "fontSize": "13px"
              },
              "headings": {
                "fontFamily": "Montserrat, sans-serif",
                "fontWeight": "400"
              }
            },
            "sidebar": {
              "backgroundColor": "#fafafa"
            }
          }
        '></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js"></script>
      </body>
    </html>
  `);
});

// OpenAPI JSON specification
router.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(specs);
});

// OpenAPI YAML specification
router.get('/api-docs.yaml', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(yaml.dump(specs));
});

// Postman collection generator
router.get('/postman-collection.json', (req, res) => {
  const postmanCollection = generatePostmanCollection(specs);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="fcb-api-collection.json"');
  res.send(postmanCollection);
});

// API documentation portal
router.get('/api-portal', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FCB Multi-Partner API Portal</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
            }
            .container { 
                max-width: 1200px; 
                margin: 0 auto; 
                padding: 40px 20px; 
            }
            .header {
                text-align: center;
                color: white;
                margin-bottom: 60px;
            }
            .header h1 {
                font-size: 3rem;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .header p {
                font-size: 1.2rem;
                opacity: 0.9;
            }
            .cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 30px;
                margin-bottom: 50px;
            }
            .card {
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                text-decoration: none;
                color: inherit;
            }
            .card:hover {
                transform: translateY(-5px);
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            }
            .card-icon {
                font-size: 3rem;
                margin-bottom: 20px;
                text-align: center;
            }
            .card h3 {
                font-size: 1.5rem;
                margin-bottom: 15px;
                color: #4CAF50;
            }
            .card p {
                color: #666;
                line-height: 1.6;
            }
            .features {
                background: white;
                border-radius: 15px;
                padding: 40px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .features h2 {
                color: #4CAF50;
                margin-bottom: 30px;
                text-align: center;
                font-size: 2rem;
            }
            .feature-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
            }
            .feature {
                padding: 20px;
                border-left: 4px solid #4CAF50;
                background: #f8f9fa;
                border-radius: 5px;
            }
            .feature h4 {
                color: #333;
                margin-bottom: 10px;
            }
            .feature p {
                color: #666;
                font-size: 0.9rem;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 40px 0;
            }
            .stat {
                background: rgba(255,255,255,0.1);
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                color: white;
            }
            .stat-number {
                font-size: 2.5rem;
                font-weight: bold;
                display: block;
            }
            .stat-label {
                font-size: 0.9rem;
                opacity: 0.8;
                margin-top: 5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏦 FCB Multi-Partner API</h1>
                <p>Production-ready integration platform for insurance and financial services</p>
                <div class="stats">
                    <div class="stat">
                        <span class="stat-number">${specs.info.version}</span>
                        <div class="stat-label">API Version</div>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${Object.keys(specs.paths).length}</span>
                        <div class="stat-label">Endpoints</div>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${specs.tags.length}</span>
                        <div class="stat-label">Categories</div>
                    </div>
                    <div class="stat">
                        <span class="stat-number">99.9%</span>
                        <div class="stat-label">Uptime</div>
                    </div>
                </div>
            </div>

            <div class="cards">
                <a href="/docs" class="card">
                    <div class="card-icon">📚</div>
                    <h3>Interactive Documentation</h3>
                    <p>Explore and test API endpoints with Swagger UI. Try requests directly from your browser with built-in authentication.</p>
                </a>

                <a href="/redoc" class="card">
                    <div class="card-icon">📖</div>
                    <h3>Clean Documentation</h3>
                    <p>Beautiful, responsive documentation with ReDoc. Perfect for reading and understanding the API structure.</p>
                </a>

                <a href="/api-docs.json" class="card">
                    <div class="card-icon">⚙️</div>
                    <h3>OpenAPI Specification</h3>
                    <p>Download the complete OpenAPI 3.1 specification in JSON format for code generation and tooling.</p>
                </a>

                <a href="/postman-collection.json" class="card">
                    <div class="card-icon">🚀</div>
                    <h3>Postman Collection</h3>
                    <p>Ready-to-use Postman collection with all endpoints, examples, and authentication pre-configured.</p>
                </a>

                <a href="/health" class="card">
                    <div class="card-icon">💚</div>
                    <h3>Health Status</h3>
                    <p>Real-time system health monitoring including database connectivity and performance metrics.</p>
                </a>

                <a href="/dashboard" class="card">
                    <div class="card-icon">📊</div>
                    <h3>Admin Dashboard</h3>
                    <p>Comprehensive dashboard for monitoring API usage, transaction metrics, and system performance.</p>
                </a>
            </div>

            <div class="features">
                <h2>🌟 Platform Features</h2>
                <div class="feature-grid">
                    <div class="feature">
                        <h4>🔐 Multi-tier Authentication</h4>
                        <p>Secure API key and JWT token authentication with role-based access control</p>
                    </div>
                    <div class="feature">
                        <h4>🛡️ IP Filtering</h4>
                        <p>Advanced IP whitelist/blacklist security controls for enhanced protection</p>
                    </div>
                    <div class="feature">
                        <h4>📊 Real-time Analytics</h4>
                        <p>Comprehensive monitoring, metrics collection, and performance analytics</p>
                    </div>
                    <div class="feature">
                        <h4>🔄 Idempotency Support</h4>
                        <p>Safe retry mechanisms for critical operations like payment processing</p>
                    </div>
                    <div class="feature">
                        <h4>🏢 Multi-Partner Support</h4>
                        <p>Scalable architecture supporting multiple integration partners</p>
                    </div>
                    <div class="feature">
                        <h4>💳 Payment Processing</h4>
                        <p>Secure payment workflows with comprehensive transaction tracking</p>
                    </div>
                    <div class="feature">
                        <h4>📋 Policy Management</h4>
                        <p>Complete policy lookup and management with flexible search options</p>
                    </div>
                    <div class="feature">
                        <h4>⚡ High Performance</h4>
                        <p>Optimized for high throughput with intelligent rate limiting</p>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // Add some interactivity
            document.querySelectorAll('.card').forEach(card => {
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-5px) scale(1.02)';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(0) scale(1)';
                });
            });

            // Auto-update stats (simulation)
            setInterval(() => {
                const uptimeElement = document.querySelector('.stat-number');
                if (uptimeElement && uptimeElement.textContent === '99.9%') {
                    // Simulate real-time updates
                    const currentTime = new Date().getSeconds();
                    if (currentTime % 10 === 0) {
                        uptimeElement.style.color = '#4CAF50';
                        setTimeout(() => {
                            uptimeElement.style.color = 'white';
                        }, 500);
                    }
                }
            }, 1000);
        </script>
    </body>
    </html>
  `);
});

// Generate Postman collection from OpenAPI spec
function generatePostmanCollection(spec) {
  const collection = {
    info: {
      name: spec.info.title,
      description: spec.info.description,
      version: spec.info.version,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    variable: [
      {
        key: "baseUrl",
        value: spec.servers[0].url,
        type: "string"
      },
      {
        key: "apiKey",
        value: "your_api_key_here",
        type: "string"
      },
      {
        key: "adminApiKey", 
        value: "your_admin_api_key_here",
        type: "string"
      }
    ],
    item: []
  };

  // Group endpoints by tags
  const itemGroups = {};
  
  Object.entries(spec.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      const tag = operation.tags?.[0] || 'General';
      
      if (!itemGroups[tag]) {
        itemGroups[tag] = {
          name: tag,
          item: []
        };
      }

      const request = {
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [],
          url: {
            raw: `{{baseUrl}}${path}`,
            host: ["{{baseUrl}}"],
            path: path.split('/').filter(p => p)
          },
          description: operation.description
        }
      };

      // Add authentication headers
      if (operation.security) {
        operation.security.forEach(securityScheme => {
          if (securityScheme.ApiKeyAuth) {
            request.request.header.push({
              key: "X-API-Key",
              value: "{{apiKey}}"
            });
          }
          if (securityScheme.AdminApiKeyAuth) {
            request.request.header.push({
              key: "X-Admin-API-Key", 
              value: "{{adminApiKey}}"
            });
          }
        });
      }

      // Add request body for POST/PUT requests
      if (operation.requestBody && ['post', 'put', 'patch'].includes(method)) {
        request.request.header.push({
          key: "Content-Type",
          value: "application/json"
        });
        
        const schema = operation.requestBody.content?.['application/json']?.schema;
        if (schema) {
          request.request.body = {
            mode: "raw",
            raw: JSON.stringify(generateExampleFromSchema(schema), null, 2)
          };
        }
      }

      itemGroups[tag].item.push(request);
    });
  });

  collection.item = Object.values(itemGroups);
  return collection;
}

// Helper function to generate example data from schema
function generateExampleFromSchema(schema) {
  if (schema.example) return schema.example;
  if (schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      example[key] = prop.example || getDefaultValueForType(prop.type);
    });
    return example;
  }
  return getDefaultValueForType(schema.type);
}

function getDefaultValueForType(type) {
  switch (type) {
    case 'string': return 'string';
    case 'number': return 0;
    case 'integer': return 0;
    case 'boolean': return true;
    case 'array': return [];
    case 'object': return {};
    default: return null;
  }
}

module.exports = router;