/**
 * ===================================================================
 * ZIMNAT API v2.1 - Enum/Reference Data Service
 * File: src/services/enumService.js
 * ===================================================================
 *
 * Handles retrieval of all enumeration and reference data
 * Implements caching for optimal performance
 */

const db = require('../db/knex');
const logger = require('../utils/logger');

class EnumService {

  /**
   * Get all enumeration data
   * @returns {Object} All enum data grouped by type
   */
  static async getAllEnums() {
    try {
      const [
        vehicleTypes,
        paymentMethods,
        insuranceTypes,
        deliveryMethods,
        taxClasses,
        clientIdTypes,
        radioTvUsage,
        frequencies,
        suburbsTowns,
        insuranceCompanies
      ] = await Promise.all([
        db('enum_vehicle_types').select('*').orderBy('code'),
        db('enum_payment_methods').select('*').orderBy('code'),
        db('enum_insurance_types').select('*').orderBy('code'),
        db('enum_delivery_methods').select('*').orderBy('code'),
        db('enum_tax_classes').select('*').orderBy('tax_class'),
        db('enum_client_id_types').select('*').orderBy('code'),
        db('enum_radio_tv_usage').select('*').orderBy('code'),
        db('enum_frequencies').select('*').orderBy('code'),
        db('enum_suburbs_towns').select('*').orderBy('suburb_id'),
        db('enum_insurance_companies').select('*').orderBy('company_id')
      ]);

      return {
        vehicleTypes,
        paymentMethods,
        insuranceTypes,
        deliveryMethods,
        taxClasses,
        clientIdTypes,
        radioTvUsage,
        frequencies,
        suburbsTowns,
        insuranceCompanies
      };

    } catch (error) {
      logger.error('Failed to retrieve all enums', { error: error.message, stack: error.stack });
      throw new Error('Failed to retrieve enumeration data');
    }
  }

