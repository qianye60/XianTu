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

type ItemTemplate = {
  name: string;
  type: string;
  quality: string;
  description: string;
  icon?: string;
};

type TechniqueTemplate = {
  name: string;
  quality: string;
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

const QUALITY_COST: Record<string, number> = {
  '凡': 80,
  '黄': 200,
  '玄': 500,
  '地': 900,
  '天': 1500,
  '仙': 2600,
  '神': 4200,
};

const TYPE_MULTIPLIER: Record<string, number> = {
  '丹药': 0.85,
  '功法': 1.4,
  '装备': 1.2,
  '材料': 0.65,
  '其他': 1.0,
};

const BASE_SHOP_POOL: ItemTemplate[] = [
  { name: '聚气丹', type: '丹药', quality: '黄品下', description: '加速灵气运转，稳固修炼节奏。', icon: '*' },
  { name: '回灵丹', type: '丹药', quality: '黄品中', description: '迅速恢复灵气消耗，适合战斗后补给。', icon: '*' },
  { name: '疗伤散', type: '丹药', quality: '凡品', description: '外伤止血，缓解疲劳。', icon: '*' },
  { name: '护身符', type: '装备', quality: '黄品下', description: '减轻低阶术法伤害。', icon: 'O' },
  { name: '灵石匣', type: '其他', quality: '凡品', description: '短期存放灵石的轻便匣子。', icon: 'O' },
  { name: '灵草', type: '材料', quality: '凡品', description: '基础炼丹材料，常见药草。', icon: 'O' },
  { name: '灵砂', type: '材料', quality: '黄品下', description: '炼器辅材，增强灵力导通。', icon: 'O' },
];

const BASE_LIBRARY_POOL: TechniqueTemplate[] = [
  { name: '基础吐纳术', quality: '凡品', description: '稳固灵气吸纳，适合打底修炼。' },
  { name: '引气诀', quality: '黄品下', description: '引导灵气运转周身经脉。' },
  { name: '静心诀', quality: '黄品中', description: '宁神静气，提升修炼专注度。' },
  { name: '护体灵罩', quality: '黄品中', description: '凝聚灵气护体，防御入门术法。' },
];

const THEME_SHOP_POOL: Record<string, ItemTemplate[]> = {
  sword: [
    { name: '青锋剑诀残卷', type: '功法', quality: '黄品中', description: '剑意基础篇章，适合入门弟子。', icon: '*' },
    { name: '玄铁剑胚', type: '装备', quality: '黄品中', description: '可塑性良好的剑胚。', icon: 'O' },
    { name: '磨剑石', type: '材料', quality: '凡品', description: '打磨剑意，提升锋锐。', icon: 'O' },
  ],
  alchemy: [
    { name: '炼丹要诀', type: '功法', quality: '黄品中', description: '炼丹基础心法，讲究火候与灵压。', icon: '*' },
    { name: '聚灵炉', type: '装备', quality: '黄品下', description: '小型炼丹炉，稳定火候。', icon: 'O' },
    { name: '灵药种子', type: '材料', quality: '黄品下', description: '适合灵田培育，产量稳定。', icon: 'O' },
  ],
  array: [
    { name: '符箓入门', type: '功法', quality: '黄品下', description: '符箓绘制基础，稳定灵纹结构。', icon: '*' },
    { name: '小五行阵盘', type: '装备', quality: '黄品中', description: '临时布阵用阵盘，威力有限。', icon: 'O' },
    { name: '朱砂', type: '材料', quality: '凡品', description: '绘符材料，稳定灵线。', icon: 'O' },
  ],
  demonic: [
    { name: '噬灵诀', type: '功法', quality: '黄品中', description: '吞纳外灵，效率更高但风险更大。', icon: '*' },
    { name: '煞气丹', type: '丹药', quality: '黄品中', description: '短时提升攻击力，副作用明显。', icon: '*' },
    { name: '血煞石', type: '材料', quality: '黄品下', description: '魔道辅材，气息阴冷。', icon: 'O' },
  ],
  merchant: [
    { name: '折扣令', type: '其他', quality: '凡品', description: '兑换商会折扣的令牌。', icon: 'O' },
    { name: '情报玉简', type: '其他', quality: '黄品下', description: '记录周边势力动态的玉简。', icon: 'O' },
    { name: '行商令', type: '其他', quality: '黄品中', description: '可通行部分坊市关卡。', icon: 'O' },
  ],
  beast: [
    { name: '驭兽诀', type: '功法', quality: '黄品中', description: '基础驭兽法门，适合灵兽契约。', icon: '*' },
    { name: '灵兽饲料', type: '材料', quality: '凡品', description: '补充灵兽体力的饲料。', icon: 'O' },
    { name: '兽血晶', type: '材料', quality: '黄品下', description: '蕴含灵兽气血精华。', icon: 'O' },
  ],
};

const THEME_LIBRARY_POOL: Record<string, TechniqueTemplate[]> = {
  sword: [
    { name: '青锋剑诀', quality: '黄品中', description: '身法与剑意配合的基础剑诀。' },
    { name: '流云剑步', quality: '玄品下', description: '以身驭剑，步法飘逸难测。' },
    { name: '御剑术', quality: '玄品下', description: '御剑远攻，提升机动性。' },
  ],
  alchemy: [
    { name: '百草经', quality: '黄品中', description: '药性辨识与灵草搭配要诀。' },
    { name: '炼丹术', quality: '玄品下', description: '炼丹火候掌控之法。' },
    { name: '灵药辨识', quality: '凡品', description: '识别灵药品阶与属性。' },
  ],
  array: [
    { name: '符箓精义', quality: '黄品中', description: '灵纹勾勒技巧，提升符箓稳定。' },
    { name: '小五行阵图', quality: '玄品下', description: '常用阵法结构，稳定防守。' },
  ],
  demonic: [
    { name: '血煞功', quality: '玄品下', description: '引煞入体，爆发短时增幅。' },
    { name: '阴冥诀', quality: '黄品中', description: '阴气凝聚，强化神识。' },
  ],
  merchant: [
    { name: '商道心法', quality: '黄品下', description: '洞察人心，稳固交易秩序。' },
    { name: '鉴宝诀', quality: '玄品下', description: '辨识灵宝真伪与来历。' },
  ],
  beast: [
    { name: '灵兽感应术', quality: '玄品下', description: '感知灵兽状态与情绪。' },
    { name: '驭兽印法', quality: '黄品中', description: '稳固灵兽契约的印诀。' },
  ],
};

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

const pickRandomUnique = <T,>(pool: T[], count: number, rand: () => number) => {
  const available = [...pool];
  const picked: T[] = [];
  const finalCount = Math.min(count, available.length);
  for (let i = 0; i < finalCount; i += 1) {
    const index = Math.floor(rand() * available.length);
    picked.push(available.splice(index, 1)[0]);
  }
  return picked;
};

const extractQualityTier = (quality: string) => {
  const match = quality.match(/[凡黄玄地天仙神]/);
  return match ? match[0] : '凡';
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

const buildShopItems = (sect: WorldFaction, rand: () => number, sectKey: string): ShopItem[] => {
  const themeKey = buildThemeKey(sect);
  const pool = [...BASE_SHOP_POOL, ...(THEME_SHOP_POOL[themeKey] || [])];
  const picks = pickRandomUnique(pool, 6, rand);

  return picks.map((item, index) => {
    const qualityTier = extractQualityTier(item.quality);
    const baseCost = QUALITY_COST[qualityTier] || 120;
    const multiplier = TYPE_MULTIPLIER[item.type] || 1;
    const variance = 0.85 + rand() * 0.3;
    const cost = Math.max(40, Math.round((baseCost * multiplier * variance) / 10) * 10);
    let stock: number | undefined;

    if (item.type === '功法') {
      stock = undefined;
    } else if (item.type === '装备') {
      stock = Math.max(1, Math.floor(rand() * 3) + 1);
    } else if (item.type === '丹药') {
      stock = Math.max(3, Math.floor(rand() * 8) + 3);
    } else if (item.type === '材料') {
      stock = Math.max(5, Math.floor(rand() * 14) + 5);
    } else {
      stock = Math.max(2, Math.floor(rand() * 6) + 2);
    }

    return {
      id: `sect_${sectKey}_shop_${index + 1}`,
      name: item.name,
      icon: item.icon || 'O',
      type: item.type,
      quality: item.quality,
      description: item.description,
      cost,
      stock,
    };
  });
};

const buildLibraryTechniques = (sect: WorldFaction, rand: () => number, sectKey: string): LibraryTechnique[] => {
  const themeKey = buildThemeKey(sect);
  const pool = [...BASE_LIBRARY_POOL, ...(THEME_LIBRARY_POOL[themeKey] || [])];
  const picks = pickRandomUnique(pool, 5, rand);

  return picks.map((tech, index) => {
    const qualityTier = extractQualityTier(tech.quality);
    const baseCost = QUALITY_COST[qualityTier] || 120;
    const variance = 0.85 + rand() * 0.25;
    const cost = Math.max(60, Math.round((baseCost * 1.2 * variance) / 10) * 10);

    return {
      id: `sect_${sectKey}_lib_${index + 1}`,
      name: tech.name,
      quality: tech.quality,
      qualityTier,
      cost,
      description: tech.description,
    };
  });
};

export const createJoinedSectState = (
  sect: WorldFaction,
  options?: { nowIso?: string }
): { sectSystem: SectSystemV2; memberInfo: SectMemberInfo } => {
  const nowIso = options?.nowIso || new Date().toISOString();
  const sectName = sect.名称;
  const sectKey = String(hashString(sectName));
  const rand = createSeededRandom(hashString(`${sectName}_${nowIso}`));

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
      宗门藏经阁: {
        [sectName]: buildLibraryTechniques(sect, rand, sectKey),
      },
      宗门贡献商店: {
        [sectName]: buildShopItems(sect, rand, sectKey),
      },
    },
    memberInfo,
  };
};

