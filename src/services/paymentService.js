const paymentModel = require('../models/paymentModel');
const transactionService = require('./transactionService');
const logger = require('../utils/logger');
const { generateUniqueId } = require('../utils/zimnatHelper');
const { TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../utils/constants');

class PaymentService {
  static async processPayment(paymentData) {
    try {
      // Generate payment ID if not provided
      if (!paymentData.payment_id) {
        paymentData.payment_id = generateUniqueId('PAY');
      }

      // Set default status
      if (!paymentData.payment_status) {
        paymentData.payment_status = 'PENDING';
      }

      // Create transaction record
      const transactionData = {
        transaction_type: TRANSACTION_TYPES.PREMIUM_PAYMENT,
        partner_id: paymentData.partner_id,
        customer_id: paymentData.customer_id,
        policy_id: paymentData.policy_id,
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        external_reference: paymentData.bank_reference,
        request_data: JSON.stringify(paymentData)
      };

      const transaction = await transactionService.createTransaction(transactionData);
      paymentData.transaction_id = transaction.id;

      // Create payment record
      const payment = await paymentModel.create(paymentData);

      // Process payment (simulate payment gateway integration)
      const paymentResult = await this.processWithGateway(payment);

      // Update payment status
      await paymentModel.updateStatus(payment.id, paymentResult.status);

      // Update transaction status
      await transactionService.updateTransactionStatus(
        transaction.transaction_id,
        paymentResult.status === 'COMPLETED' ? TRANSACTION_STATUS.COMPLETED : TRANSACTION_STATUS.FAILED,
        { response_data: JSON.stringify(paymentResult) }
      );

      logger.info('Payment processed', {
        paymentId: payment.payment_id,
        transactionId: transaction.transaction_id,
        amount: payment.amount,
        status: paymentResult.status
      });

      return {
        payment,
        transaction,
        result: paymentResult
      };

    } catch (error) {
      logger.error('Error processing payment', error);
      throw error;
    }
  }

  static async processWithGateway(payment) {
    // Simulate payment gateway processing
    // In real implementation, this would integrate with actual payment gateway
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate success/failure (90% success rate for demo)
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        return {
          status: 'COMPLETED',
          gateway_reference: generateUniqueId('GW'),
          processed_at: new Date(),
          message: 'Payment processed successfully'
        };
      } else {
        return {
          status: 'FAILED',
          gateway_reference: null,
          processed_at: new Date(),
          message: 'Payment failed - insufficient funds'
        };
      }

    } catch (error) {
      logger.error('Payment gateway error', error);
      return {
        status: 'FAILED',
        gateway_reference: null,
        processed_at: new Date(),
        message: 'Payment gateway error'
      };
    }
  }

  static async getPaymentStatus(paymentId, partnerId) {
    try {
      const payment = await paymentModel.findByIdAndPartner(paymentId, partnerId);
      
      if (!payment) {
        throw {
          status: 404,
          message: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        };
      }

      return {
        payment_id: payment.payment_id,
        status: payment.payment_status,
        amount: payment.amount,
        currency: payment.currency,
        created_at: payment.created_at,
        processed_at: payment.processed_at
      };

    } catch (error) {
      logger.error('Error getting payment status', error);
      throw error;
    }
  }

  static async refundPayment(paymentId, refundData) {
    try {
      const payment = await paymentModel.findById(paymentId);
      
      if (!payment) {
        throw {
          status: 404,
          message: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        };
      }

      if (payment.payment_status !== 'COMPLETED') {
        throw {
          status: 400,
          message: 'Only completed payments can be refunded',
          code: 'INVALID_PAYMENT_STATUS'
        };
      }

      // Process refund
      const refundResult = await this.processRefund(payment, refundData);

      // Update payment status
      await paymentModel.updateStatus(payment.id, 'REFUNDED');

      logger.info('Payment refunded', {
        paymentId: payment.payment_id,
        refundAmount: refundData.amount
      });

      return refundResult;

    } catch (error) {
      logger.error('Error refunding payment', error);
      throw error;
    }
  }

  static async processRefund(payment, refundData) {
    // Simulate refund processing
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        refund_id: generateUniqueId('REF'),
        original_payment_id: payment.payment_id,
        refund_amount: refundData.amount,
        status: 'COMPLETED',
        processed_at: new Date(),
        message: 'Refund processed successfully'
      };

    } catch (error) {
      logger.error('Refund processing error', error);
      throw error;
    }
  }
}

module.exports = PaymentService;