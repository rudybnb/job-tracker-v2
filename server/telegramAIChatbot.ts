/**
 * AI-Powered Telegram Chatbot
 * Handles natural language queries about jobs, payments, budgets, contractors, etc.
 */
import { getDb } from "./db";
import { 
  contractors, 
  jobs, 
  jobAssignments, 
  progressReports,
  workSessions,
  expenses,
  jobBudgets,
  checkIns
} from "../drizzle/schema";
import { eq, and, desc, sql, gte, lte, sum, count } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

interface ChatContext {
  chatId: string;
  firstName: string;
  isAdmin: boolean;
  contractorId?: number;
}

/**
 * Main AI chatbot handler
 * Processes natural language queries and returns formatted responses
 */
export async function handleChatbotQuery(
  message: string,
  context: ChatContext
): Promise<string> {
  try {
    // First, use LLM to understand the intent and extract parameters
    const intent = await analyzeIntent(message, context);
    
    // Route to appropriate handler based on intent
    let response: string;
    
    switch (intent.category) {
      case "payments":
        response = await handlePaymentsQuery(intent, context);
        break;
      case "jobs":
        response = await handleJobsQuery(intent, context);
        break;
      case "budgets":
        response = await handleBudgetsQuery(intent, context);
        break;
      case "contractors":
        response = await handleContractorsQuery(intent, context);
        break;
      case "work_sessions":
        response = await handleWorkSessionsQuery(intent, context);
        break;
      case "progress_reports":
        response = await handleProgressReportsQuery(intent, context);
        break;
      case "check_ins":
        response = await handleCheckInsQuery(intent, context);
        break;
      case "general":
        response = await handleGeneralQuery(intent, context);
        break;
      default:
        response = "I'm not sure how to help with that. Try asking about jobs, payments, budgets, contractors, or work sessions.";
    }
    
    return response;
  } catch (error) {
    console.error("[AI Chatbot] Error processing query:", error);
    return "Sorry, I encountered an error processing your request. Please try again.";
  }
}

/**
 * Analyze user intent using LLM
 */
async function analyzeIntent(message: string, context: ChatContext) {
  const systemPrompt = `You are an AI assistant for a construction job tracking system. Analyze the user's question and extract:
1. Category: payments, jobs, budgets, contractors, work_sessions, progress_reports, check_ins, or general
2. Action: query, update, summary, list, details
3. Filters: any specific contractors, jobs, dates, or amounts mentioned
4. Time range: today, yesterday, this week, this month, or specific dates

User context: ${context.isAdmin ? "Admin (can see all data)" : `Contractor ${context.firstName} (can only see own data)`}

Return a JSON object with: category, action, filters, timeRange, specificEntities (names/IDs mentioned)`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "intent_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            category: { 
              type: "string",
              enum: ["payments", "jobs", "budgets", "contractors", "work_sessions", "progress_reports", "check_ins", "general"]
            },
            action: { 
              type: "string",
              enum: ["query", "update", "summary", "list", "details"]
            },
            filters: { type: "object", additionalProperties: true },
            timeRange: { type: "string" },
            specificEntities: { type: "array", items: { type: "string" } }
          },
          required: ["category", "action"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  const intent = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
  
  // Debug logging
  console.log('[AI Chatbot] Intent Analysis:', {
    message,
    category: intent.category,
    action: intent.action,
    timeRange: intent.timeRange,
    specificEntities: intent.specificEntities,
    filters: intent.filters
  });
  
  return intent;
}

/**
 * Handle payments-related queries
 */
