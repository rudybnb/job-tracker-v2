import { drizzle } from "drizzle-orm/mysql2";
import { contractors } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const allContractors = await db.select({
  id: contractors.id,
  username: contractors.username,
  firstName: contractors.firstName,
  lastName: contractors.lastName,
  email: contractors.email
}).from(contractors);

console.log("All contractors:");
console.log(JSON.stringify(allContractors, null, 2));
