const express = require('express');
const router = express.Router();
const ZimnatChemaController = require('../controllers/zimnatChemaController');
const zimnatChemaValidationRules = require('../validators/zimnatChemaValidator');
const authenticateZimnat = require('../middleware/authenticateZimnat');
const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responseHelper');

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json(errorResponse(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: errorMessages
    }));
  }
  next();
};

/**
 * @swagger
 * components:
 *   schemas:
 *     ZimnatChemaApplication:
 *       type: object
 *       required:
 *         - contractDetails
 *         - lifeAssuredDetails
 *         - lifeAssuredContactDetails
 *         - paymentDetails
 *       properties:
 *         contractDetails:
 *           type: object
 *           properties:
 *             packageLevel:
 *               type: string
 *               enum: [PLAN-1, PLAN-2]
 *             paymentFrequency:
 *               type: string
 *               enum: [MONTHLY, QUARTERLY, HALF-YEARLY, YEARLY]
 *             signedDate:
 *               type: string
 *               format: date
 *             agentContractId:
 *               type: string
 *             paypointContractId:
 *               type: string
 */

/**
 * @swagger
 * /api/zimnat-chema/application:
 *   post:
 *     summary: Create new Zimnat Chema Cash Plan application
 *     tags: [Zimnat Chema]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ZimnatChemaApplication'
 *     responses:
 *       200:
 *         description: Application created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/api/zimnat-chema/application',
  authenticateZimnat,
  zimnatChemaValidationRules.createApplication,
  zimnatChemaValidationRules.validateIdByType(),
  handleValidationErrors,
  ZimnatChemaController.createApplication
);

/**
 * @swagger
 * /api/zimnat-chema/modify:
 *   put:
 *     summary: Modify existing Zimnat Chema policy
 *     tags: [Zimnat Chema]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractDetails
 *             properties:
 *               contractDetails:
 *                 type: object
 *                 properties:
 *                   contractId:
 *                     type: string
 *                   effectiveDate:
 *                     type: string
 *                     format: date
 *                   packageLevel:
 *                     type: string
 *                     enum: [PLAN-1, PLAN-2]
 *                   paymentFrequency:
 *                     type: string
 *                     enum: [MONTHLY, QUARTERLY, HALF-YEARLY, YEARLY]
 *     responses:
 *       200:
 *         description: Policy modified successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Policy not found
 *       500:
 *         description: Internal server error
 */
router.put('/api/zimnat-chema/modify',
  authenticateZimnat,
  zimnatChemaValidationRules.modifyPolicy,
  handleValidationErrors,
  ZimnatChemaController.modifyPolicy
);

/**
 * @swagger
 * /api/zimnat-chema/status-update:
 *   put:
 *     summary: Update Zimnat Chema policy status
 *     tags: [Zimnat Chema]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractDetails
 *               - newContractStatus
 *             properties:
 *               contractDetails:
 *                 type: object
 *                 properties:
 *                   contractId:
 *                     type: string
 *               newContractStatus:
 *                 type: object
 *                 properties:
 *                   effectiveDate:
 *                     type: string
 *                     format: date
 *                   contractStatus:
 *                     type: string
 *                     enum: [INACTIVE, ACTIVE]
 *                   contractStatusReason:
 *                     type: string
 *                     enum: [ACTIVE, CANCELLED, DECLINED, FRAUD, REINSTATED]
 *                   contractStatusDescription:
 *                     type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Validation error or invalid status transition
 *       404:
 *         description: Policy not found
 *       500:
 *         description: Internal server error
 */
router.put('/api/zimnat-chema/status-update',
  authenticateZimnat,
  zimnatChemaValidationRules.updateStatus,
  handleValidationErrors,
  ZimnatChemaController.updateStatus
);

/**
 * @swagger
 * /api/zimnat-chema/policy/{contractId}:
 *   get:
 *     summary: Get Zimnat Chema policy details by contract ID
 *     tags: [Zimnat Chema]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID of the policy
 *     responses:
 *       200:
 *         description: Policy details retrieved successfully
 *       404:
 *         description: Policy not found
 *       500:
 *         description: Internal server error
 */
router.get('/api/zimnat-chema/policy/:contractId',
  authenticateZimnat,
  zimnatChemaValidationRules.getPolicyDetails,
  handleValidationErrors,
  ZimnatChemaController.getPolicyDetails
);

/**
 * @swagger
 * /api/zimnat-chema/packages:
 *   get:
 *     summary: Get available Zimnat Chema packages
 *     tags: [Zimnat Chema]
 *     responses:
 *       200:
 *         description: Packages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: string
 *                     totalPackages:
 *                       type: integer
 *                     packages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           packageLevel:
 *                             type: string
 *                           packageName:
 *                             type: string
 *                           description:
 *                             type: string
 *                           benefits:
 *                             type: array
 *                             items:
 *                               type: string
 *                           premiumRates:
 *                             type: object
 *                           eligibility:
 *                             type: object
 *       500:
 *         description: Internal server error
 */
