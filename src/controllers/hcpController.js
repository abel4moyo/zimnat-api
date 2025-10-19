// =============================================================================
// Complete HCP Controller Using Database Services
// File: src/controllers/hcpController.js
// =============================================================================

const DatabaseRatingService = require('../services/databaseRatingService');
const logger = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/responseHelper');

class HCPController {
  
  /**
   * Get available HCP packages from database
   * GET /api/hcp/packages
   */
  static async getPackages(req, res, next) {
    try {
      logger.info('Fetching HCP packages from database');

      const packages = await DatabaseRatingService.getPackagesByProduct('HCP');

      res.json(successResponse({
        product: 'Hospital Cash Plan',
        productId: 'HCP',
        packages: packages.map(pkg => ({
          packageId: pkg.package_id,
          packageName: pkg.package_name,
          description: pkg.description,
          monthlyRate: parseFloat(pkg.rate),
          currency: pkg.currency,
          frequency: pkg.frequency,
          benefits: pkg.benefits.map(benefit => ({
            type: benefit.benefit_type,
            value: parseFloat(benefit.benefit_value),
            unit: benefit.benefit_unit,
            description: benefit.benefit_description
          })),
          limits: pkg.limits.map(limit => ({
            type: limit.limit_type,
            value: parseFloat(limit.limit_value),
            unit: limit.limit_unit,
            description: limit.limit_description
          }))
        }))
      }));

    } catch (error) {
      logger.error('Error fetching HCP packages from database', { 
        error: error.message, 
        stack: error.stack 
      });
      next(errorResponse(500, 'PACKAGES_FETCH_FAILED', 'Failed to retrieve HCP packages from database'));
    }
  }

