// Simulate Mohamed sending "Accept" to test the acknowledgment flow

const SERVER_URL = "http://localhost:3000/api/telegram/handle-message";

const testData = {
  chatId: "5209713845", // Mohamed's chat ID
  firstName: "Mohamed",
  messageType: "text",
  message: "Accept"
};

console.log("Testing Mohamed's Accept message...");
console.log("Chat ID:", testData.chatId);
console.log("Message:", testData.message);
console.log("\nSending to server...");

try {
  const response = await fetch(SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testData)
  });

  const result = await response.json();
  
  console.log("\n✅ Server Response:");
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log("\n✅ SUCCESS: Acknowledgment processed!");
  } else {
    console.log("\n❌ FAILED:", result.response);
  }
} catch (error) {
  console.error("\n❌ Error:", error.message);
}
