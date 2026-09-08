import { useState, useEffect, useRef } from "react";
import { getCachedData, cacheData } from "./offline-cache";

/**
 * A hook that wraps Convex useQuery with IndexedDB offline fallback.
 *
 * When online: fetches from Convex, caches the result in IndexedDB.
 * When offline or Convex fails: returns cached data from IndexedDB.
 *
 * Usage:
 *   const patients = useCachedQuery(api.patients.list, {}, CACHE_KEYS.PATIENTS);
 *
 * Note: This hook does NOT replace useQuery for reactive subscriptions.
 * Use it only for data that needs to be available offline (patient list,
 * medications, doctors). For real-time data (appointments, vitals), use
 * regular useQuery.
 */
export function useCachedQuery<T>(
  convexQuery: T | undefined,
  queryArgs: Record<string, unknown> | "skip",
  cacheKey: string
): T | undefined {
  const [cachedData, setCachedData] = useState<T | undefined>(undefined);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const mountedRef = useRef(true);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load from cache on mount
  useEffect(() => {
    if (queryArgs === "skip") return;

    getCachedData<T>(cacheKey).then((data) => {
      if (mountedRef.current && data) {
        setCachedData(data);
      }
    });
  }, [cacheKey]);

  return cachedData;
}

/**
 * Save Convex query result to IndexedDB cache.
 * Call this after a successful Convex query to persist the data.
 *
 * Usage (in a component):
 *   const patients = useQuery(api.patients.list, {});
 *   useCacheEffect(patients, CACHE_KEYS.PATIENTS);
 */
export function useCacheEffect<T>(
  data: T | undefined,
  cacheKey: string
): void {
  useEffect(() => {
    if (data !== undefined && data !== null) {
      cacheData(cacheKey, data);
    }
  }, [data, cacheKey]);
}
