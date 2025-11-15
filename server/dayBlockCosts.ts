import { calculateDayBlockCost } from "../shared/labourCosts";
import { getDb } from "./db";
import { jobResources, contractors } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Calculate realistic day-block labour costs for job assignment
 * 
 * This function:
 * 1. Gets HBXL labour hours for selected phases
 * 2. Gets contractor's hourly rate (agency rate including CIS/taxes)
 * 3. Converts hours to day-blocks (any work under 8hrs = 1 day, over 8hrs = round up)
 * 4. Calculates realistic cost: day-blocks × 8 hours × hourly rate
 * 
 * @param jobId - The job ID
 * @param phaseNames - Array of phase names to include
 * @param contractorId - The contractor ID
 * @returns Day-block cost breakdown with HBXL comparison
 */
export async function calculateDayBlockAssignmentCost(
  jobId: number,
  phaseNames: string[],
  contractorId: number
): Promise<{
  // HBXL data (for reference)
  hbxlLabourHours: number;
  hbxlLabourCost: number;
  hbxlMaterialCost: number;
  
  // Day-block calculation
  dayBlocks: number;
  totalHours: number;
  hourlyRate: number;
  dayBlockLabourCost: number;
  
  // Material cost (unchanged)
  materialCost: number;
  
  // Totals
  totalCost: number;
  
  // Contractor info
  contractorName: string;
  contractorTrade: string;
  paymentType: "day_rate" | "price_work";
}> {
  const db = await getDb();
  
  if (!db) {
    return {
      hbxlLabourHours: 0,
      hbxlLabourCost: 0,
      hbxlMaterialCost: 0,
      dayBlocks: 0,
      totalHours: 0,
      hourlyRate: 0,
      dayBlockLabourCost: 0,
      materialCost: 0,
      totalCost: 0,
      contractorName: "Unknown",
      contractorTrade: "Unknown",
      paymentType: "day_rate",
    };
  }

  // Get contractor info
  const contractorResult = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1);

  if (contractorResult.length === 0) {
    throw new Error("Contractor not found");
  }

  const contractor = contractorResult[0];
  const contractorName = `${contractor.firstName} ${contractor.lastName}`;
  const contractorTrade = contractor.primaryTrade || "Unknown";
  const paymentType = contractor.paymentType || "day_rate";
  const hourlyRate = contractor.hourlyRate || 0; // in pence

  // Get all resources for this job
  const resources = await db
    .select()
    .from(jobResources)
    .where(eq(jobResources.jobId, jobId));

  // Filter resources by selected phases
  let hbxlLabourHours = 0;
  let hbxlLabourCost = 0;
  let materialCost = 0;

  resources.forEach((resource) => {
    if (phaseNames.includes(resource.buildPhase || "")) {
      const cost = resource.cost || 0;
      const orderQuantity = resource.orderQuantity || 0;

      if (resource.typeOfResource === "Labour") {
        hbxlLabourCost += cost;
        // Extract hours from orderQuantity (HBXL stores labour as hours)
        hbxlLabourHours += orderQuantity;
      } else if (resource.typeOfResource === "Material") {
        materialCost += cost;
      }
    }
  });

  // Calculate day-block costs
  let dayBlocks = 0;
  let totalHours = 0;
  let dayBlockLabourCost = 0;

  if (paymentType === "day_rate" && hourlyRate > 0) {
    // Use day-block calculation for agency contractors
    const dayBlockResult = calculateDayBlockCost(hbxlLabourHours, hourlyRate);
    dayBlocks = dayBlockResult.dayBlocks;
    totalHours = dayBlockResult.totalHours;
    dayBlockLabourCost = dayBlockResult.totalCostInPence;
  } else if (paymentType === "price_work") {
    // For price work, we don't calculate labour cost here
    // It will be entered manually when creating the assignment
    dayBlockLabourCost = 0;
  } else {
    // Fallback to HBXL cost if no hourly rate set
    dayBlockLabourCost = hbxlLabourCost;
  }

  const totalCost = dayBlockLabourCost + materialCost;

  return {
    hbxlLabourHours,
    hbxlLabourCost,
    hbxlMaterialCost: materialCost,
    dayBlocks,
    totalHours,
    hourlyRate,
    dayBlockLabourCost,
    materialCost,
    totalCost,
    contractorName,
    contractorTrade,
    paymentType,
  };
}
