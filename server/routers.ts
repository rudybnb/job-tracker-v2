import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import * as telegram from "./telegram";
import { contractorAuthRouter } from "./contractorAuth";
import { mobileApiRouter } from "./mobileApi";
import { telegramApiRouter } from "./routers/telegramApi";
import { reminderRouter } from "./routers/reminderRouter";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Contractor procedure (admin or contractor)
const contractorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "contractor") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Contractor access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  contractorAuth: contractorAuthRouter,
  mobileApi: mobileApiRouter, // Mobile app endpoints for contractors
  telegramApi: telegramApiRouter, // Telegram bot endpoints for n8n integration
  reminders: reminderRouter, // Reminder logs and check-in tracking
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Job management
  jobs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Contractors only see their assigned jobs
      if (ctx.user.role === "contractor") {
        return await db.getJobsByContractor(ctx.user.id);
      }
      // Admins see all jobs
      return await db.getAllJobs();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const job = await db.getJobById(input.id);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        // Contractors can only view their assigned jobs
        if (ctx.user.role === "contractor" && job.assignedContractorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return job;
      }),

    create: adminProcedure
      .input(
        z.object({
          title: z.string(),
          address: z.string().optional(),
          projectType: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createJob(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          address: z.string().optional(),
          projectType: z.string().optional(),
          status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateJob(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteJob(input.jobId);
        return { success: true };
      }),

    assign: adminProcedure
      .input(
        z.object({
          jobId: z.number(),
          contractorId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await db.assignJobToContractor(input.jobId, input.contractorId);
        return { success: true };
      }),

    getPhaseCosts: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verify access to job first
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        if (ctx.user.role === "contractor" && job.assignedContractorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return await db.getJobPhaseCosts(input.jobId);
      }),

    getPhaseMaterials: protectedProcedure
      .input(z.object({ jobId: z.number(), phaseName: z.string() }))
      .query(async ({ input, ctx }) => {
        // Verify access to job first
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        if (ctx.user.role === "contractor" && job.assignedContractorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return await db.getPhaseMaterials(input.jobId, input.phaseName);
      }),
  }),

  // Build phases
  phases: router({
    listByJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verify access to job first
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        if (ctx.user.role === "contractor" && job.assignedContractorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return await db.getPhasesByJobId(input.jobId);
      }),

    create: adminProcedure
      .input(
        z.object({
          jobId: z.number(),
          phaseName: z.string(),
          tasks: z.string().optional(),
          order: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createBuildPhase(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          phaseName: z.string().optional(),
          tasks: z.string().optional(),
          status: z.enum(["not_started", "in_progress", "completed"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePhase(id, data);
        return { success: true };
      }),
  }),

  // CSV upload
  csv: router({
    // Detect and preview jobs from CSV without creating them
    detectJobs: adminProcedure
      .input(
        z.object({
          content: z.string(), // CSV content as string
        })
      )
      .mutation(async ({ input }) => {
        try {
          const { parseSmartScheduleCSV } = await import('./csvProcessorNew');
          const result = await parseSmartScheduleCSV(input.content);

          const detectedJobs = [{
            name: result.metadata.name,
            address: result.metadata.address,
            postCode: result.metadata.postCode,
            projectType: result.metadata.projectType,
            phases: result.phases,
            totalLabourCost: result.totalLabourCost,
            totalMaterialCost: result.totalMaterialCost,
            resourceCount: result.resources.length,
          }];

          console.log(`[CSV] Detected 1 job with ${result.resources.length} resources`);

          return {
            success: true,
            jobs: detectedJobs,
            totalJobs: 1,
          };
        } catch (error) {
          console.error('[CSV] Detection error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to parse CSV file',
          });
        }
      }),

    upload: adminProcedure
      .input(
        z.object({
          filename: z.string(),
          content: z.string(), // CSV content as string
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Create upload record
        const uploadResult = await db.createCsvUpload({
          filename: input.filename,
          uploadedBy: ctx.user.id,
          jobsCreated: 0,
          status: "processing",
        });

        const uploadId = uploadResult.insertId;

        try {
          const { parseSmartScheduleCSV } = await import('./csvProcessorNew');
          const result = await parseSmartScheduleCSV(input.content);

          console.log(`[CSV] Processing job: ${result.metadata.name} with ${result.resources.length} resources`);

          // Create the job
          const jobResult = await db.createJob({
            title: result.metadata.name,
            address: result.metadata.address,
            postCode: result.metadata.postCode,
            projectType: result.metadata.projectType,
            totalLabourCost: result.totalLabourCost,
            totalMaterialCost: result.totalMaterialCost,
            uploadId: uploadId,
          });

          const jobId = jobResult.insertId;
          console.log(`[CSV] Job created with ID: ${jobId}`);

          // Group Material tasks by phase (Labour is for payment only, not tasks)
          const tasksByPhase = new Map<string, string[]>();
          for (const resource of result.resources) {
            if (resource.typeOfResource === 'Material') {
              if (!tasksByPhase.has(resource.buildPhase)) {
                tasksByPhase.set(resource.buildPhase, []);
              }
              tasksByPhase.get(resource.buildPhase)!.push(resource.resourceDescription);
            }
          }

          // Create phases with aggregated tasks
          for (let j = 0; j < result.phases.length; j++) {
            const phaseName = result.phases[j];
            const phaseTasks = tasksByPhase.get(phaseName) || [];
            
            await db.createBuildPhase({
              jobId,
              phaseName,
              tasks: JSON.stringify(phaseTasks),
              order: j,
            });
          }

          // Create resource records
          for (const resource of result.resources) {
            await db.createJobResource({
              jobId,
              orderDate: '',
              dateRequired: '',
              buildPhase: resource.buildPhase,
              typeOfResource: resource.typeOfResource,
              resourceType: '',
              supplier: resource.supplier || '',
              resourceDescription: resource.resourceDescription,
              orderQuantity: resource.orderQuantity,
              cost: resource.cost,
            });
          }

          // Update upload status
          console.log(`[CSV] Completed processing. 1 job created with ${result.resources.length} resources`);
          await db.updateCsvUpload(uploadId, {
            status: "completed",
            jobsCreated: 1,
          });

          return { success: true, jobsCreated: 1, uploadId };
        } catch (error) {
          // Update upload status with error
          console.error('[CSV] Processing error:', error);
          await db.updateCsvUpload(uploadId, {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to process CSV file",
          });
        }
      }),

    recentUploads: adminProcedure.query(async () => {
      return await db.getRecentUploads(10);
    }),

    deleteUpload: adminProcedure
      .input(z.object({ uploadId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteUploadAndJobs(input.uploadId);
        return { success: true };
      }),
  }),

  // Contractors
  contractors: router({
    list: adminProcedure.query(async () => {
      return await db.getAllContractors();
    }),

    create: adminProcedure
      .input(
        z.object({
          firstName: z.string(),
          lastName: z.string(),
          email: z.string().email(),
          phone: z.string().optional(),
          type: z.enum(["contractor", "subcontractor"]),
          primaryTrade: z.string().optional(),
          paymentType: z.enum(["day_rate", "price_work"]).default("day_rate"),
          hourlyRate: z.number().optional(),
          dailyRate: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createContractor(input);
      }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const contractor = await db.getContractorById(input.id);
        if (!contractor) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Contractor not found" });
        }
        return contractor;
      }),

    updateAdminDetails: adminProcedure
      .input(
        z.object({
          id: z.number(),
          primaryTrade: z.string().optional(),
          paymentType: z.enum(["day_rate", "price_work"]).optional(),
          hourlyRate: z.number().optional(),
          dailyRate: z.number().optional(),
          cisVerified: z.boolean().optional(),
          adminNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateContractorAdminDetails(input);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteContractor(input.id);
        return { success: true };
      }),
  }),

  // Job assignments
  jobAssignments: router({
    list: adminProcedure.query(async () => {
      return await db.getAllJobAssignments();
    }),

    create: adminProcedure
      .input(
        z.object({
          jobId: z.number(),
          contractorIds: z.array(z.number()),
          workLocation: z.string().optional(),
          selectedPhases: z.array(z.string()).optional(),
          startDate: z.date(),
          endDate: z.date(),
          specialInstructions: z.string().optional(),
          milestonePrice: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { contractorIds, selectedPhases, ...assignmentData } = input;
        const results = [];

        // Get job details for notification
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new Error("Job not found");
        }

        // Create an assignment for each contractor
        for (const contractorId of contractorIds) {
          const result = await db.createJobAssignment({
            ...assignmentData,
            contractorId,
            selectedPhases: selectedPhases ? JSON.stringify(selectedPhases) : null,
            teamAssignment: contractorIds.length > 1 ? 1 : 0,
          });
          results.push(result);

          // Send Telegram notification
          try {
            const contractor = await db.getContractorById(contractorId);
            if (contractor?.telegramChatId) {
              const { sendTelegramNotification } = await import("./_core/telegramNotifications");
              
              const phasesText = selectedPhases && selectedPhases.length > 0
                ? `\n\n📋 Assigned Phases:\n${selectedPhases.map(p => `  • ${p}`).join('\n')}`
                : '';
              
              const instructionsText = input.specialInstructions
                ? `\n\n📝 Special Instructions:\n${input.specialInstructions}`
                : '';
              
              const message = `🔔 *New Job Assignment*\n\n` +
                `📍 Job: ${job.title}\n` +
                `📌 Address: ${job.address || 'N/A'}\n` +
                `📅 Start: ${input.startDate.toLocaleDateString()}\n` +
                `📅 End: ${input.endDate.toLocaleDateString()}` +
                phasesText +
                instructionsText +
                `\n\n✅ Reply with "ACCEPT" to acknowledge this assignment.`;
              
              await sendTelegramNotification({
                chatId: contractor.telegramChatId,
                message,
                type: "job_assigned",
                parseMode: "Markdown",
              });
              console.log(`[Job Assignment] Telegram notification sent to contractor ${contractorId}`);
            }
          } catch (error) {
            console.error(`[Job Assignment] Failed to send Telegram notification to contractor ${contractorId}:`, error);
            // Don't fail the assignment if notification fails
          }
        }

        return { success: true, assignmentsCreated: results.length };
      }),

    getByJob: adminProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        return await db.getJobAssignmentsByJob(input.jobId);
      }),

    getByContractor: protectedProcedure
      .input(z.object({ contractorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getJobAssignmentsByContractor(input.contractorId);
      }),

    getAssignmentCosts: adminProcedure
      .input(z.object({ jobId: z.number(), selectedPhases: z.array(z.string()) }))
      .query(async ({ input }) => {
        return await db.getAssignmentPhaseCosts(input.jobId, input.selectedPhases);
      }),

    getDayBlockCosts: adminProcedure
      .input(z.object({ 
        jobId: z.number(), 
        selectedPhases: z.array(z.string()),
        contractorId: z.number()
      }))
      .query(async ({ input }) => {
        const { calculateDayBlockAssignmentCost } = await import("./dayBlockCosts");
        return await calculateDayBlockAssignmentCost(
          input.jobId, 
          input.selectedPhases,
          input.contractorId
        );
      }),

    getTimeValidation: adminProcedure
      .input(z.object({ 
        jobId: z.number(), 
        selectedPhases: z.array(z.string()),
        startDate: z.date(),
        endDate: z.date(),
        contractorCount: z.number().optional()
      }))
      .query(async ({ input }) => {
        return await db.getAssignmentTimeValidation(
          input.jobId, 
          input.selectedPhases, 
          input.startDate, 
          input.endDate,
          input.contractorCount || 1
        );
      }),

    getContractorPayment: adminProcedure
      .input(z.object({
        contractorId: z.number(),
        startDate: z.date(),
        endDate: z.date()
      }))
      .query(async ({ input }) => {
        return await db.getContractorPayment(
          input.contractorId,
          input.startDate,
          input.endDate
        );
      }),
  }),

  // Work sessions
  workSessions: router({
    start: contractorProcedure
      .input(
        z.object({
          jobId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Verify contractor has access to this job
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        if (ctx.user.role === "contractor" && job.assignedContractorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Job not assigned to you" });
        }

        return await db.createWorkSession({
          jobId: input.jobId,
          contractorId: ctx.user.id,
          startTime: new Date(),
        });
      }),

    end: contractorProcedure
      .input(
        z.object({
          sessionId: z.number(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.endWorkSession(input.sessionId, new Date(), input.notes);
        return { success: true };
      }),

    listByJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWorkSessionsByJob(input.jobId);
      }),

    myHistory: contractorProcedure.query(async ({ ctx }) => {
      return await db.getWorkSessionsByContractor(ctx.user.id);
    }),
  }),

  // Clients
  clients: router({
    list: adminProcedure.query(async () => {
      return await db.getAllClients();
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createClient(input);
      }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const client = await db.getClientById(input.id);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        return client;
      }),
  }),

  // Job budgets
  budgets: router({
    getByJob: adminProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        return await db.getJobBudgetByJobId(input.jobId);
      }),

    create: adminProcedure
      .input(
        z.object({
          jobId: z.number(),
          clientId: z.number().optional(),
          totalBudget: z.number(),
          labourBudget: z.number(),
          materialBudget: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createJobBudget(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          totalBudget: z.number().optional(),
          labourBudget: z.number().optional(),
          materialBudget: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateJobBudget(id, data);
        return { success: true };
      }),
  }),

  // Phase budgets
  phaseBudgets: router({
    getByPhase: adminProcedure
      .input(z.object({ phaseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPhaseBudgetByPhaseId(input.phaseId);
      }),

    create: adminProcedure
      .input(
        z.object({
          phaseId: z.number(),
          labourBudget: z.number(),
          materialBudget: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createPhaseBudget(input);
      }),
  }),

  // Expenses
  expenses: router({
    listByJob: adminProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        return await db.getExpensesByJob(input.jobId);
      }),

    listByPhase: adminProcedure
      .input(z.object({ phaseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getExpensesByPhase(input.phaseId);
      }),

    create: adminProcedure
      .input(
        z.object({
          jobId: z.number(),
          phaseId: z.number().optional(),
          type: z.enum(["labour", "material"]),
          amount: z.number(),
          description: z.string().optional(),
          date: z.date(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.createExpense({
          ...input,
          createdBy: ctx.user.id,
        });
      }),
  }),

  // Contractor Applications
  contractorApplications: router({
    // Public endpoint for Telegram bot to submit applications
    submit: publicProcedure
      .input(
        z.object({
          firstName: z.string(),
          lastName: z.string(),
          email: z.string().email(),
          phone: z.string(),
          telegramId: z.string().optional(),
          fullAddress: z.string(),
          city: z.string(),
          postcode: z.string(),
          hasRightToWork: z.boolean(),
          passportNumber: z.string().optional(),
          passportPhotoUrl: z.string().optional(),
          hasPublicLiability: z.boolean().optional(),
          cisRegistrationStatus: z.enum(["registered", "not_registered"]),
          cisNumber: z.string().optional(),
          utrNumber: z.string().optional(),
          hasValidCscsCard: z.boolean().optional(),
          bankName: z.string(),
          accountHolderName: z.string(),
          sortCode: z.string(),
          accountNumber: z.string(),
          emergencyContactName: z.string(),
          emergencyContactPhone: z.string(),
          emergencyContactRelationship: z.string(),
          primaryTrade: z.string(),
          yearsOfExperience: z.string(),
          hasOwnTools: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.createContractorApplication(input);
        return { success: true, applicationId: result.insertId };
      }),

    // Admin: List all applications
    list: adminProcedure.query(async () => {
      return await db.getAllContractorApplications();
    }),

    // Admin: List by status
    listByStatus: adminProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "rejected"]) }))
      .query(async ({ input }) => {
        return await db.getContractorApplicationsByStatus(input.status);
      }),

    // Admin: Get statistics
    stats: adminProcedure.query(async () => {
      return await db.getContractorApplicationStats();
    }),

    // Admin: Get single application
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getContractorApplicationById(input.id);
      }),

    // Admin: Approve application
    approve: adminProcedure
      .input(
        z.object({
          id: z.number(),
          cisRate: z.number().optional(),
          adminNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const application = await db.getContractorApplicationById(input.id);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }

        // Create contractor record
        const contractorResult = await db.createContractor({
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
          phone: application.phone,
          type: "contractor",
          primaryTrade: application.primaryTrade,
          status: "approved",
        });

        // Update application status
        await db.updateContractorApplicationStatus(
          input.id,
          "approved",
          input.adminNotes,
          input.cisRate,
          ctx.user.id,
          contractorResult.insertId
        );

        return { success: true, contractorId: contractorResult.insertId };
      }),

    // Public: Upload passport photo to S3
    uploadPassportPhoto: publicProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileData: z.string(), // base64 encoded
          contentType: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        
        // Decode base64 data
        const buffer = Buffer.from(input.fileData, 'base64');
        
        // Generate unique file key with timestamp and random suffix
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const ext = input.fileName.split('.').pop() || 'jpg';
        const fileKey = `contractor-documents/${timestamp}-${randomSuffix}.${ext}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        
        return { success: true, url };
      }),

    // Admin: Reject application
    reject: adminProcedure
      .input(
        z.object({
          id: z.number(),
          adminNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.updateContractorApplicationStatus(
          input.id,
          "rejected",
          input.adminNotes,
          undefined,
          ctx.user.id
        );
        return { success: true };
      }),

    // Admin: Get application by contractor ID
    getByContractorId: adminProcedure
      .input(z.object({ contractorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getContractorApplicationByContractorId(input.contractorId);
      }),
  }),

  // Telegram Bot Integration
  telegram: router({
    // Admin: Send contractor invite
    sendInvite: adminProcedure
      .input(
        z.object({
          contractorName: z.string(),
          telegramId: z.string(),
          applicationId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Use the request host to generate the form URL (works in dev and production)
        const protocol = ctx.req.headers['x-forwarded-proto'] || 'https';
        const host = ctx.req.headers['x-forwarded-host'] || ctx.req.headers.host || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;
        const formUrl = `${baseUrl}/contractor-form?id=${input.applicationId}&name=${encodeURIComponent(input.contractorName)}&telegram_id=${input.telegramId}`;

        const success = await telegram.sendContractorInvite({
          contractorName: input.contractorName,
          telegramId: input.telegramId,
          formUrl,
        });

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send Telegram message",
          });
        }

        return { success: true, formUrl };
      }),

    // Admin: Send custom message
    sendCustomMessage: adminProcedure
      .input(
        z.object({
          chatId: z.string(),
          message: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const success = await telegram.sendCustomMessage(input.chatId, input.message);

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send Telegram message",
          });
        }

        return { success: true };
      }),

    // Public: Verify bot status
    verifyBot: publicProcedure.query(async () => {
      const isValid = await telegram.verifyBotToken();
      return { isValid, configured: !!process.env.TELEGRAM_BOT_TOKEN };
    }),
  }),

  // Progress Reports (Admin)
  progressReports: router({    
    // Get all progress reports with filtering
    getAll: adminProcedure
      .input(
        z.object({
          contractorId: z.number().optional(),
          jobId: z.number().optional(),
          status: z.enum(["submitted", "reviewed", "approved"]).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getAllProgressReports(input);
      }),

    // Review a progress report (approve/reject with notes)
    review: adminProcedure
      .input(
        z.object({
          reportId: z.number(),
          status: z.enum(["reviewed", "approved"]),
          reviewNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.reviewProgressReport({
          reportId: input.reportId,
          status: input.status,
          reviewNotes: input.reviewNotes || null,
          reviewedBy: ctx.user.id,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
