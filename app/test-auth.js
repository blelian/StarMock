const BASE_URL = 'http://localhost:3000/api';
const cookieJar = new Map();

// Helper to manage cookies
function setCookie(response) {
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    cookies.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      cookieJar.set(name.trim(), value.trim());
    });
  }
}

function getCookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📍 ${options.method || 'GET'} ${url}`);
  
  try {
    // Add cookies to request
    if (cookieJar.size > 0) {
      options.headers = {
        ...options.headers,
        'Cookie': getCookieHeader(),
      };
    }

    const response = await fetch(url, options);
    
    // Save cookies from response
    setCookie(response);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status})`);
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ Failed (${response.status})`);
      console.log('Error:', JSON.stringify(data, null, 2));
    }
    
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Authentication API Tests\n');
  console.log('=' .repeat(50));

  // Test 1: Health Check
  await testEndpoint(
    'Health Check',
    `${BASE_URL}/health`
  );

  // Test 2: Auth Status (Not Logged In)
  await testEndpoint(
    'Auth Status (Guest)',
    `${BASE_URL}/auth/status`
  );

  // Test 3: Signup - Missing Fields
  await testEndpoint(
    'Signup - Missing Fields',
    `${BASE_URL}/auth/signup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    }
  );

  // Test 4: Signup - Invalid Email
  await testEndpoint(
    'Signup - Invalid Email',
    `${BASE_URL}/auth/signup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      }),
    }
  );

  // Test 5: Signup - Weak Password
  await testEndpoint(
    'Signup - Weak Password',
    `${BASE_URL}/auth/signup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      }),
    }
  );

  // Test 6: Signup - Success
  const signupResult = await testEndpoint(
    'Signup - Success',
    `${BASE_URL}/auth/signup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@starmock.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      }),
    }
  );

  // Test 7: Get Current User (After Signup)
  if (signupResult.ok) {
    await testEndpoint(
      'Get Current User (After Signup)',
      `${BASE_URL}/auth/me`
    );
  }

  // Test 8: Auth Status (Logged In)
  await testEndpoint(
    'Auth Status (Authenticated)',
    `${BASE_URL}/auth/status`
  );

  // Test 9: Logout
  await testEndpoint(
    'Logout',
    `${BASE_URL}/auth/logout`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  // Clear cookies
  cookieJar.clear();

  // Test 10: Get Current User (After Logout)
  await testEndpoint(
    'Get Current User (After Logout - Should Fail)',
    `${BASE_URL}/auth/me`
  );

  // Test 11: Login - Invalid Credentials
  await testEndpoint(
    'Login - Invalid Credentials',
    `${BASE_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@starmock.com',
        password: 'WrongPassword',
      }),
    }
  );

  // Test 12: Login - Success
  const loginResult = await testEndpoint(
    'Login - Success',
    `${BASE_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@starmock.com',
        password: 'SecurePass123!',
      }),
    }
  );

  // Test 13: Get Current User (After Login)
  if (loginResult.ok) {
    await testEndpoint(
      'Get Current User (After Login)',
      `${BASE_URL}/auth/me`
    );
  }

  // Test 14: Duplicate Signup (Should Fail)
  await testEndpoint(
    'Signup - Duplicate User',
    `${BASE_URL}/auth/signup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@starmock.com',
        password: 'AnotherPass123!',
        firstName: 'Another',
        lastName: 'User',
      }),
    }
  );

  console.log('\n' + '='.repeat(50));
  console.log('✅ Authentication API Tests Complete!\n');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
