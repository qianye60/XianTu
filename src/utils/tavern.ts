import type { DADCustomData } from '../types';
import { toast } from './toast';
import { useUIStore } from '@/stores/uiStore';
import type { TavernHelper } from './tavernCore';


/**
 * 获取TavernHelper API，适配iframe环境。
 * @returns {TavernHelper | null} - 返回TavernHelper对象或null
 */
export function getTavernHelper(): TavernHelper | null {
  if (window.parent?.TavernHelper) {
    return window.parent.TavernHelper as unknown as TavernHelper;
  }
  console.error('TavernHelper API not found in window.parent.');
  return null;
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

  // 步骤1: 清理聊天变量
  try {
    const chatVars = await helper.getVariables({ type: 'chat' });
    const redundantChatPrefixes = ['character.', 'player.', 'world.', 'character_'];
    const chatKeys = Object.keys(chatVars).filter(key => redundantChatPrefixes.some(prefix => key.startsWith(prefix)));
    if (chatKeys.length > 0) {
      console.log(`[清理] 发现 ${chatKeys.length} 个聊天变量需要清理...`);
      await Promise.all(chatKeys.map(key => helper.deleteVariable(key, { type: 'chat' })));
      console.log(`[清理] 聊天变量清理完成。`);
    }
    successCount++;
  } catch (e) {
    console.warn('[清理] 清理聊天变量时出现非致命错误:', e);
    errorCount++;
  }

  // 步骤2: 清理全局变量
  try {
    const globalVars = await helper.getVariables({ type: 'global' });
    const redundantGlobalPrefixes = ['character.', 'world.'];
    const globalKeys = Object.keys(globalVars).filter(key => redundantGlobalPrefixes.some(prefix => key.startsWith(prefix)));
    if (globalKeys.length > 0) {
      console.log(`[清理] 发现 ${globalKeys.length} 个全局变量需要清理...`);
      await Promise.all(globalKeys.map(key => helper.deleteVariable(key, { type: 'global' })));
      console.log(`[清理] 全局变量清理完成。`);
    }
    successCount++;
  } catch (e) {
    console.warn('[清理] 清理全局变量时出现非致命错误:', e);
    errorCount++;
  }

  // [核心移除] 根据用户要求，插件不再以任何方式干涉或清理聊天记录。
  
  // 最终根据执行结果给出反馈
  if (errorCount > 0 && successCount < 2) { // 只有在变量清理（前两步）都失败时才算真正失败
    toast.error('重置天机失败，请手动清理或刷新页面。');
    // 抛出错误以中断后续流程
    throw new Error('核心清理步骤（变量清理）失败！');
  } else {
    if (errorCount > 0) {
      toast.warning('天机已部分重置，少数非核心数据清理失败，但不影响使用。');
    } else {
      uiStore.updateLoadingText('天机已彻底重置，准备开启新道途。');
    }
    // 不再抛出错误，允许后续流程（如创角）继续
  }
}