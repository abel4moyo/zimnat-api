/**
 * ===================================================================
 * ZIMNAT API v2.1 - Motor Quote Routes
 * File: src/routes/motorQuoteRoutes.js
 * ===================================================================
 *
 * Routes for motor insurance and license quote endpoints
 */

const express = require('express');
const router = express.Router();
const MotorQuoteController = require('../controllers/motorQuoteController');
const { validateJWT } = require('../middleware/jwtMiddleware');
const { validateRequestId } = require('../middleware/requestIdMiddleware');

// Apply middleware to all routes
router.use(validateRequestId);
router.use(validateJWT);

/**
 * POST /api/motor/quote/insurance
 * Create insurance quote
 */
router.post('/api/motor/quote/insurance', MotorQuoteController.createInsuranceQuote);

/**
 * POST /api/motor/quote/licence
 * Create license quote
 */
router.post('/api/motor/quote/licence', MotorQuoteController.createLicenseQuote);

/**
 * POST /api/motor/quote/combined
 * Create combined insurance and license quote
 */
router.post('/api/motor/quote/combined', MotorQuoteController.createCombinedQuote);

/**
 * POST /api/motor/quote/update/insurance
 * Update insurance quote
 */
router.post('/api/motor/quote/update/insurance', MotorQuoteController.updateInsuranceQuote);

/**
 * POST /api/motor/quote/status/insurance
 * Get quote status
 */
router.post('/api/motor/quote/status/insurance', MotorQuoteController.getQuoteStatus);

module.exports = router;
