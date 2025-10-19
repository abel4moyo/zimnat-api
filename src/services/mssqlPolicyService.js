// =============================================================================
// MSSQL POLICY SERVICE - Updated for Production Zimnat Server
// File: src/services/mssqlPolicyService.js
// Description: Service for connecting to production MSSQL database and fetching policy data
// Updated to support USD and ZIG currency databases with insurance type detection
// =============================================================================

const sql = require('mssql');
const logger = require('../utils/logger');

class MSSQLPolicyService {
  constructor() {
    this.config = {
      server: process.env.MSSQL_SERVER || '192.168.10.38',
      port: parseInt(process.env.MSSQL_PORT) || 1433,
      database: 'ZIMNATUSD', // Default database, can be switched
      user: process.env.MSSQL_USER || 'sa',
      password: process.env.MSSQL_PASSWORD || 'Zimnat123',
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT !== 'false',
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
    
    this.pools = {
      USD: null,
      ZIG: null
    };
    this.isConnected = {
      USD: false,
      ZIG: false
    };
  }

  /**
   * Initialize database connection pools for both USD and ZIG databases
   */
  async initialize(currency = 'USD') {
    try {
      const dbName = currency === 'ZIG' ? 'ZIMNATZIG' : 'ZIMNATUSD';
      
      if (this.pools[currency]) {
        await this.pools[currency].close();
      }

      const config = {
        ...this.config,
        database: dbName
      };

      this.pools[currency] = new sql.ConnectionPool(config);
      
      this.pools[currency].on('error', (err) => {
        logger.error(`MSSQL Pool Error (${currency})`, { error: err.message });
        this.isConnected[currency] = false;
      });

      await this.pools[currency].connect();
      this.isConnected[currency] = true;
      
      logger.info('MSSQL Policy Service initialized successfully', {
        server: this.config.server,
        database: dbName,
        currency
      });

      return true;
    } catch (error) {
      logger.error(`Failed to initialize MSSQL Policy Service (${currency})`, {
        error: error.message,
        stack: error.stack
      });
      this.isConnected[currency] = false;
      return false;
    }
  }

  /**
   * Initialize both USD and ZIG database connections
   */
  async initializeBoth() {
    const results = await Promise.allSettled([
      this.initialize('USD'),
      this.initialize('ZIG')
    ]);
    
    return {
      USD: results[0].status === 'fulfilled' ? results[0].value : false,
      ZIG: results[1].status === 'fulfilled' ? results[1].value : false
    };
  }

  /**
   * Test database connectivity for specified currency
   */
  async healthCheck(currency = 'USD') {
    try {
      if (!this.isConnected[currency] || !this.pools[currency]) {
        throw new Error(`Database not connected for ${currency}`);
      }

      const request = this.pools[currency].request();
      const result = await request.query('SELECT 1 as test, GETDATE() as timestamp');
      
      return {
        status: 'healthy',
        connected: true,
        currency,
        database: currency === 'ZIG' ? 'ZIMNATZIG' : 'ZIMNATUSD',
        timestamp: result.recordset[0].timestamp
      };
    } catch (error) {
      logger.error(`MSSQL Policy Service health check failed (${currency})`, { error: error.message });
      return {
        status: 'unhealthy',
        connected: false,
        currency,
        error: error.message
      };
    }
  }

  /**
   * Health check for both databases
   */
  async healthCheckBoth() {
    const [usdHealth, zigHealth] = await Promise.allSettled([
      this.healthCheck('USD'),
      this.healthCheck('ZIG')
    ]);

    return {
      USD: usdHealth.status === 'fulfilled' ? usdHealth.value : { status: 'error', error: usdHealth.reason?.message },
      ZIG: zigHealth.status === 'fulfilled' ? zigHealth.value : { status: 'error', error: zigHealth.reason?.message }
    };
  }

  /**
   * Search policies in specified currency database with insurance type
   */
  async searchPolicies(policyNumber, currency = 'USD', insuranceType = null) {
    try {
      // Ensure connection to the requested database
      if (!this.isConnected[currency]) {
        await this.initialize(currency);
      }

      if (!this.isConnected[currency] || !this.pools[currency]) {
        throw new Error(`Database not connected for ${currency}`);
      }

      const viewName = currency === 'USD' ? 'VClient_LookUP_USD' : 'VClient_LookUP_ZIG';
      const request = this.pools[currency].request();
      
      let query = `
        SELECT TOP 100
          insurance_ref,
          resolved_name,
          product_category,
          description,
          Status,
          GROSS_PREMIUM,
          SUM_INSURED,
          cover_start_date,
          expiry_date,
          mobile,
          agent_shortname,
          alternative_identifier
        FROM ${viewName}
        WHERE 1=1
      `;

      let whereConditions = [];

      if (policyNumber) {
        whereConditions.push('insurance_ref = @policyNumber');
        request.input('policyNumber', sql.VarChar(50), policyNumber.toString().trim());
      }

      if (insuranceType && ['Life', 'General'].includes(insuranceType)) {
        // Map insurance types to product categories
        const categoryMap = {
          'Life': 'Life',
          'General': 'Accident and Health'
        };
        const mappedCategory = categoryMap[insuranceType] || insuranceType;
        whereConditions.push('product_category LIKE @insuranceType');
        request.input('insuranceType', sql.VarChar(50), `%${mappedCategory}%`);
      }

      if (whereConditions.length > 0) {
        query += ' AND ' + whereConditions.join(' AND ');
      }

      query += ' ORDER BY insurance_ref';

      logger.info('Executing policy search query', { 
        policyNumber,
        currency,
        insuranceType,
        viewName
      });

      const result = await request.query(query);
      
      // Transform the results to match the required format using actual column names
      const transformedPolicies = result.recordset.map(policy => {
        // Extract insurance type from product_category
        let insuranceType = 'General';
        if (policy.product_category && policy.product_category.toLowerCase().includes('life')) {
          insuranceType = 'Life';
        }
        
        return {
          policy_number: policy.insurance_ref ? policy.insurance_ref.trim() : 'N/A',
          policy_holder_name: policy.resolved_name ? policy.resolved_name.trim() : 'Unknown',
          product_id: policy.alternative_identifier ? policy.alternative_identifier.trim() || 'N/A' : 'N/A',
          product_name: policy.product_category || 'Unknown Product',
          product_category: policy.product_category || 'GENERAL',
          rating_type: 'FLAT_RATE',
          product_description: policy.description || 'N/A',
          policy_status: policy.Status || 'UNKNOWN',
          package_name: policy.description || '',
          package_premium: policy.GROSS_PREMIUM ? policy.GROSS_PREMIUM.toString() : '0.00',
          package_term: '',
          package_cover_value: policy.SUM_INSURED ? policy.SUM_INSURED.toString() : '0.00',
          insurance_type: insuranceType,
          currency: currency,
          database: currency === 'USD' ? 'ZIMNATUSD' : 'ZIMNATZIG',
          cover_start_date: policy.cover_start_date,
          expiry_date: policy.expiry_date,
          mobile: policy.mobile,
          agent: policy.agent_shortname
        };
      });
      
      logger.info('Policy search completed', { 
        recordsFound: result.recordset.length,
        currency,
        policyNumber
      });

      return {
        success: true,
        policies: transformedPolicies,
        totalFound: result.recordset.length,
        currency,
        database: currency === 'USD' ? 'ZIMNATUSD' : 'ZIMNATZIG',
        searchCriteria: { policyNumber, currency, insuranceType }
      };

    } catch (error) {
      logger.error('Error searching policies', {
        error: error.message,
        stack: error.stack,
        policyNumber,
        currency,
        insuranceType
      });
      throw error;
    }
  }

  /**
   * Find policies by customer criteria (backward compatibility)
   */
  async findPoliciesByCustomer(searchCriteria) {
    const currency = searchCriteria.currency || 'USD';
    const policyNumber = searchCriteria.policyNumber;
    const insuranceType = searchCriteria.insuranceType;
    
    return await this.searchPolicies(policyNumber, currency, insuranceType);
  }

  /**
   * Get specific policy details for payment with currency support
   */
  async getPolicyForPayment(policyIdentifier, identifierType = 'policyNumber', currency = 'USD') {
    try {
      // Ensure connection to the requested database
      if (!this.isConnected[currency]) {
        await this.initialize(currency);
      }

      if (!this.isConnected[currency] || !this.pools[currency]) {
        throw new Error(`Database not connected for ${currency}`);
      }

      const viewName = currency === 'USD' ? 'VClient_LookUP_USD' : 'VClient_LookUP_ZIG';
      const request = this.pools[currency].request();
      
      let whereCondition = 'insurance_ref = @identifier'; // Default to policy number
      
      switch (identifierType.toLowerCase()) {
        case 'policynumber':
          whereCondition = 'insurance_ref = @identifier';
          break;
        case 'policyid':
          whereCondition = 'alternative_identifier = @identifier';
          break;
        default:
          whereCondition = 'insurance_ref = @identifier';
      }

      const query = `
        SELECT 
          insurance_ref,
          resolved_name,
          product_category,
          description,
          Status,
          GROSS_PREMIUM,
          SUM_INSURED,
          cover_start_date,
          expiry_date,
          mobile,
          agent_shortname,
          alternative_identifier
        FROM ${viewName}
        WHERE ${whereCondition}
      `;

      request.input('identifier', sql.VarChar(100), policyIdentifier.toString().trim());
      
      logger.info('Fetching policy for payment', { 
        identifier: policyIdentifier, 
        type: identifierType,
        currency,
        viewName
      });

      const result = await request.query(query);
      
      if (result.recordset.length === 0) {
        return {
          success: false,
          message: 'Policy not found or inactive',
          policyIdentifier,
          identifierType,
          currency
        };
      }

      const policy = result.recordset[0];
      
      // Transform to standardized format
      const paymentDetails = {
        policy_number: policy.PolicyNumber || 'N/A',
        policy_holder_name: policy.PolicyHolderName || 'Unknown',
        product_id: 'N/A', // Will be populated when we discover column names
        product_name: 'Unknown Product',
        product_category: 'GENERAL',
        rating_type: 'FLAT_RATE',
        product_description: 'Policy details from ' + viewName,
        policy_status: 'ACTIVE',
        package_name: '',
        package_premium: '0.00',
        package_term: '',
        package_cover_value: '',
        insurance_type: 'General',
        currency: currency,
        database: currency === 'USD' ? 'ZIMNATUSD' : 'ZIMNATZIG',
        paymentAmount: 0
      };

      logger.info('Policy found for payment', { 
        policyNumber: policy.PolicyNumber,
        amount: paymentDetails.paymentAmount,
        currency
      });

      return {
        success: true,
        policy: paymentDetails,
        paymentAmount: paymentDetails.paymentAmount,
        currency: currency
      };

    } catch (error) {
      logger.error('Error getting policy for payment', {
        error: error.message,
        stack: error.stack,
        policyIdentifier,
        identifierType,
        currency
      });
      throw error;
    }
  }

  /**
   * Update policy payment status after successful payment
   */
  async updatePolicyPayment(paymentReference, paymentDetails, currency = 'USD') {
    try {
      if (!this.isConnected[currency] || !this.pools[currency]) {
        throw new Error(`Database not connected for ${currency}`);
      }

      // Note: This is a read-only view operation for now
      // In a production environment, you'd need proper update procedures
      logger.info('Payment update requested (read-only mode)', {
        paymentReference,
        amount: paymentDetails.amount,
        currency
      });

      // For now, return success without actual update since we're using views
      return {
        success: true,
        message: 'Payment recorded (view mode - manual posting required)',
        rowsUpdated: 0,
        paymentReference,
        currency
      };

    } catch (error) {
      logger.error('Error updating policy payment', {
        error: error.message,
        paymentReference,
        paymentDetails,
        currency
      });
      throw error;
    }
  }

  /**
   * Close database connections
   */
  async close() {
    try {
      const closingPromises = [];
      
      if (this.pools.USD) {
        closingPromises.push(this.pools.USD.close());
      }
      
      if (this.pools.ZIG) {
        closingPromises.push(this.pools.ZIG.close());
      }
      
      await Promise.allSettled(closingPromises);
      
      this.pools.USD = null;
      this.pools.ZIG = null;
      this.isConnected.USD = false;
      this.isConnected.ZIG = false;
      
      logger.info('MSSQL Policy Service connections closed');
    } catch (error) {
      logger.error('Error closing MSSQL Policy Service', { error: error.message });
    }
  }
}

// Create singleton instance
const mssqlPolicyService = new MSSQLPolicyService();

module.exports = mssqlPolicyService;