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

        const uploadId = Number((uploadResult as any).insertId || 0);

        try {
          // Parse CSV with proper handling of quoted fields
          const { parse } = await import('csv-parse/sync');
          const records = parse(input.content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });

          // Group rows by job name and collect phases
          interface JobData {
            address: string;
            projectType: string;
            phases: Set<string>;
            orderDate: string;
          }
          const jobsMap = new Map<string, JobData>();

          for (const row of records) {
            const rowData = row as Record<string, string>;
            const jobName = rowData['Name'] || rowData['Job Name'] || '';
            const buildPhase = rowData['Build Phase'] || '';
            const orderDate = rowData['Order Date'] || '';
            
            if (!jobName) continue;

            if (!jobsMap.has(jobName)) {
              jobsMap.set(jobName, {
                address: rowData['Address'] || '',
                projectType: rowData['Project Type'] || '',
                phases: new Set(),
                orderDate: orderDate,
              });
            }

            if (buildPhase) {
              jobsMap.get(jobName)!.phases.add(buildPhase);
            }
          }

          let jobsCreated = 0;

          // Create jobs with their phases
          for (const [jobName, jobData] of Array.from(jobsMap.entries())) {
            const jobResult = await db.createJob({
              title: `${jobName} (${jobData.orderDate})`,
              address: jobData.address,
              projectType: jobData.projectType,
            });

            const jobId = Number((jobResult as any).insertId || 0);
            jobsCreated++;

            // Create phases for this job
            const phasesArray = Array.from(jobData.phases);
            for (let j = 0; j < phasesArray.length; j++) {
              await db.createBuildPhase({
                jobId,
                phaseName: phasesArray[j],
                tasks: '',
                order: j,
              });
            }
          }

          // Update upload status
          await db.updateCsvUpload(uploadId, {
            status: "completed",
            jobsCreated,
          });

          return { success: true, jobsCreated, uploadId };
        } catch (error) {
          // Update upload status with error
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
});

export type AppRouter = typeof appRouter;
