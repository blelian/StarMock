import { evaluateResponse } from './src/services/feedbackService.js';

const testResponse = `Situation: At my previous company, our customer support team was struggling with a 48-hour response time.

Task: As the newly appointed team lead, I was tasked with reducing response time to under 12 hours while maintaining quality.

Action: I analyzed our workflow and identified bottlenecks in our ticket routing system. I implemented a new priority-based triage system and trained team members.

Result: Within three months, we reduced average response time to 8 hours. Customer satisfaction scores improved by 35%.`;

const mockQuestion = {
  starGuidelines: {
    situation: "What was the context?",
    task: "What was your goal?",
    action: "What did you do?",
    result: "What was the outcome?"
  }
};

console.log('Testing feedbackService.evaluateResponse()...\n');

try {
  const result = evaluateResponse(testResponse, mockQuestion);
  console.log('✅ Success!');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('Stack:', error.stack);
}
