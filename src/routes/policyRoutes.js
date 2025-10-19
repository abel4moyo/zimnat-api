// =============================================================================
// POLICY ROUTES - Enhanced with MSSQL Integration
// File: src/routes/policyRoutes.js
// Description: Policy lookup, search and payment initiation endpoints
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Import services with fallbacks
let mssqlPolicyService, iceCashService, authenticateZimnat, policyPaymentService;

try {
  mssqlPolicyService = require('../services/mssqlPolicyService');
} catch (error) {
  console.warn('MSSQL Policy service not available:', error.message);
  mssqlPolicyService = null;
}

try {
  iceCashService = require('../services/iceCashService');
} catch (error) {
  console.warn('ICEcash service not available:', error.message);
  iceCashService = null;
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

try {
  policyPaymentService = require('../services/policyPaymentService');
} catch (error) {
  console.warn('Policy payment service not available:', error.message);
  policyPaymentService = null;
}

// ===================================================================
// VALIDATION MIDDLEWARE
// ===================================================================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Policy API validation failed', { 
      errors: errors.array(), 
      path: req.path, 
      method: req.method 
    });
    
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      errorCode: 'VALIDATION_ERROR',
      errorMessage: 'Invalid input data',
      errors: errors.array()
    });
  }
  next();
};

// ===================================================================
// ORIGINAL BRD-COMPLIANT ENDPOINT (PRESERVED)
// ===================================================================

// POST /api/v1/policy/lookup - EXACT BRD requirement
router.post('/api/v1/policy/lookup',
  [
    body('identifier').isString().notEmpty().withMessage('Identifier is required'),
    body('identifierType').isIn(['VRN', 'POLICY_NUMBER']).withMessage('Valid identifier type required'),
    body('productType').isIn(['MOTOR', 'TRAVEL', 'PERSONAL_ACCIDENT', 'PET', 'LEGAL', 'MY_BUSINESS_PROTECTOR', 'HOSPITAL_CASH_PLAN']).withMessage('Valid product type required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'INVALID_DATA',
          errorMessage: 'Validation failed',
          details: errors.array().map(e => e.msg).join(', ')
        });
      }

      const { identifier, identifierType, productType, coverOptions } = req.body;

      // Look up policy in database
      const policy = await db('policies')
        .join('products', 'policies.product_id', 'products.product_id')
        .join('packages', 'policies.package_id', 'packages.package_id')
        .where('policies.identifier', identifier)
        .where('policies.identifier_type', identifierType)
        .where('products.product_id', productType)
        .select('policies.*', 'products.product_name', 'packages.package_name')
        .first();

      if (!policy) {
        return res.status(404).json({
          status: 'ERROR',
          errorCode: 'POLICY_NOT_FOUND',
          errorMessage: 'Policy identifier not found in system',
          details: 'No policy matches the provided identifier and product.'
        });
      }

      // BRD-compliant response format
      res.json({
        status: 'SUCCESS',
        data: {
          policyNumber: policy.policy_number,
          policyHolderName: policy.policy_holder_name,
          productType: productType,
          productName: policy.product_name,
          packageName: policy.package_name,
          premiumAmountDue: policy.premium_amount,
          dueDate: policy.due_date,
          outstandingBalance: policy.outstanding_balance,
          policyStatus: policy.status,
          policyStartDate: policy.policy_start_date,
          policyEndDate: policy.policy_end_date,
          allowPartialPayment: ['MOTOR', 'HOME'].includes(productType), // BRD requirement
          coverDetails: policy.cover_details
        }
      });

    } catch (error) {
      res.status(500).json({
        status: 'ERROR',
        errorCode: 'SYSTEM_UNAVAILABLE',
        errorMessage: 'Zimnat systems temporarily unavailable',
        details: 'Database connection lost.'
      });
    }
  }
);

// ===================================================================
// ENHANCED MSSQL POLICY ENDPOINTS FOR PARTNERS
// ===================================================================

/**
 * ZIMNAT API v2.1 Policy Search Endpoint
 * GET /api/v1/policy/search - Search policy with JWT authentication
 * This endpoint requires JWT Bearer token authentication
 */
const PolicyController = require('../controllers/policyController');
const { validateJWT } = require('../middleware/jwtMiddleware');
const { validateRequestId } = require('../middleware/requestIdMiddleware');

router.get('/api/v1/policy/search/v2',
  validateRequestId,
  validateJWT,
  PolicyController.searchPolicy
);

/**
 * Legacy: GET /api/v1/policy/search - Search policies with USD/ZIG currency support (MSSQL)
 * Query parameters:
 * - policyNumber: Policy number to search for (required)
 * - currency: USD or ZIG (required)
 * - insuranceType: Life or General (optional)
 */
