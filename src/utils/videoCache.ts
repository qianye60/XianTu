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
    // 检查对象存储是否已存在
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
      console.log(`[videoCache] Object store '${STORE_NAME}' created.`);
    }
  },
});

/**
 * 从 IndexedDB 获取视频 Blob
 * @param key 视频的 URL
 */
export async function getVideo(key: string): Promise<Blob | undefined> {
  try {
    console.log(`[videoCache] Attempting to get video from cache with key: ${key}`);
    const db = await dbPromise;
    const video = await db.get(STORE_NAME, key);
    if (video) {
      console.log(`[videoCache] Cache hit for key: ${key}`);
    } else {
      console.log(`[videoCache] Cache miss for key: ${key}`);
    }
    return video;
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
    console.log(`[videoCache] Attempting to set video into cache with key: ${key}`);
    const db = await dbPromise;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.put(value, key);
    await tx.done;
    console.log(`[videoCache] Successfully set video for key: ${key}. Size: ${(value.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error(`[videoCache] Error setting video for key ${key}:`, error);
    // 重新抛出错误，以便调用方可以捕获它
    throw error;
  }
}