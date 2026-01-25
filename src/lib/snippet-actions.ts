"use server";

import { getDatabase, COLLECTIONS } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * Code Snippets MongoDB Actions
 * 
 * Manages user's code snippets with:
 * - MongoDB storage (replacing Firebase)
 * - Smart tagging and categorization
 * - Search and filtering
 * - AI-powered snippet suggestions
 * - Integration with LeetCode problems
 */

export interface CodeSnippet {
  _id?: ObjectId;
  id?: string; // For compatibility
  userId: string;
  title: string;
  description?: string;
  code: string;
  language: ProgrammingLanguage;
  tags: string[];
  relatedProblems: string[]; // Problem slugs
  difficulty?: "Easy" | "Medium" | "Hard";
  category: "algorithm" | "data-structure" | "pattern" | "utility" | "template";
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number; // How often it's been copied/used
  rating?: number; // User's rating 1-5
}

export type ProgrammingLanguage = 
  | "javascript" 
  | "typescript" 
  | "python" 
  | "java" 
  | "cpp" 
  | "go" 
  | "rust" 
  | "csharp";

export interface SnippetFilters {
  language?: ProgrammingLanguage;
  category?: string;
  tags?: string[];
  difficulty?: string;
  search?: string;
}

// Create a new code snippet
export async function createSnippet(
  userId: string,
  snippet: Omit<CodeSnippet, "_id" | "id" | "userId" | "createdAt" | "updatedAt" | "usageCount">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Auto-generate tags from code and title
    const autoTags = await generateAutoTags(snippet.title, snippet.code, snippet.language);
    const allTags = [...new Set([...snippet.tags, ...autoTags])];

    const newSnippet: CodeSnippet = {
      ...snippet,
      userId,
      tags: allTags,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
    };

    const result = await db.collection(COLLECTIONS.SNIPPETS).insertOne(newSnippet);
    
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error("Failed to create snippet:", error);
    return { success: false, error: "Failed to create snippet" };
  }
}

// Get user's snippets with filtering
export async function getUserSnippets(
  userId: string,
  filters: SnippetFilters = {}
): Promise<{ success: boolean; snippets?: CodeSnippet[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Build query
    const query: any = { userId };

    if (filters.language) {
      query.language = filters.language;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    const snippets = await db.collection(COLLECTIONS.SNIPPETS)
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    // Convert ObjectId to string for client
    const formattedSnippets = snippets.map(s => ({
      ...s,
      id: s._id?.toString(),
    })) as CodeSnippet[];

    return { success: true, snippets: formattedSnippets };
  } catch (error) {
    console.error("Failed to get snippets:", error);
    return { success: false, error: "Failed to get snippets" };
  }
}

// Update a snippet
export async function updateSnippet(
  userId: string,
  snippetId: string,
  updates: Partial<CodeSnippet>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Auto-generate tags if code or title changed
    let autoTags: string[] = [];
    if (updates.title || updates.code) {
      const existing = await db.collection(COLLECTIONS.SNIPPETS)
        .findOne({ _id: new ObjectId(snippetId), userId });
      
      if (existing) {
        autoTags = await generateAutoTags(
          updates.title || existing.title,
          updates.code || existing.code,
          updates.language || existing.language
        );
      }
    }

    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };

    if (autoTags.length > 0) {
      updateData.tags = [...new Set([...(updates.tags || []), ...autoTags])];
    }

    const result = await db.collection(COLLECTIONS.SNIPPETS).updateOne(
      { _id: new ObjectId(snippetId), userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Snippet not found or not owned by user" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update snippet:", error);
    return { success: false, error: "Failed to update snippet" };
  }
}

