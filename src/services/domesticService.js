// src/services/domesticService.js
const { db } = require('../db');
const logger = require('../utils/logger');
const crypto = require('crypto');

class DomesticService {

  /**
   * Get all available Domestic Insurance packages with benefits and limits
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
        .where('rp.product_id', 'DOMESTIC')
        .groupBy('rp.package_id', 'rp.package_name', 'rp.rate', 'rp.currency', 'rp.minimum_premium');

      // Process the packages to match the BRD structure
      return packages.map(pkg => ({
        packageId: pkg.package_id,
        packageName: pkg.package_name,
        ratingType: 'PERCENTAGE',
        premiumFrequency: ['MONTHLY'],
        rate: parseFloat(pkg.rate),
        currency: pkg.currency,
        minimumPremium: parseFloat(pkg.minimum_premium || 0),
        description: this.getPackageDescription(pkg.package_id),
        coverTypes: ['HOMEOWNERS', 'HOUSEHOLDERS'],
        homeowners: this.getHomeownersBenefits(pkg.package_id, pkg.rate, pkg.minimum_premium),
        householders: this.getHouseholdersBenefits(pkg.package_id),
        benefits: pkg.benefits || [],
        limits: pkg.limits || []
      }));

    } catch (error) {
      logger.error('Error fetching Domestic Insurance packages', { error: error.message });
      throw new Error('Failed to fetch Domestic Insurance packages');
    }
  }

  /**
   * Get package description based on package type
   */
  static getPackageDescription(packageId) {
    const descriptions = {
      'DOMESTIC_STANDARD': 'Standard home insurance coverage with essential protection',
      'DOMESTIC_PRESTIGE': 'Enhanced home insurance with improved coverage limits',
      'DOMESTIC_PREMIER': 'Premium home insurance with comprehensive protection'
    };
    return descriptions[packageId] || 'Home insurance coverage';
  }

  /**
   * Get homeowners benefits based on BRD structure
   */
  static getHomeownersBenefits(packageId, rate, minimumPremium) {
    const benefitStructures = {
      'DOMESTIC_STANDARD': {
        minimumPremium: 2.5,
        rate: '0.10%',
        buildings: 'Property Value',
        liability: '15% of property value max $1,000',
        lossOfRent: '15% of property value max $1,000 or 3 months whichever is less'
      },
      'DOMESTIC_PRESTIGE': {
        minimumPremium: 3.5,
        rate: '0.13%',
        buildings: 'Property Value',
        liability: '15% of property value max $5,000',
        lossOfRent: '15% of property value max $2,000 or 3 months whichever is less'
      },
      'DOMESTIC_PREMIER': {
        minimumPremium: 5.0,
        rate: '0.15%',
        buildings: 'Property Value',
        liability: '15% of property value max $10,000',
        lossOfRent: '15% of property value max $4,500 or 3 months whichever is less'
      }
    };

    return benefitStructures[packageId] || benefitStructures['DOMESTIC_STANDARD'];
  }

  /**
   * Get householders benefits (consistent across all packages per BRD)
   */
  static getHouseholdersBenefits(packageId) {
    return {
      minimumPremium: 5.0,
      rate: '1.00%',
      contents: 'Contents Value'
    };
  }

  /**
   * Calculate Domestic Insurance premium based on package type and coverage
   */
  static async calculatePremium({ packageType, coverType, propertyValue, contentsValue, duration = 12 }) {
    try {
      // Get package details from rating tables
      const packageData = await db('rating_packages')
        .select('*')
        .where('product_id', 'DOMESTIC')
        .andWhere('package_id', packageType)
        .first();

      if (!packageData) {
        const error = new Error(`Domestic Insurance package '${packageType}' not found`);
        error.status = 404;
        throw error;
      }

      let basePremium = 0;
      let premiumBreakdown = {};

      if (coverType === 'HOMEOWNERS') {
        // Homeowners: percentage of property value
        const rate = parseFloat(packageData.rate);
        basePremium = (propertyValue * rate);
        
        // Apply minimum premium if specified
        const minimumPremium = parseFloat(packageData.minimum_premium || 0);
        if (basePremium < minimumPremium) {
          basePremium = minimumPremium;
        }

        premiumBreakdown = {
          property_value: propertyValue,
          rate_percentage: rate * 100, // Convert to percentage for display
          calculated_premium: propertyValue * rate,
          minimum_premium: minimumPremium,
          minimum_applied: basePremium > (propertyValue * rate)
        };

      } else if (coverType === 'HOUSEHOLDERS') {
        // Householders: 1% of contents value, minimum $5
        const householdersRate = 0.01; // 1%
        basePremium = contentsValue * householdersRate;
        
        const minimumPremium = 5.0; // As per BRD
        if (basePremium < minimumPremium) {
          basePremium = minimumPremium;
        }

        premiumBreakdown = {
          contents_value: contentsValue,
          rate_percentage: 1.0,
          calculated_premium: contentsValue * householdersRate,
          minimum_premium: minimumPremium,
          minimum_applied: basePremium > (contentsValue * householdersRate)
        };

      } else {
        throw new Error(`Unsupported cover type: ${coverType}`);
      }

      // Calculate for duration (monthly premium * duration)
      const monthlyPremium = basePremium;
      const totalPremium = monthlyPremium * duration;

      return {
        packageType,
        coverType,
        propertyValue,
        contentsValue,
        duration,
        basePremium: monthlyPremium,
        monthlyPremium: monthlyPremium,
        totalPremium: totalPremium,
        currency: packageData.currency || 'USD',
        calculation_method: 'PERCENTAGE',
        breakdown: premiumBreakdown
      };

    } catch (error) {
      if (error.status) throw error;
      logger.error('Error calculating Domestic Insurance premium', { error: error.message, packageType });
      throw new Error('Failed to calculate Domestic Insurance premium');
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
        .where('rp.product_id', 'DOMESTIC')
        .andWhere('rp.package_id', packageType)
        .groupBy('rp.id', 'rp.package_id', 'rp.product_id', 'rp.package_name', 'rp.rate', 'rp.currency', 'rp.minimum_premium', 'rp.created_at', 'rp.updated_at')
        .first();

      if (!packageData) {
        const error = new Error(`Domestic Insurance package '${packageType}' not found`);
        error.status = 404;
        throw error;
      }

      return {
        ...packageData,
        benefits: packageData.benefits || [],
        limits: packageData.limits || []
      };

    } catch (error) {
      if (error.status) throw error;
      logger.error('Error fetching package details', { error: error.message, packageType });
      throw new Error('Failed to fetch package details');
    }
  }

