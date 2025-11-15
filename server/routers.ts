import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

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

          // Create phases
          for (let j = 0; j < result.phases.length; j++) {
            await db.createBuildPhase({
              jobId,
              phaseName: result.phases[j],
              tasks: '',
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
              supplier: '',
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

        // Create an assignment for each contractor
        for (const contractorId of contractorIds) {
          const result = await db.createJobAssignment({
            ...assignmentData,
            contractorId,
            selectedPhases: selectedPhases ? JSON.stringify(selectedPhases) : null,
            teamAssignment: contractorIds.length > 1 ? 1 : 0,
          });
          results.push(result);
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
  }),
});

export type AppRouter = typeof appRouter;
