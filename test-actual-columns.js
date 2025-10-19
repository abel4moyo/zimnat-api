// Test to find the actual column structure
const sql = require('mssql');

const config = {
  server: '192.168.10.38',
  port: 1433,
  user: 'sa',
  password: 'Zimnat123',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000
  }
};

async function findActualColumns() {
  try {
    console.log('🔍 Finding actual column structure...\n');

    // Test USD database
    console.log('=== USD Database (ZIMNATUSD) ===');
    const usdPool = new sql.ConnectionPool({ ...config, database: 'ZIMNATUSD' });
    await usdPool.connect();
    
    // Get column information
    const usdRequest = usdPool.request();
    const usdColumns = await usdRequest.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'VClient_LookUP_USD' 
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Available columns in VClient_LookUP_USD:');
    usdColumns.recordset.forEach(col => {
      console.log(`  ✓ ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    // Try a sample query to see what data looks like
    if (usdColumns.recordset.length > 0) {
      console.log('\nSample data (first 2 rows):');
      const sampleQuery = `SELECT TOP 2 * FROM VClient_LookUP_USD`;
      const sampleResult = await usdRequest.query(sampleQuery);
      
      if (sampleResult.recordset.length > 0) {
        console.log('First record keys:', Object.keys(sampleResult.recordset[0]));
        console.log('Sample record:', JSON.stringify(sampleResult.recordset[0], null, 2));
      }
    }
    
    await usdPool.close();

    console.log('\n=== Testing Policy Search ===');
    
    // Test a simple query with minimal columns
    const testPool = new sql.ConnectionPool({ ...config, database: 'ZIMNATUSD' });
    await testPool.connect();
    
    const testRequest = testPool.request();
    
    // Try the most basic query possible
    const basicQuery = `SELECT TOP 5 PolicyNumber, PolicyHolderName FROM VClient_LookUP_USD`;
    console.log('Testing basic query:', basicQuery);
    
    const basicResult = await testRequest.query(basicQuery);
    console.log('✅ Basic query successful! Found', basicResult.recordset.length, 'records');
    
    if (basicResult.recordset.length > 0) {
      console.log('Sample policy numbers:', basicResult.recordset.map(r => r.PolicyNumber));
    }
    
    await testPool.close();
    
    console.log('\n✅ Column discovery complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Failed to connect')) {
      console.log('💡 Database connection failed - server may be offline');
    }
  }
}

findActualColumns();