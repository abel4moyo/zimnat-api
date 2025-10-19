// Test to see what columns are actually in the view
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'zimnat-api-key-12345';

async function testViewStructure() {
  try {
    console.log('🔍 Testing view structure by selecting all columns...');
    
    // First check health
    const healthResponse = await axios.get(`${BASE_URL}/api/v1/policy/health`);
    console.log('Health status USD:', healthResponse.data.data.mssqlServices?.USD?.status);
    console.log('Health status ZIG:', healthResponse.data.data.mssqlServices?.ZIG?.status);
    
    if (healthResponse.data.data.mssqlServices?.USD?.status !== 'available') {
      console.log('❌ USD database not available, cannot test');
      return;
    }
    
    // Try a policy search to see the actual error
    try {
      const searchResponse = await axios.get(
        `${BASE_URL}/api/v1/policy/search?policyNumber=TEST&currency=USD`,
        { headers: { 'X-API-Key': API_KEY } }
      );
      console.log('✅ Search worked! Found policies:', searchResponse.data.data.policies.length);
      if (searchResponse.data.data.policies.length > 0) {
        console.log('Sample policy fields:', Object.keys(searchResponse.data.data.policies[0]));
      }
    } catch (searchError) {
      console.log('❌ Search failed:', searchError.response?.data?.details || searchError.message);
      
      // If it's a column error, we need to know which columns exist
      if (searchError.response?.data?.details?.includes('Invalid column name')) {
        console.log('\n💡 Column error detected. Let me suggest a fix:');
        console.log('The view probably has different column names than expected.');
        console.log('Common alternatives might be:');
        console.log('- PremiumDueDate → DueDate, Premium_Due_Date, etc.');
        console.log('- CreatedDate → CreateDate, Created_Date, DateCreated, etc.');
        console.log('- LastPaymentDate → Last_Payment_Date, PaymentDate, etc.');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testViewStructure();