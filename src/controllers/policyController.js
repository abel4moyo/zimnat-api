const PolicyService = require('../services/policyService');
const PolicySearchService = require('../services/policySearchService');
const logger = require('../utils/logger');
const { formatResponse, formatErrorResponse, ERROR_CODES } = require('../utils/responseFormatter');

class PolicyController {
  static async lookupPolicy(req, res, next) {
    try {
      const { policy_identifier, product_code } = req.body;
      const policyData = await PolicyService.lookupPolicy(
        policy_identifier,
        product_code,
        req.partner.id
      );

      res.json({ success: true, data: policyData });
    } catch (error) {
      logger.error('Policy lookup error', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      next(error);
    }
  }

  /**
   * GET /api/v1/policy/search
   * Search for policy by policy number, currency, and insurance type
   * ZIMNAT API v2.1 endpoint
   */
  static async searchPolicy(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const { policyNumber, currency, insuranceType } = req.query;

      // Validate required query parameters
      if (!policyNumber) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'policyNumber query parameter is required',
          requestId
        ));
      }

      if (!currency) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'currency query parameter is required',
          requestId
        ));
      }

      if (!insuranceType) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'insuranceType query parameter is required',
          requestId
        ));
      }

      // Validate currency
      if (!PolicySearchService.isValidCurrency(currency)) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_CURRENCY,
          'Invalid currency. Supported currencies: USD, ZWG',
          requestId
        ));
      }

      // Validate insurance type
      const isValidType = await PolicySearchService.isValidInsuranceType(insuranceType);
      if (!isValidType) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_FIELD_VALUE,
          'Invalid insurance type. Valid types: RTA, FTP, FTPF, FTPFT',
          requestId
        ));
      }

      logger.info('Policy search request', {
        policyNumber,
        currency,
        insuranceType,
        requestId,
        clientId: req.user?.clientId
      });

      // Search for policy
      try {
        const policyData = await PolicySearchService.searchPolicy(
          policyNumber,
          currency.toUpperCase(),
          insuranceType.toUpperCase()
        );

        logger.info('Policy search successful', {
          policyNumber,
          requestId,
          clientId: req.user?.clientId
        });

        return res.status(200).json(formatResponse(policyData, requestId));

      } catch (error) {
        if (error.code === 'POLICY_NOT_FOUND') {
          return res.status(404).json(formatErrorResponse(
            ERROR_CODES.POLICY_NOT_FOUND,
            error.message,
            requestId
          ));
        }
        throw error;
      }

    } catch (error) {
      logger.error('Policy search error', {
        error: error.message,
        stack: error.stack,
        query: req.query,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while searching for policy',
        req.headers['x-request-id']
      ));
    }
  }
}

module.exports = PolicyController;