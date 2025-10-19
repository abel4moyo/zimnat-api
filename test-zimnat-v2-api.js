const express = require('express');
const request = require('supertest');
const zimnatV2Routes = require('./src/routes/zimnatV2Routes');
const zimnatAuthRoutes = require('./src/routes/zimnatAuthRoutes');

// Create a test app
const app = express();
app.use(express.json());
app.use(zimnatV2Routes);
app.use(zimnatAuthRoutes);

async function testZimnatV2API() {
  console.log('🧪 Testing Zimnat API v2.0 Implementation...\n');

  try {
    // Test 1: Authentication
    console.log('1. Testing Authentication (/api/v1/auth/login)');
    const authResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        apiKey: 'test-api-key',
        partnerCode: 'FCB001'
      });

    console.log(`   Status: ${authResponse.status}`);
    console.log(`   Response: ${JSON.stringify(authResponse.body, null, 2)}`);

    if (authResponse.status !== 200) {
      console.log('❌ Authentication test failed\n');
    } else {
      console.log('✅ Authentication test passed\n');
    }

    // Extract token for subsequent requests
    const token = authResponse.body.access_token || 'Bearer test-token';

    // Test 2: Policy Search
    console.log('2. Testing Policy Search (/api/v1/policy/search)');
    const policyResponse = await request(app)
      .get('/api/v1/policy/search')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Request-Id', 'test-req-001')
      .query({
        policyNumber: 'T1/AHL/USP/027148',
        currency: 'USD',
        insuranceType: 'General'
      });

    console.log(`   Status: ${policyResponse.status}`);
    console.log(`   Response: ${JSON.stringify(policyResponse.body, null, 2)}`);

    if (policyResponse.status !== 200) {
      console.log('❌ Policy search test failed\n');
    } else {
      console.log('✅ Policy search test passed\n');
    }

    // Test 3: Payment Notification
    console.log('3. Testing Payment Notification (/api/v1/payment/process)');
    const paymentData = {
      externalReference: 'EXT-1757682990116-QJSXKX',
      policyHolderId: 'BARRYRONALD',
      policyNumber: 'T1/AHL/USP/027148',
      currency: 'USD',
      amount: 40.00,
      paymentMethod: 'CARD',
      customerName: 'Mr BARRY RONALD',
      customerEmail: 'barry@example.com',
      customerMobileNo: '+263777123456',
      insurance_type: 'General',
      policyType: 'Engineering',
      processed_at: '2025-09-12T13:16:31.153Z',
      return_url: 'https://callbackurl.com',
      callback_url: 'https://callbackurl.com'
    };

    const paymentResponse = await request(app)
      .post('/api/v1/payment/process')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Request-Id', 'test-req-002')
      .send(paymentData);

    console.log(`   Status: ${paymentResponse.status}`);
    console.log(`   Response: ${JSON.stringify(paymentResponse.body, null, 2)}`);

    if (paymentResponse.status !== 200) {
      console.log('❌ Payment notification test failed\n');
    } else {
      console.log('✅ Payment notification test passed\n');
    }

    // Test 4: Payment Status Enquiry
    console.log('4. Testing Payment Status Enquiry (/api/v1/payments/status/externalReference)');
    const statusResponse = await request(app)
      .get('/api/v1/payments/status/externalReference=EXT-1757682990116-QJSXKX')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Request-Id', 'test-req-003');

    console.log(`   Status: ${statusResponse.status}`);
    console.log(`   Response: ${JSON.stringify(statusResponse.body, null, 2)}`);

    if (statusResponse.status !== 200) {
      console.log('❌ Payment status enquiry test failed\n');
    } else {
      console.log('✅ Payment status enquiry test passed\n');
    }

    // Test 5: Payment Reversal
    console.log('5. Testing Payment Reversal (/api/v1/payments/reversal)');
    const reversalData = {
      extReference: 'TXN-1757685736788-KL494F',
      originalExtReference: 'TXN-1757685736788-KL494F',
      receiptNumber: 'RCPT20250905-001',
      reason: 'Customer requested reversal due to duplicate charge',
      initiatedBy: 'PartnerBank123',
      requestedAt: '2025-09-12T15:35:00.000Z'
    };

    const reversalResponse = await request(app)
      .post('/api/v1/payments/reversal')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Request-Id', 'test-req-004')
      .send(reversalData);

    console.log(`   Status: ${reversalResponse.status}`);
    console.log(`   Response: ${JSON.stringify(reversalResponse.body, null, 2)}`);

    if (reversalResponse.status !== 200) {
      console.log('❌ Payment reversal test failed\n');
    } else {
      console.log('✅ Payment reversal test passed\n');
    }

    // Test 6: Reconciliation Export
    console.log('6. Testing Reconciliation Export (/v1/payments/reconciliations)');
    const reconResponse = await request(app)
      .get('/v1/payments/reconciliations')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Request-Id', 'test-req-005')
      .query({
        from: '2025-09-01',
        to: '2025-09-30',
        page: 1,
        pageSize: 500
      });

    console.log(`   Status: ${reconResponse.status}`);
    console.log(`   Response: ${JSON.stringify(reconResponse.body, null, 2)}`);

    if (reconResponse.status !== 200) {
      console.log('❌ Reconciliation export test failed\n');
    } else {
      console.log('✅ Reconciliation export test passed\n');
    }

    console.log('🎉 All Zimnat API v2.0 tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testZimnatV2API();
}

module.exports = { testZimnatV2API, app };