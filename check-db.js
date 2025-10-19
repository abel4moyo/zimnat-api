// check-db.js - Quick script to check database tables
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'FCB'
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    const client = await pool.connect();
    console.log('✅ Connected to database');
    
    // Check what tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tables in database:');
    console.log('=====================');
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found in database');
    } else {
      tablesResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }
    
    // Check specifically for partners table
    const partnersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'partners'
      );
    `);
    
    console.log('\n🔍 Partners table check:');
    console.log('========================');
    
    if (partnersCheck.rows[0].exists) {
      console.log('✅ Partners table EXISTS');
      
      // Check partners table structure
      const partnersStructure = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'partners' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📊 Partners table structure:');
      partnersStructure.rows.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      // Check partners data
      const partnersData = await client.query('SELECT * FROM partners LIMIT 5');
      console.log(`\n📄 Partners data (${partnersData.rows.length} rows):`);
      partnersData.rows.forEach(partner => {
        console.log(`  ${partner.id}: ${partner.partner_code} - ${partner.partner_name}`);
      });
      
    } else {
      console.log('❌ Partners table DOES NOT EXIST');
      
      console.log('\n💡 Solutions:');
      console.log('1. Create partners table manually');
      console.log('2. Check migration files');
      console.log('3. Use hardcoded partners for testing');
    }
    
    // Check migration status
    const migrationCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knex_migrations'
      );
    `);
    
    if (migrationCheck.rows[0].exists) {
      const migrations = await client.query('SELECT * FROM knex_migrations ORDER BY batch, id');
      console.log('\n📜 Migration history:');
      console.log('=====================');
      migrations.rows.forEach(migration => {
        console.log(`  ${migration.name} (batch: ${migration.batch})`);
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Database connection refused. Make sure PostgreSQL is running.');
    } else if (error.code === '3D000') {
      console.log('\n💡 Database does not exist. Create it first.');
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Check your database credentials.');
    }
  } finally {
    await pool.end();
  }
}

checkDatabase();