

const ZimnatLicenseService = require('../services/zimnatLicenseService');
const logger = require('../utils/logger');

class ZimnatLicenseController {
  static async processLicense(req, res, next) {
    try {
      const licenseData = req.body;
      
      const result = await ZimnatLicenseService.processLicense(licenseData);
      
      logger.info('License processed successfully', { 
        licenseType: licenseData.licenseType,
        customerInfo: licenseData.customerInfo?.firstName + ' ' + licenseData.customerInfo?.lastName 
      });

      res.status(201).json({
        status: 'SUCCESS',
        data: result
      });
    } catch (error) {
      logger.error('License processing failed', { 
        error: error.message, 
        stack: error.stack, 
        body: req.body 
      });
      next(error);
    }
  }

  static async getLicenseStatus(req, res, next) {
    try {
      const { licenseNumber } = req.params;
      
      const licenseStatus = await ZimnatLicenseService.getLicenseStatus(licenseNumber);
      
      res.json({
        status: 'SUCCESS',
        data: licenseStatus
      });
    } catch (error) {
      logger.error('License status retrieval failed', { 
        error: error.message, 
        stack: error.stack, 
        params: req.params 
      });
      next(error);
    }
  }

  static async renewLicense(req, res, next) {
    try {
      const { licenseNumber } = req.params;
      const renewalData = req.body;
      
      const result = await ZimnatLicenseService.renewLicense(licenseNumber, renewalData);
      
      logger.info('License renewed successfully', { 
        licenseNumber,
        newExpiryDate: result.expiryDate 
      });

      res.json({
        status: 'SUCCESS',
        data: result
      });
    } catch (error) {
      logger.error('License renewal failed', { 
        error: error.message, 
        stack: error.stack, 
        params: req.params,
        body: req.body 
      });
      next(error);
    }
  }
}

module.exports = ZimnatLicenseController;