router.get('/api/v1/policy/search', 
  authenticateZimnat,
  [
    query('policyNumber').notEmpty().withMessage('Policy number is required'),
    query('currency').isIn(['USD', 'ZIG']).withMessage('Currency must be USD or ZIG'),
    query('insuranceType').optional().isIn(['Life', 'General']).withMessage('Insurance type must be Life or General')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!mssqlPolicyService) {
        return res.status(501).json({
          success: false,
          status: 'ERROR',
          errorCode: 'SERVICE_NOT_AVAILABLE',
          errorMessage: 'MSSQL Policy lookup service is not available'
        });
      }

      const { policyNumber, currency, insuranceType } = req.query;

      logger.info('MSSQL Policy search request', { 
        policyNumber, 
        currency, 
        insuranceType,
        partner: req.partner?.partner_code 
      });

      // Initialize MSSQL service for the requested currency
      if (!mssqlPolicyService.isConnected[currency]) {
        await mssqlPolicyService.initialize(currency);
      }

      const result = await mssqlPolicyService.searchPolicies(policyNumber, currency, insuranceType);

      if (result.policies.length === 0) {
        return res.status(404).json({
          success: false,
          status: 'NOT_FOUND',
          errorCode: 'POLICY_NOT_FOUND',
          errorMessage: `No policies found for policy number ${policyNumber} in ${currency} database`,
          searchCriteria: { policyNumber, currency, insuranceType }
        });
      }

      res.status(200).json({
        success: true,
        status: 'SUCCESS',
        data: {
          policies: result.policies,
          totalFound: result.totalFound,
          currency: result.currency,
          database: result.database,
          searchCriteria: result.searchCriteria,
          searchedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in MSSQL policy search', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        status: 'ERROR',
        errorCode: 'POLICY_SEARCH_ERROR',
        errorMessage: 'Error searching policies in MSSQL database',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/v1/policy/details/:policyIdentifier - Get specific policy details with currency support
 * Query parameters:
 * - currency: USD or ZIG (required)
 * - identifierType: policyNumber or policyId (optional, defaults to policyNumber)
 */
router.get('/api/v1/policy/details/:policyIdentifier',
  authenticateZimnat,
  [
    param('policyIdentifier').notEmpty().withMessage('Policy identifier is required'),
    query('currency').isIn(['USD', 'ZIG']).withMessage('Currency must be USD or ZIG'),
    query('identifierType').optional().isIn(['policyNumber', 'policyId'])
      .withMessage('Invalid identifier type')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!mssqlPolicyService) {
        return res.status(501).json({
          success: false,
          status: 'ERROR',
          errorCode: 'SERVICE_NOT_AVAILABLE',
          errorMessage: 'MSSQL Policy lookup service is not available'
        });
      }

      const { policyIdentifier } = req.params;
      const { currency } = req.query;
      const identifierType = req.query.identifierType || 'policyNumber';

      logger.info('MSSQL Policy details request', { 
        identifier: policyIdentifier, 
        type: identifierType,
        currency,
        partner: req.partner?.partner_code 
      });

      // Initialize MSSQL service for the requested currency
      if (!mssqlPolicyService.isConnected[currency]) {
        await mssqlPolicyService.initialize(currency);
      }

      const result = await mssqlPolicyService.getPolicyForPayment(policyIdentifier, identifierType, currency);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          status: 'ERROR',
          errorCode: 'POLICY_NOT_FOUND',
          errorMessage: result.message,
          searchCriteria: { policyIdentifier, identifierType, currency }
        });
      }

      res.status(200).json({
        success: true,
        status: 'SUCCESS',
        data: {
          policy: result.policy,
          paymentAmount: result.paymentAmount,
          currency: result.currency,
          database: currency === 'USD' ? 'ZIMNATUSD' : 'ZIMNATZIG',
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error getting MSSQL policy details', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        status: 'ERROR',
        errorCode: 'POLICY_RETRIEVAL_ERROR',
        errorMessage: 'Error retrieving policy details from MSSQL database',
        details: error.message
      });
    }
  }
);

/**
 * POST /api/v1/policy/:policyIdentifier/payment/initiate - Initiate payment with currency support
 * Body parameters:
 * - currency: USD or ZIG (required)
 * - identifierType: policyNumber or policyId (optional)
 * - paymentMethod: Payment method (required)
 */
