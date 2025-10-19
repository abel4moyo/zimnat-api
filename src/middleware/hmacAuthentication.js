// =============================================================================
// HMAC Authentication Implementation for FCB Integration
// File: src/middleware/hmacAuthentication.js
// =============================================================================

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * HMAC Authentication Middleware for FCB/ICE Cash Integration
 * 
 * Process Flow as per ICE Cash Documentation:
 * 1. Partner generates JSON request string
 * 2. Partner uses pre-shared key to encrypt the JSON request string:
 *    a. Reverse JSON string and pre-shared key
 *    b. Concatenate the two together
 *    c. Base64 encode this
 *    d. SHA512 the base64 encoded string
 *    e. Generate a 16 character string by taking every 8th character starting at 0, ending at 120
 *    f. Convert this string to uppercase
 * 3. Partner submits HTTP POST with HMAC in "MAC" field and JSON in "Arguments" field
 * 4. ICE Cash validates the HMAC and processes the request
 */

class HMACAuthentication {
  
  /**
   * Generate HMAC for outgoing requests to ICE Cash
   * @param {Object} requestData - The JSON request data
   * @param {String} preSharedKey - The pre-shared key from FCB
   * @returns {String} - Generated HMAC string
   */
  static generateHMAC(requestData, preSharedKey) {
    try {
      // Step 1: Convert request data to JSON string
      const jsonString = JSON.stringify(requestData);
      
      // Step 2a: Reverse JSON string and pre-shared key
      const reversedJson = jsonString.split('').reverse().join('');
      const reversedKey = preSharedKey.split('').reverse().join('');
      
      // Step 2b: Concatenate the two together
      const concatenated = reversedJson + reversedKey;
      
      // Step 2c: Base64 encode this
      const base64Encoded = Buffer.from(concatenated).toString('base64');
      
      // Step 2d: SHA512 the base64 encoded string
      const sha512Hash = crypto.createHash('sha512').update(base64Encoded).digest('hex');
      
      // Step 2e: Generate 16 character string by taking every 8th character (starting at 0, ending at 120)
      let hmacString = '';
      for (let i = 0; i <= 120; i += 8) {
        if (i < sha512Hash.length) {
          hmacString += sha512Hash[i];
        }
      }
      
      // Step 2f: Convert to uppercase and ensure 16 characters
      const finalHMAC = hmacString.substring(0, 16).toUpperCase();
      
      logger.debug('HMAC Generated', {
        jsonLength: jsonString.length,
        reversedJsonLength: reversedJson.length,
        concatenatedLength: concatenated.length,
        base64Length: base64Encoded.length,
        sha512Length: sha512Hash.length,
        hmacString: hmacString,
        finalHMAC: finalHMAC
      });
      
      return finalHMAC;
      
    } catch (error) {
      logger.error('HMAC Generation Error', { error: error.message, stack: error.stack });
      throw new Error('Failed to generate HMAC');
    }
  }
  
  /**
   * Validate incoming HMAC from ICE Cash responses
   * @param {Object} requestData - The original request data
   * @param {String} receivedHMAC - The HMAC received from ICE Cash
   * @param {String} preSharedKey - The pre-shared key from FCB
   * @returns {Boolean} - Whether HMAC is valid
   */
  static validateHMAC(requestData, receivedHMAC, preSharedKey) {
    try {
      const expectedHMAC = this.generateHMAC(requestData, preSharedKey);
      const isValid = expectedHMAC === receivedHMAC.toUpperCase();
      
      logger.info('HMAC Validation', {
        expected: expectedHMAC,
        received: receivedHMAC.toUpperCase(),
        isValid: isValid
      });
      
      return isValid;
      
    } catch (error) {
      logger.error('HMAC Validation Error', { error: error.message, stack: error.stack });
      return false;
    }
  }
  
