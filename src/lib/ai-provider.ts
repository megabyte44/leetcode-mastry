"use server";

import { buildAIContext, formatContextForPrompt } from "@/lib/ai-context";
import { searchMemoriesSemantic, findSimilarProblems } from "@/lib/vector-search";

/**
 * Multi-Provider AI Interface
 * 
 * Supports:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Google (Gemini Pro, Gemini Flash)
 * - Anthropic (Claude)
 * - Genkit (for structured flows)
 * 
 * Features:
 * - Automatic context optimization (only sends relevant data)
 * - Provider-agnostic interface
 * - Token budget management
 * - Response caching
 */

export type AIProvider = "openai" | "google" | "anthropic" | "genkit";

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AIRequestOptions {
  provider?: AIProvider;
  maxContextTokens?: number;
  includeMemories?: boolean;
  includeProblems?: boolean;
  includeProgress?: boolean;
  temperature?: number;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  provider?: AIProvider;
  tokensUsed?: number;
  error?: string;
}

// Provider configurations
const PROVIDER_CONFIGS: Record<AIProvider, AIProviderConfig> = {
  openai: {
    provider: "openai",
    model: "gpt-4-turbo-preview",
    maxTokens: 4096,
    temperature: 0.7
  },
  google: {
    provider: "google",
    model: "gemini-1.5-flash",
    maxTokens: 4096,
    temperature: 0.7
  },
  anthropic: {
    provider: "anthropic",
    model: "claude-3-sonnet-20240229",
    maxTokens: 4096,
    temperature: 0.7
  },
  genkit: {
    provider: "genkit",
    model: "googleai/gemini-1.5-flash",
    maxTokens: 4096,
    temperature: 0.7
  }
};

// Get active provider from environment
function getActiveProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER as AIProvider;
  return provider && PROVIDER_CONFIGS[provider] ? provider : "genkit";
}

// Build system prompt for LeetCode assistance
export function buildSystemPrompt(context: string): string {
  return `You are an expert coding interview coach helping users master LeetCode problems.

USER CONTEXT (for personalization):
${context}

GUIDELINES:
1. Personalize recommendations based on user's progress and weak areas
2. Suggest problems that match their current skill level
3. Reference their past memories/notes when relevant
4. Provide clear, actionable advice
5. Keep responses focused and practical

When suggesting problems:
- Prioritize topics the user is weak in
- Consider their recent activity
- Match difficulty to their success rate`;
}

// Call OpenAI API
async function callOpenAI(prompt: string, systemPrompt: string, config: AIProviderConfig): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || response.statusText };
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices[0]?.message?.content || "",
      provider: "openai",
      tokensUsed: data.usage?.total_tokens
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Call Google Gemini API
async function callGoogle(prompt: string, systemPrompt: string, config: AIProviderConfig): Promise<AIResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "GOOGLE_AI_API_KEY not configured" };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\nUser: ${prompt}` }]
          }],
          generationConfig: {
            maxOutputTokens: config.maxTokens,
            temperature: config.temperature
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || response.statusText };
    }

    const data = await response.json();
    return {
      success: true,
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
      provider: "google"
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Call Anthropic Claude API
async function callAnthropic(prompt: string, systemPrompt: string, config: AIProviderConfig): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.model,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
        max_tokens: config.maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || response.statusText };
    }

    const data = await response.json();
    return {
      success: true,
      content: data.content?.[0]?.text || "",
      provider: "anthropic",
      tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Main AI request function - works with any provider
export async function askAI(
  userId: string,
  prompt: string,
  options: AIRequestOptions = {}
): Promise<AIResponse> {
  try {
    const provider = options.provider || getActiveProvider();
    const config = { ...PROVIDER_CONFIGS[provider] };
    
    if (options.temperature !== undefined) {
      config.temperature = options.temperature;
    }

    // Build optimized context - only includes relevant data
    const contextOptions = {
      includeMemories: options.includeMemories !== false,
      includeProblems: options.includeProblems !== false,
      userQuery: options.includeMemories !== false ? prompt : undefined
    };

    const context = await buildAIContext(userId, contextOptions);
    const contextStr = formatContextForPrompt(context);
    const systemPrompt = buildSystemPrompt(contextStr);

    // For Genkit, use the existing flow
    if (provider === "genkit") {
      // Use direct Google API call for Genkit compatibility
      // Note: Genkit flows are structured differently, use direct API calls for custom prompts
      return await callGoogle(prompt, systemPrompt, PROVIDER_CONFIGS.google);
    }

    // Call the appropriate provider
    switch (provider) {
      case "openai":
        return await callOpenAI(prompt, systemPrompt, config);
      case "google":
        return await callGoogle(prompt, systemPrompt, config);
      case "anthropic":
        return await callAnthropic(prompt, systemPrompt, config);
      default:
        return { success: false, error: `Unknown provider: ${provider}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Specialized: Get problem suggestions based on user context
