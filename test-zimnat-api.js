/**
 * ===================================================================
 * ZIMNAT API v2.1 - Comprehensive Test Script
 * File: test-zimnat-api.js
 * ===================================================================
 *
 * This script tests all ZIMNAT API v2.1 endpoints in sequence.
 *
 * Usage:
 *   node test-zimnat-api.js
 *
 * Prerequisites:
 *   1. Server must be running (npm start or npm run dev)
 *   2. Database migrations must be run (npx knex migrate:latest)
 *   3. Database seeds must be run (npx knex seed:run)
 *   4. RSA keys must be generated (node scripts/generate-rsa-keys.js)
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'fcb-api-key-12345';
const PARTNER_CODE = process.env.TEST_PARTNER_CODE || 'FCB';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Store token and references for subsequent tests
let authToken = null;
let requestId = null;
let paymentExternalRef = null;
let paymentTxnRef = null;
let receiptNumber = null;
let quoteReferenceId = null;
let reversalReference = null;

/**
 * Generate unique request ID
 */
function generateRequestId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TEST-${timestamp}-${random}`;
}

/**
 * Print section header
 */
function printSection(title) {
  console.log('\n' + colors.cyan + '='.repeat(70));
  console.log(colors.bright + title);
  console.log(colors.cyan + '='.repeat(70) + colors.reset + '\n');
}

/**
 * Print test result
 */
function printResult(testName, success, details = null) {
  const status = success ?
    `${colors.green}✓ PASS${colors.reset}` :
    `${colors.red}✗ FAIL${colors.reset}`;

  console.log(`${status} | ${testName}`);

  if (details) {
    console.log(`  ${colors.yellow}→${colors.reset} ${details}`);
  }

  results.tests.push({ testName, success, details });
  if (success) {
    results.passed++;
  } else {
    results.failed++;
  }
}

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n' + colors.cyan + '='.repeat(70));
  console.log(colors.bright + 'TEST SUMMARY');
  console.log(colors.cyan + '='.repeat(70) + colors.reset);

  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${results.skipped}${colors.reset}`);
  console.log(`Pass Rate: ${passRate}%\n`);

  if (results.failed > 0) {
    console.log(colors.red + 'Failed Tests:' + colors.reset);
    results.tests
      .filter(t => !t.success)
      .forEach(t => {
        console.log(`  - ${t.testName}`);
        if (t.details) console.log(`    ${t.details}`);
      });
    console.log('');
  }
}

