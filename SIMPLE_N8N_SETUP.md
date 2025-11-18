# Simple Telegram Bot Setup (n8n)

**Much easier to configure!** This workflow has only 6 nodes and requires minimal configuration.

## What This Does

- Receives Telegram messages (text + voice)
- Transcribes voice messages automatically
- Routes ALL logic to your server (no complex n8n routing)
- Handles:
  - Assignment acknowledgments ("ACCEPT")
  - Morning/evening reminder replies
  - Progress reports
  - AI chatbot queries
  - Voice messages with translation

## Setup Steps

### 1. Import Workflow

1. Download `n8n-telegram-bot-simple.json`
2. In n8n: **Workflows** → **Import from File**
3. Select the JSON file

### 2. Configure Telegram Credentials

1. In n8n, go to **Credentials**
2. Add **Telegram API** credential
3. Enter your bot token from @BotFather
4. Save

### 3. Set Server URL

In n8n, set environment variable:
- **Variable**: `SERVER_URL`
- **Value**: Your server URL (e.g., `https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer`)

OR manually edit these 2 nodes:
- **Process Voice Message** node → URL field
- **Process Text Message** node → URL field

Change `{{$env.SERVER_URL}}` to your actual server URL.

### 4. Update Telegram Credentials in Workflow

Open each of these 3 nodes and select your Telegram credential:
- **Telegram Trigger**
- **Get Voice File**
- **Send Response**

### 5. Activate Workflow

Click **Active** toggle in top-right corner.

## Done! 🎉

That's it! The workflow is ready. All the intelligence is in your server code, so the n8n workflow is just a simple messenger.

## How It Works

```
Telegram Message
    ↓
Has Voice? (IF node)
    ├─ YES → Get Voice File → Process Voice Message
    └─ NO  → Process Text Message
    ↓
Your Server (/api/telegram/handle-message)
    ├─ Transcribes voice (if needed)
    ├─ Analyzes intent (ACCEPT, reminder, query, report)
    ├─ Checks database
    ├─ Generates response
    └─ Returns response text
    ↓
Send Response (Telegram)
```

## Testing

Send these messages to your bot:

1. **"ACCEPT"** → Should acknowledge assignment
2. **"How many jobs today?"** → Should query database
3. **Voice message** → Should transcribe and respond
4. **"I'm working"** → Should record check-in

## Troubleshooting

**Bot not responding?**
- Check workflow is Active
- Verify Telegram credentials are correct
- Check `SERVER_URL` is set correctly

**Voice messages not working?**
- Verify server is running
- Check server logs for transcription errors

**Wrong responses?**
- Check server logs at `/api/telegram/handle-message`
- Verify contractor is registered in database

## Advantages

✅ **Simple** - Only 6 nodes, easy to understand
✅ **No AI routing in n8n** - All logic in your server
✅ **Easy to debug** - Check server logs for issues
✅ **Won't break** - Minimal n8n configuration
✅ **Flexible** - Change logic in server code, not n8n

## Server Endpoint

The workflow calls: `POST /api/telegram/handle-message`

Request body:
```json
{
  "chatId": "123456789",
  "firstName": "Mohamed",
  "messageType": "text",
  "message": "How many jobs today?"
}
```

OR for voice:
```json
{
  "chatId": "123456789",
  "firstName": "Mohamed",
  "messageType": "voice",
  "voiceFileUrl": "https://api.telegram.org/file/..."
}
```

Response:
```json
{
  "success": true,
  "response": "You have 2 jobs assigned today."
}
```

The server automatically:
- Identifies contractor by chatId
- Transcribes voice messages
- Determines intent (ACCEPT, reminder, query, report)
- Queries database
- Generates appropriate response
- Returns text to send back

## Support

If you have issues, check:
1. n8n execution logs (Executions tab)
2. Server logs (`/api/telegram/handle-message`)
3. Database contractor records (verify telegramChatId)
