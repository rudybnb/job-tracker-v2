import { drizzle } from 'drizzle-orm/mysql2';
import { contractors } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

const results = await db.select().from(contractors).where(eq(contractors.id, 150001));

console.log('Dalwayn Details:');
console.log(JSON.stringify(results[0], null, 2));
console.log('\nTelegram Chat ID in DB:', results[0]?.telegramChatId);
console.log('Expected Chat ID:', '8016744652');
console.log('Match:', results[0]?.telegramChatId === '8016744652');
