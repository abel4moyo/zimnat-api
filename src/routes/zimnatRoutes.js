


// src/routes/zimnatRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Try to load required modules with fallbacks
let authenticateZimnat, ZimnatQuoteModel, ZimnatClaimModel, RatingModel;

try {
  authenticateZimnat = require('../middleware/authenticateZimnat');
} catch (error) {
  console.warn('Zimnat auth middleware not available, using fallback');
  authenticateZimnat = (req, res, next) => {
    // Simple fallback authentication
    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];
    
    if (authHeader || apiKey) {
      req.zimnat = { authenticated: true, user: 'zimnat_user' };
      next();
    } else {
      res.status(401).json({
        status: 'ERROR',
        errorCode: 'AUTH_REQUIRED',
        errorMessage: 'Authentication required for Zimnat API'
      });
    }
  };
}

try {
  ZimnatQuoteModel = require('../models/zimnatQuoteModel');
  ZimnatClaimModel = require('../models/zimnatClaimModel');
  RatingModel = require('../models/ratingModel');
} catch (error) {
  console.warn('Zimnat models not available:', error.message);
}

// Authentication endpoint
router.post('/api/authenticate', 
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'VALIDATION_FAILED',
          errorMessage: 'Invalid request data',
          details: errors.array()
        });
      }

      const { username, password } = req.body;
      
      // Simple authentication (enhance this with real JWT/database validation)
      if (username && password) {
        // Generate a simple token (use proper JWT in production)
        const token = `zimnat-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        logger.info('Zimnat authentication successful', { username });
        
        res.json({
          status: 'SUCCESS',
          data: {
            id_token: token,
            token_type: 'Bearer',
            expires_in: 3600,
            expires_at: new Date(Date.now() + 3600000).toISOString()
          }
        });
      } else {
        res.status(401).json({
          status: 'ERROR',
          errorCode: 'AUTH_FAILED_001',
          errorMessage: 'Invalid username or password'
        });
      }
    } catch (error) {
      logger.error('Zimnat authentication error', { error: error.message });
      next(error);
    }
  }
);

// Policy lookup endpoint
router.post('/api/v1/policy/lookup',
  authenticateZimnat,
  [
    body('identifier').notEmpty().withMessage('Identifier is required'),
    body('identifierType').isIn(['VRN', 'POLICY_NUMBER']).withMessage('Invalid identifier type'),
    body('productType').notEmpty().withMessage('Product type is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'VALIDATION_FAILED',
          errorMessage: 'Invalid request data',
          details: errors.array()
        });
      }

      const { identifier, identifierType, productType, coverOptions } = req.body;
      
      // Mock policy lookup (replace with real logic)
      const policyData = {
        policyNumber: identifier,
        policyHolderName: 'John Doe',
        productType: productType,
        premiumAmountDue: 150.75,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        outstandingBalance: 150.75,
        policyStatus: 'ACTIVE',
        allowPartialPayment: true,
        minimumPaymentAmount: 50.00
      };

      res.json({
        status: 'SUCCESS',
        data: policyData
      });
    } catch (error) {
      logger.error('Policy lookup error', { error: error.message, body: req.body });
      res.status(500).json({
        status: 'ERROR',
        errorCode: 'SYSTEM_UNAVAILABLE',
        errorMessage: 'Zimnat systems temporarily unavailable'
      });
    }
  }
);

// Premium payment confirmation endpoint
router.post('/api/v1/payment/premium/confirm',
  authenticateZimnat,
  [
    body('policyNumber').notEmpty().withMessage('Policy number is required'),
    body('amountPaid').isFloat({ min: 0.01 }).withMessage('Amount paid must be greater than 0'),
    body('bankTransactionId').notEmpty().withMessage('Bank transaction ID is required'),
    body('paymentDateTime').isISO8601().withMessage('Valid payment date time is required'),
    body('customerAccountNumber').notEmpty().withMessage('Customer account number is required'),
    body('bankReferenceNumber').notEmpty().withMessage('Bank reference number is required'),
    body('customerEmail').isEmail().withMessage('Valid customer email is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'VALIDATION_FAILED',
          errorMessage: 'Invalid request data',
          details: errors.array()
        });
      }

      const { 
        policyNumber, 
        amountPaid, 
        bankTransactionId, 
        paymentDateTime,
        customerAccountNumber,
        bankReferenceNumber,
        customerEmail,
        paymentBreakdown
      } = req.body;

      // Generate Zimnat payment reference
      const zimnatPaymentReferenceId = `ZIMNATREF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Mock payment confirmation (replace with real logic)
      const confirmationData = {
        zimnatPaymentReferenceId,
        paymentStatus: 'SUCCESS',
        policyUpdated: true,
        receiptNumber: `RCT-${Date.now()}`,
        transactionDate: new Date().toISOString(),
        confirmationNumber: `CNF-${Date.now()}`
      };

      logger.info('Premium payment confirmed', { 
        policyNumber, 
        amountPaid, 
        zimnatPaymentReferenceId 
      });

      res.json({
        status: 'SUCCESS',
        data: confirmationData
      });
    } catch (error) {
      logger.error('Payment confirmation error', { error: error.message, body: req.body });
      res.status(500).json({
        status: 'ERROR',
        errorCode: 'PAYMENT_PROCESSING_FAILED',
        errorMessage: 'Payment could not be processed',
        reconciliationRequired: true
      });
    }
  }
);

