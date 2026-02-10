import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Validating MongoDB Connection String...\n');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file');
  process.exit(1);
}

console.log('Connection String Analysis:');
console.log('=' .repeat(50));

// Check if password placeholder is still present
if (MONGODB_URI.includes('<db_password>')) {
  console.error('❌ ISSUE FOUND: Password placeholder not replaced!');
  console.error('   Current: ...olwalgeorge:<db_password>@...');
  console.error('   Fix: Replace <db_password> with your actual password\n');
  console.error('📝 Steps to fix:');
  console.error('   1. Open .env file');
  console.error('   2. Find MONGODB_URI line');
  console.error('   3. Replace <db_password> with your MongoDB Atlas password');
  console.error('   4. Save the file');
  console.error('\n⚠️  Special characters in password need URL encoding:');
  console.error('   @ → %40, # → %23, $ → %24, % → %25');
  console.error('   & → %26, + → %2B, / → %2F, : → %3A\n');
  process.exit(1);
}

// Parse connection string
try {
  const url = new URL(MONGODB_URI.replace('mongodb+srv://', 'https://'));
  
  console.log('✅ Protocol: mongodb+srv');
  console.log(`✅ Username: ${url.username}`);
  console.log(`✅ Password: ${'*'.repeat(url.password.length)} (${url.password.length} chars)`);
  console.log(`✅ Host: ${url.hostname}`);
  console.log(`✅ Database: ${MONGODB_URI.split('/').pop().split('?')[0]}`);
  
  // Check for common issues
  const warnings = [];
  
  if (url.password.length < 8) {
    warnings.push('⚠️  Password seems short (less than 8 characters)');
  }
  
  if (!MONGODB_URI.includes('retryWrites=true')) {
    warnings.push('⚠️  Missing retryWrites=true parameter');
  }
  
  if (!MONGODB_URI.includes('w=majority')) {
    warnings.push('⚠️  Missing w=majority parameter');
  }
  
  // Check for unencoded special characters in password
  const specialChars = ['@', '#', '$', '%', '&', '+', '/', ':', '=', '?'];
  const hasUnencoded = specialChars.some(char => url.password.includes(char));
  
  if (hasUnencoded) {
    warnings.push('⚠️  Password may contain unencoded special characters');
    warnings.push('   Try URL-encoding special characters in your password');
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`   ${w}`));
  } else {
    console.log('\n✅ Connection string format looks good!');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Ensure IP address is whitelisted in MongoDB Atlas');
  console.log('   2. Verify database user has correct permissions');
  console.log('   3. Run: npm run test:db');
  
} catch (error) {
  console.error('❌ Invalid connection string format');
  console.error(`   Error: ${error.message}`);
  process.exit(1);
}
