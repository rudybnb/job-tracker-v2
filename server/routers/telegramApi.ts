import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { contractors, jobAssignments, workSessions, jobs } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Telegram API Router
 * 
 * Public endpoints for n8n Telegram bot integration.
 * These endpoints are called by n8n workflows to fetch contractor data
 * and respond to Telegram messages.
 */

export const telegramApiRouter = router({
  /**
   * Get worker type and basic info by Telegram chat ID
   * Endpoint: GET /api/telegram/worker-type/:chatId
   */
  getWorkerType: publicProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        const contractor = await db
          .select()
          .from(contractors)
          .where(eq(contractors.telegramChatId, input.chatId))
          .limit(1);

        if (!contractor || contractor.length === 0) {
          return { 
            success: false, 
            error: "Contractor not found. Please contact support to link your Telegram account." 
          };
        }

        const c = contractor[0];
        
        return {
          success: true,
          user: {
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            worker_type: c.paymentType === "day_rate" ? "day-rate" : "sub-contractor",
            trade: c.primaryTrade || "General",
            email: c.email,
            phone: c.phone,
          }
        };
      } catch (error) {
        console.error("[Telegram API] Error fetching worker type:", error);
        return { success: false, error: "Failed to fetch worker information" };
      }
    }),

  /**
   * Get logged hours for day-rate contractors
   * Endpoint: GET /api/telegram/hours/:chatId
   */
  getHours: publicProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        // Find contractor by chat ID
        const contractor = await db
          .select()
          .from(contractors)
          .where(eq(contractors.telegramChatId, input.chatId))
          .limit(1);

        if (!contractor || contractor.length === 0) {
          return { success: false, error: "Contractor not found" };
        }

        const contractorId = contractor[0].id;

        // Get all completed work sessions
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

        // Calculate totals (hoursWorked is in minutes)
        const totalMinutes = sessions.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        const totalGrossPay = sessions.reduce((sum, s) => sum + (s.grossPay || 0), 0);
        const totalNetPay = sessions.reduce((sum, s) => sum + (s.netPay || 0), 0);

        return {
          success: true,
          data: {
            contractor_name: `${contractor[0].firstName} ${contractor[0].lastName}`,
            total_hours: totalHours,
            total_minutes: remainingMinutes,
            total_gross_pay: totalGrossPay / 100, // Convert pence to pounds
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
        };
      } catch (error) {
        console.error("[Telegram API] Error fetching hours:", error);
        return { success: false, error: "Failed to fetch hours data" };
      }
    }),

  /**
   * Get payment status for day-rate contractors
   * Endpoint: GET /api/telegram/payments/:chatId
   */
  getPayments: publicProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        // Find contractor
        const contractor = await db
          .select()
          .from(contractors)
          .where(eq(contractors.telegramChatId, input.chatId))
          .limit(1);

        if (!contractor || contractor.length === 0) {
          return { success: false, error: "Contractor not found" };
        }

        const contractorId = contractor[0].id;

        // Get all completed sessions
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

        // Calculate payment summary
        const totalEarned = sessions.reduce((sum, s) => sum + (s.netPay || 0), 0);
        const completedSessions = sessions.filter(s => s.status === "completed");
        const activeSessions = sessions.filter(s => s.status === "active");
        
        const totalPaid = completedSessions.reduce((sum, s) => sum + (s.netPay || 0), 0);
        const totalOutstanding = activeSessions.reduce((sum, s) => sum + (s.netPay || 0), 0);

        return {
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
        };
      } catch (error) {
        console.error("[Telegram API] Error fetching payments:", error);
        return { success: false, error: "Failed to fetch payment data" };
      }
    }),

  /**
   * Get active quotes for subcontractors
   * Endpoint: GET /api/telegram/subcontractor/quotes/:chatId
   */
  getSubcontractorQuotes: publicProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        // Find contractor
        const contractor = await db
          .select()
          .from(contractors)
          .where(eq(contractors.telegramChatId, input.chatId))
          .limit(1);

        if (!contractor || contractor.length === 0) {
          return { success: false, error: "Contractor not found" };
        }

        const contractorId = contractor[0].id;

        // Get all job assignments (these are like quotes/contracts for subcontractors)
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

        return {
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
        };
      } catch (error) {
        console.error("[Telegram API] Error fetching quotes:", error);
        return { success: false, error: "Failed to fetch quotes data" };
      }
    }),

  /**
   * Get milestone progress for subcontractors
   * Endpoint: GET /api/telegram/subcontractor/milestones/:chatId
   */
  getSubcontractorMilestones: publicProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        // Find contractor
        const contractor = await db
          .select()
          .from(contractors)
          .where(eq(contractors.telegramChatId, input.chatId))
          .limit(1);

        if (!contractor || contractor.length === 0) {
          return { success: false, error: "Contractor not found" };
        }

        const contractorId = contractor[0].id;

        // Get all assignments with their phases
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

        // Calculate milestone progress
        const milestones = assignments.map(a => {
          const phases = a.selectedPhases ? JSON.parse(a.selectedPhases) : [];
          const totalPhases = phases.length;
          const completedPhases = a.status === "completed" ? totalPhases : 0; // Simplified - could check individual phase completion
          
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

        return {
          success: true,
          data: {
            contractor_name: `${contractor[0].firstName} ${contractor[0].lastName}`,
            total_milestones: milestones.length,
            active_milestones: milestones.filter(m => m.status === "in_progress").length,
            completed_milestones: milestones.filter(m => m.status === "completed").length,
            milestones: milestones,
          }
        };
      } catch (error) {
        console.error("[Telegram API] Error fetching milestones:", error);
        return { success: false, error: "Failed to fetch milestone data" };
      }
    }),

  /**
   * Get payment status for subcontractors
   * Endpoint: GET /api/telegram/subcontractor/payment-status/:chatId
   */
  getSubcontractorPaymentStatus: publicProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        // Find contractor
        const contractor = await db
          .select()
          .from(contractors)
          .where(eq(contractors.telegramChatId, input.chatId))
          .limit(1);

        if (!contractor || contractor.length === 0) {
          return { success: false, error: "Contractor not found" };
        }

        const contractorId = contractor[0].id;

        // Get all assignments with milestone prices
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

        // Calculate payment summary
        const totalValue = assignments.reduce((sum, a) => sum + (a.milestonePrice || 0), 0);
        const completedValue = assignments
          .filter(a => a.status === "completed")
          .reduce((sum, a) => sum + (a.milestonePrice || 0), 0);
        const pendingValue = assignments
          .filter(a => a.status === "in_progress" || a.status === "assigned")
          .reduce((sum, a) => sum + (a.milestonePrice || 0), 0);

        return {
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
        };
      } catch (error) {
        console.error("[Telegram API] Error fetching subcontractor payment status:", error);
        return { success: false, error: "Failed to fetch payment status" };
      }
    }),
});
