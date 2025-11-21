import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
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
  phaseCompletions,
  InsertPhaseCompletion,
  progressReports,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Render PostgreSQL
      });
      _db = drizzle(_pool);
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

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
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
  const result = await db.insert(contractors).values(contractor).returning({ id: contractors.id });
  const insertId = result[0]?.id || 0;
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
  const result = await db.insert(jobs).values(job).returning({ id: jobs.id });
  // For MySQL/TiDB, the insertId is in result[0].insertId
  const insertId = result[0]?.id || 0;
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
  const result = await db.insert(jobResources).values(resource).returning({ id: jobResources.id });
  const insertId = result[0]?.id || 0;
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
  
  // Get job details to check for postcode
  const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (job.length === 0) {
    throw new Error("Job not found");
  }
  
  const updateData: any = { assignedContractorId: contractorId };
  
  // If job has a postcode but no GPS coordinates, geocode it
  if (job[0].postCode && (!job[0].latitude || !job[0].longitude)) {
    try {
      const { geocodePostcode } = await import("./geocoding");
      const geocodeResult = await geocodePostcode(job[0].postCode);
      updateData.latitude = geocodeResult.latitude;
      updateData.longitude = geocodeResult.longitude;
      console.log(`Geocoded ${job[0].postCode} to ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
    } catch (error) {
      console.error(`Failed to geocode postcode ${job[0].postCode}:`, error);
      // Continue with assignment even if geocoding fails
    }
  }
  
  await db.update(jobs).set(updateData).where(eq(jobs.id, jobId));
}

// Build phase operations
export async function createBuildPhase(phase: InsertBuildPhase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(buildPhases).values(phase).returning({ id: buildPhases.id });
  const insertId = result[0]?.id || 0;
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
  const result = await db.insert(csvUploads).values(upload).returning({ id: csvUploads.id });
  const insertId = result[0]?.id || 0;
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
  const result = await db.insert(jobAssignments).values(assignment).returning({ id: jobAssignments.id });
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
  
  const result = await db.insert(contractorApplications).values(application).returning({ id: contractorApplications.id });
  const insertId = result[0]?.id || 0;
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

// Update contractor admin details
export async function updateContractorAdminDetails(data: {
  id: number;
  primaryTrade?: string;
  paymentType?: "day_rate" | "price_work";
  hourlyRate?: number;
  dailyRate?: number;
  cisVerified?: boolean;
  adminNotes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (data.primaryTrade !== undefined) updateData.primaryTrade = data.primaryTrade;
  if (data.paymentType !== undefined) updateData.paymentType = data.paymentType;
  if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate;
  if (data.dailyRate !== undefined) updateData.dailyRate = data.dailyRate;
  if (data.cisVerified !== undefined) updateData.cisVerified = data.cisVerified;
  if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;

  await db.update(contractors).set(updateData).where(eq(contractors.id, data.id));
}

// Get contractor application by contractor ID
export async function getContractorApplicationByContractorId(contractorId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const results = await db
    .select()
    .from(contractorApplications)
    .where(eq(contractorApplications.contractorId, contractorId))
    .limit(1);

  return results.length > 0 ? results[0] : undefined;
}

// Delete contractor
export async function deleteContractor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(contractors).where(eq(contractors.id, id));
}

// Get phase cost breakdown for a job
export async function getJobPhaseCosts(jobId: number) {
  const db = await getDb();
  if (!db) return [];

  const resources = await db
    .select()
    .from(jobResources)
    .where(eq(jobResources.jobId, jobId));

  // Group by buildPhase and calculate labour/material costs
  const phaseMap = new Map<string, { labourCost: number; materialCost: number }>();

  for (const resource of resources) {
    const phase = resource.buildPhase || "Unknown Phase";
    
    if (!phaseMap.has(phase)) {
      phaseMap.set(phase, { labourCost: 0, materialCost: 0 });
    }

    const phaseCosts = phaseMap.get(phase)!;
    
    if (resource.typeOfResource === "Labour") {
      phaseCosts.labourCost += resource.cost || 0;
    } else if (resource.typeOfResource === "Material") {
      phaseCosts.materialCost += resource.cost || 0;
    }
  }

  // Convert map to array with totals
  return Array.from(phaseMap.entries()).map(([phaseName, costs]) => ({
    phaseName,
    labourCost: costs.labourCost,
    materialCost: costs.materialCost,
    totalCost: costs.labourCost + costs.materialCost,
  }));
}

// Get material resources for a specific job phase
export async function getPhaseMaterials(jobId: number, phaseName: string) {
  const db = await getDb();
  if (!db) return [];

  const materials = await db
    .select()
    .from(jobResources)
    .where(
      eq(jobResources.jobId, jobId)
    );

  // Filter by phase and material type
  return materials.filter(
    resource => 
      resource.buildPhase === phaseName && 
      resource.typeOfResource === "Material"
  );
}

// Get labour and material costs for specific phases of a job
export async function getAssignmentPhaseCosts(jobId: number, phaseNames: string[]) {
  const db = await getDb();
  if (!db) return { labourCost: 0, materialCost: 0, totalCost: 0 };

  // Get all resources for this job
  const resources = await db
    .select()
    .from(jobResources)
    .where(eq(jobResources.jobId, jobId));

  // Filter resources by selected phases and sum costs
  let labourCost = 0;
  let materialCost = 0;

  resources.forEach(resource => {
    if (phaseNames.includes(resource.buildPhase || '')) {
      const cost = resource.cost || 0;
      if (resource.typeOfResource === 'Labour') {
        labourCost += cost;
      } else if (resource.typeOfResource === 'Material') {
        materialCost += cost;
      }
    }
  });

  return {
    labourCost,
    materialCost,
    totalCost: labourCost + materialCost,
  };
}

// Calculate labour time validation for assignment
export async function getAssignmentTimeValidation(
  jobId: number, 
  phaseNames: string[], 
  startDate: Date, 
  endDate: Date,
  contractorCount: number = 1
) {
  const db = await getDb();
  if (!db) return { 
    requiredDays: 0, 
    availableDays: 0, 
    status: 'unknown' as const,
    message: 'Database not available'
  };

  // Get all labour resources for this job and selected phases
  const resources = await db
    .select()
    .from(jobResources)
    .where(eq(jobResources.jobId, jobId));

  // Sum up labour quantities (hours/days) for selected phases
  let totalLabourQuantity = 0;
  resources.forEach(resource => {
    if (
      resource.typeOfResource === 'Labour' && 
      phaseNames.includes(resource.buildPhase || '')
    ) {
      totalLabourQuantity += resource.orderQuantity || 0;
    }
  });

  // Calculate available working days (excluding weekends optionally)
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const timeDiff = endDate.getTime() - startDate.getTime();
  const availableDays = Math.ceil(timeDiff / millisecondsPerDay) + 1; // +1 to include both start and end dates

  // Assume labour quantity is in days (you may need to adjust if it's in hours)
  // Adjust for multiple contractors: more contractors = less time needed
  const requiredDays = contractorCount > 1 
    ? Math.ceil(totalLabourQuantity / contractorCount)
    : totalLabourQuantity;

  // Determine status
  let status: 'ok' | 'warning' | 'exceeded';
  let message: string;

  const contractorInfo = contractorCount > 1 ? ` with ${contractorCount} contractors` : '';
  
  if (requiredDays === 0) {
    status = 'ok';
    message = 'No labour time data available';
  } else if (requiredDays <= availableDays) {
    status = 'ok';
    message = `✓ Time allocation OK (${requiredDays} days needed, ${availableDays} days allocated${contractorInfo})`;
  } else if (requiredDays <= availableDays * 1.2) {
    // Within 20% over
    status = 'warning';
    message = `⚠️ Tight schedule (${requiredDays} days needed, ${availableDays} days allocated${contractorInfo})`;
  } else {
    status = 'exceeded';
    message = `❌ Insufficient time (${requiredDays} days needed, only ${availableDays} days allocated${contractorInfo})`;
  }

  return {
    requiredDays,
    availableDays,
    status,
    message,
  };
}

// Phase completion tracking for efficiency analysis
export async function createPhaseCompletion(data: {
  jobId: number;
  phaseName: string;
  contractorId: number;
  assignmentId?: number;
  estimatedLabourDays: number;
  actualDaysWorked: number;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate: Date;
  actualEndDate: Date;
  qualityRating?: number;
  notes?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate efficiency multiplier (actual / estimated * 100)
  const efficiencyMultiplier = Math.round((data.actualDaysWorked / data.estimatedLabourDays) * 100);

  await db.insert(phaseCompletions).values({
    ...data,
    efficiencyMultiplier,
  });
}

// Get phase completion history for a contractor
export async function getContractorEfficiency(contractorId: number) {
  const db = await getDb();
  if (!db) return [];

  const completions = await db
    .select()
    .from(phaseCompletions)
    .where(eq(phaseCompletions.contractorId, contractorId));

  return completions;
}

// Get average efficiency multiplier by phase type
export async function getPhaseEfficiencyByType(phaseName: string) {
  const db = await getDb();
  if (!db) return null;

  const completions = await db
    .select()
    .from(phaseCompletions)
    .where(eq(phaseCompletions.phaseName, phaseName));

  if (completions.length === 0) return null;

  const avgMultiplier = completions.reduce((sum, c) => sum + (c.efficiencyMultiplier || 100), 0) / completions.length;

  return {
    phaseName,
    completionCount: completions.length,
    averageEfficiencyMultiplier: Math.round(avgMultiplier),
    averageQualityRating: completions.filter(c => c.qualityRating).length > 0
      ? completions.reduce((sum, c) => sum + (c.qualityRating || 0), 0) / completions.filter(c => c.qualityRating).length
      : null,
  };
}

// Get all phase completions for a job
export async function getJobPhaseCompletions(jobId: number) {
  const db = await getDb();
  if (!db) return [];

  const completions = await db
    .select()
    .from(phaseCompletions)
    .where(eq(phaseCompletions.jobId, jobId));

  return completions;
}

// Calculate contractor payment for assignment (daily rate × working days)
export async function getContractorPayment(
  contractorId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return {
    dailyRate: 0,
    workingDays: 0,
    totalPayment: 0,
    contractorName: 'Unknown'
  };

  // Get contractor's daily rate
  const contractor = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1);

  if (contractor.length === 0) {
    return {
      dailyRate: 0,
      workingDays: 0,
      totalPayment: 0,
      contractorName: 'Unknown'
    };
  }

  const dailyRate = contractor[0].dailyRate || 0; // in pence
  const contractorName = `${contractor[0].firstName} ${contractor[0].lastName}`;

  // Calculate working days (inclusive of start and end dates)
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const workingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

  // Calculate total payment
  const totalPayment = dailyRate * workingDays;

  return {
    dailyRate,
    workingDays,
    totalPayment,
    contractorName
  };
}


// Progress Reports operations
export async function getAllProgressReports(filters: {
  contractorId?: number;
  jobId?: number;
  status?: "submitted" | "reviewed" | "approved";
  startDate?: string;
  endDate?: string;
}) {
  const database = await getDb();
  if (!database) return [];

  let query = database
    .select({
      report: progressReports,
      contractor: contractors,
      job: jobs,
    })
    .from(progressReports)
    .leftJoin(contractors, eq(progressReports.contractorId, contractors.id))
    .leftJoin(jobs, eq(progressReports.jobId, jobs.id))
    .$dynamic();

  // Apply filters
  const conditions = [];
  if (filters.contractorId) {
    conditions.push(eq(progressReports.contractorId, filters.contractorId));
  }
  if (filters.jobId) {
    conditions.push(eq(progressReports.jobId, filters.jobId));
  }
  if (filters.status) {
    conditions.push(eq(progressReports.status, filters.status));
  }
  if (filters.startDate) {
    conditions.push(gte(progressReports.reportDate, new Date(filters.startDate)));
  }
  if (filters.endDate) {
    conditions.push(lte(progressReports.reportDate, new Date(filters.endDate)));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const results = await query.orderBy(desc(progressReports.createdAt));
  
  return results.map(r => ({
    ...r.report,
    contractorName: r.contractor ? `${r.contractor.firstName} ${r.contractor.lastName}` : 'Unknown',
    jobTitle: r.job?.title || 'Unknown Job',
  }));
}

export async function reviewProgressReport(params: {
  reportId: number;
  status: "reviewed" | "approved";
  reviewNotes: string | null;
  reviewedBy: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database
    .update(progressReports)
    .set({
      status: params.status,
      reviewNotes: params.reviewNotes,
      reviewedBy: params.reviewedBy,
      reviewedAt: new Date(),
    })
    .where(eq(progressReports.id, params.reportId));
}
