/**
 * Telegram Reminder Reply API
 * Handles contractor replies to morning check-in and evening reminders
 */
import express from "express";
import { getDb } from "./db";
import { contractors, reminderLogs, checkIns } from "../drizzle/schema";
import { eq, and, desc, gte } from "drizzle-orm";

const router = express.Router();

/**
 * POST /api/telegram/reminder-reply
 * Process contractor reply to reminder
 * Body: { chatId: string, message: string, messageType: 'text'|'voice' }
 */
router.post("/reminder-reply", async (req, res) => {
  try {
    const { chatId, message, messageType } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        error: "Missing required fields: chatId and message",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ 
        error: "Database not available",
        response: "Sorry, I'm having trouble accessing the database right now."
      });
    }

    // Get contractor
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.json({
        success: false,
        response: "I don't recognize your account. Please contact admin to get registered."
      });
    }

    const contractor = contractorResult[0];

    // Get the most recent reminder sent to this contractor (within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReminders = await db
      .select()
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.contractorId, contractor.id),
          gte(reminderLogs.sentAt, oneDayAgo)
        )
      )
      .orderBy(desc(reminderLogs.sentAt))
      .limit(1);

    if (recentReminders.length === 0) {
      // No recent reminder, treat as general message
      return res.json({
        success: true,
        response: `Thanks for the update, ${contractor.firstName}! I've recorded your message.`
      });
    }

    const reminder = recentReminders[0];

    // Update reminder log with response
    await db
      .update(reminderLogs)
      .set({
        responded: true,
        respondedAt: new Date(),
        response: message,
      })
      .where(eq(reminderLogs.id, reminder.id));

    // Record check-in
    await db.insert(checkIns).values({
      contractorId: contractor.id,
      checkInType: messageType === "voice" ? "voice_message" : "telegram_response",
      notes: message,
    });

    // Generate appropriate response based on reminder type
    let response: string;
    
    if (reminder.reminderType === "morning_checkin") {
      // Analyze if they're working or not
      const lowerMessage = message.toLowerCase();
      const notWorkingKeywords = ["can't", "cannot", "not working", "sick", "off", "休み", "できない"];
      const isNotWorking = notWorkingKeywords.some(keyword => lowerMessage.includes(keyword));

      if (isNotWorking) {
        response = `Thanks for letting me know, ${contractor.firstName}. I've recorded that you won't be working today. Hope everything is okay! 👍`;
      } else {
        response = `Great! Thanks for checking in, ${contractor.firstName}. Have a productive day! 💪`;
      }
    } else {
      // Evening reminder
      response = `Thanks for the update, ${contractor.firstName}! Your progress has been recorded. Have a good evening! 🌙`;
    }

    return res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("[Telegram Reminder Reply API] Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      response: "Sorry, I encountered an error. Please try again."
    });
  }
});

export default router;
