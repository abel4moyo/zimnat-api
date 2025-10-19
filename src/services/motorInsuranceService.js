


// ===================================================================
// SIMPLE MOTOR INSURANCE SERVICE
// File: src/services/motorInsuranceService.js
// ===================================================================

const logger = require('../utils/logger');

// Try to import database, fallback to in-memory storage
let db;
try {
  const dbModule = require('../db');
  db = dbModule.db || dbModule;
  console.log('✅ Database connection available for motor insurance');
} catch (error) {
  console.warn('⚠️  Database not available, using in-memory storage:', error.message);
  db = null;
}

class MotorInsuranceService {
  constructor() {
    // In-memory storage fallback
    this.quotes = new Map();
    
    this.insuranceTypes = {
      '1': { code: 'RTA', description: 'Road Traffic Act', baseRate: 0.015 },
      '2': { code: 'FTP', description: 'Full Third Party', baseRate: 0.025 },
      '3': { code: 'FTPF', description: 'Full Third Party, Fire and Theft', baseRate: 0.035 },
      '4': { code: 'FTPFT', description: 'Comprehensive Cover', baseRate: 0.05 }
    };

    this.vehicleTypes = {
      '1': { type: 'Private Car', use: 'Private Use', multiplier: 1.0 },
      '2': { type: 'Private Car', use: 'Business use', multiplier: 1.3 },
      '3': { type: 'Private Car', use: 'Fleet', multiplier: 1.5 },
      '4': { type: 'Private Car', use: 'Private Hire', multiplier: 2.0 },
      '5': { type: 'Private Car', use: 'Driving School', multiplier: 2.5 },
      '6': { type: 'Trailer', use: 'Domestic Trailers', multiplier: 0.8 },
      '7': { type: 'Trailer', use: 'Caravans', multiplier: 0.9 }
    };
  }

