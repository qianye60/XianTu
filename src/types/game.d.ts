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
  // 功法特有属性
  功法效果?: {
    修炼速度加成?: number; // 修炼速度倍数
    属性加成?: Partial<InnateAttributes>; // 修炼后获得的属性加成
    特殊能力?: string[]; // 特殊能力描述
    前置要求?: {
      最低境界?: string;
      必需属性?: Partial<InnateAttributes>;
      灵根要求?: string[];
    };
  };
  功法技能?: { // 功法包含的技能
    [技能名称: string]: {
      解锁条件: string; // 如"熟练度达到30%"
      技能描述: string;
      技能类型: '攻击' | '防御' | '辅助' | '移动' | '其他';
    };
  };
  修炼进度?: number; // 当前修炼进度 (0-100)
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
export type SectPosition = '散修' | '外门弟子' | '内门弟子' | '核心弟子' | '传承弟子' | '执事' | '长老' | '副掌门' | '掌门';

/** 宗门关系 */
export type SectRelationship = '仇敌' | '敌对' | '冷淡' | '中立' | '友好' | '盟友' | '附庸';

/** 修为境界等级 */
export type RealmLevel = '练气' | '筑基' | '金丹' | '元婴' | '化神' | '炼虚' | '合体' | '大乘' | '渡劫' | '真仙';

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
  powerRating: number; // 实力评估 (0-100)
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
    controlledAreas: string[]; // 控制的区域，如：["青云城", "望月镇", "灵石矿"]
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
export interface SectSystemData {
  availableSects: SectInfo[]; // 可用的宗门列表
  sectRelationships: Record<string, number>; // 与各宗门的关系值
  sectHistory: string[]; // 宗门历史记录 (修复拼写错误)
}

// --- 三千大道系统 ---

/** 大道阶段定义 */

export interface DaoStage {
  名称: string;
  描述: string;
  突破经验: number; // 突破到下一阶段需要的经验
}

/** 大道路径定义 */

export interface DaoPath {
  道名: string;
  描述: string;
  阶段列表: DaoStage[];
}

/** 大道修炼进度 */

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

export interface ThousandDaoSystem {
  已解锁大道: string[]; // 解锁的大道名称列表
  大道进度: Record<string, DaoProgress>; // 以大道名称为key
  大道路径定义: Record<string, DaoPath>; // 所有大道的定义
}

// --- 装备 ---

export interface Equipment {
  法宝1?: Item | string | null; // 物品对象或物品ID（兼容性）
  法宝2?: Item | string | null;
  法宝3?: Item | string | null;
  法宝4?: Item | string | null;
  法宝5?: Item | string | null;
  法宝6?: Item | string | null;
}

// --- 状态效果 ---

export type StatusEffectType = 'buff' | 'debuff'; // 统一小写

export interface StatusEffect {
  状态名称: string;
  类型: 'buff' | 'debuff'; // 统一小写
  时间: string; // "没解毒前永远存留" 或具体时间
  状态描述: string;
  强度?: number; // 1-10，表示状态效果的强度
  来源?: string; // 状态效果的来源，如"引气丹"、"毒蛇咬伤"等
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
  出生地?: string; // 添加出生地字段
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
  宗门信息?: SectMemberInfo; // 宗门信息
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
  描述: string;
  地理特征?: string[];
  修真环境?: string;
  气候?: string;
  天然屏障?: string[];
  大洲边界?: { longitude: number; latitude: number }[];
}

/** 世界势力信息 - 统一的宗门/势力数据结构 */
export interface WorldFaction {
  名称: string;
  类型: '修仙宗门' | '魔道宗门' | '中立宗门' | '修仙世家' | '魔道势力' | '商会组织' | '散修联盟' | string;
  等级: '超级' | '一流' | '二流' | '三流' | string;
  位置?: string | { longitude: number; latitude: number }; // 支持字符串描述或坐标
  势力范围?: string[] | { longitude: number; latitude: number }[]; // 支持字符串数组或坐标数组  
  描述: string;
  特色: string | string[]; // 支持字符串或字符串数组
  实力评估: string | number; // 支持字符串描述或数字评分
  与玩家关系?: '敌对' | '中立' | '友好' | '盟友' | string;
  声望值?: number;
  
  // 宗门系统扩展字段 - 只对宗门类型势力有效
  powerRating?: number; // 实力评估 (0-100)，替代 实力评估 字符串
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
    长老数量: number;
    最强修为: string; // 宗门内最高修为境界
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
  世界背景: string;
  大陆信息: WorldContinent[];
  势力信息: WorldFaction[];
  地点信息: WorldLocation[];
  生成信息: WorldGenerationInfo;
}

/** 世界地图数据 */
export interface WorldMapData {
  当前位置: string;
  已探索地点: string[];
  可到达地点: string[];
  地点关系图: Record<string, string[]>; // 地点之间的连接关系
  特殊标记: Record<string, any>; // 地图上的特殊标记
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
  // 简化：只保留最核心的外貌描述
  外貌描述?: string; // 简单的一句话描述，如"身材高大的中年男子，仙风道骨，手持拂尘"
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
  三千大道: ThousandDaoSystem;
  背包: Inventory;
  人物关系: Record<string, NpcProfile>; // 以NPC名字或唯一ID为key
  宗门系统: SectSystemData; // 宗门系统数据，改为必需
  记忆: Memory;
  游戏时间: GameTime; // 游戏时间字段，改为必需
  对话历史?: GameMessage[]; // 对话历史数组
  // --- [核心重构] 新增字段，用于统一存储所有动态数据 ---
  角色基础信息?: CharacterBaseInfo;
  世界信息?: WorldInfo; // 世界基础信息
  创建数据?: {
    worlds: any[];
    talentTiers: any[];
    origins: any[];
    spiritRoots: any[];
    talents: any[];
  }; // 角色创建时的数据缓存
  修炼功法: {
    功法: Item | null;
    熟练度: number; // 0-100，改为必需
    已解锁技能: string[]; // 从功法中学会的技能，改为必需
    修炼时间: number; // 总修炼时间（小时），改为必需
    突破次数: number; // 功法境界突破次数，改为必需
  }; // 修炼功法改为必需
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
  // 新增：保存完整的详细信息对象
  世界详情?: any; // World 对象
  天资详情?: any; // TalentTier 对象
  出身详情?: any; // Origin 对象
  灵根详情?: any; // SpiritRoot 对象，包含 cultivation_speed, special_effects 等
  天赋详情?: any[]; // Talent[] 对象数组
}

// --- 新物品系统类型定义 ---

/** 新物品系统的品质枚举 */
export type NewItemQuality = '凡' | '黄' | '玄' | '地' | '天' | '仙' | '神';

/** 新物品系统的类型枚举 */
export type NewItemType = '法宝'| '功法' | '其他';

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
