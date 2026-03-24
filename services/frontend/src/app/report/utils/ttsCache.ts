"use client";

const TTS_CACHE_DB_NAME = "report-tts-cache";
const TTS_CACHE_STORE_NAME = "audio";
const TTS_CACHE_DB_VERSION = 2;
const TTS_CACHE_MAX_RECORDS = 120;

type PersistedTtsRecord = {
  cacheKey: string;
  blob: Blob;
  updatedAt: number;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openTtsCacheDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve<IDBDatabase | null>(null);
  }

  if (dbPromise) {
    return dbPromise;
  }

  const promise: Promise<IDBDatabase | null> = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(TTS_CACHE_DB_NAME, TTS_CACHE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(TTS_CACHE_STORE_NAME)) {
        const store = database.createObjectStore(TTS_CACHE_STORE_NAME, { keyPath: "cacheKey" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open TTS cache database."));
  }).catch((error): null => {
    console.error("Failed to initialize TTS cache database:", error);
    dbPromise = null;
    return null;
  });

  dbPromise = promise;
  return promise;
}

function runReadonlyTransaction<T>(
  database: IDBDatabase,
  callback: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(TTS_CACHE_STORE_NAME, "readonly");
    const store = transaction.objectStore(TTS_CACHE_STORE_NAME);
    callback(store, resolve, reject);
  });
}

function runReadwriteTransaction<T>(
  database: IDBDatabase,
  callback: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(TTS_CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(TTS_CACHE_STORE_NAME);
    callback(store, resolve, reject);
  });
}

export async function getPersistedTtsBlob(cacheKey: string) {
  const database = await openTtsCacheDb();
  if (!database) {
    return null;
  }

  try {
    return await runReadonlyTransaction<Blob | null>(database, (store, resolve, reject) => {
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const result = request.result as PersistedTtsRecord | undefined;
        resolve(result?.blob ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error("Failed to read TTS cache."));
    });
  } catch (error) {
    console.error("Failed to read persisted TTS cache:", error);
    return null;
  }
}

export async function setPersistedTtsBlob(cacheKey: string, blob: Blob) {
  const database = await openTtsCacheDb();
  if (!database) {
    return;
  }

  try {
    await runReadwriteTransaction<void>(database, (store, resolve, reject) => {
      const request = store.put({
        cacheKey,
        blob,
        updatedAt: Date.now(),
      } satisfies PersistedTtsRecord);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to write TTS cache."));
    });

    await trimPersistedTtsCache(database);
  } catch (error) {
    console.error("Failed to persist TTS cache:", error);
  }
}

async function trimPersistedTtsCache(database: IDBDatabase) {
  try {
    const records = await runReadonlyTransaction<PersistedTtsRecord[]>(database, (store, resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as PersistedTtsRecord[] | undefined) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Failed to inspect TTS cache."));
    });

    if (records.length <= TTS_CACHE_MAX_RECORDS) {
      return;
    }

    const staleKeys = records
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .slice(0, records.length - TTS_CACHE_MAX_RECORDS)
      .map((record) => record.cacheKey);

    await runReadwriteTransaction<void>(database, (store, resolve, reject) => {
      if (!staleKeys.length) {
        resolve();
        return;
      }

      let processedCount = 0;

      staleKeys.forEach((cacheKey) => {
        const request = store.delete(cacheKey);
        request.onsuccess = () => {
          processedCount += 1;
          if (processedCount === staleKeys.length) {
            resolve();
          }
        };
        request.onerror = () => reject(request.error ?? new Error("Failed to trim TTS cache."));
      });
    });
  } catch (error) {
    console.error("Failed to trim persisted TTS cache:", error);
  }
}
