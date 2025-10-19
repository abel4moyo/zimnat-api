


// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();

// Try to load the controller
let ProductController;
try {
  ProductController = require('../controllers/productController');
} catch (error) {
  console.warn('ProductController not available:', error.message);
  
  // Fallback controller
  ProductController = {
    getProducts: async (req, res) => {
      res.json({
        success: true,
        data: [
          {
            product_id: 'PA',
            product_name: 'Personal Accident',
            product_category: 'accident',
            rating_type: 'FLAT_RATE',
            status: 'ACTIVE'
          },
          {
            product_id: 'HCP',
            product_name: 'Hospital Cash Plan',
            product_category: 'health',
            rating_type: 'FLAT_RATE',
            status: 'ACTIVE'
          },
          {
            product_id: 'DOMESTIC',
            product_name: 'Domestic Insurance',
            product_category: 'property',
            rating_type: 'PERCENTAGE',
            status: 'ACTIVE'
          }
        ],
        meta: { count: 3, source: 'fallback' }
      });
    },
    
    getProductById: async (req, res) => {
      const { productId } = req.params;
      res.json({
        success: true,
        data: {
          product_id: productId,
          product_name: `${productId} Product`,
          status: 'ACTIVE'
        }
      });
    }
  };
}

// Product routes
router.get('/products', ProductController.getProducts);
router.get('/products/:productId', ProductController.getProductById);

// Optional category route
if (ProductController.getProductsByCategory) {
  router.get('/products/category/:category', ProductController.getProductsByCategory);
}

module.exports = router;