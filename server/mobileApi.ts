/**
 * Mobile API endpoints for contractor app integration
 * 
 * These endpoints are used by the contractor mobile app to:
 * - Fetch active job assignments
 * - Clock in/out with GPS tracking
 * - Track task progress
 * - View earnings and payment history
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { getDb } from "./db";
import { workSessions, gpsCheckpoints, taskCompletions, jobAssignments, jobs, contractors } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export const mobileApiRouter = router({
  /**
   * Get contractor's active assignments
   * Returns all assignments for the logged-in contractor
   */
  getMyAssignments: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    // Get contractor by user's open ID
    // Users table links to contractors via openId
    const contractor = await database
      .select()
      .from(contractors)
      .where(eq(contractors.id, ctx.user.id)) // Contractors are also users
      .limit(1);

    if (contractor.length === 0) {
      return [];
    }

    const contractorId = contractor[0].id;

    // Get all assignments for this contractor
    const assignments = await database
      .select({
        assignment: jobAssignments,
        job: jobs,
      })
      .from(jobAssignments)
      .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(eq(jobAssignments.contractorId, contractorId))
      .orderBy(desc(jobAssignments.startDate));

    return assignments.map((row) => ({
      id: row.assignment.id,
      jobId: row.assignment.jobId,
      jobName: row.job?.title || "Unknown",
      jobAddress: row.job?.address || "",
      postCode: row.assignment.workLocation || row.job?.postCode || "",
      startDate: row.assignment.startDate,
      endDate: row.assignment.endDate,
      selectedPhases: row.assignment.selectedPhases 
        ? JSON.parse(row.assignment.selectedPhases) 
        : [],
      specialInstructions: row.assignment.specialInstructions,
      status: row.assignment.status,
      teamAssignment: row.assignment.teamAssignment === 1,
    }));
  }),

  /**
   * Get assignment details with phases and tasks
   */
  getAssignmentDetails: protectedProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get assignment with job details
      const assignment = await database
        .select({
          assignment: jobAssignments,
          job: jobs,
        })
        .from(jobAssignments)
        .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
        .where(eq(jobAssignments.id, input.assignmentId))
        .limit(1);

      if (assignment.length === 0) {
        throw new Error("Assignment not found");
      }

      const assignmentData = assignment[0];
      const selectedPhases = assignmentData.assignment.selectedPhases
        ? JSON.parse(assignmentData.assignment.selectedPhases)
        : [];

      // Get phase costs
      const phaseCosts = await db.getAssignmentPhaseCosts(
        assignmentData.assignment.jobId,
        selectedPhases
      );

      // Get completed tasks
      const completedTasks = await database
        .select()
        .from(taskCompletions)
        .where(eq(taskCompletions.assignmentId, input.assignmentId));

      return {
        id: assignmentData.assignment.id,
        jobId: assignmentData.assignment.jobId,
        jobName: assignmentData.job?.title || "Unknown",
        jobAddress: assignmentData.job?.address || "",
        postCode: assignmentData.assignment.workLocation || assignmentData.job?.postCode || "",
        startDate: assignmentData.assignment.startDate,
        endDate: assignmentData.assignment.endDate,
        phases: selectedPhases,
        specialInstructions: assignmentData.assignment.specialInstructions,
        labourCost: phaseCosts.labourCost,
        materialCost: phaseCosts.materialCost,
        totalCost: phaseCosts.totalCost,
        completedTasks: completedTasks.map((task) => ({
          id: task.id,
          phaseName: task.phaseName,
          taskName: task.taskName,
          completedAt: task.completedAt,
          isVerified: task.isVerified === 1,
        })),
      };
    }),

  /**
   * Get contractor's current work session (if clocked in)
   */
  getCurrentSession: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    // Get contractor by user ID
    const contractor = await database
      .select()
      .from(contractors)
      .where(eq(contractors.id, ctx.user.id))
      .limit(1);

    if (contractor.length === 0) {
      return null;
    }

    const contractorId = contractor[0].id;

    // Get active session (not clocked out)
    const session = await database
      .select()
      .from(workSessions)
      .where(
        and(
          eq(workSessions.contractorId, contractorId),
          eq(workSessions.status, "active")
        )
      )
      .orderBy(desc(workSessions.startTime))
      .limit(1);

    if (session.length === 0) {
      return null;
    }

    return {
      id: session[0].id,
      assignmentId: session[0].assignmentId,
      jobId: session[0].jobId,
      startTime: session[0].startTime,
      clockInLatitude: session[0].clockInLatitude,
      clockInLongitude: session[0].clockInLongitude,
      workSitePostcode: session[0].workSitePostcode,
      isWithinGeofence: session[0].isWithinGeofence === 1,
      distanceFromSite: session[0].distanceFromSite,
    };
  }),

  /**
   * Clock in - Start work session with GPS validation
   * Validates contractor is within 1km of work site
   */
  clockIn: protectedProcedure
    .input(
      z.object({
        assignmentId: z.number(),
        latitude: z.string(),
        longitude: z.string(),
        accuracy: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get contractor ID
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, ctx.user.id))
        .limit(1);

      if (contractor.length === 0) {
        throw new Error("Contractor not found");
      }

      const contractorId = contractor[0].id;

      // Check if already clocked in
      const existingSession = await database
        .select()
        .from(workSessions)
        .where(
          and(
            eq(workSessions.contractorId, contractorId),
            eq(workSessions.status, "active")
          )
        )
        .limit(1);

      if (existingSession.length > 0) {
        throw new Error("Already clocked in. Please clock out first.");
      }

      // Get assignment details for work site location
      const assignment = await database
        .select({
          assignment: jobAssignments,
          job: jobs,
        })
        .from(jobAssignments)
        .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
        .where(eq(jobAssignments.id, input.assignmentId))
        .limit(1);

      if (assignment.length === 0) {
        throw new Error("Assignment not found");
      }

      const assignmentData = assignment[0];
      const workSitePostcode = assignmentData.assignment.workLocation || assignmentData.job?.postCode || "";

      // TODO: Geocode postcode to get work site coordinates
      // For now, we'll use placeholder coordinates
      const workSiteLatitude = "0";
      const workSiteLongitude = "0";

      // Calculate distance from work site (Haversine formula)
      const distance = calculateDistance(
        parseFloat(input.latitude),
        parseFloat(input.longitude),
        parseFloat(workSiteLatitude),
        parseFloat(workSiteLongitude)
      );

      const isWithinGeofence = distance <= 1000; // 1km = 1000 meters

      // Create work session
      await database.insert(workSessions).values({
        jobId: assignmentData.assignment.jobId,
        contractorId,
        assignmentId: input.assignmentId,
        startTime: new Date(),
        clockInLatitude: input.latitude,
        clockInLongitude: input.longitude,
        clockInAccuracy: input.accuracy,
        workSitePostcode,
        workSiteLatitude,
        workSiteLongitude,
        distanceFromSite: Math.round(distance),
        isWithinGeofence: isWithinGeofence ? 1 : 0,
        hourlyRate: contractor[0].hourlyRate || 0,
        status: "active",
      });

      // Get the created session ID
      const createdSession = await database
        .select()
        .from(workSessions)
        .where(
          and(
            eq(workSessions.contractorId, contractorId),
            eq(workSessions.status, "active")
          )
        )
        .orderBy(desc(workSessions.startTime))
        .limit(1);

      const sessionId = createdSession.length > 0 ? createdSession[0].id : 0;

      return {
        success: true,
        sessionId,
        isWithinGeofence,
        distanceFromSite: Math.round(distance),
        message: isWithinGeofence
          ? "Clocked in successfully"
          : `Warning: You are ${Math.round(distance)}m from the work site (should be within 1km)`,
      };
    }),

  /**
   * Clock out - End work session and calculate payment
   * Calculates hours worked, gross pay, CIS deduction, and net pay
   */
  clockOut: protectedProcedure
    .input(
      z.object({
        latitude: z.string(),
        longitude: z.string(),
        accuracy: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get contractor ID
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, ctx.user.id))
        .limit(1);

      if (contractor.length === 0) {
        throw new Error("Contractor not found");
      }

      const contractorId = contractor[0].id;

      // Get active session
      const session = await database
        .select()
        .from(workSessions)
        .where(
          and(
            eq(workSessions.contractorId, contractorId),
            eq(workSessions.status, "active")
          )
        )
        .orderBy(desc(workSessions.startTime))
        .limit(1);

      if (session.length === 0) {
        throw new Error("No active session found. Please clock in first.");
      }

      const activeSession = session[0];
      const clockOutTime = new Date();

      // Calculate hours worked (in minutes)
      const startTime = new Date(activeSession.startTime);
      const minutesWorked = Math.round((clockOutTime.getTime() - startTime.getTime()) / (1000 * 60));

      // Calculate payment
      const hourlyRate = activeSession.hourlyRate || 0; // in pence
      const hoursWorked = minutesWorked / 60;
      const grossPay = Math.round(hoursWorked * hourlyRate); // in pence

      // CIS deduction (default 20% for registered contractors, 30% for non-registered)
      // TODO: Add cisStatus field to contractors table
      const cisRate = 20; // Default to 20% CIS deduction
      const cisDeduction = Math.round(grossPay * (cisRate / 100));
      const netPay = grossPay - cisDeduction;

      // Update session
      await database
        .update(workSessions)
        .set({
          endTime: clockOutTime,
          clockOutLatitude: input.latitude,
          clockOutLongitude: input.longitude,
          clockOutAccuracy: input.accuracy,
          hoursWorked: minutesWorked,
          grossPay,
          amountEarned: grossPay, // backward compat
          cisDeduction,
          netPay,
          status: "completed",
          notes: input.notes,
        })
        .where(eq(workSessions.id, activeSession.id));

      return {
        success: true,
        sessionId: activeSession.id,
        hoursWorked: hoursWorked.toFixed(2),
        grossPay: (grossPay / 100).toFixed(2), // convert to pounds
        cisDeduction: (cisDeduction / 100).toFixed(2),
        netPay: (netPay / 100).toFixed(2),
        cisRate: `${cisRate}%`,
        message: "Clocked out successfully",
      };
    }),

  /**
   * Add GPS checkpoint during active session
   * Tracks contractor location periodically to verify they stay on site
   */
  addGpsCheckpoint: protectedProcedure
    .input(
      z.object({
        latitude: z.string(),
        longitude: z.string(),
        accuracy: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get contractor ID
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, ctx.user.id))
        .limit(1);

      if (contractor.length === 0) {
        throw new Error("Contractor not found");
      }

      const contractorId = contractor[0].id;

      // Get active session
      const session = await database
        .select()
        .from(workSessions)
        .where(
          and(
            eq(workSessions.contractorId, contractorId),
            eq(workSessions.status, "active")
          )
        )
        .orderBy(desc(workSessions.startTime))
        .limit(1);

      if (session.length === 0) {
        throw new Error("No active session found");
      }

      const activeSession = session[0];

      // Calculate distance from work site
      const distance = calculateDistance(
        parseFloat(input.latitude),
        parseFloat(input.longitude),
        parseFloat(activeSession.workSiteLatitude || "0"),
        parseFloat(activeSession.workSiteLongitude || "0")
      );

      const isWithinGeofence = distance <= 1000;

      // Add checkpoint
      await database.insert(gpsCheckpoints).values({
        workSessionId: activeSession.id,
        contractorId,
        timestamp: new Date(),
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        distanceFromSite: Math.round(distance),
        isWithinGeofence: isWithinGeofence ? 1 : 0,
      });

      return {
        success: true,
        isWithinGeofence,
        distanceFromSite: Math.round(distance),
      };
    }),

  /**
   * Get contractor's earnings for a specific week
   * Returns total hours, gross pay, CIS deduction, and net pay
   */
  getWeeklyEarnings: protectedProcedure
    .input(
      z.object({
        weekEnding: z.string(), // ISO date string for end of week (e.g., "2025-11-21")
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get contractor ID
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, ctx.user.id))
        .limit(1);

      if (contractor.length === 0) {
        throw new Error("Contractor not found");
      }

      const contractorId = contractor[0].id;
      const weekEnd = new Date(input.weekEnding);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6); // 7 days including end date

      // Get all completed sessions for the week
      const sessions = await database
        .select()
        .from(workSessions)
        .where(
          and(
            eq(workSessions.contractorId, contractorId),
            eq(workSessions.status, "completed"),
            sql`${workSessions.startTime} >= ${weekStart}`,
            sql`${workSessions.startTime} <= ${weekEnd}`
          )
        )
        .orderBy(workSessions.startTime);

      // Calculate totals
      const totalMinutes = sessions.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
      const totalHours = totalMinutes / 60;
      const grossPay = sessions.reduce((sum, s) => sum + (s.grossPay || 0), 0);
      const cisDeduction = sessions.reduce((sum, s) => sum + (s.cisDeduction || 0), 0);
      const netPay = sessions.reduce((sum, s) => sum + (s.netPay || 0), 0);

      return {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        totalHours: totalHours.toFixed(2),
        grossPay: (grossPay / 100).toFixed(2), // convert to pounds
        cisDeduction: (cisDeduction / 100).toFixed(2),
        netPay: (netPay / 100).toFixed(2),
        sessionCount: sessions.length,
        hourlyRate: contractor[0].hourlyRate ? (contractor[0].hourlyRate / 100).toFixed(2) : "0.00",
        dailyRate: contractor[0].dailyRate ? (contractor[0].dailyRate / 100).toFixed(2) : "0.00",
      };
    }),

  /**
   * Get contractor's payment history
   * Returns all completed work sessions with payment details
   */
  getPaymentHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get contractor ID
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, ctx.user.id))
        .limit(1);

      if (contractor.length === 0) {
        return [];
      }

      const contractorId = contractor[0].id;

      // Get completed sessions with job details
      const sessions = await database
        .select({
          session: workSessions,
          job: jobs,
        })
        .from(workSessions)
        .leftJoin(jobs, eq(workSessions.jobId, jobs.id))
        .where(
          and(
            eq(workSessions.contractorId, contractorId),
            eq(workSessions.status, "completed")
          )
        )
        .orderBy(desc(workSessions.startTime))
        .limit(input.limit)
        .offset(input.offset);

      return sessions.map((row) => ({
        id: row.session.id,
        jobId: row.session.jobId,
        jobName: row.job?.title || "Unknown",
        jobPostcode: row.session.workSitePostcode,
        startTime: row.session.startTime,
        endTime: row.session.endTime,
        hoursWorked: row.session.hoursWorked ? (row.session.hoursWorked / 60).toFixed(2) : "0.00",
        grossPay: row.session.grossPay ? (row.session.grossPay / 100).toFixed(2) : "0.00",
        cisDeduction: row.session.cisDeduction ? (row.session.cisDeduction / 100).toFixed(2) : "0.00",
        netPay: row.session.netPay ? (row.session.netPay / 100).toFixed(2) : "0.00",
        isWithinGeofence: row.session.isWithinGeofence === 1,
        notes: row.session.notes,
      }));
    }),

  /**
   * Export weekly payroll data
   * Returns CSV-formatted data for accounting/payroll systems
   */
  exportWeeklyPayroll: protectedProcedure
    .input(
      z.object({
        weekEnding: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get contractor ID and details
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, ctx.user.id))
        .limit(1);

      if (contractor.length === 0) {
        throw new Error("Contractor not found");
      }

      const contractorData = contractor[0];
      const weekEnd = new Date(input.weekEnding);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      // Get all completed sessions for the week
      const sessions = await database
        .select({
          session: workSessions,
          job: jobs,
        })
        .from(workSessions)
        .leftJoin(jobs, eq(workSessions.jobId, jobs.id))
        .where(
          and(
            eq(workSessions.contractorId, contractorData.id),
            eq(workSessions.status, "completed"),
            sql`${workSessions.startTime} >= ${weekStart}`,
            sql`${workSessions.startTime} <= ${weekEnd}`
          )
        )
        .orderBy(workSessions.startTime);

      // Format as CSV
      const csvRows = [
        ["Date", "Job", "Postcode", "Clock In", "Clock Out", "Hours", "Gross Pay", "CIS (20%)", "Net Pay"],
        ...sessions.map((row) => [
          new Date(row.session.startTime).toLocaleDateString(),
          row.job?.title || "Unknown",
          row.session.workSitePostcode || "",
          new Date(row.session.startTime).toLocaleTimeString(),
          row.session.endTime ? new Date(row.session.endTime).toLocaleTimeString() : "",
          row.session.hoursWorked ? (row.session.hoursWorked / 60).toFixed(2) : "0.00",
          row.session.grossPay ? `£${(row.session.grossPay / 100).toFixed(2)}` : "£0.00",
          row.session.cisDeduction ? `£${(row.session.cisDeduction / 100).toFixed(2)}` : "£0.00",
          row.session.netPay ? `£${(row.session.netPay / 100).toFixed(2)}` : "£0.00",
        ]),
      ];

      const csvContent = csvRows.map((row) => row.join(",")).join("\n");

      return {
        filename: `payroll_${contractorData.firstName}_${contractorData.lastName}_${input.weekEnding}.csv`,
        content: csvContent,
        contractorName: `${contractorData.firstName} ${contractorData.lastName}`,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
      };
    }),

  /**
   * Mark a task as complete
   * Records task completion with optional notes and photos
   */
  completeTask: protectedProcedure
    .input(
      z.object({
        assignmentId: z.number(),
        phaseName: z.string(),
        taskName: z.string(),
        notes: z.string().optional(),
        photoUrls: z.array(z.string()).optional(), // S3 URLs of uploaded photos
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get contractor ID
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, ctx.user.id))
        .limit(1);

      if (contractor.length === 0) {
        throw new Error("Contractor not found");
      }

      const contractorId = contractor[0].id;

      // Record task completion
      await database.insert(taskCompletions).values({
        assignmentId: input.assignmentId,
        contractorId,
        phaseName: input.phaseName,
        taskName: input.taskName,
        completedAt: new Date(),
        notes: input.notes,
        photoUrls: input.photoUrls ? JSON.stringify(input.photoUrls) : null,
        isVerified: 0, // Pending admin verification
      });

      return {
        success: true,
        message: "Task marked as complete",
      };
    }),

  /**
   * Get task progress for an assignment
   * Returns completed and pending tasks
   */
  getTaskProgress: protectedProcedure
    .input(
      z.object({
        assignmentId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get completed tasks
      const completedTasks = await database
        .select()
        .from(taskCompletions)
        .where(eq(taskCompletions.assignmentId, input.assignmentId))
        .orderBy(desc(taskCompletions.completedAt));

      return completedTasks.map((task) => ({
        id: task.id,
        phaseName: task.phaseName,
        taskName: task.taskName,
        completedAt: task.completedAt,
        notes: task.notes,
        photoUrls: task.photoUrls ? JSON.parse(task.photoUrls) : [],
        isVerified: task.isVerified === 1,
        verifiedAt: task.verifiedAt,
      }));
    }),
});


