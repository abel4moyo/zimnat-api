const PersonalAccidentModel = require('../models/personalAccidentModel');
const logger = require('../utils/logger');

class PersonalAccidentService {
  // Calculate premium based on package and customer data
  static async calculatePremium(packageId, customerData = {}) {
    try {
      const packageDetails = await PersonalAccidentModel.getPackageById(packageId);
      
      if (!packageDetails) {
        throw {
          status: 404,
          code: 'PACKAGE_NOT_FOUND',
          message: `Personal Accident package ${packageId} not found`
        };
      }

      // Base premium from rating table
      let basePremium = packageDetails.rate;
      
      // Apply risk factors (age-based adjustments)
      let riskMultiplier = 1.0;
      
      if (customerData.age) {
        if (customerData.age < 18) {
          throw {
            status: 400,
            code: 'INVALID_AGE',
            message: 'Personal Accident insurance requires minimum age of 18'
          };
        } else if (customerData.age >= 65) {
          riskMultiplier = 1.5; // Higher risk for senior citizens
        } else if (customerData.age >= 50) {
          riskMultiplier = 1.2; // Moderate increase for middle age
        }
      }

      // Apply occupation risk (if provided)
      if (customerData.occupation) {
        const highRiskOccupations = ['pilot', 'miner', 'construction', 'military'];
        if (highRiskOccupations.some(occ => 
          customerData.occupation.toLowerCase().includes(occ)
        )) {
          riskMultiplier *= 1.3;
        }
      }

      // Calculate final premium
      const adjustedPremium = basePremium * riskMultiplier;
      
      // Calculate taxes and fees (2% government levy + 0.1% stamp duty)
      const governmentLevy = adjustedPremium * 0.02;
      const stampDuty = adjustedPremium * 0.001;
      const totalPremium = adjustedPremium + governmentLevy + stampDuty;

      // Determine benefits based on package
      let deathBenefit, disablementBenefit;
      switch (packageId) {
        case 'PA_STANDARD':
          deathBenefit = 1000;
          disablementBenefit = 1000;
          break;
        case 'PA_PRESTIGE':
          deathBenefit = 2500;
          disablementBenefit = 2500;
          break;
        case 'PA_PREMIER':
          deathBenefit = 10000;
          disablementBenefit = 10000;
          break;
        default:
          deathBenefit = 1000;
          disablementBenefit = 1000;
      }

      const calculation = {
        packageId,
        packageName: packageDetails.packageName,
        basePremium: basePremium.toFixed(2),
        riskMultiplier: riskMultiplier.toFixed(2),
        adjustedPremium: adjustedPremium.toFixed(2),
        governmentLevy: governmentLevy.toFixed(2),
        stampDuty: stampDuty.toFixed(2),
        totalPremium: totalPremium.toFixed(2),
        currency: packageDetails.currency,
        benefits: {
          deathBenefit,
          permanentTotalDisablementBenefit: disablementBenefit
        },
        ratingFactors: {
          age: customerData.age,
          occupation: customerData.occupation,
          riskMultiplier
        },
        calculatedAt: new Date().toISOString()
      };

      logger.info('PA Premium calculated', {
        packageId,
        totalPremium: calculation.totalPremium,
        customerAge: customerData.age
      });

      return calculation;
    } catch (error) {
      logger.error('Error calculating PA premium:', error);
      throw error;
    }
  }

