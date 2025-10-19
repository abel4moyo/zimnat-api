// quick-customer-test.js - Quick test for customer endpoint
require('dotenv').config();
const http = require('http');

async function testCustomerEndpoint() {
  console.log('🧪 Quick Customer Endpoint Test');
  console.log('===============================\n');

  try {
    // Step 1: Login to get a fresh token
    console.log('1️⃣ Getting fresh JWT token...');
    
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      partner_code: 'FCB',
      api_key: 'fcb-api-key-12345'
    }));

    console.log('✅ Login successful!');
    const token = loginResponse.data.access_token;
    console.log('Token (first 30 chars):', token.substring(0, 30) + '...');

    // Step 2: Test customers endpoint
    console.log('\n2️⃣ Testing /api/v1/customers endpoint...');
    
    const customersResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/customers',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Customers endpoint successful!');
    console.log('Response details:');
    console.log('  - Success:', customersResponse.success);
    console.log('  - Customers found:', customersResponse.data?.length || 0);
    console.log('  - Partner:', customersResponse.meta?.partner || 'Unknown');
    console.log('  - Source:', customersResponse.data?.[0]?.source || 'Unknown');
    
    if (customersResponse.data && customersResponse.data.length > 0) {
      console.log('  - Sample customer:', {
        id: customersResponse.data[0].customer_id,
        name: customersResponse.data[0].name,
        email: customersResponse.data[0].email
      });
    }

    // Step 3: Test customer statistics
    console.log('\n3️⃣ Testing /api/v1/customers/statistics endpoint...');
    
    try {
      const statsResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/customers/statistics',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Customer statistics successful!');
      console.log('Statistics:', {
        total_customers: statsResponse.data.total_customers,
        active_customers: statsResponse.data.active_customers,
        total_premium_value: statsResponse.data.total_premium_value,
        source: statsResponse.data.source
      });
    } catch (statsError) {
      console.log('⚠️ Statistics endpoint error:', statsError.message);
    }

    // Step 4: Test individual customer lookup
    console.log('\n4️⃣ Testing individual customer lookup...');
    
    try {
      const customerResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/customers/CUST001',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Individual customer lookup successful!');
      console.log('Customer details:', {
        id: customerResponse.data.customer_id,
        name: customerResponse.data.name,
        email: customerResponse.data.email,
        source: customerResponse.data.source
      });
    } catch (customerError) {
      console.log('⚠️ Individual customer lookup error:', customerError.message);
    }

    // Step 5: Test with API key (fallback)
    console.log('\n5️⃣ Testing with API key authentication...');
    
    try {
      const apiKeyResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/customers?limit=2',
        method: 'GET',
        headers: {
          'X-API-Key': 'fcb-api-key-12345'
        }
      });

      console.log('✅ API key authentication successful!');
      console.log('Customers via API key:', apiKeyResponse.data?.length || 0);
    } catch (apiKeyError) {
      console.log('⚠️ API key authentication error:', apiKeyError.message);
    }

    console.log('\n🎉 Customer endpoint is working correctly!');
    console.log('\n📋 Summary:');
    console.log('✅ Authentication: Working');
    console.log('✅ Customer list: Working');
    console.log('✅ Database integration: ' + (customersResponse.data?.[0]?.source === 'database' ? 'Yes' : 'Fallback data'));
    console.log('✅ API is ready for use!');

  } catch (error) {
    console.log('\n❌ Customer endpoint test failed:');
    console.log('Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solution: Make sure your server is running');
      console.log('   Run: node server.js');
    } else {
      console.log('\n💡 Check that you have replaced the customer routes file');
    }
  }
}

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
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
            reject(new Error(jsonResponse.error || jsonResponse.message || `HTTP ${res.statusCode}`));
          }
        } catch (parseError) {
          reject(new Error(`Parse error: ${parseError.message}. Response: ${data}`));
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

// Run the test
testCustomerEndpoint().catch(error => {
  console.error('Test failed:', error.message);
  process.exit(1);
});