/**
 * Telegram Acknowledgment Handler
 * Processes contractor acknowledgments for job assignments
 */

import { eq, and, desc } from "drizzle-orm";
import { jobAssignments, contractors, jobs } from "../drizzle/schema";

interface AcknowledgmentParams {
  telegramChatId: string;
  message: string;
  db: any;
}

interface AcknowledgmentResult {
  success: boolean;
  message: string;
  assignmentId?: number;
}

/**
 * Handle contractor acknowledgment of job assignment
 * Triggered when contractor replies "ACCEPT" to assignment notification
 */
export async function handleJobAcknowledgment(
  params: AcknowledgmentParams
): Promise<AcknowledgmentResult> {
  const { telegramChatId, message, db } = params;

  try {
    // Check if message is an acknowledgment
    const normalizedMessage = message.trim().toUpperCase();
    if (normalizedMessage !== "ACCEPT" && normalizedMessage !== "ACCEPTED") {
      return {
        success: false,
        message: "Invalid acknowledgment. Please reply with 'ACCEPT' to acknowledge the assignment.",
      };
    }

    // Find contractor by Telegram chat ID
    const contractorResult = await db
      .select()
      .from(contractors)
      .where(eq(contractors.telegramChatId, telegramChatId))
      .limit(1);

    if (contractorResult.length === 0) {
      return {
        success: false,
        message: "Contractor not found. Please contact your admin.",
      };
    }

    const contractor = contractorResult[0];

    // Find the most recent unacknowledged assignment for this contractor
    const assignmentResult = await db
      .select({
        assignment: jobAssignments,
        job: jobs,
      })
      .from(jobAssignments)
      .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(
        and(
          eq(jobAssignments.contractorId, contractor.id),
          eq(jobAssignments.acknowledged, false)
        )
      )
      .orderBy(desc(jobAssignments.createdAt))
      .limit(1);

    if (assignmentResult.length === 0) {
      return {
        success: false,
        message: "No pending assignments to acknowledge. All your assignments have been acknowledged.",
      };
    }

    const { assignment, job } = assignmentResult[0];

    // Update assignment to mark as acknowledged
    await db
      .update(jobAssignments)
      .set({
        acknowledged: true,
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobAssignments.id, assignment.id));

    return {
      success: true,
      message: `✅ *Assignment Acknowledged*\n\n` +
        `Thank you for confirming your assignment for:\n` +
        `📍 ${job?.title || 'Unknown Job'}\n` +
        `📌 ${job?.address || 'N/A'}\n\n` +
        `You can now view the job details and tasks in your contractor portal.`,
      assignmentId: assignment.id,
    };
  } catch (error) {
    console.error("[Telegram Acknowledgment] Error:", error);
    return {
      success: false,
      message: "An error occurred while processing your acknowledgment. Please try again or contact your admin.",
    };
  }
}
