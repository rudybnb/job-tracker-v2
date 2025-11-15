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
          const { parse } = await import('csv-parse/sync');
          const records = parse(input.content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });

          // Helper function to extract cost
          const extractCost = (description: string, quantity: number): number => {
            if (!description) return 0;
            const match = description.match(/£([\d,]+(?:\.\d{1,2})?)/);
            if (match) {
              const priceStr = match[1].replace(/,/g, '');
              const price = parseFloat(priceStr);
              if (!isNaN(price)) {
                return Math.round(price * quantity * 100);
              }
            }
            return 0;
          };

          // Group by client
          interface DetectedJob {
            name: string;
            address: string;
            postCode: string;
            projectType: string;
            phases: string[];
            totalLabourCost: number;
            totalMaterialCost: number;
            resourceCount: number;
          }

          const jobsMap = new Map<string, DetectedJob>();

          for (const row of records) {
            const rowData = row as Record<string, string>;
            const clientName = (rowData['Name'] || '').trim();
            const buildPhase = (rowData['Build Phase'] || '').trim();
            const typeOfResource = (rowData['Type of Resource'] || '').trim();
            const resourceDescription = (rowData['Resource Description'] || '').trim();
            const orderQuantity = parseInt(rowData['Order Quantity'] || '1') || 1;

            if (!clientName) continue;
            if (!typeOfResource || (typeOfResource !== 'Material' && typeOfResource !== 'Labour')) continue;

            if (!jobsMap.has(clientName)) {
              jobsMap.set(clientName, {
                name: clientName,
                address: (rowData['Address'] || '').trim(),
                postCode: (rowData['Post Code'] || '').trim(),
                projectType: (rowData['Project Type'] || '').trim(),
                phases: [],
                totalLabourCost: 0,
                totalMaterialCost: 0,
                resourceCount: 0,
              });
            }

            const job = jobsMap.get(clientName)!;
            const cost = extractCost(resourceDescription, orderQuantity);

            if (typeOfResource === 'Labour') {
              job.totalLabourCost += cost;
            } else {
              job.totalMaterialCost += cost;
            }

            if (buildPhase && !job.phases.includes(buildPhase)) {
              job.phases.push(buildPhase);
            }

            job.resourceCount++;
          }

          const detectedJobs = Array.from(jobsMap.values());
          console.log(`[CSV] Detected ${detectedJobs.length} jobs`);

          return {
            success: true,
            jobs: detectedJobs,
            totalJobs: detectedJobs.length,
          };
        } catch (error) {
          console.error('[CSV] Detection error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to parse CSV file',
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

        const uploadId = Number((uploadResult as any).insertId || 0);

        try {
          // Parse CSV with proper handling of quoted fields
          const { parse } = await import('csv-parse/sync');
          const records = parse(input.content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });

          // Helper function to extract cost from resource description
          const extractCost = (description: string, quantity: number, rowIndex: number): number => {
            if (!description) return 0;
            // Match patterns: £1.66/Each, £22.50/Each, £33.00/Hours, £1,010.00/Each
            const match = description.match(/£([\d,]+(?:\.\d{1,2})?)/);
            if (match) {
              const priceStr = match[1].replace(/,/g, '');
              const price = parseFloat(priceStr);
              if (isNaN(price)) {
                console.log(`[CSV] Row ${rowIndex}: Invalid price in "${description}"`);
                return 0;
              }
              const totalCost = Math.round(price * quantity * 100); // Convert to pence
              return totalCost;
            }
            console.log(`[CSV] Row ${rowIndex}: No price found in "${description}"`);
            return 0;
          };

          // Group rows by client name
          interface ResourceLine {
            orderDate: string;
            dateRequired: string;
            buildPhase: string;
            typeOfResource: 'Material' | 'Labour';
            resourceType: string;
            supplier: string;
            resourceDescription: string;
            orderQuantity: number;
            cost: number;
          }
          
          interface ClientData {
            address: string;
            postCode: string;
            projectType: string;
            resources: ResourceLine[];
            phases: Set<string>;
            totalLabourCost: number;
            totalMaterialCost: number;
          }
          
          const clientsMap = new Map<string, ClientData>();

          for (const row of records) {
            const rowData = row as Record<string, string>;
            const clientName = rowData['Name'] || '';
            const buildPhase = rowData['Build Phase'] || '';
            const typeOfResource = rowData['Type of Resource'] || '';
            const resourceDescription = rowData['Resource Description'] || '';
            const orderQuantity = parseInt(rowData['Order Quantity'] || '1');
            
            if (!clientName || !typeOfResource) continue;

            if (!clientsMap.has(clientName)) {
              clientsMap.set(clientName, {
                address: rowData['Address'] || '',
                postCode: rowData['Post Code'] || '',
                projectType: rowData['Project Type'] || '',
                resources: [],
                phases: new Set(),
                totalLabourCost: 0,
                totalMaterialCost: 0,
              });
            }

            const clientData = clientsMap.get(clientName)!;
            const cost = extractCost(resourceDescription, orderQuantity, 1);
            
            // Add resource line
            clientData.resources.push({
              orderDate: rowData['Order Date'] || '',
              dateRequired: rowData['Date Required'] || '',
              buildPhase,
              typeOfResource: typeOfResource as 'Material' | 'Labour',
              resourceType: rowData['Resource Type'] || '',
              supplier: rowData['Supplier'] || '',
              resourceDescription,
              orderQuantity,
              cost,
            });

            // Add phase
            if (buildPhase) {
              clientData.phases.add(buildPhase);
            }

            // Sum costs
            if (typeOfResource === 'Labour') {
              clientData.totalLabourCost += cost;
            } else if (typeOfResource === 'Material') {
              clientData.totalMaterialCost += cost;
            }
          }

          let jobsCreated = 0;
          console.log(`[CSV] Processing ${clientsMap.size} clients`);

          // Create one job per client with all resources
          for (const [clientName, clientData] of Array.from(clientsMap.entries())) {
            console.log(`[CSV] Creating job for client: ${clientName}, phases: ${clientData.phases.size}, resources: ${clientData.resources.length}`);
            const jobResult = await db.createJob({
              title: clientName,
              address: clientData.address,
              postCode: clientData.postCode,
              projectType: clientData.projectType,
              totalLabourCost: clientData.totalLabourCost,
              totalMaterialCost: clientData.totalMaterialCost,
              uploadId: uploadId,
            });

            const jobId = Number((jobResult as any).insertId || 0);
            console.log(`[CSV] Job created with ID: ${jobId}`);
            jobsCreated++;

            // Create phases for this job
            const phasesArray = Array.from(clientData.phases);
            for (let j = 0; j < phasesArray.length; j++) {
              await db.createBuildPhase({
                jobId,
                phaseName: phasesArray[j],
                tasks: '',
                order: j,
              });
            }

            // Create resource records
            for (const resource of clientData.resources) {
              await db.createJobResource({
                jobId,
                ...resource,
              });
            }
          }

          // Update upload status
          console.log(`[CSV] Completed processing. Jobs created: ${jobsCreated}`);
          await db.updateCsvUpload(uploadId, {
            status: "completed",
            jobsCreated,
          });

          return { success: true, jobsCreated, uploadId };
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
});

export type AppRouter = typeof appRouter;
