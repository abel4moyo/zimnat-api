


// ===================================================================
// MOTOR INSURANCE ROUTES - CLEAN VERSION
// File: src/routes/motorInsuranceRoutes.js
// ===================================================================

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Import services (with fallbacks)
let motorInsuranceService, iceCashService, authenticateZimnat;

try {
  motorInsuranceService = require('../services/motorInsuranceService');
} catch (error) {
  console.warn('Motor insurance service not available:', error.message);
  motorInsuranceService = null;
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
  console.warn('Zimnat auth middleware not available:', error.message);
  // Create fallback middleware
  authenticateZimnat = (req, res, next) => {
    // Simple fallback - just pass through for now
    req.partner = { id: 1, partner_code: 'fcb' };
    next();
  };
}

// ===================================================================
// VALIDATION MIDDLEWARE
// ===================================================================

const validateQuoteRequest = [
  body('vrn')
    .notEmpty()
    .withMessage('Vehicle Registration Number (VRN) is required'),
  body('vehicleValue')
    .isNumeric()
    .withMessage('Vehicle value must be numeric'),
  body('insuranceType')
    .isIn(['1', '2', '3', '4'])
    .withMessage('Invalid insurance type'),
  body('vehicleType')
    .isIn(['1', '2', '3', '4', '5', '6', '7'])
    .withMessage('Invalid vehicle type'),
  body('durationMonths')
    .isIn(['4', '6', '12'])
    .withMessage('Duration must be 4, 6, or 12 months'),
  body('clientDetails.idNumber')
    .notEmpty()
    .withMessage('Client ID number is required'),
  body('clientDetails.firstName')
    .notEmpty()
    .withMessage('Client first name is required'),
  body('clientDetails.lastName')
    .notEmpty()
    .withMessage('Client last name is required'),
  body('clientDetails.msisdn')
    .notEmpty()
    .withMessage('Client mobile number is required')
];

// ===================================================================
// MOTOR INSURANCE CONTROLLER FUNCTIONS
// ===================================================================

