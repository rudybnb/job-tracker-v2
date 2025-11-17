import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const jobId = 690002;
console.log(`Deleting job ID: ${jobId}`);

await connection.query("DELETE FROM jobResources WHERE jobId = ?", [jobId]);
console.log("✓ Deleted jobResources");

await connection.query("DELETE FROM buildPhases WHERE jobId = ?", [jobId]);
console.log("✓ Deleted buildPhases");

await connection.query("DELETE FROM jobAssignments WHERE jobId = ?", [jobId]);
console.log("✓ Deleted jobAssignments");

await connection.query("DELETE FROM jobs WHERE id = ?", [jobId]);
console.log("✓ Deleted job");

console.log("\n✓ Job deleted. Ready for CSV re-upload!");

await connection.end();
