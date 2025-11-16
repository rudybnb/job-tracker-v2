# Voice Transcription Setup for Telegram Bot

## Overview

Contractors can now send **voice messages** in **any language** to the Telegram bot, and the system will:
1. Automatically transcribe the audio
2. Translate to English
3. Save as a progress report
4. Confirm receipt to the contractor

## Supported Languages

The system supports 99+ languages including:
- **Afrikaans** (af)
- **Zulu** (zu)
- **Xhosa** (xh)
- **Sotho** (st)
- **Portuguese** (pt)
- **French** (fr)
- **Arabic** (ar)
- **Swahili** (sw)
- **English** (en)
- And 90+ more...

## API Endpoints

### 1. Transcribe Voice
```
POST /api/telegram/transcribe-voice
```

**Request Body:**
```json
{
  "audioUrl": "https://api.telegram.org/file/bot<token>/<file_path>",
  "language": "af" // Optional: ISO language code
}
```

**Response:**
```json
{
  "success": true,
  "text": "I completed the plastering in room 2. We used 15 bags of plaster.",
  "language": "af",
  "duration": 12.5,
  "segments": [...]
}
```

### 2. Save Progress Report
```
POST /api/telegram/progress-report
```

**Request Body:**
```json
{
  "chatId": "7617462316",
  "reportText": "Completed plastering in room 2...",
  "originalLanguage": "af",
  "audioUrl": "https://...",
  "photoUrls": ["https://..."]
}
```

## n8n Workflow Integration

### Basic Flow:

1. **Telegram Trigger** → Receives message
2. **Check Message Type** → Voice or Text?
3. **If Voice:**
   - Get file URL from Telegram
   - Call `/api/telegram/transcribe-voice`
   - Save progress report
   - Confirm to contractor
4. **If Text:**
   - Continue with normal query flow

### Implementation Steps:

1. **Add Voice Detection Node** (JavaScript):
```javascript
const message = $input.first().json.message;
const hasVoice = !!message.voice;
const hasPhoto = !!(message.photo && message.photo.length > 0);

return {
  hasVoice,
  hasPhoto,
  chatId: message.chat.id,
  messageText: message.text || message.caption || ''
};
```

2. **Get Telegram File URL** (HTTP Request):
```
GET https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getFile?file_id={{ $json.voice.file_id }}
```

3. **Download Audio** (HTTP Request):
```
GET https://api.telegram.org/file/bot<YOUR_BOT_TOKEN>/{{ $json.result.file_path }}
```

4. **Transcribe** (HTTP Request):
```
POST https://jobtrackr-7pdspyd4.manus.space/api/telegram/transcribe-voice
Body: { "audioUrl": "{{ audio_url }}" }
```

5. **Save Report** (HTTP Request):
```
POST https://jobtrackr-7pdspyd4.manus.space/api/telegram/progress-report
Body: {
  "chatId": "{{ $json.chatId }}",
  "reportText": "{{ $json.text }}",
  "originalLanguage": "{{ $json.language }}",
  "audioUrl": "{{ audio_url }}"
}
```

6. **Confirm** (Telegram Send Message):
```
✅ Progress report saved!

You said: "{{ transcribed_text }}"

Detected language: {{ language_name }}
```

## Testing

### Test Voice Transcription:

1. Send a voice message to the bot in any language
2. Bot should respond with transcription
3. Check database for saved progress report

### Test Commands:

```bash
# Test transcription API directly
curl -X POST https://jobtrackr-7pdspyd4.manus.space/api/telegram/transcribe-voice \
  -H "Content-Type: application/json" \
  -d '{"audioUrl": "https://example.com/audio.mp3"}'
```

## Database Schema

Progress reports are saved in the `progressReports` table with these fields:

- `audioUrl` - S3 URL to voice recording
- `originalLanguage` - ISO language code (e.g., 'af', 'zu', 'pt')
- `transcribedText` - English transcription
- `transcriptionDuration` - Audio duration in seconds
- `notes` - Combined text from transcription
- `photoUrls` - JSON array of photo URLs

## Future Enhancements

1. **Automatic Language Detection** - Don't require language parameter
2. **Photo + Voice Combo** - Send photo with voice description
3. **Material Request Extraction** - Parse "need 10 bags of cement" from voice
4. **Daily Summary** - Auto-generate end-of-day report from voice notes
5. **Admin Dashboard** - View all progress reports with audio playback

## Company Branding

Update the bot's system prompt to say **"Sculpt Projects"** instead of "HBXL construction company":

In the n8n HTTP Request node (GPT-4), change:
```
"You are a helpful assistant for HBXL construction company contractors..."
```

To:
```
"You are a helpful assistant for Sculpt Projects contractors..."
```

## Support

For issues or questions:
- Check n8n execution logs for errors
- Verify audio file is under 16MB
- Ensure contractor has `telegramChatId` set in database
- Test API endpoints directly with curl

---

**Ready to implement!** The backend is complete. Now you just need to update the n8n workflow to handle voice messages.
