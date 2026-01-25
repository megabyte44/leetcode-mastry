"use server";

import { getDatabase, COLLECTIONS } from "@/lib/mongodb";
import { getSolvedProblems } from "@/lib/progress-actions";
import { ObjectId } from "mongodb";

/**
 * Smart Review System - Spaced Repetition for LeetCode Problems
 * 
 * Features:
 * - SM-2 Spaced Repetition Algorithm
 * - Adaptive difficulty adjustment
 * - Performance tracking
 * - Review scheduling
 * - Weakness detection
 * - Integration with solved problems
 * 
 * How it works:
 * 1. User marks confidence level (1-5) after solving/reviewing a problem
 * 2. System calculates next review date using SM-2 algorithm
 * 3. Problems with low confidence get reviewed more frequently
 * 4. Problems with high confidence get longer intervals
 * 5. System tracks long-term retention and suggests focus areas
 */

export interface SmartReview {
  _id?: ObjectId;
  id?: string;
  userId: string;
  problemSlug: string;
  problemTitle: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  
  // Review data
  confidence: number; // 1-5 (1=need help, 5=mastered)
  easeFactor: number; // SM-2 ease factor (1.3-2.5)
  interval: number; // Days until next review
  repetitions: number; // Number of times reviewed
  
  // Dates
  createdAt: Date;
  lastReviewedAt: Date;
  nextReviewDate: Date;
  
  // Performance tracking
  totalReviews: number;
  averageConfidence: number;
  masteryLevel: "learning" | "practicing" | "mastered" | "forgotten";
  
  // Notes and insights
  notes?: string;
  mistakePatterns?: string[]; // Common mistakes
  keyInsights?: string[]; // Important learnings
}

export interface ReviewSession {
  id: string;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  problemsReviewed: number;
  averageConfidence: number;
  timeSpent: number; // minutes
  focusTopics: string[];
}

export interface ReviewStats {
  totalProblems: number;
  dueForReview: number;
  masteredCount: number;
  learningCount: number;
  forgottenCount: number;
  streakDays: number;
  avgConfidence: number;
  weeklyProgress: {
    date: string;
    reviewed: number;
    avgConfidence: number;
  }[];
}

// SM-2 Algorithm implementation
function calculateNextReview(
  confidence: number,
  currentInterval: number,
  currentEaseFactor: number,
  repetitions: number
): { interval: number; easeFactor: number; nextDate: Date } {
  let interval = currentInterval;
  let easeFactor = currentEaseFactor;

  // Map confidence (1-5) to quality (0-5) for SM-2
  const quality = confidence;

  // Update ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  // Calculate new interval
  if (quality < 3) {
    // Reset on poor performance
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Calculate next review date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  return { interval, easeFactor, nextDate };
}

// Add a problem to review system
export async function addToReviewSystem(
  userId: string,
  problemSlug: string,
  problemTitle: string,
  difficulty: "Easy" | "Medium" | "Hard",
  topics: string[],
  initialConfidence: number = 3
): Promise<{ success: boolean; reviewId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Check if already exists
    const existing = await db.collection(COLLECTIONS.REVIEWS).findOne({
      userId,
      problemSlug
    });

    if (existing) {
      return { success: false, error: "Problem already in review system" };
    }

    // Calculate initial review schedule
    const { interval, easeFactor, nextDate } = calculateNextReview(
      initialConfidence,
      1,
      2.5,
      0
    );

    const review: SmartReview = {
      userId,
      problemSlug,
      problemTitle,
      difficulty,
      topics,
      confidence: initialConfidence,
      easeFactor,
      interval,
      repetitions: 0,
      createdAt: new Date(),
      lastReviewedAt: new Date(),
      nextReviewDate: nextDate,
      totalReviews: 1,
      averageConfidence: initialConfidence,
      masteryLevel: initialConfidence >= 4 ? "practicing" : "learning"
    };

    const result = await db.collection(COLLECTIONS.REVIEWS).insertOne(review);
    return { success: true, reviewId: result.insertedId.toString() };
  } catch (error) {
    console.error("Failed to add to review system:", error);
    return { success: false, error: "Failed to add to review system" };
  }
}