router.get('/api/zimnat-chema/packages',
  ZimnatChemaController.getPackages
);

/**
 * @swagger
 * /api/zimnat-chema/calculate-premium:
 *   post:
 *     summary: Calculate premium for Zimnat Chema policy
 *     tags: [Zimnat Chema]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageLevel
 *               - paymentFrequency
 *             properties:
 *               packageLevel:
 *                 type: string
 *                 enum: [PLAN-1, PLAN-2]
 *               paymentFrequency:
 *                 type: string
 *                 enum: [MONTHLY, QUARTERLY, HALF-YEARLY, YEARLY]
 *               customerData:
 *                 type: object
 *                 properties:
 *                   age:
 *                     type: integer
 *                     minimum: 18
 *                     maximum: 65
 *                   gender:
 *                     type: string
 *                     enum: [MALE, FEMALE]
 *     responses:
 *       200:
 *         description: Premium calculated successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/api/zimnat-chema/calculate-premium',
  authenticateZimnat,
  zimnatChemaValidationRules.calculatePremium,
  handleValidationErrors,
  ZimnatChemaController.calculatePremium
);

/**
 * @swagger
 * /api/zimnat-chema/health:
 *   get:
 *     summary: Health check for Zimnat Chema service
 *     tags: [Zimnat Chema]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: string
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     version:
 *                       type: string
 *                     externalConnections:
 *                       type: object
 *       500:
 *         description: Service is unhealthy
 */
router.get('/api/zimnat-chema/health',
  ZimnatChemaController.healthCheck
);

// Additional utility routes

/**
 * @swagger
 * /api/zimnat-chema/policies/search:
 *   get:
 *     summary: Search Zimnat Chema policies by various criteria
 *     tags: [Zimnat Chema]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: contractId
 *         schema:
 *           type: string
 *         description: Filter by contract ID
 *       - in: query
 *         name: packageLevel
 *         schema:
 *           type: string
 *           enum: [PLAN-1, PLAN-2]
 *         description: Filter by package level
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, CANCELLED]
 *         description: Filter by policy status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: customerName
 *         schema:
 *           type: string
 *         description: Filter by customer name
 *       - in: query
 *         name: effectiveDateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by effective date from
 *       - in: query
 *         name: effectiveDateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by effective date to
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Policies retrieved successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.get('/api/zimnat-chema/policies/search',
  authenticateZimnat,
  zimnatChemaValidationRules.searchPolicies,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const searchCriteria = {
        contractId: req.query.contractId,
        packageLevel: req.query.packageLevel,
        status: req.query.status,
        customerId: req.query.customerId,
        customerName: req.query.customerName,
        effectiveDateFrom: req.query.effectiveDateFrom,
        effectiveDateTo: req.query.effectiveDateTo,
        limit: parseInt(req.query.limit) || 10,
        offset: parseInt(req.query.offset) || 0
      };

      const ZimnatChemaModel = require('../models/zimnatChemaModel');
      const policies = await ZimnatChemaModel.searchPolicies(searchCriteria);

      res.json({
        success: true,
        data: {
          policies,
          searchCriteria,
          totalResults: policies.length,
          hasMore: policies.length === searchCriteria.limit
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/zimnat-chema/policy/{contractId}/history:
 *   get:
 *     summary: Get modification history for a Zimnat Chema policy
 *     tags: [Zimnat Chema]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID of the policy
 *     responses:
 *       200:
 *         description: Modification history retrieved successfully
 *       404:
 *         description: Policy not found
 *       500:
 *         description: Internal server error
 */
router.get('/api/zimnat-chema/policy/:contractId/history',
  authenticateZimnat,
  zimnatChemaValidationRules.getPolicyDetails,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { contractId } = req.params;
      const ZimnatChemaModel = require('../models/zimnatChemaModel');
      
      const [modifications, statusChanges] = await Promise.all([
        ZimnatChemaModel.getModificationHistory(contractId),
        ZimnatChemaModel.getStatusHistory(contractId)
      ]);

      res.json({
        success: true,
        data: {
          contractId,
          modifications,
          statusChanges,
          totalModifications: modifications.length,
          totalStatusChanges: statusChanges.length
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/zimnat-chema/statistics:
 *   get:
 *     summary: Get premium statistics for Zimnat Chema policies
 *     tags: [Zimnat Chema]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: packageLevel
 *         schema:
 *           type: string
 *           enum: [PLAN-1, PLAN-2]
 *         description: Filter statistics by package level
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/api/zimnat-chema/statistics',
  authenticateZimnat,
  async (req, res, next) => {
    try {
      const { packageLevel } = req.query;
      const ZimnatChemaModel = require('../models/zimnatChemaModel');
      
      const statistics = await ZimnatChemaModel.getPremiumStatistics(packageLevel);

      res.json({
        success: true,
        data: {
          packageLevel: packageLevel || 'ALL',
          statistics,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;