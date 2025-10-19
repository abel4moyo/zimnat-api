// =============================================================================
// ICE Cash Integration Service with HMAC Authentication
// File: src/services/iceCashIntegrationService.js
// =============================================================================

const axios = require('axios');
const { HMACAuthentication } = require('../middleware/hmacAuthentication');
const logger = require('../utils/logger');

class ICECashIntegrationService {
  
  constructor() {
    this.baseURL = process.env.ICECASH_API_URL || 'https://test-api.icecash.mobi/request';
    this.partnerID = process.env.FCB_PARTNER_ID || 'FCB001';
    this.partnerToken = process.env.FCB_PARTNER_TOKEN;
    this.timeout = 30000; // 30 seconds timeout
  }
  
  /**
   * Make authenticated request to ICE Cash API
   * @param {Object} requestData - The request data
   * @returns {Promise<Object>} - ICE Cash response
   */
  async makeRequest(requestData) {
    try {
      // Add standard fields to request
      const fullRequest = {
        PartnerReference: this.generatePartnerReference(),
        Date: this.getCurrentDate(),
        Version: '2.1',
        PartnerToken: this.partnerToken,
        ...requestData
      };
      
      // Prepare request with HMAC
      const authenticatedRequest = HMACAuthentication.prepareICECashRequest(fullRequest);
      
      logger.info('Sending ICE Cash Request', {
        function: requestData.Function,
        partnerReference: fullRequest.PartnerReference,
        url: `${this.baseURL}/${this.partnerID}`
      });
      
      // Send request to ICE Cash
      const response = await axios.post(
        `${this.baseURL}/${this.partnerID}`,
        authenticatedRequest,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'FCB-API-Integration/1.0'
          },
          timeout: this.timeout
        }
      );
      
      logger.info('ICE Cash Response Received', {
        status: response.status,
        function: requestData.Function,
        result: response.data?.Response?.Result || response.data?.Result
      });
      