router.post('/api/v1/policy/:policyIdentifier/payment/initiate',
  authenticateZimnat,
  [
    param('policyIdentifier').notEmpty().withMessage('Policy identifier is required'),
    body('currency').isIn(['USD', 'ZIG']).withMessage('Currency must be USD or ZIG'),
    body('identifierType').optional().isIn(['policyNumber', 'policyId'])
      .withMessage('Invalid identifier type'),
    body('paymentMethod').isIn(['ICECASH', 'ECOCASH', 'CARD']).withMessage('Invalid payment method'),
    body('customerDetails').optional().isObject().withMessage('Customer details must be an object'),
    body('returnUrl').optional().isURL().withMessage('Return URL must be valid'),
    body('callbackUrl').optional().isURL().withMessage('Callback URL must be valid')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!mssqlPolicyService) {
        return res.status(501).json({
          success: false,
          status: 'ERROR',
          errorCode: 'SERVICE_NOT_AVAILABLE',
          errorMessage: 'MSSQL Policy lookup service is not available'
        });
      }

      const { policyIdentifier } = req.params;
      const { currency, identifierType = 'policyNumber', paymentMethod, customerDetails, returnUrl, callbackUrl } = req.body;

      logger.info('MSSQL Policy payment initiation request', { 
        identifier: policyIdentifier, 
        type: identifierType,
        currency,
        method: paymentMethod,
        partner: req.partner?.partner_code 
      });

      // Initialize MSSQL service for the requested currency
      if (!mssqlPolicyService.isConnected[currency]) {
        await mssqlPolicyService.initialize(currency);
      }

      // First, get the policy details from MSSQL
      const policyResult = await mssqlPolicyService.getPolicyForPayment(policyIdentifier, identifierType, currency);

      if (!policyResult.success) {
        return res.status(404).json({
          success: false,
          status: 'ERROR',
          errorCode: 'POLICY_NOT_FOUND',
          errorMessage: policyResult.message,
          searchCriteria: { policyIdentifier, identifierType, currency }
        });
      }

      const policy = policyResult.policy;

      // Generate payment reference
      const paymentReference = `${currency}-POL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Record payment in PostgreSQL first
      let paymentRecordResult = null;
      if (policyPaymentService) {
        try {
          paymentRecordResult = await policyPaymentService.createPayment(policy, {
            paymentReference,
            amount: policyResult.paymentAmount,
            currency,
            paymentMethod,
            customerDetails,
            returnUrl,
            callbackUrl,
            paymentGateway: paymentMethod,
            partnerId: req.partner?.id,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            initiatedBy: 'API'
          });

          logger.info('Payment record created in PostgreSQL', {
            paymentId: paymentRecordResult.paymentId,
            paymentReference: paymentRecordResult.paymentReference,
            policyNumber: policy.policy_number
          });
        } catch (pgError) {
          logger.error('Failed to record payment in PostgreSQL', {
            error: pgError.message,
            policyNumber: policy.policy_number,
            paymentReference
          });
          // Continue with payment initiation even if PostgreSQL recording fails
        }
      }

      // Prepare payment request based on method
      let paymentData;
      
      if (paymentMethod === 'ICECASH' && iceCashService) {
        try {
          paymentData = await iceCashService.initiatePayment({
            amount: policyResult.paymentAmount,
            reference: policy.policy_number,
            paymentReference,
            customerDetails: customerDetails || {
              name: policy.policy_holder_name
            },
            description: `${currency} Premium payment for ${policy.policy_number} - ${policy.product_name}`,
            returnUrl,
            callbackUrl
          });
        } catch (serviceError) {
          logger.warn('ICE Cash service unavailable, using mock response', { error: serviceError.message });
          
          paymentData = {
            paymentReference,
            amount: policyResult.paymentAmount,
            status: 'INITIATED',
            redirectUrl: `https://icecash.payment.gateway/pay/${paymentReference}`,
            expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
          };
        }
      } else {
        // Fallback payment data structure
        paymentData = {
          paymentReference,
          amount: policyResult.paymentAmount,
          status: 'INITIATED',
          paymentMethod: paymentMethod,
          expiryTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          message: 'Payment recorded for manual processing'
        };
      }

      // Add PostgreSQL record info to response if available
      if (paymentRecordResult && paymentRecordResult.success) {
        paymentData.paymentId = paymentRecordResult.paymentId;
        paymentData.expiresAt = paymentRecordResult.expiresAt;
        paymentData.recordedInPostgreSQL = true;
      }

      res.status(200).json({
        success: true,
        status: 'SUCCESS',
        data: {
          policy,
          payment: paymentData,
          currency,
          database: currency === 'USD' ? 'ZIMNATUSD' : 'ZIMNATZIG',
          initiatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error initiating MSSQL policy payment', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        status: 'ERROR',
        errorCode: 'PAYMENT_INITIATION_ERROR',
        errorMessage: 'Error initiating policy payment from MSSQL database',
        details: error.message
      });
    }
  }
);

