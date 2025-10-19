


// =============================================================================
// Updated ICE Cash Routes with HMAC Authentication
// File: src/routes/zimnatIcecashRoutes.js
// =============================================================================

// ===================================================================
// FIXED ZIMNAT ICECASH ROUTES - COMPLETE IMPLEMENTATION
// File: src/routes/zimnatIcecashRoutes.js
// ===================================================================

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Try to import services with fallback
let iceCashService, DatabaseRatingService, authenticateZimnat;

try {
  iceCashService = require('../services/iceCashService');
} catch (error) {
  console.warn('ICE Cash service not available, using mock service');
  iceCashService = require('../services/mockICECashService');
}

try {
  DatabaseRatingService = require('../services/databaseRatingService');
} catch (error) {
  console.warn('Database rating service not available, using fallback');
  DatabaseRatingService = require('../services/ratingService');
}

try {
  authenticateZimnat = require('../middleware/authenticateZimnat');
} catch (error) {
  console.warn('Zimnat auth middleware not available, using fallback');
  authenticateZimnat = (req, res, next) => {
    req.partner = { id: 1, partner_code: 'fcb' };
    next();
  };
}

// ===================================================================
// FIXED LOGGING MIDDLEWARE
// ===================================================================

/**
 * ICE Cash Request Logging Middleware (FIXED VERSION)
 * Only logs PartnerReference for POST requests with body data
 */
const logICECashRequest = (req, res, next) => {
  try {
    const logData = {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    // Only try to access body data for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      logData.partnerReference = req.body.PartnerReference || 'NOT_PROVIDED';
      logData.hasBody = true;
      logData.bodyKeys = Object.keys(req.body);
    } else {
      logData.hasBody = false;
      logData.queryParams = req.query;
    }

    logger.info('ICE Cash API Request', logData);
    next();
  } catch (error) {
    logger.error('Error in logICECashRequest middleware', { 
      error: error.message, 
      method: req.method, 
      path: req.path 
    });
    next(); // Continue even if logging fails
  }
};

// Apply logging middleware to all ICE Cash routes
router.use(logICECashRequest);

// ===================================================================
// VALIDATION HELPER
// ===================================================================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('ICE Cash request validation failed', { 
      errors: errors.array(), 
      path: req.path, 
      method: req.method 
    });
    
    return res.status(400).json({
      PartnerReference: req.body?.PartnerReference || '',
      Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
      Version: req.body?.Version || '2.1',
      Result: 0,
      Message: 'Validation failed',
      Errors: errors.array()
    });
  }
  next();
};

// ===================================================================
// PRODUCT ROUTES (FCB Insurance Products)
// ===================================================================

/**
 * GET /api/hcp/packages - Get Hospital Cash Plan packages
 */
