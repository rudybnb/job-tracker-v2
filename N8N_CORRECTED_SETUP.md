# n8n Telegram Bot - CORRECTED Setup Guide

## What's Fixed

The previous workflow had issues with the "Get Voice File" node because the Telegram node doesn't have a direct file download operation. This corrected workflow uses **HTTP Request nodes** to properly download voice files from Telegram servers.

## Workflow Overview

**9 Nodes Total:**

1. **Telegram Trigger** - Receives messages from contractors
2. **Has Voice?** - Checks if message contains voice
3. **Get File Path** - HTTP Request to get voice file path from Telegram
4. **Download Voice File** - HTTP Request to download the actual voice file
5. **Transcribe Voice** - OpenAI Whisper transcription
6. **Prepare Voice Data** - Format transcribed data
7. **Prepare Text Data** - Format text message data
8. **Send to Server** - POST to Job Tracker API
9. **Send Response** - Reply to contractor via Telegram

## Step-by-Step Setup

### 1. Import Workflow

1. Open n8n
2. Click **Workflows** → **Import from File**
3. Select `n8n-telegram-bot-CORRECTED.json`
4. Click **Import**

### 2. Configure Telegram Credentials

1. Click on **Telegram Trigger** node
2. Under **Credentials**, click the dropdown
3. Select your existing Telegram Bot API credential (or create new one)
4. **Access Token**: Your bot token from @BotFather (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

**Repeat for these nodes:**
- Get File Path
- Download Voice File  
- Send Response

### 3. Configure OpenAI Credentials

1. Click on **Transcribe Voice** node
2. Under **Credentials**, click the dropdown
3. Select your OpenAI API credential (or create new one)
4. **API Key**: Your OpenAI API key (starts with `sk-`)

### 4. Test the Workflow

1. Click **Save** in top right
2. Click **Activate** toggle (should turn green)
3. Send a text message to your Telegram bot
   - Should receive a response
4. Send a voice message to your Telegram bot
   - Should transcribe and respond

## How Voice Processing Works

```
Voice Message Received
  ↓
Has Voice? → YES
  ↓
Get File Path (HTTP Request to Telegram API)
  Returns: { "result": { "file_path": "voice/file_123.oga" } }
  ↓
Download Voice File (HTTP Request)
  Downloads the actual audio file as binary data
  ↓
Transcribe Voice (OpenAI Whisper)
  Converts audio → text
  ↓
Prepare Voice Data
  Formats: { chatId, firstName, messageType: "voice", message: "transcribed text" }
  ↓
Send to Server
  POST to /api/telegram/handle-message
  ↓
Send Response
  Replies to contractor
```

## Troubleshooting

### Error: "Wrong type: '[object Object]' is an object but was expecting a string"

**Fix:** In the "Has Voice?" node, change the condition to:
```
={{ !!$json.message.voice }}
```

This converts the voice object to a boolean (true/false).

### Error: "Not accessible via UI"

**Fix:** In HTTP Request nodes, the credential dropdown should show your Telegram credentials. If not:
1. Make sure you've created Telegram API credentials in n8n
2. The workflow will use `{{ $credentials.telegramApi.accessToken }}` to access your bot token

### Error: "The resource you are requesting could not be found"

**Fix:** Check that the "Get File Path" node is receiving the correct `file_id`:
```
={{ $json.message.voice.file_id }}
```

### Voice transcription returns empty text

**Fix:** Check the "Download Voice File" node:
- Response Format should be **File**
- Binary Property Name should be **data**

## Testing Checklist

- [ ] Text message works (receives response)
- [ ] Voice message in English works (transcribes correctly)
- [ ] Voice message in Spanish works (transcribes correctly)
- [ ] Voice message in Creole works (transcribes correctly)
- [ ] AI chatbot responds to questions about jobs
- [ ] "ACCEPT" keyword marks assignments as acknowledged
- [ ] Check-in keywords ("working", "yes") record check-ins

## API Endpoints Used

- **POST /api/telegram/handle-message** - Main message handler
  - Processes text and transcribed voice messages
  - Routes to AI chatbot, check-in handler, or assignment acknowledgment

## Credentials Required

1. **Telegram Bot API**
   - Get from: @BotFather on Telegram
   - Format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

2. **OpenAI API**
   - Get from: https://platform.openai.com/api-keys
   - Format: `sk-...`

## Next Steps

Once the workflow is working:

1. **Test voice messages** in multiple languages
2. **Monitor the execution log** in n8n to see transcriptions
3. **Check the admin dashboard** at `/reminder-logs` to see contractor responses
4. **Add more features** like progress report submission via voice

## Support

If you encounter issues:
1. Check the n8n execution log (click on workflow execution)
2. Look at the output of each node to see where it fails
3. Verify your credentials are correct
4. Make sure the server URL is accessible from n8n
