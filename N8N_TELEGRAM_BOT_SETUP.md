# Telegram Bot Setup with n8n

This document explains how to set up the comprehensive Telegram bot using n8n that handles all contractor interactions.

## Architecture

```
Telegram Message
    ↓
n8n Workflow (Central Router)
    ↓
Voice? → Transcribe → Translate
    ↓
Central AI Router Agent
    ↓
Routes to Sub-Agents:
  • Assignment Agent (ACCEPT acknowledgments)
  • Reminder Agent (morning/evening replies)
  • Query Agent (AI chatbot for questions)
  • Report Agent (progress reports)
    ↓
Send Response to Contractor
```

## Prerequisites

1. **n8n instance** running and accessible
2. **Telegram Bot Token** from @BotFather
3. **Server URL** (your Job Tracker app URL)
4. **OpenAI API Key** (for AI routing and chatbot)

## Setup Steps

### 1. Import Workflow

1. Open your n8n instance
2. Click **"Workflows"** → **"Import from File"**
3. Upload `n8n-telegram-bot-workflow.json`
4. The workflow will be created with all nodes

### 2. Configure Credentials

#### Telegram Bot API
1. In n8n, go to **Credentials** → **Add Credential**
2. Select **"Telegram API"**
3. Name it: `Telegram Bot API`
4. Enter your **Bot Token** from @BotFather
5. Save

#### OpenAI API (for AI Router)
1. Add new credential → **"OpenAI API"**
2. Enter your OpenAI API key
3. Save

### 3. Set Environment Variables

In the workflow, set these variables:

- `SERVER_URL`: Your Job Tracker server URL (e.g., `https://3000-if9ltlqrw1vuwodmn1x4w-b5b3bb23.manusvm.computer`)

You can set this in:
- n8n Settings → Environment Variables
- OR directly in each HTTP Request node

### 4. Activate Workflow

1. Open the imported workflow
2. Click **"Active"** toggle in top-right
3. The Telegram webhook will be automatically registered

### 5. Test the Bot

Send these test messages to your bot:

#### Test Assignment Acknowledgment
```
ACCEPT
```
Expected: Bot confirms assignment acknowledged

#### Test Morning Reminder Reply
```
I'm working today
```
Expected: Bot thanks you and records check-in

#### Test AI Query
```
How many jobs are assigned today?
```
Expected: Bot queries database and responds with job count

#### Test Voice Message
Send a voice message saying: "What's my payment status?"
Expected: Bot transcribes, translates, and responds

## API Endpoints Used

The workflow calls these endpoints on your server:

### 1. `/api/telegram/transcribe-voice` (POST)
- Transcribes voice messages
- Body: `{ fileUrl, chatId }`
- Returns: `{ transcription, translation }`

### 2. `/api/telegram/acknowledge-assignment` (POST)
- Handles "ACCEPT" acknowledgments
- Body: `{ chatId, message }`
- Returns: `{ success, message, assignmentId }`

### 3. `/api/telegram/reminder-reply` (POST)
- Processes morning/evening reminder replies
- Body: `{ chatId, message, messageType }`
- Returns: `{ success, response }`

### 4. `/api/telegram/ai-query` (POST)
- AI chatbot for natural language queries
- Body: `{ chatId, message, firstName }`
- Returns: `{ success, response }`

### 5. `/api/telegram/save-progress-report` (POST)
- Saves contractor progress reports
- Body: `{ chatId, report }`
- Returns: `{ success, message }`

## How It Works

### Central Router Agent

The **Central Router Agent** uses GPT-4 to analyze every incoming message and determine intent:

1. **assignment_acknowledgment** - "ACCEPT", "OK", "Confirmed"
2. **reminder_reply** - Responses to scheduled reminders
3. **query** - Questions about jobs, budgets, payments
4. **progress_report** - Work updates
5. **general** - Greetings, help requests

### Sub-Agents

Each sub-agent is a specialized HTTP Request node that calls your server's API:

- **Assignment Agent**: Updates database when contractor accepts job
- **Reminder Agent**: Records check-in and response to reminders
- **Query Agent**: Uses AI chatbot to answer questions with database access
- **Report Agent**: Saves progress reports to database

### Voice Message Flow

1. Telegram receives voice message
2. n8n downloads voice file
3. Calls `/api/telegram/transcribe-voice` (uses Whisper API)
4. Transcription + translation returned
5. Processed same as text message through Central Router

## Troubleshooting

### Bot Not Responding

1. Check workflow is **Active** in n8n
2. Verify Telegram credentials are correct
3. Check n8n execution logs for errors
4. Ensure `SERVER_URL` environment variable is set correctly

### Voice Messages Not Working

1. Verify `/api/telegram/transcribe-voice` endpoint is accessible
2. Check server logs for transcription errors
3. Ensure Whisper API key is configured in server

### AI Responses Incorrect

1. Check OpenAI API key in n8n credentials
2. Review Central Router Agent prompt in workflow
3. Check server logs for `/api/telegram/ai-query` errors

### Database Queries Failing

1. Verify database connection in server
2. Check contractor is registered (has `telegramChatId`)
3. Review server logs for SQL errors

## Maintenance

### Adding New Intent Categories

1. Edit **Central Router Agent** system prompt
2. Add new case in **Route: Assignment?** switch node
3. Create new HTTP Request node for the sub-agent
4. Connect to **Send Response** node

### Modifying Responses

Edit the response text in:
- Server API endpoints (for database-driven responses)
- **Send Response** node (for static responses)

### Monitoring

Check these regularly:
- n8n execution history (Executions tab)
- Server logs (`/api/telegram/*` endpoints)
- Database `reminderLogs` and `checkIns` tables

## Benefits of This Architecture

✅ **Single Workflow** - Telegram sees one consistent bot
✅ **Central Router** - AI determines intent, no manual routing
✅ **Sub-Agents** - Specialized handlers for each task type
✅ **Voice Support** - Automatic transcription and translation
✅ **Context Aware** - Router maintains conversation context
✅ **Scalable** - Easy to add new intent categories
✅ **Reliable** - Separated from app code, won't break during updates

## Support

If you encounter issues:
1. Check n8n execution logs
2. Review server API logs
3. Verify all credentials are configured
4. Test each endpoint individually with Postman/curl
