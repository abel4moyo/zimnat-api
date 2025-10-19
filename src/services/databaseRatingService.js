// ===================================================================
// DATABASE RATING SERVICE IMPLEMENTATION
// File: src/services/databaseRatingService.js
// ===================================================================

const logger = require('../utils/logger');

// Try to import database connection, fallback if not available
let db;
try {
  db = require('../db').db;
} catch (error) {
  console.warn('Database not available, using mock data');
  db = null;
}

class DatabaseRatingService {
  
  /**
   * Get product packages from database
   */
  async getProductPackages(productId) {
    try {
      if (!db) {
        throw new Error('Database not available');
      }

      logger.info('Fetching product packages from database', { productId });

      const packages = await db('fcb_packages')
        .join('fcb_products', 'fcb_packages.product_id', 'fcb_products.product_id')
        .where('fcb_packages.product_id', productId)
        .where('fcb_packages.is_active', true)
        .where('fcb_products.status', 'ACTIVE')
        .select([
          'fcb_packages.*',
          'fcb_products.product_name',
          'fcb_products.rating_type'
        ])
        .orderBy('fcb_packages.sort_order');

      // Get benefits for each package
      for (const pkg of packages) {
        const benefits = await db('fcb_package_benefits')
          .where('package_id', pkg.package_id)
          .select('benefit_type', 'benefit_value', 'benefit_unit');
        
        pkg.benefits = benefits.map(b => 
          `${b.benefit_type}: ${b.benefit_value}${b.benefit_unit || ''}`
        );

        // Get limits
        const limits = await db('fcb_package_limits')
          .where('package_id', pkg.package_id)
          .first();
        
        pkg.limits = limits || {};
      }

      return packages;

    } catch (error) {
      logger.error('Error fetching product packages', { error: error.message, productId });
      throw error;
    }
  }

  /**
   * Calculate premium using database rates and factors
   */
  async calculatePremium(packageId, riskFactors = {}, duration = 12) {
    try {
      if (!db) {
        throw new Error('Database not available');
      }

      logger.info('Calculating premium from database', { packageId, riskFactors, duration });

      // Get package details
      const packageData = await db('fcb_packages')
        .join('fcb_products', 'fcb_packages.product_id', 'fcb_products.product_id')
        .where('fcb_packages.package_id', packageId)
        .where('fcb_packages.is_active', true)
        .first();

      if (!packageData) {
        throw new Error(`Package ${packageId} not found`);
      }

      let basePremium = packageData.rate;
      let monthlyPremium = basePremium;
      const factors = [];
      
      // Apply rating factors
      const ratingFactors = await db('fcb_rating_factors')
        .where('product_id', packageData.product_id);

      for (const factor of ratingFactors) {
        let shouldApply = false;
        let factorValue = 1.0;

        switch (factor.factor_type) {
          case 'AGE_BAND':
            if (riskFactors.age) {
              const age = riskFactors.age;
              if (factor.factor_key === '18-30' && age >= 18 && age <= 30) shouldApply = true;
              if (factor.factor_key === '31-45' && age >= 31 && age <= 45) shouldApply = true;
              if (factor.factor_key === '46-60' && age >= 46 && age <= 60) shouldApply = true;
              if (factor.factor_key === '61-70' && age >= 61 && age <= 70) shouldApply = true;
            }
            factorValue = factor.factor_multiplier || 1.0;
            break;

          case 'FAMILY_SIZE':
            if (riskFactors.familySize && riskFactors.familySize > 2) {
              shouldApply = true;
              factorValue = (riskFactors.familySize - 2) * (factor.factor_addition || 0);
            }
            break;

          case 'COVER_TYPE':
            if (riskFactors.coverType === factor.factor_key) {
              shouldApply = true;
              factorValue = factor.factor_multiplier || 1.0;
            }
            break;
        }

        if (shouldApply) {
          if (factor.factor_multiplier) {
            monthlyPremium *= factorValue;
          } else if (factor.factor_addition) {
            monthlyPremium += factorValue;
          }

          factors.push({
            type: factor.factor_type,
            key: factor.factor_key,
            multiplier: factor.factor_multiplier,
            addition: factor.factor_addition,
            applied: factorValue
          });
        }
      }

      // Handle percentage-based products (like Domestic Insurance)
      if (packageData.rating_type === 'PERCENTAGE' && riskFactors.sumInsured) {
        const percentageRate = packageData.rate / 100; // Convert to decimal
        monthlyPremium = (riskFactors.sumInsured * percentageRate) / 12; // Monthly rate
        
        // Apply minimum premium if specified
        if (packageData.minimum_premium && monthlyPremium * 12 < packageData.minimum_premium) {
          monthlyPremium = packageData.minimum_premium / 12;
        }
      }

      const totalPremium = monthlyPremium * duration;

      const calculation = {
        packageId: packageData.package_id,
        packageName: packageData.package_name,
        basePremium: basePremium,
        monthlyPremium: Math.round(monthlyPremium * 100) / 100,
        totalPremium: Math.round(totalPremium * 100) / 100,
        currency: packageData.currency,
        duration: duration,
        factors: factors,
        breakdown: {
          basePremium: basePremium,
          adjustedMonthly: monthlyPremium,
          months: duration,
          riskFactors: riskFactors
        },
        calculationMethod: 'DATABASE_DRIVEN',
        calculatedAt: new Date().toISOString()
      };

      return calculation;

    } catch (error) {
      logger.error('Error calculating premium', { error: error.message, packageId, riskFactors });
      throw error;
    }
  }

