

/**
 * 角色创建预设管理器
 *
 * 功能:
 * - 保存和加载角色创建预设
 * - 使用IndexedDB持久化存储
 * - 支持预设的CRUD操作
 *
 * 被以下文件引用:
 * - src/components/common/PresetLoadModal.vue
 * - src/components/common/PresetSaveModal.vue
 */

/**
 * 角色创建预设管理器
 *
 * 功能:
 * - 保存和加载角色创建预设
 * - 使用IndexedDB持久化存储
 * - 支持预设的CRUD操作
 *
 * 被以下文件引用:
 * - src/components/common/PresetLoadModal.vue
 * - src/components/common/PresetSaveModal.vue
 */

import { saveData, loadFromIndexedDB } from './indexedDBManager';
import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';


export interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  savedAt: string;
  data: {
    world: World | null;
    talentTier: TalentTier | null;
    origin: Origin | null;
    spiritRoot: SpiritRoot | null;
    talents: Talent[];
    baseAttributes: {
      root_bone: number;
      spirituality: number;
      comprehension: number;
      fortune: number;
      charm: number;
      temperament: number;
    };
  };
}

// 预设列表数据接口
export interface PresetList {
  presets: CharacterPreset[];
}

// IndexedDB 键名
const PRESET_LIST_KEY = 'character_presets';


function getEmptyPresetList(): PresetList {
  return {
    presets: []
  };
}


export async function loadPresets(): Promise<CharacterPreset[]> {
  try {
    
    const data = await loadFromIndexedDB(PRESET_LIST_KEY);

    if (!data || !Array.isArray(data.presets)) {
      
      return [];
    }

    
    return data.presets;
  } catch (error) {
    console.error('[预设管理器] 加载预设失败:', error);
    return [];
  }
}


export async function savePreset(preset: Omit<CharacterPreset, 'id' | 'savedAt'>): Promise<string> {
  try {
    

    // 生成唯一ID
    const id = `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const savedAt = new Date().toISOString();

    // 创建完整的预设对象
    const newPreset: CharacterPreset = {
      id,
      savedAt,
      ...preset
    };

    // 加载现有预设列表
    const existingPresets = await loadPresets();

    // 添加新预设到列表开头
    const updatedList: PresetList = {
      presets: [newPreset, ...existingPresets]
    };

    // 保存到 IndexedDB
    await saveData(PRESET_LIST_KEY, updatedList);

    
    return id;
  } catch (error) {
    console.error('[预设管理器] 保存预设失败:', error);
    throw error;
  }
}


export async function deletePreset(presetId: string): Promise<void> {
  try {
    

    const existingPresets = await loadPresets();
    const filteredPresets = existingPresets.filter(p => p.id !== presetId);

    if (filteredPresets.length === existingPresets.length) {
      
      return;
    }

    const updatedList: PresetList = {
      presets: filteredPresets
    };

    await saveData(PRESET_LIST_KEY, updatedList);
    
  } catch (error) {
    console.error('[预设管理器] 删除预设失败:', error);
    throw error;
  }
}


export async function updatePreset(presetId: string, updates: Partial<Omit<CharacterPreset, 'id' | 'savedAt'>>): Promise<void> {
  try {
    console.log('[预设管理器] 开始更新预设:', presetId);

    const existingPresets = await loadPresets();
    const presetIndex = existingPresets.findIndex(p => p.id === presetId);

    if (presetIndex === -1) {
      throw new Error(`未找到预设: ${presetId}`);
    }

    // 更新预设
    existingPresets[presetIndex] = {
      ...existingPresets[presetIndex],
      ...updates
    };

    const updatedList: PresetList = {
      presets: existingPresets
    };

    await saveData(PRESET_LIST_KEY, updatedList);
    console.log('[预设管理器] 预设更新成功');
  } catch (error) {
    console.error('[预设管理器] 更新预设失败:', error);
    throw error;
  }
}


export async function getPreset(presetId: string): Promise<CharacterPreset | null> {
  try {
    const presets = await loadPresets();
    const preset = presets.find(p => p.id === presetId);
    return preset || null;
  } catch (error) {
    console.error('[预设管理器] 获取预设失败:', error);
    return null;
  }
}


export async function clearAllPresets(): Promise<void> {
  try {
    
    const emptyList = getEmptyPresetList();
    await saveData(PRESET_LIST_KEY, emptyList);
    
  } catch (error) {
    console.error('[预设管理器] 清除预设失败:', error);
    throw error;
  }
}