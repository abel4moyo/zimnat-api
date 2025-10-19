const PartnerModel = require('../models/partnerModel');
const logger = require('../utils/logger');

class PartnerController {
  static async getPartners(req, res, next) {
    try {
      const partners = await PartnerModel.findAllWithStats();
      res.json({ success: true, data: partners });
    } catch (error) {
      logger.error('Partners retrieval failed', { 
        error: error.message, 
        stack: error.stack 
      });
      next({ 
        status: 500, 
        message: 'Failed to retrieve partners', 
        code: 'PARTNERS_RETRIEVAL_FAILED' 
      });
    }
  }
}

module.exports = PartnerController;