// Product catalog endpoint
router.get('/api/v1/products/catalog',
  authenticateZimnat,
  async (req, res, next) => {
    try {
      let products = [];

      if (RatingModel && RatingModel.getAllRatingTables) {
        const ratingTables = await RatingModel.getAllRatingTables();
        products = ratingTables.map(table => ({
          productId: table.product_type,
          productName: table.product_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          basePremium: table.base_premium,
          ratingFactors: JSON.parse(table.rating_factors || '{}'),
          packages: [
            {
              packageId: `${table.product_type}_BASIC`,
              packageName: 'Basic Coverage',
              description: `Basic ${table.product_type.toLowerCase()} coverage`,
              features: ['Standard coverage', 'Basic support']
            },
            {
              packageId: `${table.product_type}_PREMIUM`,
              packageName: 'Premium Coverage',
              description: `Premium ${table.product_type.toLowerCase()} coverage`,
              features: ['Extended coverage', 'Priority support', 'Additional benefits']
            }
          ]
        }));
      } else {
        // Fallback product catalog
        products = [
          {
            productId: 'MOTOR',
            productName: 'Motor Insurance',
            basePremium: 150.00,
            ratingFactors: {
              vehicleAge: { '0-3': 1.0, '4-7': 1.1, '8+': 1.3 },
              driverAge: { '18-25': 1.5, '26-35': 1.2, '36+': 1.0 }
            },
            packages: [
              {
                packageId: 'MOTOR_THIRD_PARTY',
                packageName: 'Third Party',
                description: 'Basic third party coverage',
                features: ['Third party liability', 'Legal protection']
              },
              {
                packageId: 'MOTOR_COMPREHENSIVE',
                packageName: 'Comprehensive',
                description: 'Full comprehensive coverage',
                features: ['Full coverage', 'Theft protection', 'Fire coverage']
              }
            ]
          },
          {
            productId: 'TRAVEL',
            productName: 'Travel Insurance',
            basePremium: 75.00,
            ratingFactors: {
              destination: { 'domestic': 1.0, 'regional': 1.2, 'international': 1.5 },
              duration: { '1-7': 1.0, '8-14': 1.1, '15+': 1.3 }
            },
            packages: [
              {
                packageId: 'TRAVEL_BASIC',
                packageName: 'Basic Travel',
                description: 'Essential travel coverage',
                features: ['Medical coverage', 'Trip cancellation']
              },
              {
                packageId: 'TRAVEL_PREMIUM',
                packageName: 'Premium Travel',
                description: 'Comprehensive travel coverage',
                features: ['Extended medical', 'Baggage protection', 'Emergency evacuation']
              }
            ]
          }
        ];
      }

      res.json({
        status: 'SUCCESS',
        data: { products }
      });
    } catch (error) {
      logger.error('Product catalog error', { error: error.message });
      res.status(500).json({
        status: 'ERROR',
        errorCode: 'SYSTEM_UNAVAILABLE',
        errorMessage: 'Failed to retrieve product catalog'
      });
    }
  }
);

