const TransactionModel = require('../models/transactionModel');
const logger = require('../utils/logger');

class TransactionController {
  static async getTransactions(req, res, next) {
    try {
      const { page = 1, limit = 50, status = '', date_from = '', date_to = '' } = req.query;

      const { data, total } = await TransactionModel.findPaginated(
        req.partner.id,
        parseInt(page),
        parseInt(limit),
        status,
        date_from,
        date_to
      );

      res.json({
        success: true,
        data: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Transactions retrieval failed', { 
        error: error.message, 
        stack: error.stack, 
        query: req.query 
      });
      next({ 
        status: 500, 
        message: 'Failed to retrieve transactions', 
        code: 'TRANSACTION_RETRIEVAL_FAILED' 
      });
    }
  }
}

module.exports = TransactionController;