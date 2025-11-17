import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== Current Contractor Data ===\n");

// Get all contractors
const [contractors] = await connection.query(
  "SELECT id, username, firstName, lastName, primaryTrade FROM contractors ORDER BY id"
);

contractors.forEach(c => {
  console.log(`ID: ${c.id} | Username: ${c.username || 'NULL'} | Name: ${c.firstName} ${c.lastName} | Trade: ${c.primaryTrade}`);
});

console.log("\n=== Fixing Authentication ===\n");

// Find Mohamed Guizeni's ID
const [mohamedRows] = await connection.query(
  "SELECT id FROM contractors WHERE firstName LIKE '%Mohamed%' OR firstName LIKE '%Muhammed%'"
);

if (mohamedRows.length > 0) {
  const mohamedId = mohamedRows[0].id;
  console.log(`Found Mohamed Guizeni with ID: ${mohamedId}`);
  
  // Hash the password
  const passwordHash = await bcrypt.hash("mohamed123", 10);
  
  // Update Mohamed's record with username and password
  await connection.query(
    "UPDATE contractors SET username = ?, passwordHash = ? WHERE id = ?",
    ["mohamed", passwordHash, mohamedId]
  );
  
  console.log(`✓ Updated Mohamed's record (ID ${mohamedId}) with username 'mohamed'`);
} else {
  console.log("✗ Could not find Mohamed Guizeni in database");
}

// Find Rudy's ID and set his username
const [rudyRows] = await connection.query(
  "SELECT id FROM contractors WHERE firstName LIKE '%Rudy%'"
);

if (rudyRows.length > 0) {
  const rudyId = rudyRows[0].id;
  console.log(`Found Rudy with ID: ${rudyId}`);
  
  // Hash the password
  const passwordHash = await bcrypt.hash("rudy123", 10);
  
  // Update Rudy's record with username and password
  await connection.query(
    "UPDATE contractors SET username = ?, passwordHash = ? WHERE id = ?",
    ["rudy", passwordHash, rudyId]
  );
  
  console.log(`✓ Updated Rudy's record (ID ${rudyId}) with username 'rudy'`);
} else {
  console.log("✗ Could not find Rudy in database");
}

console.log("\n=== Updated Contractor Data ===\n");

// Get all contractors again
const [updatedContractors] = await connection.query(
  "SELECT id, username, firstName, lastName, primaryTrade FROM contractors ORDER BY id"
);

updatedContractors.forEach(c => {
  console.log(`ID: ${c.id} | Username: ${c.username || 'NULL'} | Name: ${c.firstName} ${c.lastName} | Trade: ${c.primaryTrade}`);
});

await connection.end();
console.log("\n✓ Fix complete!");
