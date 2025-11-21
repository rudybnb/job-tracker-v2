const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not found");
  process.exit(1);
}

async function getBotInfo() {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
    );

    const result = await response.json();
    
    if (result.ok) {
      console.log("✅ Bot Information:");
      console.log("━".repeat(50));
      console.log("Bot Name:", result.result.first_name);
      console.log("Bot Username:", `@${result.result.username}`);
      console.log("Bot ID:", result.result.id);
      console.log("━".repeat(50));
      console.log("\n📱 Contractors should search for:");
      console.log(`   @${result.result.username}`);
      console.log("\n💬 Or use this direct link:");
      console.log(`   https://t.me/${result.result.username}`);
    } else {
      console.error("❌ Failed to get bot info:");
      console.error(result);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

getBotInfo();
