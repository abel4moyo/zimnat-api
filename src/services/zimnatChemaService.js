const ZimnatChemaModel = require('../models/zimnatChemaModel');
const logger = require('../utils/logger');
const axios = require('axios');

class ZimnatChemaService {
  
  /**
   * Create new Chema Cash Plan application
   */
  static async createApplication(applicationData) {
    try {
      // Extract and validate contract details (using kebab-case as per Postman)
      const contractDetails = applicationData['contract-details'];
      const lifeAssuredDetails = applicationData['life-assured-details'];
      const lifeAssuredContactDetails = applicationData['life-assured-contact-details'];
      const lifeAssuredAddress = applicationData['life-assured-address'];
      const paymentDetails = applicationData['payment-details'];
      const beneficiaryDetails = applicationData['beneficiary-details'];

      // Validate beneficiaries sum to 100%
      if (beneficiaryDetails && Array.isArray(beneficiaryDetails)) {
        const totalBenefitSplit = beneficiaryDetails.reduce((sum, beneficiary) => {
          return sum + parseFloat(beneficiary.benefitSplit || 0);
        }, 0);

        if (Math.abs(totalBenefitSplit - 100.00) > 0.01) {
          throw {
            code: 'VALIDATION_FAILURE',
            message: 'Beneficiary benefit splits must total 100.00%'
          };
        }
      }

      // Calculate premium based on package level and payment frequency
      const premiumCalculation = await this.calculatePremium(
        contractDetails['package-level'],
        contractDetails['payment-frequency'],
        { age: this.calculateAge(this.convertDateFromInteger(lifeAssuredDetails['date-of-birth'])) }
      );

      // Generate unique contract ID
      const contractId = `CHEMA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Set policy dates
      const effectiveDate = this.convertDateFromInteger(contractDetails['signed-date']);
      const expiryDate = new Date(effectiveDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      // Prepare application data for external API (using kebab-case for external API)
      const zimnatPayload = {
        'contract-details': {
          'package-level': contractDetails['package-level'],
          'payment-frequency': contractDetails['payment-frequency'],
          'signed-date': contractDetails['signed-date'],
          'agent-contract-id': contractDetails['agent-contract-id'],
          'paypoint-contract-id': contractDetails['paypoint-contract-id']
        },
        'life-assured-details': {
          'first-names': lifeAssuredDetails['first-names'],
          'surname': lifeAssuredDetails['surname'],
          'date-of-birth': lifeAssuredDetails['date-of-birth'],
          'gender': lifeAssuredDetails['gender'],
          'id-type': lifeAssuredDetails['id-type'],
          'id-number': lifeAssuredDetails['id-number'],
          'id-country': lifeAssuredDetails['id-country'],
          'marital-status': lifeAssuredDetails['marital-status'],
          'title': lifeAssuredDetails['title']
        },
        'life-assured-contact-details': {
          'cell-phone': lifeAssuredContactDetails?.['cell-phone'],
          'email': lifeAssuredContactDetails?.['email']
        },
        'life-assured-address': lifeAssuredAddress || {},
        'payment-details': {
          'debit-order': paymentDetails?.['debit-order'] || 'N',
          'mobile-wallet': paymentDetails?.['mobile-wallet'] || 'N',
          'cash': paymentDetails?.['cash'] || 'N'
        },
        'beneficiary-details': beneficiaryDetails || []
      };

      // Call Zimnat API
      const zimnatResponse = await this.callZimnatAPI('/chema-api/application', zimnatPayload);

      // Save application to local database
      const applicationRecord = {
        contractId,
        zimnatContractId: zimnatResponse.contractId || contractId,
        packageLevel: contractDetails.packageLevel,
        paymentFrequency: contractDetails.paymentFrequency,
        customerData: {
          ...lifeAssuredDetails,
          contactDetails: lifeAssuredContactDetails,
          address: lifeAssuredAddress
        },
        beneficiaries: beneficiaryDetails,
        premiumCalculation,
        paymentDetails,
        effectiveDate: effectiveDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: 'ACTIVE',
        zimnatResponse
      };

      await ZimnatChemaModel.saveApplication(applicationRecord);

      logger.info('Zimnat Chema application created successfully', {
        contractId,
        packageLevel: contractDetails.packageLevel,
        monthlyPremium: premiumCalculation.monthlyPremium
      });

      return {
        contractId,
        status: 'ACTIVE',
        packageLevel: contractDetails.packageLevel,
        paymentFrequency: contractDetails.paymentFrequency,
        monthlyPremium: premiumCalculation.monthlyPremium,
        effectiveDate: effectiveDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        certificateNumber: zimnatResponse.certificateNumber || `CERT-${contractId}`,
        customerReference: zimnatResponse.customerReference || contractId
      };

    } catch (error) {
      logger.error('Error creating Zimnat Chema application:', error);
      throw error;
    }
  }

  /**
   * Modify existing Chema policy
   */
  static async modifyPolicy(modificationData) {
    try {
      const { contractDetails } = modificationData;
      
      // Get existing policy
      const existingPolicy = await ZimnatChemaModel.getPolicyByContractId(contractDetails.contractId);
      
      if (!existingPolicy) {
        throw {
          code: 'POLICY_NOT_FOUND',
          message: `Policy with contract ID ${contractDetails.contractId} not found`
        };
      }

      // Prepare modification payload for Zimnat API
      const zimnatPayload = {
        contractDetails: {
          contractId: contractDetails.contractId,
          packageLevel: contractDetails.packageLevel,
          paymentFrequency: contractDetails.paymentFrequency,
          effectiveDate: this.formatDate(contractDetails.effectiveDate),
          paypointContractId: contractDetails.paypointContractId
        },
        lifeAssuredDetails: modificationData.lifeAssuredDetails || {},
        lifeAssuredContactDetails: modificationData.lifeAssuredContactDetails || {},
        lifeAssuredAddress: modificationData.lifeAssuredAddress || {},
        paymentDetails: modificationData.paymentDetails || {},
        beneficiaryDetails: modificationData.beneficiaryDetails || []
      };

      // Call Zimnat modification API
      const zimnatResponse = await this.callZimnatAPI('/chema-modify-api/modify', zimnatPayload);

      // Calculate new premium if package changed
      let newPremium = null;
      if (contractDetails.packageLevel && contractDetails.packageLevel !== existingPolicy.package_level) {
        const premiumCalculation = await this.calculatePremium(
          contractDetails.packageLevel,
          contractDetails.paymentFrequency || existingPolicy.payment_frequency,
          { age: this.calculateAge(existingPolicy.customer_data.dateOfBirth) }
        );
        newPremium = premiumCalculation.monthlyPremium;
      }

      // Update local database
      const modificationRecord = {
        contractId: contractDetails.contractId,
        modificationType: this.determineModificationType(modificationData),
        changes: this.identifyChanges(existingPolicy, modificationData),
        effectiveDate: contractDetails.effectiveDate,
        newPremium,
        zimnatResponse,
        updatedAt: new Date().toISOString()
      };

      await ZimnatChemaModel.saveModification(modificationRecord);

      logger.info('Zimnat Chema policy modified successfully', {
        contractId: contractDetails.contractId,
        modificationType: modificationRecord.modificationType
      });

      return {
        contractId: contractDetails.contractId,
        status: 'MODIFIED',
        modificationType: modificationRecord.modificationType,
        effectiveDate: contractDetails.effectiveDate,
        changes: modificationRecord.changes,
        newPremium,
        updatedAt: modificationRecord.updatedAt
      };

    } catch (error) {
      logger.error('Error modifying Zimnat Chema policy:', error);
      throw error;
    }
  }

  /**
   * Update policy status
   */
  static async updatePolicyStatus(statusUpdateData) {
    try {
      const { contractDetails, newContractStatus } = statusUpdateData;
      
      // Get existing policy
      const existingPolicy = await ZimnatChemaModel.getPolicyByContractId(contractDetails.contractId);
      
      if (!existingPolicy) {
        throw {
          code: 'POLICY_NOT_FOUND',
          message: `Policy with contract ID ${contractDetails.contractId} not found`
        };
      }

      // Validate status transition
      const isValidTransition = this.validateStatusTransition(
        existingPolicy.status,
        newContractStatus.contractStatus
      );

      if (!isValidTransition) {
        throw {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition from ${existingPolicy.status} to ${newContractStatus.contractStatus}`
        };
      }

