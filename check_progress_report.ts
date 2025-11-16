import { drizzle } from "drizzle-orm/mysql2";
import { progressReports } from "./drizzle/schema";
import { desc } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

const reports = await db.select().from(progressReports).orderBy(desc(progressReports.createdAt)).limit(5);

console.log("\n=== Progress Reports ===\n");
reports.forEach((report, index) => {
  console.log(`Report ${index + 1}:`);
  console.log(`  ID: ${report.id}`);
  console.log(`  Contractor ID: ${report.contractorId}`);
  console.log(`  Assignment ID: ${report.assignmentId}`);
  console.log(`  Job ID: ${report.jobId}`);
  console.log(`  Phase: ${report.phaseName || 'N/A'}`);
  console.log(`  Task: ${report.taskName || 'N/A'}`);
  console.log(`  Notes: ${report.notes}`);
  console.log(`  Photos: ${report.photoUrls || 'None'}`);
  console.log(`  Status: ${report.status}`);
  console.log(`  Report Date: ${report.reportDate}`);
  console.log(`  Created: ${report.createdAt}`);
  console.log('');
});

process.exit(0);
