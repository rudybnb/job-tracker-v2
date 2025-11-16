import { drizzle } from "drizzle-orm/mysql2";
import { jobs } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";

// Get the latest job
const db = drizzle(process.env.DATABASE_URL);
const latestJob = await db.select().from(jobs).orderBy(jobs.id).limit(10);

console.log("\n=== Latest Jobs ===");
latestJob.forEach(job => {
  console.log(`\nID: ${job.id}`);
  console.log(`Title: ${job.title}`);
  console.log(`Postcode: ${job.postCode || "N/A"}`);
  console.log(`GPS Before: ${job.latitude || "N/A"}, ${job.longitude || "N/A"}`);
});

// Now test the assignment with geocoding
console.log("\n\n=== Testing Automatic Geocoding ===");
console.log("Importing assignJobToContractor function...");

const { assignJobToContractor } = await import("./server/db.ts");

// Get the test job ID (should be the latest one)
const testJobId = latestJob[latestJob.length - 1].id;
const contractorId = 120001; // John's ID

console.log(`\nAssigning Job ID ${testJobId} to Contractor ID ${contractorId}...`);

try {
  await assignJobToContractor(testJobId, contractorId);
  console.log("✓ Assignment successful!");
  
  // Check if GPS coordinates were added
  const updatedJob = await db.select().from(jobs).where(eq(jobs.id, testJobId)).limit(1);
  
  console.log("\n=== After Assignment ===");
  console.log(`Job ID: ${updatedJob[0].id}`);
  console.log(`Title: ${updatedJob[0].title}`);
  console.log(`Postcode: ${updatedJob[0].postCode}`);
  console.log(`GPS After: ${updatedJob[0].latitude}, ${updatedJob[0].longitude}`);
  console.log(`Assigned to Contractor: ${updatedJob[0].assignedContractorId}`);
  
  if (updatedJob[0].latitude && updatedJob[0].longitude) {
    console.log("\n✓ SUCCESS: GPS coordinates were automatically geocoded!");
  } else {
    console.log("\n✗ FAILED: GPS coordinates were not set");
  }
} catch (error) {
  console.error("\n✗ Error during assignment:", error.message);
}

process.exit(0);
