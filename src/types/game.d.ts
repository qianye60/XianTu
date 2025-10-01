// src/types/game.d.ts

/**
 * @fileoverview
 * 坤舆图志 - 游戏核心数据结构天规
 * 此文件定义了整个游戏存档、角色、NPC等核心数据的TypeScript类型。
 * 所有数据结构均基于道友提供的最新《大道坤舆图》。
 */

import type { QualityType, GradeType } from '@/data/itemQuality';
import type { WorldMapConfig } from './worldMap';

// --- AI 元数据通用接口 ---
// 说明：为了允许在多处数据结构中嵌入给 AI 的说明/约束提示，
// 在不破坏原有强类型约束的前提下，为常用结构追加可选的元数据字段。
export interface AIMetadata {
  _AI说明?: string;
  _AI修改规则?: any;
  _AI重要提醒?: string;
}

// --- 系统与规则（可嵌入提示与限制） ---
export interface AttributeLimitConfig {
  先天六司?: {
    每项上限: number; // 六项单项最大值（默认10）
  };
}

export interface SystemConfig extends AIMetadata {
  规则?: {
    属性上限?: AttributeLimitConfig;
    装备系统?: string;
    品质控制?: string;
  };
  提示?: string | string[]; // 可放置给AI的约束提示，随存档一并注入
}

// --- 状态变更日志接口 ---
export type StateChange = {
  key: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
};

export interface StateChangeLog {
  before?: any;
  after?: any;
  changes: StateChange[];
  timestamp?: string;
}

// --- 记忆条目接口 ---
export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: Date;
  importance: number; // 1-10
  tags: string[];
  type: 'user_action' | 'ai_response' | 'system_event' | 'summary' | 'short' | 'mid' | 'long';
  hidden?: boolean; // 是否为隐藏记忆
  convertedFrom?: 'short' | 'mid' | 'long'; // 转换来源
  category: 'combat' | 'social' | 'cultivation' | 'exploration' | 'other';
  metadata?: {
    location?: string;
    npcs?: string[];
    items?: string[];
    skills?: string[];
  };
}

// --- 处理响应接口 ---
export interface ProcessedResponse {
  content: string;
  metadata: {
    confidence: number;
    reasoning: string[];
    memoryUpdates: MemoryEntry[];
    suggestedActions: string[];
    memoryStats?: {
      shortTermCount: number;
      midTermCount: number;
      longTermCount: number;
      hiddenMidTermCount: number;
      lastConversion?: Date;
    };
  };
}

// --- 天道系统相关类型 ---
export interface HeavenlyCalculation {
  天道值: number;
  修正因子: number;
  基础计算: any;
  [key: string]: any;
}

export interface CoreAttributes {
  气血: ValuePair<number>;
  灵气: ValuePair<number>;
  神识: ValuePair<number>;
  修为: ValuePair<number>;
}

export interface DeathState {
  已死亡: boolean;
  死亡时间?: string;
  死亡原因?: string;
}

// --- 基础与通用类型 ---

export interface Vector2 {
  X: number;
  Y: number;
}

export interface ValuePair<T> {
  当前: T;
  最大: T;
}

/** 英文字段名的ValuePair（用于vitals字段） */
export interface EnglishValuePair<T> {
  current: T;
  max: T;
}

/** 物品品质信息 - 新版本 */

