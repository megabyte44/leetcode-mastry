"use server";

import { getDatabase, COLLECTIONS } from "@/lib/mongodb";

export interface SolvedProblem {
  _id?: string;
  odId: number;
  title: string;
  titleSlug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  questionFrontendId: string;
  status: string;
  acRate: number;
  paidOnly: boolean;
  solvedAt: Date;
  userId: string;
  topicTags?: string[];
}

export interface UserProgress {
  totalSolved: number;
  byDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  topTopics: { name: string; count: number }[];
  recentlySolved: SolvedProblem[];
  totalProblems: number;
  progressPercentage: number;
}

// Get all solved problems for a user
export async function getSolvedProblems(
  userId: string = "default-user",
  options?: {
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    topic?: string;
    limit?: number;
    skip?: number;
  }
): Promise<{ success: boolean; problems?: SolvedProblem[]; total?: number; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const query: any = { userId };
    
    if (options?.difficulty) {
      query.difficulty = options.difficulty;
    }
    
    if (options?.topic) {
      query.topicTags = options.topic;
    }

    const total = await db.collection("solved").countDocuments(query);
    
    let cursor = db.collection("solved")
      .find(query)
      .sort({ solvedAt: -1 });

    if (options?.skip) {
      cursor = cursor.skip(options.skip);
    }
    
    if (options?.limit) {
      cursor = cursor.limit(options.limit);
    }

    const problems = await cursor.toArray();

    return { 
      success: true, 
      problems: problems as unknown as SolvedProblem[], 
      total 
    };
  } catch (error) {
    console.error("Failed to get solved problems:", error);
    return { success: false, error: "Failed to get solved problems" };
  }
}

// Check if a specific problem is solved
export async function isProblemSolved(
  titleSlug: string,
  userId: string = "default-user"
): Promise<{ success: boolean; solved?: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const problem = await db.collection("solved").findOne({ titleSlug, userId });

    return { success: true, solved: !!problem };
  } catch (error) {
    console.error("Failed to check if problem is solved:", error);
    return { success: false, error: "Failed to check problem status" };
  }
}

// Get user progress statistics
export async function getUserProgress(
  userId: string = "default-user"
): Promise<{ success: boolean; progress?: UserProgress; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Get total solved
    const totalSolved = await db.collection("solved").countDocuments({ userId });

    // Get total problems in database
    const totalProblems = await db.collection(COLLECTIONS.PROBLEMS).countDocuments();

    // Get difficulty breakdown
    const difficultyStats = await db.collection("solved").aggregate([
      { $match: { userId } },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } }
    ]).toArray();

    const byDifficulty = {
      easy: 0,
      medium: 0,
      hard: 0,
    };

    difficultyStats.forEach(stat => {
      if (stat._id === "EASY") byDifficulty.easy = stat.count;
      if (stat._id === "MEDIUM") byDifficulty.medium = stat.count;
      if (stat._id === "HARD") byDifficulty.hard = stat.count;
    });

    // Get top topics
    const topTopics = await db.collection("solved").aggregate([
      { $match: { userId } },
      { $unwind: "$topicTags" },
      { $group: { _id: "$topicTags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Get recently solved
    const recentlySolved = await db.collection("solved")
      .find({ userId })
      .sort({ solvedAt: -1 })
      .limit(5)
      .toArray();

    const progressPercentage = totalProblems > 0 
      ? Math.round((totalSolved / totalProblems) * 100 * 10) / 10 
      : 0;

    return {
      success: true,
      progress: {
        totalSolved,
        byDifficulty,
        topTopics: topTopics.map(t => ({ name: t._id, count: t.count })),
        recentlySolved: recentlySolved as unknown as SolvedProblem[],
        totalProblems,
        progressPercentage,
      }
    };
  } catch (error) {
    console.error("Failed to get user progress:", error);
    return { success: false, error: "Failed to get user progress" };
  }
}

// Get topic-wise progress
export async function getTopicProgress(
  userId: string = "default-user"
): Promise<{ 
  success: boolean; 
  topics?: { 
    name: string; 
    solved: number; 
    total: number; 
    percentage: number;
  }[]; 
  error?: string 
}> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Get all topic counts from problems collection
    const allTopics = await db.collection(COLLECTIONS.PROBLEMS).aggregate([
      { $unwind: "$topicTags" },
      { $group: { _id: "$topicTags", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 20 }
    ]).toArray();

    // Get solved counts per topic
    const solvedTopics = await db.collection("solved").aggregate([
      { $match: { userId } },
      { $unwind: "$topicTags" },
      { $group: { _id: "$topicTags", solved: { $sum: 1 } } }
    ]).toArray();

    const solvedMap = new Map(solvedTopics.map(t => [t._id, t.solved]));

    const topics = allTopics.map(topic => ({
      name: topic._id,
      total: topic.total,
      solved: solvedMap.get(topic._id) || 0,
      percentage: Math.round(((solvedMap.get(topic._id) || 0) / topic.total) * 100)
    }));

    return { success: true, topics };
  } catch (error) {
    console.error("Failed to get topic progress:", error);
    return { success: false, error: "Failed to get topic progress" };
  }
}

// Mark a problem as solved (for manual tracking)
export async function markProblemSolved(
  titleSlug: string,
  userId: string = "default-user"
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Get problem details from problems collection
    const problem = await db.collection(COLLECTIONS.PROBLEMS).findOne({ titleSlug });
    
    if (!problem) {
      return { success: false, error: "Problem not found" };
    }

    // Insert or update solved record
    await db.collection("solved").updateOne(
      { titleSlug, userId },
      {
        $set: {
          odId: problem.problemId,
          title: problem.title,
          titleSlug: problem.titleSlug,
          difficulty: problem.difficulty,
          questionFrontendId: String(problem.problemId),
          status: "SOLVED",
          topicTags: problem.topicTags,
          solvedAt: new Date(),
          userId,
        }
      },
      { upsert: true }
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to mark problem as solved:", error);
    return { success: false, error: "Failed to mark problem as solved" };
  }
}

// Unmark a problem (remove from solved)
export async function unmarkProblemSolved(
  titleSlug: string,
  userId: string = "default-user"
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    await db.collection("solved").deleteOne({ titleSlug, userId });

    return { success: true };
  } catch (error) {
    console.error("Failed to unmark problem:", error);
    return { success: false, error: "Failed to unmark problem" };
  }
}