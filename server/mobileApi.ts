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
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import * as db from "./db";
import { getDb } from "./db";
import { workSessions, gpsCheckpoints, taskCompletions, jobAssignments, jobs, contractors, buildPhases, progressReports } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

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
   * Contractor login with username and password
   * Returns JWT token for authentication
   */
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Find contractor by username
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.username, input.username))
        .limit(1);

      if (contractor.length === 0) {
        throw new Error("Invalid username or password");
      }

      const contractorData = contractor[0];

      // Verify password
      if (!contractorData.passwordHash) {
        throw new Error("Invalid username or password");
      }

      const passwordMatch = await bcrypt.compare(
        input.password,
        contractorData.passwordHash
      );

      if (!passwordMatch) {
        throw new Error("Invalid username or password");
      }

      // Check if contractor is approved
      if (contractorData.status !== "approved") {
        throw new Error("Account not approved yet");
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          contractorId: contractorData.id,
          username: contractorData.username,
          type: "contractor",
        },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "30d" }
      );

      // Set cookie
      ctx.res.cookie("contractor_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return {
        success: true,
        contractor: {
          id: contractorData.id,
          username: contractorData.username,
          firstName: contractorData.firstName,
          lastName: contractorData.lastName,
          email: contractorData.email,
          primaryTrade: contractorData.primaryTrade,
          hourlyRate: contractorData.hourlyRate,
        },
        token,
      };
    }),

  /**
   * Contractor logout
   * Clears authentication cookie
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie("contractor_token");
    return { success: true };
  }),

  /**
   * Get current contractor from JWT token
   * Returns contractor info if logged in, null otherwise
   */
  me: publicProcedure.query(async ({ ctx }) => {
    // Check for token in cookie or Authorization header
    let token = ctx.req.cookies?.contractor_token;
    
    if (!token) {
      const authHeader = ctx.req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return null;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as {
        contractorId: number;
        username: string;
        type: string;
      };

      const database = await getDb();
      if (!database) {
        return null;
      }

      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, decoded.contractorId))
        .limit(1);

      if (contractor.length === 0) {
        return null;
      }

      const contractorData = contractor[0];
      return {
        id: contractorData.id,
        username: contractorData.username,
        firstName: contractorData.firstName,
        lastName: contractorData.lastName,
        email: contractorData.email,
        type: contractorData.type,
        primaryTrade: contractorData.primaryTrade,
        hourlyRate: contractorData.hourlyRate,
        paymentType: contractorData.paymentType,
      };
    } catch (error) {
      return null;
    }
  }),
  /**
   * Get contractor's active assignments
   * Returns all assignments for the logged-in contractor
   */
  getMyAssignments: publicProcedure.query(async ({ ctx }) => {
    // Get contractor token from cookie or Authorization header
    let token = ctx.req.cookies?.contractor_token;
    
    if (!token) {
      const authHeader = ctx.req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return [];
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as {
        contractorId: number;
        username: string;
        type: string;
      };

      const database = await getDb();
      if (!database) {
        return [];
      }

      const contractorId = decoded.contractorId;

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
    } catch (error) {
      console.error('[getMyAssignments] Error:', error);
      return [];
    }
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
  getCurrentSession: publicProcedure.query(async ({ ctx }) => {
    // Extract contractor ID from JWT token
    let token = ctx.req.cookies?.contractor_token;
    
    if (!token) {
      const authHeader = ctx.req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return null;
    }

    try {
      const decoded = jwt.verify(token, ENV.cookieSecret) as {
        contractorId: number;
        username: string;
        type: string;
      };

      const contractorId = decoded.contractorId;

      const database = await getDb();
      if (!database) {
        return null;
      }

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
    } catch (err) {
      console.error('[getCurrentSession] Error:', err);
      return null;
    }
  }),

  /**
   * Clock in - Start work session with GPS validation
   * Validates contractor is within 1km of work site
   */
  clockIn: publicProcedure
    .input(
      z.object({
        assignmentId: z.number(),
        latitude: z.string(),
        longitude: z.string(),
        accuracy: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Extract contractor ID from JWT token
      let token = ctx.req.cookies?.contractor_token;
      
      if (!token) {
        const authHeader = ctx.req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      const decoded = jwt.verify(token, ENV.cookieSecret) as {
        contractorId: number;
        username: string;
        type: string;
      };

      const contractorId = decoded.contractorId;

      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get contractor details
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, contractorId))
        .limit(1);

      if (contractor.length === 0) {
        throw new Error("Contractor not found");
      }

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

      // Get work site GPS coordinates from job
      const workSiteLatitude = assignmentData.job?.latitude || "0";
      const workSiteLongitude = assignmentData.job?.longitude || "0";

      // Validate job has GPS coordinates
      if (workSiteLatitude === "0" || workSiteLongitude === "0") {
        throw new Error("Job site GPS coordinates not set. Please contact admin to add location.");
      }

      // Calculate distance from work site (Haversine formula)
      const distance = calculateDistance(
        parseFloat(input.latitude),
        parseFloat(input.longitude),
        parseFloat(workSiteLatitude),
        parseFloat(workSiteLongitude)
      );

      const isWithinGeofence = distance <= 10; // 10 meters geofence radius

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
          : `Warning: You are ${Math.round(distance)}m from the work site (must be within 10m)`,
      };
    }),

  /**
   * Clock out - End work session and calculate payment
   * Calculates hours worked, gross pay, CIS deduction, and net pay
   */
  clockOut: publicProcedure
    .input(
      z.object({
        latitude: z.string(),
        longitude: z.string(),
        accuracy: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Extract contractor ID from JWT token
      let token = ctx.req.cookies?.contractor_token;
      
      if (!token) {
        const authHeader = ctx.req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      const decoded = jwt.verify(token, ENV.cookieSecret) as {
        contractorId: number;
        username: string;
        type: string;
      };

      const contractorId = decoded.contractorId;

      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get contractor details
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, contractorId))
        .limit(1);

      if (contractor.length === 0) {
        throw new Error("Contractor not found");
      }

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
  addGpsCheckpoint: publicProcedure
    .input(
      z.object({
        latitude: z.string(),
        longitude: z.string(),
        accuracy: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Extract contractor ID from JWT token
      let token = ctx.req.cookies?.contractor_token;
      
      if (!token) {
        const authHeader = ctx.req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      const decoded = jwt.verify(token, ENV.cookieSecret) as {
        contractorId: number;
        username: string;
        type: string;
      };

      const contractorId = decoded.contractorId;

      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

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

      const isWithinGeofence = distance <= 10; // 10 meters geofence radius

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
  getWeeklyEarnings: publicProcedure
    .input(
      z.object({
        weekEnding: z.string(), // ISO date string for end of week (e.g., "2025-11-21")
      })
    )
    .query(async ({ input, ctx }) => {
      // Extract contractor ID from JWT token
      let token = ctx.req.cookies?.contractor_token;
      
      if (!token) {
        const authHeader = ctx.req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      const decoded = jwt.verify(token, ENV.cookieSecret) as {
        contractorId: number;
        username: string;
        type: string;
      };

      const contractorId = decoded.contractorId;

      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get contractor details for rates
      const contractor = await database
        .select()
        .from(contractors)
        .where(eq(contractors.id, contractorId))
        .limit(1);

      if (contractor.length === 0) {
        throw new Error("Contractor not found");
      }

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
  getPaymentHistory: publicProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      // Extract contractor ID from JWT token
      let token = ctx.req.cookies?.contractor_token;
      
      if (!token) {
        const authHeader = ctx.req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        return [];
      }

      try {
        const decoded = jwt.verify(token, ENV.cookieSecret) as {
          contractorId: number;
          username: string;
          type: string;
        };

        const contractorId = decoded.contractorId;

        const database = await getDb();
        if (!database) {
          return [];
        }

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
      } catch (err) {
        console.error('[getPaymentHistory] Error:', err);
        return [];
      }
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
  completeTask: publicProcedure
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
      // Extract contractor ID from JWT token
      let token = ctx.req.cookies?.contractor_token;
      
      if (!token) {
        const authHeader = ctx.req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      const decoded = jwt.verify(token, ENV.cookieSecret) as {
        contractorId: number;
        username: string;
        type: string;
      };

      const contractorId = decoded.contractorId;

      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

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

  /**
   * Get task completions for contractor
   * Returns all tasks completed by the logged-in contractor
   */
  getTaskCompletions: publicProcedure.query(async ({ ctx }) => {
    let token = ctx.req.cookies?.contractor_token;
    
    if (!token) {
      const authHeader = ctx.req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return [];
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as {
        contractorId: number;
        username: string;
        type: string;
      };

      const database = await getDb();
      if (!database) {
        return [];
      }

      const completions = await database
        .select()
        .from(taskCompletions)
        .where(eq(taskCompletions.contractorId, decoded.contractorId))
        .orderBy(desc(taskCompletions.completedAt));

      return completions.map((task) => ({
        id: task.id,
        assignmentId: task.assignmentId,
        phaseName: task.phaseName,
        taskName: task.taskName,
        completedAt: task.completedAt,
        notes: task.notes,
        photoUrls: task.photoUrls ? JSON.parse(task.photoUrls) : [],
        isVerified: task.isVerified === 1,
      }));
    } catch (error) {
      console.error('[getTaskCompletions] Error:', error);
      return [];
    }
  }),

  /**
   * Mark task as complete (contractor version)
   */
  markTaskComplete: publicProcedure
    .input(
      z.object({
        assignmentId: z.number(),
        phaseName: z.string(),
        taskName: z.string(),
        notes: z.string().optional(),
        photoUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let token = ctx.req.cookies?.contractor_token;
      
      if (!token) {
        const authHeader = ctx.req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as {
          contractorId: number;
          username: string;
          type: string;
        };

        const database = await getDb();
        if (!database) {
          throw new Error("Database not available");
        }

        // Check if task already completed
        const existing = await database
          .select()
          .from(taskCompletions)
          .where(
            and(
              eq(taskCompletions.contractorId, decoded.contractorId),
              eq(taskCompletions.assignmentId, input.assignmentId),
              eq(taskCompletions.phaseName, input.phaseName),
              eq(taskCompletions.taskName, input.taskName)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          throw new Error("Task already completed");
        }

        // Record task completion
        await database.insert(taskCompletions).values({
          assignmentId: input.assignmentId,
          contractorId: decoded.contractorId,
          phaseName: input.phaseName,
          taskName: input.taskName,
          completedAt: new Date(),
          notes: input.notes || null,
          photoUrls: input.photoUrls ? JSON.stringify(input.photoUrls) : null,
          isVerified: 0,
        });

        return {
          success: true,
          message: "Task marked as complete",
        };
      } catch (error) {
        console.error('[markTaskComplete] Error:', error);
        throw error;
      }
    }),

  /**
   * Get phase with tasks
   */
  getPhaseWithTasks: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
        phaseName: z.string(),
      })
    )
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        return null;
      }

      const phase = await database
        .select()
        .from(buildPhases)
        .where(
          and(
            eq(buildPhases.jobId, input.jobId),
            eq(buildPhases.phaseName, input.phaseName)
          )
        )
        .limit(1);

      if (phase.length === 0) {
        return null;
      }

      const phaseData = phase[0];
      return {
        id: phaseData.id,
        phaseName: phaseData.phaseName,
        status: phaseData.status,
        tasks: phaseData.tasks ? JSON.parse(phaseData.tasks) : [],
      };
    }),

  /**
   * Upload progress photo to S3
   * Returns the S3 URL for the uploaded photo
   */
  uploadProgressPhoto: publicProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file data
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { storagePut } = await import("./storage");
        
        // Decode base64 file data
        const buffer = Buffer.from(input.fileData, 'base64');
        
        // Generate unique file key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileKey = `progress-photos/${timestamp}-${randomSuffix}-${input.fileName}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        return {
          success: true,
          url,
        };
      } catch (error) {
        console.error('[uploadProgressPhoto] Error:', error);
        throw new Error('Failed to upload photo');
      }
    }),

  /**
   * Submit progress report with photos and notes
   */
  submitProgressReport: publicProcedure
    .input(
      z.object({
        assignmentId: z.number(),
        jobId: z.number(),
        phaseName: z.string().optional(),
        taskName: z.string().optional(),
        notes: z.string(),
        photoUrls: z.array(z.string()),
        reportDate: z.string(), // ISO date string
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Extract contractor ID from JWT token (same pattern as me endpoint)
        const authHeader = ctx.req.headers.authorization;
        let contractorId: number | null = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const decoded = jwt.verify(token, ENV.cookieSecret) as { contractorId: number };
            contractorId = decoded.contractorId;
          } catch (err) {
            console.error('[submitProgressReport] Invalid token:', err);
            throw new Error('Invalid authentication token');
          }
        }

        if (!contractorId) {
          throw new Error('Authentication required');
        }

        const database = await getDb();
        if (!database) {
          throw new Error('Database not available');
        }

        // Insert progress report
        await database.insert(progressReports).values({
          contractorId,
          assignmentId: input.assignmentId,
          jobId: input.jobId,
          reportDate: new Date(input.reportDate),
          phaseName: input.phaseName || null,
          taskName: input.taskName || null,
          notes: input.notes,
          photoUrls: JSON.stringify(input.photoUrls),
          status: 'submitted',
        });

        return {
          success: true,
          message: 'Progress report submitted successfully',
        };
      } catch (error) {
        console.error('[submitProgressReport] Error:', error);
        throw error;
      }
    }),

  /**
   * Get progress reports for a contractor
   */
  getProgressReports: publicProcedure
    .input(
      z.object({
        assignmentId: z.number().optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Extract contractor ID from JWT token
        const authHeader = ctx.req.headers.authorization;
        let contractorId: number | null = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const decoded = jwt.verify(token, ENV.cookieSecret) as { contractorId: number };
            contractorId = decoded.contractorId;
          } catch (err) {
            console.error('[getProgressReports] Invalid token:', err);
            return [];
          }
        }

        if (!contractorId) {
          return [];
        }

        const database = await getDb();
        if (!database) {
          return [];
        }

        // Build query conditions
        const conditions = [eq(progressReports.contractorId, contractorId)];
        if (input.assignmentId) {
          conditions.push(eq(progressReports.assignmentId, input.assignmentId));
        }

        // Fetch progress reports
        const reports = await database
          .select()
          .from(progressReports)
          .where(and(...conditions))
          .orderBy(desc(progressReports.reportDate))
          .limit(input.limit);

        // Parse photo URLs from JSON
        return reports.map(report => ({
          ...report,
          photoUrls: report.photoUrls ? JSON.parse(report.photoUrls) : [],
        }));
      } catch (error) {
        console.error('[getProgressReports] Error:', error);
        return [];
      }
    }),
});


