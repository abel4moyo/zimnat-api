const PartnerModel = require('../models/partnerModel');
const ProductModel = require('../models/productModel');
const IpFilterModel = require('../models/ipFilterModel');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { pool } = require('../db');

class AdminController {
  static async createPartner(req, res, next) {
    try {
      const { partner_code, partner_name, integration_type, fee_percentage = 0.01 } = req.body;
      const apiKey = `${partner_code}-${crypto.randomBytes(16).toString('hex')}`;
      const webhookSecret = crypto.randomBytes(32).toString('hex');

      try {
        const [newPartner] = await PartnerModel.create({
          partner_code, 
          partner_name, 
          api_key: apiKey, 
          webhook_secret: webhookSecret, 
          integration_type, 
          fee_percentage
        });

        logger.info('Partner created successfully', { 
          partner_code, 
          partner_name, 
          id: newPartner.id 
        });

        res.status(201).json({
          success: true,
          message: 'Partner created successfully',
          data: { 
            ...newPartner, 
            api_key: apiKey, 
            webhook_secret: webhookSecret 
          }
        });
      } catch (dbError) {
        if (dbError.code === '23505') {
          return res.status(409).json({
            success: false,
            error: 'Partner code or API key already exists',
            code: 'DUPLICATE_PARTNER'
          });
        }
        throw dbError;
      }
    } catch (error) {
      logger.error('Create partner error', { 
        error: error.message, 
        stack: error.stack, 
        body: req.body 
      });
      next(error);
    }
  }

  static async createProduct(req, res, next) {
    let client;
    try {
      const { 
        product_code, 
        product_name, 
        category_code, 
        partner_code, 
        identifier_type, 
        allow_partial_payment = false, 
        base_premium = 0 
      } = req.body;

      client = await pool.connect();
      // For now, we'll create a simple category mapping
      const categoryMap = {
        'MOTOR': 1,
        'HEALTH': 2,
        'TRAVEL': 3,
        'PERSONAL_ACCIDENT': 4,
        'HCP': 5
      };
      const categoryId = categoryMap[category_code];
      
      if (!categoryId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category code. Supported: MOTOR, HEALTH, TRAVEL, PERSONAL_ACCIDENT, HCP',
          code: 'INVALID_CATEGORY'
        });
      }
      
      const partnerResult = await client.query(
        'SELECT id FROM fcb_partners WHERE partner_code = $1', 
        [partner_code]
      );
      client.release();

      if (partnerResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid partner code',
          code: 'INVALID_PARTNER'
        });
      }

      // Map category code to category name for the database
      const categoryNames = {
        'MOTOR': 'Motor Insurance',
        'HEALTH': 'Health Insurance', 
        'TRAVEL': 'Travel Insurance',
        'PERSONAL_ACCIDENT': 'Personal Accident Insurance',
        'HCP': 'HCP Insurance'
      };
      
      const productData = {
        product_id: product_code,  // Use product_code as product_id
        product_name,
        product_category: categoryNames[category_code] || category_code,
        rating_type: 'FLAT_RATE',
        description: `${product_name} - Base premium: $${base_premium}`,
        status: 'ACTIVE'
      };
      
      logger.info('Creating product with data:', productData);
      
      const [newProduct] = await ProductModel.create(productData);

      logger.info('Product created successfully', { 
        product_code, 
        product_name, 
        product_id: newProduct.product_id 
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: newProduct
      });
    } catch (error) {
      if (client) client.release();
      logger.error('Create product error', { 
        error: error.message, 
        stack: error.stack, 
        body: req.body 
      });
      next(error);
    }
  }

  static async addIpFilter(req, res, next) {
    try {
      const { ip_address, filter_type, description = null } = req.body;

      await IpFilterModel.addOrUpdate(ip_address, filter_type, description);

      logger.info(`IP ${ip_address} added/updated as ${filter_type} filter by admin`, { 
        ip_address, 
        filter_type, 
        adminIp: req.ip 
      });

      res.status(201).json({ 
        success: true, 
        message: `IP ${ip_address} added/updated in ${filter_type}list.` 
      });
    } catch (error) {
      logger.error('Error in add IP filter endpoint', { 
        error: error.message, 
        stack: error.stack, 
        body: req.body 
      });
      next(error);
    }
  }

  static async removeIpFilter(req, res, next) {
    try {
      const { ipAddress } = req.params;

      const deletedCount = await IpFilterModel.remove(ipAddress);

      if (deletedCount > 0) {
        logger.info(`IP ${ipAddress} removed from filters by admin`, { 
          ip_address: ipAddress, 
          adminIp: req.ip 
        });
        res.json({ 
          success: true, 
          message: `IP ${ipAddress} removed from filters.` 
        });
      } else {
        logger.info(`IP ${ipAddress} not found for removal`, { 
          ip_address: ipAddress, 
          adminIp: req.ip 
        });
        res.status(404).json({ 
          success: false, 
          error: 'IP address not found in filters', 
          code: 'IP_NOT_FOUND' 
        });
      }
    } catch (error) {
      logger.error('Error in remove IP filter endpoint', { 
        error: error.message, 
        stack: error.stack, 
        params: req.params 
      });
      next(error);
    }
  }
}

module.exports = AdminController;