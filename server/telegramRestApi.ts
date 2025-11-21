import { Router } from "express";
import { getDb } from "./db";
import { contractors, jobAssignments, workSessions, jobs } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Telegram REST API for n8n Integration
 * 
 * Simple Express REST endpoints that n8n can call directly.
 * These endpoints match the format expected by the n8n workflow.
 */

export const telegramRestRouter = Router();

/**
 * GET /api/telegram/worker-type/:chatId
 * Returns contractor information by Telegram chat ID
 */
telegramRestRouter.get("/worker-type/:chatId", async (req, res) => {
  const { chatId } = req.params;
  
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database not available" });
    }

    const contractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (!contractor || contractor.length === 0) {
      return res.json({ 
        success: false, 
        error: "Contractor not found. Please contact support to link your Telegram account." 
      });
    }

    const c = contractor[0];
    
    return res.json({
      success: true,
      user: {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        worker_type: c.paymentType === "day_rate" ? "day-rate" : "sub-contractor",
        trade: c.primaryTrade || "General",
        email: c.email,
        phone: c.phone,
      }
    });
  } catch (error) {
    console.error("[Telegram API] Error fetching worker type:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch worker information" });
  }
});

/**
 * GET /api/telegram/hours/:chatId
 * Returns logged hours for day-rate contractors
 */
telegramRestRouter.get("/hours/:chatId", async (req, res) => {
  const { chatId } = req.params;
  
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database not available" });
    }

    const contractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (!contractor || contractor.length === 0) {
      return res.json({ success: false, error: "Contractor not found" });
    }

    const contractorId = contractor[0].id;

    const sessions = await db
      .select({
        id: workSessions.id,
        jobId: workSessions.jobId,
        startTime: workSessions.startTime,
        endTime: workSessions.endTime,
        hoursWorked: workSessions.hoursWorked,
        grossPay: workSessions.grossPay,
        netPay: workSessions.netPay,
        jobTitle: jobs.title,
        jobAddress: jobs.address,
      })
      .from(workSessions)
      .leftJoin(jobs, eq(workSessions.jobId, jobs.id))
      .where(
        and(
          eq(workSessions.contractorId, contractorId),
          sql`${workSessions.endTime} IS NOT NULL`
        )
      )
      .orderBy(desc(workSessions.startTime))
      .limit(20);

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const totalGrossPay = sessions.reduce((sum, s) => sum + (s.grossPay || 0), 0);
    const totalNetPay = sessions.reduce((sum, s) => sum + (s.netPay || 0), 0);

    return res.json({
      success: true,
      data: {
        contractor_name: `${contractor[0].firstName} ${contractor[0].lastName}`,
        total_hours: totalHours,
        total_minutes: remainingMinutes,
        total_gross_pay: totalGrossPay / 100,
        total_net_pay: totalNetPay / 100,
        recent_sessions: sessions.map(s => {
          const mins = s.hoursWorked || 0;
          return {
            job: s.jobTitle || "Unknown Job",
            address: s.jobAddress || "",
            clock_in: s.startTime,
            clock_out: s.endTime,
            hours: Math.floor(mins / 60),
            minutes: mins % 60,
            gross_pay: (s.grossPay || 0) / 100,
            net_pay: (s.netPay || 0) / 100,
          };
        })
      }
    });
  } catch (error) {
    console.error("[Telegram API] Error fetching hours:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch hours data" });
  }
});

/**
 * GET /api/telegram/payments/:chatId
 * Returns payment status for day-rate contractors
 */
telegramRestRouter.get("/payments/:chatId", async (req, res) => {
  const { chatId } = req.params;
  
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database not available" });
    }

    const contractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (!contractor || contractor.length === 0) {
      return res.json({ success: false, error: "Contractor not found" });
    }

    const contractorId = contractor[0].id;

    const sessions = await db
      .select({
        startTime: workSessions.startTime,
        endTime: workSessions.endTime,
        grossPay: workSessions.grossPay,
        netPay: workSessions.netPay,
        status: workSessions.status,
        jobTitle: jobs.title,
      })
      .from(workSessions)
      .leftJoin(jobs, eq(workSessions.jobId, jobs.id))
      .where(
        and(
          eq(workSessions.contractorId, contractorId),
          sql`${workSessions.endTime} IS NOT NULL`
        )
      )
      .orderBy(desc(workSessions.startTime));

    const totalEarned = sessions.reduce((sum, s) => sum + (s.netPay || 0), 0);
    const completedSessions = sessions.filter(s => s.status === "completed");
    const activeSessions = sessions.filter(s => s.status === "active");
    
    const totalPaid = completedSessions.reduce((sum, s) => sum + (s.netPay || 0), 0);
    const totalOutstanding = activeSessions.reduce((sum, s) => sum + (s.netPay || 0), 0);

    return res.json({
      success: true,
      data: {
        contractor_name: `${contractor[0].firstName} ${contractor[0].lastName}`,
        total_earned: totalEarned / 100,
        total_paid: totalPaid / 100,
        total_outstanding: totalOutstanding / 100,
        payment_summary: {
          paid_sessions: completedSessions.length,
          unpaid_sessions: activeSessions.length,
          total_sessions: sessions.length,
        },
        recent_payments: sessions.slice(0, 10).map(s => ({
          job: s.jobTitle || "Unknown Job",
          date: s.startTime,
          amount: (s.netPay || 0) / 100,
          status: s.status === "completed" ? "paid" : "pending",
        }))
      }
    });
  } catch (error) {
    console.error("[Telegram API] Error fetching payments:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch payment data" });
  }
});

/**
 * GET /api/telegram/subcontractor/quotes/:chatId
 * Returns active quotes for subcontractors
 */
