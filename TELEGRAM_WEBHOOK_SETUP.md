# Direct Telegram Webhook Setup

This guide will help you register the direct webhook with Telegram, bypassing n8n completely.

## Why Direct Webhook?

**Problem with n8n:** n8n was processing/caching messages before forwarding to the server, causing the same response for different queries.

**Solution:** Direct webhook that:
- Receives messages directly from Telegram
- Immediately returns `{ok: true}` (no timeout)
- Processes messages asynchronously
- Sends responses via Telegram API

## Setup Steps

### 1. Get Your Server URL

Your webhook endpoint is:
```
https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/webhook
```

**Important:** This URL will change if the server restarts. You'll need to update the webhook URL each time.

### 2. Register Webhook with Telegram

**Option A: Use the built-in endpoint (Recommended)**

Open this URL in your browser:
```
https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/set-webhook
```

Then send a POST request with:
```json
{
  "url": "https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/webhook"
}
```

**Option B: Use curl command**

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/webhook"}'
```

Replace `<YOUR_BOT_TOKEN>` with your actual Telegram bot token.

### 3. Verify Webhook Registration

Check webhook status:
```
https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/webhook-info
```

Or use curl:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

You should see:
```json
{
  "ok": true,
  "result": {
    "url": "https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### 4. Test the Webhook

Send a message to your Telegram bot:
- "Did mohamed clock in today"
- "Check marius"
- "Show dalwayne hours"

You should get immediate, contractor-specific responses!

## Message Flow

```
Telegram User
    ↓
Telegram API
    ↓
Your Server (/api/telegram/webhook)
    ↓ (immediately returns {ok: true})
    ↓
Process message asynchronously
    ↓
Unified Handler (/api/telegram/handle-message)
    ↓
- Simple contractor queries → Direct DB query
- Complex queries → AI Chatbot
- Progress reports → Progress handler
    ↓
Send response via Telegram API
    ↓
User receives message
```

## Troubleshooting

### Webhook not receiving messages

1. Check webhook is registered:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

2. Check server logs:
   ```bash
   # Look for "[Telegram Webhook] Received update:"
   ```

3. Verify URL is accessible:
   ```bash
   curl -X POST "https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/webhook" \
     -H "Content-Type: application/json" \
     -d '{"message": {"chat": {"id": 123}, "from": {"first_name": "Test"}, "text": "test"}}'
   ```

### User not receiving responses

1. Check server logs for errors
2. Verify bot token is correct in environment variables
3. Check contractor is registered with correct Telegram chat ID

### Remove webhook (for testing)

```bash
curl -X POST "https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/delete-webhook"
```

Or:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

## Next Steps

Once the webhook is working:

1. **Remove n8n workflow** - No longer needed!
2. **Test all message types:**
   - Text messages with contractor queries
   - Voice messages
   - Progress reports
   - General questions

3. **Monitor logs** to ensure everything works smoothly

## Environment Variables

Make sure these are set in your environment:

- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `DATABASE_URL` - Database connection string
- All other required env vars from `.env`

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify webhook registration with `getWebhookInfo`
3. Test with simple text message first, then voice messages
