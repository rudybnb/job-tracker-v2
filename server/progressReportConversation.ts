import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { progressReportSessions, progressReports, contractors } from "../drizzle/schema";
import { transcribeAudio } from "./_core/voiceTranscription";

interface TelegramMessage {
  message: {
    chat: { id: number };
    from: { first_name: string };
    text?: string;
    voice?: {
      file_id: string;
      duration: number;
      file_size: number;
      mime_type?: string;
    };
  };
}

interface ConversationStep {
  step: string;
  question: string;
  nextStep: string;
  field: keyof typeof progressReportSessions.$inferSelect;
}

const CONVERSATION_STEPS: ConversationStep[] = [
  {
    step: "waiting_work_completed",
    question: "📝 *Progress Report*\n\nPlease describe the work you completed today.\n\nYou can reply with voice or text.",
    nextStep: "waiting_progress_percentage",
    field: "workCompleted"
  },
  {
    step: "waiting_progress_percentage",
    question: "✅ Got it!\n\nWhat's your progress percentage? (0-100)\n\nExample: 50",
    nextStep: "waiting_issues",
    field: "progressPercentage"
  },
  {
    step: "waiting_issues",
    question: "✅ Progress recorded!\n\nAny issues or delays?\n\nSay 'none' if everything is fine.",
    nextStep: "waiting_materials",
    field: "issues"
  },
  {
    step: "waiting_materials",
    question: "✅ Noted!\n\nDo you need any materials?\n\nSay 'none' if you have everything.",
    nextStep: "complete",
    field: "materials"
  }
];

/**
 * Start a new progress report conversation
 */
export async function startProgressReportConversation(chatId: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const chatIdStr = String(chatId);

  // Check if there's an existing session
  const existing = await db
    .select()
    .from(progressReportSessions)
    .where(eq(progressReportSessions.chatId, chatIdStr))
    .limit(1);

  if (existing.length > 0) {
    // Reset existing session
    await db
      .update(progressReportSessions)
      .set({
        step: "waiting_work_completed",
        workCompleted: null,
        progressPercentage: null,
        issues: null,
        materials: null,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      })
      .where(eq(progressReportSessions.chatId, chatIdStr));
  } else {
    // Create new session
    await db.insert(progressReportSessions).values({
      chatId: chatIdStr,
      step: "waiting_work_completed",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });
  }

  // Return first question
  return CONVERSATION_STEPS[0].question;
}

/**
 * Process a message in the conversation
 */
