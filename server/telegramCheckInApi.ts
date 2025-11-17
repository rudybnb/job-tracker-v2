import { Router } from "express";
import { getDb } from "./db";
import { contractors, checkIns, reminderLogs } from "../drizzle/schema";
import { eq, and, desc, gte } from "drizzle-orm";

/**
 * Telegram Check-in API
 * 
 * Handles contractor check-in responses via Telegram bot
 */

export const telegramCheckInRouter = Router();

/**
 * POST /api/telegram/checkin-reason
 * Records contractor's reason for not checking in
 * 
 * Expected body:
 * {
 *   chatId: string,
 *   reason: string
 * }
 */
telegramCheckInRouter.post("/checkin-reason", async (req, res) => {
  const { chatId, reason } = req.body;
  
  if (!chatId || !reason) {
    return res.status(400).json({ 
      success: false, 
      error: "Missing required fields: chatId and reason" 
    });
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database not available" });
    }

    // Find contractor by Telegram chat ID
    const contractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (!contractor || contractor.length === 0) {
      return res.json({ 
        success: false, 
        error: "Contractor not found. Please contact support to link your Telegram account." 
      });
    }

    const contractorId = contractor[0].id;
    const contractorName = `${contractor[0].firstName} ${contractor[0].lastName}`;

    // Record check-in with reason
    await db.insert(checkIns).values({
      contractorId,
      checkInTime: new Date(),
      checkInType: "telegram_response",
      notes: reason,
    });

    // Find today's morning check-in reminder and mark as responded
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayReminders = await db
      .select()
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.contractorId, contractorId),
          eq(reminderLogs.reminderType, "morning_checkin"),
          gte(reminderLogs.sentAt, today)
        )
      )
      .orderBy(desc(reminderLogs.sentAt))
      .limit(1);

    if (todayReminders && todayReminders.length > 0) {
      const reminderId = todayReminders[0].id;
      await db
        .update(reminderLogs)
        .set({
          responded: true,
          respondedAt: new Date(),
          response: reason,
        })
        .where(eq(reminderLogs.id, reminderId));
    }

    console.log(`[Telegram Check-in] ${contractorName} reported: ${reason}`);

    return res.json({
      success: true,
      message: `Thank you for letting us know, ${contractor[0].firstName}. Your response has been recorded.`,
      contractor: {
        id: contractorId,
        name: contractorName,
      },
      checkIn: {
        time: new Date().toISOString(),
        reason,
      }
    });
  } catch (error) {
    console.error("[Telegram Check-in API] Error recording check-in reason:", error);
    return res.status(500).json({ success: false, error: "Failed to record check-in reason" });
  }
});

/**
 * POST /api/telegram/checkin-confirm
 * Records contractor's confirmation that they have checked in
 * 
 * Expected body:
 * {
 *   chatId: string,
 *   location?: string
 * }
 */
telegramCheckInRouter.post("/checkin-confirm", async (req, res) => {
  const { chatId, location } = req.body;
  
  if (!chatId) {
    return res.status(400).json({ 
      success: false, 
      error: "Missing required field: chatId" 
    });
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database not available" });
    }

    // Find contractor by Telegram chat ID
    const contractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (!contractor || contractor.length === 0) {
      return res.json({ 
        success: false, 
        error: "Contractor not found. Please contact support to link your Telegram account." 
      });
    }

    const contractorId = contractor[0].id;
    const contractorName = `${contractor[0].firstName} ${contractor[0].lastName}`;

    // Record check-in confirmation
    await db.insert(checkIns).values({
      contractorId,
      checkInTime: new Date(),
      checkInType: "telegram_confirm",
      location: location || null,
      notes: "Confirmed via Telegram",
    });

    // Mark today's morning check-in reminder as responded
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayReminders = await db
      .select()
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.contractorId, contractorId),
          eq(reminderLogs.reminderType, "morning_checkin"),
          gte(reminderLogs.sentAt, today)
        )
      )
      .orderBy(desc(reminderLogs.sentAt))
      .limit(1);

    if (todayReminders && todayReminders.length > 0) {
      const reminderId = todayReminders[0].id;
      await db
        .update(reminderLogs)
        .set({
          responded: true,
          respondedAt: new Date(),
          response: "Confirmed check-in via Telegram",
        })
        .where(eq(reminderLogs.id, reminderId));
    }

    console.log(`[Telegram Check-in] ${contractorName} confirmed check-in`);

    return res.json({
      success: true,
      message: `Thanks for checking in, ${contractor[0].firstName}! Have a great day.`,
      contractor: {
        id: contractorId,
        name: contractorName,
      },
      checkIn: {
        time: new Date().toISOString(),
        location,
      }
    });
  } catch (error) {
    console.error("[Telegram Check-in API] Error recording check-in confirmation:", error);
    return res.status(500).json({ success: false, error: "Failed to record check-in confirmation" });
  }
});

/**
 * POST /api/telegram/log-reminder
 * Logs that a reminder was sent to a contractor (called by n8n workflow)
 * 
 * Expected body:
 * {
 *   contractorId: number,
 *   reminderType: "morning_checkin" | "daily_report",
 *   success: boolean
 * }
 */
