/**
 * Telegram Contractor Registration API
 * Handles contractor registration via Telegram bot
 */
import express from "express";
import { getDb } from "./db";
import { contractors } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

/**
 * POST /api/telegram/register-contractor
 * Registers a contractor by their Telegram chat ID
 * 
 * Body: {
 *   chatId: string,
 *   firstName: string,
 *   lastName: string,
 *   phone?: string,
 *   email?: string
 * }
 */
router.post("/register-contractor", async (req, res) => {
  try {
    const { chatId, firstName, lastName, phone, email } = req.body;

    if (!chatId || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: "chatId, firstName, and lastName are required",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not available",
      });
    }

    // Check if contractor with this chat ID already exists
    const existing = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: "You are already registered!",
        contractor: {
          id: existing[0].id,
          name: `${existing[0].firstName} ${existing[0].lastName}`,
          email: existing[0].email,
        },
      });
    }

    // Create new contractor
    const result = await db.insert(contractors).values({
      telegramChatId: chatId,
      firstName,
      lastName,
      phone: phone || null,
      email: email || `telegram_${chatId}@temp.com`, // Temporary email
      type: "contractor",
      paymentType: "day_rate",
      status: "pending", // Requires admin approval
    });

    return res.json({
      success: true,
      message: "Registration successful! An admin will approve your account soon.",
      contractor: {
        id: result[0].insertId,
        name: `${firstName} ${lastName}`,
      },
    });
  } catch (error) {
    console.error("[Telegram Registration] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during registration",
    });
  }
});

/**
 * GET /api/telegram/contractor-by-chat/:chatId
 * Gets contractor info by Telegram chat ID
 */
router.get("/contractor-by-chat/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not available",
      });
    }

    const result = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Contractor not found. Please register first using /register command.",
      });
    }

    const contractor = result[0];

    return res.json({
      success: true,
      contractor: {
        id: contractor.id,
        name: `${contractor.firstName} ${contractor.lastName}`,
        email: contractor.email,
        phone: contractor.phone,
        status: contractor.status,
        type: contractor.type,
      },
    });
  } catch (error) {
    console.error("[Telegram Registration] Error fetching contractor:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
