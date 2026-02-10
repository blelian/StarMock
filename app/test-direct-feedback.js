import mongoose from 'mongoose';
import { InterviewResponse } from './src/models/index.js';
import { evaluateResponse } from './src/services/feedbackService.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/starmock';

async function testDirectFeedback() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find a response
    const response = await InterviewResponse.findOne().populate('questionId');
    
    if (!response) {
      console.log('❌ No responses found');
      return;
    }

    console.log('Found response:', response._id);
    console.log('Question:', response.questionId?._id);
    console.log('Text length:', response.responseText?.length);
    console.log('Has starGuidelines:', !!response.questionId?.starGuidelines);
    console.log('\nResponse text:', response.responseText);
    console.log('\nSTAR Guidelines:', response.questionId?.starGuidelines);

    console.log('\n\nEvaluating...');
    const evaluation = evaluateResponse(response.responseText, response.questionId);
    
    console.log('\n✅ Evaluation successful!');
    console.log(JSON.stringify(evaluation, null, 2));

  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
  }
}

testDirectFeedback();
