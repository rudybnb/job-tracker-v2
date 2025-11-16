import { drizzle } from "drizzle-orm/mysql2";
import { contractors } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

async function checkMohamed() {
  try {
    // Find Mohamed by ID
    const mohamed = await db.select().from(contractors).where(eq(contractors.id, 90001));
    
    if (mohamed.length > 0) {
      console.log("✅ Mohamed found:");
      console.log("ID:", mohamed[0].id);
      console.log("Username:", mohamed[0].username);
      console.log("First Name:", mohamed[0].firstName);
      console.log("Last Name:", mohamed[0].lastName);
      console.log("Email:", mohamed[0].email);
      console.log("Has Password:", mohamed[0].password ? "Yes" : "No");
      console.log("Password length:", mohamed[0].password?.length || 0);
    } else {
      console.log("❌ Mohamed not found with ID 90001");
    }
    
    // Also check by first name
    const allContractors = await db.select().from(contractors);
    console.log("\n📋 All contractors:");
    allContractors.forEach(c => {
      console.log(`- ID: ${c.id}, Username: ${c.username}, Name: ${c.firstName} ${c.lastName}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

checkMohamed();
