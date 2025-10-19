const policyModel = require('../models/policyModel');
const customerService = require('./customerService');
const logger = require('../utils/logger');
const { generateUniqueId } = require('../utils/zimnatHelper');

class PolicyService {
  static async lookupPolicy(policyIdentifier, productCode, partnerId) {
    try {
      const policy = await policyModel.findByIdentifierAndProduct(
        policyIdentifier, 
        productCode, 
        partnerId
      );

      if (!policy) {
        throw {
          status: 404,
          message: 'Policy not found',
          code: 'POLICY_NOT_FOUND'
        };
      }

      logger.info('Policy lookup successful', {
        policyNumber: policy.policy_number,
        identifier: policyIdentifier,
        partnerId
      });

      return {
        policy_number: policy.policy_number,
        holder_name: `${policy.first_name} ${policy.last_name}`,
        email: policy.email,
        phone: policy.phone,
        product_name: policy.product_name,
        category: policy.category_name,
        cover_type: policy.cover_type,
        premium_amount: parseFloat(policy.premium_amount),
        outstanding_balance: parseFloat(policy.outstanding_balance),
        due_date: policy.next_due_date,
        status: policy.policy_status,
        allow_partial_payment: policy.allow_partial_payment,
        partner: policy.partner_name
      };

    } catch (error) {
      logger.error('Error looking up policy', error);
      throw error;
    }
  }

  static async createPolicy(policyData) {
    try {
      // Generate policy number if not provided
      if (!policyData.policy_number) {
        policyData.policy_number = generateUniqueId('POL');
      }

      const policy = await policyModel.create(policyData);

      logger.info('Policy created', {
        policyNumber: policy.policy_number,
        customerId: policy.customer_id,
        productId: policy.product_id
      });

      return policy;

    } catch (error) {
      logger.error('Error creating policy', error);
      throw error;
    }
  }

  static async updatePolicyBalance(policyNumber, paymentAmount) {
    try {
      const policy = await policyModel.findByNumber(policyNumber);
      
      if (!policy) {
        throw {
          status: 404,
          message: 'Policy not found',
          code: 'POLICY_NOT_FOUND'
        };
      }

      const newBalance = Math.max(0, policy.outstanding_balance - paymentAmount);
      
      const updatedPolicy = await policyModel.updateBalance(policy.id, newBalance);

      logger.info('Policy balance updated', {
        policyNumber,
        oldBalance: policy.outstanding_balance,
        paymentAmount,
        newBalance
      });

      return updatedPolicy;

    } catch (error) {
      logger.error('Error updating policy balance', error);
      throw error;
    }
  }
}

module.exports = PolicyService;