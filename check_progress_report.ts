import { drizzle } from "drizzle-orm/mysql2";
import { progressReports, users } from "./drizzle/schema";
import { desc, eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

const reports = await db
  .select({
    report: progressReports,
    reviewer: users,
  })
  .from(progressReports)
  .leftJoin(users, eq(progressReports.reviewedBy, users.id))
  .orderBy(desc(progressReports.createdAt))
  .limit(5);

console.log("\n=== Progress Reports with Review Info ===\n");
reports.forEach((r, index) => {
  const report = r.report;
  const reviewer = r.reviewer;
  
  console.log(`Report ${index + 1}:`);
  console.log(`  ID: ${report.id}`);
  console.log(`  Contractor ID: ${report.contractorId}`);
  console.log(`  Assignment ID: ${report.assignmentId}`);
  console.log(`  Job ID: ${report.jobId}`);
  console.log(`  Phase: ${report.phaseName || 'N/A'}`);
  console.log(`  Task: ${report.taskName || 'N/A'}`);
  console.log(`  Status: ${report.status}`);
  console.log(`  Report Date: ${report.reportDate}`);
  console.log(`  Created: ${report.createdAt}`);
  console.log(`  Reviewed By: ${reviewer ? reviewer.name : 'Not reviewed'}`);
  console.log(`  Reviewed At: ${report.reviewedAt || 'N/A'}`);
  console.log(`  Review Notes: ${report.reviewNotes || 'None'}`);
  console.log('');
});

process.exit(0);
