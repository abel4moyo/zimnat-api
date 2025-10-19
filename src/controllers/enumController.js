/**
 * ===================================================================
 * ZIMNAT API v2.1 - Enum/Reference Data Controller
 * File: src/controllers/enumController.js
 * ===================================================================
 *
 * Handles enum/reference data API endpoints
 */

const EnumService = require('../services/enumService');
const logger = require('../utils/logger');
const { formatResponse, formatErrorResponse, ERROR_CODES } = require('../utils/responseFormatter');

class EnumController {

  /**
   * GET /api/v1/enums
   * Get all enumeration data
   */
  static async getAllEnums(req, res) {
    try {
      const requestId = req.headers['x-request-id'];

      logger.info('Retrieving all enums', { requestId, ip: req.ip });

      const enumData = await EnumService.getAllEnums();

      logger.info('All enums retrieved successfully', {
        requestId,
        counts: {
          vehicleTypes: enumData.vehicleTypes.length,
          paymentMethods: enumData.paymentMethods.length,
          insuranceTypes: enumData.insuranceTypes.length,
          taxClasses: enumData.taxClasses.length,
          suburbsTowns: enumData.suburbsTowns.length
        }
      });

      return res.status(200).json(formatResponse(enumData, requestId));

    } catch (error) {
      logger.error('Failed to retrieve all enums', {
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve enumeration data',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * GET /api/v1/enums/:type
   * Get specific enumeration type
   */
  static async getEnumByType(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const { type } = req.params;

      logger.info('Retrieving enum by type', { type, requestId, ip: req.ip });

      let enumData;
      try {
        enumData = await EnumService.getEnumByType(type);
      } catch (error) {
        if (error.message.includes('Invalid enum type')) {
          return res.status(400).json(formatErrorResponse(
            ERROR_CODES.INVALID_FIELD_VALUE,
            `Invalid enum type: ${type}. Valid types: vehicleTypes, paymentMethods, insuranceTypes, deliveryMethods, taxClasses, clientIdTypes, radioTvUsage, frequencies, suburbsTowns, insuranceCompanies`,
            requestId
          ));
        }
        throw error;
      }

      logger.info('Enum retrieved successfully', {
        type,
        requestId,
        count: enumData.length
      });

      return res.status(200).json(formatResponse({
        type: type,
        data: enumData
      }, requestId));

    } catch (error) {
      logger.error('Failed to retrieve enum by type', {
        type: req.params.type,
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve enumeration data',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * GET /api/v1/enums/vehicleTypes
   * Get vehicle types
   */
  static async getVehicleTypes(req, res) {
    try {
      const requestId = req.headers['x-request-id'];

      const data = await EnumService.getVehicleTypes();

      return res.status(200).json(formatResponse({
        type: 'vehicleTypes',
        data: data
      }, requestId));

    } catch (error) {
      logger.error('Failed to retrieve vehicle types', {
        error: error.message,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve vehicle types',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * GET /api/v1/enums/paymentMethods
   * Get payment methods
   */
  static async getPaymentMethods(req, res) {
    try {
      const requestId = req.headers['x-request-id'];

      const data = await EnumService.getPaymentMethods();

      return res.status(200).json(formatResponse({
        type: 'paymentMethods',
        data: data
      }, requestId));

    } catch (error) {
      logger.error('Failed to retrieve payment methods', {
        error: error.message,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve payment methods',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * GET /api/v1/enums/insuranceTypes
   * Get insurance types
   */
  static async getInsuranceTypes(req, res) {
    try {
      const requestId = req.headers['x-request-id'];

      const data = await EnumService.getInsuranceTypes();

      return res.status(200).json(formatResponse({
        type: 'insuranceTypes',
        data: data
      }, requestId));

    } catch (error) {
      logger.error('Failed to retrieve insurance types', {
        error: error.message,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve insurance types',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * GET /api/v1/enums/taxClasses
   * Get tax classes (optionally filtered by vehicle type)
   */
  static async getTaxClasses(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const { vehicleType } = req.query;

      const data = await EnumService.getTaxClasses(vehicleType ? parseInt(vehicleType) : null);

      return res.status(200).json(formatResponse({
        type: 'taxClasses',
        filter: vehicleType ? { vehicleType: parseInt(vehicleType) } : null,
        data: data
      }, requestId));

    } catch (error) {
      logger.error('Failed to retrieve tax classes', {
        error: error.message,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve tax classes',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * GET /api/v1/enums/suburbsTowns
   * Get suburbs and towns (optionally filtered by town)
   */
  static async getSuburbsTowns(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const { town } = req.query;

      const data = await EnumService.getSuburbsTowns(town);

      return res.status(200).json(formatResponse({
        type: 'suburbsTowns',
        filter: town ? { town } : null,
        data: data
      }, requestId));

    } catch (error) {
      logger.error('Failed to retrieve suburbs and towns', {
        error: error.message,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve suburbs and towns',
        req.headers['x-request-id']
      ));
    }
  }
}

module.exports = EnumController;
