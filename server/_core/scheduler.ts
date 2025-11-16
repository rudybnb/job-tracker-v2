import cron from 'node-cron';
import { getDb } from '../db';
import { jobAssignments, contractors, progressReports, reminderLogs, checkIns } from '../../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { sendTelegramNotification } from './telegramNotifications';
import { sql } from 'drizzle-orm';

/**
 * Scheduled task system for automated reminders and notifications
 */

// Store active cron jobs
const activeCronJobs: Map<string, ReturnType<typeof cron.schedule>> = new Map();

/**
 * Schedule morning check-in reminders
 * Default: 8:15 AM every day
 */
export function scheduleMorningCheckIn(hour: number = 8, minute: number = 15) {
  const existingJob = activeCronJobs.get('morning-checkin');
  if (existingJob) {
    existingJob.stop();
    activeCronJobs.delete('morning-checkin');
  }

  const cronExpression = `${minute} ${hour} * * *`;
  
  console.log(`[Scheduler] Scheduling morning check-in at ${hour}:${minute.toString().padStart(2, '0')}`);

  const job = cron.schedule(cronExpression, async () => {
    console.log('[Scheduler] Running morning check-in reminders...');
    await sendMorningCheckInReminders();
  });

  activeCronJobs.set('morning-checkin', job);
  return job;
}

/**
 * Schedule daily progress report reminders
 * Default: 5 PM every day (17:00)
 */
export function scheduleDailyReminders(hour: number = 17, minute: number = 0) {
  const existingJob = activeCronJobs.get('daily-reminders');
  if (existingJob) {
    existingJob.stop();
    activeCronJobs.delete('daily-reminders');
  }

  const cronExpression = `${minute} ${hour} * * *`;
  
  console.log(`[Scheduler] Scheduling daily reminders at ${hour}:${minute.toString().padStart(2, '0')}`);

  const job = cron.schedule(cronExpression, async () => {
    console.log('[Scheduler] Running daily progress report reminders...');
    await sendDailyReminders();
  });

  activeCronJobs.set('daily-reminders', job);
  return job;
}

/**
 * Send morning check-in reminders to contractors who haven't logged in yet
 */
async function sendMorningCheckInReminders() {
  const db = await getDb();
  if (!db) {
    console.error('[Scheduler] Database not available');
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all contractors with active assignments today
    const activeAssignments = await db
      .select({
        contractorId: jobAssignments.contractorId,
        contractorName: sql<string>`${contractors.firstName}`.as('contractorName'),
        telegramChatId: contractors.telegramChatId,
      })
      .from(jobAssignments)
      .innerJoin(contractors, eq(jobAssignments.contractorId, contractors.id))
      .where(
        and(
          lte(jobAssignments.startDate, tomorrow),
          gte(jobAssignments.endDate, today)
        )
      );

    console.log(`[Scheduler] Found ${activeAssignments.length} contractors with active assignments`);

    // Check each contractor for check-ins today
    for (const assignment of activeAssignments) {
      if (!assignment.telegramChatId) {
        console.log(`[Scheduler] Skipping ${assignment.contractorName} - no Telegram chat ID`);
        continue;
      }

      // Check if contractor has checked in today
      const todayCheckIns = await db
        .select()
        .from(checkIns)
        .where(
          and(
            eq(checkIns.contractorId, assignment.contractorId),
            gte(checkIns.checkInTime, today),
            lte(checkIns.checkInTime, tomorrow)
          )
        );

      if (todayCheckIns.length === 0) {
        // No check-in yet - send reminder
        console.log(`[Scheduler] Sending morning check-in reminder to ${assignment.contractorName}`);
        
        const message = `☀️ *Good Morning!*\n\nHi ${assignment.contractorName}! 👋\n\nIt's 8:15 AM and we haven't heard from you yet.\n\n✅ If you're working today, please send a quick message or voice note to check in.\n\n❌ If you can't work today, please reply with the reason (e.g., "sick", "emergency", "day off").\n\nThank you! 🙏`;

        await sendTelegramNotification({
          chatId: assignment.telegramChatId,
          message,
          type: 'morning_checkin',
          parseMode: 'Markdown',
        });

        // Log the reminder
        await db.insert(reminderLogs).values({
          contractorId: assignment.contractorId,
          reminderType: 'morning_checkin',
          sentAt: new Date(),
        });
      } else {
        console.log(`[Scheduler] ${assignment.contractorName} already checked in today`);
      }
    }

    console.log('[Scheduler] Morning check-in reminders completed');
  } catch (error) {
    console.error('[Scheduler] Error sending morning check-in reminders:', error);
  }
}

