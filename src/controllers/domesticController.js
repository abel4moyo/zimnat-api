// src/controllers/domesticController.js
const domesticService = require('../services/domesticService');
const ratingService = require('../services/ratingService');
const logger = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const crypto = require('crypto');

class DomesticController {
  
  /**
   * Get available Domestic Insurance packages
   * GET /api/domestic/packages
   */
  static async getPackages(req, res, next) {
    try {
      logger.info('Fetching Domestic Insurance packages');

      const packages = await domesticService.getAvailablePackages();

      res.json(successResponse({
        product: 'Domestic Insurance',
        packages: packages
      }));

    } catch (error) {
      logger.error('Error fetching Domestic Insurance packages', { 
        error: error.message, 
        stack: error.stack 
      });
      next(errorResponse(500, 'PACKAGES_FETCH_FAILED', 'Failed to retrieve Domestic Insurance packages'));
    }
  }

  /**
   * Calculate Domestic Insurance premium
   * POST /api/domestic/calculate
   */
  static async calculatePremium(req, res, next) {
    try {
      const { 
        packageType, 
        coverType = 'HOMEOWNERS', 
        propertyValue = 0, 
        contentsValue = 0,
        duration = 12 
      } = req.body;

      if (!packageType) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Package type is required'));
      }

      if (coverType === 'HOMEOWNERS' && propertyValue <= 0) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Property value is required for homeowners cover'));
      }

