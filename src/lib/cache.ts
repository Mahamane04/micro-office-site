// In-memory cache with TTL (Time To Live)
// Used to cache Airtable data and reduce API calls

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Get cached data if it exists and hasn't expired
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  // Check if expired
  if (entry.expiry < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set data in cache with TTL
 * @param key Cache key
 * @param data Data to cache
 * @param ttlSeconds Time to live in seconds (default: 5 minutes)
 */
export function setCached<T>(key: string, data: T, ttlSeconds: number = 300): void {
  const expiry = Date.now() + ttlSeconds * 1000;
  cache.set(key, { data, expiry });
}

/**
 * Fetch data with automatic caching
 * @param key Cache key
 * @param fetcher Async function that fetches the data
 * @param ttlSeconds Time to live in seconds (default: 5 minutes)
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Check cache first
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache it
  setCached(key, data, ttlSeconds);

  return data;
}

/**
 * Clear specific cache entries by pattern
 * @param pattern String pattern to match cache keys
 */
export function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