      // Prepare status update payload for Zimnat API
      const zimnatPayload = {
        contractDetails: {
          contractId: contractDetails.contractId
        },
        newContractStatus: {
          effectiveDate: this.formatDate(newContractStatus.effectiveDate),
          contractStatus: newContractStatus.contractStatus,
          contractStatusReason: newContractStatus.contractStatusReason,
          contractStatusDescription: newContractStatus.contractStatusDescription
        }
      };

      // Call Zimnat status update API
      const zimnatResponse = await this.callZimnatAPI('/contract-status-update/status-update', zimnatPayload);

      // Update local database
      await ZimnatChemaModel.updatePolicyStatus(
        contractDetails.contractId,
        newContractStatus.contractStatus,
        newContractStatus.effectiveDate,
        newContractStatus.contractStatusReason
      );

      logger.info('Zimnat Chema policy status updated successfully', {
        contractId: contractDetails.contractId,
        previousStatus: existingPolicy.status,
        newStatus: newContractStatus.contractStatus
      });

      return {
        contractId: contractDetails.contractId,
        previousStatus: existingPolicy.status,
        currentStatus: newContractStatus.contractStatus,
        statusReason: newContractStatus.contractStatusReason,
        effectiveDate: newContractStatus.effectiveDate,
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error updating Zimnat Chema policy status:', error);
      throw error;
    }
  }

  /**
   * Get policy details
   */
  static async getPolicyDetails(contractId) {
    try {
      const policy = await ZimnatChemaModel.getPolicyByContractId(contractId);
      
      if (!policy) {
        throw {
          code: 'POLICY_NOT_FOUND',
          message: `Policy with contract ID ${contractId} not found`
        };
      }

      return {
        contractId: policy.contract_id,
        packageLevel: policy.package_level,
        paymentFrequency: policy.payment_frequency,
        status: policy.status,
        customerDetails: policy.customer_data,
        beneficiaries: policy.beneficiaries,
        premiumDetails: policy.premium_calculation,
        effectiveDate: policy.effective_date,
        expiryDate: policy.expiry_date,
        createdAt: policy.created_at,
        lastModified: policy.updated_at
      };

    } catch (error) {
      logger.error('Error getting Zimnat Chema policy details:', error);
      throw error;
    }
  }

  /**
   * Get available packages
   */
  static async getAvailablePackages() {
    try {
      // Static package definitions based on PDF document
      return [
        {
          packageLevel: 'PLAN-1',
          packageName: 'Chema Cash Plan 1',
          description: 'Basic Chema Cash Plan coverage',
          benefits: [
            'Hospital Cash Benefits',
            'Accident Benefits',
            'Death Benefits'
          ],
          premiumRates: {
            monthly: 50.00,
            quarterly: 150.00,
            halfYearly: 300.00,
            yearly: 600.00
          },
          eligibility: {
            minAge: 18,
            maxAge: 65
          }
        },
        {
          packageLevel: 'PLAN-2',
          packageName: 'Chema Cash Plan 2',
          description: 'Premium Chema Cash Plan coverage',
          benefits: [
            'Enhanced Hospital Cash Benefits',
            'Higher Accident Benefits',
            'Increased Death Benefits',
            'Additional Family Coverage'
          ],
          premiumRates: {
            monthly: 100.00,
            quarterly: 300.00,
            halfYearly: 600.00,
            yearly: 1200.00
          },
          eligibility: {
            minAge: 18,
            maxAge: 65
          }
        }
      ];

    } catch (error) {
      logger.error('Error getting Zimnat Chema packages:', error);
      throw error;
    }
  }

  /**
   * Calculate premium
   */
  static async calculatePremium(packageLevel, paymentFrequency, customerData = {}) {
    try {
      // Get base rates
      const packages = await this.getAvailablePackages();
      const selectedPackage = packages.find(pkg => pkg.packageLevel === packageLevel);
      
      if (!selectedPackage) {
        throw {
          code: 'INVALID_PACKAGE',
          message: `Invalid package level: ${packageLevel}`
        };
      }

      // Get base premium based on payment frequency
      let basePremium;
      switch (paymentFrequency.toUpperCase()) {
        case 'MONTHLY':
          basePremium = selectedPackage.premiumRates.monthly;
          break;
        case 'QUARTERLY':
          basePremium = selectedPackage.premiumRates.quarterly;
          break;
        case 'HALF-YEARLY':
          basePremium = selectedPackage.premiumRates.halfYearly;
          break;
        case 'YEARLY':
          basePremium = selectedPackage.premiumRates.yearly;
          break;
        default:
          throw {
            code: 'INVALID_FREQUENCY',
            message: `Invalid payment frequency: ${paymentFrequency}`
          };
      }

      // Apply age-based adjustments if applicable
      let ageMultiplier = 1.0;
      if (customerData.age) {
        if (customerData.age < 18 || customerData.age > 65) {
          throw {
            code: 'INVALID_AGE',
            message: 'Age must be between 18 and 65 for Chema Cash Plan'
          };
        } else if (customerData.age >= 55) {
          ageMultiplier = 1.2; // 20% increase for senior citizens
        } else if (customerData.age >= 45) {
          ageMultiplier = 1.1; // 10% increase for middle age
        }
      }

      const adjustedPremium = basePremium * ageMultiplier;
      
      // Calculate monthly equivalent for comparison
      const monthlyPremium = this.convertToMonthly(adjustedPremium, paymentFrequency);
      const annualPremium = monthlyPremium * 12;

      return {
        packageLevel,
        paymentFrequency,
        basePremium: basePremium.toFixed(2),
        monthlyPremium: monthlyPremium.toFixed(2),
        annualPremium: annualPremium.toFixed(2),
        currency: 'USD',
        factors: {
          ageMultiplier: ageMultiplier.toFixed(2),
          customerAge: customerData.age
        },
        breakdown: {
          basePremium: basePremium.toFixed(2),
          ageAdjustment: (adjustedPremium - basePremium).toFixed(2),
          finalPremium: adjustedPremium.toFixed(2)
        },
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating Zimnat Chema premium:', error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  static async checkHealth() {
    try {
      // Check database connectivity
      const dbHealth = await ZimnatChemaModel.checkHealth();
      
      // Check Zimnat API connectivity (if configured)
      let zimnatAPIHealth = 'OK';
      try {
        // This would be a simple ping to Zimnat API
        // await this.callZimnatAPI('/health', {}, 'GET');
      } catch (error) {
        zimnatAPIHealth = 'ERROR';
      }

      return {
        database: dbHealth ? 'OK' : 'ERROR',
        zimnatAPI: zimnatAPIHealth
      };

    } catch (error) {
      logger.error('Error checking Zimnat Chema service health:', error);
      throw error;
    }
  }

  // Helper methods

  static calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  static formatDate(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  static convertDateFromInteger(dateInteger) {
    if (!dateInteger) return null;
    
    const dateStr = dateInteger.toString();
    if (dateStr.length !== 8) {
      throw new Error('Date must be 8 digits in YYYYMMDD format');
    }
    
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));
    
    return new Date(year, month - 1, day);
  }

  static convertToMonthly(premium, frequency) {
    switch (frequency.toUpperCase()) {
      case 'MONTHLY':
        return premium;
      case 'QUARTERLY':
        return premium / 3;
      case 'HALF-YEARLY':
        return premium / 6;
      case 'YEARLY':
        return premium / 12;
      default:
        return premium;
    }
  }

  static determineModificationType(modificationData) {
    const changes = [];
    
    if (modificationData.contractDetails?.packageLevel) changes.push('PACKAGE_CHANGE');
    if (modificationData.contractDetails?.paymentFrequency) changes.push('PAYMENT_FREQUENCY_CHANGE');
    if (modificationData.lifeAssuredDetails) changes.push('CUSTOMER_DETAILS_CHANGE');
    if (modificationData.beneficiaryDetails) changes.push('BENEFICIARY_CHANGE');
    if (modificationData.paymentDetails) changes.push('PAYMENT_METHOD_CHANGE');
    
    return changes.join(',') || 'GENERAL_MODIFICATION';
  }

  static identifyChanges(existingPolicy, modificationData) {
    const changes = {};
    
    // Compare and identify specific changes
    if (modificationData.contractDetails?.packageLevel && 
        modificationData.contractDetails.packageLevel !== existingPolicy.package_level) {
      changes.packageLevel = {
        from: existingPolicy.package_level,
        to: modificationData.contractDetails.packageLevel
      };
    }
    
    // Add more change detection logic as needed
    
    return changes;
  }

  static validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'ACTIVE': ['INACTIVE', 'CANCELLED'],
      'INACTIVE': ['ACTIVE', 'CANCELLED'],
      'CANCELLED': [], // Cannot transition from cancelled
      'PENDING': ['ACTIVE', 'CANCELLED']
    };
    
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  static async callZimnatAPI(endpoint, payload, method = 'POST') {
    try {
      const baseURL = process.env.ZIMNAT_API_BASE_URL || 'https://api-test.thoughtexpress.com';
      const apiKey = process.env.ZIMNAT_API_KEY || 'test-api-key';
      
      const config = {
        method,
        url: `${baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        }
      };

      if (method !== 'GET') {
        config.data = payload;
      }

      const response = await axios(config);
      return response.data;

    } catch (error) {
      logger.error('Error calling Zimnat API:', {
        endpoint,
        error: error.message,
        response: error.response?.data
      });
      
      // Handle specific Zimnat API errors
      if (error.response?.status === 401) {
        throw {
          code: 'UNAUTHORIZED',
          message: 'Authentication failed with Zimnat API'
        };
      }
      
      if (error.response?.status === 400) {
        throw {
          code: 'VALIDATION_FAILURE',
          message: error.response.data?.errorDescription || 'Validation failed'
        };
      }
      
      throw error;
    }
  }
}

module.exports = ZimnatChemaService;