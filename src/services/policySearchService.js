/**
 * ===================================================================
 * ZIMNAT API v2.1 - Policy Search Service
 * File: src/services/policySearchService.js
 * ===================================================================
 *
 * Handles policy search and lookup operations for ZIMNAT API v2.1
 */

const db = require('../db/knex');
const logger = require('../utils/logger');

class PolicySearchService {

  /**
   * Search for policy by policy number, currency, and insurance type
   * @param {String} policyNumber - Policy number
   * @param {String} currency - ISO 4217 currency code (USD, ZWG)
   * @param {String} insuranceType - Insurance type code
   * @returns {Object} Policy details
   */
  static async searchPolicy(policyNumber, currency, insuranceType) {
    try {
      logger.info('Searching for policy', {
        policyNumber,
        currency,
        insuranceType
      });

      // Query policy from fcb_policies table
      const policy = await db('fcb_policies')
        .where({
          policy_number: policyNumber,
          currency: currency,
          status: 'ACTIVE'
        })
        .first();

      if (!policy) {
        throw {
          status: 404,
          code: 'POLICY_NOT_FOUND',
          message: 'Policy not found or inactive'
        };
      }

      // Parse customer info from JSON field
      const customerInfo = policy.customer_info || {};

      // Build policy response according to ZIMNAT API v2.1 spec
      const policyResponse = {
        policyHolder: {
          fullName: customerInfo.full_name || `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim(),
          identifier: customerInfo.id_number || customerInfo.identifier || ''
        },
        policyDetails: {
          policyNumber: policy.policy_number,
          insuranceType: insuranceType,
          policyType: policy.policy_type || 'Motor',
          currency: policy.currency,
          ratingType: policy.rating_type || 'FLAT_RATE',
          coverageAmount: parseFloat(policy.premium_amount || 0),
          premiumAmount: parseFloat(policy.premium_amount || 0),
          startDate: policy.effective_date ? this.formatDate(policy.effective_date) : null,
          endDate: policy.expiry_date ? this.formatDate(policy.expiry_date) : null,
          renewalFrequency: policy.renewal_frequency || 'ANNUAL',
          paymentFrequency: policy.payment_frequency || 'MONTHLY',
          latestCoverStart: policy.latest_cover_start ? this.formatDate(policy.latest_cover_start) : null,
          latestCoverEnd: policy.latest_cover_end ? this.formatDate(policy.latest_cover_end) : null,
          latestCoverStatus: policy.latest_cover_status || policy.status
        }
      };

      logger.info('Policy found successfully', {
        policyNumber,
        status: policy.status,
        currency: policy.currency
      });

      return policyResponse;

    } catch (error) {
      if (error.status) {
        // Re-throw known errors
        throw error;
      }

      logger.error('Policy search failed', {
        policyNumber,
        currency,
        insuranceType,
        error: error.message,
        stack: error.stack
      });

      throw {
        status: 500,
        code: 'POLICY_SEARCH_ERROR',
        message: 'Failed to search for policy'
      };
    }
  }

  /**
   * Get policy by ID (internal use)
   * @param {Number} policyId - Policy ID
   * @returns {Object} Policy details
   */
  static async getPolicyById(policyId) {
    try {
      const policy = await db('fcb_policies')
        .where('policy_id', policyId)
        .first();

      return policy;

    } catch (error) {
      logger.error('Failed to get policy by ID', {
        policyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get policy by number (internal use)
   * @param {String} policyNumber - Policy number
   * @returns {Object} Policy details
   */
  static async getPolicyByNumber(policyNumber) {
    try {
      const policy = await db('fcb_policies')
        .where('policy_number', policyNumber)
        .first();

      return policy;

    } catch (error) {
      logger.error('Failed to get policy by number', {
        policyNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update policy status
   * @param {String} policyNumber - Policy number
   * @param {String} status - New status
   * @returns {Object} Updated policy
   */
  static async updatePolicyStatus(policyNumber, status) {
    try {
      await db('fcb_policies')
        .where('policy_number', policyNumber)
        .update({
          status: status,
          updated_at: new Date()
        });

      logger.info('Policy status updated', {
        policyNumber,
        newStatus: status
      });

      return await this.getPolicyByNumber(policyNumber);

    } catch (error) {
      logger.error('Failed to update policy status', {
        policyNumber,
        status,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Format date to YYYY-MM-DD
   * @param {Date|String} date - Date to format
   * @returns {String} Formatted date
   */
  static formatDate(date) {
    if (!date) return null;

    const d = new Date(date);
    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Validate currency code
   * @param {String} currency - Currency code to validate
   * @returns {Boolean} True if valid
   */
  static isValidCurrency(currency) {
    const validCurrencies = ['USD', 'ZWG'];
    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Validate insurance type (should match enum)
   * @param {String} insuranceType - Insurance type to validate
   * @returns {Boolean} True if valid
   */
  static async isValidInsuranceType(insuranceType) {
    try {
      const result = await db('enum_insurance_types')
        .where('type_code', insuranceType.toUpperCase())
        .first();

      return !!result;
    } catch (error) {
      logger.error('Failed to validate insurance type', {
        insuranceType,
        error: error.message
      });
      return false;
    }
  }
}

module.exports = PolicySearchService;
