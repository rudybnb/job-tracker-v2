import { drizzle } from "drizzle-orm/mysql2";
import { users, contractors } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

console.log("\n=== Checking John's Data ===\n");

// Check users table
const userJohn = await db.select().from(users).where(eq(users.name, "John Smith")).limit(1);
console.log("Users table:");
if (userJohn.length > 0) {
  console.log(`  ID: ${userJohn[0].id}`);
  console.log(`  Name: ${userJohn[0].name}`);
  console.log(`  Email: ${userJohn[0].email}`);
  console.log(`  Role: ${userJohn[0].role}`);
  console.log(`  OpenID: ${userJohn[0].openId}`);
} else {
  console.log("  ❌ John Smith not found in users table");
}

// Check contractors table
const contractorJohn = await db.select().from(contractors).where(eq(contractors.name, "John Smith")).limit(1);
console.log("\nContractors table:");
if (contractorJohn.length > 0) {
  console.log(`  ID: ${contractorJohn[0].id}`);
  console.log(`  Name: ${contractorJohn[0].name}`);
  console.log(`  Email: ${contractorJohn[0].email}`);
  console.log(`  Phone: ${contractorJohn[0].phone}`);
  console.log(`  Trade: ${contractorJohn[0].trade}`);
} else {
  console.log("  ❌ John Smith not found in contractors table");
}

// Check if there's a link between the two
if (userJohn.length > 0 && contractorJohn.length > 0) {
  console.log("\n=== Relationship ===");
  console.log(`User ID: ${userJohn[0].id}`);
  console.log(`Contractor ID: ${contractorJohn[0].id}`);
  console.log(`Match: ${userJohn[0].id === contractorJohn[0].id ? "✓ IDs match" : "✗ IDs don't match"}`);
}

process.exit(0);