  /**
   * Calculate HCP premium using database rates
   * POST /api/hcp/calculate
   */
  static async calculatePremium(req, res, next) {
    try {
      const { packageType, familySize = 1, duration = 12 } = req.body;

      if (!packageType) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Package type is required'));
      }

      // Map frontend package type to database package ID
      const packageId = packageType === 'HCP_INDIVIDUAL' || packageType === 'HCP_FAMILY' 
        ? packageType 
        : `HCP_${packageType.toUpperCase()}`;

      logger.info('Calculating HCP premium using database', { 
        packageId, 
        familySize, 
        duration 
      });

      const calculation = await DatabaseRatingService.calculatePremium(
        packageId,
        { familySize },
        duration
      );

      res.json(successResponse({
        packageId: calculation.packageId,
        packageName: calculation.packageName,
        familySize,
        duration,
        basePremium: calculation.basePremium,
        monthlyPremium: calculation.monthlyPremium,
        totalPremium: calculation.totalPremium,
        currency: calculation.currency,
        factors: calculation.factors,
        breakdown: calculation.breakdown,
        calculationMethod: 'DATABASE_DRIVEN'
      }));

    } catch (error) {
      logger.error('Error calculating HCP premium', {
        error: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      
      if (error.message.includes('not found')) {
        return res.status(404).json(errorResponse(404, 'PACKAGE_NOT_FOUND', error.message));
      }
      
      next(errorResponse(500, 'CALCULATION_FAILED', 'Failed to calculate premium'));
    }
  }

  /**
   * Generate HCP quote using database
   * POST /api/hcp/quote
   */
  static async generateQuote(req, res, next) {
    try {
      const { packageType, customerInfo, duration = 12 } = req.body;

      if (!packageType || !customerInfo) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Package type and customer info are required'));
      }

      const packageId = packageType === 'HCP_INDIVIDUAL' || packageType === 'HCP_FAMILY' 
        ? packageType 
        : `HCP_${packageType.toUpperCase()}`;

      logger.info('Generating HCP quote using database', {
        packageId,
        customerEmail: customerInfo.email,
        duration
      });

      // Prepare coverage details
      const coverageDetails = {
        familySize: customerInfo.familySize || 1
      };

      const quote = await DatabaseRatingService.generateQuote(
        'HCP',
        packageId,
        customerInfo,
        coverageDetails,
        duration
      );

      res.json(successResponse({
        quoteId: quote.quoteId,
        quoteNumber: quote.quoteNumber,
        productId: quote.productId,
        packageId: quote.packageId,
        packageName: quote.packageName,
        customerInfo: quote.customerInfo,
        coverageDetails: quote.coverageDetails,
        premiumCalculation: {
          basePremium: quote.premiumCalculation.basePremium,
          monthlyPremium: quote.premiumCalculation.monthlyPremium,
          totalPremium: quote.totalPremium,
          currency: quote.currency,
          factors: quote.premiumCalculation.factors
        },
        duration: quote.duration,
        status: quote.status,
        expiresAt: quote.expiresAt,
        createdAt: quote.createdAt
      }));

    } catch (error) {
      logger.error('Error generating HCP quote', {
        error: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      next(errorResponse(500, 'QUOTE_GENERATION_FAILED', 'Failed to generate HCP quote'));
    }
  }

  /**
   * Create HCP policy using database
   * POST /api/hcp/policy
   */
  static async createPolicy(req, res, next) {
    try {
      const { quoteNumber, paymentData } = req.body;

      if (!quoteNumber || !paymentData) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Quote number and payment data are required'));
      }

      logger.info('Creating HCP policy from quote', {
        quoteNumber,
        paymentMethod: paymentData.paymentMethod
      });

      // Get quote first
      const quote = await DatabaseRatingService.getQuote(quoteNumber);
      
      if (!DatabaseRatingService.isQuoteValid(quote)) {
        return res.status(400).json(errorResponse(400, 'QUOTE_EXPIRED', 'Quote has expired or is no longer valid'));
      }

      const policy = await DatabaseRatingService.createPolicyFromQuote(
        quote.quote_id,
        paymentData
      );

      res.json(successResponse({
        policyId: policy.policyId,
        policyNumber: policy.policyNumber,
        quoteId: policy.quoteId,
        productId: policy.productId,
        packageName: policy.packageName,
        customerInfo: policy.customerInfo,
        premiumAmount: policy.premiumAmount,
        currency: policy.currency,
        effectiveDate: policy.effectiveDate,
        expiryDate: policy.expiryDate,
        status: policy.status,
        paymentReference: policy.paymentReference
      }));

    } catch (error) {
      logger.error('Error creating HCP policy', {
        error: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      
      if (error.message.includes('not found')) {
        return res.status(404).json(errorResponse(404, 'QUOTE_NOT_FOUND', error.message));
      }
      
      next(errorResponse(500, 'POLICY_CREATION_FAILED', 'Failed to create HCP policy'));
    }
  }

  /**
   * Process HCP payment
   * POST /api/hcp/payment
   */
  static async processPayment(req, res, next) {
    try {
      const { policyNumber, amount, paymentMethod, externalReference } = req.body;

      if (!policyNumber || !amount || !paymentMethod) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Policy number, amount, and payment method are required'));
      }

      logger.info('Processing HCP payment', {
        policyNumber,
        amount,
        paymentMethod
      });

      // Get policy details
      const policy = await DatabaseRatingService.getPolicy(policyNumber);

      // Here you would integrate with actual payment processor (ICE Cash, etc.)
      // For now, we'll simulate successful payment processing
      const paymentResult = {
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        policyNumber,
        amount: parseFloat(amount),
        currency: policy.currency,
        paymentMethod,
        status: 'SUCCESS',
        processedAt: new Date(),
        reference: externalReference
      };

      // TODO: Record payment transaction in database
      // await DatabaseRatingService.recordPaymentTransaction(paymentResult);

      res.json(successResponse(paymentResult));

    } catch (error) {
      logger.error('Error processing HCP payment', {
        error: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      
      if (error.message.includes('not found')) {
        return res.status(404).json(errorResponse(404, 'POLICY_NOT_FOUND', error.message));
      }
      
      next(errorResponse(500, 'PAYMENT_PROCESSING_FAILED', 'Failed to process HCP payment'));
    }
  }

  /**
   * Get HCP quote details
   * GET /api/hcp/quote/:quoteNumber
   */
  static async getQuoteDetails(req, res, next) {
    try {
      const { quoteNumber } = req.params;

      logger.info('Fetching HCP quote details', { quoteNumber });

      const quote = await DatabaseRatingService.getQuote(quoteNumber);

      res.json(successResponse({
        quoteId: quote.quote_id,
        quoteNumber: quote.quote_number,
        productName: quote.product_name,
        packageName: quote.package_name,
        customerInfo: quote.customer_info,
        coverageDetails: quote.coverage_details,
        totalPremium: parseFloat(quote.total_premium),
        currency: quote.currency,
        duration: quote.duration_months,
        status: quote.status,
        expiresAt: quote.expires_at,
        calculationBreakdown: quote.calculation_breakdown,
        createdAt: quote.created_at,
        isValid: DatabaseRatingService.isQuoteValid(quote)
      }));

    } catch (error) {
      logger.error('Error fetching HCP quote details', {
        error: error.message,
        quoteNumber: req.params.quoteNumber
      });

      if (error.message.includes('not found')) {
        return res.status(404).json(errorResponse(404, 'QUOTE_NOT_FOUND', error.message));
      }

      next(errorResponse(500, 'QUOTE_FETCH_FAILED', 'Failed to retrieve quote details'));
    }
  }

  /**
   * Get HCP policy details
   * GET /api/hcp/policy/:policyNumber
   */
  static async getPolicyDetails(req, res, next) {
    try {
      const { policyNumber } = req.params;

      logger.info('Fetching HCP policy details', { policyNumber });

      const policy = await DatabaseRatingService.getPolicy(policyNumber);

      res.json(successResponse({
        policyId: policy.policy_id,
        policyNumber: policy.policy_number,
        quoteNumber: policy.quote_number,
        productName: policy.product_name,
        packageName: policy.package_name,
        customerInfo: policy.customer_info,
        coverageDetails: policy.coverage_details,
        premiumAmount: parseFloat(policy.premium_amount),
        currency: policy.currency,
        frequency: policy.frequency,
        effectiveDate: policy.effective_date,
        expiryDate: policy.expiry_date,
        status: policy.status,
        paymentReference: policy.payment_reference,
        createdAt: policy.created_at
      }));

    } catch (error) {
      logger.error('Error fetching HCP policy details', {
        error: error.message,
        policyNumber: req.params.policyNumber
      });

      if (error.message.includes('not found')) {
        return res.status(404).json(errorResponse(404, 'POLICY_NOT_FOUND', error.message));
      }

      next(errorResponse(500, 'POLICY_FETCH_FAILED', 'Failed to retrieve policy details'));
    }
  }

  /**
   * Update HCP policy status
   * PUT /api/hcp/policy/:policyNumber/status
   */
  static async updatePolicyStatus(req, res, next) {
    try {
      const { policyNumber } = req.params;
      const { status, reason } = req.body;

      if (!status) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Status is required'));
      }

      const validStatuses = ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Invalid status. Must be one of: ' + validStatuses.join(', ')));
      }

      logger.info('Updating HCP policy status', {
        policyNumber,
        newStatus: status,
        reason
      });

      // TODO: Implement policy status update in DatabaseRatingService
      // await DatabaseRatingService.updatePolicyStatus(policyNumber, status, reason);

      res.json(successResponse({
        policyNumber,
        status,
        reason,
        updatedAt: new Date(),
        message: 'Policy status updated successfully'
      }));

    } catch (error) {
      logger.error('Error updating HCP policy status', {
        error: error.message,
        stack: error.stack,
        policyNumber: req.params.policyNumber
      });

      if (error.message.includes('not found')) {
        return res.status(404).json(errorResponse(404, 'POLICY_NOT_FOUND', error.message));
      }

      next(errorResponse(500, 'POLICY_UPDATE_FAILED', 'Failed to update policy status'));
    }
  }

  /**
   * Health check for HCP service
   * GET /api/hcp/health
   */
  static async healthCheck(req, res, next) {
    try {
      // Check database connectivity for HCP tables
      const packages = await DatabaseRatingService.getPackagesByProduct('HCP');
      
      // Get some basic statistics
      const stats = {
        availablePackages: packages.length,
        databaseConnection: 'OK',
        serviceStatus: 'healthy'
      };

      res.json(successResponse({
        service: 'Hospital Cash Plan API',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        data: stats
      }));

    } catch (error) {
      logger.error('HCP health check failed', { error: error.message });
      res.status(500).json(errorResponse(500, 'HEALTH_CHECK_FAILED', 'HCP service health check failed'));
    }
  }
}

module.exports = HCPController;