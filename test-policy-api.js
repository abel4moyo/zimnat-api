// =============================================================================
// POLICY API TEST SCRIPT
// Test script to validate the updated MSSQL policy lookup implementation
// =============================================================================

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_POLICY_NUMBER = 'HE/TRV/USP/005462'; // Replace with actual policy number
const TEST_CURRENCIES = ['USD', 'ZIG'];
const TEST_INSURANCE_TYPES = ['Life', 'General'];

// Authentication - using valid API key from middleware
const AUTH_HEADERS = {
  'X-API-Key': 'zimnat-api-key-12345', // Valid development API key
  'Content-Type': 'application/json'
};

// Test functions
async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/policy/health`);
    console.log('Health Check Status:', response.status);
    console.log('Health Data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Health Check Failed:', error.message);
    if (error.response) {
      console.error('Error Response:', error.response.data);
    }
    return null;
  }
}

async function testPolicySearch(policyNumber, currency, insuranceType = null) {
  console.log(`\n=== Testing Policy Search (${currency}${insuranceType ? ` - ${insuranceType}` : ''}) ===`);
  try {
    const params = new URLSearchParams({
      policyNumber,
      currency
    });
    
    if (insuranceType) {
      params.append('insuranceType', insuranceType);
    }
    
    const response = await axios.get(`${BASE_URL}/api/v1/policy/search?${params}`, {
      headers: AUTH_HEADERS
    });
    
    console.log('Search Status:', response.status);
    console.log('Search Results:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`Policy Search Failed (${currency}):`, error.message);
    if (error.response) {
      console.error('Error Response:', error.response.data);
    }
    return null;
  }
}

async function testPolicyDetails(policyNumber, currency) {
  console.log(`\n=== Testing Policy Details (${currency}) ===`);
  try {
    const params = new URLSearchParams({ currency });
    const response = await axios.get(`${BASE_URL}/api/v1/policy/details/${policyNumber}?${params}`, {
      headers: AUTH_HEADERS
    });
    
    console.log('Details Status:', response.status);
    console.log('Policy Details:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`Policy Details Failed (${currency}):`, error.message);
    if (error.response) {
      console.error('Error Response:', error.response.data);
    }
    return null;
  }
}

async function testPaymentInitiation(policyNumber, currency) {
  console.log(`\n=== Testing Payment Initiation (${currency}) ===`);
  try {
    const paymentData = {
      currency,
      paymentMethod: 'CARD',
      customerDetails: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+263771234567'
      },
      returnUrl: 'https://example.com/return',
      callbackUrl: 'https://example.com/callback'
    };
    
    const response = await axios.post(
      `${BASE_URL}/api/v1/policy/${policyNumber}/payment/initiate`,
      paymentData,
      {
        headers: AUTH_HEADERS
      }
    );
    
    console.log('Payment Initiation Status:', response.status);
    console.log('Payment Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`Payment Initiation Failed (${currency}):`, error.message);
    if (error.response) {
      console.error('Error Response:', error.response.data);
    }
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Policy API Tests');
  console.log('===============================');
  
  // Test 1: Health Check
  const healthResult = await testHealthCheck();
  
  if (!healthResult || !healthResult.success) {
    console.log('❌ Health check failed. API may not be running.');
    return;
  }
  
  // Test 2: Policy Search for both currencies
  for (const currency of TEST_CURRENCIES) {
    await testPolicySearch(TEST_POLICY_NUMBER, currency);
    
    // Test with insurance types
    for (const insuranceType of TEST_INSURANCE_TYPES) {
      await testPolicySearch(TEST_POLICY_NUMBER, currency, insuranceType);
    }
  }
  
  // Test 3: Policy Details for both currencies
  for (const currency of TEST_CURRENCIES) {
    await testPolicyDetails(TEST_POLICY_NUMBER, currency);
  }
  
  // Test 4: Payment Initiation for both currencies
  for (const currency of TEST_CURRENCIES) {
    await testPaymentInitiation(TEST_POLICY_NUMBER, currency);
  }
  
  console.log('\n✅ All tests completed!');
  console.log('===============================');
}

// Validation Tests
async function validateApiStructure() {
  console.log('\n🔍 Validating API Response Structure');
  console.log('=====================================');
  
  // Test the required response fields
  const testPolicy = await testPolicySearch('TEST123', 'USD');
  
  if (testPolicy && testPolicy.data && testPolicy.data.policies.length > 0) {
    const policy = testPolicy.data.policies[0];
    const requiredFields = [
      'policy_number',
      'policy_holder_name',
      'product_id',
      'product_name',
      'product_category',
      'rating_type',
      'product_description',
      'policy_status',
      'package_name',
      'package_premium',
      'package_term',
      'package_cover_value',
      'insurance_type'
    ];
    
    console.log('✅ Checking required fields in policy response:');
    requiredFields.forEach(field => {
      if (policy.hasOwnProperty(field)) {
        console.log(`  ✓ ${field}: ${policy[field]}`);
      } else {
        console.log(`  ❌ MISSING: ${field}`);
      }
    });
  }
}

// Export for use in other scripts
module.exports = {
  testHealthCheck,
  testPolicySearch,
  testPolicyDetails,
  testPaymentInitiation,
  runTests,
  validateApiStructure
};

// Run tests if this script is executed directly
if (require.main === module) {
  runTests()
    .then(() => validateApiStructure())
    .then(() => {
      console.log('\n📋 Test Summary');
      console.log('================');
      console.log('- Health check endpoint tested');
      console.log('- Policy search with USD/ZIG currencies tested');
      console.log('- Insurance type filtering tested');
      console.log('- Policy details retrieval tested');
      console.log('- Payment initiation tested');
      console.log('- Response structure validated');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    });
}