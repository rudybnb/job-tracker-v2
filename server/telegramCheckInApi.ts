import { Router } from "express";
import { getDb } from "./db";
import { contractors, checkIns, reminderLogs, users } from "../drizzle/schema";
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
    if (!update.message) {
      console.log("[Telegram Webhook] Received update without message:", JSON.stringify(update));
      return res.status(200).json({ ok: true }); // Always return 200 to Telegram
    }

    const message = update.message;
    const chatId = String(message.chat.id);
    const firstName = message.from.first_name || "Contractor";

    // Log message structure for debugging
    console.log(`[Telegram Webhook] Message from ${firstName} (${chatId})`);
    console.log(`[Telegram Webhook] Message keys:`, Object.keys(message));
    console.log(`[Telegram Webhook] Has voice?`, !!message.voice);
    console.log(`[Telegram Webhook] Has text?`, !!message.text);
    console.log(`[Telegram Webhook] Has audio?`, !!message.audio);

    let messageText = "";
    let responseText = "";
    let success = false;

    // Handle voice messages
    if (message.voice) {
      console.log(`[Telegram Webhook] Voice message from ${firstName} (${chatId})`);
      
      try {
        // Import voice transcription helper
        const { transcribeAudio } = await import("./_core/voiceTranscription");
        
        // Get voice file from Telegram
        const fileId = message.voice.file_id;
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!telegramToken) {
          console.error("[Telegram Webhook] TELEGRAM_BOT_TOKEN not set");
          responseText = "Sorry, voice messages are not configured. Please type your message.";
        } else {
          // Get file path from Telegram
          const fileResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/getFile?file_id=${fileId}`);
          const fileData = await fileResponse.json();
          
          if (!fileData.ok) {
            console.error("[Telegram Webhook] Failed to get voice file:", fileData);
            responseText = "Sorry, I couldn't process your voice message. Please try again.";
          } else {
            const filePath = fileData.result.file_path;
            const audioUrl = `https://api.telegram.org/file/bot${telegramToken}/${filePath}`;
            
            console.log(`[Telegram Webhook] Transcribing audio from: ${audioUrl}`);
            console.log(`[Telegram Webhook] File path: ${filePath}`);
            console.log(`[Telegram Webhook] Voice duration: ${message.voice.duration}s, size: ${message.voice.file_size} bytes`);
            console.log(`[Telegram Webhook] Voice MIME type: ${message.voice.mime_type || 'not provided'}`);
            
            // Transcribe audio
            console.log(`[Telegram Webhook] Calling transcribeAudio...`);
            const transcription = await transcribeAudio({ audioUrl });
            
            // Check if transcription was successful
            if ('error' in transcription) {
              console.error("[Telegram Webhook] Transcription failed:", transcription.error);
              responseText = "Sorry, I couldn't understand your voice message. Please try again or type your message.";
            } else {
              messageText = transcription.text.toLowerCase().trim();
              console.log(`[Telegram Webhook] ✅ Voice transcribed successfully!`);
              console.log(`[Telegram Webhook] Transcribed text: "${transcription.text}"`);
              console.log(`[Telegram Webhook] Language detected: ${transcription.language}`);
              console.log(`[Telegram Webhook] Processing as message: "${messageText}"`);
            }
          }
        }
      } catch (error) {
        console.error("[Telegram Webhook] Voice transcription error:", error);
        console.error("[Telegram Webhook] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
        responseText = "Sorry, I couldn't understand your voice message. Please try again or type your message.";
      }
    } else if (message.text) {
      // Handle text messages
      messageText = message.text.toLowerCase().trim();
      console.log(`[Telegram Webhook] Text message from ${firstName} (${chatId}): "${message.text}"`);
    } else {
      // Unsupported message type
      console.log("[Telegram Webhook] Unsupported message type:", JSON.stringify(message));
      return res.status(200).json({ ok: true });
    }

    // If we have a response already (error), send it
    if (responseText) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
        }),
      });
      return res.json({ ok: true, success: false });
    }

    // Check if it's a confirmation keyword
    const confirmationKeywords = ['working', 'yes', 'yep', 'yeah', 'ok', 'okay', 'confirmed', 'here', 'present'];
    const isConfirmation = confirmationKeywords.some(keyword => messageText.includes(keyword));

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
      // Handle conversational query with AI chatbot
      console.log(`[Telegram Webhook] Processing AI query for ${chatId}: "${messageText}"`);
      
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
          
          // Import AI chatbot handler
          const { handleChatbotQuery } = await import("./telegramAIChatbot");
          
          // Determine if user is admin (check against owner open ID)
          const isAdmin = contractorData.userId ? (
            await db
              .select()
              .from(users)
              .where(eq(users.id, contractorData.userId))
              .limit(1)
          ).some(u => u.role === 'admin') : false;
          
          // Process query with AI chatbot
          try {
            responseText = await handleChatbotQuery(messageText, {
              chatId,
              firstName,
              isAdmin,
              contractorId: contractorData.id
            });
            success = true;
            console.log(`[Telegram Webhook] AI query processed for ${contractorData.firstName}`);
          } catch (error) {
            console.error("[Telegram Webhook] AI chatbot error:", error);
            responseText = "Sorry, I had trouble processing your question. Please try rephrasing it or contact support.";
          }
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