/**
 * Make API request with error handling
 */
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': generateRequestId(),
        ...headers
      }
    };

    if (data) {
      if (method.toLowerCase() === 'get') {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Test 1: Authentication - Login
 */
async function testLogin() {
  printSection('TEST 1: Authentication - Login');

  const response = await makeRequest('POST', '/api/v1/auth/login', {
    apiKey: API_KEY,
    partnerCode: PARTNER_CODE
  });

  if (response.success && response.data.success && response.data.data.access_token) {
    authToken = response.data.data.access_token;
    printResult('Login successful', true, `Token: ${authToken.substring(0, 20)}...`);
    console.log(`  Expires in: ${response.data.data.expires_in}s`);
    console.log(`  Token type: ${response.data.data.token_type}`);
    console.log(`  Scope: ${response.data.data.scope}`);
  } else {
    printResult('Login failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 2: Authentication - Verify Token
 */
async function testVerifyToken() {
  printSection('TEST 2: Authentication - Verify Token');

  if (!authToken) {
    printResult('Token verification skipped', false, 'No token available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('GET', '/api/v1/auth/verify', null, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success && response.data.data.valid) {
    printResult('Token verification successful', true, `Client ID: ${response.data.data.clientId}`);
    console.log(`  Valid: ${response.data.data.valid}`);
    console.log(`  Scope: ${response.data.data.scope}`);
  } else {
    printResult('Token verification failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 3: Enum - Get All Enums
 */
async function testGetAllEnums() {
  printSection('TEST 3: Enum - Get All Enums');

  if (!authToken) {
    printResult('Get all enums skipped', false, 'No token available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('GET', '/api/v1/enums', null, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    const data = response.data.data;
    printResult('Get all enums successful', true,
      `Vehicle Types: ${data.vehicleTypes?.length}, Payment Methods: ${data.paymentMethods?.length}`);
    console.log(`  Insurance Types: ${data.insuranceTypes?.length}`);
    console.log(`  Tax Classes: ${data.taxClasses?.length}`);
    console.log(`  Suburbs/Towns: ${data.suburbsTowns?.length}`);
  } else {
    printResult('Get all enums failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 4: Enum - Get Vehicle Types
 */
async function testGetVehicleTypes() {
  printSection('TEST 4: Enum - Get Vehicle Types');

  if (!authToken) {
    printResult('Get vehicle types skipped', false, 'No token available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('GET', '/api/v1/enums/vehicleTypes', null, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    const vehicleTypes = response.data.data;
    printResult('Get vehicle types successful', true, `Count: ${vehicleTypes.length}`);
    if (vehicleTypes.length > 0) {
      console.log(`  Sample: ${vehicleTypes[0].type} (Code: ${vehicleTypes[0].code})`);
    }
  } else {
    printResult('Get vehicle types failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 5: Enum - Get Tax Classes
 */
async function testGetTaxClasses() {
  printSection('TEST 5: Enum - Get Tax Classes');

  if (!authToken) {
    printResult('Get tax classes skipped', false, 'No token available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('GET', '/api/v1/enums/taxClasses', { vehicleType: 1 }, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    const taxClasses = response.data.data;
    printResult('Get tax classes successful', true, `Count: ${taxClasses.length}`);
    if (taxClasses.length > 0) {
      console.log(`  Sample: Tax Code ${taxClasses[0].tax_code} - ${taxClasses[0].tax_description}`);
    }
  } else {
    printResult('Get tax classes failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 6: Policy Search
 */
async function testPolicySearch() {
  printSection('TEST 6: Policy Search');

  if (!authToken) {
    printResult('Policy search skipped', false, 'No token available');
    results.skipped++;
    return false;
  }

  // This will likely fail if no policy exists, but tests the endpoint
  const response = await makeRequest('GET', '/api/v1/policy/search/v2', {
    policyNumber: 'POL-TEST-001',
    currency: 'USD',
    insuranceType: 'RTA'  // Valid types: RTA, FTP, FTPF, FTPFT
  }, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    printResult('Policy search successful', true, `Policy Number: ${response.data.data.policyDetails?.policyNumber}`);
  } else if (response.status === 404) {
    printResult('Policy search - not found (expected)', true, 'Endpoint working, policy not found');
  } else {
    printResult('Policy search failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success || response.status === 404;
}

/**
 * Test 7: Process Payment
 */
async function testProcessPayment() {
  printSection('TEST 7: Process Payment');

  if (!authToken) {
    printResult('Process payment skipped', false, 'No token available');
    results.skipped++;
    return false;
  }

  paymentExternalRef = `EXT-TEST-${Date.now()}`;

  const response = await makeRequest('POST', '/api/v1/payment/process', {
    externalReference: paymentExternalRef,
    policyHolderId: 'PH-TEST-001',
    policyNumber: 'POL-TEST-001',
    currency: 'USD',
    amount: 150.00,
    paymentMethod: 'VISA',
    customerName: 'John Doe',
    customerEmail: 'john.doe@test.com',
    customerMobileNo: '+263771234567',
    insurance_type: 'Motor',
    policyType: 'Comprehensive',
    callback_url: 'https://webhook.site/test'
  }, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    paymentTxnRef = response.data.data.paymentDetails.txnReference;
    receiptNumber = response.data.data.receiptDetails?.receiptNumber;
    printResult('Process payment successful', true, `Txn Ref: ${paymentTxnRef}`);
    console.log(`  External Ref: ${paymentExternalRef}`);
    console.log(`  Receipt Number: ${receiptNumber}`);
    console.log(`  Amount: ${response.data.data.paymentDetails.amount} ${response.data.data.paymentDetails.currency}`);
  } else {
    printResult('Process payment failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 8: Get Payment Status by External Reference
 */
async function testGetPaymentByExternalRef() {
  printSection('TEST 8: Get Payment Status by External Reference');

  if (!authToken || !paymentExternalRef) {
    printResult('Get payment status skipped', false, 'No token or payment reference available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('GET', `/api/v1/payments/status/externalReference/${paymentExternalRef}`, null, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    printResult('Get payment status successful', true, `Status: ${response.data.data.status}`);
    console.log(`  Txn Ref: ${response.data.data.txnReference}`);
    console.log(`  Amount: ${response.data.data.amount} ${response.data.data.currency}`);
  } else {
    printResult('Get payment status failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 9: Get Payment Status by Transaction Reference
 */
async function testGetPaymentByTxnRef() {
  printSection('TEST 9: Get Payment Status by Transaction Reference');

  if (!authToken || !paymentTxnRef) {
    printResult('Get payment by txn ref skipped', false, 'No token or txn reference available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('GET', `/api/v1/payments/status/txnReference/${paymentTxnRef}`, null, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    printResult('Get payment by txn ref successful', true, `Status: ${response.data.data.status}`);
    console.log(`  External Ref: ${response.data.data.externalReference}`);
  } else {
    printResult('Get payment by txn ref failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 10: Create Motor Insurance Quote
 */
async function testCreateInsuranceQuote() {
  printSection('TEST 10: Create Motor Insurance Quote');

  if (!authToken) {
    printResult('Create insurance quote skipped', false, 'No token available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('POST', '/api/motor/quote/insurance', {
    externalReference: `QUOTE-TEST-${Date.now()}`,
    currency: 'USD',
    vehicles: [{
      vrn: 'ABC123',
      vehicleType: '1',
      vehicleValue: 15000,
      insuranceType: 'Comprehensive',
      durationMonths: 12,
      paymentMethod: 'VISA',
      deliveryMethod: 'Email',
      client: {
        firstName: 'John',
        lastName: 'Doe',
        idNumber: '123456789',
        email: 'john.doe@test.com',
        mobileNo: '+263771234567'
      }
    }],
    callbackUrl: 'https://webhook.site/test'
  }, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    quoteReferenceId = response.data.data.quotes[0].referenceId;
    printResult('Create insurance quote successful', true, `Quote Ref: ${quoteReferenceId}`);
    console.log(`  VRN: ${response.data.data.quotes[0].vrn}`);
    console.log(`  Total Amount: ${response.data.data.quotes[0].totalAmount} ${response.data.data.quotes[0].currency}`);
    console.log(`  Expires At: ${response.data.data.quotes[0].expiresAt}`);
  } else {
    printResult('Create insurance quote failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 11: Get Quote Status
 */
async function testGetQuoteStatus() {
  printSection('TEST 11: Get Quote Status');

  if (!authToken || !quoteReferenceId) {
    printResult('Get quote status skipped', false, 'No token or quote reference available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('POST', '/api/motor/quote/status/insurance', {
    referenceId: quoteReferenceId
  }, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    printResult('Get quote status successful', true, `Status: ${response.data.data.status}`);
    console.log(`  Quote Ref: ${response.data.data.referenceId}`);
    console.log(`  Total Amount: ${response.data.data.amounts.totalAmount}`);
  } else {
    printResult('Get quote status failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 12: Update Quote
 */
async function testUpdateQuote() {
  printSection('TEST 12: Update Quote');

  if (!authToken || !quoteReferenceId) {
    printResult('Update quote skipped', false, 'No token or quote reference available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('POST', '/api/motor/quote/update/insurance', {
    referenceId: quoteReferenceId,
    paymentMethod: 'MASTERCARD'
  }, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    printResult('Update quote successful', true, `Updated payment method`);
  } else {
    printResult('Update quote failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 13: Payment Reconciliation
 */
async function testPaymentReconciliation() {
  printSection('TEST 13: Payment Reconciliation');

  if (!authToken) {
    printResult('Payment reconciliation skipped', false, 'No token available');
    results.skipped++;
    return false;
  }

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
  const toDate = today.toISOString().split('T')[0];

  const response = await makeRequest('GET', '/v1/payments/reconciliations', {
    from: fromDate,
    to: toDate,
    page: 1,
    pageSize: 10
  }, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    printResult('Payment reconciliation successful', true,
      `Total payments: ${response.data.pagination.total}`);
    console.log(`  Page: ${response.data.pagination.page}`);
    console.log(`  Page Size: ${response.data.pagination.pageSize}`);
    console.log(`  Total Pages: ${response.data.pagination.totalPages}`);
  } else {
    printResult('Payment reconciliation failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Test 14: Request Payment Reversal
 */
async function testRequestReversal() {
  printSection('TEST 14: Request Payment Reversal');

  if (!authToken || !paymentExternalRef) {
    printResult('Request reversal skipped', false, 'No token or payment reference available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('POST', '/api/v1/payments/reversal', {
    originalExternalReference: paymentExternalRef,
    receiptNumber: receiptNumber,
    reason: 'Test reversal request',
    initiatedBy: 'test-admin@test.com'
  }, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    reversalReference = response.data.data.reversalReference;
    printResult('Request reversal successful', true, `Reversal Ref: ${reversalReference}`);
    console.log(`  Status: ${response.data.data.status}`);
    console.log(`  Amount: ${response.data.data.amount} ${response.data.data.currency}`);
  } else if (response.status === 400 && response.error?.error?.code === 'REVERSAL_NOT_ALLOWED') {
    printResult('Request reversal - not allowed (expected)', true, 'Payment not in completed status');
  } else {
    printResult('Request reversal failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success || (response.status === 400 && response.error?.error?.code === 'REVERSAL_NOT_ALLOWED');
}

/**
 * Test 15: Authentication - Logout
 */
async function testLogout() {
  printSection('TEST 15: Authentication - Logout');

  if (!authToken) {
    printResult('Logout skipped', false, 'No token available');
    results.skipped++;
    return false;
  }

  const response = await makeRequest('POST', '/api/v1/auth/logout', null, {
    Authorization: `Bearer ${authToken}`
  });

  if (response.success && response.data.success) {
    printResult('Logout successful', true, response.data.data.message);
  } else {
    printResult('Logout failed', false, JSON.stringify(response.error || response.data));
  }

  return response.success;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(colors.bright + colors.blue);
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                    ║');
  console.log('║         ZIMNAT API v2.1 - COMPREHENSIVE TEST SUITE                ║');
  console.log('║                                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  console.log(`\n${colors.yellow}Configuration:${colors.reset}`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  API Key: ${API_KEY}`);
  console.log(`  Partner Code: ${PARTNER_CODE}`);
  console.log(`  Timestamp: ${new Date().toISOString()}\n`);

  console.log(`${colors.yellow}Prerequisites:${colors.reset}`);
  console.log(`  ✓ Server running on ${BASE_URL}`);
  console.log(`  ✓ Database migrations executed`);
  console.log(`  ✓ Database seeds loaded`);
  console.log(`  ✓ RSA keys generated\n`);

  const startTime = Date.now();

  // Run all tests in sequence
  await testLogin();
  await testVerifyToken();
  await testGetAllEnums();
  await testGetVehicleTypes();
  await testGetTaxClasses();
  await testPolicySearch();
  await testProcessPayment();
  await testGetPaymentByExternalRef();
  await testGetPaymentByTxnRef();
  await testCreateInsuranceQuote();
  await testGetQuoteStatus();
  await testUpdateQuote();
  await testPaymentReconciliation();
  await testRequestReversal();
  await testLogout();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  printSummary();

  console.log(`Total Duration: ${duration}s\n`);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(colors.red + '\n✗ FATAL ERROR:' + colors.reset);
  console.error(error);
  process.exit(1);
});
