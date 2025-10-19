const PaymentService = require('../services/paymentService');
const logger = require('../utils/logger');

class PaymentController {
  static async processPayment(req, res, next) {
    try {
      const paymentResult = await PaymentService.processPayment(req.partner, req.body);
      res.status(201).json({ success: true, data: paymentResult });
    } catch (error) {
      logger.error('Payment processing failed', { 
        error: error.message, 
        stack: error.stack, 
        body: req.body 
      });
      next(error);
    }
  }

  static async getPaymentStatus(req, res, next) {
    try {
      const { transactionId } = req.params;
      const paymentStatus = await PaymentService.getPaymentStatus(transactionId, req.partner.id);
      res.json({ success: true, data: paymentStatus });
    } catch (error) {
      logger.error('Payment status retrieval failed', { 
        error: error.message, 
        stack: error.stack, 
        params: req.params 
      });
      next(error);
    }
  }
}

module.exports = PaymentController;