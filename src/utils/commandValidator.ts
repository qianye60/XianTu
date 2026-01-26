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
 * 🔒 完全禁止AI操作的路径（系统管理，AI不得触碰）
 */
const FORBIDDEN_PATHS: string[] = [
  '社交.记忆',           // 玩家记忆由系统自动管理
  '角色.身份',           // 角色身份信息只读
  '角色.装备',           // 装备系统只读
  '角色.技能.掌握技能',  // 已掌握技能只读
];

/**
 * 🔒 禁止被置空/删除/整体替换的核心路径（只允许子字段操作）
 */
const PROTECTED_ROOT_PATHS: string[] = [
  // 顶级根路径
  '角色',
  '社交',
  '元数据',
  '世界',
  '系统',

  // 角色子结构
  '角色.属性',
  '角色.属性.境界',
  '角色.属性.气血',
  '角色.属性.灵气',
  '角色.属性.神识',
  '角色.属性.寿命',
  '角色.背包',
  '角色.背包.物品',
  '角色.背包.货币',
  '角色.功法',
  '角色.功法.功法进度',
  '角色.大道',
  '角色.大道.大道列表',
  '角色.效果',
  '角色.位置',
  '角色.技能',

  // 社交子结构
  '社交.关系',
  '社交.关系矩阵',
  '社交.关系矩阵.edges',
  '社交.事件',
  '社交.事件.事件记录',

  // 元数据子结构
  '元数据.时间',
  '元数据.游戏设置',

  // 世界子结构
  '世界.地图',
  '世界.势力',
];

/**
 * 检查路径是否被禁止操作
 */
