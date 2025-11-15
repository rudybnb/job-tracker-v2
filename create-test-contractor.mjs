import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { contractors } from './drizzle/schema.ts';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

async function createTestContractor() {
  const db = drizzle(DATABASE_URL);
  
  // Check if John exists
  const existing = await db.select().from(contractors).where(eq(contractors.username, 'john'));
  
  if (existing.length > 0) {
    console.log('✓ Test contractor "john" already exists:', existing[0]);
    return;
  }
  
  // Create John Smith test contractor
  const passwordHash = await bcrypt.hash('john123', 10);
  
  const result = await db.insert(contractors).values({
    username: 'john',
    passwordHash: passwordHash,
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@test.com',
    phone: '07700900000',
    type: 'contractor',
    primaryTrade: 'General Builder',
    status: 'approved',
    hourlyRate: 2200, // £22/hr in pence
    paymentType: 'day_rate',
    cisVerified: true,
    dailyRate: 176, // £22 × 8 hours = £176
  });
  
  console.log('✓ Created test contractor "john" with password "john123"');
  console.log('  ID:', result[0].insertId);
}

createTestContractor()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
