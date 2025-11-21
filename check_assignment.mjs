import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [assignments] = await connection.query(
  "SELECT id, jobId, contractorId, createdAt FROM jobAssignments ORDER BY createdAt DESC LIMIT 1"
);

console.log("Most recent assignment:");
console.log(JSON.stringify(assignments, null, 2));

await connection.end();