function checkForbiddenPath(key: string, action: string): string | null {
  // 检查完全禁止的路径
  for (const forbidden of FORBIDDEN_PATHS) {
    if (key === forbidden || key.startsWith(`${forbidden}.`)) {
      return `路径 "${key}" 禁止AI操作（系统保护字段）`;
    }
  }

  // 检查核心路径的危险操作（set整体/delete）
  if (action === 'set' || action === 'delete') {
    for (const protected_path of PROTECTED_ROOT_PATHS) {
      if (key === protected_path) {
        return `禁止对核心路径 "${key}" 执行 ${action} 操作（会导致数据丢失）`;
      }
    }
  }

  return null;
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

    // 🔒 4. 核心路径保护检查
    if (cmd.key && cmd.action) {
      const forbiddenError = checkForbiddenPath(cmd.key, cmd.action);
      if (forbiddenError) {
        errors.push(`指令${index}: ${forbiddenError}`);
      }
    }

    // 5. 检查value（delete操作除外）
    if (cmd.action !== 'delete' && cmd.value === undefined) {
      errors.push(`指令${index}: ${cmd.action}操作必须提供value字段`);
    }

    // 6. 检查多余字段（scope虽然在类型中但不应使用）
    const allowedFields = ['action', 'key', 'value'];
    const extraFields = Object.keys(cmd).filter(k => !allowedFields.includes(k));
    if (extraFields.length > 0) {
      warnings.push(`指令${index}: 包含多余字段: ${extraFields.join(', ')}（这些字段会被自动移除）`);
    }

    // 7. 特定路径的值类型检查
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
    const allowedRoots = ['元数据', '角色', '社交', '世界', '系统'] as const;
    const isV3Key = allowedRoots.some((root) => key === root || key.startsWith(`${root}.`));
    if (!isV3Key) {
      errors.push(`key必须以 ${allowedRoots.join(' / ')} 开头（V3短路径），当前: ${key}`);
      return errors;
    }

    // 数值字段（只做最常见的严格校验，其它复杂结构由运行期校验器兜底）
    const numberFields = [
      '元数据.时间.年',
      '元数据.时间.月',
      '元数据.时间.日',
      '元数据.时间.小时',
      '元数据.时间.分钟',
      '角色.属性.声望',
      '角色.属性.气血.当前',
      '角色.属性.气血.上限',
      '角色.属性.灵气.当前',
      '角色.属性.灵气.上限',
      '角色.属性.神识.当前',
      '角色.属性.神识.上限',
      '角色.属性.寿命.当前',
      '角色.属性.寿命.上限',
    ];

    const houTianFields = ['根骨', '灵性', '悟性', '气运', '魅力', '心性'];

    if (action === 'add') {
      if (numberFields.includes(key) && typeof value !== 'number') {
        errors.push(`${key} 使用 add 时 value 必须是数字，当前类型: ${typeof value}`);
      }

      // 新货币系统：角色.背包.货币.<币种ID>.数量
      if (key.startsWith('角色.背包.货币.') && key.endsWith('.数量') && typeof value !== 'number') {
        errors.push(`${key} 使用 add 时 value 必须是数字，当前类型: ${typeof value}`);
      }

      if (key.startsWith('角色.身份.后天六司.') && houTianFields.some((f) => key.endsWith(`.${f}`))) {
        if (typeof value !== 'number') {
          errors.push(`${key} 使用 add 时 value 必须是数字，当前类型: ${typeof value}`);
        }
      }
    }

    // 玩家境界对象
    if (key === '角色.属性.境界' && action === 'set') {
      if (typeof value !== 'object' || value === null) {
        errors.push('角色.属性.境界 必须是对象类型');
      } else {
        const val = value as Record<string, any>;
        if (val.名称 !== undefined && typeof val.名称 !== 'string') errors.push('境界.名称必须是字符串类型');
        if (val.阶段 !== undefined && typeof val.阶段 !== 'string') errors.push('境界.阶段必须是字符串类型');
        if (val.当前进度 !== undefined && typeof val.当前进度 !== 'number') errors.push('境界.当前进度必须是数字类型');
        if (val.下一级所需 !== undefined && typeof val.下一级所需 !== 'number') errors.push('境界.下一级所需必须是数字类型');
        if (val.突破描述 !== undefined && typeof val.突破描述 !== 'string') errors.push('境界.突破描述必须是字符串类型');
      }
    }

    // 玩家位置对象（x/y 可选）
    if (key === '角色.位置' && action === 'set') {
      if (typeof value !== 'object' || value === null) {
        errors.push('角色.位置 必须是对象类型');
      } else {
        const val = value as Record<string, any>;
        if (val.描述 !== undefined && typeof val.描述 !== 'string') errors.push('位置.描述必须是字符串类型');
        if (val.x !== undefined && typeof val.x !== 'number') errors.push('位置.x必须是数字类型');
        if (val.y !== undefined && typeof val.y !== 'number') errors.push('位置.y必须是数字类型');
        if (val.地图ID !== undefined && typeof val.地图ID !== 'string') errors.push('位置.地图ID必须是字符串类型');
      }
    }

    // 状态效果数组
    if (key === '角色.效果' && action === 'push') {
      if (typeof value !== 'object' || value === null) {
        errors.push('角色.效果 push 的 value 必须是对象类型');
      } else {
        const val = value as Record<string, any>;
        if (val.类型 !== undefined && !['buff', 'debuff'].includes(val.类型)) {
          errors.push(`状态效果类型必须是"buff"或"debuff"，当前值: ${val.类型}`);
        }
        if (val.持续时间分钟 !== undefined && typeof val.持续时间分钟 !== 'number') {
          errors.push('状态效果.持续时间分钟必须是数字类型');
        }
      }
    }

    // 物品对象（push 到背包）
    if (key === '角色.背包.物品' && action === 'push') {
      if (typeof value !== 'object' || value === null) {
        errors.push('推送到 角色.背包.物品 的物品必须是对象类型');
      }
    }

    // 物品对象（set 完整物品）
    if (key.startsWith('角色.背包.物品.') && action === 'set') {
      const dotCount = (key.match(/\./g) || []).length;
      const isWholeItem = dotCount === 3;
      if (isWholeItem && (typeof value !== 'object' || value === null)) {
        errors.push('物品必须是对象类型');
      }
    }

    // NPC 创建/覆盖（仅在 set 社交.关系.<npc> 时做轻量检查）
    if (key.startsWith('社交.关系.') && (key.match(/\./g) || []).length === 2 && action === 'set') {
      if (typeof value === 'object' && value !== null) {
        const val = value as Record<string, any>;
        if (val.境界 && (typeof val.境界 !== 'object' || val.境界 === null)) errors.push('NPC境界必须是对象类型');
        if (val.天赋 !== undefined && !Array.isArray(val.天赋)) errors.push('NPC天赋必须是数组类型');
      }
    }

    // NPC 境界更新（社交.关系.<npc>.境界）
    if (key.startsWith('社交.关系.') && key.endsWith('.境界') && action === 'set') {
      if (typeof value !== 'object' || value === null) {
        errors.push('NPC境界必须是对象类型');
      } else {
        const val = value as Record<string, any>;
        if (val.名称 !== undefined && typeof val.名称 !== 'string') errors.push('NPC境界.名称必须是字符串类型');
        if (val.阶段 !== undefined && typeof val.阶段 !== 'string') errors.push('NPC境界.阶段必须是字符串类型');
      }
    }

    // 大道对象（角色.大道.大道列表.<道名>）
    if (key.startsWith('角色.大道.大道列表.') && action === 'set' && (key.match(/\./g) || []).length === 3) {
      if (typeof value !== 'object' || value === null) errors.push('大道对象必须是对象类型');
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
