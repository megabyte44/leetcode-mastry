import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Support multiple API keys for rate limit handling
// Check for multiple environment variable names for compatibility
function getApiKeys(): string[] {
  const keysString = process.env.GEMINI_API_KEYS || 
                     process.env.GEMINI_API_KEY || 
                     process.env.GOOGLE_GENKIT_API_KEY ||
                     process.env.GOOGLE_API_KEY || 
                     '';
  return keysString.split(',').filter(key => key.trim());
}

const apiKeys = getApiKeys();
let currentKeyIndex = 0;

export function getNextApiKey(): string {
  // Re-read keys at runtime in case they weren't available at module load
  const keys = apiKeys.length > 0 ? apiKeys : getApiKeys();
  
  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured. Please set GEMINI_API_KEY, GEMINI_API_KEYS, GOOGLE_GENKIT_API_KEY, or GOOGLE_API_KEY environment variable.');
  }
  const key = keys[currentKeyIndex].trim();
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return key;
}

export function createAiInstance() {
  const apiKey = getNextApiKey();
  return genkit({
    plugins: [googleAI({ apiKey })],
    model: 'googleai/gemini-2.0-flash',
  });
}

// Default instance - explicitly pass API key if available
const defaultApiKey = getApiKeys()[0];
export const ai = genkit({
  plugins: [googleAI(defaultApiKey ? { apiKey: defaultApiKey } : undefined)],
  model: 'googleai/gemini-2.0-flash',
});
