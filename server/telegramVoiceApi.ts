/**
 * Telegram Voice Transcription API
 * Handles voice messages from Telegram bot with multi-language support
 */
import express from "express";
import { transcribeAudio } from "./_core/voiceTranscription";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { contractors, progressReports, jobAssignments } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { translateText, getLanguageName, detectLanguage } from "./_core/translation";

const router = express.Router();

/**
 * POST /api/telegram/transcribe-voice
 * Transcribes voice message from Telegram (any language → English)
 * 
 * Body: { audioUrl: string, language?: string }
 * Returns: { success: true, text: string, language: string, duration: number }
 */
router.post("/transcribe-voice", async (req, res) => {
  try {
    const { audioUrl, language } = req.body;

    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        error: "audioUrl is required",
      });
    }

    // Transcribe audio (Whisper automatically translates to English if not English)
    const result = await transcribeAudio({
      audioUrl,
      language,
      prompt: "Transcribe this construction site progress report. Include details about work completed, materials used, and any issues.",
    });

    // Check if transcription failed
    if ("error" in result) {
      return res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
        details: result.details,
      });
    }

    // Return transcription result
    return res.json({
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration,
      segments: result.segments,
    });
  } catch (error) {
    console.error("[Telegram Voice API] Transcription error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during transcription",
    });
  }
});

/**
 * POST /api/telegram/progress-report
 * Saves progress report from contractor
 * 
 * Body: {
 *   chatId: string,
 *   reportText: string,
 *   originalLanguage?: string,
 *   audioUrl?: string,
 *   photoUrls?: string[]
 * }
 */
router.post("/progress-report", async (req, res) => {
  try {
    const { chatId, reportText, originalLanguage, audioUrl, photoUrls } = req.body;

    if (!chatId || !reportText) {
      return res.status(400).json({
        success: false,
        error: "chatId and reportText are required",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not available",
      });
    }

    // Find contractor by Telegram chat ID
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Contractor not found. Please register first using /register command.",
      });
    }

    const contractor = contractorResult[0];

    // Find active assignment for this contractor
    const assignmentResult = await db
      .select()
      .from(jobAssignments)
      .where(eq(jobAssignments.contractorId, contractor.id))
      .limit(1);

    if (assignmentResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No active job assignment found. Please contact your admin.",
      });
    }

    const assignment = assignmentResult[0];

    // Save progress report
    const result = await db.insert(progressReports).values({
      contractorId: contractor.id,
      assignmentId: assignment.id,
      jobId: assignment.jobId,
      reportDate: new Date(),
      transcribedText: reportText,
      originalLanguage: originalLanguage || "auto-detected",
      audioUrl: audioUrl || null,
      photoUrls: photoUrls ? JSON.stringify(photoUrls) : null,
      status: "submitted",
    });

    console.log("[Progress Report] Saved:", {
      reportId: result[0].insertId,
      contractor: `${contractor.firstName} ${contractor.lastName}`,
      job: assignment.jobId,
      textLength: reportText.length,
    });

    return res.json({
      success: true,
      message: "Progress report saved successfully",
      reportId: result[0].insertId,
    });
  } catch (error) {
    console.error("[Telegram Voice API] Progress report error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error saving progress report",
    });
  }
});

/**
 * GET /api/telegram/progress-reports/:chatId
 * Get progress reports for a contractor
 */
router.get("/progress-reports/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    // TODO: Query database once progressReports table is created
    // For now, return empty array
    return res.json({
      success: true,
      reports: [],
    });
  } catch (error) {
    console.error("[Telegram Voice API] Get reports error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error fetching progress reports",
    });
  }
});

/**
 * POST /api/telegram/process-voice
 * Complete voice processing: download from Telegram → transcribe → save report
 * This endpoint handles the bot token server-side so n8n doesn't need credential access
 * 
 * Body: { chatId: string, fileId: string }
 */
