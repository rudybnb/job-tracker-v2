#!/usr/bin/env node
/**
 * Register Telegram Webhook
 * This script registers the direct webhook URL with Telegram API
 */

import 'dotenv/config';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/webhook';

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

console.log('🔧 Registering Telegram webhook...');
console.log('📍 Webhook URL:', WEBHOOK_URL);
console.log('');

async function registerWebhook() {
  try {
    // First, delete any existing webhook
    console.log('1️⃣ Deleting existing webhook...');
    const deleteResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`,
      { method: 'POST' }
    );
    const deleteData = await deleteResponse.json();
    console.log('   Result:', deleteData.ok ? '✅ Deleted' : '⚠️ No existing webhook');
    console.log('');

    // Register new webhook
    console.log('2️⃣ Registering new webhook...');
    const setResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: WEBHOOK_URL })
      }
    );
    const setData = await setResponse.json();
    
    if (setData.ok) {
      console.log('   ✅ Webhook registered successfully!');
      console.log('   Description:', setData.description);
    } else {
      console.log('   ❌ Failed to register webhook');
      console.log('   Error:', setData.description);
      process.exit(1);
    }
    console.log('');

    // Verify webhook info
    console.log('3️⃣ Verifying webhook registration...');
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );
    const infoData = await infoResponse.json();
    
    if (infoData.ok) {
      const info = infoData.result;
      console.log('   ✅ Webhook info:');
      console.log('   URL:', info.url);
      console.log('   Has custom certificate:', info.has_custom_certificate);
      console.log('   Pending updates:', info.pending_update_count);
      if (info.last_error_date) {
        console.log('   ⚠️ Last error:', new Date(info.last_error_date * 1000).toLocaleString());
        console.log('   Error message:', info.last_error_message);
      }
    }
    console.log('');

    console.log('🎉 Done! Your bot is now connected directly to your server.');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Send a test message to your bot');
    console.log('   2. Check server logs for "[Telegram Webhook] Received update:"');
    console.log('   3. Verify you receive a response');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

registerWebhook();
