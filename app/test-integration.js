/**
 * Integration Tests - End-to-End Workflow Testing
 * 
 * Tests complete user journeys through the application:
 * 1. User Registration → Login → Interview → Feedback
 * 2. Session Management and History
 * 3. Error Handling and Edge Cases
 */

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

function clearCookies() {
  cookieJar.clear();
}

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 ${name}`);
  
  try {
    if (cookieJar.size > 0) {
      options.headers = {
        ...options.headers,
        'Cookie': getCookieHeader(),
      };
    }

    const response = await fetch(url, options);
    setCookie(response);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ ${response.status} - ${data.message || 'Success'}`);
    } else {
      console.log(`   ❌ ${response.status} - ${data.error?.message || 'Failed'}`);
    }
    
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

let testStats = {
  passed: 0,
  failed: 0,
  total: 0
};

function assert(condition, message) {
  testStats.total++;
  if (condition) {
    testStats.passed++;
    console.log(`   ✓ ${message}`);
  } else {
    testStats.failed++;
    console.log(`   ✗ ${message}`);
  }
}

async function testCompleteUserJourney() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Integration Test Suite: Complete User Journey');
  console.log('='.repeat(60));

  const timestamp = Date.now();
  const testEmail = `integration-test-${timestamp}@starmock.com`;
  let sessionId = null;
  let responseIds = [];

  // Test 1: User Registration
  console.log('\n📋 Test Suite 1: User Registration & Authentication');
  console.log('-'.repeat(60));

  const signupResult = await testEndpoint(
    'User Signup',
    `${BASE_URL}/auth/signup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        firstName: 'Integration',
        lastName: 'Test',
      }),
    }
  );
  assert(signupResult.ok, 'User registration successful');
  assert(signupResult.data?.user?.email === testEmail, 'User email matches');
  assert(cookieJar.size > 0, 'Session cookie set after signup');

  // Test 2: Check Authentication Status
  const statusResult = await testEndpoint(
    'Check Auth Status',
    `${BASE_URL}/auth/status`
  );
  assert(statusResult.ok, 'Auth status check successful');
  assert(statusResult.data?.isAuthenticated === true, 'User is authenticated');

  // Test 3: Get User Profile
  const profileResult = await testEndpoint(
    'Get User Profile',
    `${BASE_URL}/auth/me`
  );
  assert(profileResult.ok, 'Profile retrieval successful');
  assert(profileResult.data?.user?.email === testEmail, 'Profile email matches');

  const userId = profileResult.data?.user?.id;

  // Test 4: Logout
  await testEndpoint('User Logout', `${BASE_URL}/auth/logout`, { method: 'POST' });
  
  const statusAfterLogout = await testEndpoint(
    'Check Auth After Logout',
    `${BASE_URL}/auth/status`
  );
  assert(statusAfterLogout.data?.isAuthenticated === false, 'User logged out successfully');

  // Test 5: Login Again
  const loginResult = await testEndpoint(
    'User Login',
    `${BASE_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
      }),
    }
  );
  assert(loginResult.ok, 'Login successful');
  assert(cookieJar.size > 0, 'Session cookie set after login');

  // Test 6: Interview Question Discovery
  console.log('\n📋 Test Suite 2: Interview Question Discovery');
  console.log('-'.repeat(60));

  const questionsResult = await testEndpoint(
    'Get All Questions',
    `${BASE_URL}/questions?limit=5`
  );
  assert(questionsResult.ok, 'Questions retrieved successfully');
  assert(questionsResult.data?.questions?.length > 0, 'At least one question returned');
  assert(questionsResult.data?.count > 0, 'Count matches questions');

  // Test with filters
  const behavioralResult = await testEndpoint(
    'Get Behavioral Questions',
    `${BASE_URL}/questions?type=behavioral&limit=3`
  );
  assert(behavioralResult.ok, 'Filtered questions retrieved');
  
  const hardQuestionsResult = await testEndpoint(
    'Get Hard Questions',
    `${BASE_URL}/questions?difficulty=hard&limit=2`
  );
  assert(hardQuestionsResult.ok, 'Difficulty-filtered questions retrieved');

  // Get specific question
  const questionId = questionsResult.data.questions[0].id;
  const singleQuestionResult = await testEndpoint(
    'Get Single Question',
    `${BASE_URL}/questions/${questionId}`
  );
  assert(singleQuestionResult.ok, 'Single question retrieved');
  assert(singleQuestionResult.data?.question?.id === questionId, 'Question ID matches');

  // Test 7: Complete Interview Session
  console.log('\n📋 Test Suite 3: Complete Interview Session');
  console.log('-'.repeat(60));

  // Start interview session
  const questionIds = questionsResult.data.questions.slice(0, 3).map(q => q.id);
  const sessionResult = await testEndpoint(
    'Start Interview Session',
    `${BASE_URL}/sessions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds }),
    }
  );
  assert(sessionResult.ok, 'Session created successfully');
  assert(sessionResult.data?.session?.status === 'in_progress', 'Session status is in_progress');
  assert(sessionResult.data?.session?.questionCount === 3, 'Correct question count');
  
  sessionId = sessionResult.data.session.id;

  // Get session details
  const sessionDetailsResult = await testEndpoint(
    'Get Session Details',
    `${BASE_URL}/sessions/${sessionId}`
  );
  assert(sessionDetailsResult.ok, 'Session details retrieved');
  assert(sessionDetailsResult.data?.session?.id === sessionId, 'Session ID matches');

  // Submit responses
  const responses = [
    `Situation: In my role as a team lead at TechCorp, we faced a critical deadline for our Q4 product launch.

Task: I needed to coordinate a team of 8 developers, ensure code quality, and deliver on time despite 2 team members being out sick.

Action: I reorganized the sprint, prioritized critical features, implemented daily stand-ups, and personally took on some coding tasks. I also set up automated testing to catch issues early and maintained clear communication with stakeholders.

Result: We successfully launched on time with 98% test coverage. The product received positive feedback, and our team's collaboration improved significantly. Management recognized our achievement with a team award.`,
    
    `Situation: Our customer support system was receiving complaints about slow response times.

Task: As a junior developer, I took initiative to investigate and propose a solution.

Action: I analyzed the system logs, identified database query bottlenecks, optimized the queries, and added caching. I documented my findings and presented them to the senior team.

Result: Response times improved by 60%, customer satisfaction increased, and I was promoted to mid-level developer.`,
    
    `I worked on a project and helped fix some problems. Things got better after that.`
  ];

  for (let i = 0; i < questionIds.length; i++) {
    const responseResult = await testEndpoint(
      `Submit Response ${i + 1}`,
      `${BASE_URL}/sessions/${sessionId}/responses`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionIds[i],
          responseText: responses[i],
        }),
      }
    );
    assert(responseResult.ok, `Response ${i + 1} submitted successfully`);
    if (responseResult.ok) {
      responseIds.push(responseResult.data.response.id);
    }
  }

  // Get all responses
  const allResponsesResult = await testEndpoint(
    'Get All Session Responses',
    `${BASE_URL}/sessions/${sessionId}/responses`
  );
  assert(allResponsesResult.ok, 'All responses retrieved');
  assert(allResponsesResult.data?.responses?.length === 3, 'All 3 responses returned');

  // Try to get feedback before completion (should fail)
  const earlyFeedbackResult = await testEndpoint(
    'Get Feedback Before Completion',
    `${BASE_URL}/sessions/${sessionId}/feedback`
  );
  assert(!earlyFeedbackResult.ok, 'Feedback blocked before session completion');
  assert(earlyFeedbackResult.status === 400, 'Returns 400 status');

  // Complete session
  const completeResult = await testEndpoint(
    'Complete Interview Session',
    `${BASE_URL}/sessions/${sessionId}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  assert(completeResult.ok, 'Session completed successfully');
  assert(completeResult.data?.session?.status === 'completed', 'Session status is completed');
  assert(completeResult.data?.session?.duration !== undefined, 'Duration calculated');

  // Test 8: Feedback Generation
  console.log('\n📋 Test Suite 4: Feedback Generation & Analysis');
  console.log('-'.repeat(60));

  const feedbackResult = await testEndpoint(
    'Generate Feedback',
    `${BASE_URL}/sessions/${sessionId}/feedback`
  );
  assert(feedbackResult.ok, 'Feedback generated successfully');
  assert(feedbackResult.data?.feedback?.length === 3, 'Feedback for all 3 responses');
  assert(feedbackResult.data?.feedback[0]?.scores?.overall !== undefined, 'Overall score present');
  assert(feedbackResult.data?.feedback[0]?.rating !== undefined, 'Rating present');
  assert(feedbackResult.data?.feedback[0]?.strengths?.length > 0, 'Strengths provided');
  assert(feedbackResult.data?.feedback[0]?.suggestions?.length > 0, 'Suggestions provided');

  // Verify score differences (good vs weak responses)
  const feedback = feedbackResult.data?.feedback || [];
  if (feedback.length === 3) {
    const score1 = feedback[0].scores.overall;
    const score3 = feedback[2].scores.overall;
    assert(score1 > score3, 'Better response has higher score');
    console.log(`   📊 Response 1 score: ${score1}, Response 3 score: ${score3}`);
  }

  // Get cached feedback (should be instant)
  const cachedFeedbackResult = await testEndpoint(
    'Get Cached Feedback',
    `${BASE_URL}/sessions/${sessionId}/feedback`
  );
  assert(cachedFeedbackResult.ok, 'Cached feedback retrieved');
  assert(cachedFeedbackResult.data?.feedback?.length === 3, 'Same feedback returned');

  // Test 9: Interview History
  console.log('\n📋 Test Suite 5: Interview History & Tracking');
  console.log('-'.repeat(60));

  const historyResult = await testEndpoint(
    'Get Interview History',
    `${BASE_URL}/history?page=1&limit=10`
  );
  assert(historyResult.ok, 'History retrieved successfully');
  assert(historyResult.data?.sessions?.length > 0, 'At least one session in history');
  assert(historyResult.data?.pagination !== undefined, 'Pagination info present');

  // Filter by completed status
  const completedHistoryResult = await testEndpoint(
    'Get Completed Sessions',
    `${BASE_URL}/history?status=completed&limit=5`
  );
  assert(completedHistoryResult.ok, 'Filtered history retrieved');

  // Verify our session is in history
  const historyHasSession = historyResult.data?.sessions?.some(s => s.id === sessionId);
  assert(historyHasSession, 'Current session appears in history');

  // Test 10: Error Handling & Edge Cases
  console.log('\n📋 Test Suite 6: Error Handling & Edge Cases');
  console.log('-'.repeat(60));

  // Try to access non-existent session
  const notFoundResult = await testEndpoint(
    'Access Non-existent Session',
    `${BASE_URL}/sessions/000000000000000000000000`
  );
  assert(!notFoundResult.ok && notFoundResult.status === 404, 'Returns 404 for invalid session');

  // Try to submit response with missing fields
  const invalidResponseResult = await testEndpoint(
    'Submit Invalid Response',
    `${BASE_URL}/sessions/${sessionId}/responses`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: questionIds[0] }), // Missing responseText
    }
  );
  assert(!invalidResponseResult.ok && invalidResponseResult.status === 400, 'Validates required fields');

  // Try to complete already completed session
  const doubleCompleteResult = await testEndpoint(
    'Complete Already Completed Session',
    `${BASE_URL}/sessions/${sessionId}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  assert(!doubleCompleteResult.ok, 'Prevents double completion');

  // Test unauthenticated access
  clearCookies();
  const unauthResult = await testEndpoint(
    'Access Protected Route Without Auth',
    `${BASE_URL}/sessions`
  );
  assert(!unauthResult.ok && unauthResult.status === 401, 'Blocks unauthenticated access');

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Integration Test Results');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testStats.total}`);
  console.log(`✅ Passed: ${testStats.passed}`);
  console.log(`❌ Failed: ${testStats.failed}`);
  console.log(`📈 Success Rate: ${((testStats.passed / testStats.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (testStats.failed === 0) {
    console.log('\n🎉 All integration tests passed!\n');
    return 0;
  } else {
    console.log(`\n⚠️  ${testStats.failed} test(s) failed.\n`);
    return 1;
  }
}

// Run tests
testCompleteUserJourney()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('\n💥 Test suite failed with error:', error);
    process.exit(1);
  });
