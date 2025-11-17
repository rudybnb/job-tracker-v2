import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

try {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log("=== Finding Contractors ===");
  
  // Find Mohamed by Telegram ID
  const [mohamedRows] = await connection.query(
    "SELECT id, firstName, lastName, username FROM contractors WHERE telegramChatId = '5209713845'"
  );
  
  console.log("Mohamed query result:", mohamedRows);
  
  // Find Rudy by Telegram ID
  const [rudyRows] = await connection.query(
    "SELECT id, firstName, lastName, username FROM contractors WHERE telegramChatId = '7617462316'"
  );
  
  console.log("Rudy query result:", rudyRows);
  
  if (mohamedRows.length > 0) {
    const mohamedId = mohamedRows[0].id;
    const mohamedHash = await bcrypt.hash("mohamed123", 10);
    
    await connection.query(
      "UPDATE contractors SET username = ?, passwordHash = ? WHERE id = ?",
      ["mohamed", mohamedHash, mohamedId]
    );
    
    console.log(`✓ Set username 'mohamed' for contractor ID ${mohamedId}`);
  }
  
  if (rudyRows.length > 0) {
    const rudyId = rudyRows[0].id;
    const rudyHash = await bcrypt.hash("rudy123", 10);
    
    await connection.query(
      "UPDATE contractors SET username = ?, passwordHash = ? WHERE id = ?",
      ["rudy", rudyHash, rudyId]
    );
    
    console.log(`✓ Set username 'rudy' for contractor ID ${rudyId}`);
  }
  
  await connection.end();
  console.log("\n✓ Done!");
  
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
