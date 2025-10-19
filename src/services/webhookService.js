/**
 * ===================================================================
 * ZIMNAT API v2.1 - Webhook Notification Service
 * File: src/services/webhookService.js
 * ===================================================================
 *
 * Handles webhook delivery for payment and quote status updates
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class WebhookService {

  /**
   * Generate HMAC signature for webhook
   * @param {Object} payload - Webhook payload
   * @param {String} secret - Webhook secret
   * @returns {String} HMAC signature
   */
  static generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Send webhook notification
   * @param {String} url - Webhook URL
   * @param {Object} payload - Webhook payload
   * @param {String} secret - Webhook secret (optional)
   * @param {Number} retryCount - Current retry attempt (default 0)
   * @returns {Object} Webhook delivery result
   */
  static async sendWebhook(url, payload, secret = null, retryCount = 0) {
    const maxRetries = 3;
    const retryDelays = [1000, 3000, 9000]; // Exponential backoff: 1s, 3s, 9s

    try {
      if (!url) {
        logger.warn('Webhook URL not provided, skipping webhook delivery');
        return {
          success: false,
          reason: 'No webhook URL provided'
        };
      }

      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'ZIMNAT-API-v2.1-Webhook',
        'X-Webhook-Timestamp': new Date().toISOString()
      };

      // Add signature if secret is provided
      if (secret) {
        const signature = this.generateSignature(payload, secret);
        headers['X-Webhook-Signature'] = signature;
      }

      logger.info('Sending webhook', {
        url,
        eventType: payload.eventType,
        reference: payload.data?.txnReference || payload.data?.referenceId,
        attempt: retryCount + 1
      });

      const response = await axios.post(url, payload, {
        headers,
        timeout: 10000, // 10 seconds
        validateStatus: (status) => status >= 200 && status < 300
      });

      logger.info('Webhook delivered successfully', {
        url,
        eventType: payload.eventType,
        statusCode: response.status,
        attempt: retryCount + 1
      });

      return {
        success: true,
        statusCode: response.status,
        response: response.data,
        attempt: retryCount + 1
      };

    } catch (error) {
      logger.error('Webhook delivery failed', {
        url,
        eventType: payload.eventType,
        error: error.message,
        attempt: retryCount + 1,
        maxRetries
      });

      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        const delay = retryDelays[retryCount];

        logger.info('Retrying webhook delivery', {
          url,
          eventType: payload.eventType,
          nextAttempt: retryCount + 2,
          delayMs: delay
        });

        await this.sleep(delay);

        return await this.sendWebhook(url, payload, secret, retryCount + 1);
      }

      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        attempts: retryCount + 1,
        failedAfterRetries: true
      };
    }
  }

  /**
   * Send payment status webhook
   * @param {String} callbackUrl - Callback URL
   * @param {Object} paymentData - Payment data
   * @param {String} eventType - Event type (payment.pending, payment.completed, payment.failed, payment.reversed)
   * @returns {Object} Webhook delivery result
   */
  static async sendPaymentWebhook(callbackUrl, paymentData, eventType) {
    try {
      const payload = {
        eventType: eventType,
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          txnReference: paymentData.txnReference,
          externalReference: paymentData.externalReference,
          policyNumber: paymentData.policyNumber,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: paymentData.status,
          receiptNumber: paymentData.receiptNumber,
          processedAt: paymentData.processedAt
        }
      };

      return await this.sendWebhook(callbackUrl, payload);

    } catch (error) {
      logger.error('Failed to send payment webhook', {
        callbackUrl,
        eventType,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send quote status webhook
   * @param {String} callbackUrl - Callback URL
   * @param {Object} quoteData - Quote data
   * @param {String} eventType - Event type (quote.created, quote.updated, quote.expired, quote.accepted)
   * @returns {Object} Webhook delivery result
   */
  static async sendQuoteWebhook(callbackUrl, quoteData, eventType) {
    try {
      const payload = {
        eventType: eventType,
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          referenceId: quoteData.referenceId,
          externalReference: quoteData.externalReference,
          vrn: quoteData.vrn,
          totalAmount: quoteData.totalAmount,
          currency: quoteData.currency,
          status: quoteData.status,
          expiresAt: quoteData.expiresAt,
          policyNumber: quoteData.policyNumber
        }
      };

      return await this.sendWebhook(callbackUrl, payload);

    } catch (error) {
      logger.error('Failed to send quote webhook', {
        callbackUrl,
        eventType,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send reversal webhook
   * @param {String} callbackUrl - Callback URL
   * @param {Object} reversalData - Reversal data
   * @param {String} eventType - Event type (reversal.requested, reversal.completed, reversal.rejected)
   * @returns {Object} Webhook delivery result
   */
  static async sendReversalWebhook(callbackUrl, reversalData, eventType) {
    try {
      const payload = {
        eventType: eventType,
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          reversalReference: reversalData.reversalReference,
          originalExternalReference: reversalData.originalExternalReference,
          originalTxnReference: reversalData.originalTxnReference,
          receiptNumber: reversalData.receiptNumber,
          amount: reversalData.amount,
          currency: reversalData.currency,
          reason: reversalData.reason,
          status: reversalData.status,
          processedAt: reversalData.processedAt
        }
      };

      return await this.sendWebhook(callbackUrl, payload);

    } catch (error) {
      logger.error('Failed to send reversal webhook', {
        callbackUrl,
        eventType,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Webhook payload
   * @param {String} signature - Received signature
   * @param {String} secret - Webhook secret
   * @returns {Boolean} True if signature is valid
   */
  static verifySignature(payload, signature, secret) {
    try {
      const expectedSignature = this.generateSignature(payload, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Signature verification failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Sleep utility for retry delays
   * @param {Number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log webhook event (for audit trail)
   * @param {String} url - Webhook URL
   * @param {Object} payload - Webhook payload
   * @param {Object} result - Delivery result
   */
  static async logWebhookEvent(url, payload, result) {
    try {
      // This could be enhanced to store webhook logs in database
      logger.info('Webhook event logged', {
        url,
        eventType: payload.eventType,
        eventId: payload.eventId,
        success: result.success,
        attempts: result.attempts || result.attempt || 1,
        statusCode: result.statusCode,
        timestamp: new Date().toISOString()
      });

      // Future enhancement: Store in webhook_logs table
      // await db('webhook_logs').insert({...});

    } catch (error) {
      logger.error('Failed to log webhook event', {
        error: error.message
      });
    }
  }
}

module.exports = WebhookService;
