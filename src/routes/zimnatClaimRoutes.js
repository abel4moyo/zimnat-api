/*const express = require('express');
const router = express.Router();
const zimnatClaimController = require('../controllers/zimnatClaimController');
const authenticateZimnat = require('../middleware/authenticateZimnat');

router.post('/api/pure/claimNumber',
  authenticateZimnat,
  zimnatClaimController.processClaimNumber
);

module.exports = router; */ 


const express = require('express');
const router = express.Router();
const ZimnatClaimController = require('../controllers/zimnatClaimController');
const authenticateZimnat = require('../middleware/authenticateZimnat');
const { body, param } = require('express-validator');

router.post('/api/pure/claimNumber',
  authenticateZimnat,
  [
    body('claimNumber').notEmpty().withMessage('Claim number is required'),
    body('policyNumber').optional(),
    body('claimDetails').isObject().withMessage('Claim details are required')
  ],
  ZimnatClaimController.processClaimNumber
);

router.get('/api/v1/claims/:claimNumber',
  authenticateZimnat,
  [
    param('claimNumber').notEmpty().withMessage('Claim number is required')
  ],
  ZimnatClaimController.getClaimDetails
);

router.post('/api/v1/claims/:claimNumber/update',
  authenticateZimnat,
  [
    param('claimNumber').notEmpty().withMessage('Claim number is required'),
    body('status').isIn(['PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'PAID']).withMessage('Invalid status'),
    body('updateDetails').isObject().withMessage('Update details are required')
  ],
  ZimnatClaimController.updateClaimStatus
);

module.exports = router;