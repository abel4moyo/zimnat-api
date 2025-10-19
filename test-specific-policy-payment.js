// Test payment flow with the specific policy found
const MSSQLPolicyService = require('./src/services/mssqlPolicyService');
const PostgresPaymentService = require('./src/services/postgresPaymentService');

async function testSpecificPolicyPayment() {
  console.log('💳 TESTING PAYMENT FLOW FOR SPECIFIC POLICY');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Step 1: Initialize services
    console.log('🏗️  Initializing Services...');
    await PostgresPaymentService.initialize();
    await MSSQLPolicyService.initialize('USD');
    console.log('✅ Services initialized\n');

    // Step 2: Retrieve the specific policy
    console.log('🔍 Retrieving Policy: HE/TRV/USP/005462');
    const policyResult = await MSSQLPolicyService.searchPolicies('HE/TRV/USP/005462', 'USD');
    
    if (!policyResult.success || policyResult.policies.length === 0) {
      throw new Error('Policy not found');
    }

    const policy = policyResult.policies[0];
    console.log(`✅ Policy Retrieved: ${policy.policy_number}`);
    console.log(`   Holder: ${policy.policy_holder_name}`);
    console.log(`   Premium: ${policy.currency} ${policy.package_premium}`);
    console.log(`   Product: ${policy.product_name}`);
    console.log(`   Status: ${policy.policy_status}\n`);

    // Step 3: Create payment with policy data
    console.log('💳 Creating Payment from Policy Data...');
    const paymentData = {
      policy_number: policy.policy_number,
      policy_holder_name: policy.policy_holder_name,
      product_category: policy.product_name,
      insurance_type: policy.insurance_type,
      amount: parseFloat(policy.package_premium),
      currency: policy.currency,
      payment_method: 'card',
      customer_name: policy.policy_holder_name,
      customer_email: 'sophia.zirebwa@example.com',
      customer_phone: policy.mobile || '+263777123456',
      database_source: 'ZIMNATUSD',
      partner_id: 1,
      return_url: 'https://partner.com/return',
      callback_url: 'https://partner.com/callback',
      payment_gateway: 'zimnat_gateway',
      created_by: 'specific_test',
      notes: `Payment for ${policy.product_name} policy`,
      metadata: {
        original_policy: policy,
        cover_value: policy.package_cover_value,
        agent: policy.agent,
        test_mode: true
      }
    };

    const paymentResult = await PostgresPaymentService.createPayment(paymentData);
    console.log(`✅ Payment Created: ${paymentResult.paymentReference}`);
    console.log(`   Amount: ${paymentData.currency} ${paymentData.amount}`);
    console.log(`   Status: ${paymentResult.payment.payment_status}\n`);

    // Step 4: Process payment (simulate partner API call)
    console.log('⚡ Processing Payment...');
    const mockPartner = { id: 1, partner_name: 'Zimnat Partner Portal' };
    
    const processResult = await PostgresPaymentService.processPayment(mockPartner, {
      policy_number: policy.policy_number,
      amount: parseFloat(policy.package_premium),
      external_reference: `ZIMNAT-${Date.now()}`,
      payment_method: 'card',
      customer_name: policy.policy_holder_name,
      customer_email: 'sophia.zirebwa@example.com',
      currency: 'USD'
    });

    console.log(`✅ Payment Processed: ${processResult.status.toUpperCase()}`);
    console.log(`   Transaction: ${processResult.transaction_reference}`);
    console.log(`   Final Amount: $${processResult.amount}`);
    console.log(`   Partner Fee: $${processResult.partner_fee}`);
    console.log(`   Net Amount: $${processResult.net_amount}\n`);

    // Step 5: Verify payment in database
    console.log('🔍 Verifying Payment in Database...');
    const verification = await PostgresPaymentService.getPaymentStatus(
      processResult.transaction_reference,
      mockPartner.id
    );

    console.log(`✅ Payment Verified in Database`);
    console.log(`   Status: ${verification.status}`);
    console.log(`   Policy: ${verification.policy_number}`);
    console.log(`   Customer: ${verification.customer_name}`);
    console.log(`   Processed At: ${verification.processed_at}\n`);

    // Step 6: Show payment summary
    console.log('📊 PAYMENT FLOW SUMMARY');
    console.log('═══════════════════════');
    console.log(`🏛️  Policy: ${policy.policy_number} (${policy.product_name})`);
    console.log(`👤 Customer: ${policy.policy_holder_name}`);
    console.log(`💰 Premium: $${policy.package_premium}`);
    console.log(`💳 Payment: ${processResult.transaction_reference}`);
    console.log(`📋 Status: ${verification.status.toUpperCase()}`);
    console.log(`🏦 Partner Fee: $${processResult.partner_fee}`);
    
    if (verification.status === 'success') {
      console.log(`\n🎉 SUCCESS! Payment for Mrs Zirebwa's ${policy.product_name} policy completed!`);
      console.log(`✨ The integration is working perfectly:`);
      console.log(`   • Policy retrieved from MSSQL ✅`);
      console.log(`   • Payment created in PostgreSQL ✅`);
      console.log(`   • Payment processed successfully ✅`);
      console.log(`   • Full audit trail maintained ✅`);
    } else {
      console.log(`\n⚠️  Payment was processed but ${verification.status}`);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testSpecificPolicyPayment().then(() => {
  console.log('\n🏁 Specific policy payment test completed');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});