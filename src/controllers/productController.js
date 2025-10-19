
const ProductModel = require('../models/productModel');
const logger = require('../utils/logger');

class ProductController {
  
  /**
   * Get all products
   */
  static async getProducts(req, res, next) {
    try {
      const includePackages = req.query.includePackages === 'true';
      
      let products;
      if (includePackages) {
        products = await ProductModel.findAllWithPackages();
      } else {
        products = await ProductModel.findAll();
      }
      
      logger.info('Products retrieved', { 
        count: products.length,
        includePackages 
      });
      
      res.json({ 
        success: true, 
        data: products,
        meta: {
          count: products.length,
          includePackages
        }
      });
      
    } catch (error) {
      logger.error('Products retrieval failed', { 
        error: error.message, 
        stack: error.stack 
      });
      
      next({ 
        status: 500, 
        message: 'Failed to retrieve products', 
        code: 'PRODUCTS_RETRIEVAL_FAILED' 
      });
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(req, res, next) {
    try {
      const { productId } = req.params;
      const includePackages = req.query.includePackages === 'true';
      
      let product;
      if (includePackages) {
        product = await ProductModel.findByIdWithPackages(productId);
      } else {
        product = await ProductModel.findById(productId);
      }
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
          code: 'PRODUCT_NOT_FOUND'
        });
      }
      
      res.json({ 
        success: true, 
        data: product 
      });
      
    } catch (error) {
      logger.error('Product retrieval failed', { 
        error: error.message, 
        productId: req.params.productId 
      });
      
      next({ 
        status: 500, 
        message: 'Failed to retrieve product', 
        code: 'PRODUCT_RETRIEVAL_FAILED' 
      });
    }
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const products = await ProductModel.findByCategory(category);
      
      res.json({ 
        success: true, 
        data: products,
        meta: {
          category,
          count: products.length
        }
      });
      
    } catch (error) {
      logger.error('Products by category retrieval failed', { 
        error: error.message, 
        category: req.params.category 
      });
      
      next({ 
        status: 500, 
        message: 'Failed to retrieve products by category', 
        code: 'PRODUCTS_CATEGORY_RETRIEVAL_FAILED' 
      });
    }
  }
}

module.exports = ProductController;