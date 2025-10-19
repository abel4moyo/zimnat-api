// Simple database connection test
async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Try to require mssql
    let sql;
    try {
      sql = require('mssql');
      console.log('✅ mssql package found');
    } catch (error) {
      console.log('❌ mssql package not found:', error.message);
      console.log('Please run: npm install mssql');
      return;
    }

    const config = {
      server: '192.168.10.38',
      port: 1433,
      user: 'sa',
      password: 'Zimnat123',
      database: 'ZIMNATUSD',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
      }
    };

    console.log('Connecting to:', config.server, config.database);
    
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('✅ Connected successfully');
    
    // Test query
    const request = pool.request();
    const result = await request.query('SELECT 1 as test');
    console.log('✅ Test query successful:', result.recordset[0]);
    
    // Check if views exist
    const viewCheck = await request.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_NAME IN ('VClient_LookUP_USD', 'VClient_LookUP_ZIG')
    `);
    
    console.log('Views found:', viewCheck.recordset.map(r => r.TABLE_NAME));
    
    await pool.close();
    console.log('✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();