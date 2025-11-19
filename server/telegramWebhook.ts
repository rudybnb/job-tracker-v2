/**
 * Direct Telegram Webhook Handler
 * Receives updates directly from Telegram API (bypasses n8n)
 */
import express from "express";
import { getDb } from "./db";
import { contractors } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { appendFileSync } from "fs";

function logToFile(message: string) {
  try {
    appendFileSync("/tmp/telegram-webhook.log", `${new Date().toISOString()} - ${message}\n`);
  } catch (e) {
    // Ignore file errors
  }
}

const router = express.Router();

/**
 * Process message asynchronously and send response via Telegram API
 */
async function processMessageAsync(
  chatId: string,
  firstName: string,
  messageType: "text" | "voice",
  messageText: string | undefined,
  voiceFileUrl: string | undefined
): Promise<void> {
  logToFile(`processMessageAsync started: chatId=${chatId}, firstName=${firstName}, type=${messageType}`);
  console.log("[Telegram Webhook] processMessageAsync started:", { chatId, firstName, messageType });
  try {
    // Find contractor by chatId
    const db = await getDb();
    if (!db) {
      console.error("[Telegram Webhook] Database unavailable");
      await sendTelegramMessage(chatId, "System temporarily unavailable. Please try again later.");
      return;
    }
    
    const contractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1)
      .then(results => results[0]);
    
    logToFile(`Contractor lookup: chatId=${chatId}, found=${!!contractor}`);
    
    if (!contractor) {
      logToFile(`Unknown contractor with chatId=${chatId}`);
      console.log("[Telegram Webhook] Unknown contractor, chatId:", chatId);
      await sendTelegramMessage(
        chatId,
        `Hi ${firstName}! I don't recognize your account yet. Please contact the admin to register your Telegram account.`
      );
      return;
    }
    
    // Forward to unified handler
    console.log("[Telegram Webhook] Calling unified handler...");
    const handlerResponse = await fetch(`http://localhost:3000/api/telegram/handle-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        firstName,
        messageType,
        message: messageText,
        voiceFileUrl
      })
    });
    
    console.log("[Telegram Webhook] Handler response status:", handlerResponse.status);
    const handlerResult = await handlerResponse.json();
    console.log("[Telegram Webhook] Handler result:", JSON.stringify(handlerResult, null, 2));
    
    // Send response back to Telegram
    if (handlerResult.response) {
      console.log("[Telegram Webhook] Sending response to user:", handlerResult.response.substring(0, 100));
      await sendTelegramMessage(chatId, handlerResult.response);
    } else {
      console.log("[Telegram Webhook] No response from handler");
    }
  } catch (error) {
    console.error("[Telegram Webhook] Error in processMessageAsync:", error);
    await sendTelegramMessage(chatId, "Sorry, I encountered an error. Please try again.");
  }
}

/**
 * POST /api/telegram/webhook
 * Receives Telegram updates directly from Telegram servers
 * 
 * Telegram Update format:
 * {
 *   update_id: number,
 *   message: {
 *     message_id: number,
 *     from: { id: number, first_name: string, username?: string },
 *     chat: { id: number, type: string },
 *     date: number,
 *     text?: string,
 *     voice?: { file_id: string, duration: number }
 *   }
 * }
 */
router.post("/webhook", async (req, res) => {
  logToFile("========== WEBHOOK CALLED ==========");
  console.log("\n\n========== TELEGRAM WEBHOOK CALLED ==========");
  console.log("[Telegram Webhook] Timestamp:", new Date().toISOString());
  console.log("[Telegram Webhook] Request headers:", JSON.stringify(req.headers, null, 2));
  console.log("[Telegram Webhook] Request body:", JSON.stringify(req.body, null, 2));
  
  try {
    const update = req.body;
    
    console.log("[Telegram Webhook] Received update:", JSON.stringify(update, null, 2));
    
    // Extract message data
    const message = update.message;
    if (!message) {
      console.log("[Telegram Webhook] No message in update, ignoring");
      return res.json({ ok: true });
    }
    
    const chatId = message.chat.id.toString();
    const firstName = message.from.first_name || "User";
    const username = message.from.username;
    
    // Determine message type
    let messageType: "text" | "voice";
    let messageText: string | undefined;
    let voiceFileUrl: string | undefined;
    
    if (message.text) {
      messageType = "text";
      messageText = message.text;
    } else if (message.voice) {
      messageType = "voice";
      // Get file URL from Telegram
      const fileId = message.voice.file_id;
      try {
        const fileResponse = await fetch(
          `https://api.telegram.org/bot${ENV.telegramBotToken}/getFile?file_id=${fileId}`
        );
        const fileData = await fileResponse.json();
        if (fileData.ok) {
          voiceFileUrl = `https://api.telegram.org/file/bot${ENV.telegramBotToken}/${fileData.result.file_path}`;
        }
      } catch (error) {
        console.error("[Telegram Webhook] Error getting voice file:", error);
      }
    } else {
      console.log("[Telegram Webhook] Unsupported message type, ignoring");
      return res.json({ ok: true });
    }
    
    console.log("[Telegram Webhook] Processing:", {
      chatId,
      firstName,
      username,
      messageType,
      messageText: messageText?.substring(0, 50),
      voiceFileUrl: voiceFileUrl?.substring(0, 50)
    });
    
    // IMPORTANT: Return immediately to avoid Telegram timeout
    res.json({ ok: true });
    
    // Process message asynchronously (don't await)
    processMessageAsync(chatId, firstName, messageType, messageText, voiceFileUrl).catch(error => {
      console.error("[Telegram Webhook] Error processing message:", error);
    });
    
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error);
    return res.json({ ok: true }); // Always return ok to Telegram
  }
});

/**
 * Send message to Telegram user
 */
async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  logToFile(`sendTelegramMessage called: chatId=${chatId}, textLength=${text.length}`);
  console.log("[Telegram Webhook] sendTelegramMessage called:", { chatId, textLength: text.length });
  try {
    const response = await fetch(`https://api.telegram.org/bot${ENV.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text
        // Removed parse_mode to avoid markdown errors
      })
    });
    const result = await response.json();
    console.log("[Telegram Webhook] sendMessage result:", JSON.stringify(result, null, 2));
    if (!result.ok) {
      console.error("[Telegram Webhook] Telegram API error:", result);
    }
  } catch (error) {
    console.error("[Telegram Webhook] Error sending message:", error);
  }
}

/**
 * GET /api/telegram/webhook-info
 * Get current webhook configuration
 */
router.get("/webhook-info", async (req, res) => {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${ENV.telegramBotToken}/getWebhookInfo`
    );
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("[Telegram Webhook] Error getting webhook info:", error);
    return res.status(500).json({ error: "Failed to get webhook info" });
  }
});

/**
 * POST /api/telegram/set-webhook
 * Register webhook URL with Telegram
 * Body: { url: string }
 */
router.post("/set-webhook", async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    
    const response = await fetch(
      `https://api.telegram.org/bot${ENV.telegramBotToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      }
    );
    
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("[Telegram Webhook] Error setting webhook:", error);
    return res.status(500).json({ error: "Failed to set webhook" });
  }
});

/**
 * POST /api/telegram/delete-webhook
 * Remove webhook (for testing with polling)
 */
router.post("/delete-webhook", async (req, res) => {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${ENV.telegramBotToken}/deleteWebhook`,
      { method: "POST" }
    );
    
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("[Telegram Webhook] Error deleting webhook:", error);
    return res.status(500).json({ error: "Failed to delete webhook" });
  }
});

export default router;