async function handlePaymentsQuery(intent: any, context: ChatContext): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable. Please try again later.";

  try {
    // Get work sessions with contractor info to calculate payments
    let baseQuery = db
      .select({
        id: workSessions.id,
        contractorId: workSessions.contractorId,
        contractorName: sql<string>`CONCAT(${contractors.firstName}, ' ', ${contractors.lastName})`,
        netPay: workSessions.netPay,
        grossPay: workSessions.grossPay,
        hoursWorked: workSessions.hoursWorked,
        startTime: workSessions.startTime,
        status: workSessions.status
      })
      .from(workSessions)
      .leftJoin(contractors, eq(workSessions.contractorId, contractors.id));

    // Apply access control
    let query;
    if (!context.isAdmin && context.contractorId) {
      query = baseQuery.where(eq(workSessions.contractorId, context.contractorId));
    } else {
      query = baseQuery;
    }

    const results = await query.orderBy(desc(workSessions.startTime)).limit(50);

    if (results.length === 0) {
      return "No payment records found.";
    }

    // Group by contractor and calculate totals
    const contractorPayments = results.reduce((acc, session) => {
      const name = session.contractorName || 'Unknown';
      if (!acc[name]) {
        acc[name] = { grossTotal: 0, netTotal: 0, hours: 0, sessions: 0 };
      }
      acc[name].grossTotal += Number(session.grossPay || 0);
      acc[name].netTotal += Number(session.netPay || 0);
      acc[name].hours += Number(session.hoursWorked || 0);
      acc[name].sessions += 1;
      return acc;
    }, {} as Record<string, any>);

    // Format response
    let response = `💰 *Payment Summary*\n\n`;
    
    const totalGross = Object.values(contractorPayments).reduce((sum: number, p: any) => sum + p.grossTotal, 0);
    const totalNet = Object.values(contractorPayments).reduce((sum: number, p: any) => sum + p.netTotal, 0);
    const totalHours = Object.values(contractorPayments).reduce((sum: number, p: any) => sum + p.hours, 0);

    response += `Total Gross Pay: R${(totalGross / 100).toFixed(2)}\n`;
    response += `Total Net Pay: R${(totalNet / 100).toFixed(2)}\n`;
    response += `Total Hours: ${(totalHours / 60).toFixed(1)}h\n\n`;

    if (intent.action === "summary") {
      return response;
    }

    // Add detailed list by contractor
    response += `*By Contractor:*\n`;
    Object.entries(contractorPayments)
      .sort(([, a]: any, [, b]: any) => b.netTotal - a.netTotal)
      .slice(0, 10)
      .forEach(([name, data]: any) => {
        response += `💵 ${name}\n`;
        response += `   Net: R${(data.netTotal / 100).toFixed(2)} | Hours: ${(data.hours / 60).toFixed(1)}h | Sessions: ${data.sessions}\n`;
      });

    return response;
  } catch (error) {
    console.error("[Payments Query] Error:", error);
    return "Error fetching payment information.";
  }
}

/**
 * Handle jobs-related queries
 */
async function handleJobsQuery(intent: any, context: ChatContext): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable. Please try again later.";

  try {
    let baseQuery = db
      .select({
        id: jobs.id,
        title: jobs.title,
        address: jobs.address,
        status: jobs.status,
        totalLabourCost: jobs.totalLabourCost,
        totalMaterialCost: jobs.totalMaterialCost
      })
      .from(jobs);

    // Apply filters and access control
    let query;
    if (!context.isAdmin && context.contractorId) {
      // Contractor: only show assigned jobs
      query = baseQuery
        .leftJoin(jobAssignments, eq(jobs.id, jobAssignments.jobId))
        .where(eq(jobAssignments.contractorId, context.contractorId));
    } else if (intent.filters?.status) {
      // Admin with status filter
      query = baseQuery.where(eq(jobs.status, intent.filters.status));
    } else {
      // Admin without filter
      query = baseQuery;
    }

    const results = await query.orderBy(desc(jobs.createdAt)).limit(20);

    if (results.length === 0) {
      return "No jobs found.";
    }

    // Format response
    let response = `🏗️ *Jobs Summary*\n\n`;
    
    const inProgress = results.filter(j => j.status === 'in_progress').length;
    const completed = results.filter(j => j.status === 'completed').length;
    const pending = results.filter(j => j.status === 'pending').length;

    response += `In Progress: ${inProgress} | Completed: ${completed} | Pending: ${pending}\n\n`;

    if (intent.action === "summary") {
      return response;
    }

    // Add detailed list
    response += `*Job List:*\n`;
    results.slice(0, 10).forEach(j => {
      const statusEmoji = j.status === 'in_progress' ? '🟢' : j.status === 'completed' ? '✅' : '⏸️';
      const address = j.address || 'N/A';
      response += `${statusEmoji} ${j.title} - ${address}\n`;
      const totalBudget = (Number(j.totalLabourCost || 0) + Number(j.totalMaterialCost || 0)) / 100;
      if (totalBudget > 0) {
        response += `   Budget: R${totalBudget.toFixed(2)}\n`;
      }
    });

    return response;
  } catch (error) {
    console.error("[Jobs Query] Error:", error);
    return "Error fetching job information.";
  }
}

