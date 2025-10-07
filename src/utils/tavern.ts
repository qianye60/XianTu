import type { DADCustomData } from '../types';
import { toast } from './toast';
import { useUIStore } from '@/stores/uiStore';
import type { TavernHelper } from '@/types';


/**
 * 获取TavernHelper API，适配iframe环境。
 * @returns {TavernHelper | null} - 返回TavernHelper对象或null
 */
export function getTavernHelper(): TavernHelper | null {
  const raw = (window.parent as any)?.TavernHelper;
  if (!raw) {
    console.error('TavernHelper API not found in window.parent.');
    return null;
  }

  // Attach runtime polyfills for compatibility across SillyTavern versions
  const helper: any = raw;

  if (typeof helper.getVariable !== 'function') {
    helper.getVariable = async (key: string, options: { type: 'global' | 'chat' | 'local' }) => {
      if (typeof helper.getVariables === 'function') {
        const all = await helper.getVariables(options);
        return all ? all[key] : undefined;
      }
      throw new Error('getVariable is not available and getVariables fallback missing');
    };
  }

  if (typeof helper.setVariable !== 'function') {
    helper.setVariable = async (key: string, value: unknown, options: { type: 'global' | 'chat' | 'local' }) => {
      if (typeof helper.insertOrAssignVariables === 'function') {
        // 清理数据，移除不可序列化的值（修复酒馆助手3.6.11的structuredClone问题）
        const { deepCleanForClone } = await import('./dataValidation');
        const cleanedData = deepCleanForClone({ [key]: value });
        await helper.insertOrAssignVariables(cleanedData, options);
        return;
      }
      throw new Error('setVariable is not available and insertOrAssignVariables fallback missing');
    };
  }

  return helper as TavernHelper;
}

/**
 * 获取当前用户的名称（不是角色卡名称）。
 * @returns {Promise<string | null>} - 返回当前用户名称，如果失败则返回null。
 */
export async function getCurrentCharacterName(): Promise<string | null> {
  const helper = getTavernHelper();
  if (!helper) {
    console.warn('TavernHelper API不可用，无法获取用户名称。');
    return null;
  }

  try {
    // 直接使用{{user}}宏来获取用户名字，而不是角色卡名字
    const userName = await helper.substitudeMacros('{{user}}');
    if (userName && userName !== '{{user}}' && userName.trim() !== '') {
      console.log('成功获取用户名字:', userName);
      return userName.trim();
    }

    console.warn('无法获取当前用户名称，{{user}}宏未正确解析。');
    return null;
  } catch (error) {
    console.error('获取用户名称时出错:', error);
    return null;
  }
}

/**
 * [已移除] 重命名当前酒馆角色的功能已被移除
 * 原因：应该直接使用酒馆的用户名，而不是修改角色卡名称
 * 使用 getCurrentCharacterName() 获取用户名即可
 */

// 为酒馆世界书条目定义一个最小化的接口以确保类型安全
interface LorebookEntry {
  uid: number;
  comment: string;
  keys: string[];
  content: string;
}

/**
 * 在酒馆中为指定世界创建或更新世界书条目。
 * @param {string} worldName - 世界的名称，将作为条目的标题(comment)和关键词(key)。
 * @param {string} worldDescription - 世界的详细描述，将作为条目的内容(content)。
 */
export async function createWorldLorebookEntry(worldName: string, worldDescription: string): Promise<void> {
  const helper = getTavernHelper();
  if (!helper) {
    toast.error('连接酒馆失败，无法铭刻世界法则。');
    return;
  }

  const LOREBOOK_NAME = '【世界】';

  try {
    const lorebooks = await helper.getLorebooks();
    if (!lorebooks.includes(LOREBOOK_NAME)) {
      await helper.createLorebook(LOREBOOK_NAME);
      toast.info(`已为您开辟新的世界书卷宗：《${LOREBOOK_NAME}》`);
    }

    const entries: LorebookEntry[] = await helper.getLorebookEntries(LOREBOOK_NAME);
    const existingEntry = entries.find(entry => entry.comment === worldName || entry.keys.includes(worldName));

    if (existingEntry) {
      await helper.setLorebookEntries(LOREBOOK_NAME, [{
        uid: existingEntry.uid,
        content: worldDescription,
      }]);
      toast.success(`《${LOREBOOK_NAME}》中关于“${worldName}”的记载已更新。`);
    } else {
      await helper.createLorebookEntries(LOREBOOK_NAME, [{
        comment: worldName,
        keys: [worldName],
        content: worldDescription,
        enabled: true,
        position: 'before_character_definition',
      }]);
      toast.success(`新的世界法则“${worldName}”已成功铭刻于《${LOREBOOK_NAME}》`);
    }

  } catch (error) {
    console.error('铭刻世界法则时出错:', error);
    toast.error('铭刻世界法则失败！');
  }
}

/**
 * [存档核心] 清理所有与角色相关的酒馆变量和聊天记录 (健壮版)
 * 这是开始新游戏或加载游戏前的必要步骤
 * 将每个清理步骤分开处理，以防止单个API失败导致整个流程中断
 */
