# AI Context Optimization Architecture

## Overview

This document explains how we've optimized AI features to **avoid pushing all data to prompts** and instead provide only relevant, useful context for AI suggestions and memory features.

## The Problem

With 3,817 LeetCode problems and potentially thousands of user memories, sending all data to AI prompts would:
- Exceed token limits (128K for Gemini, 8K for GPT-3.5)
- Waste money on unnecessary tokens
- Slow down responses
- Dilute the AI's focus

## The Solution: Smart Context Building

### 1. Hierarchical Context System

```
┌─────────────────────────────────────────┐
│           AI Request                     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│       Context Builder (ai-context.ts)    │
│  - Extracts relevant keywords            │
│  - Queries MongoDB for relevant data     │
│  - Builds compact user summary           │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │ User   │ │Relevant│ │Relevant│
   │Summary │ │Memories│ │Problems│
   │(~200   │ │(5 max) │ │(10 max)│
   │tokens) │ │        │ │        │
   └────────┘ └────────┘ └────────┘
        │         │         │
        └─────────┼─────────┘
                  ▼
         Optimized AI Prompt
         (~1,000-2,000 tokens)
```

### 2. Key Components

#### `ai-context.ts` - Smart Context Builder
- **`getUserSummaryForAI()`**: Creates a compact stats summary
  - Total solved count by difficulty
  - Strong/weak topics (top 3 each)
  - Recent activity (last 7 days)
  - ~200 tokens instead of full history

- **`getRelevantMemories()`**: Keyword-based memory retrieval
  - Extracts DSA keywords from query
  - Returns only matching memories (max 5)
  - Falls back to recent memories if no match

- **`getRelevantProblems()`**: Filtered problem suggestions
  - Only unsolved problems
  - Filtered by topic/difficulty if specified
  - Limited sample (10-20 problems)

#### `vector-search.ts` - Semantic Search (Future Enhancement)
- MongoDB Atlas Vector Search support
- Embedding generation (OpenAI/Google)
- Semantic similarity matching
- Falls back to keyword search if unavailable

#### `ai-provider.ts` - Multi-Provider Support
- Works with OpenAI, Google, Anthropic
- Automatic context injection
- Provider-agnostic interface

#### `enhanced-suggestions.ts` - Smart Suggestions
- Uses optimized context
- Database-backed fallbacks
- No AI call needed for quick recommendations

## Data Flow Examples

### Example 1: Problem Suggestion Request

**User asks:** "Suggest problems for dynamic programming"

**Old approach (BAD):**
```
❌ Send all 3,817 problems
❌ Send all user history
❌ ~500K tokens = $$$
```

**New approach (GOOD):**
```
✓ Extract keywords: ["dynamic programming", "dp"]
✓ Get user summary: {totalSolved: 123, weak: ["DP"], strong: ["Array"]}
✓ Get 5 relevant memories about DP
✓ Get 20 unsolved DP problems
✓ Total: ~2,000 tokens
```

### Example 2: Memory Bank Query

**User asks:** "What did I learn about sliding window?"

**Smart retrieval:**
```javascript
const memories = await getRelevantMemories(userId, {
  query: "sliding window",
  maxMemories: 5
});
// Returns only memories containing "sliding window", "window", "two pointer"
// Instead of all 500+ memories
```

## Configuration

### Environment Variables

```env
# AI Provider (pick one)
AI_PROVIDER=genkit  # or openai, google, anthropic

# API Keys
GOOGLE_GENAI_API_KEY=xxx      # For Genkit/Gemini
OPENAI_API_KEY=xxx            # For OpenAI
ANTHROPIC_API_KEY=xxx         # For Claude

# Embeddings (for vector search)
EMBEDDING_PROVIDER=google     # or openai, local
```

### MongoDB Atlas Vector Search Setup

To enable semantic search (optional but recommended):

1. **Create Vector Index** in Atlas UI:
```json
{
  "fields": [{
    "type": "vector",
    "path": "embedding",
    "numDimensions": 768,
    "similarity": "cosine"
  }]
}
```

2. **Generate embeddings** for existing data:
```typescript
import { generateEmbeddingsForCollection } from "@/lib/vector-search";

// Run once to embed memories
await generateEmbeddingsForCollection("memories", 100);
```

## Token Budget Management

| Component | Max Tokens | Purpose |
|-----------|------------|---------|
| System prompt | ~500 | Instructions and guidelines |
| User summary | ~200 | Progress stats |
| Relevant memories | ~500 | Past learnings (5 × 100 each) |
| Problem samples | ~800 | Unsolved problem list (20 problems) |
| User query | ~100 | The actual question |
| **Total input** | **~2,100** | Well under limits |
| Response | ~1,000 | AI output |

## API Compatibility

The system is designed to work with **multiple AI APIs**:

| Provider | Model | Context Limit | Status |
|----------|-------|---------------|--------|
| Google Genkit | gemini-1.5-flash | 1M tokens | ✅ Primary |
| Google Direct | gemini-1.5-pro | 2M tokens | ✅ Supported |
| OpenAI | gpt-4-turbo | 128K tokens | ✅ Supported |
| OpenAI | gpt-3.5-turbo | 16K tokens | ✅ Supported |
| Anthropic | claude-3 | 200K tokens | ✅ Supported |

The context builder outputs **plain text** that works with any API:
```typescript
const context = await buildAIContext(userId, options);
const prompt = formatContextForPrompt(context);
// prompt is a string that works with any AI API
```

## Usage Examples

### Get AI Suggestions (Optimized)
```typescript
import { getEnhancedSuggestions } from "@/lib/enhanced-suggestions";

const result = await getEnhancedSuggestions({
  userId: "user123",
  topic: "Binary Search",
  numberOfProblems: 5
});
// Uses only relevant context, not full database
```

### Quick Recommendations (No AI Call)
```typescript
import { getQuickRecommendations } from "@/lib/enhanced-suggestions";

const { weakTopics, nextDifficulty, focusAreas } = 
  await getQuickRecommendations("user123");
// Pure database query, instant response
```

### Multi-Provider AI Call
```typescript
import { askAI } from "@/lib/ai-provider";

const response = await askAI("user123", "What should I practice next?", {
  provider: "openai",  // or "google", "anthropic"
  includeProgress: true,
  includeMemories: true
});
// Automatically builds optimized context
```

## Benefits

1. **Cost Reduction**: 10-50x fewer tokens per request
2. **Faster Responses**: Less data to process
3. **Better Quality**: AI focuses on relevant information
4. **Scalability**: Works with any database size
5. **Flexibility**: Works with any AI provider
6. **Graceful Fallback**: Works without AI for basic features
