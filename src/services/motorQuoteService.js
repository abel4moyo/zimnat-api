/**
 * ===================================================================
 * ZIMNAT API v2.1 - Motor Quote Service
 * File: src/services/motorQuoteService.js
 * ===================================================================
 *
 * Handles motor quote creation, update, and status tracking
 * for ZIMNAT API v2.1 specification
 */

const db = require('../db/knex');
const crypto = require('crypto');
const logger = require('../utils/logger');
const EnumService = require('./enumService');

class MotorQuoteService {

  /**
   * Generate unique reference ID
   * Format: MQ-{timestamp}-{random}
   * @returns {String} Reference ID
   */
  static generateReferenceId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `MQ-${timestamp}-${random}`;
  }

  /**
   * Map delivery method string to code
   * @param {String|Number} deliveryMethod - Delivery method name or code
   * @returns {Number} Delivery method code
   */
  static mapDeliveryMethod(deliveryMethod) {
    if (typeof deliveryMethod === 'number') return deliveryMethod;

    const mapping = {
      'POSTAL': 1,
      'OFFICE COLLECTION': 2,
      'EMAIL': 3,
      'SMS': 4,
      'Email': 3,  // Handle case variations
      'email': 3,
      'Sms': 4,
      'sms': 4
    };

    return mapping[deliveryMethod] || deliveryMethod;
  }

  /**
   * Map insurance type string to code
   * @param {String|Number} insuranceType - Insurance type name or code
   * @returns {Number} Insurance type code
   */
  static mapInsuranceType(insuranceType) {
    if (typeof insuranceType === 'number') return insuranceType;

    const mapping = {
      'RTA': 1,
      'FTP': 2,
      'FTPF': 3,
      'FTPFT': 4,
      'Comprehensive': 4,  // FTPFT is Comprehensive Cover
      'comprehensive': 4,
      'Third Party': 2,
      'third party': 2
    };

    return mapping[insuranceType] || insuranceType;
  }

  /**
   * Map payment method string to code
   * @param {String|Number} paymentMethod - Payment method name or code
   * @returns {Number} Payment method code
   */
  static mapPaymentMethod(paymentMethod) {
    if (typeof paymentMethod === 'number') return paymentMethod;

    const mapping = {
      'CASH': 1,
      'Cash': 1,
      'cash': 1,
      'ICECASH': 2,
      'ICEcash': 2,
      'icecash': 2,
      'ECOCASH': 3,
      'EcoCash': 3,
      'ecocash': 3,
      'AIRTIME': 4,
      'Airtime': 4,
      'airtime': 4,
      'NETONE': 5,
      'Netone': 5,
      'netone': 5,
      'TELECEL': 6,
      'Telecel': 6,
      'telecel': 6,
      'VISA': 7,
      'MASTERCARD': 7,
      'Master or Visa Card': 7,
      'visa': 7,
      'mastercard': 7,
      'ZIMSWITCH': 8,
      'Zimswitch': 8,
      'zimswitch': 8,
      'IVERI': 9,
      'iVeri': 9,
      'iveri': 9,
      'FBC': 10,
      'fbc': 10,
      'PREPAID': 11,
      'Prepaid': 11,
      'prepaid': 11,
      'PDS': 12,
      'pds': 12,
      'ZIPIT': 13,
      'Zipit': 13,
      'zipit': 13
    };

    return mapping[paymentMethod] || paymentMethod;
  }

  /**
   * Get fixed partner configuration for motor quotes
   * @returns {Promise<Object>} Partner configuration with actual partner_id from database
   */
  static async getPartnerConfig() {
    const partnerCode = '20117846';
    const psk = '607914519953940821885067';

    // Look up partner from database to get actual partner_id
    const partner = await db('fcb_partners')
      .where('partner_code', partnerCode)
      .first();

    if (!partner) {
      throw {
        status: 500,
        code: 'PARTNER_NOT_FOUND',
        message: `Partner with code ${partnerCode} not found in database`
      };
    }

    return {
      partnerId: partner.partner_id, // Use actual auto-increment ID
      partnerCode: partnerCode,
      psk: psk
    };
  }

  /**
   * Create motor insurance quote
   * @param {Object} quoteData - Quote request data
   * @returns {Object} Quote details
   */
  static async createMotorQuote(quoteData) {
    try {
      const {
        externalReference,
        currency,
        requestedAt,
        vehicles
      } = quoteData;

      // Get fixed partner configuration
      const { partnerId, psk } = await this.getPartnerConfig();

      const quotes = [];

      for (const vehicle of vehicles) {
        // Generate reference ID
        const referenceId = this.generateReferenceId();

        // Validate vehicle type
        const isValidVehicleType = await EnumService.isValidVehicleType(vehicle.vehicleType);
        if (!isValidVehicleType) {
          throw {
            status: 400,
            code: 'INVALID_VEHICLE_TYPE',
            message: `Invalid vehicle type: ${vehicle.vehicleType}`
          };
        }

        // Calculate quote amounts (simplified - should integrate with actual rating engine)
        const insurancePremium = this.calculateInsurancePremium(vehicle);
        const licenseFee = this.calculateLicenseFee(vehicle);
        const radioFee = this.calculateRadioFee(vehicle);
        const totalAmount = insurancePremium + licenseFee + radioFee;

        // Calculate expiry (24 hours from now)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Create quote record
        const [quoteId] = await db('zimnat_motor_quotes').insert({
          reference_id: referenceId,
          external_reference: externalReference,
          partner_id: partnerId,
          quote_type: this.determineQuoteType(vehicle),
          currency: currency,
          vrn: vehicle.vrn,
          vehicle_type: vehicle.vehicleType,
          vehicle_value: vehicle.vehicleValue,
          duration_months: vehicle.durationMonths,
          end_date: vehicle.endDate,
          insurance_type: this.mapInsuranceType(vehicle.insuranceType),
          lic_frequency: vehicle.licFrequency,
          radio_tv_usage: vehicle.radioTVUsage,
          radio_tv_frequency: vehicle.radioTVFrequency,
          payment_method: this.mapPaymentMethod(vehicle.paymentMethod),
          delivery_method: this.mapDeliveryMethod(vehicle.deliveryMethod),
          client_data: JSON.stringify(vehicle.client),
          insurance_premium: insurancePremium,
          license_fee: licenseFee,
          radio_fee: radioFee,
          total_amount: totalAmount,
          status: 'pending',
          requested_at: requestedAt || new Date(),
          expires_at: expiresAt,
          created_at: new Date(),
          updated_at: new Date()
        }).returning('id');

        logger.info('Motor quote created', {
          quoteId,
          referenceId,
          vrn: vehicle.vrn,
          totalAmount,
          currency
        });

        quotes.push({
          referenceId,
          vrn: vehicle.vrn,
          insurancePremium,
          licenseFee,
          radioFee,
          totalAmount,
          currency,
          status: 'pending',
          expiresAt
        });
      }

      return quotes;

    } catch (error) {
      if (error.code) {
        throw error;
      }

      logger.error('Failed to create motor quote', {
        externalReference: quoteData.externalReference,
        error: error.message,
        stack: error.stack
      });

      throw {
        status: 500,
        code: 'QUOTE_CREATION_ERROR',
        message: 'Failed to create motor quote'
      };
    }
  }

  /**
   * Update motor quote
   * @param {String} referenceId - Quote reference ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated quote
   */
  static async updateMotorQuote(referenceId, updateData) {
    try {
      const quote = await db('zimnat_motor_quotes')
        .where('reference_id', referenceId)
        .first();

      if (!quote) {
        throw {
          status: 404,
          code: 'QUOTE_NOT_FOUND',
          message: 'Quote not found'
        };
      }

      // Check if quote has expired
      if (new Date() > new Date(quote.expires_at)) {
        throw {
          status: 400,
          code: 'QUOTE_EXPIRED',
          message: 'Quote has expired'
        };
      }

      // Check if quote is already accepted
      if (quote.status === 'paid') {
        throw {
          status: 400,
          code: 'QUOTE_ALREADY_ACCEPTED',
          message: 'Quote has already been accepted'
        };
      }

      const updateFields = {
        updated_at: new Date()
      };

      if (updateData.paymentMethod) {
        updateFields.payment_method = this.mapPaymentMethod(updateData.paymentMethod);
      }

      if (updateData.deliveryMethod) {
        updateFields.delivery_method = this.mapDeliveryMethod(updateData.deliveryMethod);
      }

      if (updateData.status) {
        updateFields.status = updateData.status;
      }

      await db('zimnat_motor_quotes')
        .where('reference_id', referenceId)
        .update(updateFields);

      logger.info('Motor quote updated', {
        referenceId,
        updates: updateFields
      });

      return await this.getQuoteByReference(referenceId);

    } catch (error) {
      if (error.code) {
        throw error;
      }

      logger.error('Failed to update motor quote', {
        referenceId,
        error: error.message
      });

      throw {
        status: 500,
        code: 'QUOTE_UPDATE_ERROR',
        message: 'Failed to update motor quote'
      };
    }
  }

  /**
   * Get quote status by reference ID
   * @param {String} referenceId - Quote reference ID
   * @returns {Object} Quote details
   */
  static async getQuoteByReference(referenceId) {
    try {
      const quote = await db('zimnat_motor_quotes')
        .where('reference_id', referenceId)
        .first();

      if (!quote) {
        throw {
          status: 404,
          code: 'QUOTE_NOT_FOUND',
          message: 'Quote not found'
        };
      }

      return this.formatQuoteResponse(quote);

    } catch (error) {
      if (error.code) {
        throw error;
      }

      logger.error('Failed to get quote', {
        referenceId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Get multiple quotes by reference IDs
   * @param {Array} referenceIds - Array of reference IDs
   * @returns {Array} Array of quote details
   */
  static async getQuotesByReferences(referenceIds) {
    try {
      const quotes = await db('zimnat_motor_quotes')
        .whereIn('reference_id', referenceIds);

      return quotes.map(q => this.formatQuoteResponse(q));

    } catch (error) {
      logger.error('Failed to get quotes', {
        referenceIds,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Mark quotes as expired (cleanup job)
   * @returns {Number} Number of quotes marked as expired
   */
  static async markExpiredQuotes() {
    try {
      const count = await db('zimnat_motor_quotes')
        .where('status', 'pending')
        .where('expires_at', '<', new Date())
        .update({
          status: 'expired',
          updated_at: new Date()
        });

      logger.info('Expired quotes marked', { count });

      return count;

    } catch (error) {
      logger.error('Failed to mark expired quotes', {
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Calculate insurance premium (simplified)
   * @param {Object} vehicle - Vehicle data
   * @returns {Number} Premium amount
   */
  static calculateInsurancePremium(vehicle) {
    // Simplified calculation - should integrate with actual rating engine
    const baseRate = 100;
    const vehicleValueFactor = (vehicle.vehicleValue || 0) * 0.05;
    const durationFactor = (vehicle.durationMonths || 12) / 12;

    return Math.round((baseRate + vehicleValueFactor) * durationFactor * 100) / 100;
  }

  /**
   * Calculate license fee (simplified)
   * @param {Object} vehicle - Vehicle data
   * @returns {Number} License fee
   */
  static calculateLicenseFee(vehicle) {
    if (!vehicle.licFrequency) return 0;

    // Simplified calculation
    const monthlyRate = 10;
    const frequency = vehicle.licFrequency || 12;

    return Math.round(monthlyRate * frequency * 100) / 100;
  }

  /**
   * Calculate radio/TV fee (simplified)
   * @param {Object} vehicle - Vehicle data
   * @returns {Number} Radio/TV fee
   */
  static calculateRadioFee(vehicle) {
    if (!vehicle.radioTVUsage || !vehicle.radioTVFrequency) return 0;

    // Simplified calculation
    const monthlyRate = 5;
    const frequency = vehicle.radioTVFrequency || 12;

    return Math.round(monthlyRate * frequency * 100) / 100;
  }

  /**
   * Determine quote type based on vehicle data
   * @param {Object} vehicle - Vehicle data
   * @returns {String} Quote type (insurance, license, combined)
   */
  static determineQuoteType(vehicle) {
    const hasInsurance = vehicle.insuranceType !== undefined;
    const hasLicense = vehicle.licFrequency !== undefined;

    if (hasInsurance && hasLicense) return 'combined';
    if (hasInsurance) return 'insurance';
    if (hasLicense) return 'license';

    return 'insurance'; // default
  }

  /**
   * Format quote response
   * @param {Object} quote - Quote data from database
   * @returns {Object} Formatted quote response
   */
  static formatQuoteResponse(quote) {
    // client_data is JSONB - Knex returns it as object, not string
    const clientData = typeof quote.client_data === 'string'
      ? JSON.parse(quote.client_data)
      : (quote.client_data || {});

    return {
      referenceId: quote.reference_id,
      externalReference: quote.external_reference,
      quoteType: quote.quote_type,
      currency: quote.currency,
      vehicle: {
        vrn: quote.vrn,
        vehicleType: quote.vehicle_type,
        vehicleValue: parseFloat(quote.vehicle_value || 0)
      },
      amounts: {
        insurancePremium: parseFloat(quote.insurance_premium || 0),
        licenseFee: parseFloat(quote.license_fee || 0),
        radioFee: parseFloat(quote.radio_fee || 0),
        totalAmount: parseFloat(quote.total_amount || 0)
      },
      client: clientData,
      status: quote.status,
      policyNumber: quote.policy_number,
      receiptId: quote.receipt_id,
      requestedAt: quote.requested_at,
      expiresAt: quote.expires_at
    };
  }
}

module.exports = MotorQuoteService;
