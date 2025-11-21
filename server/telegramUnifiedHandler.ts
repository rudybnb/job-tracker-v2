/**
 * Unified Telegram Message Handler
 * Single endpoint that handles ALL message types and routes internally
 */
import express from "express";
import { getDb } from "./db";
import { contractors, reminderLogs, checkIns, jobAssignments, workSessions } from "../drizzle/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { handleChatbotQuery } from "./telegramAIChatbot";
import { transcribeAudio } from "./_core/voiceTranscription";
import { 
  hasActiveProgressReportSession,
  processProgressReportMessage,
  startProgressReportConversation 
} from "./progressReportConversation";

const router = express.Router();

/**
 * POST /api/telegram/handle-message
 * Unified handler for all Telegram messages
 * Body: { 
 *   chatId: string, 
 *   firstName: string,
 *   messageType: 'text'|'voice',
 *   message?: string (for text),
 *   voiceFileUrl?: string (for voice)
 * }
 */
router.post("/handle-message", async (req, res) => {
  try {
    const { chatId, firstName, messageType, message, voiceFileUrl } = req.body;

    if (!chatId) {
      return res.status(400).json({
        error: "Missing chatId",
        response: "Sorry, I couldn't identify your account."
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ 
        error: "Database not available",
        response: "Sorry, I'm having trouble accessing the database right now."
      });
    }

    // Get contractor info
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.json({
        success: false,
        response: `Hi ${firstName}! I don't recognize your account yet. Please contact the admin to get registered.`
      });
    }

    const contractor = contractorResult[0];
    let messageText = message || "";

    // Handle voice messages
    if (messageType === "voice" && voiceFileUrl) {
      try {
        const transcription = await transcribeAudio({
          audioUrl: voiceFileUrl,
          language: "en",
        });
        if ('text' in transcription) {
          messageText = transcription.text;
        } else {
          throw new Error('Transcription failed');
        }
      } catch (error) {
        console.error("[Telegram Handler] Voice transcription failed:", error);
        return res.json({
          success: false,
          response: "Sorry, I couldn't understand your voice message. Please try again or send a text message."
        });
      }
    }

    if (!messageText) {
      return res.json({
        success: false,
        response: "I didn't receive any message content. Please try again."
      });
    }

    // Check if user has an active progress report conversation
    const hasActiveSession = await hasActiveProgressReportSession(chatId);
    if (hasActiveSession) {
      // Process message as part of progress report conversation
      const result = await processProgressReportMessage({
        message: {
          chat: { id: parseInt(chatId) },
          from: { first_name: firstName },
          text: messageText,
        }
      });
      return res.json({
        success: true,
        response: result.response
      });
    }

    // Check if user wants to start a progress report
    if (messageText.toLowerCase().includes("📝 report") || messageText.toLowerCase() === "report") {
      const firstQuestion = await startProgressReportConversation(chatId);
      return res.json({
        success: true,
        response: firstQuestion
      });
    }

    // Analyze message intent
    const lowerMessage = messageText.toLowerCase().trim();
    
    // 1. Check for assignment acknowledgment
    const acceptKeywords = ["accept", "ok", "yes", "confirmed", "i accept"];
    if (acceptKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return await handleAssignmentAcknowledgment(db, contractor, messageText, res);
    }

    // 2. Check for reminder reply (morning/evening)
    const recentReminder = await getRecentReminder(db, contractor.id);
    if (recentReminder) {
      return await handleReminderReply(db, contractor, messageText, messageType, recentReminder, res);
    }

    // 3. Check for progress report keywords (only if it's clearly a report, not a question)
    const reportKeywords = ["completed", "finished", "done", "progress"];
    const isQuestion = lowerMessage.includes("?") || lowerMessage.startsWith("any") || lowerMessage.startsWith("what") || lowerMessage.startsWith("how") || lowerMessage.startsWith("when") || lowerMessage.startsWith("where") || lowerMessage.startsWith("who");
    if (!isQuestion && reportKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return await handleProgressReport(db, contractor, messageText, res);
    }

    // 4. Check for simple contractor queries (before expensive AI call)
    const contractorQueryResult = await handleSimpleContractorQuery(db, lowerMessage, res);
    if (contractorQueryResult) {
      return contractorQueryResult;
    }

    // 5. Default: AI chatbot query (for complex questions)
    return await handleQuery(db, contractor, messageText, firstName, res);

  } catch (error) {
    console.error("[Telegram Handler] Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      response: "Sorry, I encountered an error. Please try again."
    });
  }
});

