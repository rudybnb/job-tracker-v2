/**
 * Test job assignment notification directly
 */

import { getDb } from "./server/db.js";
import { contractors, jobs } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";

const contractorId = 90001; // Rudy
const jobId = 750003; // Emmanuel

console.log('[TEST] Getting database connection...');
const db = await getDb();

console.log('[TEST] Fetching contractor...');
const contractorResult = await db.select().from(contractors).where(eq(contractors.id, contractorId)).limit(1);
const contractor = contractorResult[0];

console.log('[TEST] Contractor:', contractor?.firstName, contractor?.lastName);
console.log('[TEST] Telegram Chat ID:', contractor?.telegramChatId);

console.log('[TEST] Fetching job...');
const jobResult = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
const job = jobResult[0];

console.log('[TEST] Job:', job?.title);

if (!contractor?.telegramChatId) {
  console.error('[TEST] ERROR: No Telegram chat ID found!');
  process.exit(1);
}

console.log('[TEST] Importing notification function...');
const { sendTelegramNotification } = await import("./server/_core/telegramNotifications.js");

console.log('[TEST] Sending notification...');
const result = await sendTelegramNotification({
  chatId: contractor.telegramChatId,
  message: `🔔 *Test Job Assignment*\n\n📍 Job: ${job?.title}\n📌 Address: ${job?.address}\n\nThis is a direct test of the notification system.`,
  type: "job_assigned",
  parseMode: "Markdown",
});

console.log('[TEST] Result:', JSON.stringify(result, null, 2));

if (result.success) {
  console.log('\n✅ Notification sent successfully!');
} else {
  console.log('\n❌ Failed to send notification:', result.error);
}

process.exit(0);