  /**
   * Middleware for authenticating incoming requests from ICE Cash
   * Validates HMAC signature on POST requests
   */
  static authenticateIncoming(req, res, next) {
    try {
      // Skip HMAC validation for non-POST requests or health checks
      if (req.method !== 'POST' || req.path.includes('/health')) {
        return next();
      }
      
      const { MAC, Arguments, Mode } = req.body;
      
      // Check required fields
      if (!MAC || !Arguments) {
        logger.warn('HMAC Authentication Failed - Missing MAC or Arguments', {
          path: req.path,
          body: req.body,
          ip: req.ip
        });
        
        return res.status(401).json({
          PartnerReference: req.body.PartnerReference || '',
          Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
          Version: req.body.Version || '2.1',
          Response: {
            Result: '0',
            Message: 'Invalid Partner Token - Missing HMAC fields'
          }
        });
      }
      
      // Validate Mode field (should be 'SH' for SHA mode)
      if (Mode && Mode !== 'SH') {
        logger.warn('HMAC Authentication Failed - Invalid Mode', {
          path: req.path,
          mode: Mode,
          ip: req.ip
        });
        
        return res.status(401).json({
          PartnerReference: req.body.PartnerReference || '',
          Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
          Version: req.body.Version || '2.1',
          Response: {
            Result: '0',
            Message: 'Invalid Mode - Expected SH'
          }
        });
      }
      
      // Get pre-shared key from environment
      const preSharedKey = process.env.FCB_PRESHARED_KEY;
      if (!preSharedKey) {
        logger.error('HMAC Authentication Failed - No Pre-shared Key Configured');
        
        return res.status(500).json({
          PartnerReference: req.body.PartnerReference || '',
          Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
          Version: req.body.Version || '2.1',
          Response: {
            Result: '0',
            Message: 'Server Configuration Error'
          }
        });
      }
      
      // Validate HMAC
      const isValidHMAC = HMACAuthentication.validateHMAC(Arguments, MAC, preSharedKey);
      
      if (!isValidHMAC) {
        logger.warn('HMAC Authentication Failed - Invalid HMAC', {
          path: req.path,
          receivedMAC: MAC,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(401).json({
          PartnerReference: req.body.PartnerReference || '',
          Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
          Version: req.body.Version || '2.1',
          Response: {
            Result: '0',
            Message: 'Invalid Partner Token'
          }
        });
      }
      
      // HMAC validation successful
      logger.info('HMAC Authentication Successful', {
        path: req.path,
        partnerReference: req.body.PartnerReference,
        ip: req.ip
      });
      
      // Attach validated request data to req object
      req.validatedRequest = Arguments;
      req.hmacValidated = true;
      
      next();
      
    } catch (error) {
      logger.error('HMAC Authentication Middleware Error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        ip: req.ip
      });
      
      return res.status(500).json({
        PartnerReference: req.body.PartnerReference || '',
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: req.body.Version || '2.1',
        Response: {
          Result: '0',
          Message: 'Authentication Service Error'
        }
      });
    }
  }
  
  /**
   * Prepare request for sending to ICE Cash with HMAC
   * @param {Object} requestData - The request data to send
   * @returns {Object} - Formatted request with HMAC
   */
  static prepareICECashRequest(requestData) {
    try {
      const preSharedKey = process.env.FCB_PRESHARED_KEY;
      if (!preSharedKey) {
        throw new Error('FCB_PRESHARED_KEY not configured');
      }
      
      const hmac = this.generateHMAC(requestData, preSharedKey);
      
      const formattedRequest = {
        MAC: hmac,
        Arguments: requestData,
        Mode: 'SH'
      };
      
      logger.info('ICE Cash Request Prepared', {
        requestType: requestData.Function || 'Unknown',
        partnerReference: requestData.PartnerReference,
        hmac: hmac
      });
      
      return formattedRequest;
      
    } catch (error) {
      logger.error('ICE Cash Request Preparation Error', {
        error: error.message,
        stack: error.stack
      });
      throw new Error('Failed to prepare ICE Cash request');
    }
  }
}

// =============================================================================
// HMAC Utility Functions
// =============================================================================

/**
 * Helper function to test HMAC generation
 * @param {Object} testData - Test request data
 * @param {String} testKey - Test pre-shared key
 */
function testHMACGeneration(testData, testKey) {
  console.log('=== HMAC Generation Test ===');
  console.log('Test Data:', JSON.stringify(testData, null, 2));
  console.log('Test Key:', testKey);
  
  try {
    const hmac = HMACAuthentication.generateHMAC(testData, testKey);
    console.log('Generated HMAC:', hmac);
    
    // Test validation
    const isValid = HMACAuthentication.validateHMAC(testData, hmac, testKey);
    console.log('Validation Result:', isValid);
    
  } catch (error) {
    console.error('Test Error:', error.message);
  }
  
  console.log('=== End Test ===\n');
}

// =============================================================================
// Export
// =============================================================================

module.exports = {
  HMACAuthentication,
  authenticateHMAC: HMACAuthentication.authenticateIncoming,
  generateHMAC: HMACAuthentication.generateHMAC,
  validateHMAC: HMACAuthentication.validateHMAC,
  prepareICECashRequest: HMACAuthentication.prepareICECashRequest,
  testHMACGeneration
};