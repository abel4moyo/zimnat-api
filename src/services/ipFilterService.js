const ipFilterModel = require('../models/ipFilterModel');
const logger = require('../utils/logger');

class IPFilterService {
  static async addIPFilter(filterData) {
    try {
      const ipFilter = await ipFilterModel.create(filterData);

      logger.info('IP filter added', {
        ipAddress: filterData.ip_address,
        filterType: filterData.filter_type
      });

      return ipFilter;

    } catch (error) {
      logger.error('Error adding IP filter', error);
      throw error;
    }
  }

  static async removeIPFilter(ipAddress) {
    try {
      const removed = await ipFilterModel.deleteByIP(ipAddress);

      if (!removed) {
        throw {
          status: 404,
          message: 'IP filter not found',
          code: 'IP_FILTER_NOT_FOUND'
        };
      }

      logger.info('IP filter removed', { ipAddress });

      return { message: 'IP filter removed successfully' };

    } catch (error) {
      logger.error('Error removing IP filter', error);
      throw error;
    }
  }

  static async listIPFilters() {
    try {
      const filters = await ipFilterModel.findAll();
      return filters;

    } catch (error) {
      logger.error('Error listing IP filters', error);
      throw error;
    }
  }

  static async checkIPAccess(ipAddress) {
    try {
      const result = await ipFilterModel.checkAccess(ipAddress);
      return result;

    } catch (error) {
      logger.error('Error checking IP access', error);
      throw error;
    }
  }
}

module.exports = IPFilterService;