/**
 * Test Telegram notification to Rudy
 */

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = "7617462316"; // Rudy's chat ID

const message = `🔔 *Test Notification*\n\nThis is a test message from the Job Tracker system.\n\nIf you receive this, the Telegram integration is working!`;

const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: "Markdown",
  }),
});

const result = await response.json();

console.log("Telegram API Response:");
console.log(JSON.stringify(result, null, 2));

if (result.ok) {
  console.log("\n✅ Test message sent successfully!");
} else {
  console.log("\n❌ Failed to send message:");
  console.log("Error:", result.description);
}
