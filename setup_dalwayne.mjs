import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Find Dalwayne
const [contractors] = await connection.query(
  "SELECT id, firstName, lastName, primaryTrade FROM contractors WHERE firstName LIKE '%Dalwayne%' OR lastName LIKE '%Dalwayne%'"
);

if (contractors.length === 0) {
  console.log("No contractor found with name Dalwayne");
  await connection.end();
  process.exit(0);
}

const contractor = contractors[0];
console.log(`Found contractor: ${contractor.firstName} ${contractor.lastName}`);
console.log(`ID: ${contractor.id}`);
console.log(`Trade: ${contractor.primaryTrade}\n`);

// Set username and password
const username = "dalwayne";
const password = "dalwayne123";
const hashedPassword = await bcrypt.hash(password, 10);

await connection.query(
  "UPDATE contractors SET username = ?, passwordHash = ? WHERE id = ?",
  [username, hashedPassword, contractor.id]
);

console.log("✓ Login credentials created:");
console.log(`  Username: ${username}`);
console.log(`  Password: ${password}`);

await connection.end();
