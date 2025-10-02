/**
 * @fileoverview 自定义数据格式规范
 * 定义了所有自定义数据的标准化格式，确保与内置数据保持一致
 */

import type { SpiritRoot, Talent, Origin, World, TalentTier } from '@/types';

// =======================================================================
//                           自定义数据格式规范
// =======================================================================

/**
 * 自定义灵根数据格式
 * 与 LOCAL_SPIRIT_ROOTS 中的格式保持完全一致
 */
export interface CustomSpiritRootSchema {
  name: string;                    // 灵根名称，如"雷灵根"
  tier: string;                    // 品级，如"极品"、"神品"等
  description: string;             // 详细描述
  cultivation_speed: string;       // 修炼速度描述，如"2.0x"
  special_effects: string[];       // 特殊效果数组，如["雷系法术威力+80%", "雷霆免疫"]
  base_multiplier: number;         // 修炼倍率，如2.0
  talent_cost: number;             // 消耗天道点
  rarity: number;                  // 稀有度等级 1-5
  source: 'local' | 'cloud';      // 数据源
}

/**
 * 天赋效果格式
 * 支持两种格式：
 * 1. 结构化对象（用于系统计算）
 * 2. 字符串描述（用于叙事性效果）
 */
export interface TalentEffect {
  类型: '后天六司' | '特殊能力' | '技能加成';
  目标?: string;                   // 用于"后天六司"类型，如"根骨"、"魅力"
  技能?: string;                   // 用于"技能加成"类型，如"剑法"、"炼丹"
  名称?: string;                   // 用于"特殊能力"类型，如"魅力光环"
  数值: number;                    // 效果数值
  描述?: string;                   // 可选：效果的详细描述
}

/**
 * 自定义天赋数据格式
 * 与 LOCAL_TALENTS 中的格式保持完全一致
 */
export interface CustomTalentSchema {
  name: string;                    // 天赋名称，如"顶级魅力"
  description: string;             // 详细描述
  talent_cost: number;             // 消耗天道点
  rarity: number;                  // 稀有度等级 1-5
  effects: TalentEffect[] | string[]; // 天赋效果：可以是结构化数组或字符串描述数组
  source: 'local' | 'cloud';      // 数据源
}

/**
 * 自定义出身数据格式
 * 与 LOCAL_ORIGINS 中的格式保持完全一致
 */
export interface CustomOriginSchema {
  name: string;                    // 出身名称，如"山野遗孤"
  description: string;             // 详细描述
  talent_cost: number;             // 消耗天道点
  attribute_modifiers: Record<string, number>; // 属性调整，如{root_bone: 1, comprehension: 2}
  rarity: number;                  // 稀有度等级 1-5
  source: 'local' | 'cloud';      // 数据源
}

/**
 * 自定义世界数据格式
 * 与 LOCAL_WORLDS 中的格式保持完全一致
 */
export interface CustomWorldSchema {
  name: string;                    // 世界名称，如"朝天大陆"
  era: string;                     // 时代背景，如"朝天历元年"
  description: string;             // 详细描述
  source: 'local' | 'cloud';      // 数据源
}

/**
 * 自定义天资数据格式
 * 与 LOCAL_TALENT_TIERS 中的格式保持完全一致
 */
export interface CustomTalentTierSchema {
  name: string;                    // 天资名称，如"天骄"
  description: string;             // 详细描述
  total_points: number;            // 总点数
  rarity: number;                  // 稀有度等级 1-5
  color: string;                   // 显示颜色，如"#9932CC"
  source: 'local' | 'cloud';      // 数据源
}

// =======================================================================
//                           数据验证规则
// =======================================================================

/**
 * 稀有度等级定义
 */
export const RARITY_LEVELS = {
  1: { name: '常见', color: '#9CA3AF' },
  2: { name: '少见', color: '#3B82F6' },
  3: { name: '罕见', color: '#10B981' },
  4: { name: '极罕见', color: '#F59E0B' },
  5: { name: '传说', color: '#EF4444' }
} as const;

/**
 * 数据源类型定义
 */
export const DATA_SOURCES = {
  local: '本地',
  cloud: '云端'
} as const;

/**
 * 天赋效果类型定义
 */
export const TALENT_EFFECT_TYPES = {
  后天六司: '属性加成',
  特殊能力: '特殊技能',
  技能加成: '技能强化'
} as const;

/**
 * 属性名称映射（用于出身属性调整）
 */
export const ATTRIBUTE_MAPPINGS = {
  root_bone: '根骨',
  spirit: '灵性', 
  comprehension: '悟性',
  luck: '气运',
  charm: '魅力',
  temperament: '心性'
} as const;

// =======================================================================
//                           格式化工具函数
// =======================================================================

