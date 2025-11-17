/**
 * Voice transcription helper using internal Speech-to-Text service
 *
 * Frontend implementation guide:
 * 1. Capture audio using MediaRecorder API
 * 2. Upload audio to storage (e.g., S3) to get URL
 * 3. Call transcription with the URL
 * 
 * Example usage:
 * ```tsx
 * // Frontend component
 * const transcribeMutation = trpc.voice.transcribe.useMutation({
 *   onSuccess: (data) => {
 *     console.log(data.text); // Full transcription
 *     console.log(data.language); // Detected language
 *     console.log(data.segments); // Timestamped segments
 *   }
 * });
 * 
 * // After uploading audio to storage
 * transcribeMutation.mutate({
 *   audioUrl: uploadedAudioUrl,
 *   language: 'en', // optional
 *   prompt: 'Transcribe the meeting' // optional
 * });
 * ```
 */
import { ENV } from "./env";

export type TranscribeOptions = {
  audioUrl: string; // URL to the audio file (e.g., S3 URL)
  language?: string; // Optional: specify language code (e.g., "en", "es", "zh")
  prompt?: string; // Optional: custom prompt for the transcription
};

// Native Whisper API segment format
export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

// Native Whisper API response format
export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse; // Return native Whisper API response directly

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

/**
 * Transcribe audio to text using the internal Speech-to-Text service
 * 
 * @param options - Audio data and metadata
 * @returns Transcription result or error
 */
