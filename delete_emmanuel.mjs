import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [jobs] = await connection.query("SELECT id FROM jobs WHERE title LIKE '%Emmanuel%'");
if (jobs.length === 0) {
  console.log("No Emmanuel job found");
  await connection.end();
  process.exit(0);
}

const jobId = jobs[0].id;
console.log(`Deleting Emmanuel job ID: ${jobId}`);

await connection.query("DELETE FROM jobResources WHERE jobId = ?", [jobId]);
console.log("✓ Deleted jobResources");

await connection.query("DELETE FROM buildPhases WHERE jobId = ?", [jobId]);
console.log("✓ Deleted buildPhases");

await connection.query("DELETE FROM jobAssignments WHERE jobId = ?", [jobId]);
console.log("✓ Deleted jobAssignments");

await connection.query("DELETE FROM jobs WHERE id = ?", [jobId]);
console.log("✓ Deleted job");

console.log("\n✓ Emmanuel job deleted. Ready for CSV re-upload!");

await connection.end();
