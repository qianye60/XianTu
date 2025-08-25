// src/types/game.d.ts

/**
 * @fileoverview
 * 坤舆图志 - 游戏核心数据结构天规
 * 此文件定义了整个游戏存档、角色、NPC等核心数据的TypeScript类型。
 * 所有数据结构均基于道友提供的最新《大道坤舆图》。
 */

import type { QualityType, GradeType } from '@/data/itemQuality';

// --- 基础与通用类型 ---

export interface Vector2 {
  X: number;
  Y: number;
}

export interface ValuePair<T> {
  当前: T;
  最大: T;
}

/** 物品品质信息 - 新版本 */
export interface ItemQuality {
  quality: QualityType; // 品质等级：神、仙、天、地、玄、黄、凡
  grade: GradeType; // 品级：0-10
}

/** 物品品质信息 - 兼容旧版本 */
export interface Quality {
  阶位: '凡' | '黄' | '玄' | '地' | '天' | '仙' | '神' |string;
  品级: number;
}

// --- 先天六司 ---

export interface InnateAttributes {
  根骨: number;
  灵性: number;
  悟性: number;
  气运: number;
  魅力: number;
  心性: number;
}

/** 英文键名的先天六司，用于组件传参 */
export interface InnateAttributesEnglish {
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
}

export type AttributeKey = keyof InnateAttributesEnglish;

// --- 物品与背包 ---

export interface Item {
  物品ID: string;
  名称: string;
  类型: '法宝' | '功法' | '其他' |string;
  品质: ItemQuality; // 使用新的品质系统
  装备增幅?: {
    气血上限?: number;
    灵气上限?: number;
    神识上限?: number;
    后天六司?: Partial<InnateAttributes>;
  };
  装备特效?: string[];
  使用效果?: string;
  数量: number;
  耐久度?: ValuePair<number>;
  描述?: string; // 物品描述
}

export interface Inventory {
  灵石: {
    下品: number;
    中品: number;
    上品: number;
    极品: number;
  };
  物品: Record<string, Item>; // 以物品唯一ID为key
}

// --- 功法与技能 ---

export interface SkillProficiency {
  等级: number;
  经验: number;
  下级所需?: number; // 添加下级所需经验字段
}

/** 天赋进度系统 */
export interface TalentProgress {
  等级: number;
  当前经验: number;
  下级所需: number;
  总经验: number;
}

export interface CultivationSkills {
  主修功法: string | null; // 技能ID
  已学技能: string[]; // 技能ID数组
  技能熟练度: Record<string, SkillProficiency>; // 以技能ID为key
  天赋进度: Record<string, TalentProgress>; // 以天赋名称为key
}

// --- 装备 ---

export interface Equipment {
  法宝1: string | null; // 物品ID
  法宝2: string | null;
  法宝3: string | null;
  法宝4: string | null;
  法宝5: string | null;
  法宝6: string | null;
}

// --- 状态效果 ---

export type StatusEffectType = 'BUFF' | 'DEBUFF';

export interface StatusEffect {
  状态名称: string;
  类型: StatusEffectType;
  时间: string; // "没解毒前永远存留" 或具体时间
  状态描述: string;
  强度?: number; // 1-10，表示状态效果的强度
  来源?: string; // 状态效果的来源，如"引气丹"、"毒蛇咬伤"等
}

// --- 角色实时状态 ---

export interface Realm {
  等级: number;
  名称: string;
  当前进度: number;
  下一级所需: number;
  突破描述: string;
}
// 境界子阶段类型
export type RealmStage = '初期' | '中期' | '后期' | '圆满' | '极境';

// 境界子阶段定义
export interface RealmStageDefinition {
  stage: RealmStage;
  title: string;
  breakthrough_difficulty: '简单' | '普通' | '困难' | '极难' | '逆天';
  resource_multiplier: number; // 资源倍数（气血、灵气、神识）
  lifespan_bonus: number; // 寿命加成
  special_abilities?: string[]; // 特殊能力
  can_cross_realm_battle?: boolean; // 是否可以越境战斗
}

export interface RealmDefinition {
  level: number;
  name: string;
  title: string;
  coreFeature: string;
  lifespan: string;
  activityScope: string;
  gapDescription: string;
  stages?: RealmStageDefinition[]; // 境界子阶段，凡人境界没有子阶段
}


export interface PlayerStatus {
  境界: Realm;
  声望: number;
  位置: {
    描述: string;
    坐标: Vector2;
  };
  气血: ValuePair<number>;
  灵气: ValuePair<number>;
  神识: ValuePair<number>;
  寿命: ValuePair<number>;
  修为: ValuePair<number>; // 新增修为经验值
  状态效果: StatusEffect[];
}

/** 用于UI组件显示的角色状态信息 */
export interface CharacterStatusForDisplay {
  name: string;
  realm: Realm;
  age: number; // 来自寿命的当前值
  hp: string;
  mana: string;
  spirit: string;
  lifespan: ValuePair<number>;
  reputation: number;
  cultivation_exp: number;
  cultivation_exp_max: number;
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
}

// --- 世界地图 ---

export interface MapEvent {
  触发状态: '未触发' | '进行中' | '已完成' | string;
  冷却时间?: string;
}

export interface WorldMap {
  当前地图: string;
  已探索区域: string[];
  地图事件: Record<string, MapEvent>;
}

// --- NPC 模块 ---
export interface NpcAiBehavior {
  行为模式: string;
  日常路线: {
    时间: string;
    位置: string;
    行为: string;
  }[];
}

