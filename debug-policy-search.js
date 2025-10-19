// Debug Policy Search - Direct MSSQL Query
const MSSQLPolicyService = require('./src/services/mssqlPolicyService');

async function debugPolicySearch() {
  console.log('🔍 DEBUGGING POLICY SEARCH');
  console.log('==========================\n');

  const testPolicies = [
    'T1/AHL/USP/027148',
    'HE/TRV/USP/005462', // Known working policy
  ];

  try {
    // Initialize both databases
    console.log('🏗️  Initializing MSSQL connections...');
    const initResult = await MSSQLPolicyService.initializeBoth();
    console.log(`USD Database: ${initResult.USD ? '✅' : '❌'}`);
    console.log(`ZIG Database: ${initResult.ZIG ? '✅' : '❌'}\n`);

    for (const policyNumber of testPolicies) {
      console.log(`🔎 Testing Policy: ${policyNumber}`);
      console.log('-'.repeat(50));

      // Test in both databases
      for (const currency of ['USD', 'ZIG']) {
        console.log(`\n📊 Searching in ${currency} database:`);
        
        try {
          const result = await MSSQLPolicyService.searchPolicies(policyNumber, currency);
          
          if (result.success && result.policies.length > 0) {
            const policy = result.policies[0];
            console.log(`   ✅ FOUND in ${currency}!`);
            console.log(`   📋 Policy: ${policy.policy_number}`);
            console.log(`   👤 Holder: ${policy.policy_holder_name}`);
            console.log(`   📦 Product: ${policy.product_name}`);
            console.log(`   💰 Premium: ${policy.currency} ${policy.package_premium}`);
            console.log(`   📅 Status: ${policy.policy_status}`);
            console.log(`   📅 Expiry: ${policy.expiry_date}`);
            
            // Check if policy is active/expired
            if (policy.expiry_date) {
              const expiryDate = new Date(policy.expiry_date);
              const today = new Date();
              const isExpired = expiryDate < today;
              console.log(`   ⏰ Expired: ${isExpired ? '❌ YES' : '✅ NO'}`);
            }
          } else {
            console.log(`   ❌ Not found in ${currency} database`);
          }
        } catch (error) {
          console.log(`   ❌ Error in ${currency}: ${error.message}`);
        }
      }

      // Try wildcard search
      console.log(`\n🔍 Trying partial match searches:`);
      for (const currency of ['USD', 'ZIG']) {
        try {
          // Extract parts of policy number for partial matching
          const parts = policyNumber.split('/');
          if (parts.length > 0) {
            const lastPart = parts[parts.length - 1]; // e.g., "027148"
            console.log(`   🔍 Searching for partial match: ${lastPart} in ${currency}`);
            
            // This would require a custom query - for now just log the attempt
            console.log(`   ℹ️  Would search for policies containing: ${lastPart}`);
          }
        } catch (error) {
          console.log(`   ❌ Partial search error in ${currency}: ${error.message}`);
        }
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
    }

    // Test database views/tables directly
    console.log('📊 CHECKING DATABASE STRUCTURE');
    console.log('===============================');
    
    // You might need to add raw SQL queries here to understand the actual table structure
    console.log('💡 Suggestions for manual investigation:');
    console.log('1. Check if policy exists with different formatting');
    console.log('2. Verify the view names (VClient_LookUP_USD vs actual view names)');
    console.log('3. Check if policy is in a different status/table');
    console.log('4. Verify date ranges or other filtering criteria');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Additional function to test with raw SQL if needed
async function testRawSQL() {
  console.log('\n🔧 RAW SQL TEST (if needed)');
  console.log('============================');
  
  // This would help understand the actual table structure
  console.log('💡 To run manually in MSSQL:');
  console.log(`
SELECT TOP 5 * 
FROM VClient_LookUP_USD 
WHERE insurance_ref LIKE '%027148%'
OR insurance_ref LIKE '%T1/AHL%'
OR resolved_name LIKE '%027148%';

-- Also try:
SELECT DISTINCT LEFT(insurance_ref, 10) as prefix_sample
FROM VClient_LookUP_USD 
WHERE insurance_ref IS NOT NULL
ORDER BY prefix_sample;
  `);
}

// Run the debug
debugPolicySearch().then(() => {
  testRawSQL();
  console.log('🏁 Debug completed');
}).catch(error => {
  console.error('💥 Debug failed:', error.message);
});