export async function processProgressReportMessage(
  update: TelegramMessage
): Promise<{ response: string; completed: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const chatId = String(update.message.chat.id);
  const firstName = update.message.from.first_name;

  // Get current session
  const sessions = await db
    .select()
    .from(progressReportSessions)
    .where(eq(progressReportSessions.chatId, chatId))
    .limit(1);

  if (sessions.length === 0) {
    return {
      response: "No active progress report session. Please start a new report by tapping the 📝 Report button.",
      completed: false,
    };
  }

  const session = sessions[0];

  // Check if session expired
  if (session.expiresAt && new Date() > session.expiresAt) {
    await db.delete(progressReportSessions).where(eq(progressReportSessions.chatId, chatId));
    return {
      response: "Your progress report session has expired. Please start a new report.",
      completed: false,
    };
  }

  // Extract message text (handle voice messages)
  let messageText = "";
  if (update.message.voice) {
    // Transcribe voice message
    const fileId = update.message.voice.file_id;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!telegramToken) {
      return {
        response: "Voice messages are not configured. Please type your response.",
        completed: false,
      };
    }

    try {
      // Get file path from Telegram
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${telegramToken}/getFile?file_id=${fileId}`
      );
      const fileData = await fileResponse.json();

      if (!fileData.ok) {
        return {
          response: "Sorry, I couldn't process your voice message. Please try again or type your response.",
          completed: false,
        };
      }

      const filePath = fileData.result.file_path;
      const audioUrl = `https://api.telegram.org/file/bot${telegramToken}/${filePath}`;

      // Transcribe audio
      const transcription = await transcribeAudio({ audioUrl });

      if ("error" in transcription) {
        return {
          response: "Sorry, I couldn't understand your voice message. Please try again or type your response.",
          completed: false,
        };
      }

      messageText = transcription.text.trim();
    } catch (error) {
      console.error("[Progress Report] Voice transcription error:", error);
      return {
        response: "Sorry, I couldn't process your voice message. Please try again or type your response.",
        completed: false,
      };
    }
  } else if (update.message.text) {
    messageText = update.message.text.trim();
  } else {
    return {
      response: "Please send a text or voice message.",
      completed: false,
    };
  }

  // Find current step
  const currentStepIndex = CONVERSATION_STEPS.findIndex((s) => s.step === session.step);
  if (currentStepIndex === -1) {
    return {
      response: "Something went wrong. Please start a new report.",
      completed: false,
    };
  }

  const currentStep = CONVERSATION_STEPS[currentStepIndex];

  // Save the response
  const updateData: any = {};
  
  if (currentStep.field === "progressPercentage") {
    // Parse percentage
    const percentage = parseInt(messageText.replace(/[^0-9]/g, ""));
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      return {
        response: "Please enter a valid percentage between 0 and 100.",
        completed: false,
      };
    }
    updateData[currentStep.field] = percentage;
  } else {
    updateData[currentStep.field] = messageText;
  }

  updateData.step = currentStep.nextStep;
  updateData.lastActivityAt = new Date();

  await db
    .update(progressReportSessions)
    .set(updateData)
    .where(eq(progressReportSessions.chatId, chatId));

  // Check if conversation is complete
  if (currentStep.nextStep === "complete") {
    // Get updated session with all data
    const completedSessions = await db
      .select()
      .from(progressReportSessions)
      .where(eq(progressReportSessions.chatId, chatId))
      .limit(1);

    if (completedSessions.length === 0) {
      return {
        response: "Error saving report. Please try again.",
        completed: false,
      };
    }

    const completedSession = completedSessions[0];

    // Find contractor by chat ID (assuming contractors have telegram_chat_id field)
    // For now, we'll use a placeholder contractor ID
    // TODO: Link contractors to their Telegram chat IDs
    const contractorId = completedSession.contractorId || 1; // Placeholder

    // Save to progress reports table
    await db.insert(progressReports).values({
      contractorId: contractorId,
      assignmentId: 1, // TODO: Get from current assignment
      jobId: 1, // TODO: Get from current assignment
      reportDate: new Date(),
      notes: `Work Completed: ${completedSession.workCompleted}\n\nIssues: ${completedSession.issues}\n\nMaterials Needed: ${completedSession.materials}`,
      transcribedText: completedSession.workCompleted,
      status: "submitted",
    });

    // Delete session
    await db.delete(progressReportSessions).where(eq(progressReportSessions.chatId, chatId));

    return {
      response: "✅ *Progress Report Submitted!*\n\nThank you for your update. Your supervisor will review it shortly.",
      completed: true,
    };
  }

  // Return next question
  const nextStepIndex = CONVERSATION_STEPS.findIndex((s) => s.step === currentStep.nextStep);
  if (nextStepIndex === -1) {
    return {
      response: "Something went wrong. Please start a new report.",
      completed: false,
    };
  }

  return {
    response: CONVERSATION_STEPS[nextStepIndex].question,
    completed: false,
  };
}

/**
 * Check if a chat has an active progress report session
 */
export async function hasActiveProgressReportSession(chatId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const sessions = await db
    .select()
    .from(progressReportSessions)
    .where(eq(progressReportSessions.chatId, String(chatId)))
    .limit(1);

  if (sessions.length === 0) return false;

  const session = sessions[0];

  // Check if expired
  if (session.expiresAt && new Date() > session.expiresAt) {
    await db.delete(progressReportSessions).where(eq(progressReportSessions.chatId, String(chatId)));
    return false;
  }

  return session.step !== "idle" && session.step !== "complete";
}
