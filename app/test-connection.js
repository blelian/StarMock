import connectDB from './src/config/database.js';

async function testConnection() {
  try {
    console.log('🧪 Testing MongoDB connection...\n');
    
    await connectDB();
    
    console.log('\n✅ Connection test successful!');
    console.log('✅ Your MongoDB setup is complete and working.');
    console.log('\nNext steps:');
    console.log('1. Run: npm run seed (to populate interview questions)');
    console.log('2. Run: npm start (to start the server)');
    console.log('3. Visit: http://localhost:3000/api/health');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your MONGODB_URI in .env file');
    console.error('2. Replace <db_password> with your actual password');
    console.error('3. Ensure your IP is whitelisted in MongoDB Atlas');
    console.error('4. Verify the connection string format');
    process.exit(1);
  }
}

testConnection();
