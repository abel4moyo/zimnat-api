


// ===================================================================
// MOTOR INSURANCE CONTROLLER - FIXED VERSION
// File: controllers/motorInsuranceController.js
// ===================================================================

const motorInsuranceService = require('../services/motorInsuranceService');
const iceCashService = require('../services/iceCashService');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class MotorInsuranceController {
  
  async generateQuote(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid input data',
          errors: errors.array()
        });
      }

      const quoteRequest = req.body;
      
      // Generate quote
      const quote = await motorInsuranceService.generateQuote(quoteRequest);

      res.status(200).json({
        status: 'SUCCESS',
        data: quote
      });

    } catch (error) {
      logger.error('Error in generateQuote controller', { error: error.message });
      next({
        status: 400,
        message: error.message,
        code: 'QUOTE_GENERATION_ERROR'
      });
    }
  }

  async generateCombinedQuote(req, res, next) {
    try {
      // This generates both insurance and license quotes via ICEcash API
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid input data',
          errors: errors.array()
        });
      }

      const request = req.body;
      
      // Format request for ICEcash TPILICQuote
      const iceCashRequest = {
        PartnerReference: `FCB${Date.now()}${Math.floor(Math.random() * 1000)}`,
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: "2.1",
        PartnerToken: process.env.ICECASH_PARTNER_TOKEN || "demo_token",
        Request: {
          Function: "TPILICQuote",
          Vehicles: [{
            VRN: request.vrn,
            EntityType: request.entityType || "Personal",
            IDNumber: request.clientDetails.idNumber,
            ClientIDType: request.clientDetails.clientIdType || "1",
            FirstName: request.clientDetails.firstName,
            LastName: request.clientDetails.lastName,
            MSISDN: request.clientDetails.msisdn,
            Email: request.clientDetails.email || "",
            Address1: request.clientDetails.address1 || "",
            Address2: request.clientDetails.address2 || "",
            SuburbID: request.clientDetails.suburbId || "1",
            InsuranceType: request.insuranceType,
            VehicleType: request.vehicleType,
            VehicleValue: request.vehicleValue,
            DurationMonths: request.durationMonths,
            Make: request.make || "",
            Model: request.model || "",
            YearManufacture: request.yearManufacture || new Date().getFullYear(),
            TaxClass: request.taxClass || "1",
            LicFrequency: request.licenseOptions?.licFrequency || "3",
            RadioTVUsage: request.licenseOptions?.radioTvUsage || "1",
            RadioTVFrequency: request.licenseOptions?.radioTvFrequency || "1"
          }]
        }
      };

      // Call ICEcash API
      const iceCashResponse = await iceCashService.createTPILICQuote(iceCashRequest);

      // Also generate internal quote for tracking
      const internalQuote = await motorInsuranceService.generateQuote(request);

      res.status(200).json({
        status: 'SUCCESS',
        data: {
          combinedQuote: iceCashResponse,
          internalQuote: internalQuote,
          validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000)
        }
      });

    } catch (error) {
      logger.error('Error in generateCombinedQuote controller', { error: error.message });
      next({
        status: 400,
        message: error.message,
        code: 'COMBINED_QUOTE_ERROR'
      });
    }
  }

  async approveQuote(req, res, next) {
    try {
      const { quoteId } = req.params;
      const { paymentMethod, deliveryMethod, paymentDetails } = req.body;

      // Get quote details
      const quote = await motorInsuranceService.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({
          status: 'ERROR',
          errorCode: 'QUOTE_NOT_FOUND',
          errorMessage: 'Quote not found'
        });
      }

      // Check if quote is still valid
      if (new Date() > new Date(quote.valid_until)) {
        return res.status(400).json({
          status: 'ERROR',
          errorCode: 'QUOTE_EXPIRED',
          errorMessage: 'Quote has expired'
        });
      }

      // Process payment
      const paymentResult = await this.processPayment(quote, paymentMethod, paymentDetails);

      if (paymentResult.status === 'SUCCESS') {
        // Update quote status to approved
        await motorInsuranceService.updateQuoteStatus(quoteId, 'APPROVED', {
          policy_number: paymentResult.policyNumber,
          payment_reference: paymentResult.paymentReference,
          receipt_id: paymentResult.receiptId
        });

        res.status(200).json({
          status: 'SUCCESS',
          data: {
            quoteId,
            policyNumber: paymentResult.policyNumber,
            paymentReference: paymentResult.paymentReference,
            receiptId: paymentResult.receiptId,
            status: 'APPROVED'
          }
        });
      } else {
        throw new Error(paymentResult.message || 'Payment processing failed');
      }

    } catch (error) {
      logger.error('Error in approveQuote controller', { error: error.message });
      next({
        status: 400,
        message: error.message,
        code: 'QUOTE_APPROVAL_ERROR'
      });
    }
  }

  async processPayment(quote, paymentMethod, paymentDetails) {
    // This would integrate with actual payment providers
    // For now, simulate successful payment
    
    const policyNumber = `POL${Date.now()}`;
    const paymentReference = `PAY${Date.now()}`;
    const receiptId = `RCP${Date.now()}`;

    logger.info('Processing motor insurance payment', {
      quoteId: quote.quote_id,
      amount: quote.total_amount,
      paymentMethod
    });

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      status: 'SUCCESS',
      policyNumber,
      paymentReference,
      receiptId
    };
  }

  async getQuote(req, res, next) {
    try {
      const { quoteId } = req.params;
      const quote = await motorInsuranceService.getQuote(quoteId);

      if (!quote) {
        return res.status(404).json({
          status: 'ERROR',
          errorCode: 'QUOTE_NOT_FOUND',
          errorMessage: 'Quote not found'
        });
      }

      res.status(200).json({
        status: 'SUCCESS',
        data: quote
      });

    } catch (error) {
      logger.error('Error in getQuote controller', { error: error.message });
      next({
        status: 500,
        message: 'Error retrieving quote',
        code: 'QUOTE_RETRIEVAL_ERROR'
      });
    }
  }

  async searchQuotes(req, res, next) {
    try {
      const filters = req.query;
      const result = await motorInsuranceService.searchQuotes(filters);

      res.status(200).json({
        status: 'SUCCESS',
        data: result
      });

    } catch (error) {
      logger.error('Error in searchQuotes controller', { error: error.message });
      next({
        status: 500,
        message: 'Error searching quotes',
        code: 'QUOTE_SEARCH_ERROR'
      });
    }
  }

  async getCoverageOptions(req, res, next) {
    try {
      const coverageOptions = {
        insuranceTypes: [
          { id: '1', code: 'RTA', description: 'Road Traffic Act', baseRate: 1.5 },
          { id: '2', code: 'FTP', description: 'Full Third Party', baseRate: 2.5 },
          { id: '3', code: 'FTPF', description: 'Full Third Party, Fire and Theft', baseRate: 3.5 },
          { id: '4', code: 'FTPFT', description: 'Comprehensive Cover', baseRate: 5.0 }
        ],
        vehicleTypes: [
          { id: '1', type: 'Private Car', use: 'Private Use', multiplier: 1.0 },
          { id: '2', type: 'Private Car', use: 'Business use', multiplier: 1.3 },
          { id: '3', type: 'Private Car', use: 'Fleet', multiplier: 1.5 },
          { id: '4', type: 'Private Car', use: 'Private Hire', multiplier: 2.0 },
          { id: '5', type: 'Private Car', use: 'Driving School', multiplier: 2.5 },
          { id: '6', type: 'Trailer', use: 'Domestic Trailers', multiplier: 0.8 },
          { id: '7', type: 'Trailer', use: 'Caravans', multiplier: 0.9 }
        ],
        licenseFrequencies: [
          { id: '1', description: '4 MONTHS', cost: 20 },
          { id: '2', description: '6 MONTHS', cost: 25 },
          { id: '3', description: '12 MONTHS', cost: 35 }
        ],
        paymentMethods: [
          { id: '1', description: 'Cash', approval: 'None' },
          { id: '2', description: 'ICEcash', approval: 'Client OTP' },
          { id: '3', description: 'EcoCash', approval: 'Third Party' },
          { id: '7', description: 'Master or Visa Card', approval: 'Payment Gateway' }
        ],
        taxClasses: [
          { id: '1', description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicleType: '1' },
          { id: '2', description: 'HEAVY VEHICLE (2301-4600KG)', vehicleType: '1' },
          { id: '3', description: 'HEAVY VEHICLE (4601-9000KG)', vehicleType: '1' },
          { id: '4', description: 'HEAVY VEHICLE (> 9000KG)', vehicleType: '1' },
          { id: '5', description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicleType: '2' },
          { id: '6', description: 'HEAVY VEHICLE (2301-4600KG)', vehicleType: '2' }
        ],
        clientIdTypes: [
          { id: '1', description: 'National ID' },
          { id: '2', description: 'Passport' },
          { id: '3', description: 'Company Registration' }
        ]
      };

      res.status(200).json({
        status: 'SUCCESS',
        data: coverageOptions
      });

    } catch (error) {
      logger.error('Error in getCoverageOptions controller', { error: error.message });
      next({
        status: 500,
        message: 'Error retrieving coverage options',
        code: 'COVERAGE_OPTIONS_ERROR'
      });
    }
  }

  async getQuoteStatistics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
      const end = endDate ? new Date(endDate) : new Date(); // Default: now

      const stats = await motorInsuranceService.getQuoteStatistics(start, end);

      res.status(200).json({
        status: 'SUCCESS',
        data: {
          period: {
            startDate: start,
            endDate: end
          },
          statistics: stats
        }
      });

    } catch (error) {
      logger.error('Error in getQuoteStatistics controller', { error: error.message });
      next({
        status: 500,
        message: 'Error retrieving quote statistics',
        code: 'STATISTICS_ERROR'
      });
    }
  }

  async expireOldQuotes(req, res, next) {
    try {
      const expiredCount = await motorInsuranceService.expireOldQuotes();

      res.status(200).json({
        status: 'SUCCESS',
        data: {
          expiredQuotes: expiredCount,
          message: `${expiredCount} quotes have been expired`
        }
      });

    } catch (error) {
      logger.error('Error in expireOldQuotes controller', { error: error.message });
      next({
        status: 500,
        message: 'Error expiring old quotes',
        code: 'QUOTE_EXPIRY_ERROR'
      });
    }
  }

  async healthCheck(req, res, next) {
    try {
      // Perform basic health checks
      const iceCashHealth = await iceCashService.healthCheck();
      
      res.status(200).json({
        status: 'SUCCESS',
        data: {
          motorInsuranceService: 'healthy',
          iceCashService: iceCashHealth.status,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in motor insurance health check', { error: error.message });
      res.status(503).json({
        status: 'ERROR',
        errorCode: 'SERVICE_UNAVAILABLE',
        errorMessage: 'Motor insurance service is currently unavailable',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new MotorInsuranceController();