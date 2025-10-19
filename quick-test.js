// Quick test script for policy API
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'zimnat-api-key-12345';

// Get policy number from command line args
//const policyNumber = process.argv[2];
const policyNumber= "HE/TRV/USP/005462"
const currency = process.argv[3] || 'USD';

if (!policyNumber) {
  console.log('Usage: node quick-test.js <policy_number> [currency]');
  console.log('Example: node quick-test.js POL123456 USD');
  process.exit(1);
}

async function quickTest() {
  try {
    console.log(`🔍 Testing Policy: ${policyNumber} (${currency})`);
    console.log('================================================');
    
    // Test health first
    console.log('1. Checking API Health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/v1/policy/health`);
    console.log('✅ API Health:', healthResponse.data.data.mssqlServices[currency]?.status || 'unknown');
    
    // Test policy search
    console.log('\n2. Searching for Policy...');
    const searchResponse = await axios.get(
      `${BASE_URL}/api/v1/policy/search?policyNumber=${policyNumber}&currency=${currency}`,
      { headers: { 'X-API-Key': API_KEY } }
    );
    
    console.log('✅ Search Results:');
    if (searchResponse.data.data.policies.length > 0) {
      const policy = searchResponse.data.data.policies[0];
      console.log('   Policy Number:', policy.policy_number);
      console.log('   Holder Name:', policy.policy_holder_name);
      console.log('   Product:', policy.product_name);
      console.log('   Insurance Type:', policy.insurance_type);
      console.log('   Status:', policy.policy_status);
      console.log('   Premium:', policy.package_premium);
      console.log('   Currency:', policy.currency);
      console.log('   Database:', policy.database);
    } else {
      console.log('   No policies found');
    }
    
    // Test policy details
    console.log('\n3. Getting Policy Details...');
    const detailsResponse = await axios.get(
      `${BASE_URL}/api/v1/policy/details/${policyNumber}?currency=${currency}`,
      { headers: { 'X-API-Key': API_KEY } }
    );
    
    console.log('✅ Policy Details Retrieved');
    console.log('   Payment Amount:', detailsResponse.data.data.paymentAmount);
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

quickTest();