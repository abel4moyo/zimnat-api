

// src/models/productModel.js - Correct model based on actual FCB schema
const logger = require('../utils/logger');

// Try to load database pool
let pool;
try {
  const db = require('../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for product model');
}

class ProductModel {
  
  /**
   * Find all products with package information
   * @returns {Array} Array of products with packages
   */
  static async findAllWithPackages() {
    if (!pool) {
      // Fallback data if no database
      return [
        {
          product_id: 'PA',
          product_name: 'Personal Accident',
          product_category: 'accident',
          rating_type: 'FLAT_RATE',
          description: 'Personal accident insurance coverage',
          status: 'ACTIVE',
          packages: []
        },
        {
          product_id: 'HCP',
          product_name: 'Hospital Cash Plan',
          product_category: 'health',
          rating_type: 'FLAT_RATE',
          description: 'Hospital cash plan coverage',
          status: 'ACTIVE',
          packages: []
        },
        {
          product_id: 'DOMESTIC',
          product_name: 'Domestic Insurance',
          product_category: 'property',
          rating_type: 'PERCENTAGE',
          description: 'Domestic property insurance',
          status: 'ACTIVE',
          packages: []
        }
      ];
    }

    const client = await pool.connect();
    try {
      // Query products with their packages
      const query = `
        SELECT 
          p.*,
          COALESCE(
            json_agg(
              json_build_object(
                'package_id', pkg.package_id,
                'package_name', pkg.package_name,
                'rate', pkg.rate,
                'currency', pkg.currency,
                'minimum_premium', pkg.minimum_premium,
                'maximum_premium', pkg.maximum_premium,
                'description', pkg.description,
                'sort_order', pkg.sort_order,
                'is_active', pkg.is_active
              ) ORDER BY pkg.sort_order, pkg.package_name
            ) FILTER (WHERE pkg.package_id IS NOT NULL),
            '[]'::json
          ) as packages
        FROM fcb_products p
        LEFT JOIN fcb_packages pkg ON p.product_id = pkg.product_id AND pkg.is_active = true
        WHERE p.status = 'ACTIVE'
        GROUP BY p.product_id, p.product_name, p.product_category, p.rating_type, p.description, p.status, p.created_at, p.updated_at
        ORDER BY p.product_name;
      `;

      const result = await client.query(query);
      
      logger.debug('Products retrieved with packages', { 
        count: result.rows.length 
      });
      
      return result.rows;
      
    } catch (error) {
      logger.error('Error in findAllWithPackages', { 
        error: error.message, 
        stack: error.stack 
      });
      
      // Fallback to simple query without packages
      try {
        const simpleQuery = `
          SELECT 
            *,
            '[]'::json as packages
          FROM fcb_products
          WHERE status = 'ACTIVE'
          ORDER BY product_name;
        `;
        
        const simpleResult = await client.query(simpleQuery);
        return simpleResult.rows;
        
      } catch (fallbackError) {
        logger.error('Fallback query also failed', { error: fallbackError.message });
        throw error; // Throw original error
      }
    } finally {
      client.release();
    }
  }

  /**
   * Find all products (simple query)
   * @returns {Array} Array of products
   */
  static async findAll() {
    if (!pool) {
      return [
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
        }
      ];
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM fcb_products WHERE status = $1 ORDER BY product_name',
        ['ACTIVE']
      );
      
      logger.debug('Products retrieved', { count: result.rows.length });
      return result.rows;
      
    } catch (error) {
      logger.error('Error in findAll', { 
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find product by ID
   * @param {string} productId - Product ID
   * @returns {Object|null} Product object or null
   */
  static async findById(productId) {
    if (!pool) {
      const fallbackProducts = {
        'PA': {
          product_id: 'PA',
          product_name: 'Personal Accident',
          product_category: 'accident',
          rating_type: 'FLAT_RATE',
          status: 'ACTIVE'
        },
        'HCP': {
          product_id: 'HCP',
          product_name: 'Hospital Cash Plan',
          product_category: 'health',
          rating_type: 'FLAT_RATE',
          status: 'ACTIVE'
        }
      };
      return fallbackProducts[productId] || null;
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM fcb_products WHERE product_id = $1',
        [productId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } catch (error) {
      logger.error('Error in findById', { error: error.message, productId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find product with packages by ID
   * @param {string} productId - Product ID
   * @returns {Object|null} Product with packages or null
   */
  static async findByIdWithPackages(productId) {
    if (!pool) {
      return null;
    }

    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          p.*,
          COALESCE(
            json_agg(
              json_build_object(
                'package_id', pkg.package_id,
                'package_name', pkg.package_name,
                'rate', pkg.rate,
                'currency', pkg.currency,
                'minimum_premium', pkg.minimum_premium,
                'maximum_premium', pkg.maximum_premium,
                'description', pkg.description,
                'is_active', pkg.is_active
              ) ORDER BY pkg.sort_order, pkg.package_name
            ) FILTER (WHERE pkg.package_id IS NOT NULL),
            '[]'::json
          ) as packages
        FROM fcb_products p
        LEFT JOIN fcb_packages pkg ON p.product_id = pkg.product_id AND pkg.is_active = true
        WHERE p.product_id = $1
        GROUP BY p.product_id, p.product_name, p.product_category, p.rating_type, p.description, p.status, p.created_at, p.updated_at;
      `;

      const result = await client.query(query, [productId]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } catch (error) {
      logger.error('Error in findByIdWithPackages', { error: error.message, productId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get products by category
   * @param {string} category - Product category
   * @returns {Array} Array of products in category
   */
  static async findByCategory(category) {
    if (!pool) {
      return [];
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM fcb_products WHERE product_category = $1 AND status = $2 ORDER BY product_name',
        [category, 'ACTIVE']
      );
      
      return result.rows;
      
    } catch (error) {
      logger.error('Error in findByCategory', { error: error.message, category });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create new product
   * @param {Object} productData - Product data
   * @returns {Object} Created product
   */
  static async create(productData) {
    if (!pool) {
      throw new Error('Database not available for product creation');
    }

    const client = await pool.connect();
    try {
      const {
        product_id,
        product_name,
        product_category,
        rating_type = 'FLAT_RATE',
        description,
        status = 'ACTIVE'
      } = productData;

      const result = await client.query(`
        INSERT INTO fcb_products (
          product_id, product_name, product_category, 
          rating_type, description, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        product_id, product_name, product_category,
        rating_type, description, status
      ]);
      
      logger.info('Product created', { 
        product_id: result.rows[0].product_id, 
        product_name: result.rows[0].product_name 
      });
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error in create', { error: error.message, productData });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update product
   * @param {string} productId - Product ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated product
   */
  static async update(productId, updateData) {
    if (!pool) {
      throw new Error('Database not available for product update');
    }

    const client = await pool.connect();
    try {
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map((field, index) => 
        `${field} = $${index + 1}`
      ).join(', ');
      
      const updateQuery = `
        UPDATE fcb_products 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $${values.length + 1}
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [...values, productId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error in update', { error: error.message, productId, updateData });
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ProductModel;