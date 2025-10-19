// Bulk Policy Test Script
const MSSQLPolicyService = require('./src/services/mssqlPolicyService');

// Add your Excel policy numbers here
const testPolicies = [
  'T1/AHL/USP/027148',
  'HE/TRV/USP/005462', // Known working
  // Add more from your Excel file here - examples:
  // 'T1/AHL/USP/027149',
  // 'HE/TRV/USP/005463',
  // 'HCP/USP/123456',
  // 'MOT/USP/789012',
];

async function testBulkPolicies() {
  console.log('🔍 BULK POLICY TESTING');
  console.log('======================\n');

  await MSSQLPolicyService.initializeBoth();

  const results = {
    found: [],
    notFound: [],
    errors: []
  };

  for (const policyNumber of testPolicies) {
    console.log(`Testing: ${policyNumber}`);
    
    let found = false;
    
    // Test all combinations
    const combinations = [
      { currency: 'USD', productType: 'PERSONAL_ACCIDENT' },
      { currency: 'ZIG', productType: 'PERSONAL_ACCIDENT' },
      { currency: 'USD', productType: 'HOSPITAL_CASH_PLAN' },
      { currency: 'ZIG', productType: 'HOSPITAL_CASH_PLAN' },
      { currency: 'USD', productType: 'TRAVEL' },
      { currency: 'ZIG', productType: 'TRAVEL' },
    ];

    for (const combo of combinations) {
      try {
        const result = await MSSQLPolicyService.searchPolicies(
          policyNumber, 
          combo.currency, 
          combo.productType
        );
        
        if (result.success && result.policies.length > 0) {
          console.log(`   ✅ Found in ${combo.currency} as ${combo.productType}`);
          results.found.push({
            policyNumber,
            currency: combo.currency,
            productType: combo.productType,
            details: result.policies[0]
          });
          found = true;
          break;
        }
      } catch (error) {
        results.errors.push({ policyNumber, error: error.message });
      }
    }
    
    if (!found) {
      console.log(`   ❌ Not found in any database/product type`);
      results.notFound.push(policyNumber);
    }
    
    console.log('');
  }

  // Summary
  console.log('📊 SUMMARY');
  console.log('==========');
  console.log(`✅ Found: ${results.found.length}`);
  console.log(`❌ Not Found: ${results.notFound.length}`);
  console.log(`⚠️  Errors: ${results.errors.length}\n`);

  if (results.found.length > 0) {
    console.log('✅ FOUND POLICIES:');
    results.found.forEach(item => {
      console.log(`   ${item.policyNumber} → ${item.currency} (${item.productType})`);
    });
    console.log('');
  }

  if (results.notFound.length > 0) {
    console.log('❌ NOT FOUND:');
    results.notFound.forEach(policy => {
      console.log(`   ${policy}`);
    });
  }
}

testBulkPolicies();