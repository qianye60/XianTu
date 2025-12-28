// src/types/game.d.ts

/**
 * @fileoverview
 * 坤舆图志 - 游戏核心数据结构天规
 * 此文件定义了整个游戏存档、角色、NPC等核心数据的TypeScript类型。
 * 所有数据结构均基于道友提供的最新《大道坤舆图》。
 */

import type { QualityType, GradeType } from '@/data/itemQuality';
import type { World, TalentTier, Origin, SpiritRoot, Talent } from './index';
export type { WorldMapConfig } from './worldMap';

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
  初始年龄?: number; // 开局年龄，用于自动计算寿命
  开局时间?: GameTime; // 开局游戏时间，用于自动计算寿命
  规则?: {
    属性上限?: AttributeLimitConfig;
    装备系统?: string;
    品质控制?: string;
  };
  提示?: string | string[]; // 可放置给AI的约束提示，随存档一并注入
  nsfwMode?: boolean; // 是否开启NSFW模式
  nsfwGenderFilter?: 'all' | 'male' | 'female'; // NSFW性别过滤
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

// 简化的核心属性类型（仅用于天道系统内部计算）
export interface CoreAttributes {
  攻击力: number;
  防御力: number;
  灵识: number;
  敏捷: number;
  气运: number;
  境界加成: number;
}

// 简化的死亡状态类型（仅用于天道系统内部判定）
export interface DeathState {
  已死亡: boolean;
  死亡时间?: string;
  死亡原因?: string;
}

// 简化的天道系统类型（仅用于内部计算，不存储到 PlayerStatus）
export interface HeavenlySystem {
  版本: string;
  角色名称: string;
  境界等级: number;
  核心属性: CoreAttributes;
  死亡状态: DeathState;
  更新时间: string;
}

// --- 基础与通用类型 ---

export interface Vector2 {
  X: number;
  Y: number;
}

export interface ValuePair<T> {
  当前: T;
  上限: T;
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

/** 功法技能（背包中功法物品的技能数组） */
export interface TechniqueSkill {
  技能名称: string;
  技能描述: string;
  消耗?: string;
  熟练度要求?: number; // 达到此修炼进度后解锁（0-100百分比）
  [key: string]: any; // 允许其他动态属性
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
  已装备?: boolean; // true表示装备中/修炼中，false表示未装备
  描述: string;
  可叠加?: boolean;
}

/** 装备类型物品 */
export interface EquipmentItem extends BaseItem {
  类型: '装备';
  装备增幅?: AttributeBonus;
  特殊效果?: string | AttributeBonus;
}

/** 功法类型物品 */
export interface TechniqueItem extends BaseItem {
  类型: '功法';
  功法效果?: TechniqueEffects;
  功法技能?: TechniqueSkill[]; // ✅ 改为数组格式
  修炼进度?: number; // 0-100 百分比
  修炼中?: boolean; // 是否正在修炼（兼容旧代码）
  已解锁技能?: string[]; // ✅ 已解锁的技能名称列表
  // 注意：新代码应使用 已装备 字段，修炼中 仅为向后兼容
}

/** 其他/消耗品类型物品 */
export interface ConsumableItem extends BaseItem {
  类型: '其他';
  使用效果?: string;
}

/** 物品的联合类型 */
export type Item = EquipmentItem | TechniqueItem | ConsumableItem;


/** 修炼功法引用（只存储引用，不存储完整数据） */
export interface CultivationTechniqueReference {
  物品ID: string;    // 引用背包中的功法ID
  名称: string;      // 功法名称（用于快速显示）
}

/** 掌握的技能（技能数据+进度合并） */
export interface MasteredSkill {
  技能名称: string;
  技能描述: string;
  来源: string; // 来源功法名称
  消耗?: string; // 消耗说明

