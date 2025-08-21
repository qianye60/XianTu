import type { DADCustomData } from '../types';
import { toast } from './toast';

// 为 TavernHelper API 定义一个接口，以增强类型安全
interface TavernHelper {
  getVariables(options: { type: 'global' | 'chat' }): Promise<Record<string, unknown>>;
  insertOrAssignVariables(data: Record<string, any>, options: { type: 'global' | 'chat' }): Promise<void>;
  getCharData(): Promise<{ name: string } | null>;
  substitudeMacros(macro: string): Promise<string>;
  triggerSlash(command: string): Promise<void>;
  getLorebooks(): Promise<string[]>;
  createLorebook(name: string): Promise<void>;
  getLorebookEntries(name: string): Promise<LorebookEntry[]>;
  setLorebookEntries(name: string, entries: Partial<LorebookEntry>[]): Promise<void>;
  createLorebookEntries(name: string, entries: unknown[]): Promise<void>;
  generateRaw(prompt: string, options?: { temperature?: number; top_p?: number; max_tokens?: number }): Promise<string>;
  settings?: {
    token?: string;
  };
  // 新增聊天记录相关API
  getChatHistory(): Promise<any[] | null>;
  setChatHistory(history: any[]): Promise<void>;
}

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
 * 重命名当前酒馆角色。
 * @param {string} newName - 新的角色名称。
 */
export async function renameCurrentCharacter(newName: string): Promise<void> {
  if (!newName || !newName.trim()) {
    toast.warning('道号不可为空。');
    return;
  }

  const helper = getTavernHelper();
  if (!helper) {
    toast.error('连接酒馆失败，无法更改道号。');
    return;
  }

  try {
    await helper.triggerSlash(`/rename-char "${newName.trim()}"`);
    toast.success(`道号已成功更改为: ${newName.trim()}`);
  } catch (error) {
    console.error('重命名酒馆角色时出错:', error);
    toast.error('更改道号失败！');
  }
}

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