const motorController = {
  async getCoverageOptions(req, res) {
    try {
      const coverageOptions = {
        insuranceTypes: [
          { id: '1', code: 'RTA', description: 'Road Traffic Act' },
          { id: '2', code: 'FTP', description: 'Full Third Party' },
          { id: '3', code: 'FTPF', description: 'Full Third Party, Fire and Theft' },
          { id: '4', code: 'FTPFT', description: 'Comprehensive Cover' }
        ],
        vehicleTypes: [
          { id: '1', type: 'Private Car', use: 'Private Use' },
          { id: '2', type: 'Private Car', use: 'Business use' },
          { id: '3', type: 'Private Car', use: 'Fleet' },
          { id: '4', type: 'Private Car', use: 'Private Hire' },
          { id: '5', type: 'Private Car', use: 'Driving School' },
          { id: '6', type: 'Trailer', use: 'Domestic Trailers' },
          { id: '7', type: 'Trailer', use: 'Caravans' }
        ],
        paymentMethods: [
          { id: '1', description: 'Cash', approval: 'None' },
          { id: '2', description: 'ICEcash', approval: 'Client OTP' },
          { id: '3', description: 'EcoCash', approval: 'Third Party' },
          { id: '7', description: 'Master or Visa Card', approval: 'Payment Gateway' }
        ]
      };

      res.status(200).json({
        success: true,
        status: 'SUCCESS',
        data: coverageOptions
      });
    } catch (error) {
      logger.error('Error in getCoverageOptions', { error: error.message });
      res.status(500).json({
        success: false,
        status: 'ERROR',
        errorCode: 'COVERAGE_OPTIONS_ERROR',
        errorMessage: 'Error retrieving coverage options'
      });
    }
  },

  async healthCheck(req, res) {
    try {
      const health = {
        motorInsuranceService: motorInsuranceService ? 'available' : 'not available',
        iceCashService: iceCashService ? 'available' : 'not available',
        timestamp: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        status: 'SUCCESS',
        data: health
      });
    } catch (error) {
      logger.error('Error in motor insurance health check', { error: error.message });
      res.status(503).json({
        success: false,
        status: 'ERROR',
        errorCode: 'SERVICE_UNAVAILABLE',
        errorMessage: 'Motor insurance service health check failed'
      });
    }
  },

  async generateQuote(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          status: 'ERROR',
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid input data',
          errors: errors.array()
        });
      }

      if (!motorInsuranceService) {
        return res.status(501).json({
          success: false,
          status: 'ERROR',
          errorCode: 'SERVICE_NOT_AVAILABLE',
          errorMessage: 'Motor insurance service is not available'
        });
      }

      const quote = await motorInsuranceService.generateQuote(req.body);

      res.status(200).json({
        success: true,
        status: 'SUCCESS',
        data: quote
      });
    } catch (error) {
      logger.error('Error generating motor quote', { error: error.message });
      res.status(400).json({
        success: false,
        status: 'ERROR',
        errorCode: 'QUOTE_GENERATION_ERROR',
        errorMessage: error.message
      });
    }
  },

  async generateCombinedQuote(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          status: 'ERROR',
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid input data',
          errors: errors.array()
        });
      }

      if (!iceCashService) {
        return res.status(501).json({
          success: false,
          status: 'ERROR',
          errorCode: 'SERVICE_NOT_AVAILABLE',
          errorMessage: 'ICEcash service is not available'
        });
      }

      // Create ICEcash request format
      const iceCashRequest = {
        PartnerReference: `FCB${Date.now()}${Math.floor(Math.random() * 1000)}`,
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: "2.1",
        PartnerToken: process.env.ICECASH_PARTNER_TOKEN || "demo_token",
        Request: {
          Function: "TPILICQuote",
          Vehicles: [{
            VRN: req.body.vrn,
            EntityType: req.body.entityType || "Personal",
            IDNumber: req.body.clientDetails.idNumber,
            FirstName: req.body.clientDetails.firstName,
            LastName: req.body.clientDetails.lastName,
            MSISDN: req.body.clientDetails.msisdn,
            InsuranceType: req.body.insuranceType,
            VehicleType: req.body.vehicleType,
            VehicleValue: req.body.vehicleValue,
            DurationMonths: req.body.durationMonths
          }]
        }
      };

      const iceCashResponse = await iceCashService.createTPILICQuote(iceCashRequest);

      res.status(200).json({
        success: true,
        status: 'SUCCESS',
        data: {
          combinedQuote: iceCashResponse,
          validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000)
        }
      });
    } catch (error) {
      logger.error('Error generating combined quote', { error: error.message });
      res.status(400).json({
        success: false,
        status: 'ERROR',
        errorCode: 'COMBINED_QUOTE_ERROR',
        errorMessage: error.message
      });
    }
  },

  async getQuote(req, res) {
    try {
      const { quoteId } = req.params;

      if (!motorInsuranceService) {
        return res.status(501).json({
          success: false,
          status: 'ERROR',
          errorCode: 'SERVICE_NOT_AVAILABLE',
          errorMessage: 'Motor insurance service is not available'
        });
      }

      const quote = await motorInsuranceService.getQuote(quoteId);

      if (!quote) {
        return res.status(404).json({
          success: false,
          status: 'ERROR',
          errorCode: 'QUOTE_NOT_FOUND',
          errorMessage: 'Quote not found'
        });
      }

      res.status(200).json({
        success: true,
        status: 'SUCCESS',
        data: quote
      });
    } catch (error) {
      logger.error('Error retrieving quote', { error: error.message });
      res.status(500).json({
        success: false,
        status: 'ERROR',
        errorCode: 'QUOTE_RETRIEVAL_ERROR',
        errorMessage: 'Error retrieving quote'
      });
    }
  }
};

// ===================================================================
// ROUTE DEFINITIONS
// ===================================================================

// Health check endpoint
router.get('/health', motorController.healthCheck);

// Get coverage options (public endpoint)
router.get('/coverage-options', motorController.getCoverageOptions);

// Generate a motor insurance quote
router.post('/quote', 
  authenticateZimnat,
  validateQuoteRequest,
  motorController.generateQuote
);

// Generate combined insurance and license quote
router.post('/quote/combined', 
  authenticateZimnat,
  validateQuoteRequest,
  motorController.generateCombinedQuote
);

// Get a specific quote by ID
router.get('/quote/:quoteId', 
  authenticateZimnat,
  param('quoteId').notEmpty().withMessage('Quote ID is required'),
  motorController.getQuote
);

// Default fallback for unmatched routes
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    status: 'ERROR',
    errorCode: 'ENDPOINT_NOT_FOUND',
    errorMessage: `Motor insurance endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /api/motor/health',
      'GET /api/motor/coverage-options',
      'POST /api/motor/quote',
      'POST /api/motor/quote/combined',
      'GET /api/motor/quote/:quoteId'
    ]
  });
});

module.exports = router;