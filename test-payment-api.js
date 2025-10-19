// Test Payment API Endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testPaymentAPI() {
  console.log('🧪 Testing Payment API Endpoints...\n');

  try {
    // Test payment processing
    console.log('1. Testing payment processing...');
    const paymentRequest = {
      policy_number: 'API-TEST-001',
      amount: 299.99,
      external_reference: 'EXT-REF-API-001',
      payment_method: 'card',
      customer_name: 'API Test User',
      customer_email: 'apitest@example.com',
      customer_phone: '+263777555444',
      currency: 'USD',
      product_name: 'Motor Insurance',
      insurance_type: 'General'
    };

    const paymentResponse = await axios.post(`${BASE_URL}/api/v1/payment/process`, paymentRequest, {
      headers: {
        'Content-Type': 'application/json',
        'X-Partner-API-Key': 'test-api-key' // This might need to be adjusted based on your auth setup
      }
    });

    console.log(`   ✅ Payment Processing: ${paymentResponse.status === 201 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   💳 Transaction Reference: ${paymentResponse.data.data.transaction_reference}`);
    console.log(`   📋 Status: ${paymentResponse.data.data.status}`);
    console.log(`   💰 Amount: $${paymentResponse.data.data.amount}\n`);

    const transactionReference = paymentResponse.data.data.transaction_reference;

    // Test payment status retrieval
    console.log('2. Testing payment status retrieval...');
    const statusResponse = await axios.get(`${BASE_URL}/api/v1/payment/status/${transactionReference}`, {
      headers: {
        'X-Partner-API-Key': 'test-api-key'
      }
    });

    console.log(`   ✅ Status Retrieval: ${statusResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   📋 Current Status: ${statusResponse.data.data.status}`);
    console.log(`   👤 Customer: ${statusResponse.data.data.customer_name}`);
    console.log(`   🏛️ Policy: ${statusResponse.data.data.policy_number}\n`);

    console.log('🎉 All API tests completed successfully!');

  } catch (error) {
    if (error.response) {
      console.error(`❌ API Error: ${error.response.status} - ${error.response.statusText}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response received - is the server running?');
      console.error('Make sure to start the server with: npm run dev');
    } else {
      console.error('❌ Request setup error:', error.message);
    }
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Run the test
checkServer().then(serverRunning => {
  if (serverRunning) {
    console.log('✅ Server is running, proceeding with tests...\n');
    testPaymentAPI();
  } else {
    console.log('❌ Server is not running. Please start it with: npm run dev');
    console.log('   Then run this test again.');
  }
}).catch(error => {
  console.error('❌ Error checking server:', error.message);
});