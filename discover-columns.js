// Script to discover available columns in the database views
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

async function discoverColumns() {
  try {
    console.log('🔍 Discovering database views and columns...\n');

    // Check USD database
    console.log('=== USD Database (ZIMNATUSD) ===');
    const usdPool = new sql.ConnectionPool({ ...config, database: 'ZIMNATUSD' });
    await usdPool.connect();
    
    const usdRequest = usdPool.request();
    const usdColumns = await usdRequest.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'VClient_LookUP_USD' 
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Columns in VClient_LookUP_USD:');
    usdColumns.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    await usdPool.close();

    // Check ZIG database
    console.log('\n=== ZIG Database (ZIMNATZIG) ===');
    const zigPool = new sql.ConnectionPool({ ...config, database: 'ZIMNATZIG' });
    await zigPool.connect();
    
    const zigRequest = zigPool.request();
    const zigColumns = await zigRequest.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'VClient_LookUP_ZIG' 
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Columns in VClient_LookUP_ZIG:');
    zigColumns.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    await zigPool.close();

    // Check if views exist
    if (usdColumns.recordset.length === 0) {
      console.log('\n⚠️  VClient_LookUP_USD view not found in ZIMNATUSD database');
    }
    
    if (zigColumns.recordset.length === 0) {
      console.log('\n⚠️  VClient_LookUP_ZIG view not found in ZIMNATZIG database');
    }

    console.log('\n✅ Discovery complete!');
    
  } catch (error) {
    console.error('❌ Error discovering columns:', error.message);
    console.error('Details:', error);
  }
}

discoverColumns();