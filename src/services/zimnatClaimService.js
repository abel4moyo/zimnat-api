const zimnatClaimModel = require('../models/zimnatClaimModel');
const logger = require('../utils/logger');
const { generateUniqueId } = require('../utils/zimnatHelper');

class ZimnatClaimService {
  static async processClaimNumber(claimId) {
    try {
      // Find existing claim or create new one
      let claim = await zimnatClaimModel.findByClaimId(claimId);

      if (!claim) {
        // Create new claim record
        const claimData = {
          claim_id: claimId,
          status: 0, // Pending
          message: 'Claim processing initiated',
          claim_data: JSON.stringify({
            claimId,
            initiatedAt: new Date().toISOString()
          })
        };

        claim = await zimnatClaimModel.create(claimData);
      }

      // Process the claim (simulate claim processing)
      const processedClaim = await this.simulateClaimProcessing(claim);

      logger.info('Claim processed', {
        claimId,
        status: processedClaim.status
      });

      return {
        firstName: processedClaim.first_name || 'John',
        lastName: processedClaim.last_name || 'Doe',
        name: processedClaim.name || 'John Doe',
        email: processedClaim.email || 'john.doe@example.com',
        phone: processedClaim.phone || '+263771234567',
        currency: processedClaim.currency || 'USD',
        amount: processedClaim.amount || 1000,
        reinsuranceParticipants: processedClaim.reinsurance_participants || [],
        approvalType: processedClaim.approval_type || 'AUTO',
        hasEBB: processedClaim.has_ebb || false,
        placeOfLoss: processedClaim.place_of_loss || 'Harare',
        dateOfLoss: processedClaim.date_of_loss || new Date().toISOString(),
        vehicleMake: processedClaim.vehicle_make || 'Toyota',
        vehicleModel: processedClaim.vehicle_model || 'Corolla',
        policyNumber: processedClaim.policy_number || 'POL-12345',
        claimType: processedClaim.claim_type || 'MOTOR_ACCIDENT',
        status: processedClaim.status,
        message: processedClaim.message,
        vehicleRegNumber: processedClaim.vehicle_reg_number || 'ABC-123A'
      };

    } catch (error) {
      logger.error('Error processing claim number', error);
      throw error;
    }
  }

  static async simulateClaimProcessing(claim) {
    try {
      // Simulate claim processing logic
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate approval/rejection (80% approval rate)
      const isApproved = Math.random() > 0.2;
      const status = isApproved ? 1 : 2; // 1 = Approved, 2 = Rejected

      const updatedClaim = await zimnatClaimModel.updateStatus(claim.id, {
        status,
        message: isApproved ? 'Claim approved' : 'Claim rejected - insufficient documentation',
        amount: isApproved ? 1000 + Math.random() * 5000 : 0
      });

      return updatedClaim;

    } catch (error) {
      logger.error('Error in claim processing simulation', error);
      throw error;
    }
  }

  static async getClaimStatus(claimId) {
    try {
      const claim = await zimnatClaimModel.findByClaimId(claimId);

      if (!claim) {
        throw {
          status: 404,
          message: 'Claim not found',
          code: 'CLAIM_NOT_FOUND'
        };
      }

      return {
        claimId: claim.claim_id,
        status: claim.status,
        message: claim.message,
        amount: claim.amount,
        createdAt: claim.created_at,
        updatedAt: claim.updated_at
      };

    } catch (error) {
      logger.error('Error getting claim status', error);
      throw error;
    }
  }
}

module.exports = ZimnatClaimService;