// Quote generation endpoint
router.post('/api/v1/quote/generate',
  authenticateZimnat,
  [
    body('productType').notEmpty().withMessage('Product type is required'),
    body('packageType').notEmpty().withMessage('Package type is required'),
    body('customerInfo').isObject().withMessage('Customer info is required'),
    body('riskFactors').isObject().withMessage('Risk factors are required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'VALIDATION_FAILED',
          errorMessage: 'Invalid request data',
          details: errors.array()
        });
      }

      const { productType, packageType, customerInfo, riskFactors } = req.body;

      // Generate quote number
      const quoteNumber = `QTE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      let premiumAmount = 100.00; // Default
      let calculation = {};

      // Calculate premium using rating model if available
      if (RatingModel && RatingModel.calculatePremium) {
        try {
          calculation = await RatingModel.calculatePremium(productType, riskFactors);
          premiumAmount = calculation.totalPremium;
        } catch (calcError) {
          logger.warn('Premium calculation failed, using default', { error: calcError.message });
        }
      }

      // Create quote if model available
      if (ZimnatQuoteModel && ZimnatQuoteModel.create) {
        try {
          await ZimnatQuoteModel.create({
            quote_number: quoteNumber,
            customer_first_name: customerInfo.firstName,
            customer_last_name: customerInfo.lastName,
            customer_id_number: customerInfo.idNumber,
            product_type: productType,
            package_type: packageType,
            premium_amount: premiumAmount,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            metadata: { riskFactors, calculation }
          });
        } catch (createError) {
          logger.warn('Quote creation failed', { error: createError.message });
        }
      }

      const quoteData = {
        quoteNumber,
        productType,
        packageType,
        customerInfo,
        premiumBreakdown: {
          basePremium: calculation.basePremium || 100.00,
          riskAdjustments: premiumAmount - (calculation.basePremium || 100.00),
          totalPremium: premiumAmount,
          currency: 'USD'
        },
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        terms: 'Quote valid for 30 days from generation date'
      };

      logger.info('Quote generated successfully', { quoteNumber, productType, premiumAmount });

      res.json({
        status: 'SUCCESS',
        data: quoteData
      });
    } catch (error) {
      logger.error('Quote generation error', { error: error.message, body: req.body });
      res.status(500).json({
        status: 'ERROR',
        errorCode: 'QUOTE_GENERATION_FAILED',
        errorMessage: 'Failed to generate quote'
      });
    }
  }
);

// Policy creation endpoint
router.post('/api/v1/policy/create',
  authenticateZimnat,
  [
    body('quotationNumber').notEmpty().withMessage('Quotation number is required'),
    body('customerInfo').isObject().withMessage('Customer info is required'),
    body('paymentBreakdown').isObject().withMessage('Payment breakdown is required'),
    body('consentToDataSharing').isBoolean().withMessage('Consent to data sharing must be boolean')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'VALIDATION_FAILED',
          errorMessage: 'Invalid request data',
          details: errors.array()
        });
      }

      const { quotationNumber, customerInfo, paymentBreakdown, consentToDataSharing } = req.body;

      if (!consentToDataSharing) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'CONSENT_REQUIRED',
          errorMessage: 'Consent to data sharing is required for policy creation'
        });
      }

      // Generate policy number
      const policyNumber = `POL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const zimnatPaymentReferenceId = `ZIMREF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Mock policy creation (replace with real logic)
      const policyData = {
        policyNumber,
        zimnatPaymentReferenceId,
        paymentStatus: 'SUCCESS',
        policyIssued: true,
        documentsGenerated: true,
        effectiveDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      };

      logger.info('Policy created successfully', { 
        quotationNumber, 
        policyNumber, 
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}` 
      });

      res.json({
        status: 'SUCCESS',
        data: policyData
      });
    } catch (error) {
      logger.error('Policy creation error', { error: error.message, body: req.body });
      res.status(500).json({
        status: 'ERROR',
        errorCode: 'POLICY_CREATION_FAILED',
        errorMessage: 'Failed to create policy',
        reconciliationRequired: true
      });
    }
  }
);

