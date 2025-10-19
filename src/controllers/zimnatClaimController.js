const ZimnatClaimModel = require('../models/zimnatClaimModel');
const logger = require('../utils/logger');
const crypto = require('crypto');

class ZimnatClaimController {
  static async processClaimNumber(req, res, next) {
    try {
      const { claimNumber, policyNumber, claimDetails } = req.body;
      
      // Check if claim already exists
      const existingClaim = await ZimnatClaimModel.findByClaimNumber(claimNumber);
      
      if (existingClaim) {
        return res.status(409).json({
          status: 'ERROR',
          errorCode: 'CLAIM_EXISTS',
          errorMessage: 'Claim number already exists in the system'
        });
      }

      // Create new claim record
      const claimData = {
        claim_number: claimNumber,
        policy_number: policyNumber,
        status: 'PENDING',
        claim_details: JSON.stringify(claimDetails),
        created_at: new Date(),
        reference_id: `CLAIM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
      };

      const [newClaim] = await ZimnatClaimModel.create(claimData);

      logger.info('Claim processed successfully', { 
        claimNumber, 
        policyNumber, 
        claimId: newClaim.id 
      });

      res.status(201).json({
        status: 'SUCCESS',
        data: {
          claimId: newClaim.id,
          claimNumber: newClaim.claim_number,
          referenceId: newClaim.reference_id,
          status: newClaim.status,
          createdAt: newClaim.created_at
        }
      });
    } catch (error) {
      logger.error('Claim processing failed', { 
        error: error.message, 
        stack: error.stack, 
        body: req.body 
      });
      next(error);
    }
  }

  static async getClaimDetails(req, res, next) {
    try {
      const { claimNumber } = req.params;
      
      const claim = await ZimnatClaimModel.findByClaimNumber(claimNumber);
      
      if (!claim) {
        return res.status(404).json({
          status: 'ERROR',
          errorCode: 'CLAIM_NOT_FOUND',
          errorMessage: 'Claim not found in the system'
        });
      }

      res.json({
        status: 'SUCCESS',
        data: {
          claimNumber: claim.claim_number,
          policyNumber: claim.policy_number,
          status: claim.status,
          claimDetails: JSON.parse(claim.claim_details || '{}'),
          referenceId: claim.reference_id,
          createdAt: claim.created_at,
          updatedAt: claim.updated_at
        }
      });
    } catch (error) {
      logger.error('Claim details retrieval failed', { 
        error: error.message, 
        stack: error.stack, 
        params: req.params 
      });
      next(error);
    }
  }

  static async updateClaimStatus(req, res, next) {
    try {
      const { claimNumber } = req.params;
      const { status, updateDetails } = req.body;
      
      const claim = await ZimnatClaimModel.findByClaimNumber(claimNumber);
      
      if (!claim) {
        return res.status(404).json({
          status: 'ERROR',
          errorCode: 'CLAIM_NOT_FOUND',
          errorMessage: 'Claim not found in the system'
        });
      }

      const updatedClaim = await ZimnatClaimModel.updateStatus(
        claim.id, 
        status, 
        updateDetails
      );

      logger.info('Claim status updated', { 
        claimNumber, 
        oldStatus: claim.status, 
        newStatus: status 
      });

      res.json({
        status: 'SUCCESS',
        data: {
          claimNumber: updatedClaim[0].claim_number,
          status: updatedClaim[0].status,
          updatedAt: updatedClaim[0].updated_at
        }
      });
    } catch (error) {
      logger.error('Claim status update failed', { 
        error: error.message, 
        stack: error.stack, 
        params: req.params,
        body: req.body 
      });
      next(error);
    }
  }
}

module.exports = ZimnatClaimController;