export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    // Step 1: Validate environment configuration
    if (!ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL is not set"
      };
    }
    if (!ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_KEY is not set"
      };
    }

    // Step 2: Download audio from URL
    let audioBuffer: Buffer;
    let mimeType: string;
    try {
      console.log('[Voice Transcription] Downloading audio from:', options.audioUrl);
      const response = await fetch(options.audioUrl);
      if (!response.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get('content-type') || 'audio/mpeg';
      console.log('[Voice Transcription] Downloaded audio - MIME type:', mimeType, 'Size:', audioBuffer.length, 'bytes');
      
      // Check file size (16MB limit)
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }

    // Step 3: Convert OGG to MP3 if needed using ffmpeg
    let finalBuffer = audioBuffer;
    let finalMimeType = mimeType;
    let fileExtension = getFileExtension(mimeType);
    
    // Telegram sends OGG files but with application/octet-stream MIME type
    // Check the URL for .oga or .ogg extension
    const urlLower = options.audioUrl.toLowerCase();
    console.log('[Voice Transcription] Checking URL for OGG:', urlLower);
    console.log('[Voice Transcription] File extension from MIME:', fileExtension);
    const isOggFile = urlLower.includes('.oga') || urlLower.includes('.ogg') || 
                      fileExtension === 'ogg' || mimeType.includes('ogg');
    console.log('[Voice Transcription] Is OGG file?', isOggFile);
    
    if (isOggFile) {
      console.log('[Voice Transcription] Converting OGG to MP3 using ffmpeg...');
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');
        
        // Create temp files
        const tmpDir = os.tmpdir();
        const inputPath = path.join(tmpDir, `input-${Date.now()}.ogg`);
        const outputPath = path.join(tmpDir, `output-${Date.now()}.mp3`);
        
        console.log('[Voice Transcription] Writing OGG file to:', inputPath);
        // Write OGG file
        fs.writeFileSync(inputPath, audioBuffer);
        console.log('[Voice Transcription] OGG file written, size:', fs.statSync(inputPath).size, 'bytes');
        
        // Convert using ffmpeg (suppress output)
        console.log('[Voice Transcription] Running ffmpeg conversion...');
        const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -acodec libmp3lame -ar 16000 "${outputPath}" 2>&1`;
        const { stdout, stderr } = await execAsync(ffmpegCmd);
        console.log('[Voice Transcription] FFmpeg completed');
        
        // Read converted file
        if (!fs.existsSync(outputPath)) {
          throw new Error('FFmpeg did not create output file');
        }
        finalBuffer = fs.readFileSync(outputPath);
        finalMimeType = 'audio/mpeg';
        fileExtension = 'mp3';
        console.log('[Voice Transcription] MP3 file read, size:', finalBuffer.length, 'bytes');
        
        // Clean up temp files
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        
        console.log('[Voice Transcription] OGG to MP3 conversion successful');
      } catch (conversionError) {
        console.error('[Voice Transcription] FFmpeg conversion failed:', conversionError);
        return {
          error: 'Audio conversion failed',
          code: 'INVALID_FORMAT',
          details: conversionError instanceof Error ? conversionError.message : 'FFmpeg conversion error'
        };
      }
    }
    
    // Step 4: Create FormData for multipart upload to Whisper API
    console.log('[Voice Transcription] Creating FormData for Whisper API...');
    console.log('[Voice Transcription] File extension:', fileExtension);
    console.log('[Voice Transcription] MIME type:', finalMimeType);
    console.log('[Voice Transcription] Buffer size:', finalBuffer.length, 'bytes');
    
    const formData = new FormData();
    const filename = `audio.${fileExtension}`;
    const audioBlob = new Blob([new Uint8Array(finalBuffer)], { type: finalMimeType });
    formData.append("file", audioBlob, filename);
    
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    
    // Add prompt - use custom prompt if provided, otherwise generate based on language
    const prompt = options.prompt || (
      options.language 
        ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}`
        : "Transcribe the user's voice to text"
    );
    formData.append("prompt", prompt);
    console.log('[Voice Transcription] FormData prepared with filename:', filename);

    // Step 5: Call the transcription service
    const baseUrl = ENV.forgeApiUrl.endsWith("/")
      ? ENV.forgeApiUrl
      : `${ENV.forgeApiUrl}/`;
    
    const fullUrl = new URL(
      "v1/audio/transcriptions",
      baseUrl
    ).toString();

    console.log('[Voice Transcription] Calling Whisper API at:', fullUrl);
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Accept-Encoding": "identity",
      },
      body: formData,
    });

    console.log('[Voice Transcription] Whisper API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error('[Voice Transcription] Whisper API error:', errorText);
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }

    // Step 6: Parse and return the transcription result
    const whisperResponse = await response.json() as WhisperResponse;
    console.log('[Voice Transcription] Whisper API success! Transcribed text length:', whisperResponse.text?.length || 0);
    
    // Validate response structure
    if (!whisperResponse.text || typeof whisperResponse.text !== 'string') {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }

    return whisperResponse; // Return native Whisper API response directly

  } catch (error) {
    // Handle unexpected errors
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}

/**
 * Helper function to get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/mp4': 'm4a',
  };
  
  return mimeToExt[mimeType] || 'audio';
}

/**
 * Helper function to get full language name from ISO code
 */
function getLanguageName(langCode: string): string {
  const langMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
  };
  
  return langMap[langCode] || langCode;
}

/**
 * Example tRPC procedure implementation:
 * 
 * ```ts
 * // In server/routers.ts
 * import { transcribeAudio } from "./_core/voiceTranscription";
 * 
 * export const voiceRouter = router({
 *   transcribe: protectedProcedure
 *     .input(z.object({
 *       audioUrl: z.string(),
 *       language: z.string().optional(),
 *       prompt: z.string().optional(),
 *     }))
 *     .mutation(async ({ input, ctx }) => {
 *       const result = await transcribeAudio(input);
 *       
 *       // Check if it's an error
 *       if ('error' in result) {
 *         throw new TRPCError({
 *           code: 'BAD_REQUEST',
 *           message: result.error,
 *           cause: result,
 *         });
 *       }
 *       
 *       // Optionally save transcription to database
 *       await db.insert(transcriptions).values({
 *         userId: ctx.user.id,
 *         text: result.text,
 *         duration: result.duration,
 *         language: result.language,
 *         audioUrl: input.audioUrl,
 *         createdAt: new Date(),
 *       });
 *       
 *       return result;
 *     }),
 * });
 * ```
 */
