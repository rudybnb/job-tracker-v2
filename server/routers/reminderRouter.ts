import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { reminderLogs, checkIns, contractors } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { z } from "zod";

export const reminderRouter = router({
  /**
   * Get all reminder logs with contractor info
   */
  getReminderLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        date: z.string().optional(), // Filter by specific date (YYYY-MM-DD)
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db
        .select({
          id: reminderLogs.id,
          contractorId: reminderLogs.contractorId,
          contractorName: contractors.firstName,
          reminderType: reminderLogs.reminderType,
          sentAt: reminderLogs.sentAt,
          responded: reminderLogs.responded,
          respondedAt: reminderLogs.respondedAt,
          response: reminderLogs.response,
        })
        .from(reminderLogs)
        .leftJoin(contractors, eq(reminderLogs.contractorId, contractors.id))
        .orderBy(desc(reminderLogs.sentAt))
        .limit(input.limit);

      if (input.date) {
        const startDate = new Date(input.date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        query = query.where(
          and(
            gte(reminderLogs.sentAt, startDate),
            lte(reminderLogs.sentAt, endDate)
          )
        ) as any;
      }

      return await query;
    }),

  /**
   * Get check-ins for today or specific date
   */
  getCheckIns: protectedProcedure
    .input(
      z.object({
        date: z.string().optional(), // YYYY-MM-DD format
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const targetDate = input.date ? new Date(input.date) : new Date();
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const checkInsData = await db
        .select({
          id: checkIns.id,
          contractorId: checkIns.contractorId,
          contractorName: contractors.firstName,
          checkInTime: checkIns.checkInTime,
          checkInType: checkIns.checkInType,
          location: checkIns.location,
          notes: checkIns.notes,
        })
        .from(checkIns)
        .leftJoin(contractors, eq(checkIns.contractorId, contractors.id))
        .where(
          and(
            gte(checkIns.checkInTime, targetDate),
            lte(checkIns.checkInTime, nextDay)
          )
        )
        .orderBy(desc(checkIns.checkInTime));

      return checkInsData;
    }),

  /**
   * Get reminder statistics
   */
  getReminderStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startDate = input.startDate ? new Date(input.startDate) : new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - 7); // Last 7 days by default

      const endDate = input.endDate ? new Date(input.endDate) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const logs = await db
        .select()
        .from(reminderLogs)
        .where(
          and(
            gte(reminderLogs.sentAt, startDate),
            lte(reminderLogs.sentAt, endDate)
          )
        );

      const stats = {
        totalReminders: logs.length,
        morningCheckIns: logs.filter((l) => l.reminderType === "morning_checkin").length,
        dailyReports: logs.filter((l) => l.reminderType === "daily_report").length,
        responded: logs.filter((l) => l.responded).length,
        responseRate: logs.length > 0 ? (logs.filter((l) => l.responded).length / logs.length) * 100 : 0,
      };

      return stats;
    }),
});
