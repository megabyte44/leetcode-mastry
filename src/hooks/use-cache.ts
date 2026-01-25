/**
 * React hooks for cached data access
 * Provides efficient data fetching with IndexedDB caching
 */

import { useState, useEffect, useCallback } from 'react';
import { cache, CacheUtils } from '../lib/cache';
import { getAllUserProblems, getTopics, getTopicsWithStats, getDailyQuestions } from '../lib/actions';
import type { Topic, DailyQuestion, TopicWithStats } from '../lib/types';

interface CacheHookOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  staleTime?: number; // Time in ms before data is considered stale
}

interface CacheHookResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isFromCache: boolean;
}

/**
 * Hook for cached user topics
 */
export function useCachedTopics(
  userId: string | undefined, 
  options: CacheHookOptions = {}
): CacheHookResult<Topic[]> {
  const { enabled = true, refetchOnMount = true, staleTime = 5 * 60 * 1000 } = options;
  
  const [data, setData] = useState<Topic[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const cacheKey = CacheUtils.createUserCacheKey(userId, 'topics');
      
      // Try cache first
      const cached = await cache.get('user_topics', cacheKey);
      if (cached) {
        setData(cached);
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }
      
      // Fetch fresh data
      setIsFromCache(false);
      const topics = await getTopics(userId);
      setData(topics);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch topics');
      console.error('Error fetching cached topics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Clear cache and fetch fresh data
      const cacheKey = CacheUtils.createUserCacheKey(userId, 'topics');
      await cache.delete('user_topics', cacheKey);
      await fetchData();
    } catch (err) {
      console.error('Error refetching topics:', err);
    }
  }, [userId, fetchData]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  return { data, isLoading, error, refetch, isFromCache };
}

/**
 * Hook for cached topics with stats
 */
export function useCachedTopicsWithStats(
  userId: string | undefined,
  options: CacheHookOptions = {}
): CacheHookResult<TopicWithStats[]> {
  const { enabled = true, refetchOnMount = true } = options;
  
  const [data, setData] = useState<TopicWithStats[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const cacheKey = CacheUtils.createUserCacheKey(userId, 'topics-stats');
      
      // Try cache first
      const cached = await cache.get('user_topics', cacheKey);
      if (cached) {
        setData(cached);
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }
      
      // Fetch fresh data
      setIsFromCache(false);
      const topics = await getTopicsWithStats(userId);
      setData(topics);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch topics with stats');
      console.error('Error fetching cached topics with stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Clear cache and fetch fresh data
      const cacheKey = CacheUtils.createUserCacheKey(userId, 'topics-stats');
      await cache.delete('user_topics', cacheKey);
      await fetchData();
    } catch (err) {
      console.error('Error refetching topics with stats:', err);
    }
  }, [userId, fetchData]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  return { data, isLoading, error, refetch, isFromCache };
}

/**
 * Hook for cached daily questions
 */
export function useCachedDailyQuestions(
  userId: string | undefined,
  options: CacheHookOptions = {}
): CacheHookResult<DailyQuestion[]> {
  const { enabled = true, refetchOnMount = true } = options;
  
  const [data, setData] = useState<DailyQuestion[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const cacheKey = CacheUtils.createUserCacheKey(userId, 'daily');
      
      // Try cache first
      const cached = await cache.get('daily_questions', cacheKey);
      if (cached) {
        setData(cached);
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }
      
      // Fetch fresh data
      setIsFromCache(false);
      const dailyQuestions = await getDailyQuestions(userId);
      setData(dailyQuestions);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch daily questions');
      console.error('Error fetching cached daily questions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Clear cache and fetch fresh data
      const cacheKey = CacheUtils.createUserCacheKey(userId, 'daily');
      await cache.delete('daily_questions', cacheKey);
      await fetchData();
    } catch (err) {
      console.error('Error refetching daily questions:', err);
    }
  }, [userId, fetchData]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  return { data, isLoading, error, refetch, isFromCache };
}

/**
 * Hook for cached user problems (bucket history)
 */
export function useCachedUserProblems(
  userId: string | undefined,
  options: CacheHookOptions = {}
): CacheHookResult<Record<string, string[]>> {
  const { enabled = true, refetchOnMount = true } = options;
  
  const [data, setData] = useState<Record<string, string[]> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const cacheKey = CacheUtils.createUserCacheKey(userId, 'problems');
      
      // Try cache first
      const cached = await cache.get('user_progress', cacheKey);
      if (cached) {
        setData(cached);
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }
      
      // Fetch fresh data
      setIsFromCache(false);
      const userProblems = await getAllUserProblems(userId);
      setData(userProblems);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user problems');
      console.error('Error fetching cached user problems:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Clear cache and fetch fresh data
      const cacheKey = CacheUtils.createUserCacheKey(userId, 'problems');
      await cache.delete('user_progress', cacheKey);
      await fetchData();
    } catch (err) {
      console.error('Error refetching user problems:', err);
    }
  }, [userId, fetchData]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  return { data, isLoading, error, refetch, isFromCache };
}

/**
 * Generic cache hook for custom data
 */
export function useCachedData<T>(
  storeName: string,
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  options: CacheHookOptions = {}
): CacheHookResult<T> {
  const { enabled = true, refetchOnMount = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try cache first
      const cached = await cache.get(storeName, cacheKey);
      if (cached) {
        setData(cached);
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }
      
      // Fetch fresh data
      setIsFromCache(false);
      const result = await fetchFunction();
      setData(result);
      
      // Cache the result
      await cache.set(storeName, cacheKey, result);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching cached data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [storeName, cacheKey, fetchFunction, enabled]);

  const refetch = useCallback(async () => {
    try {
      // Clear cache and fetch fresh data
      await cache.delete(storeName, cacheKey);
      await fetchData();
    } catch (err) {
      console.error('Error refetching data:', err);
    }
  }, [storeName, cacheKey, fetchData]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  return { data, isLoading, error, refetch, isFromCache };
}

/**
 * Hook to get cache statistics and control
 */
export function useCacheControl() {
  const [isCleanupRunning, setIsCleanupRunning] = useState(false);
  
  const runCleanup = useCallback(async () => {
    setIsCleanupRunning(true);
    try {
      await CacheUtils.runCleanup();
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    } finally {
      setIsCleanupRunning(false);
    }
  }, []);
  
  const invalidateUserCache = useCallback(async (userId: string) => {
    try {
      await CacheUtils.invalidateUserCache(userId);
    } catch (error) {
      console.error('Failed to invalidate user cache:', error);
    }
  }, []);
  
  const clearAllCaches = useCallback(async () => {
    try {
      const stores = ['ai_suggestions', 'user_topics', 'user_progress', 'problems_data', 'daily_questions', 'user_stats'];
      await Promise.all(stores.map(store => cache.clear(store)));
      console.log('Cleared all caches');
    } catch (error) {
      console.error('Failed to clear all caches:', error);
    }
  }, []);
  
  return {
    runCleanup,
    invalidateUserCache,
    clearAllCaches,
    isCleanupRunning
  };
}