import type { SectContentStatus, SectMemberInfo, SectSystemV2, SectType, WorldFaction } from '@/types/game';
import { SECT_SYSTEM_VERSION } from '@/utils/sectMigration';

// ============================================================================
// 类型定义
// ============================================================================

type ShopItem = {
  id: string;
  name: string;
  icon: string;
  type: string;
  quality: string;
  description: string;
  cost: number;
  stock?: number;
};

type LibraryTechnique = {
  id: string;
  name: string;
  quality: string;
  qualityTier: string;
  cost: number;
  description: string;
};

/** 宗门内容生成选项 */
export interface SectContentGenerationOptions {
  /** 是否使用AI生成（true=等待AI生成，false=使用本地随机生成） */
  useAIGeneration?: boolean;
  /** 当前时间ISO字符串 */
  nowIso?: string;
}

/** 宗门框架创建结果 */
export interface SectFrameworkResult {
  sectSystem: SectSystemV2;
  memberInfo: SectMemberInfo;
  contentStatus: SectContentStatus;
}

const normalizeSectType = (typeText: string): SectType => {
  if (/魔道|魔/i.test(typeText)) return '魔道宗门';
  if (/散修联盟|散修|联盟/i.test(typeText)) return '散修联盟';
  if (/中立/i.test(typeText)) return '中立宗门';
  if (/世家|门阀|家族/i.test(typeText)) return '世家';
  if (/商会|商盟|商号/i.test(typeText)) return '商会';
  return '正道宗门';
};

const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const createSeededRandom = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
};

const buildThemeKey = (sect: WorldFaction) => {
  const raw = `${sect.类型 || ''}${Array.isArray(sect.特色) ? sect.特色.join('') : sect.特色 || ''}${Array.isArray(sect.特色列表) ? sect.特色列表.join('') : ''}`;
  if (/剑/i.test(raw)) return 'sword';
  if (/丹|药/i.test(raw)) return 'alchemy';
  if (/符|阵/i.test(raw)) return 'array';
  if (/商/i.test(raw)) return 'merchant';
  if (/妖|兽/i.test(raw)) return 'beast';
  if (/魔|邪|煞/i.test(raw)) return 'demonic';
  return 'sword';
};

/**
 * 创建加入宗门后的状态（延迟初始化模式）
 * 藏经阁和贡献商店由 AI 动态生成，此处只创建框架
 */
export const createJoinedSectState = (
  sect: WorldFaction,
  options?: { nowIso?: string }
): { sectSystem: SectSystemV2; memberInfo: SectMemberInfo } => {
  const nowIso = options?.nowIso || new Date().toISOString();
  const sectName = sect.名称;

  const memberInfo: SectMemberInfo = {
    宗门名称: sectName,
    宗门类型: normalizeSectType(String(sect.类型 || '正道宗门')),
    职位: '外门弟子',
    贡献: 0,
    关系: '友好',
    声望: 0,
    加入日期: nowIso,
    描述: sect.描述 || '',
  };

  return {
    sectSystem: {
      版本: SECT_SYSTEM_VERSION,
      当前宗门: sectName,
      宗门档案: {
        [sectName]: sect,
      },
      宗门成员: {},
      宗门藏经阁: {},  // 由 AI 动态生成
      宗门贡献商店: {},  // 由 AI 动态生成
    },
    memberInfo,
  };
};

// ============================================================================
// 框架+延迟初始化模式
// ============================================================================

/**
 * 创建默认的宗门内容状态
 */
export function createDefaultContentStatus(): SectContentStatus {
  return {
    藏经阁已初始化: false,
    贡献商店已初始化: false,
    演变次数: 0,
  };
}

/**
 * 创建宗门框架（不生成具体内容）
 *
 * 使用延迟初始化模式：
 * 1. 玩家加入宗门时只创建框架和成员信息
 * 2. 藏经阁、贡献商店等内容由 AI 动态生成
 *
 * @param sect 宗门信息
 * @param options 选项
 * @returns 宗门框架结果
 */
export function createSectFramework(
  sect: WorldFaction,
  options?: SectContentGenerationOptions
): SectFrameworkResult {
  const nowIso = options?.nowIso || new Date().toISOString();
  const sectName = sect.名称;

  const memberInfo: SectMemberInfo = {
    宗门名称: sectName,
    宗门类型: normalizeSectType(String(sect.类型 || '正道宗门')),
    职位: '外门弟子',
    贡献: 0,
    关系: '友好',
    声望: 0,
    加入日期: nowIso,
    描述: sect.描述 || '',
  };

  const contentStatus = createDefaultContentStatus();

  return {
    sectSystem: {
      版本: SECT_SYSTEM_VERSION,
      当前宗门: sectName,
      宗门档案: {
        [sectName]: sect,
      },
      宗门成员: {},
      宗门藏经阁: {},  // 空，由 AI 动态生成
      宗门贡献商店: {},  // 空，由 AI 动态生成
      内容状态: {
        [sectName]: contentStatus,
      },
    },
    memberInfo,
    contentStatus,
  };
}

/**
 * 检查宗门内容是否需要初始化
 */
export function checkSectContentNeedsInit(
  sectSystem: SectSystemV2,
  sectName: string
): { library: boolean; shop: boolean } {
  const status = sectSystem.内容状态?.[sectName];

  if (!status) {
    // 没有状态记录，检查实际内容
    const hasLibrary = (sectSystem.宗门藏经阁?.[sectName]?.length ?? 0) > 0;
    const hasShop = (sectSystem.宗门贡献商店?.[sectName]?.length ?? 0) > 0;

    return {
      library: !hasLibrary,
      shop: !hasShop,
    };
  }

  return {
    library: !status.藏经阁已初始化,
    shop: !status.贡献商店已初始化,
  };
}

/**
 * 获取宗门主题关键字（用于AI生成提示）
 */
export function getSectThemeKeywords(sect: WorldFaction): string[] {
  const themeKey = buildThemeKey(sect);
  const keywords: string[] = [];

  switch (themeKey) {
    case 'sword':
      keywords.push('剑修', '剑道', '剑意', '御剑');
      break;
    case 'alchemy':
      keywords.push('丹道', '炼丹', '药材', '丹炉');
      break;
    case 'array':
      keywords.push('阵法', '符箓', '灵纹', '阵盘');
      break;
    case 'demonic':
      keywords.push('魔道', '煞气', '血修', '邪功');
      break;
    case 'merchant':
      keywords.push('商道', '交易', '鉴宝', '情报');
      break;
    case 'beast':
      keywords.push('驭兽', '灵兽', '妖修', '兽契');
      break;
  }

  // 添加宗门特色
  if (Array.isArray(sect.特色)) {
    keywords.push(...sect.特色);
  } else if (sect.特色) {
    keywords.push(sect.特色);
  }

  return [...new Set(keywords)];
}

// ============================================================================
// 导出
// ============================================================================

export type { ShopItem, LibraryTechnique };

// 导出内部工具函数供高级用途
export {
  hashString,
  createSeededRandom,
  buildThemeKey,
};
