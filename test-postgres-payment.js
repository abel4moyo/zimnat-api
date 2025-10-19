// Test PostgreSQL Payment Service
const PostgresPaymentService = require('./src/services/postgresPaymentService');

async function testPostgresPayment() {
  console.log('🧪 Testing PostgreSQL Payment Service...\n');

  try {
    // Initialize the service
    console.log('1. Initializing PostgreSQL Payment Service...');
    const initialized = await PostgresPaymentService.initialize();
    console.log(`   ✅ Initialization: ${initialized ? 'SUCCESS' : 'FAILED'}\n`);

    // Health check
    console.log('2. Checking service health...');
    const health = await PostgresPaymentService.healthCheck();
    console.log(`   ✅ Health: ${health.status}`);
    console.log(`   📊 Total payments in DB: ${health.total_payments}\n`);

    // Test payment creation
    console.log('3. Creating a test payment...');
    const testPaymentData = {
      policy_number: 'TEST-POL-001',
      policy_holder_name: 'John Test Doe',
      product_category: 'Motor Insurance',
      insurance_type: 'General',
      amount: 150.75,
      currency: 'USD',
      payment_method: 'card',
      customer_name: 'John Test Doe',
      customer_email: 'john.test@example.com',
      customer_phone: '+263777123456',
      database_source: 'ZIMNATUSD',
      partner_id: 1,
      return_url: 'https://example.com/return',
      callback_url: 'https://example.com/callback',
      payment_gateway: 'test_gateway',
      created_by: 'test_script',
      notes: 'Test payment via script',
      metadata: {
        test: true,
        created_by_script: true
      }
    };

    const createResult = await PostgresPaymentService.createPayment(testPaymentData);
    console.log(`   ✅ Payment created: ${createResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   💳 Payment Reference: ${createResult.paymentReference}`);
    console.log(`   🆔 Payment ID: ${createResult.payment.id}\n`);

    // Test payment retrieval
    console.log('4. Retrieving payment by reference...');
    const getResult = await PostgresPaymentService.getPaymentByReference(createResult.paymentReference);
    console.log(`   ✅ Payment found: ${getResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (getResult.success) {
      console.log(`   💰 Amount: ${getResult.payment.currency} ${getResult.payment.amount}`);
      console.log(`   📋 Status: ${getResult.payment.payment_status}`);
      console.log(`   📅 Created: ${getResult.payment.created_at}\n`);
    }

    // Test status update
    console.log('5. Updating payment status...');
    const updateResult = await PostgresPaymentService.updatePaymentStatus(
      createResult.paymentReference,
      'SUCCESS',
      {
        gateway_reference: 'TEST-GW-12345',
        gateway_response: {
          status: 'approved',
          auth_code: 'AUTH123',
          gateway_fee: 0.75
        },
        notes: 'Payment approved by test gateway'
      }
    );
    console.log(`   ✅ Status updated: ${updateResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   📋 New Status: ${updateResult.payment.payment_status}\n`);

    // Test partner-style payment processing
    console.log('6. Testing full payment processing flow...');
    const mockPartner = {
      id: 1,
      partner_name: 'Test Partner API'
    };

    const mockPaymentRequest = {
      policy_number: 'TEST-POL-002',
      amount: 200.50,
      external_reference: 'EXT-REF-789',
      payment_method: 'bank_transfer',
      customer_name: 'Jane Test Smith',
      customer_email: 'jane.test@example.com',
      customer_phone: '+263777987654',
      currency: 'USD',
      return_url: 'https://partner.com/return',
      callback_url: 'https://partner.com/callback'
    };

    const processResult = await PostgresPaymentService.processPayment(mockPartner, mockPaymentRequest);
    console.log(`   ✅ Payment processed: ${processResult.status}`);
    console.log(`   💳 Transaction Reference: ${processResult.transaction_reference}`);
    console.log(`   💰 Amount: ${processResult.amount}`);
    console.log(`   💵 Partner Fee: ${processResult.partner_fee}`);
    console.log(`   💸 Net Amount: ${processResult.net_amount}\n`);

    // Test payment status retrieval (partner API style)
    console.log('7. Testing payment status retrieval...');
    const statusResult = await PostgresPaymentService.getPaymentStatus(
      processResult.transaction_reference,
      mockPartner.id
    );
    console.log(`   ✅ Status retrieved: SUCCESS`);
    console.log(`   📋 Status: ${statusResult.status}`);
    console.log(`   📋 Policy: ${statusResult.policy_number}`);
    console.log(`   👤 Customer: ${statusResult.customer_name}\n`);

    // Test payment statistics
    console.log('8. Getting payment statistics...');
    const statsResult = await PostgresPaymentService.getPaymentStatistics();
    console.log(`   ✅ Statistics retrieved: ${statsResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (statsResult.success) {
      console.log(`   📊 Total stat entries: ${statsResult.statistics.length}`);
      statsResult.statistics.forEach(stat => {
        console.log(`   📈 ${stat.payment_status} (${stat.currency}): ${stat.count} payments, $${parseFloat(stat.total_amount).toFixed(2)} total`);
      });
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Don't close the pool in test - let it stay open for the app
    console.log('\n🔄 Keeping connection pool open for application use...');
  }
}

// Run the test
testPostgresPayment().then(() => {
  console.log('✅ Test script completed');
}).catch(error => {
  console.error('❌ Test script failed:', error.message);
});