telegramCheckInRouter.post("/log-reminder", async (req, res) => {
  const { contractorId, reminderType, success } = req.body;
  
  if (!contractorId || !reminderType) {
    return res.status(400).json({ 
      success: false, 
      error: "Missing required fields: contractorId and reminderType" 
    });
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database not available" });
    }

    // Log the reminder
    await db.insert(reminderLogs).values({
      contractorId,
      reminderType,
      sentAt: new Date(),
      responded: false,
    });

    console.log(`[Telegram Reminder] Logged ${reminderType} reminder for contractor ${contractorId} (success: ${success})`);

    return res.json({
      success: true,
      message: "Reminder logged successfully",
    });
  } catch (error) {
    console.error("[Telegram Reminder API] Error logging reminder:", error);
    return res.status(500).json({ success: false, error: "Failed to log reminder" });
  }
});

/**
 * POST /api/telegram/webhook
 * Telegram webhook endpoint - receives all messages sent to the bot
 * 
 * This endpoint is called by Telegram servers when contractors send messages.
 * It processes the message, detects keywords, and routes to appropriate handlers.
 * 
 * Expected body (from Telegram):
 * {
 *   update_id: number,
 *   message: {
 *     message_id: number,
 *     from: { id: number, first_name: string, ... },
 *     chat: { id: number, type: string },
 *     text: string
 *   }
 * }
 */
telegramCheckInRouter.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    
    // Telegram sends updates with message object
    if (!update.message || !update.message.text) {
      console.log("[Telegram Webhook] Received update without text message:", JSON.stringify(update));
      return res.status(200).json({ ok: true }); // Always return 200 to Telegram
    }

    const message = update.message;
    const chatId = String(message.chat.id);
    const messageText = message.text.toLowerCase().trim();
    const firstName = message.from.first_name || "Contractor";

    console.log(`[Telegram Webhook] Message from ${firstName} (${chatId}): "${message.text}"`);

    // Check if it's a confirmation keyword
    const confirmationKeywords = ['working', 'yes', 'yep', 'yeah', 'ok', 'okay', 'confirmed', 'here', 'present'];
    const isConfirmation = confirmationKeywords.some(keyword => messageText.includes(keyword));

    let responseText = "";
    let success = false;

    if (isConfirmation) {
      // Handle confirmation
      console.log(`[Telegram Webhook] Processing confirmation for ${chatId}`);
      
      const db = await getDb();
      if (!db) {
        responseText = "Sorry, system is temporarily unavailable. Please try again later.";
      } else {
        // Find contractor
        const contractor = await db
          .select()
          .from(contractors)
          .where(eq(contractors.telegramChatId, chatId))
          .limit(1);

        if (!contractor || contractor.length === 0) {
          responseText = "Sorry, I couldn't find your account. Please contact support to link your Telegram.";
        } else {
          const contractorData = contractor[0];
          
          // Record check-in
          await db.insert(checkIns).values({
            contractorId: contractorData.id,
            checkInType: "telegram_confirm",
            checkInTime: new Date(),
            notes: "Confirmed check-in via Telegram",
          });

          // Update reminder log
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          await db
            .update(reminderLogs)
            .set({
              responded: true,
              respondedAt: new Date(),
              response: "Confirmed check-in via Telegram",
            })
            .where(
              and(
                eq(reminderLogs.contractorId, contractorData.id),
                gte(reminderLogs.sentAt, today)
              )
            );

          responseText = `✅ Thanks for checking in, ${contractorData.firstName}! Have a great day.`;
          success = true;
          console.log(`[Telegram Webhook] Check-in confirmed for ${contractorData.firstName}`);
        }
      }
    } else {
      // Handle reason/absence
      console.log(`[Telegram Webhook] Processing reason for ${chatId}: "${message.text}"`);
      
      const db = await getDb();
      if (!db) {
        responseText = "Sorry, system is temporarily unavailable. Please try again later.";
      } else {
        // Find contractor
        const contractor = await db
          .select()
          .from(contractors)
          .where(eq(contractors.telegramChatId, chatId))
          .limit(1);

        if (!contractor || contractor.length === 0) {
          responseText = "Sorry, I couldn't find your account. Please contact support to link your Telegram.";
        } else {
          const contractorData = contractor[0];
          
          // Record check-in with reason
          await db.insert(checkIns).values({
            contractorId: contractorData.id,
            checkInType: "telegram_response",
            checkInTime: new Date(),
            notes: message.text, // Store original message as reason
          });

          // Update reminder log
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          await db
            .update(reminderLogs)
            .set({
              responded: true,
              respondedAt: new Date(),
              response: message.text,
            })
            .where(
              and(
                eq(reminderLogs.contractorId, contractorData.id),
                gte(reminderLogs.sentAt, today)
              )
            );

          responseText = `📝 Thanks for letting us know, ${contractorData.firstName}. Take care!`;
          success = true;
          console.log(`[Telegram Webhook] Reason recorded for ${contractorData.firstName}`);
        }
      }
    }

    // Send reply to contractor via Telegram API
    if (responseText) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        try {
          const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
          const response = await fetch(telegramApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: responseText,
            }),
          });

          if (!response.ok) {
            console.error(`[Telegram Webhook] Failed to send reply: ${response.statusText}`);
          } else {
            console.log(`[Telegram Webhook] Reply sent successfully to ${chatId}`);
          }
        } catch (error) {
          console.error("[Telegram Webhook] Error sending reply:", error);
        }
      } else {
        console.warn("[Telegram Webhook] TELEGRAM_BOT_TOKEN not set, cannot send reply");
      }
    }

    // Always return 200 OK to Telegram to acknowledge receipt
    return res.status(200).json({ ok: true, success });

  } catch (error) {
    console.error("[Telegram Webhook] Error processing webhook:", error);
    // Still return 200 to Telegram to avoid retries
    return res.status(200).json({ ok: true, error: "Internal error" });
  }
});
