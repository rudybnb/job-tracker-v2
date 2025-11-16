/**
 * Translation helper using LLM for multi-language support
 */
import { invokeLLM } from "./llm";

export type TranslateOptions = {
  text: string;
  sourceLanguage: string; // e.g., "Afrikaans", "Zulu", "Portuguese"
  targetLanguage?: string; // defaults to "English"
};

export type TranslationResult = {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
};

export type TranslationError = {
  error: string;
  details?: string;
};

/**
 * Translate text from one language to another using LLM
 * 
 * @param options - Translation options
 * @returns Translation result or error
 */
export async function translateText(
  options: TranslateOptions
): Promise<TranslationResult | TranslationError> {
  try {
    const { text, sourceLanguage, targetLanguage = "English" } = options;

    // Skip translation if already in target language
    if (sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage,
        targetLanguage,
      };
    }

    // Use LLM to translate
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text, nothing else.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const translatedText = typeof content === 'string' ? content.trim() : '';

    if (!translatedText) {
      return {
        error: "Translation failed",
        details: "LLM returned empty response",
      };
    }

    return {
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
    };
  } catch (error) {
    return {
      error: "Translation service error",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Helper to get full language name from ISO 639-1 code
 */
export function getLanguageName(langCode: string): string {
  const langMap: Record<string, string> = {
    en: "English",
    af: "Afrikaans",
    zu: "Zulu",
    xh: "Xhosa",
    st: "Sotho",
    tn: "Tswana",
    pt: "Portuguese",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    ru: "Russian",
    ar: "Arabic",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    hi: "Hindi",
    nl: "Dutch",
    pl: "Polish",
    tr: "Turkish",
    sv: "Swedish",
  };

  return langMap[langCode] || langCode;
}
