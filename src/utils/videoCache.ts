import { openDB, DBSchema } from 'idb';

interface VideoDBSchema extends DBSchema {
  videos: {
    key: string;
    value: Blob;
  };
}

// 数据库名称和版本
const DB_NAME = 'video-cache-db';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

// 打开数据库的 Promise
const dbPromise = openDB<VideoDBSchema>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  },
});

/**
 * 从 IndexedDB 获取视频 Blob
 * @param key 视频的 URL
 */
export async function getVideo(key: string): Promise<Blob | undefined> {
  try {
    const db = await dbPromise;
    return await db.get(STORE_NAME, key);
  } catch (error) {
    console.error(`[videoCache] Error getting video for key ${key}:`, error);
    return undefined;
  }
}

/**
 * 将视频 Blob 保存到 IndexedDB
 * @param key 视频的 URL
 * @param value 视频的 Blob 数据
 */
export async function setVideo(key: string, value: Blob): Promise<void> {
  try {
    const db = await dbPromise;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.put(value, key);
    await tx.done;
  } catch (error) {
    console.error(`[videoCache] Error setting video for key ${key}:`, error);
    throw error;
  }
}