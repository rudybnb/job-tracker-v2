import { pgTable, serial, text, varchar, timestamp, boolean, integer, pgEnum, numeric } from "drizzle-orm/pg-core";

// Enum definitions
export const roleEnum = pgEnum("role", ["user", "admin", "contractor"]);
export const reminderTypeEnum = pgEnum("reminderType", ["morning_checkin", "daily_report"]);
export const checkInTypeEnum = pgEnum("checkInType", ["login", "progress_report", "voice_message", "telegram_response", "telegram_confirm"]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "in_progress", "completed", "cancelled"]);
export const phaseStatusEnum = pgEnum("phase_status", ["not_started", "in_progress", "completed"]);
export const resourceTypeEnum = pgEnum("resource_type", ["Material", "Labour"]);
export const contractorTypeEnum = pgEnum("contractor_type", ["contractor", "subcontractor"]);
export const paymentTypeEnum = pgEnum("paymentType", ["day_rate", "price_work"]);
export const applicationStatusEnum = pgEnum("application_status", ["pending", "approved", "rejected"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["assigned", "in_progress", "completed", "cancelled"]);
export const pricingModelEnum = pgEnum("pricingModel", ["hourly", "per_room", "per_phase", "fixed_price"]);
export const uploadStatusEnum = pgEnum("upload_status", ["processing", "completed", "failed"]);
export const sessionStatusEnum = pgEnum("session_status", ["active", "completed", "invalid"]);
export const expenseTypeEnum = pgEnum("expense_type", ["labour", "material"]);
export const cisStatusEnum = pgEnum("cis_status", ["registered", "not_registered"]);
export const completionStatusEnum = pgEnum("completion_status", ["submitted", "reviewed", "approved"]);
export const contractorStatusEnum = pgEnum("contractor_status", ["pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Reminder logs - track all reminders sent to contractors
 */
export const reminderLogs = pgTable("reminderLogs", {
  id: serial("id").primaryKey(),
  contractorId: integer("contractorId").notNull(),
  reminderType: reminderTypeEnum("reminderType").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  responded: boolean("responded").default(false),
  respondedAt: timestamp("respondedAt"),
  response: text("response"), // Reason why they can't work, or confirmation
});

export type ReminderLog = typeof reminderLogs.$inferSelect;
export type InsertReminderLog = typeof reminderLogs.$inferInsert;

/**
 * Check-ins - track when contractors log in or submit reports
 */
export const checkIns = pgTable("checkIns", {
  id: serial("id").primaryKey(),
  contractorId: integer("contractorId").notNull(),
  checkInTime: timestamp("checkInTime").defaultNow().notNull(),
  checkInType: checkInTypeEnum("checkInType").notNull(),
  location: text("location"), // Optional GPS location
  notes: text("notes"),
});

export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = typeof checkIns.$inferInsert;

/**
 * Jobs table - stores all construction jobs
 */
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(), // Client name
  address: text("address"),
  postCode: varchar("postCode", { length: 20 }),
  projectType: varchar("projectType", { length: 100 }),
  status: jobStatusEnum("status").default("pending").notNull(),
  totalLabourCost: integer("totalLabourCost").default(0), // Sum of all labour resources
  totalMaterialCost: integer("totalMaterialCost").default(0), // Sum of all material resources  
  assignedContractorId: integer("assignedContractorId"),
  uploadId: integer("uploadId"), // Track which CSV upload created this job
  latitude: varchar("latitude", { length: 20 }), // GPS latitude for geofencing
  longitude: varchar("longitude", { length: 20 }), // GPS longitude for geofencing
  rooms: text("rooms"), // JSON array of room objects: [{name, type, floor, status}]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Build phases for each job
 */
export const buildPhases = pgTable("buildPhases", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  phaseName: varchar("phaseName", { length: 100 }).notNull(),
  tasks: text("tasks"), // JSON array of tasks
  status: phaseStatusEnum("status").default("not_started").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BuildPhase = typeof buildPhases.$inferSelect;
export type InsertBuildPhase = typeof buildPhases.$inferInsert;

/**
 * Job resources - individual resource lines from CSV (labour/material)
 */
export const jobResources = pgTable("jobResources", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  orderDate: varchar("orderDate", { length: 50 }),
  dateRequired: varchar("dateRequired", { length: 50 }),
  buildPhase: varchar("buildPhase", { length: 100 }),
  typeOfResource: resourceTypeEnum("typeOfResource").notNull(),
  resourceType: varchar("resourceType", { length: 100 }),
  supplier: varchar("supplier", { length: 100 }),
  resourceDescription: text("resourceDescription"), // Contains price info
  orderQuantity: integer("orderQuantity"),
  cost: integer("cost").default(0), // Extracted cost in pence
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobResource = typeof jobResources.$inferSelect;
export type InsertJobResource = typeof jobResources.$inferInsert;

/**
 * Contractors table - stores contractor/subcontractor information
 */
export const contractors = pgTable("contractors", {
  id: serial("id").primaryKey(),
  userId: integer("userId"), // Optional link to user account
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  username: varchar("username", { length: 100 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  type: contractorTypeEnum("type").notNull(),
  primaryTrade: varchar("primaryTrade", { length: 100 }),
  paymentType: paymentTypeEnum("paymentType").default("day_rate").notNull(),
  hourlyRate: integer("hourlyRate"), // in pence, agency hourly rate (includes CIS/taxes)
  dailyRate: integer("dailyRate"), // in pence, calculated or custom daily rate
  cisVerified: boolean("cisVerified").default(false),
  adminNotes: text("adminNotes"),
  telegramChatId: varchar("telegramChatId", { length: 100 }).unique(), // Telegram chat ID for bot integration
  status: contractorStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Contractor = typeof contractors.$inferSelect;
export type InsertContractor = typeof contractors.$inferInsert;

/**
 * Job assignments - links jobs to contractors/subcontractors
 */
export const jobAssignments = pgTable("jobAssignments", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  contractorId: integer("contractorId").notNull(),
  workLocation: text("workLocation"),
  selectedPhases: text("selectedPhases"), // JSON array of phase names
  assignedRooms: text("assignedRooms"), // JSON array of room names assigned to this contractor
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  specialInstructions: text("specialInstructions"),
  status: assignmentStatusEnum("status").default("assigned").notNull(),
  pricingModel: pricingModelEnum("pricingModel").default("hourly"),
  hourlyRate: integer("hourlyRate"), // in pence, for hourly pricing
  pricePerRoom: integer("pricePerRoom"), // in pence, for per-room pricing
  milestonePrice: integer("milestonePrice"), // in cents, for fixed price/milestone
  completedRooms: text("completedRooms"), // JSON array of completed room names with dates
  teamAssignment: integer("teamAssignment").default(0), // boolean: 1 for team, 0 for individual
  acknowledged: boolean("acknowledged").default(false), // Whether contractor acknowledged the assignment
  acknowledgedAt: timestamp("acknowledgedAt"), // When contractor acknowledged
  notifiedAt: timestamp("notifiedAt"), // When Telegram notification was sent
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type JobAssignment = typeof jobAssignments.$inferSelect;
export type InsertJobAssignment = typeof jobAssignments.$inferInsert;

/**
 * CSV upload tracking
 */
export const csvUploads = pgTable("csvUploads", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  uploadedBy: integer("uploadedBy").notNull(),
  jobsCreated: integer("jobsCreated").notNull().default(0),
  status: uploadStatusEnum("status").default("processing").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CsvUpload = typeof csvUploads.$inferSelect;
export type InsertCsvUpload = typeof csvUploads.$inferInsert;

/**
 * Work sessions for time tracking with GPS validation
 * Stores clock-in/out data, GPS location, and payment calculations
 */
export const workSessions = pgTable("workSessions", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  contractorId: integer("contractorId").notNull(),
  assignmentId: integer("assignmentId"), // Link to job assignment (optional for backward compatibility)
  
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
  distanceFromSite: integer("distanceFromSite"), // Distance in meters
  isWithinGeofence: integer("isWithinGeofence").default(0), // 1 = within 1km, 0 = outside
  
  // Payment calculation
  hoursWorked: integer("hoursWorked"), // Total hours in minutes
  hourlyRate: integer("hourlyRate"), // Contractor's rate in pence at time of work
  amountEarned: integer("amountEarned"), // Gross pay in pence (backward compat)
  grossPay: integer("grossPay"), // Hours × hourly rate in pence
  cisDeduction: integer("cisDeduction"), // CIS tax deduction in pence (20% or 30%)
  netPay: integer("netPay"), // Gross - CIS in pence
  
  // Status
  status: sessionStatusEnum("status").default("active"),
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type WorkSession = typeof workSessions.$inferSelect;
export type InsertWorkSession = typeof workSessions.$inferInsert;

/**
 * Clients for budget tracking
 */
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Job budgets (financial tracking)
 */
export const jobBudgets = pgTable("jobBudgets", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull().unique(),
  clientId: integer("clientId"),
  totalBudget: integer("totalBudget").notNull().default(0), // in cents
  labourBudget: integer("labourBudget").notNull().default(0), // in cents
  materialBudget: integer("materialBudget").notNull().default(0), // in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type JobBudget = typeof jobBudgets.$inferSelect;
export type InsertJobBudget = typeof jobBudgets.$inferInsert;

/**
 * Phase budgets for detailed tracking
 */
export const phaseBudgets = pgTable("phaseBudgets", {
  id: serial("id").primaryKey(),
  phaseId: integer("phaseId").notNull().unique(),
  labourBudget: integer("labourBudget").notNull().default(0), // in cents
  materialBudget: integer("materialBudget").notNull().default(0), // in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PhaseBudget = typeof phaseBudgets.$inferSelect;
export type InsertPhaseBudget = typeof phaseBudgets.$inferInsert;

/**
 * Expenses for actual spending tracking
 */
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  phaseId: integer("phaseId"),
  type: expenseTypeEnum("type").notNull(),
  amount: integer("amount").notNull(), // in cents
  description: text("description"),
  date: timestamp("date").notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Contractor applications - stores registration form submissions from Telegram
 */
export const contractorApplications = pgTable("contractor_applications", {
  id: serial("id").primaryKey(),
  
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
  cisRegistrationStatus: cisStatusEnum("cisRegistrationStatus").notNull(),
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
  status: applicationStatusEnum("status").default("pending").notNull(),
  adminNotes: text("adminNotes"),
  cisRate: integer("cisRate"), // 20 or 30 (percentage)
  approvedBy: integer("approvedBy"), // User ID of admin who approved/rejected
  approvedAt: timestamp("approvedAt"),
  contractorId: integer("contractorId"), // Link to created contractor record after approval
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ContractorApplication = typeof contractorApplications.$inferSelect;
export type InsertContractorApplication = typeof contractorApplications.$inferInsert;

/**
 * Phase completion records for labour efficiency tracking
 */
export const phaseCompletions = pgTable("phaseCompletions", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  phaseName: varchar("phaseName", { length: 100 }).notNull(),
  contractorId: integer("contractorId").notNull(),
  assignmentId: integer("assignmentId"), // Link to the assignment
  
  // Estimated vs Actual
  estimatedLabourDays: integer("estimatedLabourDays").notNull(), // From CSV data
  actualDaysWorked: integer("actualDaysWorked").notNull(), // Actual completion time
  efficiencyMultiplier: integer("efficiencyMultiplier").notNull(), // Stored as percentage (e.g., 120 = 1.2x)
  
  // Dates
  plannedStartDate: timestamp("plannedStartDate"),
  plannedEndDate: timestamp("plannedEndDate"),
  actualStartDate: timestamp("actualStartDate").notNull(),
  actualEndDate: timestamp("actualEndDate").notNull(),
  
  // Quality & Notes
  qualityRating: integer("qualityRating"), // 1-5 stars
  notes: text("notes"),
  
  createdBy: integer("createdBy").notNull(), // Admin who recorded this
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PhaseCompletion = typeof phaseCompletions.$inferSelect;
export type InsertPhaseCompletion = typeof phaseCompletions.$inferInsert;

/**
 * GPS checkpoints - Periodic location tracking during work sessions
 * Stores GPS pings every X minutes to verify contractor stays on site
 */
export const gpsCheckpoints = pgTable("gpsCheckpoints", {
  id: serial("id").primaryKey(),
  workSessionId: integer("workSessionId").notNull(),
  contractorId: integer("contractorId").notNull(),
  
  // GPS data
  timestamp: timestamp("timestamp").notNull(),
  latitude: varchar("latitude", { length: 50 }).notNull(),
  longitude: varchar("longitude", { length: 50 }).notNull(),
  accuracy: varchar("accuracy", { length: 50 }), // GPS accuracy in meters
  
  // Validation
  distanceFromSite: integer("distanceFromSite"), // Distance from work site in meters
  isWithinGeofence: integer("isWithinGeofence").default(1), // 1 = within 1km, 0 = outside
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GpsCheckpoint = typeof gpsCheckpoints.$inferSelect;
export type InsertGpsCheckpoint = typeof gpsCheckpoints.$inferInsert;

/**
 * Task completions - Track progress on individual tasks within phases
 * Contractors mark tasks complete as they work through phases
 */
export const taskCompletions = pgTable("taskCompletions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignmentId").notNull(),
  contractorId: integer("contractorId").notNull(),
  phaseName: varchar("phaseName", { length: 100 }).notNull(),
  taskName: varchar("taskName", { length: 200 }).notNull(),
  
  // Completion data
  completedAt: timestamp("completedAt").notNull(),
  notes: text("notes"),
  photoUrls: text("photoUrls"), // JSON array of S3 URLs for completion photos
  
  // Quality check
  isVerified: integer("isVerified").default(0), // Admin verification: 1 = approved, 0 = pending
  verifiedBy: integer("verifiedBy"), // Admin user ID who verified
  verifiedAt: timestamp("verifiedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type InsertTaskCompletion = typeof taskCompletions.$inferInsert;


/**
 * Progress Reports - Daily updates from contractors with photos and notes
 */
export const progressReports = pgTable("progressReports", {
  id: serial("id").primaryKey(),
  contractorId: integer("contractorId").notNull(),
  assignmentId: integer("assignmentId").notNull(),
  jobId: integer("jobId").notNull(),
  
  // Report details
  reportDate: timestamp("reportDate").notNull(),
  phaseName: varchar("phaseName", { length: 100 }),
  taskName: varchar("taskName", { length: 200 }),
  
  // Content
  notes: text("notes"),
  photoUrls: text("photoUrls"), // JSON array of S3 URLs for progress photos
  
  // Voice transcription (multi-language support)
  audioUrl: text("audioUrl"), // S3 URL to voice recording
  originalLanguage: varchar("originalLanguage", { length: 10 }), // ISO language code (e.g., 'af', 'zu', 'pt')
  transcribedText: text("transcribedText"), // English transcription from voice
  transcriptionDuration: integer("transcriptionDuration"), // Audio duration in seconds
  
  // Status
  status: completionStatusEnum("status").default("submitted").notNull(),
  reviewedBy: integer("reviewedBy"), // Admin user ID who reviewed
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProgressReport = typeof progressReports.$inferSelect;
export type InsertProgressReport = typeof progressReports.$inferInsert;


/**
 * Progress Report Sessions - Tracks multi-step conversation state
 */
export const progressReportSessions = pgTable("progressReportSessions", {
  id: serial("id").primaryKey(),
  chatId: varchar("chatId", { length: 50 }).notNull().unique(),
  contractorId: integer("contractorId"),
  step: varchar("step", { length: 50 }).notNull().default("idle"),
  
  // Collected data during conversation
  workCompleted: text("workCompleted"),
  progressPercentage: integer("progressPercentage"),
  issues: text("issues"),
  materials: text("materials"),
  
  // Metadata
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type ProgressReportSession = typeof progressReportSessions.$inferSelect;
export type InsertProgressReportSession = typeof progressReportSessions.$inferInsert;
