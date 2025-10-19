// jwt-secret-debug.js - Debug JWT secret issues
require('dotenv').config();

async function debugJWTSecret() {
  console.log('🔍 JWT Secret Debug');
  console.log('===================\n');

  // Check environment variables
  console.log('1️⃣ Environment Variables:');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
  console.log('JWT_SECRET value:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 20) + '...' : 'NONE');
  console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? 'SET' : 'NOT SET');

  try {
    const AuthService = require('./src/services/authService');
    
    // Test token generation and verification with current secret
    console.log('\n2️⃣ Testing Token Generation & Verification:');
    
    const testPartner = {
      partner_code: 'FCB',
      partner_name: 'First Capital Bank',
      integration_type: 'banking',
      id: 1,
      roles: ['partner']
    };

    console.log('Generating token...');
    const newToken = AuthService.generateToken(testPartner);
    console.log('✅ Token generated successfully');
    console.log('New token:', newToken.substring(0, 50) + '...');

    console.log('\nVerifying same token...');
    const decoded = AuthService.verifyToken(newToken);
    console.log('✅ Token verified successfully');
    console.log('Decoded partner:', decoded.sub);
    console.log('Expires at:', new Date(decoded.exp * 1000).toISOString());

    // Test with the failing token from your logs
    console.log('\n3️⃣ Testing Your Failing Token:');
    const failingTokenPrefix = 'eyJhbGciOiJIUzI1NiJ9';
    console.log('Your token starts with:', failingTokenPrefix);
    console.log('New token starts with:', newToken.substring(0, failingTokenPrefix.length));
    console.log('Token prefixes match:', newToken.startsWith(failingTokenPrefix));

    // If you have the full failing token, test it here
    // Replace this with your actual failing token if you have it
    const yourFailingToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJGQ0IiLCJpc3MiOiJmY2ItemltbmF0LWFwaSIsImF1ZCI6ImZjYi1wYXJ0bmVycyIsImlhdCI6MTc1NDE5OTg2OCwiZXhwIjoxNzU0Mjg2MjY4LCJyb2xlcyI6WyJwYXJ0bmVyIl0sInBhcnRuZXJfbmFtZSI6IkZpcnN0IENhcGl0YWwgQmFuayIsImp0aSI6IjliOTI5NDJkLWMwNzctNDE1YS05MWNhLTRiNDIzN2Y5MjNiNCJ9.WMZ2UsuqhBuGcQ6jnRG4-Wj2jIdtV8k5Fs1c0mlMP5w";
    
    if (yourFailingToken) {
      console.log('\nTesting your specific failing token...');
      try {
        const decodedFailing = AuthService.verifyToken(yourFailingToken);
        console.log('✅ Your failing token actually works!');
        console.log('Partner:', decodedFailing.sub);
      } catch (error) {
        console.log('❌ Your failing token verification failed:');
        console.log('Error:', error.message);
        console.log('Error name:', error.name);
      }
    }

    console.log('\n4️⃣ Recommendations:');
    console.log('✅ Use the new token generated above');
    console.log('✅ Make sure not to restart server between token generation and use');
    console.log('✅ Use API key authentication as backup');

  } catch (error) {
    console.error('❌ AuthService Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugJWTSecret();