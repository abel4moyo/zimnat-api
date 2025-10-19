const express = require('express');
const router = express.Router();
const authenticatePartner = require('../middleware/authenticatePartner');
const TransactionModel = require('../models/transactionModel');
const CustomerModel = require('../models/customerModel');
const PolicyModel = require('../models/policyModel');
const logger = require('../utils/logger');

router.get('/api/v1/metrics', authenticatePartner, async (req, res, next) => {
  try {
    const partnerId = req.partner.id;
    
    // Get basic metrics for this partner
    const totalTransactions = await TransactionModel.countByPartner(partnerId);
    const totalRevenue = await TransactionModel.sumRevenueByPartner(partnerId);
    const totalCustomers = await CustomerModel.countByPartner(partnerId);
    const activePolicies = await PolicyModel.countActiveByPartner(partnerId);
    
    // Get recent transaction stats
    const recentTransactions = await TransactionModel.findRecent(partnerId, 10);
    
    res.json({
      success: true,
      data: {
        summary: {
          totalTransactions,
          totalRevenue,
          totalCustomers,
          activePolicies
        },
        recentTransactions
      }
    });
  } catch (error) {
    logger.error('Metrics retrieval failed', { 
      error: error.message, 
      stack: error.stack, 
      partnerId: req.partner.id 
    });
    next({ 
      status: 500, 
      message: 'Failed to retrieve metrics', 
      code: 'METRICS_RETRIEVAL_FAILED' 
    });
  }
});

module.exports = router;