export async function clearAllCharacterData(): Promise<void> {
  const helper = getTavernHelper();
  const uiStore = useUIStore();

  if (!helper) {
    console.warn('TavernHelper不可用，跳过清理流程。');
    return;
  }
  
  uiStore.updateLoadingText('正在净化天地，重置天机...');

  let successCount = 0;
  let errorCount = 0;

  // 步骤1: 清理聊天变量 - 彻底清空所有变量（防止数据堆叠）
  try {
    const chatVars = await helper.getVariables({ type: 'chat' });
    const chatKeys = Object.keys(chatVars);

    if (chatKeys.length > 0) {
      console.log(`[清理] 发现 ${chatKeys.length} 个聊天变量，全部清理:`, chatKeys);
      // 逐个删除，即使某个失败也继续删除其他的
      let deletedCount = 0;
      for (const key of chatKeys) {
        try {
          await helper.deleteVariable(key, { type: 'chat' });
          deletedCount++;
        } catch (delError) {
          console.warn(`[清理] 删除聊天变量 ${key} 失败:`, delError);
        }
      }
      console.log(`[清理] 聊天变量清理完成，成功删除 ${deletedCount}/${chatKeys.length} 个。`);
    } else {
      console.log(`[清理] 未发现需要清理的聊天变量。`);
    }
    successCount++;
  } catch (e) {
    console.warn('[清理] 清理聊天变量时出现非致命错误:', e);
    errorCount++;
  }

  // 步骤2: 清理全局变量 - 保留开局自定义数据
  try {
    const globalVars = await helper.getVariables({ type: 'global' });
    const globalKeys = Object.keys(globalVars);

    // 需要保留的全局变量（开局自定义数据等）
    const preservedKeys = ['DAD_creationData'];

    // 过滤出需要删除的变量
    const keysToDelete = globalKeys.filter(key => !preservedKeys.includes(key));

    if (keysToDelete.length > 0) {
      console.log(`[清理] 发现 ${keysToDelete.length} 个全局变量需要清理:`, keysToDelete);
      if (globalKeys.length > keysToDelete.length) {
        console.log(`[清理] 保留 ${globalKeys.length - keysToDelete.length} 个全局变量:`, preservedKeys.filter(k => globalKeys.includes(k)));
      }

      // 逐个删除，即使某个失败也继续删除其他的
      let deletedCount = 0;
      for (const key of keysToDelete) {
        try {
          await helper.deleteVariable(key, { type: 'global' });
          deletedCount++;
        } catch (delError) {
          console.warn(`[清理] 删除全局变量 ${key} 失败:`, delError);
        }
      }
      console.log(`[清理] 全局变量清理完成，成功删除 ${deletedCount}/${keysToDelete.length} 个。`);
    } else {
      console.log(`[清理] 未发现需要清理的全局变量。`);
    }
    successCount++;
  } catch (e) {
    console.warn('[清理] 清理全局变量时出现非致命错误:', e);
    errorCount++;
  }

  // 步骤3: 清理本地变量 - 彻底清空所有变量（防止数据堆叠）
  try {
    // 注意：本地变量类型可能不被所有酒馆版本支持，所以包装在try-catch中
    try {
      const localVars = await helper.getVariables({ type: 'local' });
      const localKeys = Object.keys(localVars);

      if (localKeys.length > 0) {
        console.log(`[清理] 发现 ${localKeys.length} 个本地变量，全部清理:`, localKeys);
        // 逐个删除，即使某个失败也继续删除其他的
        let deletedCount = 0;
        for (const key of localKeys) {
          try {
            await helper.deleteVariable(key, { type: 'local' });
            deletedCount++;
          } catch (delError) {
            console.warn(`[清理] 删除本地变量 ${key} 失败:`, delError);
          }
        }
        console.log(`[清理] 本地变量清理完成，成功删除 ${deletedCount}/${localKeys.length} 个。`);
      } else {
        console.log(`[清理] 未发现需要清理的本地变量。`);
      }
      successCount++;
    } catch (localError) {
      console.log(`[清理] 跳过本地变量清理（可能不支持）:`, localError);
      // 不算作错误，因为本地变量类型可能不被支持
    }
  } catch (e) {
    console.warn('[清理] 清理本地变量时出现非致命错误:', e);
    errorCount++;
  }

  // 步骤4: 清空聊天历史记录
  try {
    console.log('[清理] 开始清空聊天历史记录...');
    if (helper.clearChat) {
      await helper.clearChat();
      console.log('[清理] 聊天历史记录已清空');
      successCount++;
    } else {
      console.warn('[清理] clearChat 方法不可用，跳过清空聊天记录');
    }
  } catch (e) {
    console.warn('[清理] 清空聊天记录时出现非致命错误:', e);
    errorCount++;
  }

  // 最终根据执行结果给出反馈（不再抛出错误，允许继续创角）
  if (errorCount > 0 && successCount === 0) {
    // 所有清理步骤都失败，但仍然允许继续（防止其他游戏数据堆叠的问题已通过逐个删除解决）
    toast.warning('天机重置遇到困难，但将继续尝试创建角色。如遇问题请刷新页面。');
    uiStore.updateLoadingText('天机重置遇到困难，继续尝试开启新道途...');
  } else if (errorCount > 0) {
    toast.info('天机已部分重置，少数数据清理失败，但不影响使用。');
    uiStore.updateLoadingText('天机已重置，准备开启新道途。');
  } else {
    uiStore.updateLoadingText('天机已彻底重置，准备开启新道途。');
  }
  // 不再抛出错误，允许后续流程（如创角）继续
}