// Delete a snippet
export async function deleteSnippet(
  userId: string,
  snippetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const result = await db.collection(COLLECTIONS.SNIPPETS).deleteOne({
      _id: new ObjectId(snippetId),
      userId
    });

    if (result.deletedCount === 0) {
      return { success: false, error: "Snippet not found or not owned by user" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete snippet:", error);
    return { success: false, error: "Failed to delete snippet" };
  }
}

// Increment usage count
export async function incrementSnippetUsage(
  snippetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    await db.collection(COLLECTIONS.SNIPPETS).updateOne(
      { _id: new ObjectId(snippetId) },
      { $inc: { usageCount: 1 } }
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to increment usage:", error);
    return { success: false, error: "Failed to increment usage" };
  }
}

// Get popular snippets (public ones with high usage)
export async function getPopularSnippets(
  language?: ProgrammingLanguage,
  limit: number = 20
): Promise<{ success: boolean; snippets?: CodeSnippet[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const query: any = { isPublic: true };
    if (language) {
      query.language = language;
    }

    const snippets = await db.collection(COLLECTIONS.SNIPPETS)
      .find(query)
      .sort({ usageCount: -1, rating: -1 })
      .limit(limit)
      .toArray();

    const formattedSnippets = snippets.map(s => ({
      ...s,
      id: s._id?.toString(),
    })) as CodeSnippet[];

    return { success: true, snippets: formattedSnippets };
  } catch (error) {
    console.error("Failed to get popular snippets:", error);
    return { success: false, error: "Failed to get popular snippets" };
  }
}

// Auto-generate tags based on code analysis
async function generateAutoTags(
  title: string,
  code: string,
  language: ProgrammingLanguage
): Promise<string[]> {
  const tags: string[] = [];

  // Common algorithm patterns
  const patterns = [
    { regex: /two.?pointer/i, tag: "two-pointers" },
    { regex: /sliding.?window/i, tag: "sliding-window" },
    { regex: /binary.?search/i, tag: "binary-search" },
    { regex: /depth.?first|dfs/i, tag: "dfs" },
    { regex: /breadth.?first|bfs/i, tag: "bfs" },
    { regex: /dynamic.?programming|dp/i, tag: "dynamic-programming" },
    { regex: /greedy/i, tag: "greedy" },
    { regex: /backtrack/i, tag: "backtracking" },
    { regex: /union.?find/i, tag: "union-find" },
    { regex: /trie/i, tag: "trie" },
    { regex: /heap|priority.?queue/i, tag: "heap" },
    { regex: /stack/i, tag: "stack" },
    { regex: /queue/i, tag: "queue" },
    { regex: /linked.?list/i, tag: "linked-list" },
    { regex: /tree/i, tag: "tree" },
    { regex: /graph/i, tag: "graph" },
    { regex: /sort/i, tag: "sorting" },
    { regex: /hash|map/i, tag: "hash-table" },
    { regex: /array/i, tag: "array" },
    { regex: /string/i, tag: "string" },
    { regex: /matrix/i, tag: "matrix" },
  ];

  const text = `${title} ${code}`.toLowerCase();

  patterns.forEach(({ regex, tag }) => {
    if (regex.test(text)) {
      tags.push(tag);
    }
  });

  // Language-specific patterns
  if (language === "python") {
    if (code.includes("collections.")) tags.push("python-collections");
    if (code.includes("itertools.")) tags.push("python-itertools");
    if (code.includes("heapq.")) tags.push("python-heapq");
  }

  if (language === "javascript" || language === "typescript") {
    if (code.includes(".map(") || code.includes(".filter(")) tags.push("functional-programming");
    if (code.includes("async") || code.includes("await")) tags.push("async");
  }

  // Data structure detection
  if (code.includes("class") || code.includes("struct")) {
    tags.push("data-structure");
  }

  return tags;
}

// Get snippets for a specific problem (by problem slug)
export async function getSnippetsForProblem(
  userId: string,
  problemSlug: string
): Promise<{ success: boolean; snippets?: CodeSnippet[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const snippets = await db.collection(COLLECTIONS.SNIPPETS)
      .find({
        userId,
        relatedProblems: problemSlug
      })
      .sort({ updatedAt: -1 })
      .toArray();

    const formattedSnippets = snippets.map(s => ({
      ...s,
      id: s._id?.toString(),
    })) as CodeSnippet[];

    return { success: true, snippets: formattedSnippets };
  } catch (error) {
    console.error("Failed to get snippets for problem:", error);
    return { success: false, error: "Failed to get snippets for problem" };
  }
}

// Search snippets with advanced text search
export async function searchSnippets(
  userId: string,
  searchQuery: string,
  filters: SnippetFilters = {}
): Promise<{ success: boolean; snippets?: CodeSnippet[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Build aggregation pipeline for advanced search
    const pipeline: any[] = [
      {
        $match: {
          userId,
          $or: [
            { title: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
            { code: { $regex: searchQuery, $options: "i" } },
            { tags: { $in: [new RegExp(searchQuery, "i")] } }
          ]
        }
      },
      {
        $addFields: {
          relevance: {
            $add: [
              { $cond: [{ $regexMatch: { input: "$title", regex: searchQuery, options: "i" } }, 10, 0] },
              { $cond: [{ $regexMatch: { input: "$description", regex: searchQuery, options: "i" } }, 5, 0] },
              { $cond: [{ $in: [new RegExp(searchQuery, "i"), "$tags"] }, 8, 0] },
              { $cond: [{ $regexMatch: { input: "$code", regex: searchQuery, options: "i" } }, 3, 0] }
            ]
          }
        }
      },
      {
        $sort: { relevance: -1, updatedAt: -1 }
      },
      {
        $limit: 30
      }
    ];

    // Add filters
    if (filters.language || filters.category || filters.difficulty) {
      const filterMatch: any = {};
      if (filters.language) filterMatch.language = filters.language;
      if (filters.category) filterMatch.category = filters.category;
      if (filters.difficulty) filterMatch.difficulty = filters.difficulty;
      
      pipeline[0].$match = { ...pipeline[0].$match, ...filterMatch };
    }

    const snippets = await db.collection(COLLECTIONS.SNIPPETS)
      .aggregate(pipeline)
      .toArray();

    const formattedSnippets = snippets.map(s => ({
      ...s,
      id: s._id?.toString(),
    })) as CodeSnippet[];

    return { success: true, snippets: formattedSnippets };
  } catch (error) {
    console.error("Failed to search snippets:", error);
    return { success: false, error: "Failed to search snippets" };
  }
}