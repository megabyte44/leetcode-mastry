"use server";

import { getDatabase, COLLECTIONS } from "@/lib/mongodb";

import { ObjectId } from "mongodb";

export interface LeetCodeProblem {
  _id?: ObjectId;
  title: string;
  titleSlug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topicTags: string[];
  problemId?: number;
  importedAt: Date;
}

// GraphQL query to fetch problems from LeetCode
const LEETCODE_GRAPHQL_QUERY = `
  query problemsetQuestionListV2($limit: Int!, $skip: Int!) {
    problemsetQuestionListV2(limit: $limit, skip: $skip) {
      questions {
        title
        titleSlug
        difficulty
        topicTags {
          name
        }
        frontendQuestionId
      }
    }
  }
`;

// Fetch problems from LeetCode API
async function fetchProblemsFromLeetCode(limit: number = 100, skip: number = 0): Promise<LeetCodeProblem[]> {
  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com/problems"
      },
      body: JSON.stringify({
        query: LEETCODE_GRAPHQL_QUERY,
        variables: { limit, skip }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    const questions = data.data?.problemsetQuestionListV2?.questions || [];
    
    return questions.map((q: any) => ({
      title: q.title,
      titleSlug: q.titleSlug,
      difficulty: q.difficulty,
      topicTags: q.topicTags.map((tag: any) => tag.name),
      problemId: q.frontendQuestionId ? parseInt(q.frontendQuestionId) : undefined,
      importedAt: new Date(),
    }));
  } catch (error) {
    console.error("Failed to fetch from LeetCode API:", error);
    throw error;
  }
}

// Import all problems from LeetCode
export async function importLeetCodeProblems(): Promise<{ 
  success: boolean; 
  imported?: number; 
  total?: number; 
  error?: string 
}> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    console.log("Starting LeetCode problems import...");
    
    let allProblems: LeetCodeProblem[] = [];
    let skip = 0;
    const limit = 100;
    let hasMore = true;

    // Fetch all problems in batches
    while (hasMore) {
      console.log(`Fetching batch: skip=${skip}, limit=${limit}`);
      
      const problems = await fetchProblemsFromLeetCode(limit, skip);
      
      if (problems.length === 0) {
        hasMore = false;
      } else {
        allProblems.push(...problems);
        skip += limit;
        
        // Add delay to be respectful to LeetCode servers
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Safety break to prevent infinite loops
      if (skip > 5000) {
        console.warn("Reached safety limit of 5000 problems");
        break;
      }
    }

    console.log(`Fetched ${allProblems.length} problems from LeetCode`);

    // Clear existing problems and insert new ones
    const collection = db.collection(COLLECTIONS.PROBLEMS);
    await collection.deleteMany({});
    
    if (allProblems.length > 0) {
      await collection.insertMany(allProblems as any);
    }

    // Create indexes for better performance
    await collection.createIndex({ titleSlug: 1 }, { unique: true });
    await collection.createIndex({ problemId: 1 });
    await collection.createIndex({ difficulty: 1 });
    await collection.createIndex({ topicTags: 1 });

    console.log("Import completed successfully");

    return { 
      success: true, 
      imported: allProblems.length, 
      total: allProblems.length 
    };
  } catch (error) {
    console.error("Failed to import LeetCode problems:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Import failed" 
    };
  }
}

// Search problems in MongoDB
export async function searchProblems(
  query: string,
  limit: number = 10
): Promise<{ success: boolean; problems?: LeetCodeProblem[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const searchQuery = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { titleSlug: { $regex: query, $options: 'i' } },
        { topicTags: { $regex: query, $options: 'i' } },
      ]
    };

    const problems = await db.collection(COLLECTIONS.PROBLEMS)
      .find(searchQuery)
      .limit(limit)
      .toArray();

    return { success: true, problems: problems as unknown as LeetCodeProblem[] };
  } catch (error) {
    console.error("Failed to search problems:", error);
    return { success: false, error: "Search failed" };
  }
}

// Get problem by slug or ID
export async function getProblem(
  identifier: string | number
): Promise<{ success: boolean; problem?: LeetCodeProblem; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    let query: any;
    
    if (typeof identifier === 'number') {
      query = { problemId: identifier };
    } else if (identifier.includes('-')) {
      query = { titleSlug: identifier };
    } else {
      // Try to parse as number first, then fallback to slug
      const numId = parseInt(identifier);
      if (!isNaN(numId)) {
        query = { problemId: numId };
      } else {
        query = { titleSlug: identifier };
      }
    }

    const problem = await db.collection(COLLECTIONS.PROBLEMS).findOne(query);

    if (!problem) {
      return { success: false, error: "Problem not found" };
    }

    return { success: true, problem: problem as unknown as LeetCodeProblem };
  } catch (error) {
    console.error("Failed to get problem:", error);
    return { success: false, error: "Failed to get problem" };
  }
}

// Get all unique topic tags
export async function getAllTopicTags(): Promise<{ success: boolean; tags?: string[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const tags = await db.collection(COLLECTIONS.PROBLEMS)
      .distinct('topicTags');

    return { success: true, tags: tags.sort() };
  } catch (error) {
    console.error("Failed to get topic tags:", error);
    return { success: false, error: "Failed to get topic tags" };
  }
}

// Get problems count and stats
export async function getProblemsStats(): Promise<{ 
  success: boolean; 
  stats?: { 
    total: number; 
    byDifficulty: Record<string, number>; 
    topTopics: { name: string; count: number }[]; 
  }; 
  error?: string 
}> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Get total count
    const total = await db.collection(COLLECTIONS.PROBLEMS).countDocuments();

    // Get count by difficulty
    const difficultyPipeline = [
      { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ];
    const difficultyResults = await db.collection(COLLECTIONS.PROBLEMS)
      .aggregate(difficultyPipeline).toArray();
    
    const byDifficulty = difficultyResults.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Get top topic tags
    const topicsPipeline = [
      { $unwind: '$topicTags' },
      { $group: { _id: '$topicTags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ];
    const topicsResults = await db.collection(COLLECTIONS.PROBLEMS)
      .aggregate(topicsPipeline).toArray();
    
    const topTopics = topicsResults.map(item => ({
      name: item._id,
      count: item.count
    }));

    return {
      success: true,
      stats: {
        total,
        byDifficulty,
        topTopics,
      }
    };
  } catch (error) {
    console.error("Failed to get problems stats:", error);
    return { success: false, error: "Failed to get problems stats" };
  }
}