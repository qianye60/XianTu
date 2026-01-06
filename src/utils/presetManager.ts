

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
import { createDadBundle, unwrapDadBundle } from './dadBundle';


export interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  savedAt: string;
  data: {
    character_name?: string;
    gender?: '男' | '女' | '其他';
    race?: string;
    current_age?: number;
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

/**
 * 导出预设为JSON文件
 * @param presetIds 要导出的预设ID数组,如果为空则导出所有预设
 */
export async function exportPresets(presetIds?: string[]): Promise<void> {
  try {
    console.log('[预设管理器] 开始导出预设:', presetIds);

    const allPresets = await loadPresets();

    // 如果指定了预设ID,则只导出这些预设,否则导出所有预设
    const presetsToExport = presetIds && presetIds.length > 0
      ? allPresets.filter(p => presetIds.includes(p.id))
      : allPresets;

    if (presetsToExport.length === 0) {
      throw new Error('没有可导出的预设');
    }

    // 使用 dad.bundle 格式包装导出数据
    const exportData = createDadBundle('presets', {
      presets: presetsToExport
    });

    // 转换为JSON字符串
    const jsonString = JSON.stringify(exportData, null, 2);

    // 创建Blob对象
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `character-presets-${timestamp}.json`;
    link.download = fileName;

    // 触发下载
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[预设管理器] 预设导出成功:', fileName);
  } catch (error) {
    console.error('[预设管理器] 导出预设失败:', error);
    throw error;
  }
}

/**
 * 从JSON文件导入预设
 * @param file 要导入的JSON文件
 * @param mode 导入模式: 'merge' 合并(默认), 'replace' 替换
 */
export async function importPresets(file: File, mode: 'merge' | 'replace' = 'merge'): Promise<{ success: number; failed: number }> {
  try {
    console.log('[预设管理器] 开始导入预设, 模式:', mode);

    // 读取文件内容
    const fileContent = await file.text();
    const rawData = JSON.parse(fileContent);

    // 使用 unwrapDadBundle 解析，兼容新旧格式
    const unwrapped = unwrapDadBundle(rawData);
    let presetsArray: CharacterPreset[];

    if (unwrapped.type === 'presets' && Array.isArray(unwrapped.payload?.presets)) {
      // 新格式: dad.bundle 包装的预设
      presetsArray = unwrapped.payload.presets;
    } else if (Array.isArray(rawData.presets)) {
      // 旧格式: { version, exportTime, presets }
      presetsArray = rawData.presets;
    } else {
      throw new Error('无效的预设文件格式');
    }

    // 统计导入结果
    let successCount = 0;
    let failedCount = 0;

    // 获取现有预设
    const existingPresets = mode === 'replace' ? [] : await loadPresets();
    const existingIds = new Set(existingPresets.map(p => p.id));

    // 处理导入的预设
    const importedPresets: CharacterPreset[] = [];

    for (const preset of presetsArray) {
      try {
        // 验证预设数据结构
        if (!preset.name || !preset.data) {
          console.warn('[预设管理器] 跳过无效预设:', preset);
          failedCount++;
          continue;
        }

        // 如果ID已存在,生成新ID
        let newId = preset.id;
        if (existingIds.has(preset.id)) {
          newId = `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log('[预设管理器] ID冲突,生成新ID:', preset.id, '->', newId);
        }

        // 创建新预设对象
        const newPreset: CharacterPreset = {
          ...preset,
          id: newId,
          savedAt: new Date().toISOString() // 更新保存时间
        };

        importedPresets.push(newPreset);
        existingIds.add(newId);
        successCount++;
      } catch (error) {
        console.error('[预设管理器] 导入预设失败:', preset, error);
        failedCount++;
      }
    }

    // 合并预设列表
    const finalPresets = mode === 'replace'
      ? importedPresets
      : [...importedPresets, ...existingPresets];

    // 保存到IndexedDB
    const updatedList: PresetList = {
      presets: finalPresets
    };

    await saveData(PRESET_LIST_KEY, updatedList);

    console.log('[预设管理器] 预设导入完成, 成功:', successCount, '失败:', failedCount);

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('[预设管理器] 导入预设失败:', error);
    throw error;
  }
}