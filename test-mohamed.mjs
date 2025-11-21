import { drizzle } from 'drizzle-orm/mysql2';
import { contractors } from './drizzle/schema.ts';
import { like, or } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Get Mohamed's details
const results = await db.select().from(contractors).where(
  or(
    like(contractors.firstName, '%Mohamed%'),
    like(contractors.firstName, '%Mohammed%')
  )
);

if (results.length === 0) {
  console.log("❌ Mohamed not found in database");
  process.exit(1);
}

const mohamed = results[0];
console.log("Mohamed Details:");
console.log("Name:", mohamed.firstName, mohamed.lastName);
console.log("Chat ID:", mohamed.telegramChatId);

if (!mohamed.telegramChatId) {
  console.log("❌ Mohamed has no Telegram chat ID set");
  process.exit(1);
}

// Send test message
console.log("\nSending test message...");

try {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: mohamed.telegramChatId,
        text: `🔔 Test message for ${mohamed.firstName}!\n\nThis is a test to verify Telegram notifications are working. If you receive this, everything is set up correctly! ✅`
      })
    }
  );

  const result = await response.json();
  
  if (result.ok) {
    console.log("✅ Message sent successfully!");
    console.log("Message ID:", result.result.message_id);
  } else {
    console.error("❌ Failed to send message:");
    console.error(JSON.stringify(result, null, 2));
    
    if (result.error_code === 400 && result.description.includes("chat not found")) {
      console.log(`\n💡 Solution: ${mohamed.firstName} needs to:`);
      console.log("1. Open Telegram");
      console.log("2. Search for your bot");
      console.log("3. Send /start command");
    }
  }
} catch (error) {
  console.error("❌ Error:", error.message);
}