  /**
   * Generate a complete quote and store in database
   */
  async generateQuote(productId, packageId, customerInfo, riskFactors = {}, duration = 12) {
    try {
      if (!db) {
        throw new Error('Database not available');
      }

      logger.info('Generating quote', { productId, packageId, customerInfo: customerInfo.email });

      // Calculate premium
      const calculation = await this.calculatePremium(packageId, riskFactors, duration);

      // Generate quote number
      const quoteNumber = `${productId}-QTE-${Date.now()}`;
      
      // Set expiry (48 hours from now)
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create quote object
      const quoteData = {
        quote_number: quoteNumber,
        product_id: productId,
        package_id: packageId,
        customer_info: JSON.stringify(customerInfo),
        risk_factors: JSON.stringify(riskFactors),
        duration_months: duration,
        base_premium: calculation.basePremium,
        monthly_premium: calculation.monthlyPremium,
        total_premium: calculation.totalPremium,
        currency: calculation.currency,
        calculation_breakdown: JSON.stringify(calculation.breakdown),
        rating_factors_applied: JSON.stringify(calculation.factors),
        status: 'ACTIVE',
        expires_at: expiresAt,
        created_at: new Date()
      };

      // Save quote to database
      const [quoteId] = await db('fcb_quotes').insert(quoteData).returning('quote_id');

      const quote = {
        quoteId: quoteId,
        quoteNumber: quoteNumber,
        productId: productId,
        packageId: calculation.packageId,
        packageName: calculation.packageName,
        customerInfo: customerInfo,
        riskFactors: riskFactors,
        duration: duration,
        basePremium: calculation.basePremium,
        monthlyPremium: calculation.monthlyPremium,
        totalPremium: calculation.totalPremium,
        currency: calculation.currency,
        factors: calculation.factors,
        breakdown: calculation.breakdown,
        status: 'ACTIVE',
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      };

      logger.info('Quote generated successfully', { quoteNumber, quoteId });

      return quote;

    } catch (error) {
      logger.error('Error generating quote', { error: error.message, productId, packageId });
      throw error;
    }
  }

