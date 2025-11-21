/**
 * Simple background job that checks for new assignments and sends Telegram notifications
 * Runs every 30 seconds
 */

import { getDb } from "./db.js";
import { jobAssignments, contractors, jobs } from "../drizzle/schema.js";
import { eq, and, isNull } from "drizzle-orm";
import { sendTelegramNotification } from "./_core/telegramNotifications.js";

export async function checkAndNotifyNewAssignments() {
  try {
    const db = await getDb();
    if (!db) {
      console.log('[Notifier] Database not available');
      return;
    }

    // Find assignments that haven't been notified yet (notifiedAt is NULL)
    const unnotifiedAssignments = await db
      .select({
        assignment: jobAssignments,
        contractor: contractors,
        job: jobs,
      })
      .from(jobAssignments)
      .leftJoin(contractors, eq(jobAssignments.contractorId, contractors.id))
      .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(isNull(jobAssignments.notifiedAt));

    console.log(`[Notifier] Found ${unnotifiedAssignments.length} unnotified assignments`);

    for (const { assignment, contractor, job } of unnotifiedAssignments) {
      if (!contractor?.telegramChatId) {
        console.log(`[Notifier] Skipping assignment ${assignment.id} - no Telegram chat ID for contractor ${contractor?.firstName}`);
        // Mark as notified even if no chat ID (so we don't keep trying)
        await db.update(jobAssignments)
          .set({ notifiedAt: new Date() })
          .where(eq(jobAssignments.id, assignment.id));
        continue;
      }

      try {
        const phases = assignment.selectedPhases 
          ? JSON.parse(assignment.selectedPhases as string)
          : [];
        
        const phasesText = phases.length > 0
          ? `\n\n📋 Assigned Phases:\n${phases.map((p: string) => `  • ${p}`).join('\n')}`
          : '';
        
        const instructionsText = assignment.specialInstructions
          ? `\n\n📝 Special Instructions:\n${assignment.specialInstructions}`
          : '';
        
        const postcodeText = job?.postCode ? `\n🏠 Postcode: ${job.postCode}` : '';
        
        const message = `🔔 *New Job Assignment*\n\n` +
          `📍 Job: ${job?.title || 'Unknown'}\n` +
          `📌 Address: ${job?.address || 'N/A'}` +
          postcodeText +
          `\n📅 Start: ${assignment.startDate?.toLocaleDateString() || 'N/A'}\n` +
          `📅 End: ${assignment.endDate?.toLocaleDateString() || 'N/A'}` +
          phasesText +
          instructionsText +
          `\n\n✅ Reply with "ACCEPT" to acknowledge this assignment.`;
        
        const result = await sendTelegramNotification({
          chatId: contractor.telegramChatId,
          message,
          type: "job_assigned",
          parseMode: "Markdown",
        });

        if (result.success) {
          console.log(`[Notifier] ✅ Sent notification for assignment ${assignment.id} to ${contractor.firstName} ${contractor.lastName}`);
          
          // Mark as notified
          await db.update(jobAssignments)
            .set({ notifiedAt: new Date() })
            .where(eq(jobAssignments.id, assignment.id));
        } else {
          console.error(`[Notifier] ❌ Failed to send notification for assignment ${assignment.id}:`, result.error);
        }
      } catch (error) {
        console.error(`[Notifier] Error processing assignment ${assignment.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Notifier] Error in checkAndNotifyNewAssignments:', error);
  }
}

// Run every 30 seconds
export function startAssignmentNotifier() {
  console.log('[Notifier] Starting assignment notifier (checks every 30 seconds)');
  setInterval(checkAndNotifyNewAssignments, 30000);
  // Run immediately on start
  checkAndNotifyNewAssignments();
}
