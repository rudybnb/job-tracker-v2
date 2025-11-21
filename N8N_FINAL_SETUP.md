# n8n Telegram Bot - FINAL Setup Guide (NO PRO PLAN NEEDED!)

## What's Different

This workflow uses the **correct Telegram node configuration** that you already have working:
- **Resource:** File
- **Operation:** Get  
- **Download:** Toggle ON

**No environment variables needed!** This works with the free n8n version.

## Workflow Overview

**8 Nodes Total:**

1. **Telegram Trigger** - Receives messages from contractors
2. **Has Voice?** - Checks if message contains voice
3. **Get Voice File** - Telegram node (Resource: File, Operation: Get, Download: ON)
4. **Transcribe Voice** - OpenAI Whisper transcription
5. **Prepare Voice Data** - Format transcribed data
6. **Prepare Text Data** - Format text message data
7. **Send to Server** - POST to Job Tracker API
8. **Send Response** - Reply to contractor via Telegram

## Step-by-Step Setup

### 1. Import Workflow

1. Open n8n
2. Click **Workflows** → **Import from File**
3. Select `n8n-telegram-bot-FINAL.json`
4. Click **Import**

### 2. Configure Telegram Credentials

You already have "Telegram account 3" set up. Just select it in these nodes:
- Telegram Trigger
- Get Voice File
- Send Response

### 3. Configure OpenAI Credentials

1. Click on **Transcribe Voice** node
2. Under **Credentials**, select your OpenAI credential
3. If you don't have one, create it with your OpenAI API key

### 4. Configure "Get Voice File" Node

This is the critical node! Make sure it's set exactly like this:

- **Credential to connect with:** Telegram account 3
- **Resource:** File
- **Operation:** Get
- **File ID:** `={{$json.message.voice.file_id}}`
- **Download:** Toggle ON (green)

### 5. Test the Workflow

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
Get Voice File (Telegram File Resource)
  Downloads the voice file as binary data
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

### Voice messages not working

**Check the "Get Voice File" node:**
1. Resource must be **File** (not Message)
2. Operation must be **Get**
3. File ID must be `={{$json.message.voice.file_id}}`
4. Download toggle must be **ON** (green)

### Text messages not working

**Check the "Prepare Text Data" node:**
- Should extract `data.message.text`
- Should format chatId as String

### Server not responding

**Check the "Send to Server" node:**
- URL should be: `https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer/api/telegram/handle-message`
- Method should be POST
- Body should be JSON: `={{ JSON.stringify($json) }}`

## Testing Checklist

- [ ] Text message works (receives response)
- [ ] Voice message in English works (transcribes correctly)
- [ ] Voice message in Spanish works (transcribes correctly)
- [ ] Voice message in Creole works (transcribes correctly)
- [ ] AI chatbot responds to questions about jobs
- [ ] "ACCEPT" keyword marks assignments as acknowledged
- [ ] Check-in keywords ("working", "yes") record check-ins

## What the Server Does

When it receives a message, the server:

1. **Checks for "ACCEPT"** → Marks assignment as acknowledged
2. **Checks for check-in keywords** ("working", "yes", "confirmed") → Records check-in
3. **Everything else** → Routes to AI chatbot for natural language queries

## No Pro Plan Needed!

This workflow uses:
- ✅ Telegram node (free)
- ✅ OpenAI node (free, but you need OpenAI API key)
- ✅ HTTP Request node (free)
- ✅ Code node (free)
- ✅ IF node (free)

**Total cost:** $0/month for n8n + OpenAI API usage (pay-as-you-go, very cheap for voice transcription)

## Next Steps

Once the workflow is working:

1. **Test voice messages** in multiple languages
2. **Monitor the execution log** in n8n to see transcriptions
3. **Check the admin dashboard** at `/reminder-logs` to see contractor responses
4. **Add more features** like progress report submission via voice
