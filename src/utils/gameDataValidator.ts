import type { SaveData, CharacterProfile } from '@/types/game.d.ts';
import { debug } from './debug';

/**
 * 定义验证结果的接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 验证游戏存档数据的核心函数
 * @param saveData 存档数据
 * @param profile 角色配置
 * @returns ValidationResult 验证结果对象
 */
export function validateGameData(saveData: SaveData, profile: CharacterProfile, context: 'creation' | 'loading' = 'creation'): ValidationResult {
  const errors: string[] = [];

  debug.log('数据验证', `开始检查数据骨架 (上下文: ${context})...`);

  // 1. 检查背包物品 (Inventory)
  // ⚠️ 重要：`背包.物品` 必须是对象结构 Record<string, Item>，不是数组
  if (saveData.背包 && saveData.背包.物品 !== undefined) {
    if (typeof saveData.背包.物品 !== 'object' || saveData.背包.物品 === null || Array.isArray(saveData.背包.物品)) {
      errors.push('核心数据错误：`背包.物品` 结构不正确，必须是一个对象 (Record<string, Item>)，不能是数组。这可能是由于旧版存档数据不兼容导致的。');
    }
  } else {
    // 如果连背包或物品字段都没有，也算作错误
    errors.push('数据缺失：`背包.物品` 字段不存在。');
  }

  // 2. 跳过外层角色基础信息的灵根检查
  // 外层的角色基础信息.灵根可以是字符串格式（如"随机灵根"），这是正常的
  // 只需要确保存档数据内部的结构是正确的
  debug.log('数据验证', '跳过外层角色基础信息的灵根验证，外层允许字符串格式');

  // 3. 检查存档数据内部的关键结构（如果需要的话）
  // 这里可以添加对 saveData 内部结构的检查

  // 未来可以添加更多检查...
  // 例如：检查玩家状态对象是否存在，vitals结构是否正确等

  const isValid = errors.length === 0;

  if (isValid) {
    debug.log('数据验证', '数据骨架检查通过，结构有效。');
  } else {
    debug.error('数据验证', '数据骨架检查失败！发现以下问题:', errors);
  }

  return {
    isValid,
    errors,
  };
}