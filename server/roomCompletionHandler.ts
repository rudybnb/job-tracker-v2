/**
 * Room Completion Handler
 * Processes room completion messages from contractors
 * Updates job assignments and calculates payments
 */

import { eq, and } from "drizzle-orm";
import { jobAssignments, jobs } from "../drizzle/schema";

interface RoomCompletionParams {
  contractorId: number;
  message: string;
  db: any;
}

interface RoomCompletionResult {
  success: boolean;
  message: string;
  roomName?: string;
  payment?: number;
}

/**
 * Extract room name from message
 * Examples:
 * - "Bedroom 1 complete" → "Bedroom 1"
 * - "Finished bedroom 2" → "Bedroom 2"
 * - "Kitchen done" → "Kitchen"
 */
function extractRoomName(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Pattern 1: "Bedroom 1", "Bedroom 2", etc.
  const bedroomMatch = lowerMessage.match(/bedroom\s*(\d+)/);
  if (bedroomMatch) {
    return `Bedroom ${bedroomMatch[1]}`;
  }
  
  // Pattern 2: Named rooms
  const roomTypes = [
    { pattern: /kitchen/, name: 'Kitchen' },
    { pattern: /dining\s*room/, name: 'Dining Room' },
    { pattern: /living\s*room/, name: 'Living Room' },
    { pattern: /ensuite/, name: 'Ensuite' },
    { pattern: /bathroom/, name: 'Bathroom' },
  ];
  
  for (const roomType of roomTypes) {
    if (roomType.pattern.test(lowerMessage)) {
      return roomType.name;
    }
  }
  
  return null;
}

/**
 * Handle room completion
 */
export async function handleRoomCompletion(
  params: RoomCompletionParams
): Promise<RoomCompletionResult> {
  const { contractorId, message, db } = params;
  
  try {
    // Extract room name from message
    const roomName = extractRoomName(message);
    
    if (!roomName) {
      return {
        success: false,
        message: "I couldn't identify which room you completed. Please specify the room name (e.g., 'Bedroom 1 complete' or 'Kitchen done')."
      };
    }
    
    console.log(`[Room Completion] Extracted room: "${roomName}" for contractor ${contractorId}`);
    
    // Find active job assignment for this contractor
    const assignments = await db
      .select({
        id: jobAssignments.id,
        jobId: jobAssignments.jobId,
        pricingModel: jobAssignments.pricingModel,
        pricePerRoom: jobAssignments.pricePerRoom,
        assignedRooms: jobAssignments.assignedRooms,
        completedRooms: jobAssignments.completedRooms,
      })
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.contractorId, contractorId),
          eq(jobAssignments.status, "assigned")
        )
      );
    
    if (!assignments || assignments.length === 0) {
      return {
        success: false,
        message: "You don't have any active job assignments. Please contact your admin."
      };
    }
    
    // Find assignment that includes this room
    let targetAssignment = null;
    for (const assignment of assignments) {
      const assignedRooms = assignment.assignedRooms ? JSON.parse(assignment.assignedRooms) : [];
      if (assignedRooms.includes(roomName)) {
        targetAssignment = assignment;
        break;
      }
    }
    
    if (!targetAssignment) {
      return {
        success: false,
        message: `"${roomName}" is not assigned to you. Your assigned rooms: ${
          assignments[0].assignedRooms ? JSON.parse(assignments[0].assignedRooms).join(', ') : 'None'
        }`
      };
    }
    
    // Check if room is already completed
    const completedRooms = targetAssignment.completedRooms ? JSON.parse(targetAssignment.completedRooms) : [];
    const alreadyCompleted = completedRooms.some((cr: any) => cr.roomName === roomName);
    
    if (alreadyCompleted) {
      return {
        success: false,
        message: `"${roomName}" is already marked as completed.`
      };
    }
    
    // Add room to completed list
    const newCompletion = {
      roomName,
      completedAt: new Date().toISOString(),
      completedBy: contractorId
    };
    completedRooms.push(newCompletion);
    
    // Update assignment
    await db
      .update(jobAssignments)
      .set({
        completedRooms: JSON.stringify(completedRooms),
        updatedAt: new Date()
      })
      .where(eq(jobAssignments.id, targetAssignment.id));
    
    // Calculate payment based on pricing model
    let paymentMessage = "";
    if (targetAssignment.pricingModel === "per_room" && targetAssignment.pricePerRoom) {
      const pricePerRoom = targetAssignment.pricePerRoom;
      const totalEarned = completedRooms.length * pricePerRoom;
      const assignedRooms = JSON.parse(targetAssignment.assignedRooms || "[]");
      const remainingRooms = assignedRooms.length - completedRooms.length;
      
      paymentMessage = `\n\n💰 Payment: £${(pricePerRoom / 100).toFixed(2)} for this room\n` +
        `📊 Total earned: £${(totalEarned / 100).toFixed(2)} (${completedRooms.length}/${assignedRooms.length} rooms)\n` +
        `📋 Remaining: ${remainingRooms} room${remainingRooms !== 1 ? 's' : ''}`;
    }
    
    // Get job details
    const jobDetails = await db
      .select({
        title: jobs.title,
        address: jobs.address
      })
      .from(jobs)
      .where(eq(jobs.id, targetAssignment.jobId))
      .limit(1);
    
    const jobTitle = jobDetails[0]?.title || "Unknown Job";
    
    const successMessage = `✅ Great work! "${roomName}" marked as completed for ${jobTitle}.${paymentMessage}`;
    
    console.log(`[Room Completion] Success: ${roomName} completed by contractor ${contractorId}`);
    
    return {
      success: true,
      message: successMessage,
      roomName,
      payment: targetAssignment.pricePerRoom || 0
    };
    
  } catch (error) {
    console.error('[Room Completion] Error:', error);
    return {
      success: false,
      message: "Sorry, I encountered an error processing the room completion. Please try again or contact support."
    };
  }
}
