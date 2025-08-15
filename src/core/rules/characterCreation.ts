import type { Ref } from 'vue'

// =================================================================
// 【本源】六司（核心属性）
// 六司者，定人之天命根基。
// =================================================================
export enum CoreAttribute {
  ROOT_BONE = 'root_bone', // 根骨 (Constitution)
  SPIRITUALITY = 'spirituality', // 灵性 (Spirituality)
  COMPREHENSION = 'comprehension', // 悟性 (Comprehension)
  FORTUNE = 'fortune', // 福缘 (Fortune)
  CHARM = 'charm', // 魅力 (Charm)
  TEMPERAMENT = 'temperament', // 心性 (Temperament)
}

export const CORE_ATTRIBUTES: Record<CoreAttribute, string> = {
  [CoreAttribute.ROOT_BONE]: '根骨',
  [CoreAttribute.SPIRITUALITY]: '灵性',
  [CoreAttribute.COMPREHENSION]: '悟性',
  [CoreAttribute.FORTUNE]: '福缘',
  [CoreAttribute.CHARM]: '魅力',
  [CoreAttribute.TEMPERAMENT]: '心性',
}

export interface AttributeDefinition {
  id: CoreAttribute
  name: string
  description: string
}

// 此为天道显化之规则，为创生之基石。
export const ATTRIBUTE_RULES: AttributeDefinition[] = [
  {
    id: CoreAttribute.ROOT_BONE,
    name: '根骨',
    description: '气血之本，体魄之基。根骨佳者，能承载更浑厚的真元，于斗法中更为坚韧。',
  },
  {
    id: CoreAttribute.SPIRITUALITY,
    name: '灵性',
    description: '天赋异禀，灵性越高者，对天地灵气的感知越敏锐，修炼之路越顺畅。',
  },
  {
    id: CoreAttribute.COMPREHENSION,
    name: '悟性',
    description: '道法之门，通玄之匙。悟性高者，参悟功法神通，往往能举一反三，事半功倍。',
  },
  {
    id: CoreAttribute.FORTUNE,
    name: '福缘',
    description: '命数之显，机缘之引。福缘深厚者，常能逢凶化吉，于绝境中觅得一线生机。',
  },
  {
    id: CoreAttribute.CHARM,
    name: '魅力',
    description: '风姿之表，人格魅力。魅力出众者，行走于世，易得他人好感，化解无端之恶。',
  },
  {
    id: CoreAttribute.TEMPERAMENT,
    name: '心性',
    description: '道心之基，意志之本。心性坚定者，能抵御心魔诱惑，于修行路上不易迷失。',
  },
]

// =================================================================
// 【出身】九环凡尘
// 众生皆苦，出身各异，此乃入道第一重考验。
// =================================================================
export interface Origin {
  id: number
  name: string
  description: string
  attributeModifiers: Partial<Record<CoreAttribute, number>>
  rarity: number
  talent_cost: number
  type: 'origin'
}

export interface AttributeModifierEffect {
  type: 'ATTRIBUTE_MODIFIER';
  target: CoreAttribute | string;
  value: number;
}

// =================================================================
// 【天资等级】先天禀赋
// 众生皆有不同天资，决定修行起点与潜力上限。
// =================================================================
export interface TalentTier {
  id: number;
  name: string;
  total_points: number;
  rarity: number;
  color: string;
  description?: string;
}

// =================================================================
// 【天赋】天道垂青
// 有大气运者，天生便得天道一丝垂青，化为天赋神通。
// =================================================================
export interface Talent {
  id: number;
  name: string;
  description: string;
  effects: string; // This can be a JSON string of AttributeModifier[] or a custom string
  rarity: number;
  talent_cost: number;
  max_uses?: number;
  type: 'talent';
  // For UI state management, not part of the core data model
  effectType?: 'ATTRIBUTE_MODIFIER' | 'SKILL_BONUS' | 'PASSIVE_EFFECT' | string;
  attributeTarget?: CoreAttribute | string;
  effectValue?: number;
  customEffect?: string;
}

// =================================================================
// 【灵根】五行之基
// 灵根乃修士吐纳天地元气之根本，定修行坦途或崎岖。
// =================================================================
export interface SpiritRoot {
  id: number;
  name: string;
  description: string;
  aptitude: number; // 资质
  talent_cost: number;
  base_multiplier?: number; // For custom spirit roots
  effects?: any; // Effects can be a JSON string or other formats
  type: 'spirit_root';
}

// =================================================================
// 【命盘】&【世界】
// 命盘一定，便入此方世界，开始一段观沧海、问长生的道途。
// =================================================================
export interface World {
  id: number
  name: string
  type: string | null
  description: string | null
  features?: string[]
  cultivation_bonus?: string
}
export interface AttributeDistribution {
  attributes: Record<CoreAttribute, number>
  pointsSpent: number
}

// 角色所拥有的天赋
export interface CharacterTalent extends Talent {
  level: number // 天赋亦有等阶，初生为1
}

// 角色最终命盘
export interface CharacterSheet {
  name: string
  origin: Origin
  spiritRoot: SpiritRoot
  talents: CharacterTalent[]
  attributes: Record<CoreAttribute, number>
  description: string
  memory_shards: string[] // 天魂记忆碎片，对应世界设定的关键字
}

// 世界状态总纲
export interface WorldState {
  character: CharacterSheet
  time: {
    year: number
    month: number
    day: number
  }
  location: string // 所在之地
  events: any[] // 经历的重大事件
  flags: Record<string, any> // 世界标记，用于记录特殊状态
}

// =================================================================
// 【数据传输】前后端交互之契约
// =================================================================

// 角色基础创建请求
export interface CharacterBaseCreate {
  character_name: string;
  world_id: number;
  talent_tier_id: number;
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
  origin_id?: number;
  spirit_root_id?: number;
  selected_talent_ids?: number[];
}

// 角色基础数据（后端返回）
export interface CharacterBase {
  id: number;
  player_id: number;
  world_id: number;
  talent_tier_id: number;
  character_name: string;
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
  origin_id?: number;
  spirit_root_id?: number;
  selected_talent_ids?: number[];
  created_at: string;
  updated_at: string;
}

export interface Character {
  userName: string
  name: string
  origin: Origin
  talents: Talent[]
  spiritRoot: SpiritRoot
  attributes: Record<CoreAttribute, number>
}

// 从后端获取的角色数据结构
export interface CharacterData {
  id: number
  user_name: string
  character_name: string
  character_data: {
    origin: Origin
    talents: Talent[]
    spiritRoot: SpiritRoot
    attributes: Record<CoreAttribute, number>
  }
  created_at: string
  updated_at: string
}

// 提交UGC天赋的负载结构
export interface UgcTalentPayload {
  name: string
  description: string
  author_name: string
  redemption_code: string
}
