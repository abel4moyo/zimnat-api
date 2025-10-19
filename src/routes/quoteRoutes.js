const express = require('express');
const router = express.Router();
// src/routes/quoteRoutes.js
// POST /api/v1/quote/generate - EXACT specification
router.post('/generate', async (req, res) => {
  try {
    const quote = await QuoteService.generateQuote(req.body);
    
    res.json({
      status: 'SUCCESS',
      data: quote
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      errorCode: 'QUOTE_GENERATION_FAILED',
      errorMessage: 'An error occurred while generating quote',
      details: error.message
    });
  }
});