export interface NpcProfile {
  角色基础信息: CharacterBaseInfo;
  角色存档信息: {
    时间: string;
    装备: Record<string, string | null>;
    功法: {
      主修功法: string | null;
      已学技能: string[];
    };
    状态: StatusEffect[];
    境界: number;
    声望: number;
    位置: {
      描述: string;
      坐标: Vector2;
    };
    当前气血: number; 最大气血: number;
    当前灵气: number; 最大灵气: number;
    当前神识: number; 最大神识: number;
    当前寿命: number; 最大寿命: number;
    背包: Inventory;
  };
  AI行为: NpcAiBehavior;
  人物关系: string;
  人物好感度: number;
  人物记忆: string[];
  互动次数: number;
  最后互动时间: string | null;
  特殊标记: string[];
}


// --- 记忆模块 ---

export interface Memory {
  短期记忆: string[]; // 最近的对话、事件的完整记录
  中期记忆: string[]; // 对短期记忆的总结，关键信息点
  长期记忆: string[]; // 核心人设、世界观、重大事件的固化记忆
}


// --- 游戏时间 ---

export interface GameTime {
  年: number;
  月: number;
  日: number;
  小时: number;
  分钟: number;
}

// --- 存档数据核心 ---

export interface GameMessage {
  type: 'user' | 'ai' | 'system' | 'player' | 'gm';
  content: string;
  time: string;
  metadata?: {
    commands?: any[];
    around?: string;
  };
}

export interface SaveData {
  玩家角色状态: PlayerStatus;
  装备栏: Equipment;
  功法技能: CultivationSkills;
  背包: Inventory;
  人物关系: Record<string, NpcProfile>; // 以NPC名字或唯一ID为key
  记忆: Memory;
  游戏时间?: GameTime; // 添加游戏时间字段
  短期记忆?: string[]; // 短期记忆数组
  对话历史?: GameMessage[]; // 对话历史数组
}


// --- 单个存档槽位 ---

export interface SaveSlot {
  存档名: string;
  保存时间: string | null;
  游戏内时间?: string;
  世界地图?: WorldMap;
  存档数据: SaveData | null;
}

// --- 角色基础信息 (静态) ---

export interface CharacterBaseInfo {
  名字: string;
  性别: string;
  年龄?: number; // 添加可选的年龄字段
  世界: string;
  天资: string;
  出生: string;
  灵根: string;
  天赋: string[];
  先天六司: InnateAttributes;
  创建时间?: string; // 添加创建时间字段
  描述?: string; // 添加描述字段
}

// --- 新物品系统类型定义 ---

/** 新物品系统的品质枚举 */
export type NewItemQuality = '凡' | '黄' | '玄' | '地' | '天' | '仙' | '神';

/** 新物品系统的类型枚举 */
export type NewItemType = '武器' | '防具' | '配饰' | '消耗品' | '材料' | '功法' | '丹药' | '法宝' | '书籍' | '其他';

/** 新物品系统的属性类型 */
export type AttributeType = '攻击力' | '防御力' | '气血' | '灵气' | '神识' | '速度' | '暴击' | '命中' | '闪避' | '特殊';

/** 新物品系统的属性接口 */
export interface NewItemAttribute {
  type: AttributeType;
  value: number;
  percentage?: boolean;
  description?: string;
}

/** 新物品系统的物品接口 */
export interface NewGameItem {
  id: string;
  name: string;
  type: NewItemType;
  quality: NewItemQuality;
  level: number; // 0-10级
  description: string;
  attributes: NewItemAttribute[];
  requirements?: {
    realm?: string;
    level?: number;
    attributes?: Record<string, number>;
  };
  effects?: {
    type: 'active' | 'passive' | 'triggered';
    description: string;
    cooldown?: number;
    duration?: number;
  }[];
  stackSize: number;
  sellValue: number;
  origin?: string;
  bindType?: '绑定' | '装备绑定' | '不绑定';
  durability?: {
    current: number;
    max: number;
  };
  enchantments?: string[];
  setBonus?: {
    setName: string;
    pieces: number;
    totalPieces: number;
    bonus: NewItemAttribute[];
  };
  createdAt: string;
  updatedAt: string;
}

/** 新背包槽位接口 */
export interface NewInventorySlot {
  item: NewGameItem | null;
  quantity: number;
  locked?: boolean;
}

/** 装备槽位枚举 */
export type EquipSlot = '武器' | '头部' | '胸甲' | '腿甲' | '足部' | '戒指1' | '戒指2' | '项链' | '配饰';

/** 装备信息接口 */
export interface EquippedItem {
  slot: EquipSlot;
  item: NewGameItem;
  equippedAt: string;
}

/** 货币类型 */
export interface Currency {
  下品灵石: number;
  中品灵石: number;
  上品灵石: number;
  极品灵石: number;
}

// --- 角色档案 (动静合一) ---

export interface CharacterProfile {
  模式: '单机' | '联机';
  角色基础信息: CharacterBaseInfo;
  // 单机模式下有多个存档槽位
  存档列表?: Record<string, SaveSlot>;
  // 联机模式下只有一个存档
  存档?: SaveSlot & {
    云端同步信息?: {
      最后同步: string;
      版本: number;
      需要同步: boolean;
    };
  };
}

// --- 顶层本地存储结构 ---

export interface LocalStorageRoot {
  当前激活存档: {
    角色ID: string;
    存档槽位: string; // e.g., "存档1" for single player, or a default key for online
  } | null;
  角色列表: Record<string, CharacterProfile>; // 以角色唯一ID (char_1001) 为key
}
