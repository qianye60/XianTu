/**
 * 指令对象格式验证器
 *
 * 功能:
 * - 验证AI返回的tavern_commands指令格式
 * - 清理多余字段,确保指令符合规范
 * - 检查必需字段和值类型
 *
 * 被以下文件引用:
 * - src/utils/AIBidirectionalSystem.ts (动态导入)
 */

import type { TavernCommand } from '@/types/AIGameMaster';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  invalidCommands?: Array<{ command: any; errors: string[] }>; // 记录无效指令
}

/**
 * 验证单个指令对象
 */
export function validateCommand(command: unknown, index: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. 检查必需字段
    if (!command || typeof command !== 'object') {
      errors.push(`指令${index}: 不是有效的对象`);
      return { valid: false, errors, warnings };
    }

    // Type assertion after validation
    const cmd = command as Record<string, any>;

    if (!cmd.action) {
      errors.push(`指令${index}: 缺少action字段`);
    }

    if (!cmd.key) {
      errors.push(`指令${index}: 缺少key字段`);
    }

    // 2. 检查action类型
    const validActions = ['set', 'add', 'push', 'delete', 'pull'];
    if (cmd.action && !validActions.includes(cmd.action)) {
      errors.push(`指令${index}: action值"${cmd.action}"无效，必须是: ${validActions.join(', ')}`);
    }

    // 3. 检查key格式
    if (cmd.key && typeof cmd.key !== 'string') {
      errors.push(`指令${index}: key必须是字符串类型`);
    }

    // 4. 检查value（delete操作除外）
    if (cmd.action !== 'delete' && cmd.value === undefined) {
      errors.push(`指令${index}: ${cmd.action}操作必须提供value字段`);
    }

    // 5. 检查多余字段（scope虽然在类型中但不应使用）
    const allowedFields = ['action', 'key', 'value'];
    const extraFields = Object.keys(cmd).filter(k => !allowedFields.includes(k));
    if (extraFields.length > 0) {
      warnings.push(`指令${index}: 包含多余字段: ${extraFields.join(', ')}（这些字段会被自动移除）`);
    }

    // 6. 特定路径的值类型检查
    if (cmd.key && cmd.value !== undefined) {
      try {
        const typeErrors = validateValueType(cmd.key, cmd.value, cmd.action);
        errors.push(...typeErrors.map(e => `指令${index}: ${e}`));
      } catch (e) {
        console.error('[指令验证] 值类型检查异常:', e);
        warnings.push(`指令${index}: 值类型检查时发生异常，已跳过`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    console.error('[指令验证] validateCommand发生严重异常:', error);
    errors.push(`指令${index}: 验证过程发生严重异常`);
    return { valid: false, errors, warnings };
  }
}

/**
 * 验证值类型是否符合路径要求
 */
function validateValueType(key: string, value: unknown, action: string): string[] {
  const errors: string[] = [];

  try {

  // 数值类型字段
  const numberFields = [
    '游戏时间.年', '游戏时间.月', '游戏时间.日', '游戏时间.小时', '游戏时间.分钟',
    '玩家角色状态.声望',
    '玩家角色状态.气血.当前', '玩家角色状态.气血.上限',
    '玩家角色状态.灵气.当前', '玩家角色状态.灵气.上限',
    '玩家角色状态.神识.当前', '玩家角色状态.神识.上限',
    '玩家角色状态.寿命.当前', '玩家角色状态.寿命.上限',
    '背包.灵石.下品', '背包.灵石.中品', '背包.灵石.上品', '背包.灵石.极品',
    '宗门信息.贡献', '宗门信息.声望'
  ];

  // 后天六司字段
  const houTianFields = ['根骨', '灵性', '悟性', '气运', '魅力', '心性'];

  if (action === 'add') {
    // 检查数值字段
    if (numberFields.some(f => key === f || key.endsWith(`.${f.split('.').pop()}`))) {
      if (typeof value !== 'number') {
        errors.push(`${key}使用add操作时value必须是数字，当前类型: ${typeof value}`);
      }
    }
    // 检查后天六司
    if (key.includes('后天六司.') && houTianFields.some(f => key.endsWith(`.${f}`))) {
      if (typeof value !== 'number') {
        errors.push(`${key}使用add操作时value必须是数字，当前类型: ${typeof value}`);
      }
    }
  }

  // 玩家境界对象
  if (key === '玩家角色状态.境界' && action === 'set') {
    if (typeof value !== 'object' || value === null) {
      errors.push('境界必须是对象类型');
    } else {
      const val = value as Record<string, any>;
      // 只检查类型，不强制要求所有字段
      if (val.名称 !== undefined && typeof val.名称 !== 'string') {
        errors.push('境界.名称必须是字符串类型');
      }
      if (val.阶段 !== undefined && typeof val.阶段 !== 'string') {
        errors.push('境界.阶段必须是字符串类型');
      }
      if (val.当前进度 !== undefined && typeof val.当前进度 !== 'number') {
        errors.push('境界.当前进度必须是数字类型');
      }
      if (val.下一级所需 !== undefined && typeof val.下一级所需 !== 'number') {
        errors.push('境界.下一级所需必须是数字类型');
      }
      if (val.突破描述 !== undefined && typeof val.突破描述 !== 'string') {
        errors.push('境界.突破描述必须是字符串类型');
      }
    }
  }

  // 位置对象
  if (key === '玩家角色状态.位置' && action === 'set') {
    if (typeof value !== 'object' || value === null) {
      errors.push('位置必须是对象类型');
    } else {
      const val = value as Record<string, any>;
      // 只检查类型，不强制要求所有字段
      if (val.描述 !== undefined && typeof val.描述 !== 'string') {
        errors.push('位置.描述必须是字符串类型');
      }
      if (val.x !== undefined && typeof val.x !== 'number') {
        errors.push('位置.x必须是数字类型');
      }
      if (val.y !== undefined && typeof val.y !== 'number') {
        errors.push('位置.y必须是数字类型');
      }
    }
  }

  // 状态效果数组
  if (key === '玩家角色状态.状态效果' && action === 'push') {
    if (typeof value !== 'object' || value === null) {
      errors.push('状态效果必须是对象类型');
    } else {
      const val = value as Record<string, any>;
      // 只检查关键字段类型
      if (val.类型 !== undefined && !['buff', 'debuff'].includes(val.类型)) {
        errors.push(`状态效果类型必须是"buff"或"debuff"，当前值: ${val.类型}`);
      }
      if (val.持续时间分钟 !== undefined && typeof val.持续时间分钟 !== 'number') {
        errors.push('状态效果.持续时间分钟必须是数字类型');
      }
    }
  }

  // 物品对象 (push to inventory) - 放宽验证
  if (key === '背包.物品' && action === 'push') {
    if (typeof value !== 'object' || value === null) {
      errors.push('推送到 背包.物品 的物品必须是对象类型');
    }
    // 不再强制检查所有字段，由数据修复器处理
  }

  // 物品对象 - 放宽验证
  if (key.startsWith('背包.物品.') && action === 'set' && !key.includes('.数量') && !key.includes('.修炼进度')) {
    if (typeof value !== 'object' || value === null) {
      errors.push('物品必须是对象类型');
    } else {
      const val = value as Record<string, any>;
      // 只检查功法技能的基本结构
      if (val.类型 === '功法' && val.功法技能) {
        if (!Array.isArray(val.功法技能)) {
          errors.push('功法物品的功法技能必须是数组类型');
        } else {
          // 只检查技能对象类型，不检查字段完整性
          val.功法技能.forEach((skill: any, idx: number) => {
            if (typeof skill !== 'object' || skill === null) {
              errors.push(`功法技能[${idx}]必须是对象类型`);
            }
          });
        }
      }
    }
  }

  // NPC创建/更新 - 放宽验证
  if (key.startsWith('人物关系.') && (key.match(/\./g) || []).length === 1) {
    if (action === 'set' && typeof value === 'object' && value !== null) {
      const val = value as Record<string, any>;

      // 只检查关键结构，不强制要求所有字段
      if (val.境界) {
        if (typeof val.境界 !== 'object' || val.境界 === null) {
          errors.push('NPC境界必须是对象类型');
        } else {
          const realmAllowed = ['名称', '阶段'];
          const realmExtra = Object.keys(val.境界).filter(f => !realmAllowed.includes(f));
          if (realmExtra.length > 0) {
            errors.push(`NPC境界对象包含非法字段: ${realmExtra.join(', ')}。NPC境界只能有"名称"和"阶段"字段`);
          }
        }
      }

      // 检查天赋格式（如果存在）
      if (val.天赋 !== undefined && !Array.isArray(val.天赋)) {
        errors.push('NPC天赋必须是数组类型');
      }

      // 检查私密信息格式（如果存在）
      if (val.私密信息) {
        if (typeof val.私密信息 !== 'object' || val.私密信息 === null) {
          errors.push('NPC私密信息必须是对象类型');
        } else if (val.私密信息.身体部位 !== undefined && !Array.isArray(val.私密信息.身体部位)) {
          errors.push('NPC私密信息.身体部位必须是数组类型');
        }
      }
    }
  }

  // NPC境界单独更新检查
  if (key.includes('人物关系.') && key.endsWith('.境界') && action === 'set') {
    if (typeof value !== 'object' || value === null) {
      errors.push('NPC境界必须是对象类型');
    } else {
      const val = value as Record<string, any>;
      const allowed = ['名称', '阶段'];
      const extra = Object.keys(val).filter(f => !allowed.includes(f));
      if (extra.length > 0) {
        errors.push(`NPC境界对象包含非法字段: ${extra.join(', ')}。NPC境界只能有"名称"和"阶段"字段`);
      }
    }
  }

  // 三千大道验证 - 放宽验证
  if (key.startsWith('三千大道.大道列表.') && action === 'set' && (key.match(/\./g) || []).length === 2) {
    if (typeof value !== 'object' || value === null) {
      errors.push('大道对象必须是对象类型');
    } else {
      const val = value as Record<string, any>;
      // 只检查阶段列表的类型
      if (val.阶段列表 !== undefined && !Array.isArray(val.阶段列表)) {
        errors.push('大道.阶段列表必须是数组类型');
      }
    }
  }

  // 任务对象验证 - 放宽验证
  if (key === '任务系统.当前任务列表' && action === 'push') {
    if (typeof value !== 'object' || value === null) {
      errors.push('任务对象必须是对象类型');
    }
    // 不再强制检查所有字段
  }

  return errors;
  } catch (error) {
    console.error('[指令验证] validateValueType发生异常:', error);
    errors.push(`验证过程发生异常: ${error instanceof Error ? error.message : String(error)}`);
    return errors;
  }
}

/**
 * 验证整个指令数组
 */
export function validateCommands(commands: unknown[]): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const invalidCommands: Array<{ command: any; errors: string[] }> = [];

  try {
    if (!Array.isArray(commands)) {
      return {
        valid: false,
        errors: ['tavern_commands必须是数组类型'],
        warnings: [],
        invalidCommands: []
      };
    }

    commands.forEach((cmd, index) => {
      try {
        const result = validateCommand(cmd, index);
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);

        // 记录无效指令
        if (result.errors.length > 0) {
          invalidCommands.push({
            command: cmd,
            errors: result.errors
          });
        }
      } catch (error) {
        console.error(`[指令验证] 验证指令${index}时发生异常:`, error);
        allErrors.push(`指令${index}: 验证时发生异常`);
        allWarnings.push(`指令${index}: 已跳过异常指令`);
      }
    });

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      invalidCommands
    };
  } catch (error) {
    console.error('[指令验证] validateCommands发生严重异常:', error);
    return {
      valid: false,
      errors: ['指令数组验证过程发生严重异常'],
      warnings: [],
      invalidCommands: []
    };
  }
}

/**
 * 清理指令对象，移除多余字段
 */
export function cleanCommand(command: TavernCommand): TavernCommand {
  const { action, key, value } = command;
  const cleaned: TavernCommand = { action, key, value };

  // 只保留必需字段
  if (action === 'delete') {
    delete cleaned.value;
  }

  return cleaned;
}

/**
 * 清理指令数组
 */
export function cleanCommands(commands: TavernCommand[]): TavernCommand[] {
  return commands.map(cleanCommand);
}
