/**
 * ===================================================================
 * ZIMNAT API v2.1 - Enum/Reference Data Routes
 * File: src/routes/enumRoutes.js
 * ===================================================================
 *
 * Routes for enumeration and reference data endpoints
 */

const express = require('express');
const router = express.Router();
const EnumController = require('../controllers/enumController');
const { validateJWT } = require('../middleware/jwtMiddleware');

/**
 * GET /api/v1/enums
 * Get all enumeration data
 */
router.get('/api/v1/enums', validateJWT, EnumController.getAllEnums);

/**
 * GET /api/v1/enums/:type
 * Get specific enumeration type
 * Valid types: vehicleTypes, paymentMethods, insuranceTypes, deliveryMethods,
 *              taxClasses, clientIdTypes, radioTvUsage, frequencies,
 *              suburbsTowns, insuranceCompanies
 */
router.get('/api/v1/enums/:type', validateJWT, EnumController.getEnumByType);

/**
 * Specific enum endpoints (optional - can use generic endpoint above)
 */
router.get('/api/v1/enums/vehicleTypes', validateJWT, EnumController.getVehicleTypes);
router.get('/api/v1/enums/paymentMethods', validateJWT, EnumController.getPaymentMethods);
router.get('/api/v1/enums/insuranceTypes', validateJWT, EnumController.getInsuranceTypes);
router.get('/api/v1/enums/taxClasses', validateJWT, EnumController.getTaxClasses);
router.get('/api/v1/enums/suburbsTowns', validateJWT, EnumController.getSuburbsTowns);

module.exports = router;
