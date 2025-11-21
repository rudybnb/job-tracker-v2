import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { buildPhases } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const phases = await db
  .select()
  .from(buildPhases)
  .where(eq(buildPhases.jobId, 390002))
  .limit(5);

console.log("Phases found:", phases.length);
phases.forEach(phase => {
  console.log("\n---");
  console.log("Phase:", phase.phaseName);
  console.log("Tasks type:", typeof phase.tasks);
  console.log("Tasks value:", phase.tasks);
  console.log("Tasks (first 200 chars):", phase.tasks ? String(phase.tasks).substring(0, 200) : "null");
});