export async function suggestProblemsAI(
  userId: string,
  focusArea?: string,
  difficulty?: string,
  count: number = 5
): Promise<AIResponse> {
  const prompt = `Suggest ${count} LeetCode problems for me to practice.
${focusArea ? `Focus area: ${focusArea}` : ""}
${difficulty ? `Difficulty preference: ${difficulty}` : ""}
For each problem, explain why it's a good fit for my current level and areas I need to improve.`;

  return await askAI(userId, prompt, {
    includeProgress: true,
    includeMemories: true,
    includeProblems: true,
    temperature: 0.8
  });
}

// Specialized: Analyze user's weak areas
export async function analyzeWeakAreasAI(userId: string): Promise<AIResponse> {
  const prompt = `Analyze my LeetCode practice data and identify:
1. My weakest topic areas that need improvement
2. Patterns in the types of problems I struggle with
3. Specific skills I should focus on developing
4. A 2-week study plan to address these weaknesses

Be specific and actionable in your recommendations.`;

  return await askAI(userId, prompt, {
    includeProgress: true,
    includeMemories: true,
    includeProblems: false, // Don't need full problem list for analysis
    temperature: 0.6
  });
}

// Specialized: Help with a specific problem
export async function helpWithProblemAI(
  userId: string,
  problemTitle: string,
  problemSlug: string,
  specificQuestion?: string
): Promise<AIResponse> {
  // Find similar problems for context
  const similar = await findSimilarProblems(problemSlug, 3);
  const similarContext = similar.success && similar.problems
    ? `\nSimilar problems you might know: ${similar.problems.map(p => p.title).join(", ")}`
    : "";

  const prompt = `I'm working on the problem "${problemTitle}"${similarContext}

${specificQuestion || "Please help me understand the approach and key concepts for this problem."}

Consider my skill level and past experience when explaining.`;

  return await askAI(userId, prompt, {
    includeProgress: true,
    includeMemories: true, // Might have notes on similar problems
    temperature: 0.5
  });
}

// Specialized: Create study notes from memories
export async function generateStudyNotesAI(
  userId: string,
  topic: string
): Promise<AIResponse> {
  // Search for relevant memories using semantic search
  const memories = await searchMemoriesSemantic(userId, topic, 10);
  const memoriesContext = memories.success && memories.memories
    ? `\n\nRelevant notes you've made:\n${memories.memories.map(m => `- ${m.content}`).join("\n")}`
    : "";

  const prompt = `Create comprehensive study notes for the topic "${topic}"${memoriesContext}

Include:
1. Key concepts and definitions
2. Common patterns and techniques
3. Time/space complexity considerations
4. Tips and tricks I should remember
5. Practice problem recommendations

Base this on my learning history and current skill level.`;

  return await askAI(userId, prompt, {
    includeProgress: true,
    temperature: 0.6
  });
}

// Get available providers (for UI selection)
export async function getAvailableProviders(): Promise<{
  provider: AIProvider;
  name: string;
  available: boolean;
}[]> {
  return [
    { provider: "openai", name: "OpenAI GPT-4", available: !!process.env.OPENAI_API_KEY },
    { provider: "google", name: "Google Gemini", available: !!process.env.GOOGLE_AI_API_KEY },
    { provider: "anthropic", name: "Anthropic Claude", available: !!process.env.ANTHROPIC_API_KEY },
    { provider: "genkit", name: "Genkit (Default)", available: !!process.env.GOOGLE_GENAI_API_KEY }
  ];
}