  // 进度数据（与技能数据合并）
  熟练度: number; // 技能熟练度
  使用次数: number; // 使用次数统计
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
  type: string; // 简化：统一为字符串类型
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
  宗门名称: string;
  宗门类型: SectType;
  职位: SectPosition;
  贡献: number;
  关系: SectRelationship;
  声望: number;
  加入日期: string;
  描述?: string;
}

/** 宗门基础信息 */
export interface SectInfo {
  名称: string; // 宗门名称
  类型: SectType; // 宗门类型
  等级: '一流' | '二流' | '三流' | '末流'; // 宗门等级
  位置?: string; // 总部位置
  描述: string; // 宗门描述
  特色: string[]; // 宗门特色
  成员数量: SectMemberCount; // 成员数量统计
  与玩家关系: SectRelationship; // 与玩家的关系
  声望: number; // 玩家在该宗门的声望
  可否加入: boolean; // 是否可以加入
  加入条件?: string[]; // 加入条件
  加入好处?: string[]; // 加入后的好处
  // 新增：宗门领导和实力展示
  领导层?: {
    宗主: string; // 宗主姓名
    宗主修为: string; // 如"元婴后期"
    副宗主?: string; // 副宗主姓名（如有）
    长老数量: number; // 长老总数
    最强修为: string; // 宗门内最强修为
  };
  // 新增：简化的势力范围信息
  势力范围?: {
    控制区域: string[]; // 控制的区域，如：["主城", "附属镇", "资源点"]
    影响范围: string; // 影响范围的简单描述，如："方圆百里"
    战略价值: number; // 战略价值 (1-10)
  };
}

/** 宗门成员数量统计 */
export interface SectMemberCount {
  总数?: number; // 总成员数
  total?: number; // 英文字段名兼容
  按境界?: Record<RealmLevel, number>; // 按境界统计
  byRealm?: Record<string, number>; // 英文字段名兼容
  按职位?: Record<SectPosition, number>; // 按职位统计
  byPosition?: Record<string, number>; // 英文字段名兼容
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

/** 大道数据（大道定义+进度合并） */
export interface DaoData {
  道名: string;
  描述: string;
  阶段列表: DaoStage[]; // 大道的所有阶段定义

  // 进度数据（与大道数据合并）
  是否解锁: boolean;
  当前阶段: number; // 阶段索引，0为"入门"
  当前经验: number;
  总经验: number;
}

/** 三千大道系统数据 */
export interface ThousandDaoSystem extends AIMetadata {
  大道列表: Record<string, DaoData>; // 以大道名称为key，数据+进度合并
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
  生成时间: {
    年: number;
    月: number;
    日: number;
    小时: number;
    分钟: number;
  };
  持续时间分钟: number;
  状态描述: string;
  强度?: number;
  来源?: string;
  时间?: string; // 可选：时间描述（如"3天"、"1个月"）
  剩余时间?: string; // 可选：剩余时间描述
}

// --- 角色实时状态 ---

export interface Realm {
  名称: string;        // 境界名称，如"练气"、"筑基"
  阶段: string;        // 境界阶段，如"初期"、"中期"、"后期"、"圆满"
  当前进度: number;    // 当前修炼进度
  下一级所需: number;  // 突破到下一阶段所需进度
  突破描述: string;    // 突破到下一阶段的描述
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



export interface PlayerStatus extends AIMetadata {
  境界: Realm; // 境界包含了修为进度（当前进度 = 修为当前，下一级所需 = 修为最大）
  声望: number;
  位置: {
    描述: string;
    x?: number; // 经度坐标 (Longitude, 通常 100-115)
    y?: number; // 纬度坐标 (Latitude, 通常 25-35)
  };
  气血: ValuePair<number>;
  灵气: ValuePair<number>;
  神识: ValuePair<number>;
  寿命: ValuePair<number>;
  状态效果: StatusEffect[];
  宗门信息?: SectMemberInfo;
  任务系统?: SystemTaskData;
  // 注意: 玩家的NSFW数据存储在 SaveData.身体部位开发 中，不使用 PrivacyProfile
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
  声望: number;
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
  大洲边界?: { x: number; y: number }[];
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
  位置?: string | { x: number; y: number }; // 支持字符串描述或坐标
  势力范围?: string[] | { x: number; y: number }[]; // 支持字符串数组或坐标数组
  描述: string;
  特色: string | string[]; // 支持字符串或字符串数组
  与玩家关系?: '敌对' | '中立' | '友好' | '盟友' | string;
  声望值?: number;

  // 宗门系统扩展字段 - 只对宗门类型势力有效
  特色列表?: string[]; // 宗门特色列表，替代 特色 字符串

  // 宗门成员统计
  成员数量?: SectMemberCount;

  // 宗门领导层 - 新增必需字段
  领导层?: {
    宗主: string;
    宗主修为: string; // 如"化神中期"、"元婴后期"等
    副宗主?: string;
    太上长老?: string;
    太上长老修为?: string;
    长老数量?: number; // 宗门长老数量
    最强修为: string; // 宗门内最高修为境界
    综合战力?: number; // 1-100的综合战力评估
    核心弟子数?: number;
    内门弟子数?: number;
    外门弟子数?: number;
  };

  // 势力范围详情
  势力范围详情?: {
    控制区域?: string[]; // 替代 势力范围 字符串数组
    影响范围?: string;
    战略价值?: number; // 1-10
  };

