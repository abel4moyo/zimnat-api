const zimnatQuoteService = require('../services/zimnatQuoteService');
const ratingService = require('../services/ratingService');
const logger = require('../src/utils/logger');
const { successResponse, errorResponse } = require('../src/utils/responseHelper');

class ZimnatQuoteController {
  // Create TPI Quotes
  static async createTPIQuotes(req, res, next) {
    try {
      const quoteData = req.body;
      
      logger.info('Creating TPI quotes', {
        customerReference: quoteData.originalPartnerReference,
        vehicleCount: quoteData.quotes?.length || 0
      });

      // Process each vehicle/quote
      const processedQuotes = [];
      
      if (quoteData.quotes && Array.isArray(quoteData.quotes)) {
        for (const quote of quoteData.quotes) {
          // Calculate premium using rating service
          const premiumCalculation = await ratingService.calculateVehiclePremium({
            vehicleValue: quote.vehicleValue,
            insuranceType: quote.InsuranceType,
            durationMonths: quote.DurationMonths,
            coverType: quote.coverType || 'COMPREHENSIVE'
          });

          // Create quote in database
          const createdQuote = await zimnatQuoteService.createTPIQuote({
            originalPartnerReference: quoteData.originalPartnerReference,
            cardNumber: quoteData.cardNumber,
            transactionDate: quoteData.transactionDate,
            transactionCode: quoteData.transactionCode,
            insuranceID: quoteData.insuranceID,
            quoteDetails: quote,
            premiumCalculation
          });

          processedQuotes.push(createdQuote);
        }
      }

      const response = {
        success: true,
        data: {
          customerReference: quoteData.originalPartnerReference,
          quotes: processedQuotes,
          totalQuotes: processedQuotes.length,
          status: 'QUOTES_CREATED'
        }
      };

      logger.info('TPI quotes created successfully', {
        customerReference: quoteData.originalPartnerReference,
        quotesCreated: processedQuotes.length
      });

      res.json(response);

    } catch (error) {
      logger.error('Error creating TPI quotes', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      next(error);
    }
  }

  // Update TPI Quote (Approve/Reject)
  static async updateTPIQuote(req, res, next) {
    try {
      const updateData = req.body;
      
      logger.info('Updating TPI quote', {
        identifier: updateData.identifier,
        vehicleCount: updateData.vehicles?.length || 0
      });

      const updatedQuotes = [];

      if (updateData.vehicles && Array.isArray(updateData.vehicles)) {
        for (const vehicle of updateData.vehicles) {
          const updatedQuote = await zimnatQuoteService.updateQuoteStatus({
            vehicleRegistration: vehicle.VRN,
            customerReference: updateData.identifier,
            status: 'APPROVED', // or 'REJECTED' based on business logic
            vehicleData: vehicle
          });

          updatedQuotes.push(updatedQuote);
        }
      }

      const response = {
        success: true,
        data: {
          customerReference: updateData.identifier,
          updatedQuotes: updatedQuotes,
          status: 'QUOTES_UPDATED'
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Error updating TPI quote', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      next(error);
    }
  }

  // Get TPI Policy Status
  static async getTPIPolicyStatus(req, res, next) {
    try {
      const { policyNumber, customerReference } = req.body;
      
      logger.info('Getting TPI policy status', {
        policyNumber,
        customerReference
      });

      const policyStatus = await zimnatQuoteService.getPolicyStatus({
        policyNumber,
        customerReference
      });

      res.json({
        success: true,
        data: policyStatus
      });

    } catch (error) {
      logger.error('Error getting TPI policy status', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      next(error);
    }
  }
}

module.exports = ZimnatQuoteController;
