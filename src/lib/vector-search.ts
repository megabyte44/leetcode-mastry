"use server";

import { getDatabase, COLLECTIONS } from "@/lib/mongodb";

/**
 * MongoDB Atlas Vector Search Setup
 * 
 * MongoDB Atlas supports Vector Search which allows:
 * - Store embeddings alongside documents
 * - Perform semantic similarity searches
 * - Find related content without exact keyword matching
 * 
 * Requirements:
 * 1. MongoDB Atlas M10+ cluster (Vector Search requires Atlas)
 * 2. Create Vector Search Index in Atlas UI or via API
 * 
 * Index Definition (create in Atlas):
 * {
 *   "fields": [{
 *     "type": "vector",
 *     "path": "embedding",
 *     "numDimensions": 1536,  // OpenAI embedding size
 *     "similarity": "cosine"
 *   }]
 * }
 */

export interface EmbeddingDocument {
  _id?: string;
  content: string;
  embedding: number[];
  type: "memory" | "problem" | "note";
  metadata: Record<string, any>;
  createdAt: Date;
}

// Supported embedding providers
export type EmbeddingProvider = "openai" | "google" | "local";

interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
}

// Configuration for different providers
const EMBEDDING_CONFIGS: Record<EmbeddingProvider, EmbeddingConfig> = {
  openai: {
    provider: "openai",
    model: "text-embedding-3-small",
    dimensions: 1536
  },
  google: {
    provider: "google",
    model: "text-embedding-004",
    dimensions: 768
  },
  local: {
    provider: "local",
    model: "all-MiniLM-L6-v2",
    dimensions: 384
  }
};

// Get current embedding config
function getEmbeddingConfig(): EmbeddingConfig {
  const provider = (process.env.EMBEDDING_PROVIDER || "openai") as EmbeddingProvider;
  return EMBEDDING_CONFIGS[provider] || EMBEDDING_CONFIGS.openai;
}

// Generate embedding using OpenAI
async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000) // Limit input length
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Generate embedding using Google
async function generateGoogleEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: text.substring(0, 8000) }] }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

// Generate embedding based on configured provider
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const config = getEmbeddingConfig();
    
    switch (config.provider) {
      case "openai":
        return await generateOpenAIEmbedding(text);
      case "google":
        return await generateGoogleEmbedding(text);
      case "local":
        // For local embeddings, we'd need to integrate with a local model
        // This is a placeholder - in production, use a local embedding service
        console.warn("Local embeddings not implemented, falling back to keyword search");
        return null;
      default:
        return null;
    }
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    return null;
  }
}

// Store document with embedding
export async function storeWithEmbedding(
  collection: string,
  document: Record<string, any>,
  textToEmbed: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Generate embedding
    const embedding = await generateEmbedding(textToEmbed);
    
    // Store document (with or without embedding)
    const docToStore = embedding 
      ? { ...document, embedding, embeddedAt: new Date() }
      : document;

    const result = await db.collection(collection).insertOne(docToStore);
    
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error("Failed to store document with embedding:", error);
    return { success: false, error: "Failed to store document" };
  }
}

// Vector similarity search using MongoDB Atlas Vector Search
export async function vectorSearch(
  collection: string,
  query: string,
  options: {
    limit?: number;
    filter?: Record<string, any>;
    minScore?: number;
  } = {}
): Promise<{ success: boolean; results?: any[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const limit = options.limit || 10;
    const minScore = options.minScore || 0.7;

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    if (!queryEmbedding) {
      // Fallback to text search if embedding fails
      return await fallbackTextSearch(collection, query, options);
    }

    // MongoDB Atlas Vector Search aggregation pipeline
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: "vector_index", // Name of your Atlas Vector Search index
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit: limit
        }
      },
      {
        $project: {
          _id: 1,
          content: 1,
          type: 1,
          metadata: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];

    // Add filter if provided
    if (options.filter) {
      pipeline.splice(1, 0, { $match: options.filter });
    }

    // Filter by minimum score
    pipeline.push({
      $match: { score: { $gte: minScore } }
    });

    const results = await db.collection(collection)
      .aggregate(pipeline)
      .toArray();

    return { success: true, results };
  } catch (error: any) {
    // If vector search isn't available, fallback to text search
    if (error.message?.includes("$vectorSearch") || error.codeName === "InvalidPipelineOperator") {
      console.warn("Vector search not available, falling back to text search");
      return await fallbackTextSearch(collection, query, options);
    }
    
    console.error("Vector search failed:", error);
    return { success: false, error: "Search failed" };
  }
}

// Fallback text search when vector search isn't available
async function fallbackTextSearch(
  collection: string,
  query: string,
  options: { limit?: number; filter?: Record<string, any> } = {}
): Promise<{ success: boolean; results?: any[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const limit = options.limit || 10;

    // Extract keywords
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const searchQuery: any = {
      ...options.filter,
      $or: [
        { content: { $regex: keywords.join("|"), $options: "i" } },
        { tags: { $in: keywords } },
        { title: { $regex: keywords.join("|"), $options: "i" } }
      ]
    };

    const results = await db.collection(collection)
      .find(searchQuery)
      .limit(limit)
      .toArray();

    return { success: true, results };
  } catch (error) {
    console.error("Fallback search failed:", error);
    return { success: false, error: "Search failed" };
  }
}

// Semantic search for memories
export async function searchMemoriesSemantic(
  userId: string,
  query: string,
  limit: number = 5
): Promise<{ success: boolean; memories?: any[]; error?: string }> {
  return await vectorSearch(COLLECTIONS.MEMORIES, query, {
    limit,
    filter: { userId }
  });
}

// Find similar problems
export async function findSimilarProblems(
  problemSlug: string,
  limit: number = 5
): Promise<{ success: boolean; problems?: any[]; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Get the source problem
    const sourceProblem = await db.collection(COLLECTIONS.PROBLEMS)
      .findOne({ titleSlug: problemSlug });

    if (!sourceProblem) {
      return { success: false, error: "Problem not found" };
    }

    // Find problems with similar topics
    const similarProblems = await db.collection(COLLECTIONS.PROBLEMS)
      .find({
        titleSlug: { $ne: problemSlug },
        topicTags: { $in: sourceProblem.topicTags || [] },
        difficulty: sourceProblem.difficulty
      })
      .limit(limit)
      .toArray();

    return { success: true, problems: similarProblems };
  } catch (error) {
    console.error("Failed to find similar problems:", error);
    return { success: false, error: "Failed to find similar problems" };
  }
}

// Batch generate embeddings for existing documents
export async function generateEmbeddingsForCollection(
  collection: string,
  batchSize: number = 50
): Promise<{ success: boolean; processed?: number; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Find documents without embeddings
    const documents = await db.collection(collection)
      .find({ embedding: { $exists: false } })
      .limit(batchSize)
      .toArray();

    let processed = 0;

    for (const doc of documents) {
      try {
        const textToEmbed = doc.content || doc.title || JSON.stringify(doc);
        const embedding = await generateEmbedding(textToEmbed);
        
        if (embedding) {
          await db.collection(collection).updateOne(
            { _id: doc._id },
            { $set: { embedding, embeddedAt: new Date() } }
          );
          processed++;
        }

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to embed document ${doc._id}:`, error);
      }
    }

    return { success: true, processed };
  } catch (error) {
    console.error("Failed to generate embeddings:", error);
    return { success: false, error: "Failed to generate embeddings" };
  }
}