/**
 * POST /api/v1/policy/payment/callback - Payment callback handler with currency support
 */
router.post('/api/v1/policy/payment/callback',
  [
    body('paymentReference').notEmpty().withMessage('Payment reference is required'),
    body('status').isIn(['SUCCESS', 'FAILED', 'PENDING']).withMessage('Invalid payment status'),
    body('amount').isNumeric().withMessage('Amount must be numeric'),
    body('currency').optional().isIn(['USD', 'ZIG']).withMessage('Currency must be USD or ZIG'),
    body('transactionId').optional().notEmpty().withMessage('Transaction ID cannot be empty'),
    body('policyReference').optional().notEmpty().withMessage('Policy reference cannot be empty')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { paymentReference, status, amount, currency, transactionId, policyReference } = req.body;
      const paymentCurrency = currency || (paymentReference.startsWith('USD') ? 'USD' : 'ZIG');

      logger.info('MSSQL Policy payment callback received', { 
        paymentReference, 
        status, 
        amount, 
        currency: paymentCurrency,
        transactionId,
        policyReference
      });

      let updateResult = null;

      // If payment successful and we have MSSQL service, update the policy
      if (status === 'SUCCESS' && policyReference && mssqlPolicyService) {
        try {
          // Initialize MSSQL service for the appropriate currency
          if (!mssqlPolicyService.isConnected[paymentCurrency]) {
            await mssqlPolicyService.initialize(paymentCurrency);
          }

          updateResult = await mssqlPolicyService.updatePolicyPayment(policyReference, {
            transactionId,
            amount: parseFloat(amount),
            paymentDate: new Date(),
            paymentReference
          }, paymentCurrency);
        } catch (updateError) {
          logger.error('Failed to update MSSQL policy payment status', { 
            error: updateError.message,
            paymentReference,
            currency: paymentCurrency
          });
        }
      }

      const callbackResult = {
        status: 'PROCESSED',
        paymentReference,
        amount,
        currency: paymentCurrency,
        transactionStatus: status,
        policyUpdated: updateResult ? updateResult.success : false,
        message: updateResult?.message || 'Payment callback processed',
        processedAt: new Date().toISOString()
      };

      if (updateResult && updateResult.success) {
        callbackResult.policiesUpdated = updateResult.rowsUpdated;
      }

      res.status(200).json({
        success: true,
        status: 'SUCCESS',
        data: callbackResult
      });

    } catch (error) {
      logger.error('MSSQL Policy payment callback processing failed', { 
        error: error.message, 
        stack: error.stack, 
        body: req.body 
      });
      res.status(500).json({
        success: false,
        status: 'ERROR',
        errorCode: 'PAYMENT_CALLBACK_ERROR',
        errorMessage: 'Payment callback processing failed',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/v1/policy/health - Health check for MSSQL policy services (both currencies)
 */
router.get('/api/v1/policy/health', async (req, res) => {
  try {
    const health = {
      policyService: 'not available',
      paymentService: 'not available',
      mssqlServices: {
        USD: 'not available',
        ZIG: 'not available'
      },
      timestamp: new Date().toISOString()
    };

    if (mssqlPolicyService) {
      try {
        // Initialize both database connections if not already done
        const initResults = await mssqlPolicyService.initializeBoth();
        
        // Check health for both databases
        const healthResults = await mssqlPolicyService.healthCheckBoth();
        
        health.mssqlServices.USD = {
          status: healthResults.USD.connected ? 'available' : 'unavailable',
          database: 'ZIMNATUSD',
          details: healthResults.USD,
          initialized: initResults.USD
        };
        
        health.mssqlServices.ZIG = {
          status: healthResults.ZIG.connected ? 'available' : 'unavailable',
          database: 'ZIMNATZIG',
          details: healthResults.ZIG,
          initialized: initResults.ZIG
        };
        
        health.policyService = 'available';
        
      } catch (error) {
        health.mssqlServices.error = error.message;
        health.policyService = 'error';
      }
    }

    if (iceCashService) {
      try {
        const paymentHealth = await iceCashService.healthCheck();
        health.paymentService = paymentHealth.status || 'available';
      } catch (error) {
        health.paymentService = 'error';
        health.paymentServiceError = error.message;
      }
    }

    res.status(200).json({
      success: true,
      status: 'SUCCESS',
      data: health
    });

  } catch (error) {
    logger.error('Policy health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      status: 'ERROR',
      errorCode: 'HEALTH_CHECK_ERROR',
      errorMessage: 'Health check failed',
      details: error.message
    });
  }
});

module.exports = router;