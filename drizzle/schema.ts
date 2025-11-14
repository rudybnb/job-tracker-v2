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
  title: varchar("title", { length: 255 }).notNull(),
  address: text("address"),
  projectType: varchar("projectType", { length: 100 }),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  assignedContractorId: int("assignedContractorId"),
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
