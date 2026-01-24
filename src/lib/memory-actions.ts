"use server";

import { getDatabase, COLLECTIONS } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { patterns, topicTags } from "@/lib/types";

export type MemoryType = 'insight' | 'mistake' | 'pattern' | 'tip';

export interface MongoMemory {
  _id?: ObjectId;
  userId: string;
  content: string;
  type: MemoryType;
  tags: string[];
  relatedProblems?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

// Extract tags from content based on known patterns and topics
function extractTags(content: string): string[] {
  const foundTags: string[] = [];
  const lowerContent = content.toLowerCase();
  
  // Check for pattern matches
  for (const pattern of patterns) {
    if (lowerContent.includes(pattern.toLowerCase())) {
      foundTags.push(pattern);
    }
  }
  
  // Check for topic matches
  for (const topic of topicTags) {
    if (lowerContent.includes(topic.toLowerCase())) {
      foundTags.push(topic);
    }
  }
  
  return [...new Set(foundTags)].slice(0, 8);
}

// Add a new memory
export async function addMemory(
  userId: string,
  content: string,
  type: MemoryType,
  customTags?: string[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const autoTags = extractTags(content);
    const tags = customTags && customTags.length > 0 ? customTags : autoTags;

    const memory: MongoMemory = {
      userId,
      content,
      type,
      tags,
      createdAt: new Date(),
    };

    const result = await db.collection(COLLECTIONS.MEMORIES).insertOne(memory);
    
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error("Failed to add memory:", error);
    return { success: false, error: "Failed to add memory" };
  }
}

// Get all memories for a user
export async function getMemories(
  userId: string,
  options?: {
    type?: MemoryType;
    tag?: string;
    search?: string;
    limit?: number;
    skip?: number;
  }
): Promise<{ success: boolean; memories?: MongoMemory[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const query: any = { userId };
    
    if (options?.type) {
      query.type = options.type;
    }
    
    if (options?.tag) {
      query.tags = options.tag;
    }
    
    if (options?.search) {
      query.$or = [
        { content: { $regex: options.search, $options: 'i' } },
        { tags: { $regex: options.search, $options: 'i' } },
      ];
    }

    const cursor = db.collection(COLLECTIONS.MEMORIES)
      .find(query)
      .sort({ createdAt: -1 });
    
    if (options?.skip) cursor.skip(options.skip);
    if (options?.limit) cursor.limit(options.limit);

    const memories = await cursor.toArray();
    
    return { 
      success: true, 
      memories: memories.map(m => ({
        ...m,
        _id: m._id,
      })) as MongoMemory[]
    };
  } catch (error) {
    console.error("Failed to get memories:", error);
    return { success: false, error: "Failed to get memories" };
  }
}

// Update a memory
export async function updateMemory(
  userId: string,
  memoryId: string,
  updates: Partial<Pick<MongoMemory, 'content' | 'type' | 'tags'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const result = await db.collection(COLLECTIONS.MEMORIES).updateOne(
      { _id: new ObjectId(memoryId), userId },
      { 
        $set: {
          ...updates,
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Memory not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update memory:", error);
    return { success: false, error: "Failed to update memory" };
  }
}

// Delete a memory
export async function deleteMemory(
  userId: string,
  memoryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const result = await db.collection(COLLECTIONS.MEMORIES).deleteOne({
      _id: new ObjectId(memoryId),
      userId,
    });

    if (result.deletedCount === 0) {
      return { success: false, error: "Memory not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete memory:", error);
    return { success: false, error: "Failed to delete memory" };
  }
}

// Get memory stats for a user
export async function getMemoryStats(
  userId: string
): Promise<{ success: boolean; stats?: Record<MemoryType, number>; total?: number; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const pipeline = [
      { $match: { userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ];

    const results = await db.collection(COLLECTIONS.MEMORIES).aggregate(pipeline).toArray();
    
    const stats: Record<MemoryType, number> = {
      insight: 0,
      mistake: 0,
      pattern: 0,
      tip: 0,
    };
    
    let total = 0;
    for (const result of results) {
      stats[result._id as MemoryType] = result.count;
      total += result.count;
    }

    return { success: true, stats, total };
  } catch (error) {
    console.error("Failed to get memory stats:", error);
    return { success: false, error: "Failed to get memory stats" };
  }
}

// Search memories with relevance (for AI context)
export async function searchRelevantMemories(
  userId: string,
  keywords: string[],
  limit: number = 5
): Promise<{ success: boolean; memories?: MongoMemory[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Create regex patterns for each keyword
    const orConditions = keywords.map(keyword => ({
      $or: [
        { content: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } },
      ]
    }));

    const query: any = {
      userId,
      $or: orConditions,
    };

    const memories = await db.collection(COLLECTIONS.MEMORIES)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return { 
      success: true, 
      memories: memories as MongoMemory[]
    };
  } catch (error) {
    console.error("Failed to search memories:", error);
    return { success: false, error: "Failed to search memories" };
  }
}
