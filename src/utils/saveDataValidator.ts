// src/utils/saveDataValidator.ts
import type { SaveData } from '@/types/game';

/**
 * 存档数据验证和自动修复工具
 */

/**
 * 修复灵根品级格式
 * 将对象格式 {quality: "神", grade: 10} 转换为字符串格式 "神品"
 */
function fixSpiritRootQuality(灵根: any): any {
  if (!灵根 || typeof 灵根 !== 'object') return 灵根;

  // 如果品级是对象格式，转换为字符串
  const 品级 = 灵根.品级;
  if (品级 && typeof 品级 === 'object' && 品级 !== null) {
    const qualityObj = 品级 as { quality?: string; grade?: number };

    // 提取品质名称
    let qualityName = qualityObj.quality || '';

    // 如果品质名称不包含"品"字，添加"品"后缀
    if (qualityName && !qualityName.endsWith('品')) {
      qualityName = `${qualityName}品`;
    }

    console.log(`[存档修复] 灵根品级格式修复: ${JSON.stringify(qualityObj)} -> "${qualityName}"`);

    return {
      ...灵根,
      品级: qualityName
    };
  }

  return 灵根;
}

/**
 * 修复出生字段，确保包含必要的字段
 */
function fixBirthField(出生: any): any {
  if (!出生) return 出生;

  // 如果出生是字符串，保持不变
  if (typeof 出生 === 'string') {
    return 出生;
  }

  // 如果出生是对象，确保有基本字段
  if (typeof 出生 === 'object') {
    // source 字段不是必需的，可以省略
    return 出生;
  }

  return 出生;
}

/**
 * 验证并修复存档数据
 * @param saveData 原始存档数据
 * @returns 修复后的存档数据和修复日志
 */
export function validateAndRepairSaveData(saveData: SaveData): {
  repairedData: SaveData;
  fixes: string[];
  hasChanges: boolean;
} {
  const fixes: string[] = [];
  let hasChanges = false;

  // 深拷贝以避免修改原始数据
  const repairedData = JSON.parse(JSON.stringify(saveData)) as SaveData;

  // 1. 修复角色基础信息中的灵根
  if (repairedData.角色基础信息?.灵根 && typeof repairedData.角色基础信息.灵根 === 'object') {
    const 灵根 = repairedData.角色基础信息.灵根 as any;
    const originalQuality = 灵根.品级;
    const fixed灵根 = fixSpiritRootQuality(灵根);
    repairedData.角色基础信息.灵根 = fixed灵根;

    if (JSON.stringify(originalQuality) !== JSON.stringify(fixed灵根.品级)) {
      fixes.push(`修复角色基础信息.灵根.品级: ${JSON.stringify(originalQuality)} -> "${fixed灵根.品级}"`);
      hasChanges = true;
    }
  }

  // 2. 修复玩家角色状态中的灵根
  const playerStatusAny = repairedData.玩家角色状态 as any;
  if (playerStatusAny?.灵根 && typeof playerStatusAny.灵根 === 'object') {
    const originalQuality = playerStatusAny.灵根.品级;
    const fixed灵根 = fixSpiritRootQuality(playerStatusAny.灵根);
    playerStatusAny.灵根 = fixed灵根;

    if (JSON.stringify(originalQuality) !== JSON.stringify(fixed灵根.品级)) {
      fixes.push(`修复玩家角色状态.灵根.品级: ${JSON.stringify(originalQuality)} -> "${fixed灵根.品级}"`);
      hasChanges = true;
    }
  }

  // 3. 修复角色基础信息中的出生
  if (repairedData.角色基础信息?.出生) {
    const originalBirth = repairedData.角色基础信息.出生;
    repairedData.角色基础信息.出生 = fixBirthField(repairedData.角色基础信息.出生);

    if (JSON.stringify(originalBirth) !== JSON.stringify(repairedData.角色基础信息.出生)) {
      fixes.push(`修复角色基础信息.出生字段`);
      hasChanges = true;
    }
  }

  // 4. 修复玩家角色状态中的出生
  if (playerStatusAny?.出生) {
    const originalBirth = playerStatusAny.出生;
    playerStatusAny.出生 = fixBirthField(playerStatusAny.出生);

    if (JSON.stringify(originalBirth) !== JSON.stringify(playerStatusAny.出生)) {
      fixes.push(`修复玩家角色状态.出生字段`);
      hasChanges = true;
    }
  }

  // 5. 确保灵根和出生在角色基础信息和玩家角色状态之间同步
  if (repairedData.角色基础信息 && repairedData.玩家角色状态) {
    if (repairedData.角色基础信息.灵根 && !playerStatusAny.灵根) {
      playerStatusAny.灵根 = repairedData.角色基础信息.灵根;
      fixes.push('同步灵根数据到玩家角色状态');
      hasChanges = true;
    }

    if (repairedData.角色基础信息.出生 && !playerStatusAny.出生) {
      playerStatusAny.出生 = repairedData.角色基础信息.出生;
      fixes.push('同步出生数据到玩家角色状态');
      hasChanges = true;
    }
  }

  return {
    repairedData,
    fixes,
    hasChanges
  };
}

/**
 * 检查存档数据是否有格式问题
 * @param saveData 存档数据
 * @returns 是否有问题
 */
export function hasSaveDataIssues(saveData: SaveData): boolean {
  // 检查灵根品级是否为对象格式
  if (saveData.角色基础信息?.灵根 && typeof saveData.角色基础信息.灵根 === 'object') {
    const 灵根 = saveData.角色基础信息.灵根 as any;
    if (灵根.品级 && typeof 灵根.品级 === 'object') {
      return true;
    }
  }

  const playerStatusAny = saveData.玩家角色状态 as any;
  if (playerStatusAny?.灵根 && typeof playerStatusAny.灵根 === 'object') {
    const 灵根 = playerStatusAny.灵根;
    if (灵根.品级 && typeof 灵根.品级 === 'object') {
      return true;
    }
  }

  return false;
}
