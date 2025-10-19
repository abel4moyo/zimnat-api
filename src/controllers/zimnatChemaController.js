const zimnatChemaService = require('../services/zimnatChemaService');
const logger = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/responseHelper');

class ZimnatChemaController {
  
  /**
   * Create Zimnat Chema Cash Plan application
   * POST /api/zimnat-chema/application
   */
  static async createApplication(req, res, next) {
    try {
      const applicationData = req.body;
      
      logger.info('Creating Zimnat Chema application', {
        packageLevel: applicationData['contract-details']?.['package-level'],
        paymentFrequency: applicationData['contract-details']?.['payment-frequency'],
        customerPhone: applicationData['life-assured-contact-details']?.['cell-phone']
      });

      // Validate required fields (using kebab-case as per Postman)
      if (!applicationData['contract-details']?.['package-level']) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Package level is required'));
      }

      if (!applicationData['contract-details']?.['payment-frequency']) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Payment frequency is required'));
      }

      if (!applicationData['life-assured-details']?.['first-names'] || !applicationData['life-assured-details']?.surname) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Customer first name and surname are required'));
      }

      // Create application using service
      const application = await zimnatChemaService.createApplication(applicationData);

      res.json(successResponse({
        contractId: application.contractId,
        status: application.status,
        packageLevel: application.packageLevel,
        paymentFrequency: application.paymentFrequency,
        monthlyPremium: application.monthlyPremium,
        effectiveDate: application.effectiveDate,
        expiryDate: application.expiryDate,
        certificateNumber: application.certificateNumber,
        customerReference: application.customerReference
      }));

    } catch (error) {
      logger.error('Error creating Zimnat Chema application', {
        error: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      
      if (error.code === 'VALIDATION_FAILURE') {
        return res.status(400).json(errorResponse(400, 'VALIDATION_FAILURE', error.message));
      }
      
      if (error.code === 'UNAUTHORIZED') {
        return res.status(401).json(errorResponse(401, 'UNAUTHORIZED', error.message));
      }
      
      next(errorResponse(500, 'APPLICATION_CREATION_FAILED', 'Failed to create Zimnat Chema application'));
    }
  }

  /**
   * Modify existing Zimnat Chema policy
   * PUT /api/zimnat-chema/modify
   */
  static async modifyPolicy(req, res, next) {
    try {
      const modificationData = req.body;
      
      logger.info('Modifying Zimnat Chema policy', {
        contractId: modificationData['contract-details']?.['contract-id'],
        effectiveDate: modificationData['contract-details']?.['effective-date']
      });

      // Validate required fields
      if (!modificationData['contract-details']?.['contract-id']) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Contract ID is required for policy modification'));
      }

      if (!modificationData['contract-details']?.['effective-date']) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Effective date is required for policy modification'));
      }

      // Modify policy using service
      const modifiedPolicy = await zimnatChemaService.modifyPolicy(modificationData);

      res.json(successResponse({
        contractId: modifiedPolicy.contractId,
        status: modifiedPolicy.status,
        modificationType: modifiedPolicy.modificationType,
        effectiveDate: modifiedPolicy.effectiveDate,
        changes: modifiedPolicy.changes,
        newPremium: modifiedPolicy.newPremium,
        updatedAt: modifiedPolicy.updatedAt
      }));

    } catch (error) {
      logger.error('Error modifying Zimnat Chema policy', {
        error: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      
      if (error.code === 'POLICY_NOT_FOUND') {
        return res.status(404).json(errorResponse(404, 'POLICY_NOT_FOUND', error.message));
      }
      
      if (error.code === 'VALIDATION_FAILURE') {
        return res.status(400).json(errorResponse(400, 'VALIDATION_FAILURE', error.message));
      }
      
      next(errorResponse(500, 'POLICY_MODIFICATION_FAILED', 'Failed to modify Zimnat Chema policy'));
    }
  }

  /**
   * Update policy status
   * PUT /api/zimnat-chema/status-update
   */
  static async updateStatus(req, res, next) {
    try {
      const statusUpdateData = req.body;
      
      logger.info('Updating Zimnat Chema policy status', {
        contractId: statusUpdateData['contract-details']?.['contract-id'],
        newStatus: statusUpdateData['new-contract-status']?.['contract-status']
      });

      // Validate required fields
      if (!statusUpdateData['contract-details']?.['contract-id']) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Contract ID is required for status update'));
      }

      if (!statusUpdateData['new-contract-status']?.['effective-date']) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Effective date is required for status update'));
      }

      if (!statusUpdateData['new-contract-status']?.['contract-status']) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'New contract status is required'));
      }

      // Update status using service
      const updatedPolicy = await zimnatChemaService.updatePolicyStatus(statusUpdateData);

      res.json(successResponse({
        contractId: updatedPolicy.contractId,
        previousStatus: updatedPolicy.previousStatus,
        currentStatus: updatedPolicy.currentStatus,
        statusReason: updatedPolicy.statusReason,
        effectiveDate: updatedPolicy.effectiveDate,
        updatedAt: updatedPolicy.updatedAt
      }));

    } catch (error) {
      logger.error('Error updating Zimnat Chema policy status', {
        error: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      
      if (error.code === 'POLICY_NOT_FOUND') {
        return res.status(404).json(errorResponse(404, 'POLICY_NOT_FOUND', error.message));
      }
      
      if (error.code === 'INVALID_STATUS_TRANSITION') {
        return res.status(400).json(errorResponse(400, 'INVALID_STATUS_TRANSITION', error.message));
      }
      
      next(errorResponse(500, 'STATUS_UPDATE_FAILED', 'Failed to update Zimnat Chema policy status'));
    }
  }

  /**
   * Get policy details by contract ID
   * GET /api/zimnat-chema/policy/:contractId
   */
  static async getPolicyDetails(req, res, next) {
    try {
      const { contractId } = req.params;

      logger.info('Fetching Zimnat Chema policy details', { contractId });

      const policy = await zimnatChemaService.getPolicyDetails(contractId);

      res.json(successResponse({
        contractId: policy.contractId,
        packageLevel: policy.packageLevel,
        paymentFrequency: policy.paymentFrequency,
        status: policy.status,
        customerDetails: policy.customerDetails,
        beneficiaries: policy.beneficiaries,
        premiumDetails: policy.premiumDetails,
        effectiveDate: policy.effectiveDate,
        expiryDate: policy.expiryDate,
        createdAt: policy.createdAt,
        lastModified: policy.lastModified
      }));

    } catch (error) {
      logger.error('Error fetching Zimnat Chema policy details', {
        error: error.message,
        contractId: req.params.contractId
      });

      if (error.code === 'POLICY_NOT_FOUND') {
        return res.status(404).json(errorResponse(404, 'POLICY_NOT_FOUND', error.message));
      }

      next(errorResponse(500, 'POLICY_FETCH_FAILED', 'Failed to retrieve Zimnat Chema policy details'));
    }
  }

  /**
   * Get available Chema packages
   * GET /api/zimnat-chema/packages
   */
  static async getPackages(req, res, next) {
    try {
      logger.info('Fetching Zimnat Chema packages');

      const packages = await zimnatChemaService.getAvailablePackages();

      res.json(successResponse({
        product: 'Zimnat Chema Cash Plan',
        totalPackages: packages.length,
        packages: packages.map(pkg => ({
          packageLevel: pkg.packageLevel,
          packageName: pkg.packageName,
          description: pkg.description,
          benefits: pkg.benefits,
          premiumRates: pkg.premiumRates,
          eligibility: pkg.eligibility
        }))
      }));

    } catch (error) {
      logger.error('Error fetching Zimnat Chema packages', {
        error: error.message,
        stack: error.stack
      });
      
      next(errorResponse(500, 'PACKAGES_FETCH_FAILED', 'Failed to retrieve Zimnat Chema packages'));
    }
  }

  /**
   * Health check for Zimnat Chema service
   * GET /api/zimnat-chema/health
   */
  static async healthCheck(req, res, next) {
    try {
      // Check service connectivity
      const healthStatus = await zimnatChemaService.checkHealth();
      
      res.json(successResponse({
        service: 'Zimnat Chema Cash Plan API',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        externalConnections: {
          zimnatAPI: healthStatus.zimnatAPI,
          database: healthStatus.database
        }
      }));

    } catch (error) {
      logger.error('Zimnat Chema health check failed', { error: error.message });
      res.status(500).json(errorResponse(500, 'HEALTH_CHECK_FAILED', 'Zimnat Chema service health check failed'));
    }
  }

  /**
   * Calculate premium for Chema policy
   * POST /api/zimnat-chema/calculate-premium
   */
  static async calculatePremium(req, res, next) {
    try {
      const { packageLevel, paymentFrequency, customerData = {} } = req.body;

      if (!packageLevel) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Package level is required'));
      }

      if (!paymentFrequency) {
        return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Payment frequency is required'));
      }

      logger.info('Calculating Zimnat Chema premium', { 
        packageLevel, 
        paymentFrequency,
        customerAge: customerData.age
      });

      const calculation = await zimnatChemaService.calculatePremium(
        packageLevel,
        paymentFrequency,
        customerData
      );

      res.json(successResponse({
        packageLevel: calculation.packageLevel,
        paymentFrequency: calculation.paymentFrequency,
        basePremium: calculation.basePremium,
        monthlyPremium: calculation.monthlyPremium,
        annualPremium: calculation.annualPremium,
        currency: calculation.currency,
        factors: calculation.factors,
        breakdown: calculation.breakdown,
        calculatedAt: calculation.calculatedAt
      }));

    } catch (error) {
      logger.error('Error calculating Zimnat Chema premium', {
        error: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      
      if (error.code === 'INVALID_PACKAGE') {
        return res.status(400).json(errorResponse(400, 'INVALID_PACKAGE', error.message));
      }
      
      next(errorResponse(500, 'CALCULATION_FAILED', 'Failed to calculate Zimnat Chema premium'));
    }
  }
}

module.exports = ZimnatChemaController;