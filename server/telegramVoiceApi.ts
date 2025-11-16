/**
 * Telegram Voice Transcription API
 * Handles voice messages from Telegram bot with multi-language support
 */
import express from "express";
import { transcribeAudio } from "./_core/voiceTranscription";

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

    // TODO: Save to database once progressReports table is created
    // For now, just return success
    console.log("[Progress Report]", {
      chatId,
      reportText: reportText.substring(0, 100),
      originalLanguage,
      hasAudio: !!audioUrl,
      photoCount: photoUrls?.length || 0,
    });

    return res.json({
      success: true,
      message: "Progress report saved successfully",
      reportId: Date.now(), // Temporary ID until database is set up
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

export default router;
