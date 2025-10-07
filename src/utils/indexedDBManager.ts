// src/utils/indexedDBManager.ts
import type { LocalStorageRoot } from '@/types/game';

/**
 * @fileoverview
 * 乾坤宝库 (V4 - IndexedDB版本)
 * 使用 IndexedDB 存储大容量存档数据，解决 localStorage 5-10MB 限制问题
 */

const DB_NAME = 'DAD_SAVES_DB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const ROOT_KEY = 'root_data';

// IndexedDB 实例缓存
let dbInstance: IDBDatabase | null = null;

/**
 * 打开/创建 IndexedDB 数据库
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // 如果已经有缓存的实例，直接返回
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('【乾坤宝库-IDB】数据库打开失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('【乾坤宝库-IDB】数据库已打开');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建对象存储（类似于表）
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        console.log('【乾坤宝库-IDB】对象存储已创建:', STORE_NAME);
      }
    };
  });
}

/**
 * 获取空的根数据结构
 */
function getEmptyRoot(): LocalStorageRoot {
  return {
    当前激活存档: null,
    角色列表: {},
  };
}

/**
 * 从 IndexedDB 加载根数据
 */
export async function loadRootData(): Promise<LocalStorageRoot> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(ROOT_KEY);

      request.onsuccess = () => {
        if (request.result && request.result.data) {
          console.log('【乾坤宝库-IDB】根数据加载成功');
          const data = request.result.data;
          resolve({
            当前激活存档: data.当前激活存档 || null,
            角色列表: data.角色列表 || {},
          });
        } else {
          console.log('【乾坤宝库-IDB】无存档数据，返回空结构');
          resolve(getEmptyRoot());
        }
      };

      request.onerror = () => {
        console.error('【乾坤宝库-IDB】读取失败:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('【乾坤宝库-IDB】加载根数据时出错:', error);
    return getEmptyRoot();
  }
}

/**
 * 将根数据保存到 IndexedDB
 */
export async function saveRootData(root: LocalStorageRoot): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      // 🔥 深拷贝数据，移除不可序列化的对象（函数、Symbol、循环引用等）
      let cleanedData: LocalStorageRoot;
      try {
        cleanedData = JSON.parse(JSON.stringify(root));
      } catch (jsonError) {
        console.error('【乾坤宝库-IDB】数据序列化失败:', jsonError);
        reject(new Error(`数据包含不可序列化的内容: ${jsonError}`));
        return;
      }

      // 存储格式：{ id: 'root_data', data: LocalStorageRoot }
      const request = objectStore.put({
        id: ROOT_KEY,
        data: cleanedData,
        timestamp: new Date().toISOString()
      });

      request.onsuccess = () => {
        console.log('【乾坤宝库-IDB】根数据保存成功');
        resolve();
      };

      request.onerror = () => {
        console.error('【乾坤宝库-IDB】保存失败:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        console.log('【乾坤宝库-IDB】事务完成');
      };
    });
  } catch (error) {
    console.error('【乾坤宝库-IDB】保存根数据时出错:', error);
    throw error;
  }
}

/**
 * 清除所有数据
 */
export async function clearAllLocalData(): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('【乾坤宝库-IDB】已执行虚空破碎，所有数据已清除');
        resolve();
      };

      request.onerror = () => {
        console.error('【乾坤宝库-IDB】清除数据失败:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('【乾坤宝库-IDB】清除数据时出错:', error);
    throw error;
  }
}

/**
 * 从 localStorage 迁移数据到 IndexedDB
 * 这个函数会在应用启动时自动调用一次
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  try {
    const OLD_KEY = 'DAD_SAVES_V3';
    const oldData = localStorage.getItem(OLD_KEY);

    if (!oldData) {
      console.log('【乾坤宝库-IDB】无需迁移，localStorage中无数据');
      return false;
    }

    console.log('【乾坤宝库-IDB】检测到localStorage数据，开始迁移...');

    const parsedData = JSON.parse(oldData) as LocalStorageRoot;
    await saveRootData(parsedData);

    // 迁移成功后，备份旧数据到新键名，然后删除旧键
    localStorage.setItem('DAD_SAVES_V3_BACKUP', oldData);
    localStorage.removeItem(OLD_KEY);

    console.log('【乾坤宝库-IDB】✅ 数据迁移完成！已备份到 localStorage (DAD_SAVES_V3_BACKUP)');
    return true;
  } catch (error) {
    console.error('【乾坤宝库-IDB】❌ 数据迁移失败:', error);
    return false;
  }
}

/**
 * 获取数据库统计信息（用于调试）
 */
export async function getStorageStats(): Promise<{ itemCount: number; estimatedSize: string }> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const countRequest = objectStore.count();

      countRequest.onsuccess = () => {
        const itemCount = countRequest.result;

        // 尝试估算大小（需要读取实际数据）
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = () => {
          const allData = getAllRequest.result;
          const estimatedBytes = JSON.stringify(allData).length;
          const estimatedMB = (estimatedBytes / 1024 / 1024).toFixed(2);

          resolve({
            itemCount,
            estimatedSize: `~${estimatedMB} MB`
          });
        };

        getAllRequest.onerror = () => {
          resolve({
            itemCount,
            estimatedSize: '未知'
          });
        };
      };

      countRequest.onerror = () => {
        reject(countRequest.error);
      };
    });
  } catch (error) {
    console.error('【乾坤宝库-IDB】获取统计信息失败:', error);
    return { itemCount: 0, estimatedSize: '未知' };
  }
}
