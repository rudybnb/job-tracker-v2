import { drizzle } from "drizzle-orm/mysql2";

const db = drizzle(process.env.DATABASE_URL!);

async function checkPhases() {
  const jobs = await db.execute("SELECT id, title FROM jobs");
  console.log("Jobs:", jobs);
  
  const phases = await db.execute("SELECT * FROM buildPhases ORDER BY jobId, `order`");
  console.log("\nBuild Phases:");
  console.log(phases);
  
  const resources = await db.execute("SELECT DISTINCT buildPhase FROM jobResources WHERE buildPhase != '' ORDER BY buildPhase");
  console.log("\nUnique phases from resources:");
  console.log(resources);
}

checkPhases();
