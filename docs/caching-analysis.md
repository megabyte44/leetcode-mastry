# Caching Strategy Analysis for LeetCode Mastery

## Critical Areas Where Caching Is Important and Necessary

### 1. **AI API Calls - HIGHEST PRIORITY** 🔥
**Location**: `src/ai/flows/suggest-leetcode-problems.ts`, `src/components/ai/problem-suggester.tsx`
**Issue**: Expensive AI suggestions being regenerated unnecessarily
**Current State**: Each suggestion request hits Gemini API with full user context
**Cost**: High - AI API calls are expensive and rate-limited
**Solution**: 
```typescript
// Cache AI suggestions based on user data hash
const cacheKey = `ai-suggestions-${userId}-${hashUserContext(bucketHistory, topic)}`;
// TTL: 1-2 hours for recent suggestions
```

### 2. **Firebase Realtime Queries - HIGH PRIORITY** ⚡
**Location**: `src/lib/actions.ts`, `src/app/(app)/topics/[id]/page.tsx`
**Issue**: Multiple database queries on every page load/navigation
**Current State**: 
- `getTopicsWithStats()` - Fetches topics + questions for each topic individually
- `getAllUserProblems()` - Scans all user topics and questions
- Topic detail pages refetch data on every visit
**Cost**: Medium-High - Multiple Firestore reads, slow UX
**Solution**:
```typescript
// React Query with stale-while-revalidate
const { data: topics } = useQuery({
  queryKey: ['user-topics', userId],
  queryFn: () => getTopicsWithStats(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### 3. **LeetCode Problem Database Lookups** 📚
**Location**: `src/lib/problem-lookup.ts`, `src/lib/leetcode-import.ts`
**Issue**: Static problem data being queried repeatedly
**Current State**: Problems loaded from MongoDB on every search/lookup
**Cost**: Medium - Database queries for static reference data
**Solution**:
```typescript
// In-memory cache for problem lookups
let problemCache: Map<string, LeetCodeProblem> | null = null;

export function getCachedProblems(): Map<string, LeetCodeProblem> {
  if (!problemCache) {
    problemCache = loadProblemsToMemory(); // Load once
  }
  return problemCache;
}
```

### 4. **User Stats and Progress Data** 📊
**Location**: `src/lib/progress-actions.ts`, `src/components/dashboard/*`
**Issue**: Expensive aggregation queries running on every dashboard visit
**Current State**: 
- `getTopicProgress()` - MongoDB aggregation pipelines
- `getReviewStats()` - Complex queries across review data
- Progress calculations happening repeatedly
**Cost**: Medium - Complex aggregations affecting dashboard performance
**Solution**:
```typescript
// Background calculation with cached results
const progressCache = new Map<string, { data: any; timestamp: number }>();
// Update cache after user actions, serve cached for reads
```

### 5. **Memory Bank and Review System** 🧠
**Location**: `src/lib/memory-actions.ts`, `src/lib/review-actions.ts`
**Issue**: MongoDB queries for memories and review data on every access
**Current State**: Direct database queries without caching layer
**Cost**: Medium - Affecting memory bank and review system responsiveness
**Solution**:
```typescript
// Redis cache for frequently accessed memories
// User session cache for review queue
```

### 6. **Component Re-rendering - React Performance** ⚛️
**Location**: Multiple components, especially `src/components/ai/problem-suggester.tsx`
**Issue**: Unnecessary re-renders on state changes
**Current State**: Components re-rendering when parent state changes
**Cost**: Low-Medium - UI lag and unnecessary computation
**Solution**:
```typescript
// Use React.memo for expensive components
const MemoizedProblemList = React.memo(ProblemList, (prevProps, nextProps) => {
  return prevProps.problems.length === nextProps.problems.length;
});

// useMemo for expensive calculations
const expensiveStats = useMemo(() => {
  return calculateComplexStats(data);
}, [data.lastModified]);
```

### 7. **Form State Persistence** 💾
**Location**: `src/components/ai/problem-suggester.tsx` (✅ Already implemented)
**Issue**: User input being lost on navigation
**Current State**: ✅ GOOD - localStorage persistence implemented
**Cost**: Low - Good UX improvement already in place

### 8. **MongoDB Connection Pooling** 🔌
**Location**: `src/lib/mongodb.ts`
**Issue**: Database connection overhead
**Current State**: Connection created per request
**Cost**: Low-Medium - Connection latency
**Solution**:
```typescript
// Connection pooling and keep-alive
const client = new MongoClient(uri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

## Recommended Implementation Priority

### Phase 1 - Critical Performance (Week 1)
1. **AI Suggestion Caching** - Implement localStorage + server-side cache for suggestions
2. **Firebase Query Optimization** - Add React Query for user data
3. **Static Data Caching** - Cache LeetCode problems in memory

### Phase 2 - User Experience (Week 2)
1. **Progress Data Caching** - Background calculation + cached results
2. **Component Optimization** - React.memo and useMemo for heavy components
3. **MongoDB Connection Pooling** - Optimize database connections

### Phase 3 - Advanced Features (Week 3)
1. **Memory Bank Optimization** - Session cache for memories
2. **Review System Cache** - Cache review queues and stats
3. **CDN for Static Assets** - Cache images and static files

## Cache Invalidation Strategy

### User Data Changes
```typescript
// Invalidate caches when user modifies data
const invalidateUserCache = (userId: string) => {
  queryClient.invalidateQueries({ queryKey: ['user-topics', userId] });
  queryClient.invalidateQueries({ queryKey: ['user-progress', userId] });
};
```

### AI Suggestion Updates
```typescript
// Invalidate AI cache when user data significantly changes
const shouldInvalidateAI = (oldData: UserData, newData: UserData) => {
  const oldSolved = oldData.bucketHistory.Solved?.length || 0;
  const newSolved = newData.bucketHistory.Solved?.length || 0;
  return Math.abs(newSolved - oldSolved) > 5; // Significant progress
};
```

## Expected Performance Improvements

### Metrics Before Caching:
- AI suggestions: 3-8 seconds (API call + processing)
- Topic loading: 2-4 seconds (multiple Firebase queries)  
- Dashboard: 1-3 seconds (stats calculation)
- Problem lookup: 0.5-1 second (MongoDB query)

### Expected After Caching:
- AI suggestions: 0.2-0.5 seconds (cache hit) | 3-8 seconds (cache miss)
- Topic loading: 0.1-0.3 seconds (cache hit) | 0.8-1.5 seconds (cache miss)
- Dashboard: 0.1-0.2 seconds (cached stats)
- Problem lookup: <0.1 seconds (in-memory lookup)

## Implementation Tools

### Frontend Caching
- **TanStack Query (React Query)** - Server state management
- **SWR** - Alternative for data fetching
- **Zustand** - Client state management with persistence

### Backend Caching  
- **Node.js Memory Cache** - For static/reference data
- **Redis** - For user session and computed data
- **MongoDB Indexes** - Query optimization

### Storage Options
- **localStorage** - Form state, user preferences (✅ partially implemented)
- **sessionStorage** - Temporary UI state
- **IndexedDB** - Large client-side datasets

This caching strategy will significantly improve app responsiveness and reduce API costs while maintaining data consistency.