// ============================================================================
// 框架+延迟初始化模式（新）
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
 * 2. 藏经阁、贡献商店等内容需要手动初始化
 * 3. 初始化可通过AI生成或本地随机生成
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
      宗门藏经阁: {},  // 空，等待初始化
      宗门贡献商店: {},  // 空，等待初始化
      内容状态: {
        [sectName]: contentStatus,
      },
    },
    memberInfo,
    contentStatus,
  };
}

/**
 * 使用本地随机生成初始化藏经阁
 */
export function initializeLibraryLocal(
  sect: WorldFaction,
  nowIso?: string
): LibraryTechnique[] {
  const sectName = sect.名称;
  const sectKey = String(hashString(sectName));
  const rand = createSeededRandom(hashString(`${sectName}_${nowIso || Date.now()}`));
  return buildLibraryTechniques(sect, rand, sectKey);
}

/**
 * 使用本地随机生成初始化贡献商店
 */
export function initializeShopLocal(
  sect: WorldFaction,
  nowIso?: string
): ShopItem[] {
  const sectName = sect.名称;
  const sectKey = String(hashString(sectName));
  const rand = createSeededRandom(hashString(`${sectName}_${nowIso || Date.now()}`));
  return buildShopItems(sect, rand, sectKey);
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
  extractQualityTier,
  QUALITY_COST,
  TYPE_MULTIPLIER,
  BASE_SHOP_POOL,
  BASE_LIBRARY_POOL,
  THEME_SHOP_POOL,
  THEME_LIBRARY_POOL,
};
