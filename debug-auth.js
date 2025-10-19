// debug-auth.js - Debug authentication middleware
const AuthService = require('./src/services/authService');

// Test JWT verification directly
async function debugJWT() {
  console.log('🔍 JWT Debug Test');
  console.log('=================\n');

  // Test JWT configuration
  console.log('1️⃣ Checking JWT configuration...');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? 'SET' : 'NOT SET');

  // Test token that should be failing
  const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJGQ0IiLCJpc3MiOiJmY2ItemltbmF0LWFwaSIsImF1ZCI6ImZjYi1wYXJ0bmVycyIsImlhdCI6MTc1NDE5OTg2OCwiZXhwIjoxNzU0Mjg2MjY4LCJyb2xlcyI6WyJwYXJ0bmVyIl0sInBhcnRuZXJfbmFtZSI6IkZpcnN0IENhcGl0YWwgQmFuayIsImp0aSI6IjliOTI5NDJkLWMwNzctNDE1YS05MWNhLTRiNDIzN2Y5MjNiNCJ9.WMZ2UsuqhBuGcQ6jnRG4-Wj2jIdtV8k5Fs1c0mlMP5w";

  console.log('\n2️⃣ Testing JWT verification...');
  console.log('Token (first 50 chars):', testToken.substring(0, 50) + '...');

  try {
    const decoded = AuthService.verifyToken(testToken);
    console.log('✅ JWT verification successful!');
    console.log('Decoded payload:');
    console.log('  Subject (partner_code):', decoded.sub);
    console.log('  Issued at:', new Date(decoded.iat * 1000).toISOString());
    console.log('  Expires at:', new Date(decoded.exp * 1000).toISOString());
    console.log('  Current time:', new Date().toISOString());
    console.log('  Is expired?', decoded.exp < Math.floor(Date.now() / 1000));
    console.log('  Roles:', decoded.roles);
    console.log('  Partner name:', decoded.partner_name);

    // Test with fresh token
    console.log('\n3️⃣ Generating fresh token...');
    const testPartner = {
      partner_code: 'FCB',
      partner_name: 'First Capital Bank',
      integration_type: 'banking',
      id: 1,
      roles: ['partner']
    };

    const freshToken = AuthService.generateToken(testPartner);
    console.log('Fresh token generated:', freshToken.substring(0, 50) + '...');

    // Verify the fresh token
    const freshDecoded = AuthService.verifyToken(freshToken);
    console.log('✅ Fresh token verification successful!');
    console.log('Fresh token expires at:', new Date(freshDecoded.exp * 1000).toISOString());

  } catch (error) {
    console.error('❌ JWT verification failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }

  // Test database connection
  console.log('\n4️⃣ Testing database connection...');
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'FCBDatabase'
    });

    const client = await pool.connect();
    const result = await client.query('SELECT partner_id, partner_code, partner_name FROM fcb_partners WHERE partner_code = $1', ['FCB']);
    
    console.log('✅ Database connection successful!');
    if (result.rows.length > 0) {
      console.log('Partner found in database:');
      console.log('  ID:', result.rows[0].partner_id);
      console.log('  Code:', result.rows[0].partner_code);
      console.log('  Name:', result.rows[0].partner_name);
    } else {
      console.log('❌ No partner found with code "FCB"');
    }

    client.release();
    await pool.end();

  } catch (dbError) {
    console.error('❌ Database connection failed:', dbError.message);
  }
}

// Load environment variables
require('dotenv').config();

// Run debug
debugJWT().catch(console.error);