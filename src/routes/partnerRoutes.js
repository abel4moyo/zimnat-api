const express = require('express');
const router = express.Router();
const PartnerController = require('../controllers/partnerController');

router.get('/partners', PartnerController.getPartners);

module.exports = router;