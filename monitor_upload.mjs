import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("Monitoring for new Emmanuel job...\n");

for (let i = 0; i < 30; i++) {
  const [jobs] = await connection.query("SELECT id, title, createdAt FROM jobs WHERE title LIKE '%Emmanuel%' ORDER BY createdAt DESC LIMIT 1");
  
  if (jobs.length > 0) {
    const job = jobs[0];
    const jobId = job.id;
    
    console.log(`✓ Found Emmanuel job! ID: ${jobId}\n`);
    
    // Check resources
    const [resources] = await connection.query(`
      SELECT typeOfResource, COUNT(*) as count 
      FROM jobResources 
      WHERE jobId = ? 
      GROUP BY typeOfResource
    `, [jobId]);
    
    console.log(`Resources extracted:`);
    resources.forEach(r => console.log(`  - ${r.typeOfResource}: ${r.count}`));
    
    // Check build phases
    const [phases] = await connection.query("SELECT id, phaseName, tasks FROM buildPhases WHERE jobId = ?", [jobId]);
    console.log(`\nBuild Phases with tasks:`);
    phases.forEach(p => {
      const taskCount = p.tasks ? JSON.parse(p.tasks).length : 0;
      console.log(`  - ${p.phaseName}: ${taskCount} tasks`);
    });
    
    // Show sample Material tasks
    if (phases.length > 0) {
      const firstPhase = phases[0];
      if (firstPhase.tasks) {
        const tasks = JSON.parse(firstPhase.tasks);
        if (tasks.length > 0) {
          console.log(`\nSample tasks from "${firstPhase.phaseName}":`);
          tasks.slice(0, 5).forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
        }
      }
    }
    
    await connection.end();
    process.exit(0);
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

console.log("Timeout: No job uploaded within 60 seconds");
await connection.end();
