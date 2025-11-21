const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = "8016744652"; // Dalwayn's chat ID

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not found");
  process.exit(1);
}

async function sendTestMessage() {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: "🔔 Test message from Job Tracker!\n\nThis is a test to verify Telegram notifications are working. If you receive this, everything is set up correctly! ✅"
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
        console.log("\n💡 Solution: Dalwayn needs to:");
        console.log("1. Open Telegram");
        console.log("2. Search for your bot");
        console.log("3. Send /start command");
        console.log("4. Then try this script again");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

sendTestMessage();
