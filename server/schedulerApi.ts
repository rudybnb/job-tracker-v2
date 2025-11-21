import { Router } from "express";
import { scheduleDailyReminders, getSchedulerStatus } from "./_core/scheduler";

const router = Router();

/**
 * Get scheduler status
 */
router.get("/status", async (req, res) => {
  try {
    const status = getSchedulerStatus();
    res.json(status);
  } catch (error) {
    console.error("[Scheduler API] Error getting status:", error);
    res.status(500).json({
      error: "Failed to get scheduler status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Update reminder schedule
 */
router.post("/update-reminder-time", async (req, res) => {
  try {
    const { hour, minute } = req.body;

    if (typeof hour !== "number" || hour < 0 || hour > 23) {
      return res.status(400).json({
        error: "Invalid hour (must be 0-23)",
      });
    }

    if (typeof minute !== "number" || minute < 0 || minute > 59) {
      return res.status(400).json({
        error: "Invalid minute (must be 0-59)",
      });
    }

    // Reschedule with new time
    scheduleDailyReminders(hour, minute);

    res.json({
      success: true,
      message: `Daily reminders rescheduled to ${hour}:${minute.toString().padStart(2, '0')}`,
    });
  } catch (error) {
    console.error("[Scheduler API] Error updating reminder time:", error);
    res.status(500).json({
      error: "Failed to update reminder time",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Trigger manual reminder test (send to all contractors now)
 */
router.post("/test-reminders", async (req, res) => {
  try {
    // Import the sendDailyReminders function
    const { getDb } = await import("./db");
    const { jobAssignments, contractors, progressReports } = await import("../drizzle/schema");
    const { eq, and, gte, lte, sql } = await import("drizzle-orm");
    const { sendTelegramNotification } = await import("./_core/telegramNotifications");

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('[Scheduler Test] Today:', today);
    console.log('[Scheduler Test] Tomorrow:', tomorrow);

    // Find ALL contractors with Telegram chat IDs (for testing)
    // This bypasses date filtering so you can test the reminder system
    const activeAssignments = await db
      .select({
        contractorId: contractors.id,
        contractorName: sql<string>`${contractors.firstName}`.as('contractorName'),
        telegramChatId: contractors.telegramChatId,
      })
      .from(contractors)
      .where(sql`${contractors.telegramChatId} IS NOT NULL`);

    console.log('[Scheduler Test] Found assignments:', activeAssignments.length);
    console.log('[Scheduler Test] Assignments:', JSON.stringify(activeAssignments, null, 2));

    let sentCount = 0;
    let skippedCount = 0;

    for (const assignment of activeAssignments) {
      if (!assignment.telegramChatId) {
        skippedCount++;
        continue;
      }

      const message = `🧪 *Test Reminder*\n\nHi ${assignment.contractorName}! 👋\n\nThis is a test reminder. In production, you'll receive this at the configured time each day if you haven't submitted a progress report.\n\n📝 Send a voice message to test the system!\n\nThank you! 🙏`;

      await sendTelegramNotification({
        chatId: assignment.telegramChatId,
        message,
        type: 'progress_report_reminder',
        parseMode: 'Markdown',
      });

      sentCount++;
    }

    res.json({
      success: true,
      message: `Test reminders sent to ${sentCount} contractor(s), skipped ${skippedCount}`,
      sent: sentCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error("[Scheduler API] Error testing reminders:", error);
    res.status(500).json({
      error: "Failed to send test reminders",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
