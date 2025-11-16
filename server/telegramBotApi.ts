/**
 * Telegram Bot Query API
 * Provides comprehensive data access for bot commands and queries
 */
import express from "express";
import { getDb } from "./db";
import { 
  contractors, 
  jobs, 
  jobAssignments, 
  progressReports,
  workSessions,
  phaseCompletions 
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = express.Router();

/**
 * GET /api/telegram/contractor-info/:chatId
 * Get contractor information by Telegram chat ID
 */
router.get("/contractor-info/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Get contractor
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.status(404).json({ 
        error: "Contractor not found",
        message: "Please register first by sending /register to the bot"
      });
    }

    const contractor = contractorResult[0];

    // Get active assignments with job details
    const assignments = await db
      .select({
        assignmentId: jobAssignments.id,
        jobId: jobs.id,
        jobTitle: jobs.title,
        jobAddress: jobs.address,
        jobPostcode: jobs.postCode,
        jobStatus: jobs.status,
        assignmentStatus: jobAssignments.status,
        startDate: jobAssignments.startDate,
        endDate: jobAssignments.endDate,
      })
      .from(jobAssignments)
      .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(eq(jobAssignments.contractorId, contractor.id));

    return res.json({
      success: true,
      contractor: {
        id: contractor.id,
        name: `${contractor.firstName} ${contractor.lastName}`,
        email: contractor.email,
        phone: contractor.phone,
        type: contractor.type,
        hourlyRate: contractor.hourlyRate,
      },
      assignments,
    });
  } catch (error) {
    console.error("[Telegram Bot API] Contractor info error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/telegram/my-jobs/:chatId
 * Get all jobs assigned to contractor
 */
router.get("/my-jobs/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Get contractor
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    const contractor = contractorResult[0];

    // Get jobs with assignment details
    const jobsList = await db
      .select({
        jobId: jobs.id,
        title: jobs.title,
        address: jobs.address,
        postcode: jobs.postCode,
        status: jobs.status,
        assignmentId: jobAssignments.id,
        assignmentStatus: jobAssignments.status,
        workLocation: jobAssignments.workLocation,
      })
      .from(jobAssignments)
      .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(eq(jobAssignments.contractorId, contractor.id))
      .orderBy(desc(jobAssignments.createdAt));

    return res.json({
      success: true,
      jobs: jobsList,
    });
  } catch (error) {
    console.error("[Telegram Bot API] My jobs error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/telegram/my-payments/:chatId
 * Get payment history for contractor
 */
router.get("/my-payments/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Get contractor
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    const contractor = contractorResult[0];

    // Get work sessions with payment info
    const payments = await db
      .select({
        sessionId: workSessions.id,
        jobId: workSessions.jobId,
        startTime: workSessions.startTime,
        endTime: workSessions.endTime,
        hoursWorked: workSessions.hoursWorked,
        hourlyRate: workSessions.hourlyRate,
        grossPay: workSessions.grossPay,
        cisDeduction: workSessions.cisDeduction,
        netPay: workSessions.netPay,
        status: workSessions.status,
      })
      .from(workSessions)
      .where(eq(workSessions.contractorId, contractor.id))
      .orderBy(desc(workSessions.createdAt))
      .limit(20);

    // Calculate totals
    const totalGross = payments.reduce((sum, p) => sum + (p.grossPay || 0), 0);
    const totalCis = payments.reduce((sum, p) => sum + (p.cisDeduction || 0), 0);
    const totalNet = payments.reduce((sum, p) => sum + (p.netPay || 0), 0);

    return res.json({
      success: true,
      payments,
      summary: {
        totalGrossPay: totalGross,
        totalCisDeduction: totalCis,
        totalNetPay: totalNet,
        currency: "GBP",
        displayGross: `£${(totalGross / 100).toFixed(2)}`,
        displayCis: `£${(totalCis / 100).toFixed(2)}`,
        displayNet: `£${(totalNet / 100).toFixed(2)}`,
      },
    });
  } catch (error) {
    console.error("[Telegram Bot API] My payments error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/telegram/my-progress-reports/:chatId
 * Get progress reports submitted by contractor
 */
router.get("/my-progress-reports/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Get contractor
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    const contractor = contractorResult[0];

    // Get progress reports
    const reports = await db
      .select()
      .from(progressReports)
      .where(eq(progressReports.contractorId, contractor.id))
      .orderBy(desc(progressReports.createdAt))
      .limit(10);

    return res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("[Telegram Bot API] My progress reports error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/telegram/job-details/:chatId/:jobId
 * Get detailed information about a specific job
 */
router.get("/job-details/:chatId/:jobId", async (req, res) => {
  try {
    const { chatId, jobId } = req.params;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Get contractor
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (contractorResult.length === 0) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    const contractor = contractorResult[0];

    // Get job details
    const jobResult = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, parseInt(jobId)))
      .limit(1);

    if (jobResult.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = jobResult[0];

    // Get assignment
    const assignmentResult = await db
      .select()
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.jobId, parseInt(jobId)),
          eq(jobAssignments.contractorId, contractor.id)
        )
      )
      .limit(1);

    if (assignmentResult.length === 0) {
      return res.status(403).json({ error: "You are not assigned to this job" });
    }

    const assignment = assignmentResult[0];

    // Get phase completions for this job
    const phases = await db
      .select()
      .from(phaseCompletions)
      .where(
        and(
          eq(phaseCompletions.jobId, parseInt(jobId)),
          eq(phaseCompletions.contractorId, contractor.id)
        )
      );

    return res.json({
      success: true,
      job,
      assignment,
      phases,
    });
  } catch (error) {
    console.error("[Telegram Bot API] Job details error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/telegram/help
 * Get available bot commands
 */
router.get("/help", async (req, res) => {
  return res.json({
    success: true,
    commands: [
      {
        command: "/start",
        description: "Start using the bot and see welcome message",
      },
      {
        command: "/register",
        description: "Register your Telegram account with Job Tracker",
      },
      {
        command: "/myinfo",
        description: "View your contractor profile and active jobs",
      },
      {
        command: "/myjobs",
        description: "List all jobs assigned to you",
      },
      {
        command: "/payments",
        description: "View your payment history and earnings",
      },
      {
        command: "/reports",
        description: "View your submitted progress reports",
      },
      {
        command: "/help",
        description: "Show this help message",
      },
    ],
    features: [
      "🎤 Send voice messages to submit progress reports (any language)",
      "📸 Send photos to document your work",
      "🌍 Automatic translation to English",
      "💰 Track your earnings and payments",
      "📊 View job assignments and milestones",
    ],
  });
});

export default router;
