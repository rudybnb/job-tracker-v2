import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { contractors } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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

      // Set session cookie for contractor
      // Store contractor ID in session
      ctx.res.cookie("contractor_session", contractorData.id.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        success: true,
        contractor: {
          id: contractorData.id,
          firstName: contractorData.firstName,
          lastName: contractorData.lastName,
          email: contractorData.email,
          type: contractorData.type,
          primaryTrade: contractorData.primaryTrade,
        },
      };
    }),

  /**
   * Get current contractor session
   */
  me: publicProcedure.query(async ({ ctx }) => {
    const contractorId = ctx.req.cookies["contractor_session"];

    if (!contractorId) {
      return null;
    }

    const db = await getDb();
    if (!db) {
      return null;
    }

    const contractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, parseInt(contractorId)))
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
    };
  }),

  /**
   * Logout contractor
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie("contractor_session");
    return { success: true };
  }),
});
