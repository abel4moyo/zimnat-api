const zimnatQuoteModel = require('../../models/zimnatQuoteModel');
const ratingService = require('./ratingService');
const logger = require('../utils/logger');

class ZimnatQuoteService {
  static async createTPIQuote(quoteData) {
    try {
      // Generate unique quote ID
      const quoteId = `TPI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare quote data for database
      const dbQuoteData = {
        quote_id: quoteId,
        customer_reference: quoteData.originalPartnerReference,
        vehicle_registration: quoteData.quoteDetails?.VRN,
        insurance_type: quoteData.quoteDetails?.InsuranceType || 1,
        quote_data: JSON.stringify({
          originalData: quoteData,
          premiumCalculation: quoteData.premiumCalculation,
          createdAt: new Date().toISOString()
        }),
        status: 'PENDING'
      };

      // Save to database
      const savedQuote = await zimnatQuoteModel.create(dbQuoteData);

      // Format response according to Zimnat API structure
      return {
        id: savedQuote.id,
        quoteId: quoteId,
        customerReference: quoteData.originalPartnerReference,
        vehicleRegistration: quoteData.quoteDetails?.VRN,
        premiumAmount: quoteData.premiumCalculation?.totalPremium || 0,
        currency: 'USD',
        status: 'PENDING',
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        policy: {
          insuranceType: quoteData.quoteDetails?.InsuranceType,
          coverAmount: quoteData.premiumCalculation?.coverAmount,
          durationMonths: quoteData.quoteDetails?.DurationMonths,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + (quoteData.quoteDetails?.DurationMonths || 12) * 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

    } catch (error) {
      logger.error('Error creating TPI quote', error);
      throw error;
    }
  }

  static async updateQuoteStatus(updateData) {
    try {
      // Find existing quote
      const existingQuote = await zimnatQuoteModel.findByVehicleAndCustomer(
        updateData.vehicleRegistration,
        updateData.customerReference
      );

      if (!existingQuote) {
        throw new Error('Quote not found');
      }

      // Update quote status
      const updatedQuote = await zimnatQuoteModel.updateStatus(
        existingQuote.id,
        updateData.status
      );

      // If approved, create policy
      if (updateData.status === 'APPROVED') {
        await this.createPolicyFromQuote(existingQuote, updateData.vehicleData);
      }

      return {
        quoteId: existingQuote.quote_id,
        status: updateData.status,
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error updating quote status', error);
      throw error;
    }
  }

  static async createPolicyFromQuote(quote, vehicleData) {
    try {
      // Generate policy number
      const policyNumber = `POL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const policyData = {
        policy_number: policyNumber,
        quote_id: quote.quote_id,
        customer_data: JSON.stringify({
          customerReference: quote.customer_reference,
          vehicleRegistration: quote.vehicle_registration,
          vehicleData: vehicleData
        }),
        vehicle_data: JSON.stringify(vehicleData),
        policy_data: JSON.stringify({
          quoteData: JSON.parse(quote.quote_data),
          policyNumber: policyNumber,
          issuedAt: new Date().toISOString()
        }),
        status: 'ACTIVE'
      };

      // Save policy to database (you'll need to create zimnatPolicyModel)
      // const savedPolicy = await zimnatPolicyModel.create(policyData);

      logger.info('Policy created from quote', {
        policyNumber,
        quoteId: quote.quote_id
      });

      return policyNumber;

    } catch (error) {
      logger.error('Error creating policy from quote', error);
      throw error;
    }
  }

  static async getPolicyStatus(statusData) {
    try {
      // Implementation for getting policy status
      // This would interact with your policy database/external service
      
      return {
        policyNumber: statusData.policyNumber,
        customerReference: statusData.customerReference,
        status: 'ACTIVE',
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting policy status', error);
      throw error;
    }
  }
}

module.exports = ZimnatQuoteService;