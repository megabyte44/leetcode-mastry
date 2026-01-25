"use server";

/**
 * Enhanced AI Suggestions with Optimized Context
 * 
 * This module provides AI suggestions using:
 * - MongoDB-backed user progress data
 * - Vector search for semantic relevance
 * - Smart context building (only sends relevant data)
 * - Multi-provider AI support
 */

import { z } from "zod";
import { buildAIContext, formatContextForPrompt } from "@/lib/ai-context";
import { getDatabase, COLLECTIONS } from "@/lib/mongodb";
import { getUserProgress, getTopicProgress } from "@/lib/progress-actions";

// Input schema with MongoDB user ID
const EnhancedSuggestionInputSchema = z.object({
  userId: z.string().describe("Firebase user ID"),
  topic: z.string().optional().describe("Focus topic"),
  difficulty: z.string().optional().describe("Preferred difficulty"),
  numberOfProblems: z.number().default(5).describe("Number of problems to suggest"),
  additionalContext: z.string().optional().describe("Additional preferences"),
});

export type EnhancedSuggestionInput = z.infer<typeof EnhancedSuggestionInputSchema>;

// Output schema matching existing suggester
const SuggestedProblemSchema = z.object({
  titleSlug: z.string().describe("LeetCode problem slug"),
  title: z.string().describe("Problem title"),
  difficulty: z.string().describe("Problem difficulty"),
  url: z.string().url().describe("Problem URL"),
  topics: z.array(z.string()).describe("Problem topics"),
  reason: z.string().describe("Why this problem is suggested"),
  priorityScore: z.number().optional().describe("Priority score 1-10"),
});

const EnhancedSuggestionOutputSchema = z.object({
  suggestedProblems: z.array(SuggestedProblemSchema),
  analysisInsights: z.string().optional().describe("Brief analysis of user's progress"),
});

export type EnhancedSuggestionOutput = z.infer<typeof EnhancedSuggestionOutputSchema>;

// Get unsolved problems from database, filtered by criteria
async function getUnsolvedProblems(
  userId: string,
  options: { topic?: string; difficulty?: string; limit?: number }
): Promise<any[]> {
  try {
    const db = await getDatabase();
    if (!db) return [];

    // Get user's solved problem slugs
    const solved = await db.collection(COLLECTIONS.SOLVED)
      .find({ userId })
      .project({ titleSlug: 1 })
      .toArray();
    
    const solvedSlugs = new Set(solved.map(s => s.titleSlug));

    // Build query for unsolved problems
    const query: any = {};
    if (options.topic) {
      query.topicTags = options.topic;
    }
    if (options.difficulty) {
      query.difficulty = options.difficulty;
    }

    // Get problems not in solved list
    const problems = await db.collection(COLLECTIONS.PROBLEMS)
      .find(query)
      .limit(options.limit || 100)
      .toArray();

    // Filter out solved problems
    return problems.filter(p => !solvedSlugs.has(p.titleSlug));
  } catch (error) {
    console.error("Failed to get unsolved problems:", error);
    return [];
  }
}

// Build optimized prompt with minimal data
function buildSuggestionPrompt(
  context: ReturnType<typeof formatContextForPrompt>,
  input: EnhancedSuggestionInput,
  unsolvedProblems: any[]
): string {
  // Only include a sample of relevant unsolved problems (not all!)
  const problemSample = unsolvedProblems.slice(0, 20).map(p => ({
    slug: p.titleSlug,
    title: p.title,
    difficulty: p.difficulty,
    topics: (p.topicTags || []).slice(0, 3)
  }));

  return `You are an expert LeetCode problem recommender.

USER PROFILE:
${context}

AVAILABLE UNSOLVED PROBLEMS (sample of ${unsolvedProblems.length}):
${JSON.stringify(problemSample, null, 2)}

REQUEST:
- Suggest ${input.numberOfProblems} problems
${input.topic ? `- Focus on: ${input.topic}` : ""}
${input.difficulty ? `- Preferred difficulty: ${input.difficulty}` : ""}
${input.additionalContext ? `- Additional context: ${input.additionalContext}` : ""}

GUIDELINES:
1. Prioritize topics the user is weak in (see progress above)
2. Consider their recent solving patterns
3. Match difficulty to their success rate
4. Provide clear reasons for each suggestion
5. Select from the available unsolved problems when possible

Return your response in this exact JSON format:
{
  "suggestedProblems": [
    {
      "titleSlug": "two-sum",
      "title": "Two Sum",
      "difficulty": "Easy",
      "url": "https://leetcode.com/problems/two-sum/",
      "topics": ["Array", "Hash Table"],
      "reason": "Fundamental problem for hash map practice, builds foundation",
      "priorityScore": 9
    }
  ],
  "analysisInsights": "Brief 1-2 sentence analysis of what user should focus on"
}`;
}

