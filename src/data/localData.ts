import type { LocalCharacter, World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';
import { toast } from '@/utils/toast';

// =======================================================================
//                           核心数据结构定义
// =======================================================================

// =======================================================================

// 单个势力的结构
export interface Faction {
  name: string;
  type: string;
  alignment: string;
  location: string;
  powerLevel: string;
  description: string;
}

// 扩展后的本地角色，包含其所在世界的演化数据
export interface LocalCharacterWithGameData extends LocalCharacter {
  worldData: {
    continentName: string | null;
    continentDescription: string | null;
    factions: Faction[];
    mapInfo: any; // 用于存储未来的Leaflet地图数据 (例如 GeoJSON)
  };
}

// 酒馆变量中存储的完整游戏数据结构
export interface DADGameData {
  characters: Record<number, LocalCharacterWithGameData>;
  customData: {
    worlds: World[];
    talentTiers: TalentTier[];
    origins: Origin[];
    spiritRoots: SpiritRoot[];
    talents: Talent[];
  };
  version: string;
  lastUpdated: string;
}

const GAME_DATA_KEY = 'DAD_gamedata';
const CURRENT_VERSION = '1.0.0';

// =======================================================================
//                           核心数据操作函数
// =======================================================================

/**
 * 获取一个默认的、空的本地游戏数据结构
 */
function getEmptyGameData(): DADGameData {
  return {
    characters: {},
    customData: {
      worlds: [],
      talentTiers: [],
      origins: [],
      spiritRoots: [],
      talents: [],
    },
    version: CURRENT_VERSION,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 从酒馆变量中加载完整的本地游戏数据
 * @returns {Promise<DADGameData>}
 */
export async function loadGameData(): Promise<DADGameData> {
  if (!window.SillyTavern?.getContext) {
    console.warn('非酒馆环境，无法加载本地数据。');
    return getEmptyGameData();
  }
  try {
    const context = window.SillyTavern.getContext();
    const gameDataString = context.vars[GAME_DATA_KEY];
    if (gameDataString) {
      const gameData = JSON.parse(gameDataString);
      // TODO: 在此可添加版本迁移逻辑
      return gameData;
    }
    return getEmptyGameData();
  } catch (error) {
    console.error('加载本地游戏数据失败:', error);
    toast.error('读取本地洞天存档失败，可能已损坏。');
    return getEmptyGameData();
  }
}

/**
 * 将完整的本地游戏数据保存到酒馆变量
 * @param {DADGameData} gameData
 */
export async function saveGameData(gameData: DADGameData): Promise<void> {
  if (!window.SillyTavern?.getContext) {
    console.warn('非酒馆环境，无法保存本地数据。');
    return;
  }
  try {
    gameData.lastUpdated = new Date().toISOString();
    const context = window.SillyTavern.getContext();
    context.vars[GAME_DATA_KEY] = JSON.stringify(gameData);
  } catch (error) {
    console.error('保存本地游戏数据失败:', error);
    toast.error('本地洞天存档失败！');
  }
}

/**
 * 获取所有本地角色列表
 * @returns {Promise<LocalCharacterWithGameData[]>}
 */
export async function loadLocalCharacters(): Promise<LocalCharacterWithGameData[]> {
    const gameData = await loadGameData();
    return Object.values(gameData.characters);
}

/**
 * 添加或更新一个本地角色
 * @param {LocalCharacterWithGameData} character
 */
export async function saveLocalCharacter(character: LocalCharacterWithGameData): Promise<void> {
    const gameData = await loadGameData();
    gameData.characters[character.id] = character;
    await saveGameData(gameData);
}

/**
 * 删除一个本地角色
 * @param {number} characterId
 */
export async function deleteLocalCharacter(characterId: number): Promise<void> {
    const gameData = await loadGameData();
    if (gameData.characters[characterId]) {
        delete gameData.characters[characterId];
        await saveGameData(gameData);
    }
}

/**
 * 加载所有自定义数据
 */
export async function loadCustomData(): Promise<DADGameData['customData']> {
    const gameData = await loadGameData();
    return gameData.customData;
}

/**
 * 保存所有自定义数据
 * @param {Partial<DADGameData['customData']>} customDataUpdate
 */
export async function saveCustomData(customDataUpdate: Partial<DADGameData['customData']>): Promise<void> {
    const gameData = await loadGameData();
    gameData.customData = { ...gameData.customData, ...customDataUpdate };
    await saveGameData(gameData);
}