/**
 * Handle assignment acknowledgment (ACCEPT)
 */
async function handleAssignmentAcknowledgment(db: any, contractor: any, message: string, res: any) {
  try {
    // Find most recent unacknowledged assignment
    const assignments = await db
      .select()
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.contractorId, contractor.id),
          // notifiedAt is not null means it was notified
          eq(jobAssignments.acknowledged, false)
        )
      )
      .orderBy(desc(jobAssignments.createdAt))
      .limit(1);

    if (assignments.length === 0) {
      return res.json({
        success: false,
        response: "I don't see any pending assignments to acknowledge. You're all set! 👍"
      });
    }

    const assignment = assignments[0];

    // Mark as acknowledged
    await db
      .update(jobAssignments)
      .set({
        acknowledged: true,
        acknowledgedAt: new Date(),
      })
      .where(eq(jobAssignments.id, assignment.id));

    return res.json({
      success: true,
      response: `Perfect! ✅ I've recorded your acknowledgment for the job assignment. Thanks ${contractor.firstName}!`
    });
  } catch (error) {
    console.error("[Assignment Acknowledgment] Error:", error);
    return res.json({
      success: false,
      response: "I had trouble recording your acknowledgment. Please try again."
    });
  }
}

/**
 * Handle reminder reply
 */
async function handleReminderReply(db: any, contractor: any, message: string, messageType: string, reminder: any, res: any) {
  try {
    // Update reminder log
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

    // Analyze response
    const lowerMessage = message.toLowerCase();
    const notWorkingKeywords = ["can't", "cannot", "not working", "sick", "off"];
    const isNotWorking = notWorkingKeywords.some(keyword => lowerMessage.includes(keyword));

    let response: string;
    if (reminder.reminderType === "morning_checkin") {
      if (isNotWorking) {
        response = `Thanks for letting me know, ${contractor.firstName}. I've recorded that you won't be working today. Hope everything is okay! 👍`;
      } else {
        response = `Great! Thanks for checking in, ${contractor.firstName}. Have a productive day! 💪`;
      }
    } else {
      response = `Thanks for the update, ${contractor.firstName}! Your progress has been recorded. Have a good evening! 🌙`;
    }

    return res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("[Reminder Reply] Error:", error);
    return res.json({
      success: false,
      response: "I had trouble recording your response. Please try again."
    });
  }
}

/**
 * Handle progress report
 */
async function handleProgressReport(db: any, contractor: any, report: string, res: any) {
  try {
    // Record check-in with progress report
    await db.insert(checkIns).values({
      contractorId: contractor.id,
      checkInType: "progress_report",
      notes: report,
    });

    return res.json({
      success: true,
      response: `Thanks for the progress update, ${contractor.firstName}! I've recorded it. Keep up the great work! 👍`
    });
  } catch (error) {
    console.error("[Progress Report] Error:", error);
    return res.json({
      success: false,
      response: "I had trouble saving your progress report. Please try again."
    });
  }
}

/**
 * Handle general query with AI chatbot
 */
async function handleQuery(db: any, contractor: any, message: string, firstName: string, res: any) {
  try {
    const response = await handleChatbotQuery(message, {
      chatId: contractor.telegramChatId,
      firstName: firstName || contractor.firstName,
      isAdmin: false,
      contractorId: contractor.id,
    });

    return res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("[Query Handler] Error:", error);
    return res.json({
      success: false,
      response: "Sorry, I had trouble processing your question. Please try again."
    });
  }
}

/**
 * Handle simple contractor queries with direct keyword matching
 * Returns response if matched, null if no match (fall through to AI)
 */
