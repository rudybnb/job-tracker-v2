import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  jobs,
  InsertJob,
  buildPhases,
  InsertBuildPhase,
  jobResources,
  InsertJobResource,
  csvUploads,
  InsertCsvUpload,
  workSessions,
  InsertWorkSession,
  clients,
  InsertClient,
  jobBudgets,
  InsertJobBudget,
  phaseBudgets,
  InsertPhaseBudget,
  expenses,
  InsertExpense,
  contractors,
  InsertContractor,
  jobAssignments,
  InsertJobAssignment,
  contractorApplications,
  InsertContractorApplication,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User operations
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllContractors() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contractors).orderBy(desc(contractors.createdAt));
}

export async function createContractor(contractor: InsertContractor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contractors).values(contractor);
  const insertId = Number(result[0]?.insertId || 0);
  return { insertId };
}

export async function getContractorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Job operations
export async function createJob(job: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobs).values(job);
  // For MySQL/TiDB, the insertId is in result[0].insertId
  const insertId = Number(result[0]?.insertId || 0);
  return { insertId };
}

export async function getAllJobs() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getJobsByContractor(contractorId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(jobs)
    .where(eq(jobs.assignedContractorId, contractorId))
    .orderBy(desc(jobs.createdAt));
}

export async function updateJob(id: number, data: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobs).set(data).where(eq(jobs.id, id));
}

// Job resources operations
export async function createJobResource(resource: InsertJobResource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobResources).values(resource);
  const insertId = Number(result[0]?.insertId || 0);
  return { insertId };
}

export async function getJobResources(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobResources).where(eq(jobResources.jobId, jobId));
}

export async function deleteJob(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related records first (phases, assignments, etc.)
  await db.delete(buildPhases).where(eq(buildPhases.jobId, id));
  await db.delete(jobAssignments).where(eq(jobAssignments.jobId, id));
  await db.delete(workSessions).where(eq(workSessions.jobId, id));
  await db.delete(expenses).where(eq(expenses.jobId, id));
  await db.delete(jobBudgets).where(eq(jobBudgets.jobId, id));
  // Finally delete the job
  await db.delete(jobs).where(eq(jobs.id, id));
}

export async function assignJobToContractor(jobId: number, contractorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobs).set({ assignedContractorId: contractorId }).where(eq(jobs.id, jobId));
}

// Build phase operations
export async function createBuildPhase(phase: InsertBuildPhase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(buildPhases).values(phase);
  const insertId = Number(result[0]?.insertId || 0);
  return { insertId };
}

export async function getPhasesByJobId(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(buildPhases).where(eq(buildPhases.jobId, jobId)).orderBy(buildPhases.order);
}

export async function updatePhase(id: number, data: Partial<InsertBuildPhase>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(buildPhases).set(data).where(eq(buildPhases.id, id));
}

// CSV upload operations
export async function createCsvUpload(upload: InsertCsvUpload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(csvUploads).values(upload);
  const insertId = Number(result[0]?.insertId || 0);
  return { insertId };
}

export async function updateCsvUpload(id: number, data: Partial<InsertCsvUpload>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(csvUploads).set(data).where(eq(csvUploads.id, id));
}

export async function getRecentUploads(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(csvUploads).orderBy(desc(csvUploads.createdAt)).limit(limit);
}

export async function deleteUploadAndJobs(uploadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all jobs created from this upload
  const jobsFromUpload = await db.select().from(jobs).where(eq(jobs.uploadId, uploadId));
  
  // Delete all related data for each job
  for (const job of jobsFromUpload) {
    await deleteJob(job.id);
  }
  
  // Finally delete the upload record
  await db.delete(csvUploads).where(eq(csvUploads.id, uploadId));
}

// Work session operations
export async function createWorkSession(session: InsertWorkSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workSessions).values(session);
  return result;
}

export async function getWorkSessionsByJob(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workSessions).where(eq(workSessions.jobId, jobId)).orderBy(desc(workSessions.startTime));
}

export async function getWorkSessionsByContractor(contractorId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(workSessions)
    .where(eq(workSessions.contractorId, contractorId))
    .orderBy(desc(workSessions.startTime));
}

export async function endWorkSession(id: number, endTime: Date, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workSessions).set({ endTime, notes }).where(eq(workSessions.id, id));
}

// Client operations
export async function createClient(client: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(client);
  return result;
}

export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Job budget operations
export async function createJobBudget(budget: InsertJobBudget) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobBudgets).values(budget);
  return result;
}

export async function getJobBudgetByJobId(jobId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobBudgets).where(eq(jobBudgets.jobId, jobId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateJobBudget(id: number, data: Partial<InsertJobBudget>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobBudgets).set(data).where(eq(jobBudgets.id, id));
}

// Phase budget operations
export async function createPhaseBudget(budget: InsertPhaseBudget) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(phaseBudgets).values(budget);
  return result;
}

export async function getPhaseBudgetByPhaseId(phaseId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(phaseBudgets).where(eq(phaseBudgets.phaseId, phaseId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Expense operations
export async function createExpense(expense: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values(expense);
  return result;
}

export async function getExpensesByJob(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).where(eq(expenses.jobId, jobId)).orderBy(desc(expenses.date));
}

export async function getExpensesByPhase(phaseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).where(eq(expenses.phaseId, phaseId)).orderBy(desc(expenses.date));
}

// Job assignment operations
export async function createJobAssignment(assignment: InsertJobAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobAssignments).values(assignment);
  return result;
}

export async function getAllJobAssignments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobAssignments).orderBy(desc(jobAssignments.createdAt));
}

export async function getJobAssignmentsByJob(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobAssignments).where(eq(jobAssignments.jobId, jobId)).orderBy(desc(jobAssignments.createdAt));
}

export async function getJobAssignmentsByContractor(contractorId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobAssignments).where(eq(jobAssignments.contractorId, contractorId)).orderBy(desc(jobAssignments.createdAt));
}

// Contractor Application operations
export async function createContractorApplication(application: InsertContractorApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(contractorApplications).values(application);
  const insertId = Number(result[0]?.insertId || 0);
  return { insertId };
}

export async function getAllContractorApplications() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(contractorApplications).orderBy(contractorApplications.createdAt);
}

export async function getContractorApplicationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(contractorApplications).where(eq(contractorApplications.id, id)).limit(1);
  return result[0] || null;
}

export async function getContractorApplicationsByStatus(status: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(contractorApplications)
    .where(eq(contractorApplications.status, status))
    .orderBy(contractorApplications.createdAt);
}

export async function updateContractorApplicationStatus(
  id: number,
  status: "pending" | "approved" | "rejected",
  adminNotes?: string,
  cisRate?: number,
  approvedBy?: number,
  contractorId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {
    status,
    approvedAt: new Date(),
  };
  
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
  if (cisRate !== undefined) updateData.cisRate = cisRate;
  if (approvedBy !== undefined) updateData.approvedBy = approvedBy;
  if (contractorId !== undefined) updateData.contractorId = contractorId;
  
  await db.update(contractorApplications)
    .set(updateData)
    .where(eq(contractorApplications.id, id));
}

export async function getContractorApplicationStats() {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0 };
  
  const allApplications = await db.select().from(contractorApplications);
  
  return {
    pending: allApplications.filter(a => a.status === "pending").length,
    approved: allApplications.filter(a => a.status === "approved").length,
    rejected: allApplications.filter(a => a.status === "rejected").length,
  };
}
