// generate-token.js - Quick JWT token generator
require('dotenv').config();

async function generateFreshToken() {
  console.log('🔑 JWT Token Generator');
  console.log('=====================\n');

  try {
    // Method 1: Generate directly using AuthService
    console.log('1️⃣ Direct Token Generation:');
    
    const AuthService = require('./src/services/authService');
    
    const partnerData = {
      partner_code: 'FCB',
      partner_name: 'First Capital Bank',
      integration_type: 'banking',
      id: 34,
      roles: ['partner']
    };

    const directToken = AuthService.generateToken(partnerData);
    console.log('✅ Direct token generated successfully!');
    console.log('Token:', directToken);
    console.log('Use with: Authorization: Bearer ' + directToken);

    // Method 2: Call the login API
    console.log('\n2️⃣ API Login Method:');
    
    const http = require('http');
    
    const loginData = JSON.stringify({
      partner_code: 'FCB',
      api_key: 'fcb-api-key-12345'
    });

    try {
      const apiResponse = await makeApiRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData)
        }
      }, loginData);

      console.log('✅ API login successful!');
      console.log('Access Token:', apiResponse.data.access_token);
      console.log('Refresh Token:', apiResponse.data.refresh_token);
      console.log('Expires In:', apiResponse.data.expires_in);
      
      // Test the token immediately
      console.log('\n3️⃣ Testing Generated Token:');
      
      const testResponse = await makeApiRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/customers?limit=1',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiResponse.data.access_token}`
        }
      });

      console.log('✅ Token test successful!');
      console.log('API Response:', testResponse.success ? 'SUCCESS' : 'FAILED');
      
      console.log('\n🎯 Ready-to-use commands:');
      console.log('----------------------------------------');
      console.log('# Test customers endpoint:');
      console.log(`curl -H "Authorization: Bearer ${apiResponse.data.access_token}" http://localhost:3000/api/v1/customers`);
      console.log('\n# Test products endpoint:');
      console.log(`curl -H "Authorization: Bearer ${apiResponse.data.access_token}" http://localhost:3000/api/v1/products`);
      console.log('\n# Test health endpoint:');
      console.log(`curl http://localhost:3000/health`);

    } catch (apiError) {
      console.log('❌ API login failed:', apiError.message);
      console.log('💡 Make sure your server is running: node server.js');
      
      console.log('\n🔧 Fallback - Use the direct token:');
      console.log('Authorization: Bearer ' + directToken);
    }

    // Method 3: Show all available partner codes
    console.log('\n4️⃣ Available Partner Codes:');
    console.log('---------------------------');
    
    const availablePartners = [
      { code: 'FCB', name: 'First Capital Bank', api_key: 'fcb-api-key-12345' },
      { code: 'ZIMNAT', name: 'Zimnat Insurance', api_key: 'zimnat-api-key-12345' },
      { code: 'TEST', name: 'Test Partner', api_key: 'test-api-key-12345' }
    ];

    availablePartners.forEach(partner => {
      const token = AuthService.generateToken({
        partner_code: partner.code,
        partner_name: partner.name,
        integration_type: 'api',
        id: Math.floor(Math.random() * 1000),
        roles: ['partner']
      });
      
      console.log(`\n${partner.name} (${partner.code}):`);
      console.log(`  API Key: ${partner.api_key}`);
      console.log(`  JWT Token: ${token.substring(0, 50)}...`);
      console.log(`  curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/v1/customers`);
    });

    console.log('\n✅ Token generation complete!');

  } catch (error) {
    console.error('❌ Token generation failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Helper function for API requests
function makeApiRequest(options, postData = null) {
  const http = require('http');
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(data);
          if (jsonResponse.success || res.statusCode === 200) {
            resolve(jsonResponse);
          } else {
            reject(new Error(jsonResponse.error || `HTTP ${res.statusCode}`));
          }
        } catch (parseError) {
          reject(new Error(`Parse error: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Run the generator
generateFreshToken().catch(console.error);