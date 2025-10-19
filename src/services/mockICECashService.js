// ===================================================================
// MOCK ICE CASH SERVICE (FALLBACK)
// File: src/services/mockICECashService.js
// ===================================================================

const logger = require('../utils/logger');

class MockICECashService {
  constructor() {
    this.baseURL = process.env.ICECASH_BASE_URL || 'https://mock.icecash.api';
    this.partnerToken = process.env.ICECASH_PARTNER_TOKEN || 'mock_partner_token';
    logger.info('Mock ICE Cash Service initialized');
  }

  // TPI (Third Party Insurance) Methods
  async createTPIQuote(request) {
    try {
      logger.info('Creating mock TPI quote', { partnerReference: request.PartnerReference });
      
      const vehicles = request.Request.Vehicles.map((vehicle, index) => ({
        VRN: vehicle.VRN,
        InsuranceID: `TPI${Date.now()}${index}`,
        Result: 1,
        Message: "Quote generated successfully",
        Currency: vehicle.Currency || "ZWL",
        Amount: this.calculateMockTPIAmount(vehicle),
        StampDuty: 5.00,
        GovernmentLevy: 10.00,
        CoverAmount: this.calculateMockTPIAmount(vehicle) - 15.00,
        PremiumAmount: this.calculateMockTPIAmount(vehicle),
        StartDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        EndDate: new Date(Date.now() + (vehicle.DurationMonths || 12) * 30 * 24 * 60 * 60 * 1000)
          .toISOString().slice(0, 10).replace(/-/g, ''),
        Make: vehicle.Make || "TOYOTA",
        Model: vehicle.Model || "COROLLA",
        YearManufacture: vehicle.YearManufacture || 2020,
        VehicleType: vehicle.VehicleType || "1"
      }));

      return {
        PartnerReference: request.PartnerReference,
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: request.Version || '2.1',
        Result: 1,
        Message: "Success",
        Response: {
          Function: "TPIQuote",
          Vehicles: vehicles
        }
      };
      
    } catch (error) {
      logger.error('Error creating mock TPI quote', { error: error.message });
      throw error;
    }
  }

  // License Methods
  async createLICQuote(request) {
    try {
      logger.info('Creating mock license quote', { partnerReference: request.PartnerReference });
      
      const vehicles = request.Request.Vehicles.map((vehicle, index) => ({
        VRN: vehicle.VRN,
        LicenceID: `LIC${Date.now()}${index}`,
        Result: 1,
        Message: "License quote generated successfully",
        Currency: vehicle.Currency || "ZWL",
        TotalLicAmt: 35.00,
        TotalRadioTVAmt: vehicle.RadioTVUsage === "1" ? 10.00 : 0,
        TotalAmount: 35.00 + (vehicle.RadioTVUsage === "1" ? 10.00 : 0),
        LicFrequency: vehicle.LicFrequency || "3",
        RadioTVUsage: vehicle.RadioTVUsage || "0",
        RadioTVFrequency: vehicle.RadioTVFrequency || "1"
      }));

      return {
        PartnerReference: request.PartnerReference,
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: request.Version || '2.1',
        Result: 1,
        Message: "Success",
        Response: {
          Function: "LICQuote",
          Vehicles: vehicles
        }
      };
      
    } catch (error) {
      logger.error('Error creating mock license quote', { error: error.message });
      throw error;
    }
  }

  // Combined TPI & License Methods
  async createTPILICQuote(request) {
    try {
      logger.info('Creating mock combined TPI/LIC quote', { partnerReference: request.PartnerReference });
      
      const vehicles = request.Request.Vehicles.map((vehicle, index) => ({
        VRN: vehicle.VRN,
        CombinedID: `CMB${Date.now()}${index}`,
        LicenceID: `LIC${Date.now()}${index}`,
        InsuranceID: `TPI${Date.now()}${index}`,
        Result: 1,
        Message: "Combined quote generated successfully",
        Currency: vehicle.Currency || "ZWL",
        // Insurance amounts
        InsuranceAmount: this.calculateMockTPIAmount(vehicle),
        StampDuty: 5.00,
        GovernmentLevy: 10.00,
        // License amounts
        TotalLicAmt: 35.00,
        TotalRadioTVAmt: vehicle.RadioTVUsage === "1" ? 10.00 : 0,
        // Combined total
        TotalAmount: this.calculateMockTPIAmount(vehicle) + 35.00 + (vehicle.RadioTVUsage === "1" ? 10.00 : 0)
      }));

      return {
        PartnerReference: request.PartnerReference,
        Date: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
        Version: request.Version || '2.1',
        Result: 1,
        Message: "Success",
        Response: {
          Function: "TPILICQuote",
          Vehicles: vehicles
        }
      };
      
    } catch (error) {
      logger.error('Error creating mock combined quote', { error: error.message });
      throw error;
    }
  }

  // Payment Methods
  async initiatePayment({ amount, reference, paymentReference, customerDetails }) {
    try {
      logger.info('Initiating mock payment', { amount, reference, paymentReference });
      
      return {
        paymentReference,
        amount,
        status: 'INITIATED',
        redirectUrl: `${this.baseURL}/payment?ref=${paymentReference}`,
        expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        mockService: true
      };
      
    } catch (error) {
      logger.error('Error initiating mock payment', { error: error.message });
      throw error;
    }
  }

  async confirmPayment(paymentReference) {
    try {
      logger.info('Confirming mock payment', { paymentReference });
      
      return {
        status: 'CONFIRMED',
        paymentReference,
        transactionId: `TXN${Date.now()}`,
        confirmedAt: new Date().toISOString(),
        mockService: true
      };
      
    } catch (error) {
      logger.error('Error confirming mock payment', { error: error.message });
      throw error;
    }
  }

  // Utility Methods
  calculateMockTPIAmount(vehicle) {
    const vehicleValue = parseFloat(vehicle.VehicleValue || 15000);
    const baseRates = { '1': 0.015, '2': 0.025, '3': 0.035, '4': 0.05 };
    const rate = baseRates[vehicle.InsuranceType] || 0.025;
    const basePremium = vehicleValue * rate;
    const minimumPremiums = { '1': 50, '2': 100, '3': 150, '4': 200 };
    return Math.max(basePremium, minimumPremiums[vehicle.InsuranceType] || 100);
  }

  async healthCheck() {
    try {
      logger.info('Mock ICE Cash service health check');
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        baseURL: this.baseURL,
        mockService: true,
        hasPartnerToken: !!this.partnerToken
      };
      
    } catch (error) {
      logger.error('Mock health check error', { error: error.message });
      throw error;
    }
  }
}

module.exports = new MockICECashService();
