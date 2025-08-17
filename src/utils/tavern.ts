import type { CharacterCreationData } from '../types';
import { toast } from './toast';

const GAME_DATA_VAR = 'DAD_gamedata';

/**
 * 获取TavernHelper API，适配iframe环境。
 * @returns {any} - 返回TavernHelper对象
 */
function getTavernHelper(): any {
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