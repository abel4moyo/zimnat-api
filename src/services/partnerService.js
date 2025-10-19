const partnerModel = require('../models/partnerModel');
const logger = require('../utils/logger');
const { generateApiKey } = require('../utils/zimnatHelper');

class PartnerService {
  static async getAllPartners() {
    try {
      const partners = await partnerModel.findAllWithStatistics();
      return partners;

    } catch (error) {
      logger.error('Error getting all partners', error);
      throw error;
    }
  }

  static async createPartner(partnerData) {
    try {
      // Generate API key if not provided
      if (!partnerData.api_key) {
        partnerData.api_key = generateApiKey(partnerData.partner_code?.toLowerCase());
      }

      const partner = await partnerModel.create(partnerData);

      logger.info('Partner created', {
        partnerId: partner.id,
        partnerCode: partner.partner_code,
        partnerName: partner.partner_name
      });

      return partner;

    } catch (error) {
      logger.error('Error creating partner', error);
      throw error;
    }
  }

  static async getPartnerByApiKey(apiKey) {
    try {
      const partner = await partnerModel.findByApiKey(apiKey);
      
      if (!partner) {
        throw {
          status: 404,
          message: 'Partner not found',
          code: 'PARTNER_NOT_FOUND'
        };
      }

      return partner;

    } catch (error) {
      logger.error('Error getting partner by API key', error);
      throw error;
    }
  }
}

module.exports = PartnerService;