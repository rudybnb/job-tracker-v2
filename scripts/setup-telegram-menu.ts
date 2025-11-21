/**
 * Setup Telegram Bot Menu Button
 * Run this script to add the "📝 Report" button to your Telegram bot
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not found in environment variables");
  process.exit(1);
}

async function setupBotMenu() {
  try {
    // Set bot commands (shows in menu when user types /)
    const commands = [
      {
        command: "report",
        description: "📝 Submit a progress report"
      },
      {
        command: "status",
        description: "📊 Check your current assignments"
      },
      {
        command: "help",
        description: "❓ Get help and instructions"
      }
    ];

    const commandsResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands })
      }
    );

    const commandsResult = await commandsResponse.json();
    
    if (commandsResult.ok) {
      console.log("✅ Bot commands set successfully!");
      console.log("Commands:", commands.map(c => `/${c.command}`).join(", "));
    } else {
      console.error("❌ Failed to set commands:", commandsResult);
    }

    // Set custom keyboard with quick action buttons
    // Note: This needs to be sent per-user, not globally
    // We'll document how to do this in the bot responses
    console.log("\n📝 To add the Report button:");
    console.log("1. Users can type /report to start a progress report");
    console.log("2. Or they can type 'report' or '📝 report' as a message");
    console.log("3. The bot will guide them through the 4-step process");

  } catch (error) {
    console.error("❌ Error setting up bot menu:", error);
    process.exit(1);
  }
}

setupBotMenu();
