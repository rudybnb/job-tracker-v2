import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { contractors } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";

export const contractorAuthRouter = router({
  /**
   * Login endpoint for contractors using username/password
   */
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Find contractor by username
      const contractor = await db
        .select()
        .from(contractors)
        .where(eq(contractors.username, input.username))
        .limit(1);

      if (contractor.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      const contractorData = contractor[0];

      // Check if contractor has a password set
      if (!contractorData.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Account not set up for login. Please contact admin.",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        input.password,
        contractorData.passwordHash
      );

      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // Check if contractor is approved
      if (contractorData.status !== "approved") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account is pending approval",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          contractorId: contractorData.id,
          username: contractorData.username,
          type: "contractor",
        },
        ENV.cookieSecret,
        { expiresIn: "7d" }
      );

      // Set session cookie with JWT token
      ctx.res.cookie("contractor_session", token, {
        httpOnly: false, // Allow client-side access for localStorage sync
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      return {
        success: true,
        token, // Return token to client
        contractor: {
          id: contractorData.id,
          firstName: contractorData.firstName,
          lastName: contractorData.lastName,
          email: contractorData.email,
          type: contractorData.type,
          primaryTrade: contractorData.primaryTrade,
          username: contractorData.username,
        },
      };
    }),

  /**
   * Get current contractor session
   */
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies["contractor_session"];

    if (!token) {
      return null;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, ENV.cookieSecret) as {
        contractorId: number;
        username: string;
        type: string;
      };

      if (decoded.type !== "contractor") {
        return null;
      }

      const db = await getDb();
      if (!db) {
        return null;
      }

      const contractor = await db
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
        firstName: contractorData.firstName,
        lastName: contractorData.lastName,
        email: contractorData.email,
        type: contractorData.type,
        primaryTrade: contractorData.primaryTrade,
        username: contractorData.username,
      };
    } catch (error) {
      // Token is invalid or expired
      return null;
    }
  }),

  /**
   * Logout contractor
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie("contractor_session", { path: "/" });
    return { success: true };
  }),
});