// Claims processing endpoint
router.post('/api/pure/claimNumber',
  authenticateZimnat,
  [
    body('claimNumber').notEmpty().withMessage('Claim number is required'),
    body('claimDetails').isObject().withMessage('Claim details are required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'VALIDATION_FAILED',
          errorMessage: 'Invalid request data',
          details: errors.array()
        });
      }

      const { claimNumber, policyNumber, claimDetails } = req.body;

      // Check if claim already exists
      let existingClaim = null;
      if (ZimnatClaimModel && ZimnatClaimModel.findByClaimNumber) {
        try {
          existingClaim = await ZimnatClaimModel.findByClaimNumber(claimNumber);
        } catch (error) {
          logger.warn('Claim lookup failed', { error: error.message });
        }
      }

      if (existingClaim) {
        return res.status(409).json({
          status: 'ERROR',
          errorCode: 'CLAIM_EXISTS',
          errorMessage: 'Claim number already exists in the system'
        });
      }

      // Create new claim
      const referenceId = `CLAIM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      if (ZimnatClaimModel && ZimnatClaimModel.create) {
        try {
          await ZimnatClaimModel.create({
            claim_number: claimNumber,
            policy_number: policyNumber,
            status: 'PENDING',
            claim_details: claimDetails,
            reference_id: referenceId
          });
        } catch (error) {
          logger.warn('Claim creation failed', { error: error.message });
        }
      }

      logger.info('Claim processed successfully', { claimNumber, policyNumber, referenceId });

      res.status(201).json({
        status: 'SUCCESS',
        data: {
          claimNumber,
          referenceId,
          status: 'PENDING',
          message: 'Claim has been submitted and is being processed',
          estimatedProcessingTime: '5-7 business days'
        }
      });
    } catch (error) {
      logger.error('Claim processing error', { error: error.message, body: req.body });
      res.status(500).json({
        status: 'ERROR',
        errorCode: 'CLAIM_PROCESSING_FAILED',
        errorMessage: 'Failed to process claim'
      });
    }
  }
);

// ===================================================================
// ZIMNAT API v2.1 Integration Routes
// ===================================================================

// Load ZIMNAT v2.1 route modules
let zimnatAuthRoutes, enumRoutes, zimnatPaymentRoutes, motorQuoteRoutes;

try {
  zimnatAuthRoutes = require('./zimnatAuthRoutes');
  router.use('/', zimnatAuthRoutes);
  console.log('✅ ZIMNAT v2.1 Auth routes loaded');
} catch (error) {
  console.warn('⚠️  ZIMNAT v2.1 Auth routes not available:', error.message);
}

try {
  enumRoutes = require('./enumRoutes');
  router.use('/', enumRoutes);
  console.log('✅ ZIMNAT v2.1 Enum routes loaded');
} catch (error) {
  console.warn('⚠️  ZIMNAT v2.1 Enum routes not available:', error.message);
}

try {
  zimnatPaymentRoutes = require('./zimnatPaymentRoutes');
  router.use('/', zimnatPaymentRoutes);
  console.log('✅ ZIMNAT v2.1 Payment routes loaded');
} catch (error) {
  console.warn('⚠️  ZIMNAT v2.1 Payment routes not available:', error.message);
}

try {
  motorQuoteRoutes = require('./motorQuoteRoutes');
  router.use('/', motorQuoteRoutes);
  console.log('✅ ZIMNAT v2.1 Motor Quote routes loaded');
} catch (error) {
  console.warn('⚠️  ZIMNAT v2.1 Motor Quote routes not available:', error.message);
}

// Note: policyRoutes.js already contains policy search endpoints and is loaded separately in app.js

// CRITICAL: Must export the router
module.exports = router;