// database-diagnostic.js - Diagnose your database structure
require('dotenv').config();

async function diagnoseDatabaseStructure() {
  console.log('🔍 Database Structure Diagnostic');
  console.log('================================\n');

  try {
    // Try to load database connection
    let pool;
    try {
      const db = require('./src/db');
      pool = db.pool;
      console.log('✅ Database connection loaded successfully');
    } catch (dbError) {
      console.log('❌ Database connection failed:', dbError.message);
      return;
    }

    if (!pool) {
      console.log('❌ Database pool not available');
      return;
    }

    const client = await pool.connect();
    try {
      console.log('✅ Connected to database\n');

      // 1. Check what tables exist
      console.log('1️⃣ Available Tables:');
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      
      const tablesResult = await client.query(tablesQuery);
      const tableNames = tablesResult.rows.map(row => row.table_name);
      
      console.log('Available tables:', tableNames);
      
      // 2. Check for partner-related tables
      console.log('\n2️⃣ Partner-related Tables:');
      const partnerTables = tableNames.filter(name => 
        name.toLowerCase().includes('partner') || 
        name.toLowerCase().includes('fcb')
      );
      
      if (partnerTables.length === 0) {
        console.log('❌ No partner-related tables found');
        console.log('📝 Available tables:', tableNames);
      } else {
        console.log('✅ Partner-related tables found:', partnerTables);
        
        // 3. Check structure of each partner table
        for (const tableName of partnerTables) {
          console.log(`\n3️⃣ Structure of ${tableName}:`);
          
          const columnsQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position;
          `;
          
          try {
            const columnsResult = await client.query(columnsQuery, [tableName]);
            console.log('Columns:');
            columnsResult.rows.forEach(col => {
              console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '* Required' : ''}`);
            });
            
            // 4. Check for sample data
            const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3`;
            try {
              const sampleResult = await client.query(sampleQuery);
              console.log(`Sample data (${sampleResult.rows.length} rows):`);
              sampleResult.rows.forEach((row, index) => {
                console.log(`  Row ${index + 1}:`, Object.keys(row).reduce((obj, key) => {
                  obj[key] = typeof row[key] === 'string' && row[key].length > 50 
                    ? row[key].substring(0, 50) + '...' 
                    : row[key];
                  return obj;
                }, {}));
              });
            } catch (sampleError) {
              console.log('  No sample data available:', sampleError.message);
            }
            
          } catch (columnError) {
            console.log(`❌ Error checking ${tableName}:`, columnError.message);
          }
        }
      }

      // 5. Test partner lookup queries
      console.log('\n4️⃣ Testing Partner Lookup Queries:');
      
      const testQueries = [
        {
          name: 'fcb_partners by partner_code',
          query: "SELECT * FROM fcb_partners WHERE UPPER(partner_code) = 'FCB' LIMIT 1"
        },
        {
          name: 'partners by partner_code',
          query: "SELECT * FROM partners WHERE UPPER(partner_code) = 'FCB' LIMIT 1"
        },
        {
          name: 'fcb_partners by api_key',
          query: "SELECT * FROM fcb_partners WHERE api_key = 'fcb-api-key-12345' LIMIT 1"
        },
        {
          name: 'partners by api_key',
          query: "SELECT * FROM partners WHERE api_key = 'fcb-api-key-12345' LIMIT 1"
        }
      ];

      for (const test of testQueries) {
        try {
          const result = await client.query(test.query);
          console.log(`✅ ${test.name}: ${result.rows.length} rows found`);
          if (result.rows.length > 0) {
            const row = result.rows[0];
            console.log(`   Sample: ${row.partner_name || row.name || 'N/A'} (${row.partner_code || row.code || 'N/A'})`);
          }
        } catch (queryError) {
          console.log(`❌ ${test.name}: ${queryError.message}`);
        }
      }

      console.log('\n5️⃣ Recommendations:');
      
      if (partnerTables.includes('fcb_partners')) {
        console.log('✅ Use fcb_partners table for partner lookups');
        console.log('✅ Update middleware to query fcb_partners instead of partners');
      } else if (partnerTables.includes('partners')) {
        console.log('✅ Use partners table for partner lookups');
      } else {
        console.log('❌ No partner table found - you may need to create one');
        console.log('💡 Suggested SQL to create partners table:');
        console.log(`
        CREATE TABLE fcb_partners (
          partner_id SERIAL PRIMARY KEY,
          partner_code VARCHAR(50) UNIQUE NOT NULL,
          partner_name VARCHAR(255) NOT NULL,
          api_key VARCHAR(255) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO fcb_partners (partner_code, partner_name, api_key) VALUES
        ('FCB', 'First Capital Bank', 'fcb-api-key-12345'),
        ('ZIMNAT', 'Zimnat Insurance', 'zimnat-api-key-12345'),
        ('TEST', 'Test Partner', 'test-api-key-12345');
        `);
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the diagnostic
diagnoseDatabaseStructure().catch(console.error);