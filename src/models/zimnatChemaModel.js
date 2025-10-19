const { pool } = require('../db');
const logger = require('../utils/logger');

class ZimnatChemaModel {
  
  /**
   * Save new Chema application to database
   */
  static async saveApplication(applicationData) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          INSERT INTO zimnat_chema_policies (
            contract_id, zimnat_contract_id, package_level, payment_frequency,
            customer_data, beneficiaries, premium_calculation, payment_details,
            effective_date, expiry_date, status, zimnat_response, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `, [
          applicationData.contractId,
          applicationData.zimnatContractId,
          applicationData.packageLevel,
          applicationData.paymentFrequency,
          JSON.stringify(applicationData.customerData),
          JSON.stringify(applicationData.beneficiaries),
          JSON.stringify(applicationData.premiumCalculation),
          JSON.stringify(applicationData.paymentDetails),
          applicationData.effectiveDate,
          applicationData.expiryDate,
          applicationData.status,
          JSON.stringify(applicationData.zimnatResponse),
          new Date()
        ]);
        
        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error saving Zimnat Chema application:', error);
      throw error;
    }
  }

  /**
   * Get policy by contract ID
   */
  static async getPolicyByContractId(contractId) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT * FROM zimnat_chema_policies 
          WHERE contract_id = $1
        `, [contractId]);
        
        if (result.rows.length === 0) {
          return null;
        }
        
