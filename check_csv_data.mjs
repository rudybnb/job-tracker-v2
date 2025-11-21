import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [jobs] = await connection.query("SELECT id, title FROM jobs WHERE title LIKE '%Emmanuel%'");
if (jobs.length === 0) {
  console.log("No Emmanuel job found");
  await connection.end();
  process.exit(0);
}

const jobId = jobs[0].id;
console.log(`Emmanuel Job ID: ${jobId}\n`);

// Check build phases
const [phases] = await connection.query("SELECT id, phaseName, tasks FROM buildPhases WHERE jobId = ?", [jobId]);
console.log(`Build Phases: ${phases.length}`);
phases.forEach(p => {
  const taskCount = p.tasks ? JSON.parse(p.tasks).length : 0;
  console.log(`  - ${p.phaseName}: ${taskCount} tasks`);
});

// Check resources
const [resources] = await connection.query(`
  SELECT typeOfResource, COUNT(*) as count 
  FROM jobResources 
  WHERE jobId = ? 
  GROUP BY typeOfResource
`, [jobId]);

console.log(`\nResources by type:`);
resources.forEach(r => console.log(`  - ${r.typeOfResource}: ${r.count}`));

// Show sample Material resources
const [materials] = await connection.query(`
  SELECT buildPhase, resourceDescription 
  FROM jobResources 
  WHERE jobId = ? AND typeOfResource LIKE 'Material%'
  LIMIT 10
`, [jobId]);

console.log(`\nSample Material resources (first 10):`);
materials.forEach(m => console.log(`  - ${m.buildPhase}: ${m.resourceDescription}`));

await connection.end();
