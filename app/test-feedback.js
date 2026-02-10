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
      console.log(`✅ Success (${response.status})`);
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ Failed (${response.status})`);
      console.log('Error:', JSON.stringify(data, null, 2));
      if (data.error && data.error.details) {
        console.log('Error Details:', data.error.details);
      }
    }
    
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Feedback API Tests\n');
  console.log('=' .repeat(50));

  // Login
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

  // Get questions
  const questionsResult = await testEndpoint(
    'Get Questions',
    `${BASE_URL}/questions?limit=2`
  );

  if (!questionsResult.ok || questionsResult.data.questions.length === 0) {
    console.log('\n❌ Cannot proceed without questions');
    return;
  }

  const questionIds = questionsResult.data.questions.map(q => q.id);

  // Create session
  const sessionResult = await testEndpoint(
    'Create Interview Session',
    `${BASE_URL}/sessions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionIds: questionIds,
      }),
    }
  );

  if (!sessionResult.ok) {
    console.log('\n❌ Cannot proceed without session');
    return;
  }

  const sessionId = sessionResult.data.session.id;
  console.log(`\n📌 Created session ID: ${sessionId}`);

  // Submit responses with varying quality
  console.log('\n📝 Submitting responses...');

  // Response 1: Good STAR response
  await testEndpoint(
    'Submit Response 1 (Good STAR)',
    `${BASE_URL}/sessions/${sessionId}/responses`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: questionIds[0],
        responseText: `Situation: At my previous company, our customer support team was struggling with a 48-hour response time, which was hurting customer satisfaction scores.

Task: As the newly appointed team lead, I was tasked with reducing response time to under 12 hours while maintaining quality.

Action: I analyzed our workflow and identified bottlenecks in our ticket routing system. I implemented a new priority-based triage system, trained team members on efficient response templates, and set up automated notifications for urgent issues. I also established daily stand-ups to track progress and address roadblocks.

Result: Within three months, we reduced average response time to 8 hours. Customer satisfaction scores improved by 35%, and our team received recognition from leadership. The new system became the standard across all support departments.`,
      }),
    }
  );

  // Response 2: Weak response (if we have a second question)
  if (questionIds.length > 1) {
    await testEndpoint(
      'Submit Response 2 (Weak)',
      `${BASE_URL}/sessions/${sessionId}/responses`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionIds[1],
          responseText: `I worked on a project once where we had some problems. I helped fix them and things got better.`,
        }),
      }
    );
  }

  // Test 1: Get feedback before completing session
  await testEndpoint(
    'Get Feedback (Before Completion - Should Fail)',
    `${BASE_URL}/sessions/${sessionId}/feedback`
  );

  // Complete session
  await testEndpoint(
    'Complete Session',
    `${BASE_URL}/sessions/${sessionId}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  // Test 2: Get feedback after completion
  const feedbackResult = await testEndpoint(
    'Get Feedback (After Completion)',
    `${BASE_URL}/sessions/${sessionId}/feedback`
  );

  // Test 3: Get feedback again (should return cached results)
  await testEndpoint(
    'Get Feedback (Second Time - Cached)',
    `${BASE_URL}/sessions/${sessionId}/feedback`
  );

  // Test 4: Get feedback for non-existent session
  await testEndpoint(
    'Get Feedback (Non-existent Session)',
    `${BASE_URL}/sessions/000000000000000000000000/feedback`
  );

  console.log('\n' + '='.repeat(50));
  console.log('✅ Feedback API Tests Complete!\n');

  if (feedbackResult.ok && feedbackResult.data.feedback) {
    console.log('\n📊 Feedback Summary:');
    feedbackResult.data.feedback.forEach((f, index) => {
      console.log(`\nResponse ${index + 1}:`);
      console.log(`  Overall Score: ${f.scores.overall}/100`);
      console.log(`  Rating: ${f.rating}`);
      console.log(`  STAR Scores:`);
      console.log(`    - Situation: ${f.scores.situation}/100`);
      console.log(`    - Task: ${f.scores.task}/100`);
      console.log(`    - Action: ${f.scores.action}/100`);
      console.log(`    - Result: ${f.scores.result}/100`);
      console.log(`  Strengths: ${f.strengths.length}`);
      console.log(`  Suggestions: ${f.suggestions.length}`);
    });
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
