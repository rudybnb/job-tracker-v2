# n8n Telegram Bot Setup (Fixed Voice Transcription)

This workflow uses n8n's built-in "Transcribe a recording" node (same as your working progress report workflow) to handle voice messages with automatic translation.

## Workflow Overview

```
Telegram Trigger
  ↓
Has Voice? (IF node)
  ├─ TRUE → Get Voice File → Transcribe Voice → Prepare Voice Data
  └─ FALSE → Prepare Text Data
  ↓
Send to Server (unified handler)
  ↓
Send Response
```

## Setup Steps

### 1. Import Workflow

1. Open n8n
2. Click **"Import from File"**
3. Select `n8n-telegram-bot-fixed.json`
4. Click **"Import"**

### 2. Configure Credentials

You need **2 credentials**:

#### A. Telegram Bot API
1. Click on any **Telegram** node
2. Click **"Create New Credential"**
3. Enter your **Telegram Bot Token** (from @BotFather)
4. Save as **"Telegram Bot API"**

#### B. OpenAI API
1. Click on the **"Transcribe Voice"** node
2. Click **"Create New Credential"**
3. Enter your **OpenAI API Key**
4. Save as **"OpenAI API"**

### 3. Update Server URL

1. Click the **"Send to Server"** node
2. Update the URL to your current server:
   ```
   https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/handle-message
   ```
3. Remove authentication (set to "None")

### 4. Activate Workflow

1. Click the **toggle switch** at the top to activate
2. The workflow is now listening for Telegram messages

## How It Works

### Voice Messages
1. Contractor sends voice message (any language: English, Spanish, Creole, etc.)
2. n8n downloads the voice file from Telegram
3. **n8n's "Transcribe a recording" node** transcribes and translates to English
4. Transcribed text is sent to your server
5. Server analyzes intent and generates response
6. Response sent back to contractor

### Text Messages
1. Contractor sends text message
2. Text is sent directly to your server
3. Server analyzes intent and generates response
4. Response sent back to contractor

## Server Handles

Your server (`/api/telegram/handle-message`) automatically detects and handles:

- ✅ **Assignment acknowledgments** ("ACCEPT", "OK", "Yes")
- ✅ **Morning reminder replies** (check-in confirmations)
- ✅ **Evening reminder replies** (progress updates)
- ✅ **Job queries** ("How many jobs today?", "Who is working?")
- ✅ **Budget queries** ("What's my pay rate?", "What am I owed?")
- ✅ **Work session queries** ("Who worked yesterday?")
- ✅ **General AI chatbot** (any other questions)

## Testing

1. Send a **text message** to your bot: "How many jobs today?"
2. Send a **voice message** in any language: "¿Cuántos trabajos tengo hoy?"
3. Send **"ACCEPT"** to acknowledge an assignment
4. Send a progress update: "Finished painting the first room"

All should work with appropriate responses!

## Troubleshooting

### Voice messages not working
- Check OpenAI API credential is valid
- Ensure "Transcribe Voice" node is using the correct credential
- Check n8n execution logs for transcription errors

### Text messages not working
- Verify server URL is correct and accessible
- Check server logs: `journalctl --user -u job-tracker-v2 -f`
- Ensure contractor is registered in database with correct Telegram chat ID

### No response from bot
- Check workflow is **activated** (toggle switch ON)
- Verify Telegram Bot Token is correct
- Check n8n execution history for errors

## Advantages Over Previous Workflow

1. **Uses proven transcription** - Same "Transcribe a recording" node as your working progress report workflow
2. **Automatic translation** - OpenAI Whisper automatically translates to English
3. **No file URL issues** - n8n handles file download and transcription internally
4. **Simpler architecture** - Only 8 nodes, easy to understand and debug
5. **All logic server-side** - Server code handles all intelligence, n8n just passes messages

## Next Steps

After confirming this works:

1. **Disable the old workflow** to avoid duplicate responses
2. **Test with all contractors** to ensure voice and text work reliably
3. **Monitor server logs** for any errors or issues
4. **Add admin notifications** when contractors report problems or can't work