  async generateQuote(quoteRequest) {
    try {
      logger.info('Generating motor insurance quote', { quoteRequest });

      const {
        vrn,
        vehicleValue,
        insuranceType,
        vehicleType,
        durationMonths,
        make,
        model,
        yearManufacture,
        clientDetails,
        licenseOptions
      } = quoteRequest;

      // Validate required fields
      this.validateQuoteRequest(quoteRequest);

      // Calculate insurance premium
      const insurancePremium = await this.calculateInsurancePremium({
        vehicleValue: parseFloat(vehicleValue),
        insuranceType,
        vehicleType,
        durationMonths: parseInt(durationMonths),
        yearManufacture: parseInt(yearManufacture) || new Date().getFullYear()
      });

      // Calculate licensing costs if requested
      let licensingCosts = null;
      if (licenseOptions && licenseOptions.includeLicense) {
        licensingCosts = await this.calculateLicensingCosts(licenseOptions);
      }

      // Generate quote ID
      const quoteId = `MQ${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create quote record
      const quote = {
        quote_id: quoteId,
        product_type: 'MOTOR',
        vrn,
        vehicle_value: vehicleValue,
        insurance_type: insuranceType,
        vehicle_type: vehicleType,
        duration_months: durationMonths,
        make: make || '',
        model: model || '',
        year_manufacture: yearManufacture || new Date().getFullYear(),
        client_details: JSON.stringify(clientDetails),
        premium_amount: insurancePremium.premiumAmount,
        stamp_duty: insurancePremium.stampDuty,
        government_levy: insurancePremium.governmentLevy,
        total_insurance_amount: insurancePremium.totalAmount,
        licensing_costs: licensingCosts ? JSON.stringify(licensingCosts) : null,
        total_amount: licensingCosts ? 
          insurancePremium.totalAmount + licensingCosts.totalAmount : 
          insurancePremium.totalAmount,
        status: 'PENDING',
        valid_until: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        created_at: new Date()
      };

      // Save quote
      await this.saveQuote(quote);

      logger.info('Motor insurance quote generated successfully', { quoteId });

      return {
        quoteId,
        vrn,
        insuranceDetails: {
          type: this.insuranceTypes[insuranceType],
          vehicleType: this.vehicleTypes[vehicleType],
          coverage: insurancePremium,
          duration: durationMonths
        },
        licensingDetails: licensingCosts,
        totalAmount: quote.total_amount,
        validUntil: quote.valid_until,
        status: 'PENDING'
      };

    } catch (error) {
      logger.error('Error generating motor insurance quote', { error: error.message });
      throw error;
    }
  }

  async calculateInsurancePremium({ vehicleValue, insuranceType, vehicleType, durationMonths, yearManufacture }) {
    const insuranceConfig = this.insuranceTypes[insuranceType];
    const vehicleConfig = this.vehicleTypes[vehicleType];

    if (!insuranceConfig || !vehicleConfig) {
      throw new Error('Invalid insurance type or vehicle type');
    }

    // Base premium calculation
    let basePremium = vehicleValue * insuranceConfig.baseRate;
    
    // Apply vehicle type multiplier
    basePremium *= vehicleConfig.multiplier;

    // Apply duration factor
    const durationFactor = durationMonths / 12;
    basePremium *= durationFactor;

    // Apply age depreciation factor
    const currentYear = new Date().getFullYear();
    const vehicleAge = currentYear - yearManufacture;
    const ageFactor = Math.max(0.7, 1 - (vehicleAge * 0.05)); // Max 30% depreciation
    basePremium *= ageFactor;

    // Minimum premium thresholds
    const minimumPremiums = {
      '1': 50,  // RTA
      '2': 100, // FTP
      '3': 150, // FTPF
      '4': 200  // FTPFT
    };

    const premiumAmount = Math.max(basePremium, minimumPremiums[insuranceType]);
    const stampDuty = premiumAmount * 0.03;      // 3% stamp duty
    const governmentLevy = premiumAmount * 0.05; // 5% government levy
    const totalAmount = premiumAmount + stampDuty + governmentLevy;

    return {
      premiumAmount: Math.round(premiumAmount * 100) / 100,
      stampDuty: Math.round(stampDuty * 100) / 100,
      governmentLevy: Math.round(governmentLevy * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    };
  }

  async calculateLicensingCosts(licenseOptions) {
    const { licFrequency, radioTvUsage } = licenseOptions;

    // License frequency costs
    const licenseFees = {
      '1': 20, // 4 months
      '2': 25, // 6 months
      '3': 35  // 12 months
    };

    const licensingFee = licenseFees[licFrequency] || 35;
    const radioTvFee = radioTvUsage === '1' ? 10 : 0;
    const totalAmount = licensingFee + radioTvFee;

    return {
      licensingFee,
      radioTvFee,
      totalAmount,
      frequency: licFrequency,
      includesRadioTv: radioTvUsage === '1'
    };
  }

  validateQuoteRequest(request) {
    const required = ['vrn', 'vehicleValue', 'insuranceType', 'vehicleType', 'durationMonths'];
    const missing = required.filter(field => !request[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (parseFloat(request.vehicleValue) <= 0) {
      throw new Error('Vehicle value must be greater than 0');
    }

    if (!this.insuranceTypes[request.insuranceType]) {
      throw new Error('Invalid insurance type');
    }

    if (!this.vehicleTypes[request.vehicleType]) {
      throw new Error('Invalid vehicle type');
    }
  }

  async saveQuote(quote) {
    try {
      if (db) {
        // Save to database if available
        await db('motor_quotes').insert(quote);
      } else {
        // Save to in-memory storage
        this.quotes.set(quote.quote_id, quote);
      }
    } catch (error) {
      logger.warn('Failed to save quote to database, using in-memory storage', { error: error.message });
      this.quotes.set(quote.quote_id, quote);
    }
  }

  async getQuote(quoteId) {
    try {
      if (db) {
        // Try database first
        const quote = await db('motor_quotes')
          .where('quote_id', quoteId)
          .first();
        if (quote) return quote;
      }
      
      // Fallback to in-memory storage
      return this.quotes.get(quoteId) || null;
    } catch (error) {
      logger.error('Error retrieving motor quote', { quoteId, error: error.message });
      // Fallback to in-memory storage
      return this.quotes.get(quoteId) || null;
    }
  }

  async updateQuoteStatus(quoteId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        ...additionalData,
        updated_at: new Date()
      };

      if (db) {
        await db('motor_quotes')
          .where('quote_id', quoteId)
          .update(updateData);
      } else {
        // Update in-memory storage
        const quote = this.quotes.get(quoteId);
        if (quote) {
          Object.assign(quote, updateData);
          this.quotes.set(quoteId, quote);
        }
      }

      logger.info('Motor quote status updated', { quoteId, status });
      return true;
    } catch (error) {
      logger.error('Error updating motor quote status', { quoteId, status, error: error.message });
      throw error;
    }
  }
}

module.exports = new MotorInsuranceService();