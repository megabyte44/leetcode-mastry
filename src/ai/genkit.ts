import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Support multiple API keys for rate limit handling
const apiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').filter(key => key.trim());
let currentKeyIndex = 0;

export function getNextApiKey(): string {
  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured');
  }
  const key = apiKeys[currentKeyIndex].trim();
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}

export function createAiInstance() {
  const apiKey = getNextApiKey();
  return genkit({
    plugins: [googleAI({ apiKey })],
    model: 'googleai/gemini-2.5-flash',
  });
}

// Default instance (will rotate keys on each call via createAiInstance)
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
