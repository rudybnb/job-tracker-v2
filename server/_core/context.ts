import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import { contractors } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // First try Manus OAuth authentication
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // If Manus OAuth fails, try contractor JWT token
    let token = opts.req.cookies?.contractor_token;
    
    if (!token) {
      const authHeader = opts.req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as {
          contractorId: number;
          username: string;
          type: string;
        };

        const database = await getDb();
        if (database) {
          const contractor = await database
            .select()
            .from(contractors)
            .where(eq(contractors.id, decoded.contractorId))
            .limit(1);

          if (contractor.length > 0) {
            const contractorData = contractor[0];
            // Map contractor to User type for compatibility
            user = {
              id: contractorData.id,
              openId: `contractor_${contractorData.id}`,
              name: `${contractorData.firstName} ${contractorData.lastName}`,
              email: contractorData.email || null,
              loginMethod: 'contractor_jwt',
              role: contractorData.username === 'admin' ? 'admin' : 'contractor',
              createdAt: contractorData.createdAt,
              updatedAt: contractorData.updatedAt,
              lastSignedIn: new Date(),
            } as User;
          }
        }
      } catch (jwtError) {
        // JWT verification failed, user remains null
        user = null;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
