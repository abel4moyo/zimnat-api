

// src/controllers/customerController.js
const CustomerModel = require('../models/customerModel');
const logger = require('../utils/logger');

class CustomerController {
  
  /**
   * Get all customers
   */
  static async getCustomers(req, res, next) {
    try {
      const customers = await CustomerModel.findAll();
      
      logger.info('Customers retrieved', { 
        count: customers.length 
      });
      
      res.json({ 
        success: true, 
        data: customers,
        meta: {
          count: customers.length,
          source: 'fcb_policies_and_quotes'
        }
      });
      
    } catch (error) {
      logger.error('Customers retrieval failed', { 
        error: error.message, 
        stack: error.stack 
      });
      
      next({ 
        status: 500, 
        message: 'Failed to retrieve customers', 
        code: 'CUSTOMERS_RETRIEVAL_FAILED' 
      });
    }
  }

  /**
   * Get customer by ID
   */
  static async getCustomerById(req, res, next) {
    try {
      const { customerId } = req.params;
      const customer = await CustomerModel.findById(customerId);
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }
      
      res.json({ 
        success: true, 
        data: customer 
      });
      
    } catch (error) {
      logger.error('Customer retrieval failed', { 
        error: error.message, 
        customerId: req.params.customerId 
      });
      
      next({ 
        status: 500, 
        message: 'Failed to retrieve customer', 
        code: 'CUSTOMER_RETRIEVAL_FAILED' 
      });
    }
  }

  /**
   * Search customers
   */
  static async searchCustomers(req, res, next) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query parameter "q" is required',
          code: 'MISSING_SEARCH_QUERY'
        });
      }
      
      const customers = await CustomerModel.search(q);
      
      res.json({ 
        success: true, 
        data: customers,
        meta: {
          search_term: q,
          count: customers.length
        }
      });
      
    } catch (error) {
      logger.error('Customer search failed', { 
        error: error.message, 
        search_term: req.query.q 
      });
      
      next({ 
        status: 500, 
        message: 'Failed to search customers', 
        code: 'CUSTOMER_SEARCH_FAILED' 
      });
    }
  }

  /**
   * Get customer statistics
   */
  static async getCustomerStatistics(req, res, next) {
    try {
      const stats = await CustomerModel.getStatistics();
      
      res.json({ 
        success: true, 
        data: stats 
      });
      
    } catch (error) {
      logger.error('Customer statistics retrieval failed', { 
        error: error.message 
      });
      
      next({ 
        status: 500, 
        message: 'Failed to retrieve customer statistics', 
        code: 'CUSTOMER_STATS_FAILED' 
      });
    }
  }
}

module.exports = CustomerController;