export interface ItemQuality {
  quality: QualityType; // 品质等级：神、仙、天、地、玄、黄、凡
  grade: GradeType; // 品级：0-10
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

/** 装备增幅或功法属性加成 */
export interface AttributeBonus {
  气血上限?: number;
  灵气上限?: number;
  神识上限?: number;
  后天六司?: Partial<InnateAttributes>;
  [key: string]: any; // 允许其他动态属性
}

/** 功法技能 */
export interface TechniqueSkill {
  技能类型: '攻击' | '防御' | '辅助' | '移动' | '其他';
  技能描述: string;
  解锁条件: string;
}

/** 功法效果 */
export interface TechniqueEffects {
  修炼速度加成?: number;
  属性加成?: Partial<InnateAttributes & { [key: string]: number }>;
  特殊能力?: string[];
}

/** 基础物品接口 */
export interface BaseItem {
  物品ID: string;
  名称: string;
  类型: '装备' | '功法' | '其他';
  品质: ItemQuality;
  数量: number;
  已装备?: boolean;
  描述: string;
  可叠加?: boolean;
}

/** 装备类型物品 */
export interface EquipmentItem extends BaseItem {
  类型: '装备';
  装备增幅?: AttributeBonus;
}

/** 功法类型物品 */
export interface TechniqueItem extends BaseItem {
  类型: '功法';
  功法效果?: TechniqueEffects;
  功法技能?: Record<string, TechniqueSkill>;
  修炼进度?: number;
  修炼中?: boolean;
}

/** 其他/消耗品类型物品 */
export interface ConsumableItem extends BaseItem {
  类型: '其他';
  使用效果?: string;
}

/** 物品的联合类型 */
export type Item = EquipmentItem | TechniqueItem | ConsumableItem;


/** 修炼功法数据 */
export interface CultivationTechniqueData extends AIMetadata {
  功法: string | { 物品ID: string; 名称: string; } | null; // 功法物品的 物品ID 或引用对象
  熟练度: number;
  已解锁技能: string[];
  修炼时间: number;
  突破次数: number;
  正在修炼: boolean;
  修炼进度: number;
}

export interface Inventory extends AIMetadata {
  灵石: {
    下品: number;
    中品: number;
    上品: number;
    极品: number;
  };
  物品: Record<string, Item>; // 物品现在是对象结构，key为物品ID，value为Item对象
}

/** 功法中的技能信息 */
export interface SkillInfo {
  name: string;
  description: string;
  type: '攻击' | '防御' | '辅助' | '移动' | '其他';
  unlockCondition: string;
  unlocked: boolean;
}

// --- 宗门系统相关类型 ---

/** 宗门类型 */
export type SectType = '正道宗门' | '魔道宗门' | '中立宗门' | '商会' | '世家' | '散修联盟';

/** 宗门职位 */
export type SectPosition = '散修' | '外门弟子' | '内门弟子' | '核心弟子' | '传承弟子' | '执事' | '长老' | '太上长老' | '副掌门' | '掌门';

/** 宗门关系 */
export type SectRelationship = '仇敌' | '敌对' | '冷淡' | '中立' | '友好' | '盟友' | '附庸';

/** 修为境界等级 */
export type RealmLevel = '练气' | '筑基' | '金丹' | '元婴' | '化神' | '炼虚' | '合体' | '渡劫';

/** 宗门成员信息 */
export interface SectMemberInfo {
  sectName: string; // 宗门名称
  sectType: SectType; // 宗门类型
  position: SectPosition; // 在宗门中的职位
  contribution: number; // 贡献点数
  relationship: SectRelationship; // 与宗门的关系
  reputation: number; // 在宗门中的声望
  joinDate: string; // 加入日期
  description?: string; // 描述
  // 新增字段（简化版）
  师父?: string; // 师父姓名
  同门关系?: string[]; // 同门师兄弟姓名列表
  宗门职务?: string[]; // 当前承担的宗门职务
}

/** 宗门基础信息 */
export interface SectInfo {
  name: string; // 宗门名称
  type: SectType; // 宗门类型
  level: '一流' | '二流' | '三流' | '末流'; // 宗门等级
  location?: string; // 总部位置
  description: string; // 宗门描述
  specialties: string[]; // 宗门特色
  // removed: 不再存储数值型“实力评估”
  memberCount: SectMemberCount; // 成员数量统计
  relationshipToPlayer: SectRelationship; // 与玩家的关系
  reputation: number; // 玩家在该宗门的声望
  canJoin: boolean; // 是否可以加入
  joinRequirements?: string[]; // 加入条件
  benefits?: string[]; // 加入后的好处
  // 新增：宗门领导和实力展示
  leadership?: {
    宗主: string; // 宗主姓名
    宗主修为: string; // 如"元婴后期"
    副宗主?: string; // 副宗主姓名（如有）
    长老数量: number; // 长老总数
    最强修为: string; // 宗门内最强修为
  };
  // 新增：简化的势力范围信息
  territoryInfo?: {
    controlledAreas: string[]; // 控制的区域，如：["主城", "附属镇", "资源点"]
    influenceRange: string; // 影响范围的简单描述，如："方圆百里"
    strategicValue: number; // 战略价值 (1-10)
  };
}

/** 宗门成员数量统计 */
export interface SectMemberCount {
  total: number; // 总成员数
  byRealm: Record<RealmLevel, number>; // 按境界统计
  byPosition: Record<SectPosition, number>; // 按职位统计
}

/** 宗门系统数据 */
export interface SectSystemData extends AIMetadata {
  availableSects: SectInfo[]; // 可用的宗门列表
  sectRelationships: Record<string, number>; // 与各宗门的关系值
  sectHistory: string[]; // 宗门历史记录 (修复拼写错误)
}

// --- 三千大道系统 ---

/** 大道阶段定义 */
export interface DaoStage {
  名称: string;
  描述: string;
  突破经验: number;
}

/** 大道路径定义 */
export interface DaoPath {
  道名: string;
  描述?: string;
  阶段列表?: DaoStage[];
}

/** 大道感悟进度 */
export interface DaoProgress {
  道名: string;
  当前阶段: number; // 阶段索引，0为"未门"
  当前经验: number;
  总经验: number;
  是否解锁: boolean;
}

/** 天赋进度 */
export interface TalentProgress {
  等级: number;
  当前经验: number;
  下级所需: number;
  总经验: number;
}

/** 三千大道系统数据 */
export interface ThousandDaoSystem extends AIMetadata {
  已解锁大道: string[]; // 解锁的大道名称列表
  大道进度: Record<string, DaoProgress>; // 以大道名称为key
  大道路径定义: Record<string, DaoPath | DaoStage[]>; // 所有大道的定义，支持两种格式
}

// --- 装备 ---

/** 装备槽类型 */
export interface EquipmentSlot {
  名称: string;
  物品ID: string;
  装备特效?: string[];
  装备增幅?: {
    气血上限?: number;
    灵气上限?: number;
    神识上限?: number;
    后天六司?: Partial<InnateAttributes>;
  };
  耐久度?: ValuePair<number>;
  品质?: ItemQuality;
}

export interface Equipment extends AIMetadata {
  装备1: string | null;
  装备2: string | null;
  装备3: string | null;
  装备4: string | null;
  装备5: string | null;
  装备6: string | null;
}

// --- 状态效果 ---

export type StatusEffectType = 'buff' | 'debuff'; // 统一小写

export interface StatusEffect {
  状态名称: string;
  类型: 'buff' | 'debuff';
  时间: string;
  状态描述: string;
  强度?: number;
  来源?: string;
  剩余时间?: string;
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
  special_abilities: string[]; // 特殊能力
  can_cross_realm_battle?: boolean; // 是否可越阶战斗
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


// 天道系统相关接口
export interface HeavenlySystem {
  版本: string;
  角色名称: string;
  境界等级: number;
  核心属性: {
    攻击力: number;
    防御力: number;
    灵识: number;
    敏捷: number;
    气运: number;
    境界加成: number;
  };
  死亡状态: {
    已死亡: boolean;
  };
  更新时间: string;
}

export interface PlayerStatus extends AIMetadata {
  境界: Realm;
  声望: number;
  位置: {
    描述: string;
  };
  气血: ValuePair<number>;
  灵气: ValuePair<number>;
  神识: ValuePair<number>;
  寿命: ValuePair<number>;
  状态效果: StatusEffect[];
  宗门信息?: SectMemberInfo;
  vitals?: {
    qiBlood: EnglishValuePair<number>;
    lingQi: EnglishValuePair<number>;
    shenShi: EnglishValuePair<number>;
  };
  heavenly?: HeavenlySystem;
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

// --- 世界数据类型定义 ---

/** 世界大陆信息 */
export interface WorldContinent {
  名称: string;
  name?: string; // 兼容英文名
  描述: string;
  地理特征?: string[];
  修真环境?: string;
  气候?: string;
  天然屏障?: string[];
  大洲边界?: { longitude: number; latitude: number }[];
  主要势力?: (string | number)[]; // 兼容id和名称
  factions?: (string | number)[]; // 兼容英文名
}

/** 世界势力信息 - 统一的宗门/势力数据结构 */
export interface WorldFaction {
  id?: string | number; // 增加可选的id字段
  名称: string;
  类型: '修仙宗门' | '魔道宗门' | '中立宗门' | '修仙世家' | '魔道势力' | '商会组织' | '散修联盟' | string;
  等级: '超级' | '一流' | '二流' | '三流' | string;
  所在大洲?: string; // 增加可选的所在大洲字段
  位置?: string | { longitude: number; latitude: number }; // 支持字符串描述或坐标
  势力范围?: string[] | { longitude: number; latitude: number }[]; // 支持字符串数组或坐标数组
  描述: string;
  特色: string | string[]; // 支持字符串或字符串数组
  // 实力评估: string | number; // removed: 不再生成/存储该字段
  与玩家关系?: '敌对' | '中立' | '友好' | '盟友' | string;
  声望值?: number;

