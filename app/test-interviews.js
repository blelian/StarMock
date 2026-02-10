const BASE_URL = 'http://localhost:3000/api';
const cookieJar = new Map();
let testSessionId = null;
let testQuestionIds = [];

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
  console.log('🚀 Starting Interview API Tests\n');
  console.log('=' .repeat(50));

  // First, login to get authentication
  console.log('\n📝 Setting up authentication...');
  const loginResult = await testEndpoint(
    'Login',
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

  if (!loginResult.ok) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }

  // Test 1: Get questions without filters
  const questionsResult = await testEndpoint(
    'Get Questions (No Filters)',
    `${BASE_URL}/questions`
  );

  if (questionsResult.ok && questionsResult.data.questions.length > 0) {
    testQuestionIds = questionsResult.data.questions.map(q => q.id);
    console.log(`\n📌 Captured ${testQuestionIds.length} question IDs for testing`);
  }

  // Test 2: Get questions with filters
  await testEndpoint(
    'Get Questions (Type: behavioral, Difficulty: medium)',
    `${BASE_URL}/questions?type=behavioral&difficulty=medium&limit=3`
  );

  // Test 3: Get specific question
  if (testQuestionIds.length > 0) {
    await testEndpoint(
      'Get Specific Question',
      `${BASE_URL}/questions/${testQuestionIds[0]}`
    );
  }

  // Test 4: Get non-existent question
  await testEndpoint(
    'Get Non-existent Question',
    `${BASE_URL}/questions/000000000000000000000000`
  );

  // Test 5: Create session - Missing questions
  await testEndpoint(
    'Create Session - Missing Questions',
    `${BASE_URL}/sessions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }
  );

  // Test 6: Create session - Success
  if (testQuestionIds.length >= 3) {
    const sessionResult = await testEndpoint(
      'Create Session - Success',
      `${BASE_URL}/sessions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: testQuestionIds.slice(0, 3),
        }),
      }
    );

    if (sessionResult.ok) {
      testSessionId = sessionResult.data.session.id;
      console.log(`\n📌 Created session ID: ${testSessionId}`);
    }
  }

  if (!testSessionId) {
    console.log('\n❌ Cannot proceed without session ID');
    return;
  }

  // Test 7: Get session details
  await testEndpoint(
    'Get Session Details',
    `${BASE_URL}/sessions/${testSessionId}`
  );

  // Test 8: Submit response - Missing fields
  await testEndpoint(
    'Submit Response - Missing Fields',
    `${BASE_URL}/sessions/${testSessionId}/responses`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: testQuestionIds[0],
      }),
    }
  );

  // Test 9: Submit response - Success
  await testEndpoint(
    'Submit Response - Question 1',
    `${BASE_URL}/sessions/${testSessionId}/responses`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: testQuestionIds[0],
        responseText: `Situation: In my previous role at a tech startup, our team was facing a critical deadline for a product launch. 
        
Task: As the lead developer, I needed to ensure we delivered a fully functional feature while maintaining code quality.

Action: I organized daily stand-ups, delegated tasks based on team members' strengths, implemented a code review process, and personally worked on the most complex components. I also communicated regularly with stakeholders about our progress.

Result: We successfully launched on time with zero critical bugs. The feature received positive user feedback, and our team's collaboration improved significantly, setting a new standard for future projects.`,
      }),
    }
  );

  // Test 10: Submit another response
  if (testQuestionIds.length >= 2) {
    await testEndpoint(
      'Submit Response - Question 2',
      `${BASE_URL}/sessions/${testSessionId}/responses`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: testQuestionIds[1],
          responseText: `Situation: During a major system migration, I noticed that our current approach would lead to significant downtime.

Task: I needed to find a way to minimize downtime and ensure data integrity during the migration.

Action: I researched alternative migration strategies, proposed a blue-green deployment approach to the team, created a detailed rollback plan, and conducted multiple dry runs in our staging environment.

Result: The migration completed with only 5 minutes of downtime instead of the projected 2 hours. We experienced zero data loss, and the new system performed 40% faster than the old one.`,
        }),
      }
    );
  }

  // Test 11: Get all responses for session
  await testEndpoint(
    'Get Session Responses',
    `${BASE_URL}/sessions/${testSessionId}/responses`
  );

  // Test 12: Submit response - Invalid question
  await testEndpoint(
    'Submit Response - Invalid Question ID',
    `${BASE_URL}/sessions/${testSessionId}/responses`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: '000000000000000000000000',
        responseText: 'This should fail',
      }),
    }
  );

  // Test 13: Complete session
  await testEndpoint(
    'Complete Session',
    `${BASE_URL}/sessions/${testSessionId}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  // Test 14: Try to submit response after completion
  await testEndpoint(
    'Submit Response After Completion (Should Fail)',
    `${BASE_URL}/sessions/${testSessionId}/responses`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: testQuestionIds[0],
        responseText: 'This should fail',
      }),
    }
  );

  // Test 15: Get interview history
  await testEndpoint(
    'Get Interview History',
    `${BASE_URL}/history`
  );

  // Test 16: Get interview history with filters
  await testEndpoint(
    'Get Interview History (Completed Only)',
    `${BASE_URL}/history?status=completed&limit=5`
  );

  // Test 17: Get interview history with pagination
  await testEndpoint(
    'Get Interview History (Page 1)',
    `${BASE_URL}/history?page=1&limit=2`
  );

  console.log('\n' + '='.repeat(50));
  console.log('✅ Interview API Tests Complete!\n');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
