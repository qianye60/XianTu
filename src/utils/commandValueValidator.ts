/**
 * 指令值格式验证系统
 *
 * 功能：
 * - 验证指令value的数据格式是否符合游戏数据结构
 * - 检查必需字段是否存在
 * - 拒绝执行格式不完整的指令（不进行修复）
 */

import type { TavernCommand } from '@/types/AIGameMaster';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 验证指令值的格式（只验证，不修复）
 */
export function validateAndRepairCommandValue(command: TavernCommand): ValidationResult {
  const { action, key, value } = command;
  const errors: string[] = [];

  try {
    // 1. 玩家境界对象
    if (key === '玩家角色状态.境界' && action === 'set') {
      const result = validateRealmObject(value, '玩家');
      errors.push(...result.errors);
    }

    // 2. 玩家位置对象
    if (key === '玩家角色状态.位置' && action === 'set') {
      const result = validateLocationObject(value);
      errors.push(...result.errors);
    }

    // 3. 状态效果对象（push操作）
    if (key === '玩家角色状态.状态效果' && action === 'push') {
      const result = validateStatusEffectObject(value);
      errors.push(...result.errors);
    }

    // 4. 物品对象（push到背包）
    if (key === '背包.物品' && action === 'push') {
      const result = validateItemObject(value);
      errors.push(...result.errors);
    }

    // 5. 物品对象（set操作）
    if (key.startsWith('背包.物品.') && action === 'set' && !key.includes('.数量') && !key.includes('.修炼进度')) {
      const result = validateItemObject(value);
      errors.push(...result.errors);
    }

    // 6. NPC对象（创建或更新）
    // 🔥 修复：只在创建新NPC时验证完整性，更新现有NPC时不验证
    // 判断是否是创建新NPC：value包含多个必需字段（姓名、性别、年龄等）
    if (key.startsWith('人物关系.') && (key.match(/\./g) || []).length === 1 && action === 'set') {
      // 检查是否是完整的NPC对象（包含姓名字段）
      if (value && typeof value === 'object' && (value as any).姓名) {
        const result = validateNPCObject(value);
        errors.push(...result.errors);
      }
      // 如果不包含姓名字段，说明是部分更新，跳过验证
    }

    // 7. NPC境界对象
    if (key.includes('人物关系.') && key.endsWith('.境界') && action === 'set') {
      const result = validateRealmObject(value, 'NPC');
      errors.push(...result.errors);
    }

    // 8. 大道对象
    if (key.startsWith('三千大道.大道列表.') && action === 'set' && (key.match(/\./g) || []).length === 2) {
      const result = validateDaoObject(value);
      errors.push(...result.errors);
    }

    // 9. 任务对象
    if (key === '任务系统.当前任务列表' && action === 'push') {
      const result = validateTaskObject(value);
      errors.push(...result.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('[指令值验证] 验证过程发生异常:', error);
    return {
      valid: false,
      errors: [`验证过程异常: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * 验证境界对象
 */
function validateRealmObject(value: any, type: '玩家' | 'NPC'): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'object' || value === null) {
    errors.push('境界必须是对象类型');
    return { valid: false, errors };
  }

  if (type === '玩家') {
    // 玩家境界：必需字段
    if (!value.名称) errors.push('境界缺少"名称"字段');
    if (!value.阶段) errors.push('境界缺少"阶段"字段');
    if (typeof value.当前进度 !== 'number') errors.push('境界缺少"当前进度"字段或类型错误');
    if (typeof value.下一级所需 !== 'number') errors.push('境界缺少"下一级所需"字段或类型错误');
    if (value.突破描述 === undefined) errors.push('境界缺少"突破描述"字段');
  } else {
    // NPC境界：只允许名称和阶段
    const allowed = ['名称', '阶段'];
    const extra = Object.keys(value).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      errors.push(`NPC境界包含非法字段: ${extra.join(', ')}`);
    }
    if (!value.名称) errors.push('NPC境界缺少"名称"字段');
    if (!value.阶段) errors.push('NPC境界缺少"阶段"字段');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证位置对象
 */
function validateLocationObject(value: any): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'object' || value === null) {
    errors.push('位置必须是对象类型');
    return { valid: false, errors };
  }

  if (!value.描述) errors.push('位置缺少"描述"字段');
  if (typeof value.x !== 'number') errors.push('位置缺少"x"字段或类型错误');
  if (typeof value.y !== 'number') errors.push('位置缺少"y"字段或类型错误');

  return { valid: errors.length === 0, errors };
}

/**
 * 验证状态效果对象
 */
function validateStatusEffectObject(value: any): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'object' || value === null) {
    errors.push('状态效果必须是对象类型');
    return { valid: false, errors };
  }

  if (!value.状态名称) errors.push('状态效果缺少"状态名称"字段');
  if (!value.类型 || !['buff', 'debuff'].includes(value.类型)) errors.push('状态效果缺少"类型"字段或值无效');
  if (value.描述 === undefined) errors.push('状态效果缺少"描述"字段');
  if (typeof value.持续时间分钟 !== 'number') errors.push('状态效果缺少"持续时间分钟"字段或类型错误');
  if (!value.开始时间) errors.push('状态效果缺少"开始时间"字段');

  return { valid: errors.length === 0, errors };
}

/**
 * 验证物品对象
 */
function validateItemObject(value: any): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'object' || value === null) {
    errors.push('物品必须是对象类型');
    return { valid: false, errors };
  }

  // 必需字段
  if (!value.物品ID) errors.push('物品缺少"物品ID"字段');
  if (!value.名称) errors.push('物品缺少"名称"字段');
  if (!value.类型) errors.push('物品缺少"类型"字段');

  if (!value.品质) {
    errors.push('物品缺少"品质"字段');
  } else if (typeof value.品质 === 'object') {
    if (!value.品质.quality) errors.push('物品品质缺少"quality"字段');
    if (typeof value.品质.grade !== 'number') errors.push('物品品质缺少"grade"字段或类型错误');
  } else {
    errors.push('物品品质必须是对象类型');
  }

  if (typeof value.数量 !== 'number') errors.push('物品缺少"数量"字段或类型错误');
  if (value.描述 === undefined) errors.push('物品缺少"描述"字段');

  // 功法类型特殊处理
  if (value.类型 === '功法') {
    if (!Array.isArray(value.功法技能)) {
      errors.push('功法物品缺少"功法技能"数组');
    } else if (value.功法技能.length === 0) {
      errors.push('功法物品的"功法技能"数组不能为空，至少需要1个技能');
    } else {
      // 验证每个技能对象
      value.功法技能.forEach((skill: any, index: number) => {
        if (typeof skill !== 'object' || skill === null) {
          errors.push(`功法技能[${index}]不是对象类型`);
        } else {
          if (!skill.技能名称) errors.push(`功法技能[${index}]缺少"技能名称"字段`);
          if (!skill.技能类型) errors.push(`功法技能[${index}]缺少"技能类型"字段`);
          if (!skill.消耗) {
            errors.push(`功法技能[${index}]缺少"消耗"字段`);
          } else if (typeof skill.消耗 === 'object') {
            if (!skill.消耗.类型) errors.push(`功法技能[${index}].消耗缺少"类型"字段`);
            if (typeof skill.消耗.数值 !== 'number') errors.push(`功法技能[${index}].消耗缺少"数值"字段或类型错误`);
          } else {
            errors.push(`功法技能[${index}].消耗必须是对象类型`);
          }
          if (skill.描述 === undefined) errors.push(`功法技能[${index}]缺少"描述"字段`);
          if (typeof skill.熟练度要求 !== 'number' && skill.熟练度要求 !== undefined && typeof skill.解锁需要熟练度 !== 'number') {
            errors.push(`功法技能[${index}]缺少"熟练度要求"字段或类型错误`);
          }
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证NPC对象
 */
function validateNPCObject(value: any): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'object' || value === null) {
    errors.push('NPC必须是对象类型');
    return { valid: false, errors };
  }

  // 必需字段
  if (!value.姓名) errors.push('NPC缺少"姓名"字段');
  if (!value.性别) errors.push('NPC缺少"性别"字段');
  if (!value.年龄) errors.push('NPC缺少"年龄"字段');

  if (!value.境界) {
    errors.push('NPC缺少"境界"字段');
  } else {
    const realmResult = validateRealmObject(value.境界, 'NPC');
    errors.push(...realmResult.errors);
  }

  if (!value.身份) errors.push('NPC缺少"身份"字段');
  if (!value.性格) errors.push('NPC缺少"性格"字段');
  if (!value.外貌) errors.push('NPC缺少"外貌"字段');
  if (!value.关系) errors.push('NPC缺少"关系"字段');
  if (typeof value.好感度 !== 'number') errors.push('NPC缺少"好感度"字段或类型错误');

  // 可选字段验证
  if (value.天赋 !== undefined && !Array.isArray(value.天赋)) {
    errors.push('NPC天赋必须是数组类型');
  }

  if (value.私密信息 && typeof value.私密信息 === 'object') {
    if (value.私密信息.身体部位 !== undefined && !Array.isArray(value.私密信息.身体部位)) {
      errors.push('NPC私密信息.身体部位必须是数组类型');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证大道对象
 */
function validateDaoObject(value: any): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'object' || value === null) {
    errors.push('大道对象必须是对象类型');
    return { valid: false, errors };
  }

  if (!value.名称) errors.push('大道对象缺少"名称"字段');
  if (value.描述 === undefined) errors.push('大道对象缺少"描述"字段');
  if (!Array.isArray(value.阶段列表)) errors.push('大道对象缺少"阶段列表"数组');
  if (typeof value.当前阶段索引 !== 'number') errors.push('大道对象缺少"当前阶段索引"字段或类型错误');

  return { valid: errors.length === 0, errors };
}

/**
 * 验证任务对象
 */
function validateTaskObject(value: any): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'object' || value === null) {
    errors.push('任务对象必须是对象类型');
    return { valid: false, errors };
  }

  if (!value.任务ID) errors.push('任务缺少"任务ID"字段');
  if (!value.任务名称) errors.push('任务缺少"任务名称"字段');
  if (value.任务描述 === undefined) errors.push('任务缺少"任务描述"字段');
  if (!value.任务状态) errors.push('任务缺少"任务状态"字段');
  if (!value.任务类型) errors.push('任务缺少"任务类型"字段');

  return { valid: errors.length === 0, errors };
}
