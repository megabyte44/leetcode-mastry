"use server";

import { getDatabase, COLLECTIONS } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export interface ReviewRecord {
  _id?: ObjectId;
  userId: string;
  questionId: string;
  topicId: string;
  questionTitle: string;
  difficulty: string;
  confidence: number;
  reviewedAt: Date;
  nextReviewDate: Date;
  interval: number; // days until next review
  easeFactor: number; // SM-2 ease factor
}

export interface ReviewStats {
  totalReviews: number;
  averageConfidence: number;
  reviewsToday: number;
  reviewsThisWeek: number;
  streakDays: number;
  masteredCount: number; // confidence >= 4
}

// Record a review
export async function recordReview(
  userId: string,
  questionId: string,
  topicId: string,
  questionTitle: string,
  difficulty: string,
  confidence: number
): Promise<{ success: boolean; nextReviewDate?: Date; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // SM-2 Algorithm calculations
    const previousRecord = await db.collection(COLLECTIONS.REVIEWS).findOne({
      userId,
      questionId,
    }, { sort: { reviewedAt: -1 } });

    let easeFactor = previousRecord?.easeFactor || 2.5;
    let interval = previousRecord?.interval || 1;

    // Adjust ease factor based on confidence (1-5 maps to quality 0-5)
    const quality = confidence;
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Calculate new interval
    if (quality < 3) {
      // Reset for poor performance
      interval = 1;
    } else {
      if (interval === 1) {
        interval = 1;
      } else if (interval <= 6) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    const review: ReviewRecord = {
      userId,
      questionId,
      topicId,
      questionTitle,
      difficulty,
      confidence,
      reviewedAt: new Date(),
      nextReviewDate,
      interval,
      easeFactor,
    };

    await db.collection(COLLECTIONS.REVIEWS).insertOne(review);

    return { success: true, nextReviewDate };
  } catch (error) {
    console.error("Failed to record review:", error);
    return { success: false, error: "Failed to record review" };
  }
}

// Get review stats for a user
export async function getReviewStats(userId: string): Promise<{ success: boolean; stats?: ReviewStats; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Get aggregated stats
    const pipeline = [
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' },
          masteredCount: {
            $sum: { $cond: [{ $gte: ['$confidence', 4] }, 1, 0] }
          },
        }
      }
    ];

    const [aggregateResult] = await db.collection(COLLECTIONS.REVIEWS).aggregate(pipeline).toArray();

    // Count today's reviews
    const reviewsToday = await db.collection(COLLECTIONS.REVIEWS).countDocuments({
      userId,
      reviewedAt: { $gte: todayStart }
    });

    // Count this week's reviews
    const reviewsThisWeek = await db.collection(COLLECTIONS.REVIEWS).countDocuments({
      userId,
      reviewedAt: { $gte: weekStart }
    });

    // Calculate streak (days with at least one review)
    const recentReviews = await db.collection(COLLECTIONS.REVIEWS)
      .find({ userId })
      .sort({ reviewedAt: -1 })
      .limit(100)
      .toArray();

    let streakDays = 0;
    const reviewDates = new Set<string>();
    for (const review of recentReviews) {
      const dateStr = new Date(review.reviewedAt).toDateString();
      reviewDates.add(dateStr);
    }

    // Count consecutive days from today
    const checkDate = new Date();
    while (reviewDates.has(checkDate.toDateString())) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const stats: ReviewStats = {
      totalReviews: aggregateResult?.totalReviews || 0,
      averageConfidence: aggregateResult?.avgConfidence || 0,
      reviewsToday,
      reviewsThisWeek,
      streakDays,
      masteredCount: aggregateResult?.masteredCount || 0,
    };

    return { success: true, stats };
  } catch (error) {
    console.error("Failed to get review stats:", error);
    return { success: false, error: "Failed to get review stats" };
  }
}

// Get questions due for review
export async function getDueReviews(
  userId: string,
  limit: number = 20
): Promise<{ success: boolean; dueQuestions?: { questionId: string; topicId: string; questionTitle: string; difficulty: string; lastConfidence: number; daysSinceReview: number }[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const now = new Date();

    // Get the latest review for each question where nextReviewDate <= now
    const pipeline = [
      { $match: { userId } },
      { $sort: { reviewedAt: -1 } },
      {
        $group: {
          _id: '$questionId',
          topicId: { $first: '$topicId' },
          questionTitle: { $first: '$questionTitle' },
          difficulty: { $first: '$difficulty' },
          lastConfidence: { $first: '$confidence' },
          nextReviewDate: { $first: '$nextReviewDate' },
          lastReviewedAt: { $first: '$reviewedAt' },
        }
      },
      {
        $match: {
          nextReviewDate: { $lte: now }
        }
      },
      { $limit: limit }
    ];

    const results = await db.collection(COLLECTIONS.REVIEWS).aggregate(pipeline).toArray();

    const dueQuestions = results.map(r => ({
      questionId: r._id,
      topicId: r.topicId,
      questionTitle: r.questionTitle,
      difficulty: r.difficulty,
      lastConfidence: r.lastConfidence,
      daysSinceReview: Math.floor((now.getTime() - new Date(r.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    return { success: true, dueQuestions };
  } catch (error) {
    console.error("Failed to get due reviews:", error);
    return { success: false, error: "Failed to get due reviews" };
  }
}

// Get review history for a specific question
export async function getQuestionReviewHistory(
  userId: string,
  questionId: string
): Promise<{ success: boolean; history?: ReviewRecord[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const history = await db.collection(COLLECTIONS.REVIEWS)
      .find({ userId, questionId })
      .sort({ reviewedAt: -1 })
      .limit(10)
      .toArray();

    return { success: true, history: history as ReviewRecord[] };
  } catch (error) {
    console.error("Failed to get question review history:", error);
    return { success: false, error: "Failed to get question review history" };
  }
}
