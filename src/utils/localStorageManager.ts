/**
 * src/utils/localStorageManager.ts
 * 本地浏览器存储管理器 - 负责将非角色存档的全局配置数据（如自定义世界、天赋等）持久化。
 */
import { toast } from './toast';

const DAD_CUSTOM_DATA_KEY = 'DAD_custom_data';

/**
 * 安全地从 localStorage 读取数据。
 * @param key - 要读取的键。
 * @returns {T | null} - 解析后的数据或在失败时返回null。
 */
export function getItem<T>(key: string): T | null {
  try {
    if (typeof window.localStorage === 'undefined') {
      console.warn('LocalStorage is not available.');
      return null;
    }
    const item = window.localStorage.getItem(key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    toast.error(`读取本地配置（${key}）失败，数据可能已损坏。`);
    return null;
  }
}

/**
 * 安全地向 localStorage 写入数据。
 * @param key - 要写入的键。
 * @param value - 要写入的值，将被JSON序列化。
 * @returns {boolean} - 操作是否成功。
 */
export function setItem<T>(key: string, value: T): boolean {
  try {
    if (typeof window.localStorage === 'undefined') {
      console.warn('LocalStorage is not available.');
      return false;
    }
    const stringifiedValue = JSON.stringify(value);
    window.localStorage.setItem(key, stringifiedValue);
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
    toast.error(`保存本地配置（${key}）失败。`);
    return false;
  }
}

/**
 * 从 localStorage 中移除一个项目。
 * @param key - 要移除的键。
 */
export function removeItem(key: string): void {
  try {
    if (typeof window.localStorage === 'undefined') {
      console.warn('LocalStorage is not available.');
      return;
    }
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage key "${key}":`, error);
    toast.error(`移除本地配置（${key}）失败。`);
  }
}

// 导出专用于本应用的常量键
export { DAD_CUSTOM_DATA_KEY };