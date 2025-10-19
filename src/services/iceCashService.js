


// ===================================================================
// SIMPLE ICECASH SERVICE
// File: src/services/iceCashService.js
// ===================================================================

const logger = require('../utils/logger');

class ICECashService {
  constructor() {
    this.baseURL = process.env.ICECASH_API_URL || 'https://api.icecash.co.zw';
    this.partnerToken = process.env.ICECASH_PARTNER_TOKEN || 'demo_token';
    this.partnerId = process.env.ICECASH_PARTNER_ID || 'demo_partner';
  }

  async createTPILICQuote(request) {
    try {
      logger.info('Creating ICEcash TPI License Quote', { request });

      // For development, return mock response
      // In production, this would call the actual ICEcash API
      return this.getMockTPILICResponse(request);

    } catch (error) {
      logger.error('Error creating ICEcash TPI License Quote', { error: error.message });
      throw error;
    }
  }

  async updateTPILICQuote(request) {
    try {
      logger.info('Updating ICEcash TPI License Quote', { request });

      const combinedId = request.Request.CombinedID;
      const status = request.Request.Status;

      return {
        PartnerReference: request.PartnerReference,
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: request.Version,
        Result: 1,
        Message: status ? "Combined quote approved successfully" : "Combined quote rejected",
        Response: {
          Function: "TPILICUpdate",
          CombinedID: combinedId,
          Status: status,
          PolicyNumber: status ? `POL${Date.now()}` : null,
          LicenseReceiptID: status ? `LIC${Date.now()}` : null,
          InsuranceReceiptID: status ? `INS${Date.now()}` : null
        }
      };

    } catch (error) {
      logger.error('Error updating ICEcash TPI License Quote', { error: error.message });
      throw error;
    }
  }

  getMockTPILICResponse(request) {
    const vehicles = request.Request.Vehicles.map(vehicle => ({
      VRN: vehicle.VRN,
      CombinedID: Math.floor(Math.random() * 100000),
      LicenceID: Math.floor(Math.random() * 100000),
      InsuranceID: Math.floor(Math.random() * 100000),
      Result: 1,
      Message: "Combined quote generated successfully",
      
      // Insurance details
      StartDate: new Date().toISOString().slice(0, 8).replace(/-/g, ''),
      EndDate: new Date(Date.now() + (parseInt(vehicle.DurationMonths || 12) * 30 * 24 * 60 * 60 * 1000))
        .toISOString().slice(0, 8).replace(/-/g, ''),
      Amount: this.calculateMockAmount(vehicle),
      StampDuty: this.calculateMockAmount(vehicle) * 0.03,
      GovernmentLevy: this.calculateMockAmount(vehicle) * 0.05,
      CoverAmount: vehicle.VehicleValue || 15000,
      PremiumAmount: this.calculateMockAmount(vehicle),
      
      // License details
      TransactionAmt: 35,
      RadioTVAmt: vehicle.RadioTVUsage === "1" ? 10 : 0,
      TotalLicAmt: 35,
      TotalRadioTVAmt: vehicle.RadioTVUsage === "1" ? 10 : 0,
      
      // Combined total
      TotalAmount: this.calculateMockAmount(vehicle) + 35 + (vehicle.RadioTVUsage === "1" ? 10 : 0)
    }));

    return {
      PartnerReference: request.PartnerReference,
      Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
      Version: request.Version,
      Result: 1,
      Message: "Success",
      Response: {
        Function: "TPILICQuote",
        Vehicles: vehicles
      }
    };
  }

  calculateMockAmount(vehicle) {
    const vehicleValue = parseFloat(vehicle.VehicleValue || 15000);
    const baseRates = { '1': 0.015, '2': 0.025, '3': 0.035, '4': 0.05 };
    const rate = baseRates[vehicle.InsuranceType] || 0.025;
    const basePremium = vehicleValue * rate;
    const minimumPremiums = { '1': 50, '2': 100, '3': 150, '4': 200 };
    return Math.max(basePremium, minimumPremiums[vehicle.InsuranceType] || 100);
  }

  async healthCheck() {
    try {
      logger.info('ICEcash service health check');
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        baseURL: this.baseURL,
        hasPartnerToken: !!this.partnerToken,
        mode: 'development' // Since we're using mock responses
      };
    } catch (error) {
      logger.error('ICEcash service health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Utility methods
  generatePartnerReference() {
    return `FCB${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  formatDateForICEcash(date = new Date()) {
    return date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  }
}

module.exports = new ICECashService();
