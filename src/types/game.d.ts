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
  初始年龄?: number; // 开局年龄，用于自动计算寿命
  开局时间?: GameTime; // 开局游戏时间，用于自动计算寿命
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

/** 功法技能 */
export interface TechniqueSkill {
  技能名称: string;
  技能描述: string;
  消耗?: string;
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


/** 修炼功法数据（功法数据+进度合并） */
export interface CultivationTechniqueData extends AIMetadata {
  物品ID: string; // 功法物品ID
  名称: string; // 功法名称
  类型: '功法';
  品质: ItemQuality;
  描述: string;
  功法效果?: TechniqueEffects;
  功法技能?: Record<string, TechniqueSkill>;

  // 进度数据（与功法数据合并）
  熟练度: number;
  已解锁技能: string[]; // 已解锁的技能名称列表
  修炼时间: number;
  突破次数: number;
  正在修炼: boolean;
  修炼进度: number;
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
    x?: number; // 地图X坐标 (0-3600)
    y?: number; // 地图Y坐标 (0-2400)
  };
  气血: ValuePair<number>;
  灵气: ValuePair<number>;
  神识: ValuePair<number>;
  寿命: ValuePair<number>;
  状态效果: StatusEffect[];
  宗门信息?: SectMemberInfo;
  天道点?: number;
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
    长老数量?: number; // 宗门长老数量
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

/** Tavern指令结构 */
export interface TavernCommand {
  action: 'set' | 'add' | 'push' | 'pull' | 'delete';
  scope: 'chat' | 'global';
  key: string;
  value?: any;
}

/** 身体部位开发数据 */
export interface BodyPartDevelopment {
  部位名称: string; // 如：胸部、小穴、菊穴、嘴唇、耳朵等
  敏感度: number; // 0-100
  开发程度: number; // 0-100
  特殊标记?: string; // 如：「已调教」「极度敏感」「可喷奶」
  描述?: string; // 部位的详细描述，如："娇小粉嫩，轻触即颤"、"紧致温润，吸附感强"
}

/** NPC私密信息模块 (NSFW) - 仅在开启NSFW模式时生成和显示 */
export interface NpcPrivacyProfile {
  // === 基础状态 ===
  是否为处女: boolean;
  是否为处男?: boolean; // 男性NPC专用

  // === 身体开发（核心系统）===
  身体部位: BodyPartDevelopment[]; // 动态部位列表，可扩展
  /* 常见部位示例：
   * 女性：胸部、乳头、小穴、阴蒂、菊穴、嘴唇、舌头、耳朵、脖颈、大腿内侧、腰部、腹部、足部
   * 男性：阴茎、龟头、菊穴、乳头、嘴唇、耳朵等
   * 特殊：尾巴（妖族）、角（魔族）、翅膀等
   */

  // === 性格与取向 ===
  性格倾向: '纯情' | '主动' | '被动' | '淫荡' | 'M' | 'S' | '双性';
  性取向: '异性恋' | '同性恋' | '双性恋' | '泛性恋';
  性癖好?: string[]; // 如：['捆绑', '野外', '多人', '言语羞辱', '窒息', '角色扮演']

  // === 实时状态（用 set 直接替换）===
  性渴望程度: number; // 0-100，当前性欲强度
  当前性状态: '正常' | '微湿' | '兴奋' | '发情' | '潮吹' | '高潮' | '连续高潮' | '贤者时间';
  体液分泌状态?: string; // 如：「微微湿润」「爱液横流」「淫水泛滥」

  // === 性经验与统计 ===
  性交总次数: number; // 所有类型性行为的总次数（性交+口交+肛交等）
  性伴侣数量: number;
  性伴侣名单?: string[]; // 所有性伴侣的名字列表
  最近一次性行为时间?: string; // 游戏时间

  // === 特殊体质（可选）===
  特殊体质?: string[]; // 如：['易潮吹', '多重高潮', '性爱成瘾', '淫纹', '媚药体质']
}

/** NPC核心档案 - 精简高效的数据结构 */
export interface NpcProfile {
  // === 核心身份 ===
  名字: string;
  性别: '男' | '女' | '其他';
  年龄: number; // 当前年龄（自动从出生日期计算）
  出生日期?: { 年: number; 月: number; 日: number; 小时?: number; 分钟?: number }; // 出生日期（用于自动计算年龄）
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
    x?: number; // 地图X坐标 (0-3600)
    y?: number; // 地图Y坐标 (0-2400)
  };
  势力归属?: string;

  // === 人格系统 ===
  人格底线: string[]; // 如：['背叛信任', '伤害亲友', '公开侮辱', '强迫违背意愿']，触犯后好感度断崖式下跌

  // === 记忆系统 ===
  记忆: Array<{ 时间: string; 事件: string }>;
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
  私密信息?: NpcPrivacyProfile; // 仅NSFW模式下存在
  实时关注: boolean; // 标记为关注的NPC会在AI回合中主动更新
}


// --- 记忆模块 ---

export interface Memory extends AIMetadata {
  短期记忆: string[]; // 最近的对话、事件的完整记录
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
    角色基础信息: CharacterBaseInfo; // 必填，包含天赋数据+进度
    世界信息?: WorldInfo;
    修炼功法: CultivationTechniqueData | null; // 功法数据+进度合并，可为null表示未修炼
    掌握技能: MasteredSkill[]; // 技能数据+进度合并
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
  性别: '男' | '女' | '其他';
  年龄?: number; // 当前年龄（自动从出生日期计算，不要手动修改）
  出生日期?: { 年: number; 月: number; 日: number; 小时?: number; 分钟?: number }; // 出生日期（用于自动计算年龄）
  种族?: string; // 添加种族字段
  境界?: string; // NPC当前境界
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
  天赋: Array<{
    名称: string;
    描述: string;
    // 进度数据（与天赋数据合并）
    等级?: number;
    当前经验?: number;
    下级所需?: number;
    总经验?: number;
  }>;
  先天六司: InnateAttributes;
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