/**
 * Send reminders to contractors who haven't submitted progress reports today
 */
async function sendDailyReminders() {
  const db = await getDb();
  if (!db) {
    console.error('[Scheduler] Database not available');
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all contractors with active assignments today
    const activeAssignments = await db
      .select({
        contractorId: jobAssignments.contractorId,
        contractorName: sql<string>`${contractors.firstName}`.as('contractorName'),
        telegramChatId: contractors.telegramChatId,
      })
      .from(jobAssignments)
      .innerJoin(contractors, eq(jobAssignments.contractorId, contractors.id))
      .where(
        and(
          lte(jobAssignments.startDate, tomorrow),
          gte(jobAssignments.endDate, today)
        )
      );

    console.log(`[Scheduler] Found ${activeAssignments.length} contractors with active assignments`);

    // Check each contractor for progress reports today
    for (const assignment of activeAssignments) {
      if (!assignment.telegramChatId) {
        console.log(`[Scheduler] Skipping ${assignment.contractorName} - no Telegram chat ID`);
        continue;
      }

      // Check if contractor has submitted a progress report today
      const todayReports = await db
        .select()
        .from(progressReports)
        .where(
          and(
            eq(progressReports.contractorId, assignment.contractorId),
            gte(progressReports.createdAt, today),
            lte(progressReports.createdAt, tomorrow)
          )
        );

      if (todayReports.length === 0) {
        // No report submitted today - send reminder
        console.log(`[Scheduler] Sending reminder to ${assignment.contractorName}`);
        
        const message = `⏰ *Daily Reminder*\n\nHi ${assignment.contractorName}! 👋\n\nPlease submit your progress report for today. Send a voice message describing what you accomplished.\n\n📝 Just record a voice message and I'll transcribe it automatically.\n\nThank you! 🙏`;

        await sendTelegramNotification({
          chatId: assignment.telegramChatId,
          message,
          type: 'progress_report_reminder',
          parseMode: 'Markdown',
        });

        // Log the reminder
        await db.insert(reminderLogs).values({
          contractorId: assignment.contractorId,
          reminderType: 'daily_report',
          sentAt: new Date(),
        });
      } else {
        console.log(`[Scheduler] ${assignment.contractorName} already submitted ${todayReports.length} report(s) today`);
      }
    }

    console.log('[Scheduler] Daily reminders completed');
  } catch (error) {
    console.error('[Scheduler] Error sending daily reminders:', error);
  }
}

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduler() {
  console.log('[Scheduler] Initializing scheduled tasks...');
  
  // Schedule morning check-in at 8:15 AM
  scheduleMorningCheckIn(8, 15);
  
  // Schedule daily reminders at 5 PM
  scheduleDailyReminders(17, 0);
  
  console.log('[Scheduler] All scheduled tasks initialized');
}

/**
 * Stop all scheduled tasks (for graceful shutdown)
 */
export function stopScheduler() {
  console.log('[Scheduler] Stopping all scheduled tasks...');
  
  activeCronJobs.forEach((job, name) => {
    job.stop();
    console.log(`[Scheduler] Stopped task: ${name}`);
  });
  
  activeCronJobs.clear();
  console.log('[Scheduler] All scheduled tasks stopped');
}

/**
 * Get status of all scheduled tasks
 */
export function getSchedulerStatus() {
  const tasks = Array.from(activeCronJobs.entries()).map(([name, job]) => ({
    name,
    running: job ? true : false,
  }));

  return {
    initialized: activeCronJobs.size > 0,
    tasks,
  };
}