// Record a review session
export async function recordReview(
  userId: string,
  problemSlug: string,
  confidence: number,
  notes?: string,
  timeSpent?: number
): Promise<{ success: boolean; nextReviewDate?: Date; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const existing = await db.collection(COLLECTIONS.REVIEWS).findOne({
      userId,
      problemSlug
    });

    if (!existing) {
      return { success: false, error: "Problem not found in review system" };
    }

    // Calculate new schedule
    const { interval, easeFactor, nextDate } = calculateNextReview(
      confidence,
      existing.interval,
      existing.easeFactor,
      existing.repetitions
    );

    // Update mastery level
    let masteryLevel: SmartReview["masteryLevel"] = "learning";
    const newAvgConfidence = (existing.averageConfidence * existing.totalReviews + confidence) / (existing.totalReviews + 1);
    
    if (newAvgConfidence >= 4.5 && existing.totalReviews >= 3) {
      masteryLevel = "mastered";
    } else if (newAvgConfidence >= 3.5) {
      masteryLevel = "practicing";
    } else if (confidence < 2 && existing.totalReviews > 1) {
      masteryLevel = "forgotten";
    }

    // Update review record
    const updateData: Partial<SmartReview> = {
      confidence,
      easeFactor,
      interval,
      repetitions: existing.repetitions + 1,
      lastReviewedAt: new Date(),
      nextReviewDate: nextDate,
      totalReviews: existing.totalReviews + 1,
      averageConfidence: newAvgConfidence,
      masteryLevel,
      notes
    };

    await db.collection(COLLECTIONS.REVIEWS).updateOne(
      { userId, problemSlug },
      { $set: updateData }
    );

    return { success: true, nextReviewDate: nextDate };
  } catch (error) {
    console.error("Failed to record review:", error);
    return { success: false, error: "Failed to record review" };
  }
}

// Get problems due for review
export async function getDueForReview(
  userId: string,
  limit: number = 20
): Promise<{ success: boolean; problems?: SmartReview[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const now = new Date();
    
    const problems = await db.collection(COLLECTIONS.REVIEWS)
      .find({
        userId,
        nextReviewDate: { $lte: now },
        masteryLevel: { $ne: "mastered" } // Skip mastered problems
      })
      .sort({
        // Priority: forgotten > learning > practicing
        masteryLevel: 1,
        averageConfidence: 1, // Lower confidence first
        nextReviewDate: 1 // Overdue first
      })
      .limit(limit)
      .toArray();

    const formattedProblems = problems.map(p => ({
      ...p,
      id: p._id?.toString()
    })) as SmartReview[];

    return { success: true, problems: formattedProblems };
  } catch (error) {
    console.error("Failed to get due reviews:", error);
    return { success: false, error: "Failed to get due reviews" };
  }
}

// Get review statistics
export async function getReviewStats(
  userId: string
): Promise<{ success: boolean; stats?: ReviewStats; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Get overall stats
    const totalProblems = await db.collection(COLLECTIONS.REVIEWS).countDocuments({ userId });
    
    const now = new Date();
    const dueForReview = await db.collection(COLLECTIONS.REVIEWS).countDocuments({
      userId,
      nextReviewDate: { $lte: now },
      masteryLevel: { $ne: "mastered" }
    });

    // Get mastery breakdown
    const masteryStats = await db.collection(COLLECTIONS.REVIEWS).aggregate([
      { $match: { userId } },
      { $group: { _id: "$masteryLevel", count: { $sum: 1 } } }
    ]).toArray();

    const masteryBreakdown = {
      mastered: 0,
      practicing: 0,
      learning: 0,
      forgotten: 0
    };

    masteryStats.forEach(stat => {
      if (stat._id in masteryBreakdown) {
        masteryBreakdown[stat._id as keyof typeof masteryBreakdown] = stat.count;
      }
    });

    // Calculate average confidence
    const avgResult = await db.collection(COLLECTIONS.REVIEWS).aggregate([
      { $match: { userId } },
      { $group: { _id: null, avgConfidence: { $avg: "$averageConfidence" } } }
    ]).toArray();

    const avgConfidence = avgResult[0]?.avgConfidence || 0;

    // Calculate streak (days with reviews in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReviews = await db.collection(COLLECTIONS.REVIEWS).aggregate([
      {
        $match: {
          userId,
          lastReviewedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$lastReviewedAt"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]).toArray();

    // Calculate streak
    let streakDays = 0;
    const today = new Date().toISOString().split('T')[0];
    const reviewDates = new Set(recentReviews.map(r => r._id));
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (reviewDates.has(dateStr)) {
        streakDays++;
      } else if (dateStr !== today) {
        // Break streak only if it's not today (allow for not reviewing yet today)
        break;
      }
    }

    // Weekly progress
    const weeklyProgress = recentReviews.slice(0, 7).map(r => ({
      date: r._id,
      reviewed: r.count,
      avgConfidence: 0 // We'd need more complex aggregation for this
    }));

    const stats: ReviewStats = {
      totalProblems,
      dueForReview,
      masteredCount: masteryBreakdown.mastered,
      learningCount: masteryBreakdown.learning,
      forgottenCount: masteryBreakdown.forgotten,
      streakDays,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      weeklyProgress
    };

    return { success: true, stats };
  } catch (error) {
    console.error("Failed to get review stats:", error);
    return { success: false, error: "Failed to get review stats" };
  }
}

