"use server";

import { getDatabase, COLLECTIONS } from "@/lib/mongodb";

/**
 * AI Context Builder - Provides only relevant data to AI models
 * Uses vector search and smart filtering to minimize token usage
 */

export interface AIContext {
  userSummary: {
    totalSolved: number;
    byDifficulty: { easy: number; medium: number; hard: number };
    strongTopics: string[];
    weakTopics: string[];
    recentActivity: string[];
  };
  relevantMemories: {
    content: string;
    type: string;
    tags: string[];
  }[];
  relevantProblems: {
    title: string;
    difficulty: string;
    topics: string[];
    solved: boolean;
  }[];
  currentTopic?: string;
}

// Get compact user summary for AI context
export async function getUserSummaryForAI(
  userId: string = "default-user"
): Promise<AIContext["userSummary"] | null> {
  try {
    const db = await getDatabase();
    if (!db) return null;

    // Get solved count by difficulty
    const difficultyStats = await db.collection("solved").aggregate([
      { $match: { userId } },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } }
    ]).toArray();

    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    difficultyStats.forEach(s => {
      if (s._id === "EASY") byDifficulty.easy = s.count;
      if (s._id === "MEDIUM") byDifficulty.medium = s.count;
      if (s._id === "HARD") byDifficulty.hard = s.count;
    });

    const totalSolved = byDifficulty.easy + byDifficulty.medium + byDifficulty.hard;

    // Get topic strengths (topics with most solved)
    const topicStats = await db.collection("solved").aggregate([
      { $match: { userId } },
      { $unwind: "$topicTags" },
      { $group: { _id: "$topicTags", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    const strongTopics = topicStats.slice(0, 5).map(t => t._id);
    
    // Find weak topics (topics with low solve rate)
    const allTopicCounts = await db.collection(COLLECTIONS.PROBLEMS).aggregate([
      { $unwind: "$topicTags" },
      { $group: { _id: "$topicTags", total: { $sum: 1 } } }
    ]).toArray();

    const topicMap = new Map(topicStats.map(t => [t._id, t.count]));
    const weakTopics = allTopicCounts
      .filter(t => t.total >= 50) // Only consider significant topics
      .map(t => ({
        name: t._id,
        solved: topicMap.get(t._id) || 0,
        total: t.total,
        rate: ((topicMap.get(t._id) || 0) / t.total) * 100
      }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5)
      .map(t => t.name);

    // Get recent activity (last 5 solved)
    const recentSolved = await db.collection("solved")
      .find({ userId })
      .sort({ solvedAt: -1 })
      .limit(5)
      .toArray();

    const recentActivity = recentSolved.map(p => 
      `${p.title} (${p.difficulty})`
    );

    return {
      totalSolved,
      byDifficulty,
      strongTopics,
      weakTopics,
      recentActivity
    };
  } catch (error) {
    console.error("Failed to get user summary:", error);
    return null;
  }
}

// Get relevant memories using keyword matching (will upgrade to vector search)
export async function getRelevantMemories(
  userId: string = "default-user",
  context: string,
  limit: number = 5
): Promise<AIContext["relevantMemories"]> {
  try {
    const db = await getDatabase();
    if (!db) return [];

    // Extract keywords from context
    const keywords = extractKeywords(context);
    
    if (keywords.length === 0) {
      // Return recent memories if no keywords
      const recent = await db.collection(COLLECTIONS.MEMORIES)
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return recent.map(m => ({
        content: m.content.substring(0, 200), // Truncate for token efficiency
        type: m.type,
        tags: m.tags || []
      }));
    }

    // Search memories by keywords in content or tags
    const query = {
      userId,
      $or: [
        { content: { $regex: keywords.join("|"), $options: "i" } },
        { tags: { $in: keywords } }
      ]
    };

    const memories = await db.collection(COLLECTIONS.MEMORIES)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return memories.map(m => ({
      content: m.content.substring(0, 200),
      type: m.type,
      tags: m.tags || []
    }));
  } catch (error) {
    console.error("Failed to get relevant memories:", error);
    return [];
  }
}

// Get relevant problems for suggestions
export async function getRelevantProblems(
  userId: string = "default-user",
  options: {
    topic?: string;
    difficulty?: string;
    forPractice?: boolean; // Get unsolved problems
    limit?: number;
  } = {}
): Promise<AIContext["relevantProblems"]> {
  try {
    const db = await getDatabase();
    if (!db) return [];

    const limit = options.limit || 10;

    // Get user's solved problem slugs
    const solvedProblems = await db.collection("solved")
      .find({ userId })
      .project({ titleSlug: 1 })
      .toArray();
    
    const solvedSlugs = new Set(solvedProblems.map(p => p.titleSlug));

    // Build query for problems
    const query: any = {};
    
    if (options.topic) {
      query.topicTags = options.topic;
    }
    
    if (options.difficulty) {
      query.difficulty = options.difficulty.toUpperCase();
    }

    // Get problems
    let problems = await db.collection(COLLECTIONS.PROBLEMS)
      .find(query)
      .limit(options.forPractice ? limit * 3 : limit) // Get more if filtering unsolved
      .toArray();

    // Filter unsolved if requested
    if (options.forPractice) {
      problems = problems.filter(p => !solvedSlugs.has(p.titleSlug));
    }

    return problems.slice(0, limit).map(p => ({
      title: p.title,
      difficulty: p.difficulty,
      topics: (p.topicTags || []).slice(0, 3), // Limit topics for token efficiency
      solved: solvedSlugs.has(p.titleSlug)
    }));
  } catch (error) {
    console.error("Failed to get relevant problems:", error);
    return [];
  }
}

// Build optimized AI context
export async function buildAIContext(
  userId: string = "default-user",
  options: {
    includeMemories?: boolean;
    includeProblems?: boolean;
    topic?: string;
    userQuery?: string;
  } = {}
): Promise<AIContext> {
  const [userSummary, memories, problems] = await Promise.all([
    getUserSummaryForAI(userId),
    options.includeMemories && options.userQuery
      ? getRelevantMemories(userId, options.userQuery, 5)
      : Promise.resolve([]),
    options.includeProblems
      ? getRelevantProblems(userId, { 
          topic: options.topic, 
          forPractice: true, 
          limit: 10 
        })
      : Promise.resolve([])
  ]);

  return {
    userSummary: userSummary || {
      totalSolved: 0,
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      strongTopics: [],
      weakTopics: [],
      recentActivity: []
    },
    relevantMemories: memories,
    relevantProblems: problems,
    currentTopic: options.topic
  };
}

// Helper: Extract keywords from text
function extractKeywords(text: string): string[] {
  // Common DSA terms to look for
  const dsaTerms = [
    "array", "string", "hash", "map", "set", "tree", "graph", "linked list",
    "stack", "queue", "heap", "binary search", "dfs", "bfs", "dp", "dynamic programming",
    "recursion", "backtracking", "greedy", "two pointer", "sliding window",
    "sort", "search", "matrix", "trie", "segment tree", "union find"
  ];

  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const term of dsaTerms) {
    if (lowerText.includes(term)) {
      found.push(term);
    }
  }

  // Also extract capitalized words that might be problem names
  const words = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  
  return [...new Set([...found, ...words.map(w => w.toLowerCase())])];
}

// Format context as compact prompt
export function formatContextForPrompt(context: AIContext): string {
  const lines: string[] = [];

  // User summary (compact)
  lines.push(`## User Profile`);
  lines.push(`- Solved: ${context.userSummary.totalSolved} (E:${context.userSummary.byDifficulty.easy} M:${context.userSummary.byDifficulty.medium} H:${context.userSummary.byDifficulty.hard})`);
  
  if (context.userSummary.strongTopics.length > 0) {
    lines.push(`- Strong: ${context.userSummary.strongTopics.join(", ")}`);
  }
  
  if (context.userSummary.weakTopics.length > 0) {
    lines.push(`- Needs Practice: ${context.userSummary.weakTopics.join(", ")}`);
  }

  // Relevant memories (if any)
  if (context.relevantMemories.length > 0) {
    lines.push(`\n## User Notes`);
    context.relevantMemories.forEach(m => {
      lines.push(`- [${m.type}] ${m.content}`);
    });
  }

  // Suggested problems (if any)
  if (context.relevantProblems.length > 0) {
    lines.push(`\n## Relevant Problems`);
    context.relevantProblems.forEach(p => {
      const status = p.solved ? "✓" : "○";
      lines.push(`- ${status} ${p.title} (${p.difficulty}) [${p.topics.join(", ")}]`);
    });
  }

  return lines.join("\n");
}