  /**
   * Create Domestic Insurance quote
   */
  static async createQuote({ quoteNumber, packageType, customerInfo, coverType, propertyValue, contentsValue, propertyDetails, duration, premiumCalculation, packageDetails, metadata }) {
    try {
      const quoteData = {
        quotation_number: quoteNumber,
        product_id: 'DOMESTIC',
        package_id: packageType,
        premium_amount: premiumCalculation.totalPremium,
        customer_info: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone || null,
          ...customerInfo
        },
        cover_details: {
          packageName: packageDetails.package_name,
          coverType,
          propertyValue,
          contentsValue,
          propertyDetails,
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
      
      logger.info('Domestic Insurance quote created in database', { 
        quoteNumber, 
        quoteId: quote.id,
        premium: premiumCalculation.totalPremium 
      });

      return quote;

    } catch (error) {
      logger.error('Error creating Domestic Insurance quote', { error: error.message, quoteNumber });
      throw new Error('Failed to create Domestic Insurance quote');
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
        .andWhere('product_id', 'DOMESTIC')
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
   * Create Domestic Insurance policy from quote
   */
  static async createPolicy({ quote, paymentBreakdown, consentToDataSharing, deliveryMethod }) {
    try {
      const policyNumber = `DOM-POL-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      
      // First, ensure we have a customer record
      const customerInfo = quote.customer_info;
      let customer = await db('customers')
        .where('email', customerInfo.email)
        .first();

      if (!customer) {
        // Create customer if doesn't exist
        const customerData = {
          customer_reference: `DOM-CUST-${Date.now()}`,
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
        .where('product_code', 'DOMESTIC')
        .orWhere('product_name', 'LIKE', '%Home%')
        .orWhere('product_name', 'LIKE', '%Domestic%')
        .first();

      if (!product) {
        throw new Error('Domestic Insurance product not found in products table');
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
        cover_type: `${quote.package_id}_${quote.cover_details.coverType}`
      };

      const [policy] = await db('policies').insert(policyData).returning('*');

      // Update quote status
      await db('quotes')
        .where('quotation_number', quote.quotation_number)
        .update({ 
          status: 'CONVERTED',
          updated_at: new Date()
        });

      // Record payment transaction
      await this.recordPaymentTransaction({
        policyNumber: policy.policy_number,
        paymentBreakdown,
        quoteId: quote.quotation_number
      });

      logger.info('Domestic Insurance policy created successfully', { 
        policyNumber: policy.policy_number,
        quoteNumber: quote.quotation_number 
      });

      return policy;

    } catch (error) {
      logger.error('Error creating Domestic Insurance policy', { 
        error: error.message, 
        quoteNumber: quote.quotation_number 
      });
      throw new Error('Failed to create Domestic Insurance policy');
    }
  }

  /**
   * Process Domestic Insurance payment
   */
  // Complete the processPayment method that was cut off
static async processPayment(paymentData) {
  try {
    const { policyNumber, amountPaid, bankTransactionId, bankReferenceNumber, customerAccountNumber, customerEmail, paymentDateTime } = paymentData;

    // Verify policy exists
    const policy = await db('policies')
      .select('*')
      .where('policy_number', policyNumber)
      .first();

    if (!policy) {
      const error = new Error(`Policy ${policyNumber} not found`);
      error.status = 404;
      error.code = 'POLICY_NOT_FOUND';
      throw error;
    }

    // Verify payment amount matches outstanding balance
    if (parseFloat(amountPaid) < parseFloat(policy.outstanding_balance)) {
      const error = new Error(`Payment amount ${amountPaid} is less than outstanding balance ${policy.outstanding_balance}`);
      error.status = 400;
      error.code = 'INSUFFICIENT_PAYMENT_AMOUNT';
      throw error;
    }

    // Create transaction record
    const transactionData = {
      transaction_reference: `DOM-TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      policy_number: policyNumber,
      customer_id: policy.customer_id,
      partner_id: policy.partner_id,
      transaction_type: 'PAYMENT',
      amount: parseFloat(amountPaid),
      currency: 'USD',
      bank_transaction_id: bankTransactionId,
      bank_reference_number: bankReferenceNumber || null,
      customer_account_number: customerAccountNumber || null,
      customer_email: customerEmail || null,
      payment_datetime: paymentDateTime,
      transaction_status: 'COMPLETED',
      created_at: new Date(),
      updated_at: new Date()
    };

    const [transaction] = await db('transactions').insert(transactionData).returning('*');

    // Update policy balance
    const newOutstandingBalance = parseFloat(policy.outstanding_balance) - parseFloat(amountPaid);
    const policyStatus = newOutstandingBalance <= 0 ? 'PAID_UP' : 'ACTIVE';

    await db('policies')
      .where('policy_number', policyNumber)
      .update({
        outstanding_balance: newOutstandingBalance,
        policy_status: policyStatus,
        last_payment_date: paymentDateTime,
        updated_at: new Date()
      });

    logger.info('Domestic Insurance payment processed successfully', {
      policyNumber,
      transactionId: transaction.transaction_reference,
      amountPaid,
      newBalance: newOutstandingBalance
    });

    return {
      transaction_id: transaction.transaction_reference,
      policy_number: policyNumber,
      amount_paid: parseFloat(amountPaid),
      new_outstanding_balance: newOutstandingBalance,
      policy_status: policyStatus,
      payment_status: 'COMPLETED',
      payment_datetime: paymentDateTime
    };

  } catch (error) {
    if (error.status) throw error;
    logger.error('Error processing Domestic Insurance payment', { 
      error: error.message, 
      policyNumber: paymentData.policyNumber 
    });
    throw new Error('Failed to process Domestic Insurance payment');
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
        'c.first_name as customer_first_name',
        'c.last_name as customer_last_name',
        'c.email as customer_email',
        'c.phone as customer_phone',
        'prod.product_name',
        db.raw(`json_agg(
          DISTINCT jsonb_build_object(
            'transaction_reference', t.transaction_reference,
            'amount', t.amount,
            'payment_datetime', t.payment_datetime,
            'transaction_status', t.transaction_status
          )
        ) FILTER (WHERE t.transaction_reference IS NOT NULL) as payment_history`)
      )
      .leftJoin('customers as c', 'p.customer_id', 'c.id')
      .leftJoin('products as prod', 'p.product_id', 'prod.id')
      .leftJoin('transactions as t', 'p.policy_number', 't.policy_number')
      .where('p.policy_number', policyNumber)
      .groupBy('p.id', 'c.id', 'prod.id')
      .first();

    if (!policy) {
      return null;
    }

    // Format the response to match expected structure
    return {
      policyNumber: policy.policy_number,
      customerId: policy.customer_id,
      customerInfo: {
        firstName: policy.customer_first_name,
        lastName: policy.customer_last_name,
        email: policy.customer_email,
        phone: policy.customer_phone
      },
      productInfo: {
        productName: policy.product_name,
        coverType: policy.cover_type
      },
      policyDetails: {
        premiumAmount: parseFloat(policy.premium_amount),
        outstandingBalance: parseFloat(policy.outstanding_balance),
        policyStatus: policy.policy_status,
        startDate: policy.start_date,
        endDate: policy.end_date,
        nextDueDate: policy.next_due_date
      },
      paymentHistory: policy.payment_history || []
    };

  } catch (error) {
    logger.error('Error fetching policy by number', { 
      error: error.message, 
      policyNumber 
    });
    throw new Error('Failed to fetch policy details');
  }
}

/**
 * Record payment transaction (helper method)
 */
static async recordPaymentTransaction({ policyNumber, paymentBreakdown, quoteId }) {
  try {
    const transactionData = {
      transaction_reference: `DOM-PMT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      policy_number: policyNumber,
      transaction_type: 'POLICY_PAYMENT',
      amount: parseFloat(paymentBreakdown.principalAmount),
      currency: 'USD',
      bank_transaction_id: paymentBreakdown.bankTransactionId,
      bank_reference_number: paymentBreakdown.bankReferenceNumber || null,
      transaction_status: 'COMPLETED',
      reference_data: {
        quote_id: quoteId,
        payment_breakdown: paymentBreakdown
      },
      created_at: new Date()
    };

    const [transaction] = await db('transactions').insert(transactionData).returning('*');
    
    logger.info('Payment transaction recorded', {
      transactionReference: transaction.transaction_reference,
      policyNumber,
      amount: paymentBreakdown.principalAmount
    });

    return transaction;

  } catch (error) {
    logger.error('Error recording payment transaction', { 
      error: error.message, 
      policyNumber 
    });
    throw new Error('Failed to record payment transaction');
  }
}

} // End of DomesticService class

module.exports = DomesticService;