  // 加入相关
  可否加入?: boolean;
  加入条件?: string[];
  加入好处?: string[];
}

/** 世界地点信息 */
export interface WorldLocation {
  名称: string;
  类型: '城池' | '宗门' | '秘境' | '险地' | '商会' | '坊市' | '洞府' | string;
  位置: string;
  coordinates?: { x: number; y: number }; // 原始坐标数据
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

// --- 统一任务系统 ---

/** 任务目标 */
export interface QuestObjective {
  描述: string;           // "击败3只黑风狼"
  类型: '击杀' | '采集' | '对话' | '到达' | '使用物品';
  目标ID: string;        // "monster_黑风狼" 或 "npc_张长老"
  需求数量: number;
  当前进度: number;
  已完成: boolean;
}

/** 任务奖励（统一格式） */
export interface QuestReward {
  修为?: number;
  灵石?: {
    下品?: number;
    中品?: number;
    上品?: number;
    极品?: number;
  };
  物品?: Array<{
    物品ID: string;
    名称: string;
    数量: number;
  }>;
  声望?: {
    势力名称: string;
    变化值: number;
  };
  属性加成?: Partial<InnateAttributes>; // 属性奖励
  技能?: string[]; // 技能奖励
  好感度?: { NPC名称: string; 变化值: number }; // 好感度奖励
  自定义描述?: string; // 其他自定义奖励描述
}

/** 任务类型（无主次之分，一切随机） */
export type QuestType =
  | '宗门' | '奇遇' | '日常'  // 传统RPG任务类型
  | '系统任务' | '道侣培养' | '修为提升' | '收集资源' | '战斗挑战'; // 系统任务类型

/** 任务主体（统一格式） */
export interface Quest {
  任务ID: string;
  任务名称: string;
  任务描述: string;
  任务类型: QuestType;
  任务状态: '未接取' | '进行中' | '已完成' | '已失败' | '已过期';
  目标列表: QuestObjective[];
  奖励: QuestReward;
  失败惩罚?: string;

  // 时间相关
  创建时间: GameTime | string; // 支持游戏时间或字符串格式
  完成时间?: GameTime | string;
  有效期分钟?: number; // 任务有效期（分钟），undefined表示永久有效

  // 任务来源
  发布者?: string; // NPC名称或"系统"
  提交者?: string; // NPC名称
  AI生成: boolean;

  // 前置条件
  前置条件?: {
    境界要求?: string;
    前置任务?: string;
    其他条件?: string;
  };
}

/** 任务系统配置 */
export interface QuestSystemConfig {
  启用系统任务: boolean; // 是否启用自动生成的系统任务
  系统任务类型: string; // 系统任务风格，如 "道侣养成系统" "修仙辅助系统"
  系统任务提示词: string; // AI任务生成的提示词
  自动刷新: boolean; // 完成任务后是否自动生成新任务
  默认任务数量: number; // 默认未完成任务池数量
}

/** 任务系统（统一管理所有任务） */
export interface QuestSystem {
  配置: QuestSystemConfig;
  当前任务列表: Quest[]; // 包含所有任务（进行中、已完成等）
  任务统计: {
    完成总数: number;
    各类型完成: Record<QuestType, number>; // 按类型统计
  };
}

// --- 世界地图 ---

// --- NPC 模块 ---

// TavernCommand is now imported from AIGameMaster.d.ts to avoid conflicts

/** 身体部位开发数据 */
export interface BodyPartDevelopment {
  部位名称: string; // 如：胸部、小穴、菊穴、嘴唇、耳朵等
  敏感度: number; // 0-100
  开发度: number; // 0-100（统一使用"开发度"，与AI提示词保持一致）
  特殊印记?: string; // 如：「已调教」「极度敏感」「可喷奶」、「合欢莲印」等
  特征描述: string; // 部位的详细描述，如："娇小粉嫩，轻触即颤"、"紧致温润，吸附感强"
}

/** 玩家身体部位开发数据 - 简化结构 */
export interface PlayerBodyPart {
  特征描述: string;
}

/** 统一的私密信息模块 (NSFW) */
export interface PrivacyProfile {
  是否为处女: boolean;
  身体部位: BodyPartDevelopment[];
  性格倾向: string;
  性取向: string;
  性癖好: string[];
  性渴望程度: number;
  当前性状态: string;
  体液分泌状态: string;
  性交总次数: number;
  性伴侣名单: string[];
  最近一次性行为时间: string;
  特殊体质: string[];
}

/** NPC核心档案 - 精简高效的数据结构 */
export interface NpcProfile {
  // === 核心身份 ===
  名字: string;
  性别: '男' | '女' | '其他';
  出生日期: { 年: number; 月: number; 日: number; 小时?: number; 分钟?: number }; // 出生日期（用于自动计算年龄）
  种族?: string; // 如：人族、妖族、魔族
  出生: string | { 名称?: string; 描述?: string }; // 出生背景，如："焚天林氏遗孤"（必填）
  外貌描述: string; // AI生成的外貌描述，必填
  性格特征: string[]; // 如：['冷静', '谨慎', '好色']

