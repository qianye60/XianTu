import type { Ref } from 'vue'

// =================================================================
// 【本源】六司（核心属性）
// 六司者，定人之天命根基。
// =================================================================
export enum CoreAttribute {
  CON = 'CON', // 根骨 (Constitution)
  INT = 'INT', // 悟性 (Intelligence)
  SPI = 'SPI', // 神识 (Spirit)
  LUK = 'LUK', // 气运 (Luck)
  CHA = 'CHA', // 仪容 (Charisma)
  BKG = 'BKG', // 家世 (Background)
}

export const CORE_ATTRIBUTES: Record<CoreAttribute, string> = {
  [CoreAttribute.CON]: '根骨',
  [CoreAttribute.INT]: '悟性',
  [CoreAttribute.SPI]: '神识',
  [CoreAttribute.LUK]: '气运',
  [CoreAttribute.CHA]: '仪容',
  [CoreAttribute.BKG]: '家世',
}

export interface AttributeDefinition {
  id: CoreAttribute
  name: string
  description: string
}

// 此为天道显化之规则，为创生之基石。
export const ATTRIBUTE_RULES: AttributeDefinition[] = [
  {
    id: CoreAttribute.CON,
    name: '根骨',
    description: '气血之本，体魄之基。根骨佳者，能承载更浑厚的真元，于斗法中更为坚韧。',
  },
  {
    id: CoreAttribute.INT,
    name: '悟性',
    description: '道法之门，通玄之匙。悟性高者，参悟功法神通，往往能举一反三，事半功倍。',
  },
  {
    id: CoreAttribute.SPI,
    name: '神识',
    description: '元神之用，感应之凭。神识强者，可洞察幽微，鉴宝识人，亦能抵御心魔幻境。',
  },
  {
    id: CoreAttribute.LUK,
    name: '气运',
    description: '命数之显，机缘之引。气运加身者，常能逢凶化吉，于绝境中觅得一线生机。',
  },
  {
    id: CoreAttribute.CHA,
    name: '仪容',
    description: '风姿之表，第一印象。仪容出众者，行走于世，易得他人好感，化解无端之恶。',
  },
  {
    id: CoreAttribute.BKG,
    name: '家世',
    description: '出身之阶，初始之助。家世显赫者，或有长辈庇护，或有功法财货，修行之路更为平坦。',
  },
]

// =================================================================
// 【出身】九环凡尘
// 众生皆苦，出身各异，此乃入道第一重考验。
// =================================================================
export interface Origin {
  id: string
  name: string
  description: string
  attributeModifiers: Partial<Record<CoreAttribute, number>>
  type: 'origin'
}

export interface AttributeModifierEffect {
  type: 'ATTRIBUTE_MODIFIER';
  target: CoreAttribute | string;
  value: number;
}

// =================================================================
// 【天赋】天道垂青
// 有大气运者，天生便得天道一丝垂青，化为天赋神通。
// =================================================================
export interface Talent {
  id: string;
  name: string;
  description: string;
  effects: string; // This can be a JSON string of AttributeModifier[] or a custom string
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
  id: string;
  name: string;
  description: string;
  aptitude: number; // 资质
  type: 'spirit_root';
  base_multiplier?: number; // For custom spirit roots
  effects?: any; // Effects can be a JSON string or other formats
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
