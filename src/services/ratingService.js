


// src/services/ratingService.js
const ratingModel = require('../models/ratingModel'); // Fixed path: removed one '../'
const logger = require('../utils/logger');

class RatingService {
  static async calculateVehiclePremium(vehicleData) {
    try {
      const {
        vehicleValue,
        insuranceType,
        durationMonths,
        coverType = 'COMPREHENSIVE'
      } = vehicleData;

      // Use the ratingModel to calculate vehicle premium
      if (ratingModel && ratingModel.calculateVehiclePremium) {
        return await ratingModel.calculateVehiclePremium(vehicleData);
      }

      // Fallback calculation if ratingModel method not available
      let basePremium = 0;
      let governmentLevy = 0;
      let stampDuty = 0;

      // Basic percentage calculation for motor insurance
      const baseRate = 0.05; // 5% base rate
      basePremium = (vehicleValue * baseRate);

      // Apply insurance type multipliers
      const insuranceTypeMultipliers = {
        1: 0.8,  // Third party only
        2: 0.9,  // Third party, fire & theft
        3: 1.0,  // Comprehensive
        4: 1.2   // Comprehensive plus
      };

      const typeMultiplier = insuranceTypeMultipliers[insuranceType] || 1.0;
      basePremium *= typeMultiplier;

      // Calculate taxes and levies
      governmentLevy = basePremium * 0.02; // 2% government levy
      stampDuty = basePremium * 0.001; // 0.1% stamp duty

      const totalPremium = basePremium + governmentLevy + stampDuty;

      const calculation = {
        basePremium: parseFloat(basePremium.toFixed(2)),
        governmentLevy: parseFloat(governmentLevy.toFixed(2)),
        stampDuty: parseFloat(stampDuty.toFixed(2)),
        totalPremium: parseFloat(totalPremium.toFixed(2)),
        currency: 'USD',
        coverAmount: vehicleValue,
        coverType: coverType,
        durationMonths: durationMonths || 12,
        ratingType: 'PERCENTAGE',
        calculatedAt: new Date().toISOString()
      };

      logger.info('Vehicle premium calculated', {
        vehicleValue,
        coverType,
        totalPremium: calculation.totalPremium
      });

      return calculation;

    } catch (error) {
      logger.error('Error calculating vehicle premium', { 
        error: error.message, 
        vehicleData 
      });
      throw error;
    }
  }

  static async calculateLicensePremium(licenseData) {
    try {
      // Implementation for license premium calculation
      const baseLicenseFee = 50.00; // Base license fee
      const radioTVFee = licenseData.includeRadioTV ? 20.00 : 0.00;
      const adminFee = 5.00;
      
      const totalLicenseFee = baseLicenseFee + radioTVFee + adminFee;

      const calculation = {
        baseLicenseFee,
        radioTVFee,
        adminFee,
        totalLicenseFee,
        currency: 'USD',
        includeRadioTV: licenseData.includeRadioTV || false,
        calculatedAt: new Date().toISOString()
      };

      logger.info('License premium calculated', {
        includeRadioTV: licenseData.includeRadioTV,
        totalLicenseFee: calculation.totalLicenseFee
      });

      return calculation;

    } catch (error) {
      logger.error('Error calculating license premium', { 
        error: error.message, 
        licenseData 
      });
      throw error;
    }
  }

  /**
   * Calculate premium for any product type using the rating model
   */
  static async calculatePremium(productType, riskFactors = {}) {
    try {
      // Try to use the rating model for calculation
      if (ratingModel && ratingModel.calculatePremium) {
        return await ratingModel.calculatePremium(productType, riskFactors);
      }

      // Fallback calculations for different product types
      switch (productType.toUpperCase()) {
        case 'MOTOR':
          return await this.calculateVehiclePremium(riskFactors);
        
        case 'HCP':
          return await this.calculateHCPPremium(riskFactors);
        
        case 'PA':
        case 'PERSONAL_ACCIDENT':
          return await this.calculatePAPremium(riskFactors);
        
        default:
          throw new Error(`Unsupported product type: ${productType}`);
      }

    } catch (error) {
      logger.error('Error calculating premium', { 
        error: error.message, 
        productType, 
        riskFactors 
      });
      throw error;
    }
  }