  /**
   * Get specific enum type
   * @param {String} type - Enum type name
   * @returns {Array} Enum data for the specified type
   */
  static async getEnumByType(type) {
    try {
      let tableName;
      let orderBy = 'code';

      switch (type.toLowerCase()) {
        case 'vehicletypes':
        case 'vehicle_types':
          tableName = 'enum_vehicle_types';
          break;

        case 'paymentmethods':
        case 'payment_methods':
          tableName = 'enum_payment_methods';
          break;

        case 'insurancetypes':
        case 'insurance_types':
          tableName = 'enum_insurance_types';
          break;

        case 'deliverymethods':
        case 'delivery_methods':
          tableName = 'enum_delivery_methods';
          break;

        case 'taxclasses':
        case 'tax_classes':
          tableName = 'enum_tax_classes';
          orderBy = 'tax_class';
          break;

        case 'clientidtypes':
        case 'client_id_types':
          tableName = 'enum_client_id_types';
          break;

        case 'radiotvusage':
        case 'radio_tv_usage':
          tableName = 'enum_radio_tv_usage';
          break;

        case 'frequencies':
          tableName = 'enum_frequencies';
          break;

        case 'suburbstowns':
        case 'suburbs_towns':
          tableName = 'enum_suburbs_towns';
          orderBy = 'suburb_id';
          break;

        case 'insurancecompanies':
        case 'insurance_companies':
          tableName = 'enum_insurance_companies';
          orderBy = 'company_id';
          break;

        default:
          throw new Error(`Invalid enum type: ${type}`);
      }

      const data = await db(tableName).select('*').orderBy(orderBy);

      return data;

    } catch (error) {
      logger.error('Failed to retrieve enum by type', {
        type,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get vehicle types
   * @returns {Array} Vehicle types data
   */
  static async getVehicleTypes() {
    try {
      return await db('enum_vehicle_types').select('*').orderBy('code');
    } catch (error) {
      logger.error('Failed to retrieve vehicle types', { error: error.message });
      throw new Error('Failed to retrieve vehicle types');
    }
  }

  /**
   * Get payment methods
   * @returns {Array} Payment methods data
   */
  static async getPaymentMethods() {
    try {
      return await db('enum_payment_methods').select('*').orderBy('code');
    } catch (error) {
      logger.error('Failed to retrieve payment methods', { error: error.message });
      throw new Error('Failed to retrieve payment methods');
    }
  }

  /**
   * Get insurance types
   * @returns {Array} Insurance types data
   */
  static async getInsuranceTypes() {
    try {
      return await db('enum_insurance_types').select('*').orderBy('code');
    } catch (error) {
      logger.error('Failed to retrieve insurance types', { error: error.message });
      throw new Error('Failed to retrieve insurance types');
    }
  }

  /**
   * Get delivery methods
   * @returns {Array} Delivery methods data
   */
  static async getDeliveryMethods() {
    try {
      return await db('enum_delivery_methods').select('*').orderBy('code');
    } catch (error) {
      logger.error('Failed to retrieve delivery methods', { error: error.message });
      throw new Error('Failed to retrieve delivery methods');
    }
  }

  /**
   * Get tax classes
   * @param {Number} vehicleType - Filter by vehicle type (optional)
   * @returns {Array} Tax classes data
   */
  static async getTaxClasses(vehicleType = null) {
    try {
      let query = db('enum_tax_classes').select('*');

      if (vehicleType) {
        query = query.where('vehicle_type', vehicleType);
      }

      return await query.orderBy('tax_class');
    } catch (error) {
      logger.error('Failed to retrieve tax classes', { error: error.message });
      throw new Error('Failed to retrieve tax classes');
    }
  }

  /**
   * Get suburbs and towns
   * @param {String} town - Filter by town (optional)
   * @returns {Array} Suburbs and towns data
   */
  static async getSuburbsTowns(town = null) {
    try {
      let query = db('enum_suburbs_towns').select('*');

      if (town) {
        query = query.where('town', 'ilike', `%${town}%`);
      }

      return await query.orderBy('suburb_id');
    } catch (error) {
      logger.error('Failed to retrieve suburbs and towns', { error: error.message });
      throw new Error('Failed to retrieve suburbs and towns');
    }
  }

  /**
   * Get client ID types
   * @returns {Array} Client ID types data
   */
  static async getClientIdTypes() {
    try {
      return await db('enum_client_id_types').select('*').orderBy('code');
    } catch (error) {
      logger.error('Failed to retrieve client ID types', { error: error.message });
      throw new Error('Failed to retrieve client ID types');
    }
  }

  /**
   * Get radio/TV usage types
   * @returns {Array} Radio/TV usage data
   */
  static async getRadioTvUsage() {
    try {
      return await db('enum_radio_tv_usage').select('*').orderBy('code');
    } catch (error) {
      logger.error('Failed to retrieve radio/TV usage', { error: error.message });
      throw new Error('Failed to retrieve radio/TV usage');
    }
  }

  /**
   * Get frequencies
   * @returns {Array} Frequencies data
   */
  static async getFrequencies() {
    try {
      return await db('enum_frequencies').select('*').orderBy('code');
    } catch (error) {
      logger.error('Failed to retrieve frequencies', { error: error.message });
      throw new Error('Failed to retrieve frequencies');
    }
  }

  /**
   * Get insurance companies
   * @returns {Array} Insurance companies data
   */
  static async getInsuranceCompanies() {
    try {
      return await db('enum_insurance_companies').select('*').orderBy('company_id');
    } catch (error) {
      logger.error('Failed to retrieve insurance companies', { error: error.message });
      throw new Error('Failed to retrieve insurance companies');
    }
  }

  /**
   * Validate vehicle type code
   * @param {Number} code - Vehicle type code
   * @returns {Boolean} True if valid
   */
  static async isValidVehicleType(code) {
    try {
      const result = await db('enum_vehicle_types').where('code', code).first();
      return !!result;
    } catch (error) {
      logger.error('Failed to validate vehicle type', { code, error: error.message });
      return false;
    }
  }

  /**
   * Validate insurance type code
   * @param {Number} code - Insurance type code
   * @returns {Boolean} True if valid
   */
  static async isValidInsuranceType(code) {
    try {
      const result = await db('enum_insurance_types').where('code', code).first();
      return !!result;
    } catch (error) {
      logger.error('Failed to validate insurance type', { code, error: error.message });
      return false;
    }
  }

  /**
   * Validate payment method code
   * @param {Number} code - Payment method code
   * @returns {Boolean} True if valid
   */
  static async isValidPaymentMethod(code) {
    try {
      const result = await db('enum_payment_methods').where('code', code).first();
      return !!result;
    } catch (error) {
      logger.error('Failed to validate payment method', { code, error: error.message });
      return false;
    }
  }

  /**
   * Validate suburb ID
   * @param {Number} suburbId - Suburb ID
   * @returns {Boolean} True if valid
   */
  static async isValidSuburb(suburbId) {
    try {
      const result = await db('enum_suburbs_towns').where('suburb_id', suburbId).first();
      return !!result;
    } catch (error) {
      logger.error('Failed to validate suburb', { suburbId, error: error.message });
      return false;
    }
  }
}

module.exports = EnumService;
