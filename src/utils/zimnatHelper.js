const crypto = require('crypto');
const logger = require('./logger');

class ZimnatHelper {
  // Generate unique customer reference
  static generateCustomerReference(prefix = 'CUST') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Generate unique quote ID
  static generateQuoteId(prefix = 'QTE') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Generate policy number
  static generatePolicyNumber(prefix = 'POL') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Validate vehicle registration number format
  static validateVRN(vrn) {
    // Zimbabwean vehicle registration format: AAA-123A
    const vrnRegex = /^[A-Z]{3}-\d{3}[A-Z]$/;
    return vrnRegex.test(vrn);
  }

  // Format currency amount
  static formatCurrency(amount, currency = 'USD') {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return '0.00';
    }
    return numAmount.toFixed(2);
  }

  // Calculate expiry date
  static calculateExpiryDate(durationMonths = 12) {
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(now.getMonth() + durationMonths);
    return expiryDate.toISOString();
  }

  // Hash sensitive data
  static hashSensitiveData(data) {
    return crypto
      .createHash('sha256')
      .update(data.toString())
      .digest('hex');
  }

  // Mask sensitive information
  static maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 4) {
      return '****';
    }
    return `****-****-****-${cardNumber.slice(-4)}`;
  }

  // Format phone number
  static formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Zimbabwe phone number format
    if (cleaned.startsWith('263')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+263${cleaned.slice(1)}`;
    } else {
      return `+263${cleaned}`;
    }
  }

  // Validate email format
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Generate secure API key
  static generateApiKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Log Zimnat API interaction
  static logApiInteraction(endpoint, request, response, duration) {
    logger.info('Zimnat API Interaction', {
      endpoint,
      request: {
        method: 'POST',
        headers: request.headers,
        bodySize: JSON.stringify(request.body).length
      },
      response: {
        statusCode: response.statusCode,
        bodySize: JSON.stringify(response.body || {}).length
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  }

  // Transform Zimnat API response to standard format
  static transformZimnatResponse(zimnatResponse, operation) {
    try {
      const standardResponse = {
        success: zimnatResponse.Result === 'SUCCESS' || zimnatResponse.result === 0,
        message: zimnatResponse.Message || zimnatResponse.message || 'Operation completed',
        data: {
          operation,
          customerReference: zimnatResponse.CustomerReference || zimnatResponse.customerReference,
          result: zimnatResponse.Result || zimnatResponse.result,
          ...zimnatResponse
        },
        timestamp: new Date().toISOString()
      };

      // Remove redundant fields
      delete standardResponse.data.Result;
      delete standardResponse.data.Message;
      delete standardResponse.data.result;
      delete standardResponse.data.message;

      return standardResponse;

    } catch (error) {
      logger.error('Error transforming Zimnat response', {
        error: error.message,
        operation,
        response: zimnatResponse
      });

      return {
        success: false,
        message: 'Error processing response',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = ZimnatHelper;
