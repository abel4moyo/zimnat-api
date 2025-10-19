// Compare Direct MSSQL Service vs API Route
const MSSQLPolicyService = require('./src/services/mssqlPolicyService');

async function compareSearchMethods() {
  console.log('🔍 COMPARING SEARCH METHODS');
  console.log('============================\n');

  const testPolicy = 'T1/AHL/USP/027148';
  
  try {
    await MSSQLPolicyService.initializeBoth();

    // Test 1: Direct MSSQL service call (like the bulk test)
    console.log('🧪 Method 1: Direct MSSQL Service (Bulk Test Way)');
    console.log('------------------------------------------------');
    
    const directResult = await MSSQLPolicyService.searchPolicies(
      testPolicy, 
      'USD', 
      'PERSONAL_ACCIDENT'
    );
    
    console.log(`✅ Direct Result: ${directResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (directResult.success) {
      console.log(`   Records Found: ${directResult.policies.length}`);
      if (directResult.policies.length > 0) {
        const policy = directResult.policies[0];
        console.log(`   Policy: ${policy.policy_number}`);
        console.log(`   Holder: ${policy.policy_holder_name}`);
        console.log(`   Product: ${policy.product_name}`);
        console.log(`   Insurance Type: ${policy.insurance_type}`);
        console.log(`   Status: ${policy.policy_status}`);
      }
    } else {
      console.log(`   Error: ${directResult.message || 'Unknown error'}`);
    }

    // Test 2: Different insurance type filters
    console.log('\n🧪 Method 2: Testing Different Insurance Type Filters');
    console.log('-----------------------------------------------------');
    
    const insuranceTypes = [null, 'General', 'Life', 'PERSONAL_ACCIDENT'];
    
    for (const insuranceType of insuranceTypes) {
      console.log(`\n   Testing with insuranceType: ${insuranceType || 'null'}`);
      
      const result = await MSSQLPolicyService.searchPolicies(
        testPolicy,
        'USD',
        insuranceType
      );
      
      if (result.success && result.policies.length > 0) {
        console.log(`   ✅ FOUND with '${insuranceType || 'null'}': ${result.policies.length} records`);
        console.log(`      Insurance Type in DB: ${result.policies[0].insurance_type}`);
        console.log(`      Product Category: ${result.policies[0].product_category}`);
      } else {
        console.log(`   ❌ NOT FOUND with '${insuranceType || 'null'}'`);
      }
    }

    // Test 3: Check what the actual insurance type mapping is
    console.log('\n🧪 Method 3: Understanding Insurance Type Mapping');
    console.log('------------------------------------------------');
    
    const allTypesResult = await MSSQLPolicyService.searchPolicies(testPolicy, 'USD', null);
    
    if (allTypesResult.success && allTypesResult.policies.length > 0) {
      console.log('   Found policies with ALL insurance types:');
      allTypesResult.policies.forEach((policy, index) => {
        console.log(`   ${index + 1}. Insurance Type: ${policy.insurance_type}`);
        console.log(`      Product Category: ${policy.product_category}`);
        console.log(`      Product Name: ${policy.product_name}`);
        console.log(`      Status: ${policy.policy_status}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Comparison failed:', error.message);
  }
}

compareSearchMethods();