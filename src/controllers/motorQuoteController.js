/**
 * ===================================================================
 * ZIMNAT API v2.1 - Motor Quote Controller
 * File: src/controllers/motorQuoteController.js
 * ===================================================================
 *
 * Handles motor quote creation and status endpoints
 */

const MotorQuoteService = require('../services/motorQuoteService');
const WebhookService = require('../services/webhookService');
const logger = require('../utils/logger');
const { formatResponse, formatErrorResponse, ERROR_CODES } = require('../utils/responseFormatter');

class MotorQuoteController {

  /**
   * POST /api/motor/quote/insurance
   * Create insurance quote
   */
  static async createInsuranceQuote(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const quoteData = req.body;

      // Validate required fields
      const requiredFields = ['externalReference', 'currency', 'vehicles'];

      for (const field of requiredFields) {
        if (!quoteData[field]) {
          return res.status(400).json(formatErrorResponse(
            ERROR_CODES.MISSING_REQUIRED_FIELD,
            `${field} is required`,
            requestId
          ));
        }
      }

      // Validate currency
      if (!['USD', 'ZWG'].includes(quoteData.currency.toUpperCase())) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_CURRENCY,
          'Currency must be USD or ZWG',
          requestId
        ));
      }

      // Validate vehicles array
      if (!Array.isArray(quoteData.vehicles) || quoteData.vehicles.length === 0) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_FIELD_VALUE,
          'vehicles must be a non-empty array',
          requestId
        ));
      }

      // Validate each vehicle has required insurance fields
      for (const vehicle of quoteData.vehicles) {
        if (!vehicle.vrn || !vehicle.vehicleType || !vehicle.insuranceType) {
          return res.status(400).json(formatErrorResponse(
            ERROR_CODES.MISSING_REQUIRED_FIELD,
            'Each vehicle must have vrn, vehicleType, and insuranceType',
            requestId
          ));
        }
      }

      logger.info('Insurance quote request', {
        externalReference: quoteData.externalReference,
        vehicleCount: quoteData.vehicles.length,
        currency: quoteData.currency,
        requestId,
        clientId: req.user?.clientId
      });

      // Add partner ID from JWT
      quoteData.partnerId = req.user?.clientId;

      // Create quotes
      const quotes = await MotorQuoteService.createMotorQuote(quoteData);

      logger.info('Insurance quotes created', {
        externalReference: quoteData.externalReference,
        quoteCount: quotes.length,
        requestId
      });

      // Send webhook if callback URL provided
      if (quoteData.callbackUrl) {
        for (const quote of quotes) {
          WebhookService.sendQuoteWebhook(
            quoteData.callbackUrl,
            {
              referenceId: quote.referenceId,
              externalReference: quoteData.externalReference,
              vrn: quote.vrn,
              totalAmount: quote.totalAmount,
              currency: quote.currency,
              status: quote.status,
              expiresAt: quote.expiresAt
            },
            'quote.created'
          ).catch(err => {
            logger.error('Webhook delivery failed', {
              referenceId: quote.referenceId,
              error: err.message
            });
          });
        }
      }

      return res.status(200).json(formatResponse({
        externalReference: quoteData.externalReference,
        quotes: quotes
      }, requestId));

    } catch (error) {
      if (error.code === 'INVALID_VEHICLE_TYPE') {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_FIELD_VALUE,
          error.message,
          req.headers['x-request-id']
        ));
      }

      logger.error('Insurance quote creation error', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while creating insurance quote',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * POST /api/motor/quote/licence
   * Create license quote
   */
  static async createLicenseQuote(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const quoteData = req.body;

      // Validate required fields
      const requiredFields = ['externalReference', 'currency', 'vehicles'];

      for (const field of requiredFields) {
        if (!quoteData[field]) {
          return res.status(400).json(formatErrorResponse(
            ERROR_CODES.MISSING_REQUIRED_FIELD,
            `${field} is required`,
            requestId
          ));
        }
      }

      // Validate currency
      if (!['USD', 'ZWG'].includes(quoteData.currency.toUpperCase())) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_CURRENCY,
          'Currency must be USD or ZWG',
          requestId
        ));
      }

      // Validate vehicles array
      if (!Array.isArray(quoteData.vehicles) || quoteData.vehicles.length === 0) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_FIELD_VALUE,
          'vehicles must be a non-empty array',
          requestId
        ));
      }

      // Validate each vehicle has required license fields
      for (const vehicle of quoteData.vehicles) {
        if (!vehicle.vrn || !vehicle.vehicleType || !vehicle.licFrequency) {
          return res.status(400).json(formatErrorResponse(
            ERROR_CODES.MISSING_REQUIRED_FIELD,
            'Each vehicle must have vrn, vehicleType, and licFrequency',
            requestId
          ));
        }
      }

      logger.info('License quote request', {
        externalReference: quoteData.externalReference,
        vehicleCount: quoteData.vehicles.length,
        currency: quoteData.currency,
        requestId,
        clientId: req.user?.clientId
      });

      // Add partner ID from JWT
      quoteData.partnerId = req.user?.clientId;

      // Create quotes
      const quotes = await MotorQuoteService.createMotorQuote(quoteData);

      logger.info('License quotes created', {
        externalReference: quoteData.externalReference,
        quoteCount: quotes.length,
        requestId
      });

      // Send webhook if callback URL provided
      if (quoteData.callbackUrl) {
        for (const quote of quotes) {
          WebhookService.sendQuoteWebhook(
            quoteData.callbackUrl,
            {
              referenceId: quote.referenceId,
              externalReference: quoteData.externalReference,
              vrn: quote.vrn,
              totalAmount: quote.totalAmount,
              currency: quote.currency,
              status: quote.status,
              expiresAt: quote.expiresAt
            },
            'quote.created'
          ).catch(err => {
            logger.error('Webhook delivery failed', {
              referenceId: quote.referenceId,
              error: err.message
            });
          });
        }
      }

      return res.status(200).json(formatResponse({
        externalReference: quoteData.externalReference,
        quotes: quotes
      }, requestId));

    } catch (error) {
      if (error.code === 'INVALID_VEHICLE_TYPE') {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_FIELD_VALUE,
          error.message,
          req.headers['x-request-id']
        ));
      }

      logger.error('License quote creation error', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while creating license quote',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * POST /api/motor/quote/combined
   * Create combined insurance and license quote
   */
  static async createCombinedQuote(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const quoteData = req.body;

      // Validate required fields
      const requiredFields = ['externalReference', 'currency', 'vehicles'];

      for (const field of requiredFields) {
        if (!quoteData[field]) {
          return res.status(400).json(formatErrorResponse(
            ERROR_CODES.MISSING_REQUIRED_FIELD,
            `${field} is required`,
            requestId
          ));
        }
      }

      // Validate currency
      if (!['USD', 'ZWG'].includes(quoteData.currency.toUpperCase())) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_CURRENCY,
          'Currency must be USD or ZWG',
          requestId
        ));
      }

      // Validate vehicles array
      if (!Array.isArray(quoteData.vehicles) || quoteData.vehicles.length === 0) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_FIELD_VALUE,
          'vehicles must be a non-empty array',
          requestId
        ));
      }

      // Validate each vehicle has required combined fields
      for (const vehicle of quoteData.vehicles) {
        if (!vehicle.vrn || !vehicle.vehicleType || !vehicle.insuranceType || !vehicle.licFrequency) {
          return res.status(400).json(formatErrorResponse(
            ERROR_CODES.MISSING_REQUIRED_FIELD,
            'Each vehicle must have vrn, vehicleType, insuranceType, and licFrequency',
            requestId
          ));
        }
      }

      logger.info('Combined quote request', {
        externalReference: quoteData.externalReference,
        vehicleCount: quoteData.vehicles.length,
        currency: quoteData.currency,
        requestId,
        clientId: req.user?.clientId
      });

      // Add partner ID from JWT
      quoteData.partnerId = req.user?.clientId;

      // Create quotes
      const quotes = await MotorQuoteService.createMotorQuote(quoteData);

      logger.info('Combined quotes created', {
        externalReference: quoteData.externalReference,
        quoteCount: quotes.length,
        requestId
      });

      // Send webhook if callback URL provided
      if (quoteData.callbackUrl) {
        for (const quote of quotes) {
          WebhookService.sendQuoteWebhook(
            quoteData.callbackUrl,
            {
              referenceId: quote.referenceId,
              externalReference: quoteData.externalReference,
              vrn: quote.vrn,
              totalAmount: quote.totalAmount,
              currency: quote.currency,
              status: quote.status,
              expiresAt: quote.expiresAt
            },
            'quote.created'
          ).catch(err => {
            logger.error('Webhook delivery failed', {
              referenceId: quote.referenceId,
              error: err.message
            });
          });
        }
      }

      return res.status(200).json(formatResponse({
        externalReference: quoteData.externalReference,
        quotes: quotes
      }, requestId));

    } catch (error) {
      if (error.code === 'INVALID_VEHICLE_TYPE') {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.INVALID_FIELD_VALUE,
          error.message,
          req.headers['x-request-id']
        ));
      }

      logger.error('Combined quote creation error', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while creating combined quote',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * POST /api/motor/quote/update/insurance
   * Update insurance quote
   */
  static async updateInsuranceQuote(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const updateData = req.body;

      // Validate required fields
      if (!updateData.referenceId) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'referenceId is required',
          requestId
        ));
      }

      logger.info('Quote update request', {
        referenceId: updateData.referenceId,
        requestId,
        clientId: req.user?.clientId
      });

      const quote = await MotorQuoteService.updateMotorQuote(
        updateData.referenceId,
        updateData
      );

      logger.info('Quote updated', {
        referenceId: updateData.referenceId,
        requestId
      });

      // Send webhook if callback URL provided
      if (updateData.callbackUrl) {
        WebhookService.sendQuoteWebhook(
          updateData.callbackUrl,
          {
            referenceId: quote.referenceId,
            externalReference: quote.externalReference,
            vrn: quote.vehicle.vrn,
            totalAmount: quote.amounts.totalAmount,
            currency: quote.currency,
            status: quote.status,
            expiresAt: quote.expiresAt
          },
          'quote.updated'
        ).catch(err => {
          logger.error('Webhook delivery failed', {
            referenceId: quote.referenceId,
            error: err.message
          });
        });
      }

      return res.status(200).json(formatResponse(quote, requestId));

    } catch (error) {
      if (error.code === 'QUOTE_NOT_FOUND') {
        return res.status(404).json(formatErrorResponse(
          ERROR_CODES.QUOTE_NOT_FOUND,
          error.message,
          req.headers['x-request-id']
        ));
      }

      if (error.code === 'QUOTE_EXPIRED' || error.code === 'QUOTE_ALREADY_ACCEPTED') {
        return res.status(400).json(formatErrorResponse(
          error.code,
          error.message,
          req.headers['x-request-id']
        ));
      }

      logger.error('Quote update error', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while updating quote',
        req.headers['x-request-id']
      ));
    }
  }

  /**
   * POST /api/motor/quote/status/insurance
   * Get quote status
   */
  static async getQuoteStatus(req, res) {
    try {
      const requestId = req.headers['x-request-id'];
      const { referenceId } = req.body;

      if (!referenceId) {
        return res.status(400).json(formatErrorResponse(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'referenceId is required',
          requestId
        ));
      }

      logger.info('Quote status request', {
        referenceId,
        requestId,
        clientId: req.user?.clientId
      });

      const quote = await MotorQuoteService.getQuoteByReference(referenceId);

      return res.status(200).json(formatResponse(quote, requestId));

    } catch (error) {
      if (error.code === 'QUOTE_NOT_FOUND') {
        return res.status(404).json(formatErrorResponse(
          ERROR_CODES.QUOTE_NOT_FOUND,
          error.message,
          req.headers['x-request-id']
        ));
      }

      logger.error('Quote status retrieval error', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json(formatErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An error occurred while retrieving quote status',
        req.headers['x-request-id']
      ));
    }
  }
}

module.exports = MotorQuoteController;