  // Generate quote
  static async generateQuote(quoteRequest) {
    try {
      const { packageId, customerInfo, coverDetails = {} } = quoteRequest;

      // Validate required fields
      if (!packageId) {
        throw {
          status: 400,
          code: 'MISSING_PACKAGE_ID',
          message: 'Package ID is required for Personal Accident quote'
        };
      }

      if (!customerInfo || !customerInfo.firstName || !customerInfo.lastName) {
        throw {
          status: 400,
          code: 'MISSING_CUSTOMER_INFO',
          message: 'Customer first name and last name are required'
        };
      }

      // Calculate premium
      const premiumCalculation = await this.calculatePremium(packageId, {
        age: customerInfo.age,
        occupation: customerInfo.occupation
      });

      // Generate quote number
      const quoteNumber = `PA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Set validity (30 days from now)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const quoteData = {
        quoteNumber,
        packageId,
        customerData: customerInfo,
        premiumCalculation,
        validUntil: validUntil.toISOString()
      };

      // Save quote to database
      await PersonalAccidentModel.saveQuote(quoteData);

      logger.info('PA Quote generated', {
        quoteNumber,
        packageId,
        totalPremium: premiumCalculation.totalPremium
      });

      return {
        quoteNumber,
        productType: 'PERSONAL_ACCIDENT',
        packageDetails: {
          packageId: premiumCalculation.packageId,
          packageName: premiumCalculation.packageName
        },
        premiumCalculation,
        validUntil: validUntil.toISOString(),
        termsAndConditions: 'Standard Personal Accident terms and conditions apply. Coverage subject to policy terms and exclusions.',
        status: 'ACTIVE'
      };
    } catch (error) {
      logger.error('Error generating PA quote:', error);
      throw error;
    }
  }

  // Create policy from quote
  static async createPolicy(quoteNumber, paymentData) {
    try {
      // Get quote details
      const quote = await PersonalAccidentModel.getQuoteById(quoteNumber);
      
      if (!quote) {
        throw {
          status: 404,
          code: 'QUOTE_NOT_FOUND',
          message: `Quote ${quoteNumber} not found`
        };
      }

      // Check if quote is still valid
      if (new Date() > new Date(quote.valid_until)) {
        throw {
          status: 400,
          code: 'QUOTE_EXPIRED',
          message: 'Quote has expired. Please generate a new quote.'
        };
      }

      // Generate policy number
      const policyNumber = `PA-POL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Set policy dates (1 year coverage)
      const effectiveDate = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const policyData = {
        policyNumber,
        quoteNumber,
        productType: 'PERSONAL_ACCIDENT',
        packageId: quote.premium_calculation.packageId,
        customerData: quote.customer_data,
        premiumCalculation: quote.premium_calculation,
        paymentData,
        effectiveDate: effectiveDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };

      // Save policy to database (assuming you have a policies table)
      // This would be implemented based on your policies table structure

      logger.info('PA Policy created', {
        policyNumber,
        quoteNumber,
        totalPremium: quote.premium_calculation.totalPremium
      });

      return {
        policyNumber,
        status: 'ACTIVE',
        effectiveDate: effectiveDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        premiumAmount: parseFloat(quote.premium_calculation.totalPremium),
        benefits: quote.premium_calculation.benefits,
        certificateGenerated: true,
        documentsGenerated: true
      };
    } catch (error) {
      logger.error('Error creating PA policy:', error);
      throw error;
    }
  }

  // Process payment for PA policy
  static async processPayment(paymentRequest) {
    try {
      const { policyNumber, amount, paymentMethod, customerAccount, externalReference } = paymentRequest;

      // Validate payment data
      if (!policyNumber || !amount || !paymentMethod) {
        throw {
          status: 400,
          code: 'INVALID_PAYMENT_DATA',
          message: 'Policy number, amount, and payment method are required'
        };
      }

      // Generate transaction reference
      const transactionReference = `PA-TXN-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      // Process payment (integrate with your payment processing logic)
      const paymentResult = {
        transactionReference,
        status: 'COMPLETED', // or 'PENDING' based on payment method
        amount: parseFloat(amount),
        paymentMethod,
        customerAccount,
        externalReference,
        processedAt: new Date().toISOString(),
        receiptNumber: `PA-RCP-${Date.now()}`
      };

      logger.info('PA Payment processed', {
        transactionReference,
        policyNumber,
        amount
      });

      return paymentResult;
    } catch (error) {
      logger.error('Error processing PA payment:', error);
      throw error;
    }
  }

  // Get all available packages
  static async getAllPackages() {
    try {
      return await PersonalAccidentModel.getAllPackages();
    } catch (error) {
      logger.error('Error getting PA packages:', error);
      throw error;
    }
  }
}

module.exports = PersonalAccidentService;