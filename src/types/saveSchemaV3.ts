import type {
  ActionQueue,
  CharacterBaseInfo,
  CultivationTechniqueReference,
  Equipment,
  GameMessage,
  GameTime,
  Inventory,
  MasteredSkill,
  Memory,
  NpcProfile,
  SectMemberInfo,
  SectSystemV2,
  StatusEffect,
  SystemConfig,
  PlayerAttributes,
  PlayerLocation,
  WorldInfo,
  EventSystem,
  BodyStats
} from '@/types/game';

/**
 * 存档格式 V3（唯一真相）：以 `docs/save-schema-v3.md` 为准。
 * 顶层只允许：元数据 / 角色 / 社交 / 世界 / 系统
 */

export interface SaveMetaV3 {
  版本号: 3;
  存档ID: string;
  存档名: string;
  游戏版本?: string;
  创建时间: string;
  更新时间: string;
  游戏时长秒: number;
  时间: GameTime;
}

export interface OnlineStateV3 {
  模式: '单机' | '联机';
  房间ID?: string | null;
  玩家ID?: string | null;
  服务器版本?: number;
  最后同步时间?: string | null;
  只读路径: string[];
  世界曝光?: boolean;
  冲突策略?: '服务器' | '客户端' | '合并' | string;
}

export interface TechniqueProgressEntryV3 {
  熟练度: number;
  已解锁技能: string[];
}

export interface TechniqueSystemV3 {
  当前功法ID: string | null;
  功法进度: Record<string, TechniqueProgressEntryV3>;
  功法套装: {
    主修: string | null;
    辅修: string[];
  };
}

export interface CultivationStateV3 {
  修炼功法: CultivationTechniqueReference | null;
  修炼状态?: {
    模式: string;
    开始时间?: string;
    消耗?: Record<string, unknown>;
    [key: string]: unknown;
  };
  经脉?: unknown;
  丹田?: unknown;
  突破?: unknown;
  [key: string]: unknown;
}

export interface DaoSystemV3 {
  大道列表: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SkillStateV3 {
  掌握技能: MasteredSkill[];
  装备栏: string[];
  冷却: Record<string, unknown>;
}

export interface SaveDataV3 {
  元数据: SaveMetaV3;
  角色: {
    身份: CharacterBaseInfo;
    属性: PlayerAttributes;
    位置: PlayerLocation;
    效果: StatusEffect[];
    身体?: BodyStats;
    背包: Inventory;
    装备: Equipment;
    功法: TechniqueSystemV3;
    修炼: CultivationStateV3;
    大道: DaoSystemV3;
    技能: SkillStateV3;
  };
  社交: {
    关系: Record<string, NpcProfile>;
    宗门?: (SectSystemV2 & { 成员信息?: SectMemberInfo }) | null;
    事件: EventSystem;
    记忆: Memory;
  };
  世界: {
    信息: WorldInfo;
    状态?: unknown;
  };
  系统: {
    配置?: SystemConfig;
    设置?: Record<string, unknown>;
    缓存?: Record<string, unknown>;
    行动队列?: ActionQueue;
    历史?: { 叙事?: GameMessage[] };
    扩展?: Record<string, unknown>;
    联机: OnlineStateV3;
  };
}
