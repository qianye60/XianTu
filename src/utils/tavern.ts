import type { CharacterCreationData } from '../types';
import { toast } from './toast';

const GAME_DATA_VAR = 'DAD_gamedata';

/**
 * 获取TavernHelper API，适配iframe环境。
 * @returns {any} - 返回TavernHelper对象
 */
export function getTavernHelper(): any {
  // @ts-ignore
  if (window.parent?.TavernHelper) {
    // @ts-ignore
    return window.parent.TavernHelper;
  }
  console.error('TavernHelper API not found in window.parent.');
  return null;
}

/**
 * 从酒馆全局变量中加载整个游戏创建数据。
 * @returns {Promise<Partial<CharacterCreationData>>} - 返回保存的游戏数据，如果不存在则返回空对象。
 */
export async function loadGameData(): Promise<Partial<CharacterCreationData>> {
  const helper = getTavernHelper();
  if (!helper) {
    toast.error('连接酒馆失败，无法读取存档。');
    return {};
  }

  try {
    const variables = await helper.getVariables({ type: 'global' });
    if (variables && variables[GAME_DATA_VAR]) {
      // Tavern a- bizarrely returns a string that is a JSON object, needs double parse
      if (typeof variables[GAME_DATA_VAR] === 'string') {
        try {
          return JSON.parse(variables[GAME_DATA_VAR]);
        } catch (e) {
          // 解析失败，说明数据格式有问题，返回空对象
          console.error('Failed to parse game data from string, returning empty object.', e);
          return {};
        }
      }
      return variables[GAME_DATA_VAR];
    }
    return {};
  } catch (error) {
    console.error('读取酒馆存档时出错:', error);
    toast.error('读取存档失败！');
    return {};
  }
}

/**
 * 将整个游戏创建数据保存到酒馆全局变量中。
 * @param {CharacterCreationData} data - 要保存的完整游戏数据。
 */
export async function saveGameData(data: CharacterCreationData): Promise<void> {
  const helper = getTavernHelper();
  if (!helper) {
    toast.error('连接酒馆失败，无法保存进度。');
    return;
  }

  try {
    const dataToSave = {
      [GAME_DATA_VAR]: JSON.stringify(data)
    };
    await helper.insertOrAssignVariables(dataToSave, { type: 'global' });
    // 不需要每次都提示成功，避免干扰
    console.log('游戏数据已保存至酒馆变量:', GAME_DATA_VAR);
  } catch (error) {
    console.error('保存进度至酒馆时出错:', error);
    toast.error('自动保存进度失败！');
  }
}

/**
 * 获取当前酒馆角色的名称。
 * @returns {Promise<string | null>} - 返回当前角色名称，如果失败则返回null。
 */
export async function getCurrentCharacterName(): Promise<string | null> {
  const helper = getTavernHelper();
  if (!helper) {
    toast.error('连接酒馆失败，无法获取角色名称。');
    return null;
  }

  try {
    // getCharData() 不带参数时，通常会返回当前选中的角色
    const charData = await helper.getCharData();
    if (charData && charData.name) {
      return charData.name;
    }
    // 作为备用方案，尝试使用宏
    const userName = await helper.substitudeMacros('{{user}}');
    if (userName && userName !== '{{user}}') {
      return userName;
    }

    toast.warning('无法获取当前角色名称。');
    return null;
  } catch (error) {
    console.error('获取酒馆角色名称时出错:', error);
    toast.error('获取角色名称失败！');
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
    // 使用 /rename-char 命令
    await helper.triggerSlash(`/rename-char "${newName.trim()}"`);
    toast.success(`道号已成功更改为: ${newName.trim()}`);
  } catch (error) {
    console.error('重命名酒馆角色时出错:', error);
    toast.error('更改道号失败！');
  }
}

/**
 * 在酒馆中为指定世界创建或更新世界书条目。
 * @param {string} worldName - 世界的名称，将作为条目的标题(comment)和关键词(key)。
 * @param {string} worldDescription - 世界的详细描述，将作为条目的内容(content)。
 */
// 为酒馆世界书条目定义一个最小化的接口以确保类型安全
interface LorebookEntry {
  uid: number;
  comment: string;
  keys: string[];
}

export async function createWorldLorebookEntry(worldName: string, worldDescription: string): Promise<void> {
  const helper = getTavernHelper();
  if (!helper) {
    toast.error('连接酒馆失败，无法铭刻世界法则。');
    return;
  }

  const LOREBOOK_NAME = '【世界】';

  try {
    // 1. 检查世界书是否存在，不存在则创建
    const lorebooks = await helper.getLorebooks();
    if (!lorebooks.includes(LOREBOOK_NAME)) {
      await helper.createLorebook(LOREBOOK_NAME);
      toast.info(`已为您开辟新的世界书卷宗：《${LOREBOOK_NAME}》`);
    }

    // 2. 检查是否已存在同名条目
    const entries: LorebookEntry[] = await helper.getLorebookEntries(LOREBOOK_NAME);
    const existingEntry = entries.find(entry => entry.comment === worldName || entry.keys.includes(worldName));

    if (existingEntry) {
      // 3. 更新现有条目
      await helper.setLorebookEntries(LOREBOOK_NAME, [{
        uid: existingEntry.uid,
        content: worldDescription,
      }]);
      toast.success(`《${LOREBOOK_NAME}》中关于“${worldName}”的记载已更新。`);
    } else {
      // 4. 创建新条目
      await helper.createLorebookEntries(LOREBOOK_NAME, [{
        comment: worldName, // 条目标题
        keys: [worldName], // 关键词
        content: worldDescription, // 条目内容
        enabled: true,
        position: 'before_character_definition', // 一个合理的默认位置
      }]);
      toast.success(`新的世界法则“${worldName}”已成功铭刻于《${LOREBOOK_NAME}》`);
    }

  } catch (error) {
    console.error('铭刻世界法则时出错:', error);
    toast.error('铭刻世界法则失败！');
  }
}