router.post("/process-voice", async (req, res) => {
  try {
    const { chatId, fileId } = req.body;

    if (!chatId || !fileId) {
      return res.status(400).json({
        success: false,
        error: "chatId and fileId are required",
      });
    }

    // Get bot token from environment
    const botToken = ENV.telegramBotToken;
    if (!botToken) {
      return res.status(500).json({
        success: false,
        error: "Telegram bot token not configured",
      });
    }

    // Step 1: Get file info from Telegram
    const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    
    if (!fileInfoResponse.ok) {
      return res.status(400).json({
        success: false,
        error: "Failed to get file info from Telegram",
      });
    }

    const fileInfo = await fileInfoResponse.json();
    const filePath = fileInfo.result.file_path;

    // Step 2: Construct download URL
    const audioUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    // Step 3: Transcribe audio
    const transcriptionResult = await transcribeAudio({
      audioUrl,
      prompt: "Transcribe this construction site progress report. Include details about work completed, materials used, and any issues.",
    });

    // Check if transcription failed
    if ("error" in transcriptionResult) {
      return res.status(400).json({
        success: false,
        error: transcriptionResult.error,
        code: transcriptionResult.code,
      });
    }

    // Step 4: Detect language if unknown
    let detectedLanguage = getLanguageName(transcriptionResult.language);
    
    // If language is unknown or not recognized, use LLM to detect it
    if (detectedLanguage === 'UNKNOWN' || detectedLanguage === transcriptionResult.language) {
      console.log("[Language Detection] Whisper returned unknown language, using LLM detection");
      detectedLanguage = await detectLanguage(transcriptionResult.text);
      console.log("[Language Detection] Detected:", detectedLanguage);
    }
    
    // Step 5: Translate to English if needed
    let translatedText = transcriptionResult.text;
    const isEnglish = detectedLanguage.toLowerCase() === 'english' || transcriptionResult.language === 'en';
    
    if (!isEnglish) {
      console.log(`[Translation] Translating from ${detectedLanguage} to English`);
      const translationResult = await translateText({
        text: transcriptionResult.text,
        sourceLanguage: detectedLanguage,
        targetLanguage: "English",
      });

      if ("error" in translationResult) {
        console.warn("[Translation] Failed, using original text:", translationResult.error);
      } else {
        translatedText = translationResult.translatedText;
        console.log("[Translation] Success:", translatedText.substring(0, 100) + "...");
      }
    }

    // Step 6: Save to database
    const db = await getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not available",
      });
    }

    // Find contractor by chat ID
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Contractor not found. Please register first.",
      });
    }

    const contractor = contractorResult[0];

    // Find active assignment
    const assignmentResult = await db
      .select()
      .from(jobAssignments)
      .where(eq(jobAssignments.contractorId, contractor.id))
      .limit(1);

    if (assignmentResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No active job assignment found.",
      });
    }

    const assignment = assignmentResult[0];

    // Save progress report
    const result = await db.insert(progressReports).values({
      contractorId: contractor.id,
      assignmentId: assignment.id,
      jobId: assignment.jobId,
      reportDate: new Date(),
      transcribedText: translatedText,
      originalLanguage: detectedLanguage,
      audioUrl: audioUrl,
      status: "submitted",
    });

    console.log("[Voice Progress Report] Saved:", {
      reportId: result[0].insertId,
      contractor: `${contractor.firstName} ${contractor.lastName}`,
      language: detectedLanguage,
      translated: transcriptionResult.language !== 'en',
    });

    // Step 7: Return success with transcription
    return res.json({
      success: true,
      text: translatedText,
      originalText: transcriptionResult.text,
      language: detectedLanguage,
      duration: transcriptionResult.duration,
      reportId: result[0].insertId,
      message: "Progress report saved successfully",
    });
  } catch (error) {
    console.error("[Telegram Voice API] Process voice error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error processing voice message",
    });
  }
});

export default router;
