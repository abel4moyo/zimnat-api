// =============================================================================
// PERSONAL ACCIDENT INSURANCE - COMPLETE IMPLEMENTATION
// =============================================================================

// FILE 1: src/models/personalAccidentModel.js
// =============================================================================
const { pool } = require('../db');
const logger = require('../utils/logger');

class PersonalAccidentModel {
  // Get all PA packages from seeded data
  static async getAllPackages() {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            rp.package_id,
            rp.package_name,
            rp.rate,
            rp.currency,
            prod.product_name,
            prod.rating_type,
            pb.benefit_type,
            pb.benefit_description
          FROM rating_packages rp
          JOIN rating_products prod ON rp.product_id = prod.product_id
          LEFT JOIN package_benefits pb ON rp.package_id = pb.package_id
          WHERE prod.product_id = 'PA' AND prod.status = 'ACTIVE'
          ORDER BY rp.rate ASC
        `);
        
        // Group benefits by package
        const packagesMap = new Map();
        
        result.rows.forEach(row => {
          if (!packagesMap.has(row.package_id)) {
            packagesMap.set(row.package_id, {
              packageId: row.package_id,
              packageName: row.package_name,
              rate: parseFloat(row.rate),
              currency: row.currency,
              productName: row.product_name,
              ratingType: row.rating_type,
              benefits: []
            });
          }
          
          if (row.benefit_type) {
            packagesMap.get(row.package_id).benefits.push({
              type: row.benefit_type,
              description: row.benefit_description
            });
          }
        });
        
        return Array.from(packagesMap.values());
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error fetching PA packages:', error);
      throw error;
    }
  }

  // Get specific package details
  static async getPackageById(packageId) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            rp.package_id,
            rp.package_name,
            rp.rate,
            rp.currency,
            prod.product_name,
            prod.rating_type,
            prod.description as product_description
          FROM rating_packages rp
          JOIN rating_products prod ON rp.product_id = prod.product_id
          WHERE rp.package_id = $1 AND prod.product_id = 'PA'
        `, [packageId]);
        
        if (result.rows.length === 0) {
          return null;
        }
        
        const packageData = result.rows[0];
        
        // Get benefits
        const benefitsResult = await client.query(`
          SELECT benefit_type, benefit_description 
          FROM package_benefits 
          WHERE package_id = $1
        `, [packageId]);
        
        return {
          packageId: packageData.package_id,
          packageName: packageData.package_name,
          rate: parseFloat(packageData.rate),
          currency: packageData.currency,
          productName: packageData.product_name,
          ratingType: packageData.rating_type,
          productDescription: packageData.product_description,
          benefits: benefitsResult.rows.map(row => ({
            type: row.benefit_type,
            description: row.benefit_description
          }))
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error fetching PA package by ID:', error);
      throw error;
    }
  }

  // Save quote to database
  static async saveQuote(quoteData) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          INSERT INTO quotes (
            quote_number, product_type, package_id, customer_data, 
            premium_calculation, quote_status, valid_until, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          quoteData.quoteNumber,
          'PERSONAL_ACCIDENT',
          quoteData.packageId,
          JSON.stringify(quoteData.customerData),
          JSON.stringify(quoteData.premiumCalculation),
          'ACTIVE',
          quoteData.validUntil,
          new Date()
        ]);
        
        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error saving PA quote:', error);
      throw error;
    }
  }

  // Get quote by ID
  static async getQuoteById(quoteNumber) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT * FROM quotes 
          WHERE quote_number = $1 AND product_type = 'PERSONAL_ACCIDENT'
        `, [quoteNumber]);
        
        if (result.rows.length === 0) {
          return null;
        }
        
        const quote = result.rows[0];
        return {
          ...quote,
          customer_data: JSON.parse(quote.customer_data),
          premium_calculation: JSON.parse(quote.premium_calculation)
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error fetching PA quote:', error);
      throw error;
    }
  }
}

module.exports = PersonalAccidentModel;