telegramRestRouter.get("/subcontractor/quotes/:chatId", async (req, res) => {
  const { chatId } = req.params;
  
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database not available" });
    }

    const contractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (!contractor || contractor.length === 0) {
      return res.json({ success: false, error: "Contractor not found" });
    }

    const contractorId = contractor[0].id;

    const assignments = await db
      .select({
        id: jobAssignments.id,
        jobTitle: jobs.title,
        jobAddress: jobs.address,
        selectedPhases: jobAssignments.selectedPhases,
        milestonePrice: jobAssignments.milestonePrice,
        status: jobAssignments.status,
        startDate: jobAssignments.startDate,
        endDate: jobAssignments.endDate,
        specialInstructions: jobAssignments.specialInstructions,
      })
      .from(jobAssignments)
      .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(eq(jobAssignments.contractorId, contractorId))
      .orderBy(desc(jobAssignments.createdAt));

    return res.json({
      success: true,
      data: {
        contractor_name: `${contractor[0].firstName} ${contractor[0].lastName}`,
        total_quotes: assignments.length,
        active_quotes: assignments.filter(a => a.status === "assigned" || a.status === "in_progress").length,
        quotes: assignments.map(a => ({
          id: a.id,
          job: a.jobTitle || "Unknown Job",
          address: a.jobAddress || "",
          phases: a.selectedPhases ? JSON.parse(a.selectedPhases) : [],
          price: a.milestonePrice ? a.milestonePrice / 100 : 0,
          status: a.status,
          start_date: a.startDate,
          end_date: a.endDate,
          instructions: a.specialInstructions || "",
        }))
      }
    });
  } catch (error) {
    console.error("[Telegram API] Error fetching quotes:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch quotes data" });
  }
});

/**
 * GET /api/telegram/subcontractor/milestones/:chatId
 * Returns milestone progress for subcontractors
 */
telegramRestRouter.get("/subcontractor/milestones/:chatId", async (req, res) => {
  const { chatId } = req.params;
  
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database not available" });
    }

    const contractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (!contractor || contractor.length === 0) {
      return res.json({ success: false, error: "Contractor not found" });
    }

    const contractorId = contractor[0].id;

    const assignments = await db
      .select({
        id: jobAssignments.id,
        jobTitle: jobs.title,
        selectedPhases: jobAssignments.selectedPhases,
        milestonePrice: jobAssignments.milestonePrice,
        status: jobAssignments.status,
      })
      .from(jobAssignments)
      .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(eq(jobAssignments.contractorId, contractorId))
      .orderBy(desc(jobAssignments.createdAt));

    const milestones = assignments.map(a => {
      const phases = a.selectedPhases ? JSON.parse(a.selectedPhases) : [];
      const totalPhases = phases.length;
      const completedPhases = a.status === "completed" ? totalPhases : 0;
      
      return {
        id: a.id,
        job: a.jobTitle || "Unknown Job",
        total_phases: totalPhases,
        completed_phases: completedPhases,
        progress_percentage: totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0,
        milestone_value: a.milestonePrice ? a.milestonePrice / 100 : 0,
        status: a.status,
        phases: phases,
      };
    });

    return res.json({
      success: true,
      data: {
        contractor_name: `${contractor[0].firstName} ${contractor[0].lastName}`,
        total_milestones: milestones.length,
        active_milestones: milestones.filter(m => m.status === "in_progress").length,
        completed_milestones: milestones.filter(m => m.status === "completed").length,
        milestones: milestones,
      }
    });
  } catch (error) {
    console.error("[Telegram API] Error fetching milestones:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch milestone data" });
  }
});

/**
 * GET /api/telegram/subcontractor/payment-status/:chatId
 * Returns payment status for subcontractors
 */
telegramRestRouter.get("/subcontractor/payment-status/:chatId", async (req, res) => {
  const { chatId } = req.params;
  
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: "Database not available" });
    }

    const contractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, chatId))
      .limit(1);

    if (!contractor || contractor.length === 0) {
      return res.json({ success: false, error: "Contractor not found" });
    }

    const contractorId = contractor[0].id;

    const assignments = await db
      .select({
        id: jobAssignments.id,
        jobTitle: jobs.title,
        milestonePrice: jobAssignments.milestonePrice,
        status: jobAssignments.status,
        createdAt: jobAssignments.createdAt,
      })
      .from(jobAssignments)
      .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(eq(jobAssignments.contractorId, contractorId))
      .orderBy(desc(jobAssignments.createdAt));

    const totalValue = assignments.reduce((sum, a) => sum + (a.milestonePrice || 0), 0);
    const completedValue = assignments
      .filter(a => a.status === "completed")
      .reduce((sum, a) => sum + (a.milestonePrice || 0), 0);
    const pendingValue = assignments
      .filter(a => a.status === "in_progress" || a.status === "assigned")
      .reduce((sum, a) => sum + (a.milestonePrice || 0), 0);

    return res.json({
      success: true,
      data: {
        contractor_name: `${contractor[0].firstName} ${contractor[0].lastName}`,
        total_contract_value: totalValue / 100,
        completed_value: completedValue / 100,
        pending_value: pendingValue / 100,
        payment_summary: {
          total_milestones: assignments.length,
          completed: assignments.filter(a => a.status === "completed").length,
          in_progress: assignments.filter(a => a.status === "in_progress").length,
          pending: assignments.filter(a => a.status === "assigned").length,
        },
        milestones: assignments.map(a => ({
          id: a.id,
          job: a.jobTitle || "Unknown Job",
          value: a.milestonePrice ? a.milestonePrice / 100 : 0,
          status: a.status,
          date: a.createdAt,
        }))
      }
    });
  } catch (error) {
    console.error("[Telegram API] Error fetching subcontractor payment status:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch payment status" });
  }
});
