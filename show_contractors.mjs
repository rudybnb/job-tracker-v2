import { drizzle } from "drizzle-orm/mysql2";
import { contractors, users } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const allContractors = await db.select().from(contractors);

console.log("\n=== Contractors ===");
allContractors.forEach(c => {
  console.log(`\nID: ${c.id}`);
  console.log(`  Name: ${c.firstName} ${c.lastName}`);
  console.log(`  Username: ${c.username}`);
  console.log(`  Email: ${c.email}`);
  console.log(`  UserID: ${c.userId || 'N/A'}`);
});

console.log("\n=== Users ===");
const allUsers = await db.select().from(users);
allUsers.forEach(u => {
  console.log(`\nID: ${u.id}`);
  console.log(`  Name: ${u.name}`);
  console.log(`  Email: ${u.email}`);
  console.log(`  Role: ${u.role}`);
});

process.exit(0);
