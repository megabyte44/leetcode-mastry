/**
 * IndexedDB Cache Manager for LeetCode Mastery
 * Provides efficient caching for AI suggestions, user data, and static content
 */

interface CacheItem {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  dbName: string;
  version: number;
  stores: {
    name: string;
    ttl: number; // Default TTL for this store
  }[];
}

class IndexedDBCache {
  private db: IDBDatabase | null = null;
  private config: CacheConfig;
  private initPromise: Promise<void> | null = null;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        this.config.stores.forEach(store => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, { keyPath: 'key' });
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        });
      };
    });

    return this.initPromise;
  }

  async set(storeName: string, key: string, data: any, customTTL?: number): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const store = this.config.stores.find(s => s.name === storeName);
    if (!store) throw new Error(`Store ${storeName} not found`);

    const ttl = customTTL || store.ttl;
    const item: CacheItem = {
      key,
      data,
      timestamp: Date.now(),
      ttl
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.put(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get(storeName: string, key: string): Promise<any | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const item = request.result as CacheItem;
        
        if (!item) {
          resolve(null);
          return;
        }

        // Check if item has expired
        const isExpired = Date.now() - item.timestamp > item.ttl;
        if (isExpired) {
          this.delete(storeName, key); // Clean up expired item
          resolve(null);
          return;
        }

        resolve(item.data);
      };
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async cleanup(storeName: string): Promise<number> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const index = objectStore.index('timestamp');
      const request = index.openCursor();

      let deletedCount = 0;
      const now = Date.now();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const item = cursor.value as CacheItem;
          const isExpired = now - item.timestamp > item.ttl;
          
          if (isExpired) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
    });
  }

  async has(storeName: string, key: string): Promise<boolean> {
    const data = await this.get(storeName, key);
    return data !== null;
  }

  async getOrSet<T>(
    storeName: string, 
    key: string, 
    fetchFunction: () => Promise<T>, 
    customTTL?: number
  ): Promise<T> {
    const cached = await this.get(storeName, key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFunction();
    await this.set(storeName, key, data, customTTL);
    return data;
  }
}

// Create cache instance with configuration
const cacheConfig: CacheConfig = {
  dbName: 'leetcode_mastery_cache',
  version: 1,
  stores: [
    { name: 'ai_suggestions', ttl: 2 * 60 * 60 * 1000 }, // 2 hours
    { name: 'user_topics', ttl: 5 * 60 * 1000 }, // 5 minutes
    { name: 'user_progress', ttl: 10 * 60 * 1000 }, // 10 minutes
    { name: 'problems_data', ttl: 24 * 60 * 60 * 1000 }, // 24 hours
    { name: 'daily_questions', ttl: 5 * 60 * 1000 }, // 5 minutes
    { name: 'user_stats', ttl: 15 * 60 * 1000 }, // 15 minutes
  ]
};

export const cache = new IndexedDBCache(cacheConfig);

// Utility functions for specific cache operations
export class CacheUtils {
  static hashObject(obj: any): string {
    return btoa(JSON.stringify(obj)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  static createAICacheKey(userId: string, bucketHistory: any, topic?: string, additionalContext?: string): string {
    const contextHash = this.hashObject({ bucketHistory, topic, additionalContext });
    return `ai_${userId}_${contextHash}`;
  }

  static createUserCacheKey(userId: string, dataType: string): string {
    return `${dataType}_${userId}`;
  }

  static createTopicCacheKey(userId: string, topicId: string): string {
    return `topic_${userId}_${topicId}`;
  }

  // Background cleanup - call periodically
  static async runCleanup(): Promise<void> {
    try {
      const stores = ['ai_suggestions', 'user_topics', 'user_progress', 'problems_data', 'daily_questions', 'user_stats'];
      for (const store of stores) {
        const deleted = await cache.cleanup(store);
        if (deleted > 0) {
          console.log(`Cleaned up ${deleted} expired items from ${store}`);
        }
      }
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  // Invalidate user-related caches when data changes
  static async invalidateUserCache(userId: string): Promise<void> {
    try {
      await Promise.all([
        cache.delete('user_topics', this.createUserCacheKey(userId, 'topics')),
        cache.delete('user_progress', this.createUserCacheKey(userId, 'progress')),
        cache.delete('user_stats', this.createUserCacheKey(userId, 'stats')),
        cache.delete('daily_questions', this.createUserCacheKey(userId, 'daily')),
      ]);
      console.log('User cache invalidated for:', userId);
    } catch (error) {
      console.error('Failed to invalidate user cache:', error);
    }
  }

  // Smart AI cache invalidation based on significant changes
  static async invalidateAICacheIfNeeded(userId: string, oldBucketHistory: any, newBucketHistory: any): Promise<void> {
    const oldSolved = oldBucketHistory?.Solved?.length || 0;
    const newSolved = newBucketHistory?.Solved?.length || 0;
    const oldTricky = oldBucketHistory?.Tricky?.length || 0;
    const newTricky = newBucketHistory?.Tricky?.length || 0;

    // Significant changes that should invalidate AI cache
    const significantChange = 
      Math.abs(newSolved - oldSolved) > 3 ||
      Math.abs(newTricky - oldTricky) > 2;

    if (significantChange) {
      // Clear all AI suggestions for this user
      try {
        await cache.clear('ai_suggestions');
        console.log('AI cache invalidated due to significant progress changes');
      } catch (error) {
        console.error('Failed to invalidate AI cache:', error);
      }
    }
  }
}

// Initialize cleanup on app start and run periodically
if (typeof window !== 'undefined') {
  // Run cleanup on page load
  CacheUtils.runCleanup();
  
  // Run cleanup every 30 minutes
  setInterval(() => {
    CacheUtils.runCleanup();
  }, 30 * 60 * 1000);
}

export default cache;