        const policy = result.rows[0];
        return {
          ...policy,
          customer_data: JSON.parse(policy.customer_data),
          beneficiaries: JSON.parse(policy.beneficiaries),
          premium_calculation: JSON.parse(policy.premium_calculation),
          payment_details: JSON.parse(policy.payment_details),
          zimnat_response: JSON.parse(policy.zimnat_response)
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error fetching Zimnat Chema policy by contract ID:', error);
      throw error;
    }
  }

  /**
   * Save policy modification
   */
  static async saveModification(modificationData) {
    try {
      const client = await pool.connect();
      try {
        // Insert modification record
        const modificationResult = await client.query(`
          INSERT INTO zimnat_chema_modifications (
            contract_id, modification_type, changes, effective_date,
            new_premium, zimnat_response, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          modificationData.contractId,
          modificationData.modificationType,
          JSON.stringify(modificationData.changes),
          modificationData.effectiveDate,
          modificationData.newPremium,
          JSON.stringify(modificationData.zimnatResponse),
          new Date()
        ]);

        // Update main policy record
        await client.query(`
          UPDATE zimnat_chema_policies 
          SET updated_at = $1,
              premium_calculation = COALESCE($2, premium_calculation)
          WHERE contract_id = $3
        `, [
          new Date(),
          modificationData.newPremium ? JSON.stringify({
            ...JSON.parse(await this.getPremiumCalculation(modificationData.contractId)),
            monthlyPremium: modificationData.newPremium
          }) : null,
          modificationData.contractId
        ]);
        
        return modificationResult.rows[0];
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error saving Zimnat Chema modification:', error);
      throw error;
    }
  }

  /**
   * Update policy status
   */
  static async updatePolicyStatus(contractId, newStatus, effectiveDate, statusReason) {
    try {
      const client = await pool.connect();
      try {
        // Insert status change record
        await client.query(`
          INSERT INTO zimnat_chema_status_changes (
            contract_id, previous_status, new_status, effective_date,
            status_reason, created_at
          ) 
          SELECT $1, status, $2, $3, $4, $5
          FROM zimnat_chema_policies 
          WHERE contract_id = $1
        `, [contractId, newStatus, effectiveDate, statusReason, new Date()]);

        // Update main policy record
        const result = await client.query(`
          UPDATE zimnat_chema_policies 
          SET status = $1, updated_at = $2
          WHERE contract_id = $3
          RETURNING *
        `, [newStatus, new Date(), contractId]);
        
        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error updating Zimnat Chema policy status:', error);
      throw error;
    }
  }

  /**
   * Get all policies for a customer
   */
  static async getPoliciesByCustomer(customerId) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            contract_id, package_level, payment_frequency, status,
            effective_date, expiry_date, created_at, updated_at
          FROM zimnat_chema_policies 
          WHERE customer_data->>'idNumber' = $1
          ORDER BY created_at DESC
        `, [customerId]);
        
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error fetching Zimnat Chema policies by customer:', error);
      throw error;
    }
  }

  /**
   * Get policy modifications history
   */
  static async getModificationHistory(contractId) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT * FROM zimnat_chema_modifications 
          WHERE contract_id = $1
          ORDER BY created_at DESC
        `, [contractId]);
        
        return result.rows.map(row => ({
          ...row,
          changes: JSON.parse(row.changes),
          zimnat_response: JSON.parse(row.zimnat_response)
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error fetching Zimnat Chema modification history:', error);
      throw error;
    }
  }

  /**
   * Get policy status history
   */
  static async getStatusHistory(contractId) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT * FROM zimnat_chema_status_changes 
          WHERE contract_id = $1
          ORDER BY created_at DESC
        `, [contractId]);
        
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error fetching Zimnat Chema status history:', error);
      throw error;
    }
  }

  /**
   * Search policies by various criteria
   */
  static async searchPolicies(searchCriteria) {
    try {
      const client = await pool.connect();
      try {
        let query = `
          SELECT 
            contract_id, package_level, payment_frequency, status,
            customer_data, effective_date, expiry_date, created_at
          FROM zimnat_chema_policies 
          WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Add search conditions
        if (searchCriteria.contractId) {
          query += ` AND contract_id = $${paramIndex}`;
          params.push(searchCriteria.contractId);
          paramIndex++;
        }

        if (searchCriteria.packageLevel) {
          query += ` AND package_level = $${paramIndex}`;
          params.push(searchCriteria.packageLevel);
          paramIndex++;
        }

        if (searchCriteria.status) {
          query += ` AND status = $${paramIndex}`;
          params.push(searchCriteria.status);
          paramIndex++;
        }

        if (searchCriteria.customerId) {
          query += ` AND customer_data->>'idNumber' = $${paramIndex}`;
          params.push(searchCriteria.customerId);
          paramIndex++;
        }

        if (searchCriteria.customerName) {
          query += ` AND (customer_data->>'firstNames' ILIKE $${paramIndex} OR customer_data->>'surname' ILIKE $${paramIndex})`;
          params.push(`%${searchCriteria.customerName}%`);
          paramIndex++;
        }

        if (searchCriteria.effectiveDateFrom) {
          query += ` AND effective_date >= $${paramIndex}`;
          params.push(searchCriteria.effectiveDateFrom);
          paramIndex++;
        }

        if (searchCriteria.effectiveDateTo) {
          query += ` AND effective_date <= $${paramIndex}`;
          params.push(searchCriteria.effectiveDateTo);
          paramIndex++;
        }

        // Add ordering and pagination
        query += ` ORDER BY created_at DESC`;
        
        if (searchCriteria.limit) {
          query += ` LIMIT $${paramIndex}`;
          params.push(searchCriteria.limit);
          paramIndex++;
        }

        if (searchCriteria.offset) {
          query += ` OFFSET $${paramIndex}`;
          params.push(searchCriteria.offset);
        }

        const result = await client.query(query, params);
        
        return result.rows.map(row => ({
          ...row,
          customer_data: JSON.parse(row.customer_data)
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error searching Zimnat Chema policies:', error);
      throw error;
    }
  }

  /**
   * Get premium calculation statistics
   */
  static async getPremiumStatistics(packageLevel = null) {
    try {
      const client = await pool.connect();
      try {
        let query = `
          SELECT 
            package_level,
            payment_frequency,
            COUNT(*) as policy_count,
            AVG((premium_calculation->>'monthlyPremium')::numeric) as avg_monthly_premium,
            MIN((premium_calculation->>'monthlyPremium')::numeric) as min_monthly_premium,
            MAX((premium_calculation->>'monthlyPremium')::numeric) as max_monthly_premium,
            SUM((premium_calculation->>'monthlyPremium')::numeric) as total_monthly_premium
          FROM zimnat_chema_policies 
          WHERE status = 'ACTIVE'
        `;
        const params = [];

        if (packageLevel) {
          query += ` AND package_level = $1`;
          params.push(packageLevel);
        }

        query += ` GROUP BY package_level, payment_frequency ORDER BY package_level, payment_frequency`;

        const result = await client.query(query, params);
        
        return result.rows.map(row => ({
          ...row,
          avg_monthly_premium: parseFloat(row.avg_monthly_premium),
          min_monthly_premium: parseFloat(row.min_monthly_premium),
          max_monthly_premium: parseFloat(row.max_monthly_premium),
          total_monthly_premium: parseFloat(row.total_monthly_premium)
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error fetching Zimnat Chema premium statistics:', error);
      throw error;
    }
  }

  /**
   * Health check - verify database connectivity
   */
  static async checkHealth() {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Zimnat Chema database health check failed:', error);
      return false;
    }
  }

  /**
   * Get premium calculation for a policy
   */
  static async getPremiumCalculation(contractId) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT premium_calculation FROM zimnat_chema_policies 
          WHERE contract_id = $1
        `, [contractId]);
        
        return result.rows.length > 0 ? result.rows[0].premium_calculation : null;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error fetching premium calculation:', error);
      throw error;
    }
  }

  /**
   * Initialize database tables (if needed)
   */
  static async initializeTables() {
    try {
      const client = await pool.connect();
      try {
        // Create main policies table
        await client.query(`
          CREATE TABLE IF NOT EXISTS zimnat_chema_policies (
            id SERIAL PRIMARY KEY,
            contract_id VARCHAR(50) UNIQUE NOT NULL,
            zimnat_contract_id VARCHAR(50),
            package_level VARCHAR(20) NOT NULL,
            payment_frequency VARCHAR(20) NOT NULL,
            customer_data JSONB NOT NULL,
            beneficiaries JSONB,
            premium_calculation JSONB NOT NULL,
            payment_details JSONB,
            effective_date TIMESTAMP NOT NULL,
            expiry_date TIMESTAMP NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            zimnat_response JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create modifications table
        await client.query(`
          CREATE TABLE IF NOT EXISTS zimnat_chema_modifications (
            id SERIAL PRIMARY KEY,
            contract_id VARCHAR(50) NOT NULL,
            modification_type VARCHAR(100) NOT NULL,
            changes JSONB NOT NULL,
            effective_date TIMESTAMP NOT NULL,
            new_premium NUMERIC(10,2),
            zimnat_response JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contract_id) REFERENCES zimnat_chema_policies(contract_id)
          )
        `);

        // Create status changes table
        await client.query(`
          CREATE TABLE IF NOT EXISTS zimnat_chema_status_changes (
            id SERIAL PRIMARY KEY,
            contract_id VARCHAR(50) NOT NULL,
            previous_status VARCHAR(20) NOT NULL,
            new_status VARCHAR(20) NOT NULL,
            effective_date TIMESTAMP NOT NULL,
            status_reason VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contract_id) REFERENCES zimnat_chema_policies(contract_id)
          )
        `);

        // Create indexes for better performance
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_zimnat_chema_contract_id 
          ON zimnat_chema_policies(contract_id)
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_zimnat_chema_customer_id 
          ON zimnat_chema_policies USING GIN ((customer_data->>'idNumber'))
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_zimnat_chema_status 
          ON zimnat_chema_policies(status)
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_zimnat_chema_package 
          ON zimnat_chema_policies(package_level)
        `);

        logger.info('Zimnat Chema database tables initialized successfully');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error initializing Zimnat Chema database tables:', error);
      throw error;
    }
  }
}

module.exports = ZimnatChemaModel;