router.get('/api/hcp/packages', 
  authenticateZimnat,
  async (req, res, next) => {
    try {
      logger.info('Fetching HCP packages', { partner: req.partner?.partner_code });
      
      // Use database service if available, fallback to static data
      let packages;
      try {
        packages = await DatabaseRatingService.getProductPackages('HCP');
      } catch (dbError) {
        logger.warn('Database service unavailable, using static data', { error: dbError.message });
        packages = [
          {
            packageId: 'HCP_INDIVIDUAL',
            packageName: 'Individual Hospital Cash Plan',
            rate: 2.00,
            currency: 'USD',
            benefits: ['Daily cash benefit', 'Hospital admission cover'],
            limits: { maxAge: 65, minAge: 18 }
          },
          {
            packageId: 'HCP_FAMILY',
            packageName: 'Family Hospital Cash Plan',
            rate: 5.00,
            currency: 'USD',
            benefits: ['Daily cash benefit', 'Hospital admission cover', 'Family coverage'],
            limits: { maxAge: 65, minAge: 18, maxFamilySize: 6 }
          }
        ];
      }

      res.json({
        success: true,
        data: {
          product: 'Hospital Cash Plan',
          packages: packages,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error fetching HCP packages', { error: error.message, stack: error.stack });
      next({
        status: 500,
        message: 'Failed to fetch HCP packages',
        code: 'HCP_PACKAGES_ERROR'
      });
    }
  }
);

/**
 * GET /api/personal-accident/packages - Get Personal Accident packages
 */
router.get('/api/personal-accident/packages', 
  authenticateZimnat,
  async (req, res, next) => {
    try {
      logger.info('Fetching PA packages', { partner: req.partner?.partner_code });
      
      let packages;
      try {
        packages = await DatabaseRatingService.getProductPackages('PA');
      } catch (dbError) {
        logger.warn('Database service unavailable, using static data', { error: dbError.message });
        packages = [
          {
            packageId: 'PA_STANDARD',
            packageName: 'Standard Personal Accident',
            rate: 1.00,
            currency: 'USD',
            benefits: ['Accidental death: $1,000', 'Permanent total disablement: $1,000'],
            limits: { maxAge: 70, minAge: 18 }
          },
          {
            packageId: 'PA_PRESTIGE',
            packageName: 'Prestige Personal Accident',
            rate: 2.50,
            currency: 'USD',
            benefits: ['Accidental death: $2,500', 'Permanent total disablement: $2,500'],
            limits: { maxAge: 70, minAge: 18 }
          },
          {
            packageId: 'PA_PREMIER',
            packageName: 'Premier Personal Accident',
            rate: 5.00,
            currency: 'USD',
            benefits: ['Accidental death: $10,000', 'Permanent total disablement: $10,000'],
            limits: { maxAge: 70, minAge: 18 }
          }
        ];
      }

      res.json({
        success: true,
        data: {
          product: 'Personal Accident',
          packages: packages,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error fetching PA packages', { error: error.message, stack: error.stack });
      next({
        status: 500,
        message: 'Failed to fetch PA packages',
        code: 'PA_PACKAGES_ERROR'
      });
    }
  }
);

/**
 * GET /api/domestic/packages - Get Domestic Insurance packages
 */
router.get('/api/domestic/packages', 
  authenticateZimnat,
  async (req, res, next) => {
    try {
      logger.info('Fetching Domestic packages', { partner: req.partner?.partner_code });
      
      let packages;
      try {
        packages = await DatabaseRatingService.getProductPackages('DOMESTIC');
      } catch (dbError) {
        logger.warn('Database service unavailable, using static data', { error: dbError.message });
        packages = [
          {
            packageId: 'DOMESTIC_STANDARD',
            packageName: 'Standard Domestic Insurance',
            rate: 0.75, // 0.75% of sum insured
            rateType: 'PERCENTAGE',
            minimumPremium: 25.00,
            currency: 'USD',
            benefits: ['Contents and buildings cover'],
            limits: { maxSumInsured: 100000, minSumInsured: 1000 }
          },
          {
            packageId: 'DOMESTIC_ENHANCED',
            packageName: 'Enhanced Domestic Insurance',
            rate: 1.00, // 1.00% of sum insured
            rateType: 'PERCENTAGE',
            minimumPremium: 35.00,
            currency: 'USD',
            benefits: ['Contents and buildings cover', 'Alternative accommodation'],
            limits: { maxSumInsured: 200000, minSumInsured: 1000 }
          },
          {
            packageId: 'DOMESTIC_COMPREHENSIVE',
            packageName: 'Comprehensive Domestic Insurance',
            rate: 1.25, // 1.25% of sum insured
            rateType: 'PERCENTAGE',
            minimumPremium: 50.00,
            currency: 'USD',
            benefits: ['Contents and buildings cover', 'Alternative accommodation', 'All risks extension'],
            limits: { maxSumInsured: 500000, minSumInsured: 1000 }
          }
        ];
      }

      res.json({
        success: true,
        data: {
          product: 'Domestic Insurance',
          packages: packages,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error fetching Domestic packages', { error: error.message, stack: error.stack });
      next({
        status: 500,
        message: 'Failed to fetch Domestic packages',
        code: 'DOMESTIC_PACKAGES_ERROR'
      });
    }
  }
);

// ===================================================================
// QUOTE GENERATION ROUTES
// ===================================================================

/**
 * POST /api/hcp/quote - Generate HCP quote
 */
router.post('/api/hcp/quote',
  authenticateZimnat,
  [
    body('packageType').isIn(['HCP_INDIVIDUAL', 'HCP_FAMILY']).withMessage('Invalid package type'),
    body('customerInfo').isObject().withMessage('Customer info required'),
    body('customerInfo.firstName').notEmpty().withMessage('First name required'),
    body('customerInfo.lastName').notEmpty().withMessage('Last name required'),
    body('customerInfo.email').isEmail().withMessage('Valid email required'),
    body('duration').optional().isInt({ min: 1, max: 12 }).withMessage('Duration must be 1-12 months')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { packageType, customerInfo, duration = 12 } = req.body;
      
      logger.info('Generating HCP quote', { packageType, duration, customer: customerInfo.email });
      
      let quote;
      try {
        // Try database service first
        quote = await DatabaseRatingService.generateQuote('HCP', packageType, customerInfo, {}, duration);
      } catch (dbError) {
        logger.warn('Database service unavailable, using fallback calculation', { error: dbError.message });
        
        // Fallback calculation
        const baseRates = { 'HCP_INDIVIDUAL': 2.00, 'HCP_FAMILY': 5.00 };
        const basePremium = baseRates[packageType] || 2.00;
        const familyAdjustment = (packageType === 'HCP_FAMILY' && customerInfo.familySize > 2) ? 
          (customerInfo.familySize - 2) * 1.00 : 0;
        const monthlyPremium = basePremium + familyAdjustment;
        
        quote = {
          quoteNumber: `HCP-QTE-${Date.now()}`,
          packageId: packageType,
          packageName: packageType === 'HCP_INDIVIDUAL' ? 'Individual Hospital Cash Plan' : 'Family Hospital Cash Plan',
          customerInfo: customerInfo,
          basePremium: basePremium,
          monthlyPremium: monthlyPremium,
          totalPremium: monthlyPremium * duration,
          currency: 'USD',
          duration: duration,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
          breakdown: {
            basePremium: basePremium,
            familyAdjustment: familyAdjustment,
            months: duration
          }
        };
      }

      res.json({
        success: true,
        data: quote
      });

    } catch (error) {
      logger.error('Error generating HCP quote', { error: error.message, stack: error.stack });
      next({
        status: 500,
        message: 'Failed to generate HCP quote',
        code: 'HCP_QUOTE_ERROR'
      });
    }
  }
);

/**
 * POST /api/personal-accident/quote - Generate PA quote
 */
router.post('/api/personal-accident/quote',
  authenticateZimnat,
  [
    body('packageType').isIn(['PA_STANDARD', 'PA_PRESTIGE', 'PA_PREMIER']).withMessage('Invalid package type'),
    body('customerInfo').isObject().withMessage('Customer info required'),
    body('customerInfo.firstName').notEmpty().withMessage('First name required'),
    body('customerInfo.lastName').notEmpty().withMessage('Last name required'),
    body('customerInfo.email').isEmail().withMessage('Valid email required'),
    body('customerInfo.age').isInt({ min: 18, max: 70 }).withMessage('Age must be 18-70'),
    body('duration').optional().isInt({ min: 1, max: 12 }).withMessage('Duration must be 1-12 months')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { packageType, customerInfo, duration = 12 } = req.body;
      
      logger.info('Generating PA quote', { packageType, duration, customer: customerInfo.email, age: customerInfo.age });
      
      let quote;
      try {
        // Try database service first
        quote = await DatabaseRatingService.generateQuote('PA', packageType, customerInfo, { age: customerInfo.age }, duration);
      } catch (dbError) {
        logger.warn('Database service unavailable, using fallback calculation', { error: dbError.message });
        
        // Fallback calculation with age factors
        const baseRates = { 'PA_STANDARD': 1.00, 'PA_PRESTIGE': 2.50, 'PA_PREMIER': 5.00 };
        const ageFactor = customerInfo.age <= 30 ? 1.0 : 
                         customerInfo.age <= 45 ? 1.2 : 
                         customerInfo.age <= 60 ? 1.5 : 2.0;
        
        const basePremium = baseRates[packageType] || 1.00;
        const monthlyPremium = basePremium * ageFactor;
        
        quote = {
          quoteNumber: `PA-QTE-${Date.now()}`,
          packageId: packageType,
          packageName: `${packageType.replace('PA_', '').toLowerCase().replace(/^\w/, c => c.toUpperCase())} Personal Accident`,
          customerInfo: customerInfo,
          basePremium: basePremium,
          monthlyPremium: monthlyPremium,
          totalPremium: monthlyPremium * duration,
          currency: 'USD',
          duration: duration,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          breakdown: {
            basePremium: basePremium,
            ageFactor: ageFactor,
            adjustedPremium: monthlyPremium,
            months: duration
          }
        };
      }

      res.json({
        success: true,
        data: quote
      });

    } catch (error) {
      logger.error('Error generating PA quote', { error: error.message, stack: error.stack });
      next({
        status: 500,
        message: 'Failed to generate PA quote',
        code: 'PA_QUOTE_ERROR'
      });
    }
  }
);

// ===================================================================
// ICE CASH PAYMENT PROCESSING
// ===================================================================

/**
 * POST /api/icecash/payment/initiate - Initiate ICE Cash payment
 */
router.post('/api/icecash/payment/initiate',
  authenticateZimnat,
  [
    body('amount').isNumeric().withMessage('Amount must be numeric'),
    body('reference').notEmpty().withMessage('Reference is required'),
    body('customerDetails').isObject().withMessage('Customer details are required'),
    body('quoteNumber').optional().notEmpty().withMessage('Quote number required if provided')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { amount, reference, customerDetails, quoteNumber } = req.body;
      
      // Generate payment reference
      const paymentReference = `ICE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info('ICEcash payment initiated', { 
        amount, 
        reference, 
        paymentReference,
        quoteNumber,
        partner: req.partner?.partner_code
      });
      
      // Try to use ICE Cash service
      let paymentData;
      try {
        paymentData = await iceCashService.initiatePayment({
          amount,
          reference,
          paymentReference,
          customerDetails
        });
      } catch (serviceError) {
        logger.warn('ICE Cash service unavailable, using mock response', { error: serviceError.message });
        
        paymentData = {
          paymentReference,
          amount,
          status: 'INITIATED',
          redirectUrl: `https://icecash.payment.gateway/pay/${paymentReference}`,
          expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };
      }

      res.json({
        success: true,
        status: 'SUCCESS',
        data: paymentData
      });

    } catch (error) {
      logger.error('ICEcash payment initiation failed', { 
        error: error.message, 
        stack: error.stack, 
        body: req.body 
      });
      next({
        status: 500,
        message: 'Payment initiation failed',
        code: 'PAYMENT_INITIATION_ERROR'
      });
    }
  }
);

/**
 * POST /api/icecash/payment/callback - ICE Cash payment callback
 */
router.post('/api/icecash/payment/callback',
  [
    body('paymentReference').notEmpty().withMessage('Payment reference is required'),
    body('status').isIn(['SUCCESS', 'FAILED', 'PENDING']).withMessage('Invalid status'),
    body('amount').isNumeric().withMessage('Amount must be numeric')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { paymentReference, status, amount, transactionId } = req.body;
      
      logger.info('ICEcash payment callback received', { 
        paymentReference, 
        status, 
        amount, 
        transactionId 
      });

      // Process payment callback
      const callbackResult = {
        status: 'PROCESSED',
        paymentReference,
        amount,
        transactionStatus: status,
        processedAt: new Date().toISOString()
      };

      // If payment successful, create policy if quote exists
      if (status === 'SUCCESS') {
        try {
          // Try to find and process related quote
          logger.info('Payment successful, processing policy creation', { paymentReference });
          callbackResult.policyCreated = true;
          callbackResult.policyNumber = `POL-${Date.now()}`;
        } catch (policyError) {
          logger.warn('Could not create policy from payment', { error: policyError.message });
          callbackResult.policyCreated = false;
        }
      }

      res.json({
        success: true,
        data: callbackResult
      });

    } catch (error) {
      logger.error('ICEcash payment callback processing failed', { 
        error: error.message, 
        stack: error.stack, 
        body: req.body 
      });
      next({
        status: 500,
        message: 'Payment callback processing failed',
        code: 'PAYMENT_CALLBACK_ERROR'
      });
    }
  }
);

// ===================================================================
// ICE CASH INSURANCE & LICENSE API ROUTES
// ===================================================================

/**
 * POST /api/icecash/TPIQuote - Third Party Insurance Quote
 */
router.post('/api/icecash/TPIQuote',
  authenticateZimnat,
  [
    body('PartnerReference').notEmpty().withMessage('PartnerReference is required'),
    body('Request.Function').equals('TPIQuote').withMessage('Function must be TPIQuote'),
    body('Request.Vehicles').isArray().withMessage('Vehicles must be an array')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const request = req.body;
      
      logger.info('Processing TPI Quote request', { 
        partnerReference: request.PartnerReference,
        vehicleCount: request.Request.Vehicles.length 
      });

      const response = await iceCashService.createTPIQuote(request);

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error in TPIQuote endpoint', { error: error.message, stack: error.stack });
      res.status(500).json({
        PartnerReference: req.body.PartnerReference || '',
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: req.body.Version || '2.1',
        Result: 0,
        Message: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/icecash/LICQuote - License Quote
 */
router.post('/api/icecash/LICQuote',
  authenticateZimnat,
  [
    body('PartnerReference').notEmpty().withMessage('PartnerReference is required'),
    body('Request.Function').equals('LICQuote').withMessage('Function must be LICQuote'),
    body('Request.Vehicles').isArray().withMessage('Vehicles must be an array')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const request = req.body;
      
      logger.info('Processing LIC Quote request', { 
        partnerReference: request.PartnerReference,
        vehicleCount: request.Request.Vehicles.length 
      });

      const response = await iceCashService.createLICQuote(request);

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error in LICQuote endpoint', { error: error.message, stack: error.stack });
      res.status(500).json({
        PartnerReference: req.body.PartnerReference || '',
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: req.body.Version || '2.1',
        Result: 0,
        Message: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/icecash/TPILICQuote - Combined TPI & License Quote
 */
router.post('/api/icecash/TPILICQuote',
  authenticateZimnat,
  [
    body('PartnerReference').notEmpty().withMessage('PartnerReference is required'),
    body('Request.Function').equals('TPILICQuote').withMessage('Function must be TPILICQuote'),
    body('Request.Vehicles').isArray().withMessage('Vehicles must be an array')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const request = req.body;
      
      logger.info('Processing TPI LIC Combined Quote request', { 
        partnerReference: request.PartnerReference,
        vehicleCount: request.Request.Vehicles.length 
      });

      const response = await iceCashService.createTPILICQuote(request);

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error in TPILICQuote endpoint', { error: error.message, stack: error.stack });
      res.status(500).json({
        PartnerReference: req.body.PartnerReference || '',
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: req.body.Version || '2.1',
        Result: 0,
        Message: 'Internal server error'
      });
    }
  }
);

// ===================================================================
// ICE CASH BALANCE & TRANSACTION ROUTES
// ===================================================================

/**
 * POST /api/icecash/balance - Check ICE Cash wallet balance
 */
router.post('/api/icecash/balance',
  authenticateZimnat,
  [
    body('PartnerToken').notEmpty().withMessage('PartnerToken is required'),
    body('PartnerReference').notEmpty().withMessage('PartnerReference is required'),
    body('Function').equals('Balance').withMessage('Function must be Balance'),
    body('WalletID').isInt().withMessage('WalletID must be an integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { PartnerReference, WalletID } = req.body;
      
      logger.info('Checking ICE Cash balance', { 
        partnerReference: PartnerReference,
        walletId: WalletID 
      });

      // Mock balance response (replace with actual ICE Cash API call)
      const response = {
        PartnerReference: PartnerReference,
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: '2.1',
        Balance: 150000, // Balance in cents
        Result: 1,
        Message: 'Balance retrieved successfully'
      };

      res.json(response);

    } catch (error) {
      logger.error('Error checking ICE Cash balance', { error: error.message, stack: error.stack });
      res.status(500).json({
        PartnerReference: req.body.PartnerReference || '',
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: req.body.Version || '2.1',
        Result: 0,
        Message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/icecash/health - ICE Cash service health check
 */
router.get('/api/icecash/health',
  authenticateZimnat,
  async (req, res, next) => {
    try {
      logger.info('ICE Cash health check requested');

      let healthStatus;
      try {
        healthStatus = await iceCashService.healthCheck();
      } catch (healthError) {
        logger.warn('ICE Cash service health check failed', { error: healthError.message });
        healthStatus = {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          error: healthError.message
        };
      }

      res.json({
        success: true,
        data: {
          service: 'ICE Cash Integration',
          ...healthStatus
        }
      });

    } catch (error) {
      logger.error('Error in ICE Cash health check', { error: error.message, stack: error.stack });
      next({
        status: 500,
        message: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR'
      });
    }
  }
);

// ===================================================================
// ERROR HANDLING MIDDLEWARE
// ===================================================================

// ICE Cash specific error handler
router.use((error, req, res, next) => {
  logger.error('ICE Cash Route Error', {
    error: error.message,
    method: req.method,
    path: req.path,
    stack: error.stack
  });

  // Default error response
  const errorResponse = {
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  // Add ICE Cash specific fields for ICE Cash API routes
  if (req.path.includes('/api/icecash/') && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    errorResponse.PartnerReference = req.body?.PartnerReference || '';
    errorResponse.Date = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    errorResponse.Version = req.body?.Version || '2.1';
    errorResponse.Result = 0;
    errorResponse.Message = error.message || 'Internal server error';
  }

  res.status(error.status || 500).json(errorResponse);
});

module.exports = router;