import { drizzle } from "drizzle-orm/mysql2";
import { buildPhases } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

async function checkPhases() {
  const latestJob = await db.execute("SELECT MAX(id) as maxId FROM jobs");
  const jobId = (latestJob as any)[0][0].maxId;
  
  console.log(`Checking phases for job ID: ${jobId}`);
  
  const phases = await db.select().from(buildPhases).where(eq(buildPhases.jobId, jobId));
  
  console.log(`\nFound ${phases.length} build phases:`);
  phases.forEach((phase, idx) => {
    console.log(`  ${idx + 1}. ${phase.phaseName}`);
  });
}

checkPhases();
