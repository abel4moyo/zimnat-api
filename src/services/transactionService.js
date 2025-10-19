const transactionModel = require('../models/transactionModel');
const logger = require('../utils/logger');
const { generateUniqueId } = require('../utils/zimnatHelper');
const { TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../utils/constants');

class TransactionService {
  static async getTransactions(options) {
    try {
      const { page, limit, status, date_from, date_to, partner_id } = options;
      
      const transactions = await transactionModel.findByPartner(partner_id, {
        page,
        limit,
        status,
        date_from,
        date_to
      });

      return transactions;

    } catch (error) {
      logger.error('Error getting transactions', error);
      throw error;
    }
  }

  static async createTransaction(transactionData) {
    try {
      // Generate transaction ID if not provided
      if (!transactionData.transaction_id) {
        transactionData.transaction_id = generateUniqueId('TXN');
      }

      // Set default status
      if (!transactionData.status) {
        transactionData.status = TRANSACTION_STATUS.PENDING;
      }

      const transaction = await transactionModel.create(transactionData);

      logger.info('Transaction created', {
        transactionId: transaction.transaction_id,
        type: transaction.transaction_type,
        amount: transaction.amount,
        partnerId: transaction.partner_id
      });

      return transaction;

    } catch (error) {
      logger.error('Error creating transaction', error);
      throw error;
    }
  }

  static async updateTransactionStatus(transactionId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        ...additionalData
      };

      if (status === TRANSACTION_STATUS.COMPLETED) {
        updateData.processed_at = new Date();
      }

      const transaction = await transactionModel.updateStatus(transactionId, updateData);

      if (!transaction) {
        throw {
          status: 404,
          message: 'Transaction not found',
          code: 'TRANSACTION_NOT_FOUND'
        };
      }

      logger.info('Transaction status updated', {
        transactionId,
        oldStatus: transaction.status,
        newStatus: status
      });

      return transaction;

    } catch (error) {
      logger.error('Error updating transaction status', error);
      throw error;
    }
  }

  static async getTransactionById(transactionId) {
    try {
      const transaction = await transactionModel.findById(transactionId);
      
      if (!transaction) {
        throw {
          status: 404,
          message: 'Transaction not found',
          code: 'TRANSACTION_NOT_FOUND'
        };
      }

      return transaction;

    } catch (error) {
      logger.error('Error getting transaction by ID', error);
      throw error;
    }
  }

  static async getTransactionsByCustomer(customerId, options = {}) {
    try {
      const transactions = await transactionModel.findByCustomer(customerId, options);
      return transactions;

    } catch (error) {
      logger.error('Error getting transactions by customer', error);
      throw error;
    }
  }
}

module.exports = TransactionService;