  // 宗门系统扩展字段 - 只对宗门类型势力有效
  // powerRating?: number; // removed: 不再生成/存储该字段
  specialties?: string[]; // 宗门特色列表，替代 特色 字符串

  // 宗门成员统计
  memberCount?: {
    total: number;
    byRealm: Record<RealmLevel, number>;
    byPosition: Record<SectPosition, number>;
  };

  // 宗门领导层 - 新增必需字段
  leadership?: {
    宗主: string;
    宗主修为: string; // 如"化神中期"、"元婴后期"等
    副宗主?: string;
    太上长老?: string;
    太上长老修为?: string;
    最强修为: string; // 宗门内最高修为境界
    综合战力?: number; // 1-100的综合战力评估
    核心弟子数?: number;
    内门弟子数?: number;
    外门弟子数?: number;
  };

  // 势力范围详情
  territoryInfo?: {
    controlledAreas?: string[]; // 替代 势力范围 字符串数组
    influenceRange?: string;
    strategicValue?: number; // 1-10
  };

  // 加入相关
  canJoin?: boolean;
  joinRequirements?: string[];
  benefits?: string[];
}

/** 世界地点信息 */
export interface WorldLocation {
  名称: string;
  类型: '城池' | '宗门' | '秘境' | '险地' | '商会' | '坊市' | '洞府' | string;
  位置: string;
  coordinates?: { longitude: number; latitude: number }; // 原始坐标数据
  描述: string;
  特色: string;
  安全等级: '安全' | '较安全' | '危险' | '极危险' | string;
  开放状态: '开放' | '限制' | '封闭' | '未发现' | string;
  相关势力?: string[];
  特殊功能?: string[];
}

/** 世界生成信息 */
export interface WorldGenerationInfo {
  生成时间: string;
  世界背景: string;
  世界纪元: string;
  特殊设定: string[];
  版本: string;
}

/** 完整的世界信息数据结构 */
export interface WorldInfo {
  世界名称: string;
  大陆信息: WorldContinent[];
  continents?: WorldContinent[]; // 兼容旧数据
  势力信息: WorldFaction[];
  地点信息: WorldLocation[];
  地图配置?: WorldMapConfig; // 新增地图配置
  // 从 WorldGenerationInfo 扁平化
  生成时间: string;
  世界背景: string;
  世界纪元: string;
  特殊设定: string[];
  版本: string;
}

// --- 世界地图 ---

// --- NPC 模块 ---
export interface NpcBehavior {
  行为模式: string;
  日常路线: {
    时间: string;
    位置: string;
    行为: string;
  }[];
}

/** NPC记忆条目 - 时间·事件格式 */
export interface NpcMemoryItem {
  时间: string; // 时间描述，如"大乾纪元1000年春·三月初八"
  事件: string; // 事件描述
}

/** Tavern指令结构 */
export interface TavernCommand {
  action: 'set' | 'add' | 'push' | 'pull' | 'delete';
  scope: 'chat' | 'global';
  key: string;
  value?: any;
}

export interface NpcProfile {
  角色基础信息: CharacterBaseInfo; // 包含天资、灵根、天赋、先天六司
  外貌描述?: string;

