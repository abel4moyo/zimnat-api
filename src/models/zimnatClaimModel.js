

const logger = require('../utils/logger');

// Try to load database
let pool;
try {
  const db = require('../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for zimnat claim model');
}

class ZimnatClaimModel {
  static async create(claimData) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(`
            INSERT INTO zimnat_claims 
            (claim_number, policy_number, status, claim_details, reference_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [
            claimData.claim_number,
            claimData.policy_number,
            claimData.status || 'PENDING',
            JSON.stringify(claimData.claim_details || {}),
            claimData.reference_id
          ]);
          return result.rows;
        } finally {
          client.release();
        }
      } else {
        // Fallback creation
        return [{
          id: Date.now(),
          ...claimData,
          status: claimData.status || 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }];
      }
    } catch (error) {
      logger.error('Zimnat claim creation error:', error);
      throw error;
    }
  }

  static async findByClaimNumber(claimNumber) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT * FROM zimnat_claims WHERE claim_number = $1',
            [claimNumber]
          );
          return result.rows[0] || null;
        } finally {
          client.release();
        }
      } else {
        // Fallback claim data
        return {
          id: 1,
          claim_number: claimNumber,
          policy_number: 'POL-123456',
          status: 'PENDING',
          claim_details: {},
          reference_id: `CLAIM-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('Zimnat claim lookup error:', error);
      throw error;
    }
  }

  static async updateStatus(claimId, status, metadata = {}) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(`
            UPDATE zimnat_claims 
            SET status = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
          `, [status, JSON.stringify(metadata), claimId]);
          return result.rows;
        } finally {
          client.release();
        }
      } else {
        // Fallback update
        return [{
          id: claimId,
          status: status,
          metadata: metadata,
          updated_at: new Date().toISOString()
        }];
      }
    } catch (error) {
      logger.error('Zimnat claim update error:', error);
      throw error;
    }
  }

  static async findByPolicyNumber(policyNumber) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT * FROM zimnat_claims WHERE policy_number = $1 ORDER BY created_at DESC',
            [policyNumber]
          );
          return result.rows;
        } finally {
          client.release();
        }
      } else {
        // Fallback policy claims
        return [{
          id: 1,
          claim_number: 'CLM-001-DEMO',
          policy_number: policyNumber,
          status: 'PENDING',
          claim_details: {},
          created_at: new Date().toISOString()
        }];
      }
    } catch (error) {
      logger.error('Zimnat claim policy lookup error:', error);
      throw error;
    }
  }

  static async findRecent(limit = 50) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT * FROM zimnat_claims ORDER BY created_at DESC LIMIT $1',
            [limit]
          );
          return result.rows;
        } finally {
          client.release();
        }
      } else {
        // Fallback recent claims
        return [{
          id: 1,
          claim_number: 'CLM-001-DEMO',
          policy_number: 'POL-123456',
          status: 'PENDING',
          created_at: new Date().toISOString()
        }];
      }
    } catch (error) {
      logger.error('Zimnat claim recent lookup error:', error);
      return [];
    }
  }
}

module.exports = ZimnatClaimModel;