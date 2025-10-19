// =============================================================================
// POLICY DATABASE SETUP SCRIPT
// File: scripts/setup-policy-database.js
// Description: Test MSSQL connection and set up policy view
// =============================================================================

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Database configuration
const config = {
  server: process.env.MSSQL_SERVER || 'localhost',
  port: parseInt(process.env.MSSQL_PORT) || 1433,
  database: process.env.MSSQL_DATABASE || 'puredb',
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || 'S@turday123',
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

async function setupPolicyDatabase() {
  let pool;
  
  try {
    console.log('🔄 Connecting to MSSQL database...');
    console.log(`Server: ${config.server}:${config.port}`);
    console.log(`Database: ${config.database}`);
    console.log(`User: ${config.user}`);
    
    // Connect to database
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('✅ Connected to MSSQL database successfully!');
    
    // Test basic connectivity
    const testResult = await pool.request().query('SELECT @@VERSION as version, GETDATE() as timestamp');
    console.log(`✅ Database Version: ${testResult.recordset[0].version.split('\n')[0]}`);
    console.log(`✅ Current Time: ${testResult.recordset[0].timestamp}`);
    
    // Check if view exists
    console.log('\n🔄 Checking if vw_PolicyLookup view exists...');
    const viewCheck = await pool.request().query(`
      SELECT COUNT(*) as viewExists 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_NAME = 'vw_PolicyLookup'
    `);
    
    if (viewCheck.recordset[0].viewExists > 0) {
      console.log('ℹ️ View vw_PolicyLookup already exists, it will be replaced.');
    }
    
    // Read and execute the view creation script
    console.log('\n🔄 Creating/updating vw_PolicyLookup view...');
    const viewSqlPath = path.join(__dirname, '..', 'database', 'views', 'policy_lookup_view.sql');
    
    if (!fs.existsSync(viewSqlPath)) {
      throw new Error(`View SQL file not found at: ${viewSqlPath}`);
    }
    
    const viewSql = fs.readFileSync(viewSqlPath, 'utf8');
    
    // Split the SQL file by GO statements and execute each batch
    const batches = viewSql.split(/^\s*GO\s*$/gm).filter(batch => batch.trim().length > 0);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        try {
          console.log(`🔄 Executing batch ${i + 1}/${batches.length}...`);
          await pool.request().batch(batch);
          console.log(`✅ Batch ${i + 1} executed successfully`);
        } catch (batchError) {
          console.error(`❌ Error in batch ${i + 1}:`, batchError.message);
          // Continue with other batches
        }
      }
    }
    
    // Verify view was created
    console.log('\n🔄 Verifying view creation...');
    const viewVerification = await pool.request().query(`
      SELECT COUNT(*) as viewExists 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_NAME = 'vw_PolicyLookup'
    `);
    
    if (viewVerification.recordset[0].viewExists > 0) {
      console.log('✅ View vw_PolicyLookup created/updated successfully!');
      
      // Test the view with a simple query
      console.log('\n🔄 Testing view with sample query...');
      try {
        const testQuery = await pool.request().query('SELECT TOP 5 * FROM vw_PolicyLookup');
        console.log(`✅ View test successful! Found ${testQuery.recordset.length} sample records.`);
        
        if (testQuery.recordset.length > 0) {
          console.log('\n📋 Sample data from view:');
          const sample = testQuery.recordset[0];
          console.log(`   Policy Number: ${sample.PolicyNumber || 'N/A'}`);
          console.log(`   Customer Name: ${sample.CustomerName || 'N/A'}`);
          console.log(`   Product Name: ${sample.ProductName || 'N/A'}`);
          console.log(`   Premium Amount: ${sample.PremiumAmount || 'N/A'}`);
        } else {
          console.log('ℹ️ No data found in view - this is normal if tables are empty');
        }
        
      } catch (testError) {
        console.error('⚠️ View test failed:', testError.message);
        console.error('This might indicate missing tables or data. The view was created but cannot return data.');
      }
      
    } else {
      throw new Error('View creation verification failed');
    }
    
    console.log('\n🎉 Policy database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Ensure your database has the required tables (Policies, Customers, Products, etc.)');
    console.log('2. Test the API endpoints using the integration guide');
    console.log('3. Check /api/v1/policy/health endpoint for service status');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('1. Verify database server is running and accessible');
    console.error('2. Check database credentials and permissions');
    console.error('3. Ensure database name "puredb" exists');
    console.error('4. Verify required tables exist in the database');
    
    process.exit(1);
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('🔌 Database connection closed');
      } catch (closeError) {
        console.error('Error closing database connection:', closeError.message);
      }
    }
  }
}

// Run the setup
if (require.main === module) {
  setupPolicyDatabase()
    .then(() => {
      console.log('\n✨ Setup script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupPolicyDatabase };