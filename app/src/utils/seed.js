import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import { InterviewQuestion } from '../models/index.js';

dotenv.config();

const seedQuestions = [
  {
    title: 'Tell me about a time you worked on a challenging team project',
    description:
      'Describe a situation where you had to collaborate with a diverse team to achieve a common goal. Focus on your specific role, the challenges faced, and how you contributed to the team\'s success.',
    type: 'behavioral',
    difficulty: 'medium',
    category: 'teamwork',
    tags: ['collaboration', 'team-dynamics', 'communication'],
    starGuidelines: {
      situation: 'Set the context: What was the project? Who was on the team?',
      task: 'What was your specific responsibility or goal in this project?',
      action: 'What steps did you take to contribute? How did you handle challenges?',
      result: 'What was the outcome? What did you learn about teamwork?',
    },
  },
  {
    title: 'Describe a time when you had to meet a tight deadline',
    description:
      'Share an example of when you were under significant time pressure to deliver results. Explain how you prioritized, managed your time, and ensured quality despite the constraints.',
    type: 'behavioral',
    difficulty: 'medium',
    category: 'time-management',
    tags: ['deadline', 'pressure', 'prioritization', 'planning'],
    starGuidelines: {
      situation: 'What was the project and why was the deadline so tight?',
      task: 'What were you responsible for delivering?',
      action: 'How did you organize your work? What strategies did you use?',
      result: 'Did you meet the deadline? What was the quality of your work?',
    },
  },
  {
    title: 'Give me an example of when you had to solve a difficult problem',
    description:
      'Discuss a complex problem you encountered and how you approached finding a solution. Emphasize your analytical thinking, creativity, and persistence.',
    type: 'behavioral',
    difficulty: 'hard',
    category: 'problem-solving',
    tags: ['analytical-thinking', 'creativity', 'persistence', 'innovation'],
    starGuidelines: {
      situation: 'What was the problem and why was it difficult?',
      task: 'What was your role in solving it?',
      action: 'What approach did you take? What alternatives did you consider?',
      result: 'What was the solution? What impact did it have?',
    },
  },
  {
    title: 'Tell me about a time you had to adapt to a significant change',
    description:
      'Describe a situation where you faced unexpected changes and had to adjust your plans or approach. Show your flexibility and resilience.',
    type: 'behavioral',
    difficulty: 'easy',
    category: 'adaptability',
    tags: ['flexibility', 'change-management', 'resilience'],
    starGuidelines: {
      situation: 'What was the change and why was it significant?',
      task: 'How did this change affect your work?',
      action: 'How did you adapt? What steps did you take?',
      result: 'What was the outcome of your adaptation?',
    },
  },
  {
    title: 'Describe a situation where you took the initiative',
    description:
      'Share an example of when you identified an opportunity or problem and took action without being asked. Highlight your proactive approach and leadership qualities.',
    type: 'behavioral',
    difficulty: 'medium',
    category: 'initiative',
    tags: ['proactive', 'leadership', 'self-starter', 'ownership'],
    starGuidelines: {
      situation: 'What did you notice that others might have missed?',
      task: 'What did you decide needed to be done?',
      action: 'What steps did you take on your own initiative?',
      result: 'What was the impact of your initiative?',
    },
  },
  {
    title: 'Tell me about a time you had to resolve a conflict with a colleague',
    description:
      'Describe a professional disagreement or conflict you experienced and how you worked to resolve it. Focus on communication, empathy, and finding common ground.',
    type: 'behavioral',
    difficulty: 'hard',
    category: 'conflict-resolution',
    tags: ['communication', 'empathy', 'negotiation', 'interpersonal-skills'],
    starGuidelines: {
      situation: 'What was the nature of the conflict?',
      task: 'What was your role in resolving it?',
      action: 'What approach did you take to address the conflict?',
      result: 'How was the conflict resolved? What did you learn?',
    },
  },
  {
    title: 'Give an example of when you demonstrated leadership',
    description:
      'Share a situation where you led a team, project, or initiative. Discuss your leadership style, how you motivated others, and the results you achieved.',
    type: 'leadership',
    difficulty: 'hard',
    category: 'leadership',
    tags: ['leadership', 'motivation', 'team-building', 'vision'],
    starGuidelines: {
      situation: 'What was the context that required leadership?',
      task: 'What were you trying to achieve as a leader?',
      action: 'How did you lead? What was your approach?',
      result: 'What were the outcomes? How did your team respond?',
    },
  },
  {
    title: 'Describe a time when you had to learn something new quickly',
    description:
      'Tell about a situation where you needed to acquire new skills or knowledge under time pressure. Show your learning agility and resourcefulness.',
    type: 'behavioral',
    difficulty: 'easy',
    category: 'adaptability',
    tags: ['learning-agility', 'self-development', 'resourcefulness'],
    starGuidelines: {
      situation: 'What did you need to learn and why was time a factor?',
      task: 'What level of proficiency did you need to achieve?',
      action: 'How did you approach learning? What resources did you use?',
      result: 'Were you able to apply what you learned successfully?',
    },
  },
];

async function seedDatabase() {
  try {
    // Connect to database
    await connectDB();
    console.log('🌱 Starting database seed...');

    // Clear existing questions
    await InterviewQuestion.deleteMany({});
    console.log('🗑️  Cleared existing interview questions');

    // Insert seed questions
    const insertedQuestions = await InterviewQuestion.insertMany(seedQuestions);
    console.log(`✅ Successfully seeded ${insertedQuestions.length} interview questions`);

    // Display summary
    console.log('\n📊 Seeded Questions Summary:');
    const summary = await InterviewQuestion.aggregate([
      {
        $group: {
          _id: {
            type: '$type',
            difficulty: '$difficulty',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.type': 1, '_id.difficulty': 1 },
      },
    ]);

    summary.forEach((item) => {
      console.log(
        `  - ${item._id.type} (${item._id.difficulty}): ${item.count} question(s)`
      );
    });

    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