      return response.data;
      
    } catch (error) {
      logger.error('ICE Cash Request Failed', {
        error: error.message,
        function: requestData.Function,
        status: error.response?.status,
        data: error.response?.data
      });
      
      throw new Error(`ICE Cash API Error: ${error.message}`);
    }
  }
  
  // =============================================================================
  // TPI (Third Party Insurance) Methods
  // =============================================================================
  
  /**
   * Generate TPI Quotes
   * @param {Array} vehicles - Array of vehicle data
   * @returns {Promise<Object>} - Quote response
   */
  async generateTPIQuotes(vehicles) {
    const requestData = {
      Function: 'TPIQuotes',
      Vehicles: vehicles.map(vehicle => ({
        ClientIDType: vehicle.clientIDType || '1',
        IDNumber: vehicle.idNumber,
        CompanyName: vehicle.companyName || '',
        FirstName: vehicle.firstName,
        LastName: vehicle.lastName,
        MSISDN: vehicle.phone,
        Email: vehicle.email,
        BirthDate: vehicle.birthDate,
        Address1: vehicle.address1,
        Address2: vehicle.address2 || '',
        SuburbID: vehicle.suburbID || '2',
        Policy_IDNumber: vehicle.policyIDNumber || vehicle.idNumber,
        Policy_CompanyName: vehicle.policyCompanyName || '',
        Policy_FirstName: vehicle.policyFirstName || vehicle.firstName,
        Policy_LastName: vehicle.policyLastName || vehicle.lastName,
        Policy_MSISDN: vehicle.policyPhone || vehicle.phone,
        Policy_Email: vehicle.policyEmail || vehicle.email,
        Policy_Address1: vehicle.policyAddress1 || vehicle.address1,
        Policy_Address2: vehicle.policyAddress2 || vehicle.address2 || '',
        Policy_EntityType: vehicle.policyEntityType || 'Personal',
        Policy_BirthDate: vehicle.policyBirthDate || vehicle.birthDate,
        InsuranceType: vehicle.insuranceType,
        VehicleType: vehicle.vehicleType,
        VehicleValue: vehicle.vehicleValue,
        DurationMonths: vehicle.durationMonths || '12',
        LicFrequency: vehicle.licFrequency || '3',
        RadioTVUsage: vehicle.radioTVUsage || '0',
        RadioTVFrequency: vehicle.radioTVFrequency || '0'
      }))
    };
    
    return await this.makeRequest(requestData);
  }
  
  /**
   * Update TPI Quote Status
   * @param {String} combinedID - Combined ID from quote response
   * @param {Boolean} approved - Whether quote is approved
   * @param {Object} paymentDetails - Payment method details
   * @returns {Promise<Object>} - Update response
   */
  async updateTPIQuote(combinedID, approved, paymentDetails = {}) {
    const requestData = {
      Function: 'TPIQuoteUpdate',
      CombinedID: combinedID,
      Result: approved ? 1 : 0,
      Status: approved ? 1 : 0,
      DeliveryMethod: paymentDetails.deliveryMethod || 1,
      PaymentMethod: paymentDetails.paymentMethod || 1,
      ICEcashReference: paymentDetails.icecashReference || '',
      Identifier: paymentDetails.identifier || '',
      MSISDN: paymentDetails.msisdn || '',
      GatewayURL: paymentDetails.gatewayURL || ''
    };
    
    return await this.makeRequest(requestData);
  }
  
  /**
   * Get TPI Policy Status
   * @param {String} combinedID - Combined ID from quote response
   * @returns {Promise<Object>} - Policy status response
   */
  async getTPIPolicyStatus(combinedID) {
    const requestData = {
      Function: 'TPIPolicyStatus',
      CombinedID: combinedID
    };
    
    return await this.makeRequest(requestData);
  }
  
  // =============================================================================
  // License Methods
  // =============================================================================
  
  /**
   * Generate License Quote
   * @param {Array} licenses - Array of license data
   * @returns {Promise<Object>} - License quote response
   */
  async generateLicenseQuote(licenses) {
    const requestData = {
      Function: 'LICQuote',
      Licences: licenses.map(license => ({
        VRN: license.vrn,
        IDNumber: license.idNumber
      }))
    };
    
    return await this.makeRequest(requestData);
  }
  
  /**
   * Update License Quote
   * @param {String} combinedID - Combined ID from license quote
   * @param {Boolean} approved - Whether license is approved
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} - Update response
   */
  async updateLicenseQuote(combinedID, approved, paymentDetails = {}) {
    const requestData = {
      Function: 'LICQuoteUpdate',
      CombinedID: combinedID,
      Result: approved ? 1 : 0,
      Status: approved ? 1 : 0,
      DeliveryMethod: paymentDetails.deliveryMethod || 1,
      PaymentMethod: paymentDetails.paymentMethod || 1,
      ICEcashReference: paymentDetails.icecashReference || '',
      Identifier: paymentDetails.identifier || '',
      MSISDN: paymentDetails.msisdn || '',
      GatewayURL: paymentDetails.gatewayURL || ''
    };
    
    return await this.makeRequest(requestData);
  }
  
  /**
   * Get License Result
   * @param {Array} licenseIDs - Array of license IDs
   * @returns {Promise<Object>} - License result response
   */
  async getLicenseResult(licenseIDs) {
    const requestData = {
      Function: 'LICResult',
      LicenceIDBatch: licenseIDs.join(', ')
    };
    
    return await this.makeRequest(requestData);
  }
  
  /**
   * Get License Result Summary
   * @param {Array} licenseIDs - Array of license IDs
   * @returns {Promise<Object>} - License result summary
   */
  async getLicenseResultSummary(licenseIDs) {
    const requestData = {
      Function: 'LICResultSummary',
      LicenceIDBatch: licenseIDs.join(', ')
    };
    
    return await this.makeRequest(requestData);
  }
  
  // =============================================================================
  // Combined TPI & License Methods
  // =============================================================================
  
  /**
   * Generate Combined TPI & License Quote
   * @param {Array} vehicles - Vehicle and license data
   * @returns {Promise<Object>} - Combined quote response
   */
  async generateTPILicenseQuote(vehicles) {
    const requestData = {
      Function: 'TPILICQuote',
      Vehicles: vehicles.map(vehicle => ({
        ClientIDType: vehicle.clientIDType || '1',
        IDNumber: vehicle.idNumber,
        CompanyName: vehicle.companyName || '',
        FirstName: vehicle.firstName,
        LastName: vehicle.lastName,
        MSISDN: vehicle.phone,
        Email: vehicle.email,
        BirthDate: vehicle.birthDate,
        Address1: vehicle.address1,
        Address2: vehicle.address2 || '',
        SuburbID: vehicle.suburbID || '2',
        Policy_IDNumber: vehicle.policyIDNumber || vehicle.idNumber,
        Policy_CompanyName: vehicle.policyCompanyName || '',
        Policy_FirstName: vehicle.policyFirstName || vehicle.firstName,
        Policy_LastName: vehicle.policyLastName || vehicle.lastName,
        Policy_MSISDN: vehicle.policyPhone || vehicle.phone,
        Policy_Email: vehicle.policyEmail || vehicle.email,
        Policy_Address1: vehicle.policyAddress1 || vehicle.address1,
        Policy_Address2: vehicle.policyAddress2 || vehicle.address2 || '',
        Policy_EntityType: vehicle.policyEntityType || 'Personal',
        Policy_BirthDate: vehicle.policyBirthDate || vehicle.birthDate,
        InsuranceType: vehicle.insuranceType,
        VehicleType: vehicle.vehicleType,
        VehicleValue: vehicle.vehicleValue,
        DurationMonths: vehicle.durationMonths || '12',
        LicFrequency: vehicle.licFrequency || '3',
        RadioTVUsage: vehicle.radioTVUsage || '0',
        RadioTVFrequency: vehicle.radioTVFrequency || '0',
        VRN: vehicle.vrn,
        IDNumber: vehicle.licenseIDNumber || vehicle.idNumber
      }))
    };
    
    return await this.makeRequest(requestData);
  }
  
  /**
   * Update Combined TPI & License Quote
   * @param {String} combinedID - Combined ID
   * @param {Boolean} approved - Whether approved
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} - Update response
   */
  async updateTPILicenseQuote(combinedID, approved, paymentDetails = {}) {
    const requestData = {
      Function: 'TPILICUpdate',
      CombinedID: combinedID,
      Result: approved ? 1 : 0,
      Status: approved ? 1 : 0,
      DeliveryMethod: paymentDetails.deliveryMethod || 1,
      PaymentMethod: paymentDetails.paymentMethod || 1,
      ICEcashReference: paymentDetails.icecashReference || '',
      Identifier: paymentDetails.identifier || '',
      MSISDN: paymentDetails.msisdn || '',
      GatewayURL: paymentDetails.gatewayURL || ''
    };
    
    return await this.makeRequest(requestData);
  }
  
  /**
   * Get Combined TPI & License Result
   * @param {String} combinedID - Combined ID
   * @returns {Promise<Object>} - Combined result response
   */
  async getTPILicenseResult(combinedID) {
    const requestData = {
      Function: 'TPILICResult',
      CombinedID: combinedID
    };
    
    return await this.makeRequest(requestData);
  }
  
  // =============================================================================
  // Payment Methods
  // =============================================================================
  
  /**
   * Process Payment Confirmation
   * @param {Object} paymentData - Payment confirmation data
   * @returns {Promise<Object>} - Payment confirmation response
   */
  async processPaymentConfirmation(paymentData) {
    const requestData = {
      Function: 'OTPConfirmation',
      TransactionID: paymentData.transactionID,
      PaymentReference: paymentData.paymentReference,
      Amount: paymentData.amount,
      Status: paymentData.status,
      ResultCode: paymentData.resultCode
    };
    
    return await this.makeRequest(requestData);
  }
  
  // =============================================================================
  // Utility Methods
  // =============================================================================
  
  /**
   * Generate unique partner reference
   * @returns {String} - Partner reference
   */
  generatePartnerReference() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `FCB${timestamp}${random}`.toUpperCase();
  }
  
  /**
   * Get current date in ICE Cash format (YYYYMMDDHHMM)
   * @returns {String} - Formatted date
   */
  getCurrentDate() {
    return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  }
  
  /**
   * Validate response from ICE Cash
   * @param {Object} response - ICE Cash response
   * @returns {Boolean} - Whether response is valid
   */
  validateResponse(response) {
    return response && 
           response.Response && 
           response.Response.Result !== undefined;
  }
  
  /**
   * Check if response indicates success
   * @param {Object} response - ICE Cash response
   * @returns {Boolean} - Whether response indicates success
   */
  isSuccessResponse(response) {
    return this.validateResponse(response) && 
           (response.Response.Result === '1' || response.Response.Result === 1);
  }
}

// =============================================================================
// Export
// =============================================================================

module.exports = ICECashIntegrationService;