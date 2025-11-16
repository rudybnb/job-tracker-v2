import { drizzle } from "drizzle-orm/mysql2";
import { users, contractors } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

console.log("\n=== All Users ===");
const allUsers = await db.select().from(users).limit(10);
allUsers.forEach(u => {
  console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
});

console.log("\n=== All Contractors ===");
const allContractors = await db.select().from(contractors).limit(10);
allContractors.forEach(c => {
  console.log(`ID: ${c.id}, FirstName: ${c.firstName}, LastName: ${c.lastName}, Username: ${c.username}, UserID: ${c.userId}`);
});

process.exit(0);
