

// src/models/ratingModel.js
const { db } = require('../db');
const logger = require('../utils/logger');

class RatingModel {

  /**
   * Get all available products with their packages
   */
  static async getAllProducts() {
    try {
      const products = await db('rating_products as rp')
        .select(
          'rp.*',
          db.raw(`json_agg(
            DISTINCT jsonb_build_object(
              'package_id', pkg.package_id,
              'package_name', pkg.package_name,
              'rate', pkg.rate,
              'currency', pkg.currency,
              'minimum_premium', pkg.minimum_premium
            )
          ) FILTER (WHERE pkg.package_id IS NOT NULL) as packages`)
        )
        .leftJoin('rating_packages as pkg', 'rp.product_id', 'pkg.product_id')
        .where('rp.status', 'ACTIVE')
        .groupBy('rp.product_id', 'rp.product_name', 'rp.product_category', 'rp.rating_type', 'rp.status', 'rp.created_at', 'rp.updated_at');

      return products;
    } catch (error) {
      logger.error('Error fetching all products', { error: error.message });
      throw new Error('Failed to fetch products');
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(productId) {
    try {
      const product = await db('rating_products')
        .select('*')
        .where('product_id', productId)
        .first();

      return product;
    } catch (error) {
      logger.error('Error fetching product by ID', { error: error.message, productId });
      throw new Error('Failed to fetch product');
    }
  }

  /**
   * Get package details with benefits and limits
   */
  static async getPackageDetails(productId, packageId) {
    try {
      const packageData = await db('rating_packages as rp')
        .select(
          'rp.*',
          db.raw(`json_agg(
            DISTINCT jsonb_build_object(
              'type', pb.benefit_type,
              'value', pb.benefit_value,
              'description', pb.benefit_description
            )
          ) FILTER (WHERE pb.benefit_type IS NOT NULL) as benefits`),
          db.raw(`json_agg(
            DISTINCT jsonb_build_object(
              'type', pl.limit_type,
              'value', pl.limit_value,
              'description', pl.limit_description
            )
          ) FILTER (WHERE pl.limit_type IS NOT NULL) as limits`)
        )
        .leftJoin('package_benefits as pb', function() {
          this.on('rp.package_id', '=', 'pb.package_id')
              .andOn('rp.product_id', '=', 'pb.product_id');
        })
        .leftJoin('package_limits as pl', function() {
          this.on('rp.package_id', '=', 'pl.package_id')
              .andOn('rp.product_id', '=', 'pl.product_id');
        })
        .where('rp.product_id', productId)
        .andWhere('rp.package_id', packageId)
        .groupBy('rp.id', 'rp.package_id', 'rp.product_id', 'rp.package_name', 'rp.rate', 'rp.currency', 'rp.minimum_premium', 'rp.created_at', 'rp.updated_at')
        .first();

      return packageData;
    } catch (error) {
      logger.error('Error fetching package details', { error: error.message, productId, packageId });
      throw new Error('Failed to fetch package details');
    }
  }

  /**
   * Calculate premium based on product type and parameters
   */
  static async calculatePremium(productType, riskFactors = {}) {
    try {
      const product = await this.getProductById(productType);
      
      if (!product) {
        throw new Error(`Product '${productType}' not found`);
      }

      switch (product.rating_type) {
        case 'FLAT_PREMIUM':
          return this.calculateFlatPremium(productType, riskFactors);
        
        case 'PERCENTAGE':
          return this.calculatePercentagePremium(productType, riskFactors);
        
        case 'DURATION_BASED':
          return this.calculateDurationBasedPremium(productType, riskFactors);
        
        default:
          throw new Error(`Unsupported rating type: ${product.rating_type}`);
      }
    } catch (error) {
      logger.error('Error calculating premium', { error: error.message, productType, riskFactors });
      throw error;
    }
  }

  /**
   * Calculate flat premium (for HCP, PA, etc.)
   */
  static async calculateFlatPremium(productType, riskFactors = {}) {
    try {
      const { packageType = `${productType}_INDIVIDUAL`, duration = 12, familySize = 1 } = riskFactors;

      const packageData = await db('rating_packages')
        .select('*')
        .where('product_id', productType)
        .andWhere('package_id', packageType)
        .first();

      if (!packageData) {
        throw new Error(`Package '${packageType}' not found for product '${productType}'`);
      }

      let basePremium = parseFloat(packageData.rate);
      
      // Apply family size adjustments for applicable products
      if (productType === 'HCP' && packageType === 'HCP_FAMILY' && familySize > 5) {
        basePremium += (familySize - 5) * 1.0; // $1 per additional member
      }

      const monthlyPremium = basePremium;
      const totalPremium = monthlyPremium * duration;

      return {
        productType,
        packageType,
        basePremium: monthlyPremium,
        monthlyPremium,
        totalPremium,
        currency: packageData.currency || 'USD',
        duration,
        calculation_method: 'FLAT_PREMIUM',
        breakdown: {
          base_rate: parseFloat(packageData.rate),
          family_adjustment: familySize > (packageType.includes('FAMILY') ? 5 : 1) ? (familySize - (packageType.includes('FAMILY') ? 5 : 1)) : 0,
          duration_months: duration
        }
      };
    } catch (error) {
      logger.error('Error calculating flat premium', { error: error.message, productType, riskFactors });
      throw error;
    }
  }

  /**
   * Calculate percentage-based premium (for Domestic/Home insurance)
   */
  static async calculatePercentagePremium(productType, riskFactors = {}) {
    try {
      const { packageType = `${productType}_BASIC`, coverValue = 0, propertyType = 'STANDARD' } = riskFactors;

      const packageData = await db('rating_packages')
        .select('*')
        .where('product_id', productType)
        .andWhere('package_id', packageType)
        .first();

      if (!packageData) {
        throw new Error(`Package '${packageType}' not found for product '${productType}'`);
      }

      if (coverValue <= 0) {
        throw new Error('Cover value must be greater than 0 for percentage-based products');
      }

      const rate = parseFloat(packageData.rate) / 100; // Convert percentage to decimal
      let premium = coverValue * rate;
      
      // Apply minimum premium if specified
      if (packageData.minimum_premium && premium < parseFloat(packageData.minimum_premium)) {
        premium = parseFloat(packageData.minimum_premium);
      }

      return {
        productType,
        packageType,
        coverValue,
        rate: parseFloat(packageData.rate),
        calculatedPremium: premium,
        minimumPremium: packageData.minimum_premium,
        currency: packageData.currency || 'USD',
        calculation_method: 'PERCENTAGE',
        breakdown: {
          cover_value: coverValue,
          rate_percentage: parseFloat(packageData.rate),
          calculated_premium: coverValue * rate,
          minimum_applied: premium > (coverValue * rate)
        }
      };
    } catch (error) {
      logger.error('Error calculating percentage premium', { error: error.message, productType, riskFactors });
      throw error;
    }
  }

  /**
   * Calculate duration-based premium (for Travel insurance)
   */
  static async calculateDurationBasedPremium(productType, riskFactors = {}) {
    try {
      const { 
        packageType = `${productType}_BASIC`, 
        duration = 7, 
        destination = 'REGIONAL',
        coverType = 'BASIC',
        travelers = 1 
      } = riskFactors;

      const packageData = await db('rating_packages')
        .select('*')
        .where('product_id', productType)
        .andWhere('package_id', packageType)
        .first();

      if (!packageData) {
        throw new Error(`Package '${packageType}' not found for product '${productType}'`);
      }

      let baseDailyRate = parseFloat(packageData.rate);
      
      // Apply destination multipliers
      const destinationMultipliers = {
        'DOMESTIC': 1.0,
        'REGIONAL': 1.2,
        'INTERNATIONAL': 1.5,
        'WORLDWIDE': 2.0
      };

      // Apply cover type multipliers
      const coverMultipliers = {
        'BASIC': 1.0,
        'COMPREHENSIVE': 1.8
      };

      const destinationMultiplier = destinationMultipliers[destination] || 1.0;
      const coverMultiplier = coverMultipliers[coverType] || 1.0;

      const adjustedDailyRate = baseDailyRate * destinationMultiplier * coverMultiplier;
      const totalPremium = adjustedDailyRate * duration * travelers;

      return {
        productType,
        packageType,
        duration,
        destination,
        coverType,
        travelers,
        baseDailyRate,
        adjustedDailyRate,
        totalPremium,
        currency: packageData.currency || 'USD',
        calculation_method: 'DURATION_BASED',
        breakdown: {
          base_daily_rate: baseDailyRate,
          destination_multiplier: destinationMultiplier,
          cover_multiplier: coverMultiplier,
          adjusted_daily_rate: adjustedDailyRate,
          duration_days: duration,
          number_of_travelers: travelers
        }
      };
    } catch (error) {
      logger.error('Error calculating duration-based premium', { error: error.message, productType, riskFactors });
      throw error;
    }
  }

  /**
   * Get all packages for a product
   */
  static async getProductPackages(productId) {
    try {
      const packages = await db('rating_packages')
        .select('*')
        .where('product_id', productId)
        .orderBy('package_name');

      return packages;
    } catch (error) {
      logger.error('Error fetching product packages', { error: error.message, productId });
      throw new Error('Failed to fetch product packages');
    }
  }

  /**
   * Vehicle premium calculation (for motor insurance)
   */
  static async calculateVehiclePremium(vehicleData) {
    try {
      const { 
        vehicleValue, 
        insuranceType, 
        durationMonths = 12, 
        coverType = 'COMPREHENSIVE' 
      } = vehicleData;

      if (!vehicleValue || vehicleValue <= 0) {
        throw new Error('Valid vehicle value is required');
      }

      // Basic motor insurance calculation
      // This would typically be more complex with multiple factors
      let baseRate = 0.05; // 5% base rate

      // Adjust rate based on insurance type
      const insuranceTypeMultipliers = {
        1: 0.8,  // Third party only
        2: 0.9,  // Third party, fire & theft
        3: 1.0,  // Comprehensive
        4: 1.2   // Comprehensive plus
      };

      const typeMultiplier = insuranceTypeMultipliers[insuranceType] || 1.0;
      const adjustedRate = baseRate * typeMultiplier;
      
      // Calculate annual premium
      const annualPremium = vehicleValue * adjustedRate;
      
      // Calculate for duration
      const totalPremium = (annualPremium / 12) * durationMonths;

      return {
        vehicleValue,
        insuranceType,
        coverType,
        durationMonths,
        baseRate: baseRate * 100, // Convert to percentage
        typeMultiplier,
        adjustedRate: adjustedRate * 100,
        annualPremium,
        totalPremium,
        monthlyPremium: totalPremium / durationMonths,
        currency: 'USD',
        calculation_method: 'MOTOR_PERCENTAGE'
      };
    } catch (error) {
      logger.error('Error calculating vehicle premium', { error: error.message, vehicleData });
      throw error;
    }
  }

  /**
   * Get rating statistics
   */
  static async getRatingStatistics() {
    try {
      const productStats = await db('rating_products')
        .select(
          'product_id',
          'product_name',
          'rating_type',
          db.raw('COUNT(rp.package_id) as package_count')
        )
        .leftJoin('rating_packages as rp', 'rating_products.product_id', 'rp.product_id')
        .where('rating_products.status', 'ACTIVE')
        .groupBy('rating_products.product_id', 'rating_products.product_name', 'rating_products.rating_type');

      const totalProducts = await db('rating_products').where('status', 'ACTIVE').count('* as count').first();
      const totalPackages = await db('rating_packages').count('* as count').first();

      return {
        total_products: parseInt(totalProducts.count),
        total_packages: parseInt(totalPackages.count),
        products: productStats
      };
    } catch (error) {
      logger.error('Error fetching rating statistics', { error: error.message });
      throw new Error('Failed to fetch rating statistics');
    }
  }
}

module.exports = RatingModel;