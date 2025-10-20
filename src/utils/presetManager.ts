/**
 * @fileoverview
 * 预设管理器 - 用于保存和加载角色创建预设
 * 使用 IndexedDB 存储预设数据
 */

import { saveData, loadFromIndexedDB } from './indexedDBManager';
import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';

// 预设数据接口
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

/**
 * 获取空的预设列表
 */
function getEmptyPresetList(): PresetList {
  return {
    presets: []
  };
}

/**
 * 加载所有预设
 */
export async function loadPresets(): Promise<CharacterPreset[]> {
  try {
    console.log('[预设管理器] 开始加载预设列表');
    const data = await loadFromIndexedDB(PRESET_LIST_KEY);
    
    if (!data || !Array.isArray(data.presets)) {
      console.log('[预设管理器] 未找到预设数据，返回空列表');
      return [];
    }
    
    console.log('[预设管理器] 成功加载预设:', data.presets.length, '个');
    return data.presets;
  } catch (error) {
    console.error('[预设管理器] 加载预设失败:', error);
    return [];
  }
}

/**
 * 保存新预设
 */
export async function savePreset(preset: Omit<CharacterPreset, 'id' | 'savedAt'>): Promise<string> {
  try {
    console.log('[预设管理器] 开始保存预设:', preset.name);
    
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
    
    console.log('[预设管理器] 预设保存成功, ID:', id);
    return id;
  } catch (error) {
    console.error('[预设管理器] 保存预设失败:', error);
    throw error;
  }
}

/**
 * 删除预设
 */
export async function deletePreset(presetId: string): Promise<void> {
  try {
    console.log('[预设管理器] 开始删除预设:', presetId);
    
    const existingPresets = await loadPresets();
    const filteredPresets = existingPresets.filter(p => p.id !== presetId);
    
    if (filteredPresets.length === existingPresets.length) {
      console.warn('[预设管理器] 未找到要删除的预设:', presetId);
      return;
    }
    
    const updatedList: PresetList = {
      presets: filteredPresets
    };
    
    await saveData(PRESET_LIST_KEY, updatedList);
    console.log('[预设管理器] 预设删除成功');
  } catch (error) {
    console.error('[预设管理器] 删除预设失败:', error);
    throw error;
  }
}

/**
 * 更新预设
 */
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

/**
 * 获取单个预设
 */
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

/**
 * 清除所有预设
 */
export async function clearAllPresets(): Promise<void> {
  try {
    console.log('[预设管理器] 开始清除所有预设');
    const emptyList = getEmptyPresetList();
    await saveData(PRESET_LIST_KEY, emptyList);
    console.log('[预设管理器] 所有预设已清除');
  } catch (error) {
    console.error('[预设管理器] 清除预设失败:', error);
    throw error;
  }
}