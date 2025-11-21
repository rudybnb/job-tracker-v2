/**
 * Test script for language detection and translation
 */
import { detectLanguage, translateText } from './server/_core/translation.ts';

const afrikaansText = "Als ek nou een messie stuur of woordskap, sal dit een Engels envies of een Afrikaans, kom ons kijk hoe lijk het.";

console.log("Testing language detection and translation...\n");
console.log("Original text:", afrikaansText);
console.log("\n--- Step 1: Detect Language ---");

try {
  const detectedLanguage = await detectLanguage(afrikaansText);
  console.log("Detected language:", detectedLanguage);
  
  console.log("\n--- Step 2: Translate to English ---");
  
  const translationResult = await translateText({
    text: afrikaansText,
    sourceLanguage: detectedLanguage,
    targetLanguage: "English"
  });
  
  if ("error" in translationResult) {
    console.error("Translation failed:", translationResult.error);
    console.error("Details:", translationResult.details);
  } else {
    console.log("Translation successful!");
    console.log("Original:", translationResult.originalText);
    console.log("Translated:", translationResult.translatedText);
    console.log("Source language:", translationResult.sourceLanguage);
    console.log("Target language:", translationResult.targetLanguage);
  }
} catch (error) {
  console.error("Test failed:", error);
}
