import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== Migrating Existing Job Tasks ===\n");

// Get Emmanuel's job ID
const [jobs] = await connection.query(`
  SELECT id, title FROM jobs WHERE title LIKE '%Emmanuel%'
`);

if (jobs.length === 0) {
  console.log("No Emmanuel job found");
  await connection.end();
  process.exit(0);
}

const jobId = jobs[0].id;
console.log(`Found job: ${jobs[0].title} (ID: ${jobId})\n`);

// Get all Labour resources grouped by build phase
const [resources] = await connection.query(`
  SELECT buildPhase, resourceDescription 
  FROM jobResources 
  WHERE jobId = ? AND typeOfResource = 'Labour'
  ORDER BY buildPhase, id
`, [jobId]);

console.log(`Found ${resources.length} Labour tasks\n`);

// Group tasks by phase
const tasksByPhase = new Map();
for (const resource of resources) {
  const phase = resource.buildPhase;
  if (!tasksByPhase.has(phase)) {
    tasksByPhase.set(phase, []);
  }
  tasksByPhase.get(phase).push(resource.resourceDescription);
}

console.log(`Grouped into ${tasksByPhase.size} phases:\n`);

// Update each build phase with its tasks
for (const [phaseName, tasks] of tasksByPhase.entries()) {
  console.log(`${phaseName}: ${tasks.length} tasks`);
  tasks.forEach((task, i) => console.log(`  ${i + 1}. ${task}`));
  
  const tasksJson = JSON.stringify(tasks);
  
  await connection.query(`
    UPDATE buildPhases 
    SET tasks = ? 
    WHERE jobId = ? AND phaseName = ?
  `, [tasksJson, jobId, phaseName]);
  
  console.log(`  ✓ Updated\n`);
}

console.log("✓ Migration complete!");

await connection.end();
