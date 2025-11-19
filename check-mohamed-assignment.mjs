import { drizzle } from 'drizzle-orm/mysql2';
import { contractors, jobAssignments } from './drizzle/schema.ts';
import { eq, desc } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

// Get Mohamed
const mohamedResult = await db.select().from(contractors).where(eq(contractors.firstName, 'Mohamed'));

if (mohamedResult.length === 0) {
  console.log("❌ Mohamed not found");
  process.exit(1);
}

const mohamed = mohamedResult[0];
console.log("Mohamed ID:", mohamed.id);
console.log("Chat ID:", mohamed.telegramChatId);

// Get his assignments
const assignments = await db.select().from(jobAssignments)
  .where(eq(jobAssignments.contractorId, mohamed.id))
  .orderBy(desc(jobAssignments.createdAt))
  .limit(3);

console.log("\nRecent Assignments:");
console.log("━".repeat(60));

assignments.forEach((assignment, i) => {
  console.log(`\n${i + 1}. Assignment ID: ${assignment.id}`);
  console.log(`   Notified: ${assignment.notifiedAt ? '✅ ' + assignment.notifiedAt : '❌ Not notified'}`);
  console.log(`   Acknowledged: ${assignment.acknowledged ? '✅ ' + assignment.acknowledgedAt : '❌ Not acknowledged'}`);
  console.log(`   Created: ${assignment.createdAt}`);
});

console.log("\n" + "━".repeat(60));
