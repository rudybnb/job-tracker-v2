import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { contractors } from "../drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

async function setupContractorLogins() {
  console.log("Setting up contractor login credentials...\n");

  // Set up Mohamed Guizeni
  const mohamedPassword = await bcrypt.hash("mohamed123", 10);
  await db
    .update(contractors)
    .set({
      username: "mohamed",
      passwordHash: mohamedPassword,
    })
    .where(eq(contractors.email, "mohamed.guizeni@example.com"));
  
  console.log("✓ Mohamed Guizeni:");
  console.log("  Username: mohamed");
  console.log("  Password: mohamed123\n");

  // Set up Marius Andronache
  const mariusPassword = await bcrypt.hash("marius123", 10);
  await db
    .update(contractors)
    .set({
      username: "marius",
      passwordHash: mariusPassword,
    })
    .where(eq(contractors.email, "marius.andronache@example.com"));
  
  console.log("✓ Marius Andronache:");
  console.log("  Username: marius");
  console.log("  Password: marius123\n");

  console.log("Contractor logins set up successfully!");
  process.exit(0);
}

setupContractorLogins().catch((error) => {
  console.error("Error setting up contractor logins:", error);
  process.exit(1);
});
