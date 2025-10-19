// src/services/hcpService.js
const { db } = require('../db');
const logger = require('../utils/logger');
const crypto = require('crypto');

class HCPService {

  /**
   * Get all available HCP packages with benefits and limits
   */
  static async getAvailablePackages() {
    try {
      const packages = await db('rating_packages as rp')
        .select(
          'rp.package_id',
          'rp.package_name',
          'rp.rate',
          'rp.currency',
          'rp.minimum_premium',
          db.raw(`json_agg(
            DISTINCT jsonb_build_object(
              'type', pb.benefit_type,
              'value', pb.benefit_value,
              'description', pb.benefit_description
            )
          ) as benefits`),
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
        .where('rp.product_id', 'HCP')
        .groupBy('rp.package_id', 'rp.package_name', 'rp.rate', 'rp.currency', 'rp.minimum_premium');

      // Process the benefits and limits to match the BRD structure
      return packages.map(pkg => ({
        packageId: pkg.package_id,
        packageName: pkg.package_name,
        ratingType: 'FLAT_PREMIUM',
        premiumFrequency: ['MONTHLY'],
        rate: parseFloat(pkg.rate),
        currency: pkg.currency,
        description: pkg.package_id === 'HCP_INDIVIDUAL' 
          ? 'HCP cover for one person'
          : 'HCP cover for one family, couple up to a maximum of 4 children',
        benefits: {
          dailyBenefit: 100.00, // As per BRD
          limits: this.parseHCPLimits(pkg.limits || [])
        }
      }));

    } catch (error) {
      logger.error('Error fetching HCP packages', { error: error.message });
      throw new Error('Failed to fetch HCP packages');
    }
  }

  /**
   * Parse HCP limits from database format to BRD structure
   */
  static parseHCPLimits(limits) {
    const limitMap = {
      maxDaysPerEvent: 30,
      maxAmountPerEvent: 3000.00,
      maxDaysPerYear: 60,
      maxAmountPerYear: 6000.00
    };

    // Use database values if available, otherwise use defaults from BRD
    limits.forEach(limit => {
      if (limit.type === 'MAX_DAYS_PER_EVENT') limitMap.maxDaysPerEvent = limit.value;
      if (limit.type === 'MAX_AMOUNT_PER_EVENT') limitMap.maxAmountPerEvent = parseFloat(limit.value);
      if (limit.type === 'MAX_DAYS_PER_YEAR') limitMap.maxDaysPerYear = limit.value;
      if (limit.type === 'MAX_AMOUNT_PER_YEAR') limitMap.maxAmountPerYear = parseFloat(limit.value);
    });

    return limitMap;
  }

  /**
   * Calculate HCP premium based on package type and family size
   */
  static async calculatePremium({ packageType, familySize = 1, duration = 12 }) {
    try {
      // Get package details from rating tables
      const packageData = await db('rating_packages')
        .select('*')
        .where('product_id', 'HCP')
        .andWhere('package_id', packageType)
        .first();

      if (!packageData) {
        const error = new Error(`HCP package '${packageType}' not found`);
        error.status = 404;
        throw error;
      }

      // HCP uses flat premium as per BRD
      let basePremium = parseFloat(packageData.rate);
      
      // Family package logic
      if (packageType === 'HCP_FAMILY') {
        // Family package already includes up to 4 children as per BRD
        // No additional calculation needed for family size <= 5 (couple + 4 children)
        if (familySize > 5) {
          // Additional members beyond the standard family package
          const additionalMembers = familySize - 5;
          basePremium += additionalMembers * 1.0; // $1 per additional member
        }
      } else if (packageType === 'HCP_INDIVIDUAL' && familySize > 1) {
        // If individual package is selected but family size > 1, suggest family package
        logger.warn('Individual package selected for family', { packageType, familySize });
      }

      // Calculate for duration (monthly premium * duration)
      const monthlyPremium = basePremium;
      const totalPremium = monthlyPremium * duration;

      return {
        packageType,
        familySize,
        duration,
        basePremium: monthlyPremium,
        monthlyPremium: monthlyPremium,
        totalPremium: totalPremium,
        currency: packageData.currency || 'USD',
        calculation_method: 'FLAT_PREMIUM',
        breakdown: {
          base_rate: parseFloat(packageData.rate),
          family_adjustment: familySize > (packageType === 'HCP_FAMILY' ? 5 : 1) ? (familySize - (packageType === 'HCP_FAMILY' ? 5 : 1)) : 0,
          duration_months: duration
        }
      };

    } catch (error) {
      if (error.status) throw error;
      logger.error('Error calculating HCP premium', { error: error.message, packageType });
      throw new Error('Failed to calculate HCP premium');
    }
  }

  /**
   * Get detailed package information
   */
  static async getPackageDetails(packageType) {
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
          ) as benefits`),
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
        .where('rp.product_id', 'HCP')
        .andWhere('rp.package_id', packageType)
        .groupBy('rp.id', 'rp.package_id', 'rp.product_id', 'rp.package_name', 'rp.rate', 'rp.currency', 'rp.minimum_premium', 'rp.created_at', 'rp.updated_at')
        .first();

      if (!packageData) {
        const error = new Error(`HCP package '${packageType}' not found`);
        error.status = 404;
        throw error;
      }

      return {
        ...packageData,
        benefits: packageData.benefits || [],
        limits: this.parseHCPLimits(packageData.limits || [])
      };

    } catch (error) {
      if (error.status) throw error;
      logger.error('Error fetching package details', { error: error.message, packageType });
      throw new Error('Failed to fetch package details');
    }
  }

  /**
   * Create HCP quote
   */
  static async createQuote({ quoteNumber, packageType, customerInfo, familySize, duration, premiumCalculation, packageDetails, metadata }) {
    try {
      const quoteData = {
        quotation_number: quoteNumber,
        product_id: 'HCP',
        package_id: packageType,
        premium_amount: premiumCalculation.totalPremium,
        customer_info: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone || null,
          familySize,
          ...customerInfo
        },
        cover_details: {
          packageName: packageDetails.package_name,
          familySize,
          duration,
          benefits: packageDetails.benefits,
          limits: packageDetails.limits,
          calculation: premiumCalculation,
          ...metadata
        },
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days validity
        status: 'GENERATED'
      };

      const [quote] = await db('quotes').insert(quoteData).returning('*');
      
      logger.info('HCP quote created in database', { 
        quoteNumber, 
        quoteId: quote.id,
        premium: premiumCalculation.totalPremium 
      });

      return quote;

    } catch (error) {
      logger.error('Error creating HCP quote', { error: error.message, quoteNumber });
      throw new Error('Failed to create HCP quote');
    }
  }

  /**
   * Get quote by quotation number
   */
  static async getQuoteByNumber(quotationNumber) {
    try {
      const quote = await db('quotes')
        .select('*')
        .where('quotation_number', quotationNumber)
        .andWhere('product_id', 'HCP')
        .first();

      if (!quote) {
        return null;
      }

      // Check if quote is still valid
      if (new Date() > new Date(quote.valid_until)) {
        logger.warn('Quote has expired', { quotationNumber, validUntil: quote.valid_until });
        return null;
      }

      return quote;

    } catch (error) {
      logger.error('Error fetching quote', { error: error.message, quotationNumber });
      throw new Error('Failed to fetch quote');
    }
  }

  /**
   * Create HCP policy from quote
   */
  static async createPolicy({ quote, paymentBreakdown, consentToDataSharing, deliveryMethod }) {
    try {
      const policyNumber = `HCP-POL-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      
      // First, ensure we have a customer record
      const customerInfo = quote.customer_info;
      let customer = await db('customers')
        .where('email', customerInfo.email)
        .first();

      if (!customer) {
        // Create customer if doesn't exist
        const customerData = {
          customer_reference: `HCP-CUST-${Date.now()}`,
          first_name: customerInfo.firstName,
          last_name: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone || null,
          id_number: customerInfo.idNumber || null,
          partner_id: 1 // Default partner ID - adjust as needed
        };

        [customer] = await db('customers').insert(customerData).returning('*');
      }

      // Get product ID from the legacy products table
      const product = await db('products')
        .where('product_code', 'HCP')
        .orWhere('product_name', 'LIKE', '%Hospital%')
        .first();

      if (!product) {
        throw new Error('HCP product not found in products table');
      }

      // Create policy using existing table structure
      const policyData = {
        policy_number: policyNumber,
        customer_id: customer.id,
        product_id: product.id,
        partner_id: customer.partner_id || 1,
        policy_identifier: quote.quotation_number,
        premium_amount: quote.premium_amount,
        outstanding_balance: 0.00,
        policy_status: 'ACTIVE',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        next_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cover_type: quote.package_id
      };

      const [policy] = await db('policies').insert(policyData).returning('*');

      // Update quote status
      await db('quotes')
        .where('quotation_number', quote.quotation_number)
        .update({ 
          status: 'CONVERTED',
          updated_at: new Date()
        });

      // Record payment transaction using the correct table reference
      await this.recordPaymentTransaction({
        policyNumber: policy.policy_number,
        paymentBreakdown,
        quoteId: quote.quotation_number
      });

      logger.info('HCP policy created successfully', { 
        policyNumber: policy.policy_number,
        quoteNumber: quote.quotation_number 
      });

      return policy;

    } catch (error) {
      logger.error('Error creating HCP policy', { 
        error: error.message, 
        quoteNumber: quote.quotation_number 
      });
      throw new Error('Failed to create HCP policy');
    }
  }

  /**
   * Process HCP payment
   */
  static async processPayment(paymentData) {
    try {
      const { policyNumber, amountPaid, bankTransactionId, bankReferenceNumber, customerAccountNumber, customerEmail, paymentDateTime } = paymentData;

      // Verify policy exists
      const policy = await db('policies')
        .select('*')
        .where('policy_number', policyNumber)
        .first();

      if (!policy) {
        const error = new Error('HCP policy not found');
        error.status = 404;
        error.code = 'POLICY_NOT_FOUND';
        throw error;
      }

      // Create payment transaction
      const transactionId = `HCP-TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      
      const paymentTransaction = {
        transaction_id: transactionId,
        policy_number: policyNumber,
        amount_paid: amountPaid,
        bank_transaction_id: bankTransactionId,
        bank_reference_number: bankReferenceNumber,
        customer_account_masked: customerAccountNumber ? customerAccountNumber.slice(-4).padStart(customerAccountNumber.length, '*') : null,
        customer_email: customerEmail,
        payment_date: paymentDateTime,
        status: 'SUCCESS'
      };

      const [payment] = await db('payment_transactions').insert(paymentTransaction).returning('*');

      // Update policy status if needed
      await db('policies')
        .where('policy_number', policyNumber)
        .update({ 
          updated_at: new Date()
        });

      logger.info('HCP payment processed successfully', { 
        policyNumber, 
        transactionId,
        amount: amountPaid 
      });

      return payment;

    } catch (error) {
      if (error.status && error.code) throw error;
      logger.error('Error processing HCP payment', { error: error.message, policyNumber: paymentData.policyNumber });
      const paymentError = new Error('Failed to process HCP payment');
      paymentError.status = 500;
      paymentError.code = 'PAYMENT_PROCESSING_FAILED';
      throw paymentError;
    }
  }

  /**
   * Get policy by policy number
   */
  static async getPolicyByNumber(policyNumber) {
    try {
      const policy = await db('policies as p')
        .select(
          'p.*',
          'c.first_name',
          'c.last_name', 
          'c.email',
          'c.phone',
          'prod.product_name',
          'prod.product_code'
        )
        .join('customers as c', 'p.customer_id', 'c.id')
        .join('products as prod', 'p.product_id', 'prod.id')
        .where('p.policy_number', policyNumber)
        .first();

      if (!policy) {
        return null;
      }

      // Get related payment transactions
      const transactions = await db('payment_transactions')
        .select('*')
        .where('policy_number', policyNumber)
        .orderBy('created_at', 'desc');

      return {
        ...policy,
        transactions,
        customer: {
          firstName: policy.first_name,
          lastName: policy.last_name,
          email: policy.email,
          phone: policy.phone
        }
      };

    } catch (error) {
      logger.error('Error fetching HCP policy', { error: error.message, policyNumber });
      throw new Error('Failed to fetch HCP policy');
    }
  }

  /**
   * Record payment transaction (helper method)
   */
  static async recordPaymentTransaction({ policyNumber, paymentBreakdown, quoteId }) {
    try {
      const transactionId = `HCP-PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      
      const transactionData = {
        transaction_id: transactionId,
        policy_number: policyNumber,
        amount_paid: paymentBreakdown.principalAmount,
        bank_transaction_id: paymentBreakdown.bankTransactionId,
        bank_reference_number: paymentBreakdown.bankReferenceNumber || null,
        zimnat_payment_reference: `ZIMNAT-${transactionId}`,
        customer_account_masked: paymentBreakdown.customerAccountNumber ? paymentBreakdown.customerAccountNumber.slice(-4).padStart(paymentBreakdown.customerAccountNumber.length, '*') : null,
        customer_email: paymentBreakdown.customerEmail || null,
        payment_date: paymentBreakdown.paymentDateTime || new Date(),
        status: 'SUCCESS'
      };

      await db('payment_transactions').insert(transactionData);

      logger.info('Payment transaction recorded', { 
        transactionId, 
        policyNumber, 
        amount: paymentBreakdown.principalAmount 
      });

    } catch (error) {
      logger.error('Error recording payment transaction', { 
        error: error.message, 
        policyNumber 
      });
      // Don't throw here as this is a helper method - policy creation should still succeed
    }
  }

  /**
   * Validate HCP coverage options
   */
  static validateCoverageOptions(coverageData) {
    const { packageType, familySize } = coverageData;

    const validationErrors = [];

    // Package type validation
    if (!['HCP_INDIVIDUAL', 'HCP_FAMILY'].includes(packageType)) {
      validationErrors.push('Invalid package type. Must be HCP_INDIVIDUAL or HCP_FAMILY');
    }

    // Family size validation
    if (packageType === 'HCP_INDIVIDUAL' && familySize > 1) {
      validationErrors.push('Individual package selected but family size > 1. Consider HCP_FAMILY package');
    }

    if (packageType === 'HCP_FAMILY' && familySize < 2) {
      validationErrors.push('Family package selected but family size < 2. Consider HCP_INDIVIDUAL package');
    }

    if (familySize > 10) {
      validationErrors.push('Family size cannot exceed 10 members');
    }

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      recommendations: this.generateRecommendations(coverageData)
    };
  }

  /**
   * Generate coverage recommendations
   */
  static generateRecommendations(coverageData) {
    const { packageType, familySize } = coverageData;
    const recommendations = [];

    if (packageType === 'HCP_INDIVIDUAL' && familySize > 1) {
      recommendations.push({
        type: 'PACKAGE_UPGRADE',
        message: 'Consider upgrading to HCP_FAMILY package for better value with multiple family members',
        suggestedPackage: 'HCP_FAMILY'
      });
    }

    if (familySize > 5) {
      recommendations.push({
        type: 'ADDITIONAL_COST',
        message: `Additional premium will apply for ${familySize - 5} extra family members beyond the standard family package`,
        additionalCost: (familySize - 5) * 1.0
      });
    }

    return recommendations;
  }

  /**
   * Get HCP statistics for admin/reporting
   */
  static async getHCPStatistics() {
    try {
      const stats = await db('quotes')
        .select(
          db.raw('COUNT(*) as total_quotes'),
          db.raw('COUNT(*) FILTER (WHERE status = \'CONVERTED\') as converted_quotes'),
          db.raw('AVG(premium_amount) as average_premium'),
          db.raw('SUM(premium_amount) FILTER (WHERE status = \'CONVERTED\') as total_premium_volume')
        )
        .where('product_id', 'HCP')
        .first();

      const packageStats = await db('quotes')
        .select(
          'package_id',
          db.raw('COUNT(*) as quote_count'),
          db.raw('AVG(premium_amount) as avg_premium')
        )
        .where('product_id', 'HCP')
        .groupBy('package_id');

      return {
        overall: stats,
        by_package: packageStats
      };

    } catch (error) {
      logger.error('Error fetching HCP statistics', { error: error.message });
      throw new Error('Failed to fetch HCP statistics');
    }
  }
}

module.exports = HCPService;