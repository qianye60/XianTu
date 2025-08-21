// src/utils/localStorageManager.ts
import type { LocalStorageRoot } from '@/types/game';

/**
 * @fileoverview
 * 乾坤宝库 (V3)。此法典是本地存储的唯一接口。
 * 它以 'DAD_SAVES_V3' 为键，管理一个与新天规 LocalStorageRoot 完全同构的根对象。
 * 此版本不再负责数据迁移和复杂的业务逻辑，只做最纯粹的存储与读取。
 */

const ROOT_STORAGE_KEY = 'DAD_SAVES_V3';

/**
 * 获取一个空的、默认的本地存储根数据结构。
 */
function getEmptyRoot(): LocalStorageRoot {
  return {
    当前激活存档: null,
    角色列表: {},
  };
}

/**
 * 从LocalStorage加载根数据对象。
 */
export function loadRootData(): LocalStorageRoot {
  try {
    const serializedRoot = localStorage.getItem(ROOT_STORAGE_KEY);
    if (serializedRoot) {
      // 此处可以添加更复杂的数据校验逻辑，确保读取的数据符合最新的类型定义
      const data = JSON.parse(serializedRoot);
      return {
        当前激活存档: data.当前激活存档 || null,
        角色列表: data.角色列表 || {},
      };
    }
  } catch (error) {
    console.error('【乾坤宝库】根数据读取或解析失败，宝库可能已损坏:', error);
    // 如果解析失败，为防止数据污染，直接删除损坏的键
    localStorage.removeItem(ROOT_STORAGE_KEY);
  }
  // 若无数据或解析失败，返回一个全新的空结构
  return getEmptyRoot();
}

/**
 * 将根数据对象完整保存到LocalStorage。
 */
export function saveRootData(root: LocalStorageRoot): void {
  try {
    const serializedRoot = JSON.stringify(root);
    localStorage.setItem(ROOT_STORAGE_KEY, serializedRoot);
  } catch (error) {
    console.error('【乾坤宝库】根数据保存失败:', error);
    // 在实际应用中，这里可能需要一个更稳健的错误处理机制，比如数据备份或重试
  }
}

/**
 * 【维护性法术】完全清除本地所有存档数据。
 * 用于调试或用户主动重置。
 */
export function clearAllLocalData(): void {
  try {
    localStorage.removeItem(ROOT_STORAGE_KEY);
    console.log(`【乾坤宝库】已执行虚空破碎，所有本地数据已清除。`);
  } catch (error) {
     console.error('【乾坤宝库】清除本地数据时发生错误:', error);
  }
}