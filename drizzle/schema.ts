import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with contractor role for job assignment.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "contractor"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Jobs table - stores all construction jobs
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(), // Client name
  address: text("address"),
  postCode: varchar("postCode", { length: 20 }),
  projectType: varchar("projectType", { length: 100 }),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  totalLabourCost: int("totalLabourCost").default(0), // Sum of all labour resources
  totalMaterialCost: int("totalMaterialCost").default(0), // Sum of all material resources  
  assignedContractorId: int("assignedContractorId"),
  uploadId: int("uploadId"), // Track which CSV upload created this job
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Build phases for each job
 */
export const buildPhases = mysqlTable("buildPhases", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  phaseName: varchar("phaseName", { length: 100 }).notNull(),
  tasks: text("tasks"), // JSON array of tasks
  status: mysqlEnum("status", ["not_started", "in_progress", "completed"]).default("not_started").notNull(),
  order: int("order").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuildPhase = typeof buildPhases.$inferSelect;
export type InsertBuildPhase = typeof buildPhases.$inferInsert;

/**
 * Job resources - individual resource lines from CSV (labour/material)
 */
export const jobResources = mysqlTable("jobResources", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  orderDate: varchar("orderDate", { length: 50 }),
  dateRequired: varchar("dateRequired", { length: 50 }),
  buildPhase: varchar("buildPhase", { length: 100 }),
  typeOfResource: mysqlEnum("typeOfResource", ["Material", "Labour"]).notNull(),
  resourceType: varchar("resourceType", { length: 100 }),
  supplier: varchar("supplier", { length: 100 }),
  resourceDescription: text("resourceDescription"), // Contains price info
  orderQuantity: int("orderQuantity"),
  cost: int("cost").default(0), // Extracted cost in pence
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobResource = typeof jobResources.$inferSelect;
export type InsertJobResource = typeof jobResources.$inferInsert;

/**
 * Contractors table - stores contractor/subcontractor information
 */
export const contractors = mysqlTable("contractors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Optional link to user account
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  type: mysqlEnum("type", ["contractor", "subcontractor"]).notNull(),
  primaryTrade: varchar("primaryTrade", { length: 100 }),
  dailyRate: int("dailyRate"), // in pence, for contractors
  cisVerified: boolean("cisVerified").default(false),
  adminNotes: text("adminNotes"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contractor = typeof contractors.$inferSelect;
export type InsertContractor = typeof contractors.$inferInsert;

/**
 * Job assignments - links jobs to contractors/subcontractors
 */
export const jobAssignments = mysqlTable("jobAssignments", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  contractorId: int("contractorId").notNull(),
  workLocation: text("workLocation"),
  selectedPhases: text("selectedPhases"), // JSON array of phase names
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  specialInstructions: text("specialInstructions"),
  status: mysqlEnum("status", ["assigned", "in_progress", "completed", "cancelled"]).default("assigned").notNull(),
  milestonePrice: int("milestonePrice"), // in cents, for subcontractors
  teamAssignment: int("teamAssignment").default(0), // boolean: 1 for team, 0 for individual
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobAssignment = typeof jobAssignments.$inferSelect;
export type InsertJobAssignment = typeof jobAssignments.$inferInsert;

/**
 * CSV upload tracking
 */
export const csvUploads = mysqlTable("csvUploads", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  jobsCreated: int("jobsCreated").notNull().default(0),
  status: mysqlEnum("status", ["processing", "completed", "failed"]).default("processing").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CsvUpload = typeof csvUploads.$inferSelect;
export type InsertCsvUpload = typeof csvUploads.$inferInsert;

/**
 * Work sessions for time tracking
 */
export const workSessions = mysqlTable("workSessions", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  contractorId: int("contractorId").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  clockInLatitude: varchar("clockInLatitude", { length: 50 }),
  clockInLongitude: varchar("clockInLongitude", { length: 50 }),
  clockOutLatitude: varchar("clockOutLatitude", { length: 50 }),
  clockOutLongitude: varchar("clockOutLongitude", { length: 50 }),
  hoursWorked: int("hoursWorked"), // in minutes
  amountEarned: int("amountEarned"), // in cents, auto-calculated
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkSession = typeof workSessions.$inferSelect;
export type InsertWorkSession = typeof workSessions.$inferInsert;

/**
 * Clients for budget tracking
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Job budgets (financial tracking)
 */
export const jobBudgets = mysqlTable("jobBudgets", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull().unique(),
  clientId: int("clientId"),
  totalBudget: int("totalBudget").notNull().default(0), // in cents
  labourBudget: int("labourBudget").notNull().default(0), // in cents
  materialBudget: int("materialBudget").notNull().default(0), // in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobBudget = typeof jobBudgets.$inferSelect;
export type InsertJobBudget = typeof jobBudgets.$inferInsert;

/**
 * Phase budgets for detailed tracking
 */
export const phaseBudgets = mysqlTable("phaseBudgets", {
  id: int("id").autoincrement().primaryKey(),
  phaseId: int("phaseId").notNull().unique(),
  labourBudget: int("labourBudget").notNull().default(0), // in cents
  materialBudget: int("materialBudget").notNull().default(0), // in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhaseBudget = typeof phaseBudgets.$inferSelect;
export type InsertPhaseBudget = typeof phaseBudgets.$inferInsert;

/**
 * Expenses for actual spending tracking
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  phaseId: int("phaseId"),
  type: mysqlEnum("type", ["labour", "material"]).notNull(),
  amount: int("amount").notNull(), // in cents
  description: text("description"),
  date: timestamp("date").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Contractor applications - stores registration form submissions from Telegram
 */
export const contractorApplications = mysqlTable("contractor_applications", {
  id: int("id").autoincrement().primaryKey(),
  
  // Personal Information (Step 1)
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  telegramId: varchar("telegramId", { length: 100 }), // Optional
  fullAddress: text("fullAddress").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  postcode: varchar("postcode", { length: 20 }).notNull(),
  
  // Right to Work & Documentation (Step 2)
  hasRightToWork: boolean("hasRightToWork").notNull(),
  passportNumber: varchar("passportNumber", { length: 50 }),
  passportPhotoUrl: text("passportPhotoUrl"), // S3 URL
  hasPublicLiability: boolean("hasPublicLiability").default(false),
  
  // CIS & Tax Information (Step 3)
  cisRegistrationStatus: mysqlEnum("cisRegistrationStatus", ["registered", "not_registered"]).notNull(),
  cisNumber: varchar("cisNumber", { length: 50 }),
  utrNumber: varchar("utrNumber", { length: 50 }),
  hasValidCscsCard: boolean("hasValidCscsCard").default(false),
  
  // Banking Details (Step 4)
  bankName: varchar("bankName", { length: 100 }).notNull(),
  accountHolderName: varchar("accountHolderName", { length: 100 }).notNull(),
  sortCode: varchar("sortCode", { length: 20 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 20 }).notNull(),
  
  // Emergency Contact (Step 5)
  emergencyContactName: varchar("emergencyContactName", { length: 100 }).notNull(),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 50 }).notNull(),
  emergencyContactRelationship: varchar("emergencyContactRelationship", { length: 50 }).notNull(),
  
  // Trade & Tools (Step 6)
  primaryTrade: varchar("primaryTrade", { length: 100 }).notNull(),
  yearsOfExperience: varchar("yearsOfExperience", { length: 50 }).notNull(),
  hasOwnTools: boolean("hasOwnTools").default(false),
  
  // Application Status & Admin Fields
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  cisRate: int("cisRate"), // 20 or 30 (percentage)
  approvedBy: int("approvedBy"), // User ID of admin who approved/rejected
  approvedAt: timestamp("approvedAt"),
  contractorId: int("contractorId"), // Link to created contractor record after approval
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContractorApplication = typeof contractorApplications.$inferSelect;
export type InsertContractorApplication = typeof contractorApplications.$inferInsert;
