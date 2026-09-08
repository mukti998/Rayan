const DB_NAME = "clinic-manager-cache";
const DB_VERSION = 1;
const STORE_NAME = "query-cache";

interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
}

// Cache TTL: 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheData(key: string, data: unknown): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
    };
    store.put(entry);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Silently fail — cache is best-effort
  }
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result as CacheEntry | undefined;
        if (!result) {
          resolve(null);
          db.close();
          return;
        }
        // Check if cache is expired
        if (Date.now() - result.timestamp > CACHE_TTL) {
          resolve(null);
          db.close();
          return;
        }
        resolve(result.data as T);
        db.close();
      };
      request.onerror = () => {
        resolve(null);
        db.close();
      };
    });
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    db.close();
  } catch {
    // Silently fail
  }
}

// Keys for cached data
export const CACHE_KEYS = {
  PATIENTS: "patients:list",
  MEDICATIONS: "medications:list",
  DOCTORS: "doctors:list",
  USER: "auth:user",
} as const;
