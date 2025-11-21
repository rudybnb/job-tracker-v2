import { getDb } from './server/db.ts';
import { contractors } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const db = await getDb();
const result = await db.select({
  id: contractors.id,
  firstName: contractors.firstName,
  lastName: contractors.lastName,
  username: contractors.username,
  email: contractors.email
}).from(contractors).where(eq(contractors.id, 90001));

if (result.length > 0) {
  const c = result[0];
  console.log('=== Mohamed Guizeni Login Details ===');
  console.log('ID:', c.id);
  console.log('Name:', c.firstName, c.lastName);
  console.log('Email:', c.email);
  console.log('Username:', c.username);
  console.log('\nContractor Login URL:');
  console.log('https://3000-i3q1mo6ql1ufmczja1y4r-baae7cd3.manusvm.computer/contractor-login-simple.html');
  console.log('\nLogin Credentials:');
  console.log('Username:', c.username);
  console.log('Password:', c.username + '123', '(default pattern)');
}

process.exit(0);