/**
 * 格式化天赋效果为可读字符串
 * @param effects 天赋效果（可以是对象数组或字符串数组）
 * @returns 格式化后的字符串数组
 */
export function formatTalentEffects(effects?: TalentEffect[] | string[]): string[] {
  if (!effects || effects.length === 0) return [];

  // 如果已经是字符串数组，直接返回
  if (typeof effects[0] === 'string') {
    return effects as string[];
  }

  // 如果是对象数组，转换为字符串
  return (effects as TalentEffect[]).map(effect => {
    if (effect.描述) return effect.描述;

    switch (effect.类型) {
      case '后天六司':
        return `${effect.目标} +${effect.数值}`;
      case '特殊能力':
        return effect.名称 || `特殊能力 +${effect.数值}`;
      case '技能加成':
        return `${effect.技能}技能 +${effect.数值}%`;
      default:
        return `未知效果`;
    }
  });
}

/**
 * 将用户输入的天赋效果文本解析为标准格式
 * @param effectsText 用户输入的效果文本
 * @returns 解析后的效果数组
 */
export function parseEffectsText(effectsText: string): TalentEffect[] {
  if (!effectsText?.trim()) return [];

  return effectsText.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [类型, 目标, 数值] = line.split('|').map(part => part.trim());
      const effect: TalentEffect = { 类型: 类型 as any, 数值: parseFloat(数值) || 0 };

      if (类型 === '后天六司') {
        effect.目标 = 目标;
      } else if (类型 === '技能加成') {
        effect.技能 = 目标;
      } else if (类型 === '特殊能力') {
        effect.名称 = 目标;
      }

      return effect;
    });
}

/**
 * 将用户输入的属性调整文本解析为标准格式
 * @param attributesText 用户输入的属性文本
 * @returns 解析后的属性对象
 */
export function parseAttributesText(attributesText: string): Record<string, number> {
  if (!attributesText?.trim()) return {};
  
  const modifiers: Record<string, number> = {};
  attributesText.split('\n')
    .filter(line => line.trim())
    .forEach(line => {
      const [attr, value] = line.split('|').map(part => part.trim());
      modifiers[attr] = parseFloat(value) || 0;
    });
  
  return modifiers;
}

/**
 * 将用户输入的特殊效果文本解析为数组
 * @param effectsText 用户输入的效果文本
 * @returns 解析后的效果数组
 */
export function parseSpecialEffectsText(effectsText: string): string[] {
  if (!effectsText?.trim()) return [];
  
  return effectsText.split('\n')
    .filter(effect => effect.trim())
    .map(effect => effect.trim());
}

// =======================================================================
//                           使用示例
// =======================================================================

/**
 * 自定义灵根创建示例
 */
export const CUSTOM_SPIRIT_ROOT_EXAMPLE: CustomSpiritRootSchema = {
  name: "时空灵根",
  tier: "神品",
  description: "传说中掌控时空的至高灵根，能够操控时间与空间的流转，是天地间最为稀有的灵根之一。",
  cultivation_speed: "2.8x",
  special_effects: ["时空法术威力+100%", "时间倒流", "空间传送", "时空屏障"],
  base_multiplier: 2.8,
  talent_cost: 25,
  rarity: 5,
  source: "local"
};

/**
 * 自定义天赋创建示例（结构化格式）
 */
export const CUSTOM_TALENT_EXAMPLE: CustomTalentSchema = {
  name: "时光倒流",
  description: "拥有扭转时间的神秘力量，能够在关键时刻逆转局势，化险为夷。",
  talent_cost: 20,
  rarity: 5,
  effects: [
    { 类型: "后天六司", 目标: "气运", 数值: 10 },
    { 类型: "特殊能力", 名称: "时间逆转", 数值: 0.05 },
    { 类型: "技能加成", 技能: "时空术", 数值: 0.5 }
  ],
  source: "local"
};

/**
 * 自定义天赋创建示例（字符串描述格式）
 */
export const CUSTOM_TALENT_STRING_EXAMPLE: CustomTalentSchema = {
  name: "天生剑骨",
  description: "天生剑道奇才，对剑法有超凡的领悟力。",
  talent_cost: 15,
  rarity: 4,
  effects: [
    "剑法修炼速度提升50%",
    "剑意领悟概率提升30%",
    "使用剑类武器攻击力提升20%",
    "天生剑气护体"
  ],
  source: "local"
};

/**
 * 自定义出身创建示例
 */
export const CUSTOM_ORIGIN_EXAMPLE: CustomOriginSchema = {
  name: "时空守护者后裔",
  description: "你是远古时空守护者的后代，血脉中流淌着时空之力，天生对时间和空间有着超凡的感知能力。",
  talent_cost: 15,
  attribute_modifiers: {
    comprehension: 5,
    luck: 3,
    spirit: 4
  },
  rarity: 5,
  source: "local"
};