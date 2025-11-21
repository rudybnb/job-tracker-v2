#!/usr/bin/env node
/**
 * Test webhook endpoint locally
 */

const testUpdate = {
  update_id: 123456789,
  message: {
    message_id: 1,
    from: {
      id: 123456,
      is_bot: false,
      first_name: "Test",
      username: "testuser"
    },
    chat: {
      id: "123456",
      first_name: "Test",
      type: "private"
    },
    date: Math.floor(Date.now() / 1000),
    text: "test message"
  }
};

console.log("Testing webhook endpoint...");
console.log("Sending test update:", JSON.stringify(testUpdate, null, 2));

try {
  const response = await fetch("http://localhost:3000/api/telegram/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testUpdate)
  });
  
  const result = await response.json();
  console.log("\nResponse status:", response.status);
  console.log("Response body:", JSON.stringify(result, null, 2));
  
  console.log("\n✅ Webhook endpoint is accessible");
  console.log("Check server logs for processing details");
} catch (error) {
  console.error("\n❌ Error calling webhook:", error.message);
}
