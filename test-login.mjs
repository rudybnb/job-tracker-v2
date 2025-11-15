import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { contractors } from './drizzle/schema.ts';
import bcryptjs from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

async function testLogin() {
  const db = drizzle(DATABASE_URL);
  
  console.log('Testing login for username: john');
  
  // Find contractor
  const contractor = await db.select().from(contractors).where(eq(contractors.username, 'john'));
  
  if (contractor.length === 0) {
    console.log('❌ Contractor not found');
    return;
  }
  
  console.log('✓ Contractor found:', contractor[0].firstName, contractor[0].lastName);
  console.log('  Status:', contractor[0].status);
  console.log('  Password hash exists:', !!contractor[0].passwordHash);
  
  if (!contractor[0].passwordHash) {
    console.log('❌ No password hash stored');
    return;
  }
  
  // Test password
  const password = 'john123';
  console.log('\nTesting password:', password);
  
  try {
    const match = await bcryptjs.compare(password, contractor[0].passwordHash);
    console.log('Password match:', match ? '✓ YES' : '❌ NO');
    
    if (!match) {
      console.log('\nTrying to create new hash for comparison:');
      const newHash = await bcryptjs.hash(password, 10);
      console.log('New hash:', newHash);
      console.log('Stored hash:', contractor[0].passwordHash);
    }
  } catch (error) {
    console.log('❌ Error comparing passwords:', error.message);
  }
}

testLogin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
