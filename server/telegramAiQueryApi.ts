/**
 * Telegram AI Query API
 * Handles natural language queries from contractors via n8n workflow
 */
import express from "express";
import { getDb } from "./db";
import { contractors } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { handleChatbotQuery } from "./telegramAIChatbot";

const router = express.Router();

/**
 * POST /api/telegram/ai-query
 * Process natural language query from contractor
 * Body: { chatId: string, message: string, firstName: string }
 */
router.post("/ai-query", async (req, res) => {
  try {
    const { chatId, message, firstName } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        error: "Missing required fields: chatId and message",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ 
        error: "Database not available",
        response: "Sorry, I'm having trouble accessing the database right now. Please try again later."
      });
    }

    // Get contractor info
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    let contractorId: number | undefined;
    let isAdmin = false;

    if (contractorResult.length > 0) {
      contractorId = contractorResult[0].id;
      // Check if this is an admin user (you can add admin logic here)
      isAdmin = false; // TODO: Add admin check
    }

    // Process query with AI chatbot
    const response = await handleChatbotQuery(message, {
      chatId,
      firstName: firstName || "there",
      isAdmin,
      contractorId,
    });

    return res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("[Telegram AI Query API] Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      response: "Sorry, I encountered an error processing your request. Please try again."
    });
  }
});

export default router;
