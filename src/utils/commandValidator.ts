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
  const validActions = ['set', 'add', 'push', 'delete'];
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
    const typeErrors = validateValueType(cmd.key, cmd.value, cmd.action);
    errors.push(...typeErrors.map(e => `指令${index}: ${e}`));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证值类型是否符合路径要求
 */
function validateValueType(key: string, value: unknown, action: string): string[] {
  const errors: string[] = [];

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
      const required = ['名称', '阶段', '当前进度', '下一级所需', '突破描述'];
      const missing = required.filter(f => !(f in val));
      if (missing.length > 0) {
        errors.push(`境界对象缺少必需字段: ${missing.join(', ')}`);
      }
      // 检查字段类型
      if (val.名称 && typeof val.名称 !== 'string') {
        errors.push('境界.名称必须是字符串类型');
      }
      if (val.阶段 && typeof val.阶段 !== 'string') {
        errors.push('境界.阶段必须是字符串类型');
      }
      if (val.当前进度 !== undefined && typeof val.当前进度 !== 'number') {
        errors.push('境界.当前进度必须是数字类型');
      }
      if (val.下一级所需 !== undefined && typeof val.下一级所需 !== 'number') {
        errors.push('境界.下一级所需必须是数字类型');
      }
      if (val.突破描述 && typeof val.突破描述 !== 'string') {
        errors.push('境界.突破描述必须是字符串类型');
      }
      // 检查多余字段
      const extra = Object.keys(val).filter(f => !required.includes(f));
      if (extra.length > 0) {
        errors.push(`境界对象包含多余字段: ${extra.join(', ')}`);
      }
    }
  }

  // 位置对象
  if (key === '玩家角色状态.位置' && action === 'set') {
    if (typeof value !== 'object' || value === null) {
      errors.push('位置必须是对象类型');
    } else {
      const val = value as Record<string, any>;
      const required = ['描述', 'x', 'y'];
      const missing = required.filter(f => !(f in val));
      if (missing.length > 0) {
        errors.push(`位置对象缺少必需字段: ${missing.join(', ')}`);
      }
      if (val.描述 && typeof val.描述 !== 'string') {
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
      const required = ['状态名称', '类型', '生成时间', '持续时间分钟', '状态描述'];
      const missing = required.filter(f => !(f in val));
      if (missing.length > 0) {
        errors.push(`状态效果对象缺少必需字段: ${missing.join(', ')}`);
      }
      if (val.类型 && !['buff', 'debuff'].includes(val.类型)) {
        errors.push(`状态效果类型必须是"buff"或"debuff"，当前值: ${val.类型}`);
      }
      // 检查生成时间格式
      if (val.生成时间) {
        if (typeof val.生成时间 !== 'object' || val.生成时间 === null) {
          errors.push('状态效果.生成时间必须是对象类型');
        } else {
          const timeRequired = ['年', '月', '日', '小时', '分钟'];
          const timeMissing = timeRequired.filter(f => !(f in val.生成时间));
          if (timeMissing.length > 0) {
            errors.push(`状态效果.生成时间缺少字段: ${timeMissing.join(', ')}`);
          }
        }
      }
      if (val.持续时间分钟 !== undefined && typeof val.持续时间分钟 !== 'number') {
        errors.push('状态效果.持续时间分钟必须是数字类型');
      }
    }
  }

  // 物品对象
  if (key.startsWith('背包.物品.') && action === 'set' && !key.includes('.数量') && !key.includes('.修炼进度')) {
    if (typeof value !== 'object' || value === null) {
      errors.push('物品必须是对象类型');
    } else {
      const val = value as Record<string, any>;
      const required = ['物品ID', '名称', '类型', '品质', '数量', '描述'];
      const missing = required.filter(f => !(f in val));
      if (missing.length > 0) {
        errors.push(`物品对象缺少必需字段: ${missing.join(', ')}`);
      }
      // 检查品质格式
      if (val.品质) {
        if (typeof val.品质 !== 'object' || val.品质 === null) {
          errors.push('物品.品质必须是对象类型');
        } else if (!val.品质.quality || val.品质.grade === undefined) {
          errors.push('物品.品质必须包含quality(字符串)和grade(数字)字段');
        }
      }
      // 检查功法特有字段
      if (val.类型 === '功法') {
        if (!val.功法技能 || !Array.isArray(val.功法技能)) {
          errors.push('功法物品必须包含功法技能数组');
        } else if (val.功法技能.length === 0) {
          errors.push('功法物品的功法技能数组不能为空');
        } else {
          // 检查每个技能对象
          val.功法技能.forEach((skill: any, idx: number) => {
            if (typeof skill !== 'object' || skill === null) {
              errors.push(`功法技能[${idx}]必须是对象类型`);
            } else {
              const skillRequired = ['技能名称', '技能描述', '消耗', '解锁需要熟练度'];
              const skillMissing = skillRequired.filter(f => !(f in skill));
              if (skillMissing.length > 0) {
                errors.push(`功法技能[${idx}]缺少字段: ${skillMissing.join(', ')}`);
              }
              if (skill.解锁需要熟练度 !== undefined && typeof skill.解锁需要熟练度 !== 'number') {
                errors.push(`功法技能[${idx}].解锁需要熟练度必须是数字类型`);
              }
            }
          });
        }
      }
    }
  }

  // NPC创建/更新
  if (key.startsWith('人物关系.') && !key.includes('.') || (key.match(/\./g) || []).length === 1) {
    if (action === 'set' && typeof value === 'object' && value !== null) {
      const val = value as Record<string, any>;
      const npcRequired = ['名字', '性别', '年龄', '出生日期', '种族', '出生', '外貌描述', '性格特征', '境界', '灵根', '天赋', '先天六司', '与玩家关系', '好感度', '人格底线', '记忆', '记忆总结', '当前位置', '势力归属', '当前外貌状态', '当前内心想法', '背包', '实时关注'];

      // 检查境界格式（NPC专用）
      if (val.境界) {
        if (typeof val.境界 !== 'object' || val.境界 === null) {
          errors.push('NPC境界必须是对象类型');
        } else {
          const realmAllowed = ['名称', '阶段'];
          const realmExtra = Object.keys(val.境界).filter(f => !realmAllowed.includes(f));
          if (realmExtra.length > 0) {
            errors.push(`NPC境界对象包含非法字段: ${realmExtra.join(', ')}。NPC境界只能有"名称"和"阶段"字段`);
          }
          if (!val.境界.名称 || !val.境界.阶段) {
            errors.push('NPC境界必须包含"名称"和"阶段"字段');
          }
        }
      }

      // 检查天赋格式
      if (val.天赋 && !Array.isArray(val.天赋)) {
        errors.push('NPC天赋必须是数组类型');
      } else if (Array.isArray(val.天赋)) {
        val.天赋.forEach((talent: any, idx: number) => {
          if (typeof talent !== 'object' || talent === null) {
            errors.push(`NPC天赋[${idx}]必须是对象类型`);
          } else if (!talent.名称 || !talent.描述) {
            errors.push(`NPC天赋[${idx}]必须包含"名称"和"描述"字段`);
          }
        });
      }

      // 检查私密信息格式（如果存在）
      if (val.私密信息) {
        if (typeof val.私密信息 !== 'object' || val.私密信息 === null) {
          errors.push('NPC私密信息必须是对象类型');
        } else {
          const privateInfo = val.私密信息;
          if (privateInfo.身体部位) {
            if (!Array.isArray(privateInfo.身体部位)) {
              errors.push('NPC私密信息.身体部位必须是数组类型');
            } else {
              privateInfo.身体部位.forEach((part: any, idx: number) => {
                if (typeof part !== 'object' || part === null) {
                  errors.push(`NPC私密信息.身体部位[${idx}]必须是对象类型`);
                } else {
                  const partRequired = ['部位名称', '开发度', '敏感度', '特征描述', '特殊印记'];
                  const partMissing = partRequired.filter(f => !(f in part));
                  if (partMissing.length > 0) {
                    errors.push(`NPC私密信息.身体部位[${idx}]缺少字段: ${partMissing.join(', ')}`);
                  }
                }
              });
            }
          }
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
      if (!val.名称 || !val.阶段) {
        errors.push('NPC境界必须包含"名称"和"阶段"字段');
      }
    }
  }

  // 三千大道验证
  if (key.startsWith('三千大道.大道列表.') && action === 'set' && (key.match(/\./g) || []).length === 2) {
    if (typeof value !== 'object' || value === null) {
      errors.push('大道对象必须是对象类型');
    } else {
      const val = value as Record<string, any>;
      const daoRequired = ['道名', '描述', '阶段列表', '是否解锁', '当前阶段', '当前经验', '总经验'];
      const missing = daoRequired.filter(f => !(f in val));
      if (missing.length > 0) {
        errors.push(`大道对象缺少必需字段: ${missing.join(', ')}`);
      }
      if (val.阶段列表 && !Array.isArray(val.阶段列表)) {
        errors.push('大道.阶段列表必须是数组类型');
      } else if (Array.isArray(val.阶段列表) && val.阶段列表.length > 0) {
        val.阶段列表.forEach((stage: any, idx: number) => {
          if (typeof stage !== 'object' || stage === null) {
            errors.push(`大道.阶段列表[${idx}]必须是对象类型`);
          } else {
            const stageRequired = ['名称', '描述', '突破经验'];
            const stageMissing = stageRequired.filter(f => !(f in stage));
            if (stageMissing.length > 0) {
              errors.push(`大道.阶段列表[${idx}]缺少字段: ${stageMissing.join(', ')}`);
            }
          }
        });
      }
    }
  }

  // 任务对象验证
  if (key === '任务系统.当前任务列表' && action === 'push') {
    if (typeof value !== 'object' || value === null) {
      errors.push('任务对象必须是对象类型');
    } else {
      const val = value as Record<string, any>;
      const questRequired = ['任务ID', '任务名称', '任务描述', '任务类型', '任务状态', '目标列表', '奖励'];
      const missing = questRequired.filter(f => !(f in val));
      if (missing.length > 0) {
        errors.push(`任务对象缺少必需字段: ${missing.join(', ')}`);
      }
    }
  }

  return errors;
}

/**
 * 验证整个指令数组
 */
export function validateCommands(commands: unknown[]): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const invalidCommands: Array<{ command: any; errors: string[] }> = [];

  if (!Array.isArray(commands)) {
    return {
      valid: false,
      errors: ['tavern_commands必须是数组类型'],
      warnings: [],
      invalidCommands: []
    };
  }

  commands.forEach((cmd, index) => {
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
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    invalidCommands
  };
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
