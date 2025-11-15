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
  username: varchar("username", { length: 100 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  type: mysqlEnum("type", ["contractor", "subcontractor"]).notNull(),
  primaryTrade: varchar("primaryTrade", { length: 100 }),
  paymentType: mysqlEnum("paymentType", ["day_rate", "price_work"]).default("day_rate").notNull(),
  hourlyRate: int("hourlyRate"), // in pence, agency hourly rate (includes CIS/taxes)
  dailyRate: int("dailyRate"), // in pence, calculated or custom daily rate
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
 * Work sessions for time tracking with GPS validation
 * Stores clock-in/out data, GPS location, and payment calculations
 */
export const workSessions = mysqlTable("workSessions", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  contractorId: int("contractorId").notNull(),
  assignmentId: int("assignmentId"), // Link to job assignment (optional for backward compatibility)
  
  // Clock-in data
  startTime: timestamp("startTime").notNull(),
  clockInLatitude: varchar("clockInLatitude", { length: 50 }),
  clockInLongitude: varchar("clockInLongitude", { length: 50 }),
  clockInAccuracy: varchar("clockInAccuracy", { length: 50 }), // GPS accuracy in meters
  
  // Clock-out data
  endTime: timestamp("endTime"),
  clockOutLatitude: varchar("clockOutLatitude", { length: 50 }),
  clockOutLongitude: varchar("clockOutLongitude", { length: 50 }),
  clockOutAccuracy: varchar("clockOutAccuracy", { length: 50 }),
  
  // Work site validation
  workSitePostcode: varchar("workSitePostcode", { length: 20 }),
  workSiteLatitude: varchar("workSiteLatitude", { length: 50 }),
  workSiteLongitude: varchar("workSiteLongitude", { length: 50 }),
  distanceFromSite: int("distanceFromSite"), // Distance in meters
  isWithinGeofence: int("isWithinGeofence").default(0), // 1 = within 1km, 0 = outside
  
  // Payment calculation
  hoursWorked: int("hoursWorked"), // Total hours in minutes
  hourlyRate: int("hourlyRate"), // Contractor's rate in pence at time of work
  amountEarned: int("amountEarned"), // Gross pay in pence (backward compat)
  grossPay: int("grossPay"), // Hours × hourly rate in pence
  cisDeduction: int("cisDeduction"), // CIS tax deduction in pence (20% or 30%)
  netPay: int("netPay"), // Gross - CIS in pence
  
  // Status
  status: mysqlEnum("status", ["active", "completed", "invalid"]).default("active"),
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
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

/**
 * Phase completion records for labour efficiency tracking
 */
export const phaseCompletions = mysqlTable("phaseCompletions", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  phaseName: varchar("phaseName", { length: 100 }).notNull(),
  contractorId: int("contractorId").notNull(),
  assignmentId: int("assignmentId"), // Link to the assignment
  
  // Estimated vs Actual
  estimatedLabourDays: int("estimatedLabourDays").notNull(), // From CSV data
  actualDaysWorked: int("actualDaysWorked").notNull(), // Actual completion time
  efficiencyMultiplier: int("efficiencyMultiplier").notNull(), // Stored as percentage (e.g., 120 = 1.2x)
  
  // Dates
  plannedStartDate: timestamp("plannedStartDate"),
  plannedEndDate: timestamp("plannedEndDate"),
  actualStartDate: timestamp("actualStartDate").notNull(),
  actualEndDate: timestamp("actualEndDate").notNull(),
  
  // Quality & Notes
  qualityRating: int("qualityRating"), // 1-5 stars
  notes: text("notes"),
  
  createdBy: int("createdBy").notNull(), // Admin who recorded this
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhaseCompletion = typeof phaseCompletions.$inferSelect;
export type InsertPhaseCompletion = typeof phaseCompletions.$inferInsert;

/**
 * GPS checkpoints - Periodic location tracking during work sessions
 * Stores GPS pings every X minutes to verify contractor stays on site
 */
export const gpsCheckpoints = mysqlTable("gpsCheckpoints", {
  id: int("id").autoincrement().primaryKey(),
  workSessionId: int("workSessionId").notNull(),
  contractorId: int("contractorId").notNull(),
  
  // GPS data
  timestamp: timestamp("timestamp").notNull(),
  latitude: varchar("latitude", { length: 50 }).notNull(),
  longitude: varchar("longitude", { length: 50 }).notNull(),
  accuracy: varchar("accuracy", { length: 50 }), // GPS accuracy in meters
  
  // Validation
  distanceFromSite: int("distanceFromSite"), // Distance from work site in meters
  isWithinGeofence: int("isWithinGeofence").default(1), // 1 = within 1km, 0 = outside
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GpsCheckpoint = typeof gpsCheckpoints.$inferSelect;
export type InsertGpsCheckpoint = typeof gpsCheckpoints.$inferInsert;

/**
 * Task completions - Track progress on individual tasks within phases
 * Contractors mark tasks complete as they work through phases
 */
export const taskCompletions = mysqlTable("taskCompletions", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId").notNull(),
  contractorId: int("contractorId").notNull(),
  phaseName: varchar("phaseName", { length: 100 }).notNull(),
  taskName: varchar("taskName", { length: 200 }).notNull(),
  
  // Completion data
  completedAt: timestamp("completedAt").notNull(),
  notes: text("notes"),
  photoUrls: text("photoUrls"), // JSON array of S3 URLs for completion photos
  
  // Quality check
  isVerified: int("isVerified").default(0), // Admin verification: 1 = approved, 0 = pending
  verifiedBy: int("verifiedBy"), // Admin user ID who verified
  verifiedAt: timestamp("verifiedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type InsertTaskCompletion = typeof taskCompletions.$inferInsert;