// Get weak topics that need more review
export async function getWeakTopics(
  userId: string
): Promise<{ success: boolean; topics?: { topic: string; avgConfidence: number; count: number }[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const weakTopics = await db.collection(COLLECTIONS.REVIEWS).aggregate([
      { $match: { userId, masteryLevel: { $in: ["learning", "forgotten"] } } },
      { $unwind: "$topics" },
      {
        $group: {
          _id: "$topics",
          avgConfidence: { $avg: "$averageConfidence" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gte: 2 } } }, // At least 2 problems
      { $sort: { avgConfidence: 1 } },
      { $limit: 10 }
    ]).toArray();

    const formattedTopics = weakTopics.map(t => ({
      topic: t._id,
      avgConfidence: Math.round(t.avgConfidence * 10) / 10,
      count: t.count
    }));

    return { success: true, topics: formattedTopics };
  } catch (error) {
    console.error("Failed to get weak topics:", error);
    return { success: false, error: "Failed to get weak topics" };
  }
}

// Auto-import solved problems into review system
export async function importSolvedProblemsToReview(
  userId: string
): Promise<{ success: boolean; imported?: number; error?: string }> {
  try {
    const solvedResult = await getSolvedProblems(userId);
    
    if (!solvedResult.success || !solvedResult.problems) {
      return { success: false, error: "Could not get solved problems" };
    }

    let imported = 0;

    for (const problem of solvedResult.problems) {
      const result = await addToReviewSystem(
        userId,
        problem.titleSlug,
        problem.title,
        problem.difficulty as "Easy" | "Medium" | "Hard",
        problem.topicTags || [],
        4 // Assume good confidence for previously solved problems
      );

      if (result.success) {
        imported++;
      }
    }

    return { success: true, imported };
  } catch (error) {
    console.error("Failed to import solved problems:", error);
    return { success: false, error: "Failed to import solved problems" };
  }
}

// Get recommended problems for review (not currently in system)
export async function getRecommendedForReview(
  userId: string,
  limit: number = 10
): Promise<{ success: boolean; problems?: any[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Get problems already in review system
    const inReview = await db.collection(COLLECTIONS.REVIEWS)
      .find({ userId })
      .project({ problemSlug: 1 })
      .toArray();
    
    const reviewedSlugs = new Set(inReview.map(r => r.problemSlug));

    // Get solved problems not in review
    const solvedResult = await getSolvedProblems(userId);
    
    if (!solvedResult.success || !solvedResult.problems) {
      return { success: true, problems: [] };
    }

    // Filter and sort by importance
    const candidates = solvedResult.problems
      .filter(p => !reviewedSlugs.has(p.titleSlug))
      .map(p => ({
        ...p,
        importance: calculateImportance(p.difficulty, p.topicTags || [])
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);

    return { success: true, problems: candidates };
  } catch (error) {
    console.error("Failed to get recommended problems:", error);
    return { success: false, error: "Failed to get recommended problems" };
  }
}

// Calculate importance score for a problem
function calculateImportance(difficulty: string, topics: string[]): number {
  let score = 0;

  // Difficulty multiplier
  switch (difficulty) {
    case "Easy": score += 5; break;
    case "Medium": score += 8; break;
    case "Hard": score += 10; break;
  }

  // Important topics get higher scores
  const importantTopics = [
    "dynamic-programming", "two-pointers", "sliding-window",
    "binary-search", "dfs", "bfs", "backtracking", "tree", "graph"
  ];

  topics.forEach(topic => {
    if (importantTopics.includes(topic.toLowerCase())) {
      score += 3;
    } else {
      score += 1;
    }
  });

  return score;
}