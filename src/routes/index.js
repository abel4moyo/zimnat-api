const express = require('express');
const router = express.Router();

// Import route modules
const healthRoutes = require('./healthRoutes');
const customerRoutes = require('./customerRoutes');
const transactionRoutes = require('./transactionRoutes');
const paymentRoutes = require('./paymentRoutes');
const productRoutes = require('./productRoutes');
const partnerRoutes = require('./partnerRoutes');
const adminRoutes = require('./adminRoutes');
const metricsRoutes = require('./metricsRoutes');
const policyRoutes = require('./policyRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const swaggerRoutes = require('./swaggerRoutes');

// Zimnat-specific routes
const zimnatRoutes = require('./zimnatRoutes');
const zimnatV2Routes = require('./zimnatV2Routes');
const zimnatClaimRoutes = require('./zimnatClaimRoutes');
const zimnatIcecashRoutes = require('./zimnatIcecashRoutes');
const zimnatAuthRoutes = require('./zimnatAuthRoutes');
const zimnatChemaRoutes = require('./zimnatChemaRoutes');

// Product-specific routes
const personalAccidentRoutes = require('./personalAccidentRoutes');
const motorInsuranceRoutes = require('./motorInsuranceRoutes');
const domesticRoutes = require('./domesticRoutes');
const hcpRoutes = require('./hcpRoutes');
const quoteRoutes = require('./quoteRoutes');

const apiDocsRouter = require('./apiDocsRoutes'); // if separate file

// Mount routes
router.use('/', healthRoutes);
router.use('/', dashboardRoutes);
router.use('/', customerRoutes);
router.use('/', transactionRoutes);
router.use('/', paymentRoutes);
router.use('/', productRoutes);
router.use('/', partnerRoutes);
router.use('/', adminRoutes);
router.use('/', metricsRoutes);
router.use('/', policyRoutes);

// Mount product-specific routes
router.use('/', personalAccidentRoutes);
router.use('/', motorInsuranceRoutes);
router.use('/', domesticRoutes);
router.use('/', hcpRoutes);
router.use('/', quoteRoutes);

// Mount Zimnat routes
router.use('/', zimnatRoutes);
router.use('/', zimnatV2Routes);
router.use('/', zimnatClaimRoutes);
router.use('/', zimnatIcecashRoutes);
router.use('/', zimnatAuthRoutes);
router.use('/', zimnatChemaRoutes);

// Mount documentation routes
router.use('/', swaggerRoutes);
router.use('/', apiDocsRouter);
module.exports = router;