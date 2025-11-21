# Progress Report Feature - Setup Guide

## Overview

Contractors can now submit detailed progress reports through Telegram using a guided 4-step conversation.

## How It Works

### For Contractors:

1. **Start a Report:**
   - Type `/report` command
   - Or send message: "report" or "📝 report"

2. **Answer 4 Questions:**
   - **Q1:** "What work did you complete today?" (voice or text)
   - **Q2:** "What's your progress percentage? (0-100)"
   - **Q3:** "Any issues or delays?" (say 'none' if fine)
   - **Q4:** "Do you need any materials?" (say 'none' if not)

3. **Confirmation:**
   - Bot saves report to database
   - Admin can review in Progress Reports dashboard

### For Admins:

1. **View Reports:**
   - Go to **Progress Reports** page in admin dashboard
   - Filter by status: Submitted / Reviewed / Approved
   - View contractor name, date, work completed, issues, materials

2. **Review Reports:**
   - Click on any report to view details
   - Add review notes
   - Mark as "Reviewed" or "Approved"

## Technical Details

### Database Schema

**progressReportSessions** table tracks conversation state:
- `chatId`: Telegram chat ID
- `step`: Current conversation step
- `workCompleted`, `progressPercentage`, `issues`, `materials`: Collected data
- `expiresAt`: Session expires after 30 minutes of inactivity

**progressReports** table stores completed reports:
- Links to contractor, assignment, and job
- Stores all collected data
- Status: submitted → reviewed → approved
- Admin can add review notes

### n8n Workflow Integration

Your existing n8n workflow continues to work:
1. Receives all Telegram messages
2. Transcribes voice messages
3. Sends to server: `/api/telegram/handle-message`

### Server-Side Conversation Handler

`server/progressReportConversation.ts`:
- Manages multi-step conversation state
- Handles voice transcription for each answer
- Validates responses (e.g., percentage must be 0-100)
- Saves completed report to database

### Message Routing

`server/telegramUnifiedHandler.ts`:
1. Checks if user has active progress report session
2. If yes → routes to conversation handler
3. If user types "report" → starts new session
4. Otherwise → routes to normal message handling (chatbot, check-ins, etc.)

## Testing Checklist

- [ ] Type `/report` in Telegram → bot asks first question
- [ ] Reply with text → bot asks next question
- [ ] Reply with voice → bot transcribes and asks next question
- [ ] Complete all 4 questions → bot confirms submission
- [ ] Check admin dashboard → report appears in "Submitted" tab
- [ ] Click report → view details
- [ ] Add review notes → mark as "Approved"
- [ ] Verify report status updates

## Troubleshooting

### "No active progress report session"
- Session expired (30 minutes)
- Start a new report with `/report`

### Voice transcription fails
- Check TELEGRAM_BOT_TOKEN is set
- Check OpenAI API key is configured in n8n
- Fallback: contractor can type response instead

### Report not appearing in dashboard
- Check contractor is registered (has telegramChatId)
- Check database connection
- Check server logs for errors

## Future Enhancements

- [ ] Add photo upload support (contractors can send progress photos)
- [ ] Link reports to specific job assignments automatically
- [ ] Send notifications to admin when new report submitted
- [ ] Add "Cancel" command to exit conversation early
- [ ] Support editing submitted reports
- [ ] Add report templates for common tasks