/**
 * Handle budgets-related queries
 */
async function handleBudgetsQuery(intent: any, context: ChatContext): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable. Please try again later.";

  if (!context.isAdmin) {
    return "Budget information is only available to administrators.";
  }

  try {
    // Get all jobs with budget info
    const jobsWithBudget = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        totalLabourCost: jobs.totalLabourCost,
        totalMaterialCost: jobs.totalMaterialCost,
        status: jobs.status
      })
      .from(jobs)
      .where(sql`(${jobs.totalLabourCost} > 0 OR ${jobs.totalMaterialCost} > 0)`)
      .orderBy(desc(jobs.createdAt));

    if (jobsWithBudget.length === 0) {
      return "No budget information available.";
    }

    // Calculate spent amounts for each job (from expenses)
    const budgetAnalysis = await Promise.all(
      jobsWithBudget.map(async (job) => {
        const spentResult = await db
          .select({
            totalSpent: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`
          })
          .from(expenses)
          .where(eq(expenses.jobId, job.id));

        const spent = Number(spentResult[0]?.totalSpent || 0);
        const budget = (Number(job.totalLabourCost || 0) + Number(job.totalMaterialCost || 0));
        const remaining = budget - spent;
        const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;

        return {
          ...job,
          spent,
          remaining,
          percentUsed,
          isOverBudget: spent > budget
        };
      })
    );

    // Format response
    let response = `💵 *Budget Overview*\n\n`;

    const totalBudget = budgetAnalysis.reduce((sum, j) => sum + (Number(j.totalLabourCost || 0) + Number(j.totalMaterialCost || 0)), 0);
    const totalSpent = budgetAnalysis.reduce((sum, j) => sum + j.spent, 0);
    const overBudgetJobs = budgetAnalysis.filter(j => j.isOverBudget).length;

    response += `Total Budget: R${(totalBudget / 100).toFixed(2)}\n`;
    response += `Total Spent: R${(totalSpent / 100).toFixed(2)}\n`;
    response += `Remaining: R${((totalBudget - totalSpent) / 100).toFixed(2)}\n`;
    if (overBudgetJobs > 0) {
      response += `⚠️ ${overBudgetJobs} job(s) over budget\n`;
    }
    response += `\n`;

    // Show jobs over budget first
    const sortedJobs = budgetAnalysis.sort((a, b) => b.percentUsed - a.percentUsed);

    response += `*Job Budgets:*\n`;
    sortedJobs.slice(0, 10).forEach(j => {
      const emoji = j.isOverBudget ? '🔴' : j.percentUsed > 80 ? '🟡' : '🟢';
        response += `${emoji} ${j.title}\n`;
        const budget = (Number(j.totalLabourCost || 0) + Number(j.totalMaterialCost || 0)) / 100;
        response += `   Budget: R${budget.toFixed(2)} | Spent: R${(j.spent / 100).toFixed(2)} (${j.percentUsed.toFixed(0)}%)\n`;
      if (j.isOverBudget) {
        response += `   ⚠️ Over by R${Math.abs(j.remaining).toFixed(2)}\n`;
      }
    });

    return response;
  } catch (error) {
    console.error("[Budgets Query] Error:", error);
    return "Error fetching budget information.";
  }
}

/**
 * Handle contractors-related queries
 */
async function handleContractorsQuery(intent: any, context: ChatContext): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable. Please try again later.";

  if (!context.isAdmin) {
    return "Contractor information is only available to administrators.";
  }

  try {
    const allContractors = await db
      .select()
      .from(contractors)
      .orderBy(contractors.firstName);

    if (allContractors.length === 0) {
      return "No contractors found.";
    }

    let response = `👷 *Contractors (${allContractors.length})*\n\n`;

    for (const contractor of allContractors.slice(0, 15)) {
      response += `• ${contractor.firstName} ${contractor.lastName}\n`;
      response += `  Trade: ${contractor.primaryTrade || 'N/A'}\n`;
      if (contractor.phone) {
        response += `  Phone: ${contractor.phone}\n`;
      }
    }

    return response;
  } catch (error) {
    console.error("[Contractors Query] Error:", error);
    return "Error fetching contractor information.";
  }
}

/**
 * Handle work sessions queries
 */
async function handleWorkSessionsQuery(intent: any, context: ChatContext): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable. Please try again later.";

  try {
    let baseQuery = db
      .select({
        id: workSessions.id,
        contractorName: sql<string>`CONCAT(${contractors.firstName}, ' ', ${contractors.lastName})`,
        jobTitle: jobs.title,
        startTime: workSessions.startTime,
        hoursWorked: workSessions.hoursWorked
      })
      .from(workSessions)
      .leftJoin(contractors, eq(workSessions.contractorId, contractors.id))
      .leftJoin(jobs, eq(workSessions.jobId, jobs.id));

    // Apply access control
    let query;
    if (!context.isAdmin && context.contractorId) {
      query = baseQuery.where(eq(workSessions.contractorId, context.contractorId));
    } else {
      query = baseQuery;
    }

    const results = await query.orderBy(desc(workSessions.startTime)).limit(20);

    if (results.length === 0) {
      return "No work sessions found.";
    }

    const totalHours = results.reduce((sum, s) => sum + (Number(s.hoursWorked) || 0), 0);

    let response = `⏱️ *Work Sessions*\n\n`;
    response += `Total Hours: ${totalHours.toFixed(1)}h\n`;
    response += `Sessions: ${results.length}\n\n`;

    response += `*Recent Sessions:*\n`;
    results.slice(0, 10).forEach(s => {
      const date = s.startTime ? new Date(s.startTime).toLocaleDateString() : 'N/A';
      const hours = s.hoursWorked ? (Number(s.hoursWorked) / 60).toFixed(1) : '0';
      response += `• ${s.contractorName} - ${s.jobTitle}\n`;
      response += `  ${date}: ${hours}h\n`;
    });

    return response;
  } catch (error) {
    console.error("[Work Sessions Query] Error:", error);
    return "Error fetching work session information.";
  }
}

/**
 * Handle progress reports queries
 */
async function handleProgressReportsQuery(intent: any, context: ChatContext): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable. Please try again later.";

  try {
    let baseQuery = db
      .select({
        id: progressReports.id,
        contractorName: sql<string>`CONCAT(${contractors.firstName}, ' ', ${contractors.lastName})`,
        jobTitle: jobs.title,
        reportDate: progressReports.reportDate,
        notes: progressReports.notes
      })
      .from(progressReports)
      .leftJoin(contractors, eq(progressReports.contractorId, contractors.id))
      .leftJoin(jobs, eq(progressReports.jobId, jobs.id));

    // Apply access control
    let query;
    if (!context.isAdmin && context.contractorId) {
      query = baseQuery.where(eq(progressReports.contractorId, context.contractorId));
    } else {
      query = baseQuery;
    }

    const results = await query.orderBy(desc(progressReports.reportDate)).limit(15);

    if (results.length === 0) {
      return "No progress reports found.";
    }

    let response = `📋 *Progress Reports (${results.length})*\n\n`;

    results.slice(0, 10).forEach(r => {
      response += `• ${r.contractorName} - ${r.jobTitle}\n`;
      response += `  Date: ${r.reportDate}\n`;
      if (r.notes) {
        response += `  Notes: ${r.notes.substring(0, 50)}${r.notes.length > 50 ? '...' : ''}\n`;
      }
    });

    return response;
  } catch (error) {
    console.error("[Progress Reports Query] Error:", error);
    return "Error fetching progress report information.";
  }
}

/**
 * Handle check-ins queries
 */
async function handleCheckInsQuery(intent: any, context: ChatContext): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable. Please try again later.";

  try {
    let baseQuery = db
      .select({
        id: checkIns.id,
        contractorName: sql<string>`CONCAT(${contractors.firstName}, ' ', ${contractors.lastName})`,
        checkInTime: checkIns.checkInTime,
        checkInType: checkIns.checkInType,
        location: checkIns.location
      })
      .from(checkIns)
      .leftJoin(contractors, eq(checkIns.contractorId, contractors.id));

    // Apply access control and filters
    let query;
    
    // If non-admin contractor, only show their own check-ins
    if (!context.isAdmin && context.contractorId) {
      query = baseQuery.where(eq(checkIns.contractorId, context.contractorId));
    } else {
      query = baseQuery;
    }
    
    // If admin asking about specific contractor, filter by name
    if (context.isAdmin && intent.specificEntities && intent.specificEntities.length > 0) {
      const contractorName = intent.specificEntities[0].toLowerCase();
      console.log('[Check-ins Query] Filtering by contractor:', contractorName, 'from entities:', intent.specificEntities);
      // Filter results by contractor name after query (since we need the joined name)
      const allResults = await query.orderBy(desc(checkIns.checkInTime)).limit(100);
      const filtered = allResults.filter(c => 
        c.contractorName?.toLowerCase().includes(contractorName)
      );
      
      if (filtered.length === 0) {
        return `No check-ins found for "${intent.specificEntities[0]}".`;
      }
      
      // Apply time filter if specified
      let finalResults = filtered;
      if (intent.timeRange === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        finalResults = filtered.filter(c => new Date(c.checkInTime) >= today);
      }
      
      if (finalResults.length === 0) {
        return `${intent.specificEntities[0]} hasn't checked in ${intent.timeRange || "recently"}.`;
      }
      
      let response = `✅ *Check-ins for ${intent.specificEntities[0]} (${finalResults.length})*\n\n`;
      finalResults.slice(0, 15).forEach(c => {
        response += `• ${c.checkInTime} - ${c.checkInType}\n`;
        if (c.location) {
          response += `  📍 ${c.location}\n`;
        }
      });
      return response;
    }

    const results = await query.orderBy(desc(checkIns.checkInTime)).limit(20);

    if (results.length === 0) {
      return "No check-ins found.";
    }

    let response = `✅ *Recent Check-ins (${results.length})*\n\n`;

    results.slice(0, 15).forEach(c => {
      response += `• ${c.contractorName}\n`;
      response += `  ${c.checkInTime} - ${c.checkInType}\n`;
      if (c.location) {
        response += `  📍 ${c.location}\n`;
      }
    });

    return response;
  } catch (error) {
    console.error("[Check-ins Query] Error:", error);
    return "Error fetching check-in information.";
  }
}

/**
 * Handle general queries
 */
async function handleGeneralQuery(intent: any, context: ChatContext): Promise<string> {
  return `Hi ${context.firstName}! 👋

I can help you with:
• 💰 Payments (outstanding, paid, owed)
• 🏗️ Jobs (active, completed, details)
• 💵 Budgets (spent, remaining, over budget)
• 👷 Contractors (list, assignments)
• ⏱️ Work Sessions (hours logged, summaries)
• 📋 Progress Reports (updates, issues)
• ✅ Check-ins (recent activity)

Just ask me anything! For example:
- "How much do I owe Rudy?"
- "What jobs are over budget?"
- "Who worked yesterday?"
- "Show me all outstanding payments"`;
}
