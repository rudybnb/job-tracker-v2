import { drizzle } from "drizzle-orm/mysql2";
import { contractors } from "./drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const db = drizzle(process.env.DATABASE_URL!);

async function setMohamedCredentials() {
  try {
    const username = "mohamed";
    const password = "mohamed123";
    
    // Generate bcrypt hash
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log("Setting credentials for Mohamed...");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Hash:", hashedPassword);
    
    // Update Mohamed's record
    await db.update(contractors)
      .set({
        username: username,
        password: hashedPassword
      })
      .where(eq(contractors.id, 90001));
    
    console.log("\n✅ Mohamed's credentials updated successfully!");
    
    // Verify the update
    const updated = await db.select().from(contractors).where(eq(contractors.id, 90001));
    if (updated.length > 0) {
      console.log("\n📋 Verified:");
      console.log("Username:", updated[0].username);
      console.log("Has Password:", updated[0].password ? "Yes" : "No");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

setMohamedCredentials();