// Main enhanced suggestion function
export async function getEnhancedSuggestions(
  input: EnhancedSuggestionInput
): Promise<EnhancedSuggestionOutput> {
  try {
    // 1. Build optimized AI context (only relevant data)
    const aiContext = await buildAIContext(input.userId, {
      includeMemories: true,
      includeProblems: true,
      userQuery: input.topic || input.additionalContext
    });
    
    const contextStr = formatContextForPrompt(aiContext);

    // 2. Get filtered unsolved problems
    const unsolvedProblems = await getUnsolvedProblems(input.userId, {
      topic: input.topic,
      difficulty: input.difficulty,
      limit: 50
    });

    // 3. Build optimized prompt
    const prompt = buildSuggestionPrompt(contextStr, input, unsolvedProblems);

    // 4. Call AI (using Google Gemini via environment)
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("No AI API key configured");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "AI request failed");
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    
    // Validate and return
    return EnhancedSuggestionOutputSchema.parse(parsed);

  } catch (error: any) {
    console.error("Enhanced suggestion error:", error);
    
    // Return fallback suggestions based on weak topics
    return await getFallbackSuggestions(input);
  }
}

// Fallback suggestions without AI (based on weak areas)
async function getFallbackSuggestions(
  input: EnhancedSuggestionInput
): Promise<EnhancedSuggestionOutput> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { suggestedProblems: [], analysisInsights: "Unable to connect to database" };
    }

    // Get user's topic progress
    const topicProgressResult = await getTopicProgress(input.userId);
    
    if (!topicProgressResult.success || !topicProgressResult.topics) {
      return { suggestedProblems: [], analysisInsights: "Unable to analyze progress data" };
    }
    
    // Sort by completion percentage (ascending) to find weak topics
    const weakTopics = topicProgressResult.topics
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3)
      .map(t => t.name);

    // Get user's solved problems
    const solved = await db.collection(COLLECTIONS.SOLVED)
      .find({ userId: input.userId })
      .project({ titleSlug: 1 })
      .toArray();
    
    const solvedSlugs = new Set(solved.map(s => s.titleSlug));

    // Query for problems in weak topics
    const query: any = {
      topicTags: { $in: weakTopics }
    };
    
    if (input.difficulty) {
      query.difficulty = input.difficulty;
    }

    const problems = await db.collection(COLLECTIONS.PROBLEMS)
      .find(query)
      .limit(50)
      .toArray();

    // Filter out solved and take required count
    const unsolved = problems
      .filter(p => !solvedSlugs.has(p.titleSlug))
      .slice(0, input.numberOfProblems);

    const suggestedProblems = unsolved.map((p, i) => ({
      titleSlug: p.titleSlug,
      title: p.title,
      difficulty: p.difficulty,
      url: `https://leetcode.com/problems/${p.titleSlug}/`,
      topics: p.topicTags || [],
      reason: `Practice for ${p.topicTags?.[0] || "algorithms"} - one of your areas for improvement`,
      priorityScore: 10 - i
    }));

    return {
      suggestedProblems,
      analysisInsights: `Based on your progress, focus on: ${weakTopics.join(", ")}`
    };
  } catch (error) {
    console.error("Fallback suggestion error:", error);
    return { suggestedProblems: [], analysisInsights: "Error generating suggestions" };
  }
}

// Get quick topic recommendations (lightweight, no AI call)
export async function getQuickRecommendations(userId: string): Promise<{
  weakTopics: string[];
  nextDifficulty: string;
  focusAreas: string[];
}> {
  try {
    const progressResult = await getUserProgress(userId);
    const topicProgressResult = await getTopicProgress(userId);

    if (!progressResult.success || !progressResult.progress) {
      return {
        weakTopics: ["Array", "String", "Hash Table"],
        nextDifficulty: "Easy",
        focusAreas: ["Start with fundamentals"]
      };
    }

    const progress = progressResult.progress;
    const topics = topicProgressResult.success ? topicProgressResult.topics || [] : [];

    // Find weak topics (below 30% completion)
    const weakTopics = topics
      .filter(t => t.percentage < 30 && t.total >= 5)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 5)
      .map(t => t.name);

    // Determine next difficulty based on success rates
    let nextDifficulty = "Easy";
    if (progress.byDifficulty.easy > 50) {
      nextDifficulty = "Medium";
    }
    if (progress.byDifficulty.medium > 100) {
      nextDifficulty = "Hard";
    }

    // Focus areas based on patterns
    const focusAreas: string[] = [];
    if (progress.byDifficulty.hard < 5) {
      focusAreas.push("Start attempting Hard problems");
    }
    if (weakTopics.length > 0) {
      focusAreas.push(`Improve weak topics: ${weakTopics.slice(0, 2).join(", ")}`);
    }
    if (progress.totalSolved < 50) {
      focusAreas.push("Build problem-solving volume");
    }

    return { weakTopics, nextDifficulty, focusAreas };
  } catch (error) {
    console.error("Quick recommendations error:", error);
    return {
      weakTopics: ["Array", "String", "Hash Table"],
      nextDifficulty: "Easy",
      focusAreas: ["Start with fundamentals"]
    };
  }
}