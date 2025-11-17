/**
 * Telegram Test API
 * Endpoints for testing Telegram bot functionality without disturbing contractors
 */
import express from "express";
import { ENV } from "./_core/env";

const router = express.Router();

/**
 * POST /api/telegram/test-morning-checkin
 * Send a test morning check-in message to admin's Telegram
 * 
 * Body: { adminChatId: string }
 * Returns: { success: true, message: string }
 */
router.post("/test-morning-checkin", async (req, res) => {
  try {
    const { adminChatId } = req.body;

    if (!adminChatId) {
      return res.status(400).json({
        success: false,
        error: "adminChatId is required",
      });
    }

    const botToken = ENV.telegramBotToken;
    if (!botToken) {
      return res.status(500).json({
        success: false,
        error: "Telegram bot token not configured",
      });
    }

    // The message that contractors will receive
    const message = `🌅 Good morning!

Please confirm you're working today by replying with one of these options:

✅ Reply "working" or "yes" to confirm you're on the job
❌ Or tell us why you can't work today (e.g., "I'm sick", "Car broke down", "Doctor appointment")

This helps us track attendance and plan the day's work.

Thank you! 🛠️`;

    // Send message to admin's Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(400).json({
        success: false,
        error: "Failed to send test message",
        details: errorData,
      });
    }

    const result = await response.json();

    console.log("[Test API] Morning check-in message sent to admin:", adminChatId);

    return res.json({
      success: true,
      message: "Test morning check-in message sent successfully",
      messageId: result.result.message_id,
      preview: message,
    });
  } catch (error) {
    console.error("[Test API] Error sending test message:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/telegram/test-progress-reminder
 * Send a test daily progress report reminder to admin's Telegram
 * 
 * Body: { adminChatId: string }
 * Returns: { success: true, message: string }
 */
router.post("/test-progress-reminder", async (req, res) => {
  try {
    const { adminChatId } = req.body;

    if (!adminChatId) {
      return res.status(400).json({
        success: false,
        error: "adminChatId is required",
      });
    }

    const botToken = ENV.telegramBotToken;
    if (!botToken) {
      return res.status(500).json({
        success: false,
        error: "Telegram bot token not configured",
      });
    }

    // The message that contractors will receive at 5 PM
    const message = `🕔 End of Day Report Reminder

Hi! It's time to submit your daily progress report.

Please send a voice message or text describing:
• What work you completed today
• Any materials used
• Any issues or delays encountered
• Plans for tomorrow

You can reply in any language - we'll translate it automatically! 🌍

Thank you for your hard work today! 💪`;

    // Send message to admin's Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(400).json({
        success: false,
        error: "Failed to send test message",
        details: errorData,
      });
    }

    const result = await response.json();

    console.log("[Test API] Progress reminder sent to admin:", adminChatId);

    return res.json({
      success: true,
      message: "Test progress reminder sent successfully",
      messageId: result.result.message_id,
      preview: message,
    });
  } catch (error) {
    console.error("[Test API] Error sending test message:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
