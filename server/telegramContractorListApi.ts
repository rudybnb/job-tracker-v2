import { Router } from "express";
import { getDb } from "./db";
import { contractors } from "../drizzle/schema";
import { isNotNull } from "drizzle-orm";

/**
 * Telegram Contractor List API
 * 
 * Provides list of contractors with Telegram chat IDs for n8n workflows
 */

export const telegramContractorListRouter = Router();

/**
 * GET /api/telegram/contractors-list
 * Returns all contractors who have registered Telegram chat IDs
 * 
 * Used by n8n workflow to send morning check-in reminders
 */
telegramContractorListRouter.get("/contractors-list", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database not available" });
    }

    // Fetch all contractors with Telegram chat IDs
    const contractorsList = await db
      .select({
        id: contractors.id,
        firstName: contractors.firstName,
        lastName: contractors.lastName,
        telegramChatId: contractors.telegramChatId,
        primaryTrade: contractors.primaryTrade,
        email: contractors.email,
      })
      .from(contractors)
      .where(isNotNull(contractors.telegramChatId));

    console.log(`[Telegram Contractor List] Found ${contractorsList.length} contractors with Telegram`);

    return res.json({
      success: true,
      count: contractorsList.length,
      contractors: contractorsList,
    });
  } catch (error) {
    console.error("[Telegram Contractor List API] Error fetching contractors:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch contractors" });
  }
});