  // 基础交互信息
  人物关系: string;
  人物好感度: number;
  人物记忆: Array<{
    时间: string;
    事件: string;
    重要度?: '普通' | '重要' | '关键';
  }>;

  // 位置信息（保留原有字段）
  最后出现位置: {
    描述: string;
  };

  // NPC的背包（简化但保留）
  背包: {
    灵石: {
      下品: number;
      中品: number;
      上品: number;
      极品: number;
    };
    物品: Record<string, Item>;
  };

  // 可选的角色特征
  性格特征?: string[];
  知名技能?: string[];
  势力归属?: string;

  // 辅助字段
  实时关注?: boolean;
}


// --- 记忆模块 ---

export interface Memory extends AIMetadata {
  短期记忆: string[]; // 最近的对话、事件的完整记录
  中期记忆: string[]; // 对短期记忆的总结，关键信息点
  长期记忆: string[]; // 核心人设、世界观、重大事件的固化记忆
}


// --- 游戏时间 ---

export interface GameTime extends AIMetadata {
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
  stateChanges?: StateChangeLog; // 状态变更记录
  metadata?: {
    commands?: any[];
  };
}

// 保持人物关系为严格的字典，键为NPC名称/ID，值为NpcProfile

  export interface SaveData {
    玩家角色状态: PlayerStatus;
    装备栏: Equipment;
    三千大道: ThousandDaoSystem;
    背包: Inventory;
    人物关系: Record<string, NpcProfile>; // 使用平衡的NPC格式
    宗门系统: SectSystemData;
    记忆: Memory;
    游戏时间: GameTime;
    角色基础信息?: CharacterBaseInfo;
    世界信息?: WorldInfo;
    修炼功法: CultivationTechniqueData;
    三千大道系统?: {
      大道路径定义: Record<string, DaoStage[]>;
      大道进度: Record<string, DaoProgress>;
    };
    系统?: SystemConfig; // 可选：系统规则/提示（嵌入到存储结构中）
    叙事历史?: GameMessage[]; // 存储对话历史及其状态变更日志
  }


// --- 单个存档槽位 ---

export interface SaveSlot {
  id?: string;
  存档名: string;
  保存时间: string | null;
  最后保存时间?: string | null; // 兼容旧代码，改为可为 null
  游戏内时间?: string;
  游戏时长?: number; // 游戏时长（秒）
  角色名字?: string; // 角色名字
  境界?: string; // 当前境界
  位置?: string; // 当前位置
  修为进度?: number; // 修为进度
  世界地图?: WorldMap;
  存档数据: SaveData | null;
}

// --- 角色基础信息 (静态) ---

export interface CharacterBaseInfo extends AIMetadata {
  名字: string;
  性别: string;
  年龄?: number; // 添加可选的年龄字段
  种族?: string; // 添加种族字段
  世界: string;
  天资: string;
  出生: string | {
    名称: string;
    描述: string;
  };
  灵根: string | {
    名称: string;
    品级: string; // 统一的品级字段
    描述: string;
    base_multiplier?: number;
    cultivation_speed?: string;
    special_effects?: string[];
  };
  天赋: string[] | Array<{
    名称: string;
    描述: string;
  }>;
  先天六司: InnateAttributes;
  创建时间?: string; // 添加创建时间字段
  描述?: string; // 添加描述字段
  // 保存完整的详细信息对象
  天资详情?: any;
  出身详情?: any;
  灵根详情?: {
    品级?: string; // 确保详情中也包含品级
    base_multiplier?: number;
    cultivation_speed?: string;
    special_effects?: string[];
  };
  天赋详情?: any[];
}

// --- 新物品系统类型定义 ---

/** 新物品系统的品质枚举 */
export type NewItemQuality = '凡' | '黄' | '玄' | '地' | '天' | '仙' | '神';

/** 新物品系统的类型枚举 */
export type NewItemType = '装备'| '功法' | '其他';

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

// --- 动作队列系统 ---

/** 动作类型 */
export type QueueActionType =
  | 'item_use'      // 使用物品
  | 'item_equip'    // 装备物品
  | 'item_discard'  // 丢弃物品
  | 'item_practice' // 修炼功法
  | 'npc_interact'  // NPC互动
  | 'custom';       // 自定义动作

/** 动作撤回数据 */
export interface ActionUndoData {
  type: QueueActionType;
  itemId?: string;
  itemName?: string;
  quantity?: number;
  originalQuantity?: number;
  [key: string]: any; // 其他撤回需要的数据
}

/** 单个动作项 */
export interface QueueActionItem {
  id: string;
  text: string; // 显示给用户的文本
  type: QueueActionType;
  canUndo: boolean; // 是否可以撤回
  undoData?: ActionUndoData; // 撤回时需要的数据
  timestamp: number;
}

/** 动作队列 - 用于收集用户操作的文本描述 */
export interface ActionQueue {
  actions: QueueActionItem[]; // 动作列表
}

// --- 顶层本地存储结构 ---

export interface LocalStorageRoot {
  当前激活存档: {
    角色ID: string;
    存档槽位: string; // e.g., "存档1" for single player, or a default key for online
  } | null;
  角色列表: Record<string, CharacterProfile>; // 以角色唯一ID (char_1001) 为key
}
