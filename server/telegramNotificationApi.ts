/**
 * Telegram Notification API
 * Admin endpoints to send alerts to contractors
 */
import express from "express";
import { getDb } from "./db";
import { contractors } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import {
  sendTelegramNotification,
  sendBatchNotifications,
  notificationTemplates,
  formatCurrency,
  formatDate,
} from "./_core/telegramNotifications";

const router = express.Router();

/**
 * POST /api/telegram/notify/job-assigned
 * Notify contractor about new job assignment
 */
router.post("/notify/job-assigned", async (req, res) => {
  try {
    const { contractorId, jobTitle, location } = req.body;

    if (!contractorId || !jobTitle || !location) {
      return res.status(400).json({
        error: "Missing required fields: contractorId, jobTitle, location",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Get contractor
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, contractorId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    const contractor = contractorResult[0];

    if (!contractor.telegramChatId) {
      return res.status(400).json({
        error: "Contractor has no Telegram chat ID",
      });
    }

    // Send notification
    const notification = notificationTemplates.jobAssigned(jobTitle, location);
    const result = await sendTelegramNotification({
      chatId: contractor.telegramChatId,
      message: notification.message,
      type: notification.type,
      parseMode: "Markdown",
    });

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to send notification",
        details: result.error,
      });
    }

    return res.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("[Telegram Notification API] Job assigned error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/telegram/notify/payment-processed
 * Notify contractor about payment
 */
router.post("/notify/payment-processed", async (req, res) => {
  try {
    const { contractorId, amountInPence, startDate, endDate } = req.body;

    if (!contractorId || !amountInPence) {
      return res.status(400).json({
        error: "Missing required fields: contractorId, amountInPence",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Get contractor
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, contractorId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    const contractor = contractorResult[0];

    if (!contractor.telegramChatId) {
      return res.status(400).json({
        error: "Contractor has no Telegram chat ID",
      });
    }

    // Format period
    const period = startDate && endDate
      ? `${formatDate(new Date(startDate))} - ${formatDate(new Date(endDate))}`
      : "Recent work";

    // Send notification
    const notification = notificationTemplates.paymentProcessed(
      formatCurrency(amountInPence),
      period
    );
    const result = await sendTelegramNotification({
      chatId: contractor.telegramChatId,
      message: notification.message,
      type: notification.type,
      parseMode: "Markdown",
    });

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to send notification",
        details: result.error,
      });
    }

    return res.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("[Telegram Notification API] Payment processed error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/telegram/notify/announcement
 * Send announcement to all contractors or specific ones
 */
router.post("/notify/announcement", async (req, res) => {
  try {
    const { title, message, contractorIds } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        error: "Missing required fields: title, message",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Get contractors
    let contractorList;
    if (contractorIds && contractorIds.length > 0) {
      contractorList = await db
        .select()
        .from(contractors)
        .where(inArray(contractors.id, contractorIds));
    } else {
      // Send to all contractors
      contractorList = await db.select().from(contractors);
    }

    // Filter contractors with Telegram chat IDs
    const contractorsWithTelegram = contractorList.filter(
      (c) => c.telegramChatId
    );

    if (contractorsWithTelegram.length === 0) {
      return res.status(400).json({
        error: "No contractors with Telegram chat IDs found",
      });
    }

    // Send notifications
    const notification = notificationTemplates.adminAnnouncement(title, message);
    const notifications = contractorsWithTelegram.map((contractor) => ({
      chatId: contractor.telegramChatId!,
      notification,
    }));

    const results = await sendBatchNotifications(notifications);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return res.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: results.length,
    });
  } catch (error) {
    console.error("[Telegram Notification API] Announcement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/telegram/notify/welcome
 * Send welcome message to newly registered contractor
 */
router.post("/notify/welcome", async (req, res) => {
  try {
    const { contractorId } = req.body;

    if (!contractorId) {
      return res.status(400).json({
        error: "Missing required field: contractorId",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Get contractor
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, contractorId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    const contractor = contractorResult[0];

    if (!contractor.telegramChatId) {
      return res.status(400).json({
        error: "Contractor has no Telegram chat ID",
      });
    }

    // Send welcome notification
    const contractorName = `${contractor.firstName} ${contractor.lastName}`;
    const notification = notificationTemplates.welcomeMessage(contractorName);
    const result = await sendTelegramNotification({
      chatId: contractor.telegramChatId,
      message: notification.message,
      type: notification.type,
      parseMode: "Markdown",
    });

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to send notification",
        details: result.error,
      });
    }

    return res.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("[Telegram Notification API] Welcome error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
