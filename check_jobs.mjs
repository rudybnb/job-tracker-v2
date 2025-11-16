import { drizzle } from "drizzle-orm/mysql2";
import { jobs } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);
const jobList = await db.select({
  id: jobs.id,
  title: jobs.title,
  postCode: jobs.postCode,
  latitude: jobs.latitude,
  longitude: jobs.longitude,
  assignedContractorId: jobs.assignedContractorId
}).from(jobs).limit(5);

console.log("\n=== Jobs ===");
jobList.forEach(job => {
  console.log(`\nID: ${job.id}`);
  console.log(`Title: ${job.title}`);
  console.log(`Postcode: ${job.postCode || "N/A"}`);
  console.log(`GPS: ${job.latitude || "N/A"}, ${job.longitude || "N/A"}`);
  console.log(`Assigned Contractor: ${job.assignedContractorId || "Unassigned"}`);
});

process.exit(0);