async function handleSimpleContractorQuery(db: any, message: string, res: any) {
  try {
    // Get all contractors to check if any name is mentioned in the message
    const allContractors = await db
      .select()
      .from(contractors)
      .limit(50);
    
    // Find if any contractor name is mentioned in the message
    const matchedContractor = allContractors.find((c: any) => {
      const firstName = c.firstName?.toLowerCase() || '';
      const lastName = c.lastName?.toLowerCase() || '';
      const lowerMessage = message.toLowerCase();
      
      // Check if first name or last name appears in message
      return lowerMessage.includes(firstName) || lowerMessage.includes(lastName);
    });
    
    if (!matchedContractor) {
      return null; // No contractor name found, fall through to AI
    }
    
    console.log('[Simple Query] Found contractor:', matchedContractor.firstName, matchedContractor.lastName);
    
    // Determine query type
    if (message.includes('clock') || message.includes('check')) {
      // Check-in query
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCheckIns = await db
        .select()
        .from(checkIns)
        .where(
          and(
            eq(checkIns.contractorId, matchedContractor.id),
            gte(checkIns.checkInTime, today)
          )
        )
        .orderBy(desc(checkIns.checkInTime));
      
      if (todayCheckIns.length === 0) {
        return res.json({
          success: true,
          response: `${matchedContractor.firstName} hasn't checked in today yet.`
        });
      }
      
      let response = `✅ *${matchedContractor.firstName}'s Check-ins Today (${todayCheckIns.length})*\n\n`;
      todayCheckIns.forEach((c: any) => {
        const time = new Date(c.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        response += `• ${time} - ${c.checkInType}\n`;
        if (c.notes) {
          response += `  Note: ${c.notes}\n`;
        }
      });
      
      return res.json({
        success: true,
        response
      });
    }
    
    if (message.includes('hour') || message.includes('work')) {
      // Work hours query
      const sessions = await db
        .select()
        .from(workSessions)
        .where(eq(workSessions.contractorId, matchedContractor.id))
        .orderBy(desc(workSessions.startTime))
        .limit(10);
      
      if (sessions.length === 0) {
        return res.json({
          success: true,
          response: `${matchedContractor.firstName} has no recorded work sessions yet.`
        });
      }
      
      const totalHours = sessions.reduce((sum: number, s: any) => sum + (Number(s.hoursWorked) || 0), 0);
      
      let response = `⏱️ *${matchedContractor.firstName}'s Work Hours*\n\n`;
      response += `Total Hours: ${(totalHours / 60).toFixed(1)}h\n`;
      response += `Sessions: ${sessions.length}\n\n`;
      response += `*Recent Sessions:*\n`;
      sessions.slice(0, 5).forEach((s: any) => {
        const date = new Date(s.startTime).toLocaleDateString();
        const hours = (Number(s.hoursWorked) / 60).toFixed(1);
        response += `• ${date}: ${hours}h\n`;
      });
      
      return res.json({
        success: true,
        response
      });
    }
    
    if (message.includes('payment') || message.includes('pay') || message.includes('owe')) {
      // Payment query
      const sessions = await db
        .select()
        .from(workSessions)
        .where(eq(workSessions.contractorId, matchedContractor.id));
      
      const totalGross = sessions.reduce((sum: number, s: any) => sum + (Number(s.grossPay) || 0), 0);
      const totalNet = sessions.reduce((sum: number, s: any) => sum + (Number(s.netPay) || 0), 0);
      
      let response = `💰 *${matchedContractor.firstName}'s Payments*\n\n`;
      response += `Gross Pay: R${(totalGross / 100).toFixed(2)}\n`;
      response += `Net Pay: R${(totalNet / 100).toFixed(2)}\n`;
      response += `Sessions: ${sessions.length}\n`;
      
      return res.json({
        success: true,
        response
      });
    }
    
    // No specific query type matched, fall through to AI
    return null;
    
  } catch (error) {
    console.error('[Simple Query] Error:', error);
    return null; // Fall through to AI on error
  }
}

/**
 * Get most recent reminder (within last 24 hours)
 */
async function getRecentReminder(db: any, contractorId: number) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const reminders = await db
    .select()
    .from(reminderLogs)
    .where(
      and(
        eq(reminderLogs.contractorId, contractorId),
        gte(reminderLogs.sentAt, oneDayAgo),
        eq(reminderLogs.responded, false)
      )
    )
    .orderBy(desc(reminderLogs.sentAt))
    .limit(1);

  return reminders.length > 0 ? reminders[0] : null;
}

export default router;
