import mongoose from 'mongoose';
import FeedbackReport from './src/models/FeedbackReport.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/starmock';

async function dropOldIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('Current indexes:');
    const indexes = await FeedbackReport.collection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Drop the unique sessionId index
    try {
      await FeedbackReport.collection.dropIndex('sessionId_1');
      console.log('\n✅ Dropped sessionId_1 index');
    } catch (error) {
      console.log('\n⚠️  Could not drop index:', error.message);
    }

    console.log('\nIndexes after drop:');
    const newIndexes = await FeedbackReport.collection.getIndexes();
    console.log(JSON.stringify(newIndexes, null, 2));

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

dropOldIndex();
