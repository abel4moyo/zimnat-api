// test-simple.js - Simple Node.js script to test your API
const http = require('http');

function testLogin() {
  const postData = JSON.stringify({
    partner_code: "FCB",
    api_key: "fcb-api-key-12345"
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🚀 Testing login endpoint...');
  console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);
  console.log('Body:', postData);

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('\n📥 Response:');
      try {
        const jsonResponse = JSON.parse(data);
        console.log(JSON.stringify(jsonResponse, null, 2));
        
        if (jsonResponse.success) {
          console.log('\n✅ Login successful!');
          console.log('Access Token (first 50 chars):', jsonResponse.data.access_token.substring(0, 50) + '...');
          
          // Test using the token
          testWithToken(jsonResponse.data.access_token);
        } else {
          console.log('\n❌ Login failed:', jsonResponse.error);
        }
      } catch (e) {
        console.log('Raw response:', data);
        console.log('Parse error:', e.message);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
  });

  req.write(postData);
  req.end();
}

function testWithToken(token) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/partners',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  console.log('\n🔐 Testing API with JWT token...');

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ JWT authentication successful!');
      } else {
        console.log('❌ JWT authentication failed');
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ JWT test error:', e.message);
  });

  req.end();
}

function testHealth() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET'
  };

  console.log('🏥 Testing health endpoint...');

  const req = http.request(options, (res) => {
    console.log(`Health Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Server is healthy');
        // Proceed to login test
        testLogin();
      } else {
        console.log('❌ Server health check failed');
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Server is not running:', e.message);
    console.log('\n💡 Please start your server first with: npm start');
  });

  req.end();
}

// Start tests
console.log('🚀 Starting API Tests...');
testHealth();