  /**
   * Get quote by quote number
   */
  async getQuote(quoteNumber) {
    try {
      if (!db) {
        throw new Error('Database not available');
      }

      const quote = await db('fcb_quotes')
        .where('quote_number', quoteNumber)
        .first();

      if (!quote) {
        throw new Error(`Quote ${quoteNumber} not found`);
      }

      // Parse JSON fields
      quote.customer_info = JSON.parse(quote.customer_info);
      quote.risk_factors = JSON.parse(quote.risk_factors || '{}');
      quote.calculation_breakdown = JSON.parse(quote.calculation_breakdown || '{}');
      quote.rating_factors_applied = JSON.parse(quote.rating_factors_applied || '[]');

      return quote;

    } catch (error) {
      logger.error('Error fetching quote', { error: error.message, quoteNumber });
      throw error;
    }
  }

  /**
   * Check if quote is still valid (not expired)
   */
  isQuoteValid(quote) {
    if (!quote) return false;
    if (quote.status !== 'ACTIVE') return false;
    
    const expiryTime = new Date(quote.expires_at);
    const now = new Date();
    
    return now < expiryTime;
  }

  /**
   * Create policy from valid quote
   */
  async createPolicyFromQuote(quoteId, paymentData) {
    try {
      if (!db) {
        throw new Error('Database not available');
      }

      logger.info('Creating policy from quote', { quoteId, paymentRef: paymentData.paymentReference });

      // Get quote
      const quote = await db('fcb_quotes')
        .where('quote_id', quoteId)
        .first();

      if (!quote) {
        throw new Error(`Quote ${quoteId} not found`);
      }

      if (!this.isQuoteValid(quote)) {
        throw new Error('Quote has expired or is not active');
      }

      // Generate policy number
      const policyNumber = `POL-${Date.now()}`;
      
      // Calculate policy dates
      const effectiveDate = new Date();
      const expiryDate = new Date(effectiveDate.getTime() + quote.duration_months * 30 * 24 * 60 * 60 * 1000);

      // Create policy
      const policyData = {
        policy_number: policyNumber,
        quote_id: quote.quote_id,
        product_id: quote.product_id,
        package_id: quote.package_id,
        customer_info: quote.customer_info,
        premium_amount: quote.total_premium,
        currency: quote.currency,
        effective_date: effectiveDate,
        expiry_date: expiryDate,
        status: 'ACTIVE',
        payment_reference: paymentData.paymentReference,
        created_at: new Date()
      };

      const [policyId] = await db('fcb_policies').insert(policyData).returning('policy_id');

      // Update quote status
      await db('fcb_quotes')
        .where('quote_id', quoteId)
        .update({ status: 'ACCEPTED', updated_at: new Date() });

      // Record payment transaction
      const transactionData = {
        transaction_id: paymentData.transactionId || `TXN-${Date.now()}`,
        policy_id: policyId,
        payment_method: paymentData.paymentMethod || 'ICECASH',
        amount: quote.total_premium,
        currency: quote.currency,
        status: 'COMPLETED',
        payment_reference: paymentData.paymentReference,
        external_reference: paymentData.externalReference,
        processed_at: new Date()
      };

      await db('fcb_payment_transactions').insert(transactionData);

      const policy = {
        policyId: policyId,
        policyNumber: policyNumber,
        quoteId: quote.quote_id,
        productId: quote.product_id,
        packageId: quote.package_id,
        premiumAmount: quote.total_premium,
        currency: quote.currency,
        effectiveDate: effectiveDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: 'ACTIVE',
        paymentReference: paymentData.paymentReference,
        createdAt: new Date().toISOString()
      };

      logger.info('Policy created successfully', { policyNumber, policyId });

      return policy;

    } catch (error) {
      logger.error('Error creating policy from quote', { error: error.message, quoteId });
      throw error;
    }
  }

  /**
   * Get policy by policy number
   */
  async getPolicy(policyNumber) {
    try {
      if (!db) {
        throw new Error('Database not available');
      }

      const policy = await db('fcb_policies')
        .where('policy_number', policyNumber)
        .first();

      if (!policy) {
        throw new Error(`Policy ${policyNumber} not found`);
      }

      // Parse JSON fields
      policy.customer_info = JSON.parse(policy.customer_info);

      return policy;

    } catch (error) {
      logger.error('Error fetching policy', { error: error.message, policyNumber });
      throw error;
    }
  }
}

module.exports = new DatabaseRatingService();