  // === 修炼属性 ===
  境界: Realm;
  灵根: CharacterBaseInfo['灵根'];
  天赋: CharacterBaseInfo['天赋']; // 天赋列表
  先天六司: InnateAttributes; // NPC只有一个六司字段，不分先天/最终

  // === 社交关系 ===
  与玩家关系: string; // 如：道侣、师徒、朋友、敌人、陌生人
  好感度: number; // -100 到 100
  当前位置: {
    描述: string;
    x?: number; // 经度坐标 (Longitude, 通常 100-115)
    y?: number; // 纬度坐标 (Latitude, 通常 25-35)
  };
  势力归属?: string;

  // === 人格系统 ===
  人格底线: string[] | string; // 如：['背叛信任', '伤害亲友', '公开侮辱', '强迫违背意愿']，触犯后好感度断崖式下跌

  // === 记忆系统 ===
  记忆: Array<{ 时间: string; 事件: string } | string>; // 兼容新旧格式：对象或纯字符串
  记忆总结?: string[];

  // === 实时状态（用 set 直接替换）===
  当前外貌状态: string; // 如："脸颊微红，眼神迷离" / "衣衫整洁，神态自然"
  当前内心想法: string; // 如："在思考什么..." / "对xxx感到好奇"

  // === 资产物品 ===
  背包: {
    灵石: { 下品: number; 中品: number; 上品: number; 极品: number };
    物品: Record<string, Item>;
  };

  // === 可选模块 ===
  私密信息?: PrivacyProfile; // 仅NSFW模式下存在
  实时关注: boolean; // 标记为关注的NPC会在AI回合中主动更新

  // === 旧数据兼容字段 ===
  外貌?: string;
  性格?: string;
}


// --- 记忆模块 ---

export interface Memory extends AIMetadata {
  短期记忆?: string[]; // 最近的对话、事件的完整记录
  中期记忆: string[]; // 对短期记忆的总结，关键信息点
  长期记忆: string[]; // 核心人设、世界观、重大事件的固化记忆
  隐式中期记忆?: string[]; // 隐式中期记忆数组，与短期记忆同步增长，溢出时转入真正的中期记忆
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
  actionOptions: string[]; // 行动选项（必填）
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
      任务系统: QuestSystem; // 统一的任务系统
      记忆: Memory;
      游戏时间: GameTime;
      角色基础信息: CharacterBaseInfo; // 必填，包含天赋数据+进度
      世界信息?: WorldInfo;
      修炼功法: CultivationTechniqueReference | null; // ✅ 只存引用，可为null表示未修炼
      掌握技能: MasteredSkill[]; // 技能数据+进度合并
      系统?: SystemConfig; // 可选：系统规则/提示（嵌入到存储结构中）
      叙事历史?: GameMessage[]; // 存储对话历史及其状态变更日志
      身体部位开发?: Record<string, PlayerBodyPart>; // 可选：身体部位开发
    }


// --- 单个存档槽位 ---

export interface SaveSlot {
  id?: string;
  存档名: string;
  保存时间: string | null;
  最后保存时间?: string | null; // 新增：最后保存时间
  游戏内时间?: string;
  游戏时长?: number; // 游戏时长（秒）
  角色名字?: string; // 角色名字
  境界?: string; // 当前境界
  位置?: string; // 当前位置
  修为进度?: number; // 修为进度
  世界地图?: WorldMap;
  存档数据?: SaveData | null;
}

// --- 角色基础信息 (静态) ---

export interface CharacterBaseInfo extends AIMetadata {
  名字: string;
  性别: '男' | '女' | '其他' | string;
  出生日期: { 年: number; 月: number; 日: number; 小时?: number; 分钟?: number }; // 出生日期（用于自动计算年龄）
  种族?: string; // 添加种族字段
  境界?: string; // NPC当前境界
  世界: World;
  天资: TalentTier;
  出生: Origin | string;
  灵根: SpiritRoot | string;
  天赋: Talent[];
  先天六司: InnateAttributes;
  后天六司: InnateAttributes; // 后天获得的六司加成（装备、大道等），开局默认全为0
  创建时间?: string; // 添加创建时间字段
  描述?: string; // 添加描述字段
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

export type Continent = WorldContinent;
export type Location = WorldLocation;
