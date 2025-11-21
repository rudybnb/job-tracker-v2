import { getDb } from './server/db.ts';
import { contractors } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const db = await getDb();

// Get Mohamed's current data
const result = await db.select().from(contractors).where(eq(contractors.id, 90001));

if (result.length === 0) {
  console.log('Mohamed not found');
  process.exit(1);
}

const mohamed = result[0];
console.log('Current data:');
console.log('ID:', mohamed.id);
console.log('Name:', mohamed.firstName, mohamed.lastName);
console.log('Username:', mohamed.username);
console.log('Email:', mohamed.email);
console.log('Has password:', mohamed.passwordHash ? 'Yes' : 'No');

// Reset password to mohamed123
const newPassword = 'mohamed123';
const hashedPassword = await bcrypt.hash(newPassword, 10);

await db.update(contractors)
  .set({ passwordHash: hashedPassword })
  .where(eq(contractors.id, 90001));

console.log('\nPassword reset successfully!');
console.log('New credentials:');
console.log('Username:', mohamed.username);
console.log('Password:', newPassword);

process.exit(0);