      if (coverType === 'HOUSEHOLDERS' && contentsValue <= 0) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Contents value is required for householders cover'));
      }

      logger.info('Calculating Domestic Insurance premium', { 
        packageType, 
        coverType,
        propertyValue,
        contentsValue,
        duration 
      });

      const calculation = await domesticService.calculatePremium({
        packageType,
        coverType,
        propertyValue,
        contentsValue,
        duration
      });

      res.json(successResponse({
        packageType,
        coverType,
        calculation
      }));

    } catch (error) {
      logger.error('Error calculating Domestic Insurance premium', { 
        error: error.message, 
        packageType: req.body.packageType 
      });
      
      if (error.status === 404) {
        return res.status(404).json(errorResponse(404, 'PACKAGE_NOT_FOUND', error.message));
      }
      
      next(errorResponse(500, 'PREMIUM_CALCULATION_FAILED', 'Failed to calculate premium'));
    }
  }

  /**
   * Generate Domestic Insurance quote
   * POST /api/domestic/quote
   */
  static async generateQuote(req, res, next) {
    try {
      const { 
        packageType, 
        customerInfo, 
        coverType = 'HOMEOWNERS',
        propertyValue = 0,
        contentsValue = 0,
        propertyDetails = {},
        duration = 12,
        metadata = {} 
      } = req.body;

      // Validation
      if (!packageType || !customerInfo) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Package type and customer info are required'));
      }

      if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Customer first name, last name, and email are required'));
      }

      const quoteNumber = `DOM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      logger.info('Generating Domestic Insurance quote', {
        quoteNumber,
        packageType,
        coverType,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
        propertyValue,
        contentsValue
      });

      // Calculate premium
      const premiumCalculation = await domesticService.calculatePremium({
        packageType,
        coverType,
        propertyValue,
        contentsValue,
        duration
      });

      // Get package details
      const packageDetails = await domesticService.getPackageDetails(packageType);

      // Create quote
      const quote = await domesticService.createQuote({
        quoteNumber,
        packageType,
        customerInfo,
        coverType,
        propertyValue,
        contentsValue,
        propertyDetails,
        duration,
        premiumCalculation,
        packageDetails,
        metadata
      });

      logger.info('Domestic Insurance quote generated successfully', { 
        quoteNumber, 
        packageType, 
        premium: premiumCalculation.totalPremium 
      });

      res.json(successResponse({
        quoteNumber: quote.quotation_number,
        productType: 'DOMESTIC',
        packageType,
        coverType,
        customerInfo: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone
        },
        coverDetails: {
          packageName: packageDetails.package_name,
          coverType,
          propertyValue,
          contentsValue,
          duration: `${duration} months`,
          benefits: packageDetails.benefits,
          limits: packageDetails.limits
        },
        premiumBreakdown: {
          basePremium: premiumCalculation.basePremium,
          totalPremium: premiumCalculation.totalPremium,
          currency: premiumCalculation.currency,
          frequency: 'MONTHLY',
          calculationMethod: premiumCalculation.calculation_method
        },
        validUntil: quote.valid_until,
        status: 'ACTIVE',
        terms: 'Quote valid for 30 days from generation date. Coverage begins upon policy activation and first premium payment.'
      }));

    } catch (error) {
      logger.error('Error generating Domestic Insurance quote', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      if (error.status && error.code) {
        return res.status(error.status).json(errorResponse(error.status, error.code, error.message));
      }

      next(errorResponse(500, 'QUOTE_GENERATION_FAILED', 'Failed to generate Domestic Insurance quote'));
    }
  }

  /**
   * Create Domestic Insurance policy from quote
   * POST /api/domestic/policy
   */
  static async createPolicy(req, res, next) {
    try {
      const {
        quotationNumber,
        paymentBreakdown,
        consentToDataSharing = true,
        deliveryMethod = 'EMAIL'
      } = req.body;

      if (!quotationNumber || !paymentBreakdown) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Quotation number and payment breakdown are required'));
      }

      if (!paymentBreakdown.principalAmount || !paymentBreakdown.bankTransactionId) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Principal amount and bank transaction ID are required'));
      }

      logger.info('Creating Domestic Insurance policy from quote', {
        quotationNumber,
        paymentAmount: paymentBreakdown.principalAmount
      });

      // Get quote details
      const quote = await domesticService.getQuoteByNumber(quotationNumber);
      if (!quote) {
        return res.status(404).json(errorResponse(404, 'QUOTE_NOT_FOUND', 'Quote not found or expired'));
      }

      // Create policy
      const policy = await domesticService.createPolicy({
        quote,
        paymentBreakdown,
        consentToDataSharing,
        deliveryMethod
      });

      // Generate Zimnat payment reference
      const zimnatPaymentReferenceId = `ZIMNAT-DOM-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

      logger.info('Domestic Insurance policy created successfully', {
        quotationNumber,
        policyNumber: policy.policy_number,
        zimnatPaymentReferenceId
      });

      res.json(successResponse({
        policyNumber: policy.policy_number,
        zimnatPaymentReferenceId,
        paymentStatus: 'SUCCESS',
        policyIssued: true,
        documentsGenerated: true,
        status: 'ACTIVE'
      }));

    } catch (error) {
      logger.error('Error creating Domestic Insurance policy', {
        error: error.message,
        stack: error.stack,
        quotationNumber: req.body.quotationNumber
      });

      if (error.status && error.code) {
        return res.status(error.status).json(errorResponse(error.status, error.code, error.message));
      }

      next(errorResponse(500, 'POLICY_CREATION_FAILED', 'Failed to create Domestic Insurance policy'));
    }
  }

  /**
   * Process Domestic Insurance payment
   * POST /api/domestic/payment
   */
  static async processPayment(req, res, next) {
    try {
      const {
        policyNumber,
        amountPaid,
        bankTransactionId,
        bankReferenceNumber,
        customerAccountNumber,
        customerEmail,
        paymentDateTime
      } = req.body;

      // Validation
      if (!policyNumber || !amountPaid || !bankTransactionId) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Policy number, amount paid, and bank transaction ID are required'));
      }

      logger.info('Processing Domestic Insurance payment', {
        policyNumber,
        amountPaid,
        bankTransactionId
      });

      const payment = await domesticService.processPayment({
        policyNumber,
        amountPaid,
        bankTransactionId,
        bankReferenceNumber,
        customerAccountNumber,
        customerEmail,
        paymentDateTime: paymentDateTime || new Date().toISOString()
      });

      const zimnatPaymentReference = `ZIMNAT-PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      logger.info('Domestic Insurance payment processed successfully', {
        policyNumber,
        paymentAmount: amountPaid,
        zimnatPaymentReference
      });

      res.json(successResponse({
        zimnatPaymentReferenceId: zimnatPaymentReference,
        paymentStatus: 'SUCCESS',
        policyUpdated: true,
        receiptGenerated: true,
        transactionId: payment.transaction_id
      }));

    } catch (error) {
      logger.error('Error processing Domestic Insurance payment', {
        error: error.message,
        policyNumber: req.body.policyNumber
      });

      if (error.status && error.code) {
        return res.status(error.status).json(errorResponse(error.status, error.code, error.message));
      }

      res.status(500).json(errorResponse(500, 'PAYMENT_PROCESSING_FAILED', 'Failed to process payment', true));
    }
  }

  /**
   * Get Domestic Insurance policy details
   * GET /api/domestic/policy/:policyNumber
   */
  static async getPolicyDetails(req, res, next) {
    try {
      const { policyNumber } = req.params;

      logger.info('Fetching Domestic Insurance policy details', { policyNumber });

      const policy = await domesticService.getPolicyByNumber(policyNumber);
      
      if (!policy) {
        return res.status(404).json(errorResponse(404, 'POLICY_NOT_FOUND', 'Domestic Insurance policy not found'));
      }

      res.json(successResponse(policy));

    } catch (error) {
      logger.error('Error fetching Domestic Insurance policy details', {
        error: error.message,
        policyNumber: req.params.policyNumber
      });

      next(errorResponse(500, 'POLICY_FETCH_FAILED', 'Failed to retrieve policy details'));
    }
  }

  /**
   * Get Domestic Insurance quote details
   * GET /api/domestic/quote/:quoteNumber
   */
  static async getQuoteDetails(req, res, next) {
    try {
      const { quoteNumber } = req.params;

      logger.info('Fetching Domestic Insurance quote details', { quoteNumber });

      const quote = await domesticService.getQuoteByNumber(quoteNumber);
      
      if (!quote) {
        return res.status(404).json(errorResponse(404, 'QUOTE_NOT_FOUND', 'Domestic Insurance quote not found'));
      }

      res.json(successResponse(quote));

    } catch (error) {
      logger.error('Error fetching Domestic Insurance quote details', {
        error: error.message,
        quoteNumber: req.params.quoteNumber
      });

      next(errorResponse(500, 'QUOTE_FETCH_FAILED', 'Failed to retrieve quote details'));
    }
  }
}

module.exports = DomesticController;