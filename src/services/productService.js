const productModel = require('../models/productModel');
const logger = require('../utils/logger');

class ProductService {
  static async getAllProducts() {
    try {
      const products = await productModel.findAllWithCategoriesAndPartners();
      
      // Group products by category for better organization
      const categorizedProducts = products.reduce((acc, product) => {
        const categoryKey = product.category_code;
        
        if (!acc[categoryKey]) {
          acc[categoryKey] = {
            category_code: product.category_code,
            category_name: product.category_name,
            products: []
          };
        }
        
        acc[categoryKey].products.push(product);
        return acc;
      }, {});

      return Object.values(categorizedProducts);

    } catch (error) {
      logger.error('Error getting all products', error);
      throw error;
    }
  }

  static async createProduct(productData) {
    try {
      const product = await productModel.create(productData);

      logger.info('Product created', {
        productId: product.id,
        productCode: product.product_code,
        productName: product.product_name
      });

      return product;

    } catch (error) {
      logger.error('Error creating product', error);
      throw error;
    }
  }

  static async getProductByCode(productCode) {
    try {
      const product = await productModel.findByCode(productCode);
      
      if (!product) {
        throw {
          status: 404,
          message: 'Product not found',
          code: 'PRODUCT_NOT_FOUND'
        };
      }

      return product;

    } catch (error) {
      logger.error('Error getting product by code', error);
      throw error;
    }
  }
}

module.exports = ProductService;