  /**
   * Calculate HCP premium (fallback method)
   */
  static async calculateHCPPremium(riskFactors = {}) {
    try {
      const { packageType = 'HCP_INDIVIDUAL', familySize = 1, duration = 12 } = riskFactors;

      // Base rates for HCP packages
      const rates = {
        'HCP_INDIVIDUAL': 2.00,
        'HCP_FAMILY': 5.00
      };

      let basePremium = rates[packageType] || rates['HCP_INDIVIDUAL'];

      // Family size adjustments
      if (packageType === 'HCP_FAMILY' && familySize > 5) {
        basePremium += (familySize - 5) * 1.0; // $1 per additional member
      }

      const totalPremium = basePremium * duration;

      return {
        productType: 'HCP',
        packageType,
        familySize,
        duration,
        basePremium,
        monthlyPremium: basePremium,
        totalPremium,
        currency: 'USD',
        calculation_method: 'FLAT_PREMIUM'
      };

    } catch (error) {
      logger.error('Error calculating HCP premium', { error: error.message, riskFactors });
      throw error;
    }
  }

  /**
   * Calculate Personal Accident premium (fallback method)
   */
  static async calculatePAPremium(riskFactors = {}) {
    try {
      const { packageType = 'PA_STANDARD', duration = 12 } = riskFactors;

      // Base rates for PA packages
      const rates = {
        'PA_STANDARD': 1.00,
        'PA_PRESTIGE': 2.50,
        'PA_PREMIER': 5.00
      };

      const basePremium = rates[packageType] || rates['PA_STANDARD'];
      const totalPremium = basePremium * duration;

      return {
        productType: 'PA',
        packageType,
        duration,
        basePremium,
        monthlyPremium: basePremium,
        totalPremium,
        currency: 'USD',
        calculation_method: 'FLAT_PREMIUM'
      };

    } catch (error) {
      logger.error('Error calculating PA premium', { error: error.message, riskFactors });
      throw error;
    }
  }

  /**
   * Get rating configuration for a product
   */
  static async getRatingConfig(productId, packageId) {
    try {
      if (ratingModel && ratingModel.getPackageDetails) {
        return await ratingModel.getPackageDetails(productId, packageId);
      }

      // Fallback configuration
      return {
        product_id: productId,
        package_id: packageId,
        rating_type: 'FLAT_PREMIUM',
        rate: 1.00,
        currency: 'USD'
      };

    } catch (error) {
      logger.error('Error getting rating config', { 
        error: error.message, 
        productId, 
        packageId 
      });
      throw error;
    }
  }

  /**
   * Get all packages for a product
   */
  static async getProductPackages(productId) {
    try {
      if (ratingModel && ratingModel.getProductPackages) {
        return await ratingModel.getProductPackages(productId);
      }

      // Fallback packages
      const fallbackPackages = {
        'HCP': [
          { package_id: 'HCP_INDIVIDUAL', package_name: 'Individual', rate: 2.00 },
          { package_id: 'HCP_FAMILY', package_name: 'Family', rate: 5.00 }
        ],
        'PA': [
          { package_id: 'PA_STANDARD', package_name: 'Standard', rate: 1.00 },
          { package_id: 'PA_PRESTIGE', package_name: 'Prestige', rate: 2.50 },
          { package_id: 'PA_PREMIER', package_name: 'Premier', rate: 5.00 }
        ]
      };

      return fallbackPackages[productId] || [];

    } catch (error) {
      logger.error('Error getting product packages', { 
        error: error.message, 
        productId 
      });
      throw error;
    }
  }
}

module.exports = RatingService;