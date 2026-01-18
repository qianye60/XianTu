import type { SaveData, GameTime, EventSystem } from '@/types/game';
import type { SaveDataV3 } from '@/types/saveSchemaV3';

export type SaveMigrationIssue =
  | 'legacy-root-keys'
  | 'missing-required-keys'
  | 'invalid-structure';

export interface SaveMigrationDetection {
  needsMigration: boolean;
  issues: SaveMigrationIssue[];
  legacyKeysFound: string[];
}

export interface SaveMigrationReport {
  legacyKeysFound: string[];
  removedLegacyKeys: string[];
  warnings: string[];
}

const LEGACY_ROOT_KEYS = [
  '状态',
  '玩家角色状态',
  '玩家角色状态信息',
  '玩家角色信息',
  '角色基础信息',
  '玩家角色基础信息',
  '修行状态',
  '状态效果',
  '叙事历史',
  '对话历史',
  '任务系统',
  '事件系统',
  '宗门系统',
  '世界信息',
  '人物关系',
  '装备栏',
  '游戏时间',
  '三千大道',
  '修炼功法',
  '掌握技能',
  '身体部位开发',
] as const;

const REQUIRED_V3_KEYS = ['元数据', '角色', '社交', '世界', '系统'] as const;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const stripAIFieldsDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripAIFieldsDeep);
  if (!isPlainObject(value)) return value;

  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (key === '_AI说明' || key === '_AI修改规则' || key === '_AI重要提醒') continue;
    output[key] = stripAIFieldsDeep(val);
  }
  return output;
};

const coerceTime = (value: any): GameTime => {
  const base: GameTime = { 年: 1000, 月: 1, 日: 1, 小时: 8, 分钟: 0 };
  if (!isPlainObject(value)) return base;
  return {
    年: Number(value.年 ?? value.年数 ?? base.年),
    月: Number(value.月 ?? base.月),
    日: Number(value.日 ?? base.日),
    小时: Number(value.小时 ?? base.小时),
    分钟: Number(value.分钟 ?? base.分钟),
  } as GameTime;
};

export function isSaveDataV3(saveData: SaveData | null | undefined): saveData is SaveDataV3 {
  if (!saveData || typeof saveData !== 'object') return false;
  const anySave = saveData as any;
  return (
    isPlainObject(anySave.元数据) &&
    isPlainObject(anySave.角色) &&
    isPlainObject(anySave.社交) &&
    isPlainObject(anySave.世界) &&
    isPlainObject(anySave.系统)
  );
}

export function detectLegacySaveData(saveData: SaveData | null | undefined): SaveMigrationDetection {
  if (!saveData || typeof saveData !== 'object') {
    return {
      needsMigration: true,
      issues: ['invalid-structure'],
      legacyKeysFound: [],
    };
  }

  const anySave = saveData as any;

  if (isSaveDataV3(saveData)) {
    return { needsMigration: false, issues: [], legacyKeysFound: [] };
  }

  const legacyKeysFound = [
    ...LEGACY_ROOT_KEYS.filter((k) => k in anySave),
    // “短路径平铺结构”也视为旧结构（需要迁移到 5 领域 V3）
    ...(anySave.属性 || anySave.位置 || anySave.背包 || anySave.时间 ? ['短路径平铺'] : []),
  ] as string[];

  const missingRequired = REQUIRED_V3_KEYS.filter((k) => !(k in anySave));
  const issues: SaveMigrationIssue[] = [];
  if (legacyKeysFound.length > 0) issues.push('legacy-root-keys');
  if (missingRequired.length > 0) issues.push('missing-required-keys');

  return {
    needsMigration: issues.length > 0,
    issues,
    legacyKeysFound,
  };
}

const buildDefaultEventSystem = (): EventSystem => ({
  配置: {
    启用随机事件: true,
    最小间隔年: 1,
    最大间隔年: 10,
    事件提示词: '',
  },
  下次事件时间: null,
  事件记录: [],
});

const buildDefaultMemory = (): SaveDataV3['社交']['记忆'] => ({
  短期记忆: [],
  中期记忆: [],
  长期记忆: [],
  隐式中期记忆: [],
});

const coerceStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
  return [];
};

const normalizeMemory = (value: unknown): SaveDataV3['社交']['记忆'] => {
  const base = buildDefaultMemory();
  if (!isPlainObject(value)) return base;

  const anyValue = value as any;
  return {
    短期记忆: coerceStringArray(anyValue.短期记忆 ?? anyValue.short_term ?? anyValue.shortTerm),
    中期记忆: coerceStringArray(anyValue.中期记忆 ?? anyValue.mid_term ?? anyValue.midTerm),
    长期记忆: coerceStringArray(anyValue.长期记忆 ?? anyValue.long_term ?? anyValue.longTerm),
    隐式中期记忆: coerceStringArray(anyValue.隐式中期记忆 ?? anyValue.implicit_mid_term ?? anyValue.implicitMidTerm),
  };
};

const buildDefaultOnline = (): SaveDataV3['系统']['联机'] => ({
  模式: '单机',
  房间ID: null,
  玩家ID: null,
  只读路径: ['世界'],
  世界曝光: false,
  冲突策略: '服务器',
});

const buildDefaultWorldInfo = (nowIso: string) => ({
  世界名称: '朝天大陆',
  大陆信息: [],
  势力信息: [],
  地点信息: [],
  生成时间: nowIso,
  世界背景: '',
  世界纪元: '',
  特殊设定: [],
  版本: 'v1',
});

const buildDefaultIdentity = () => ({
  名字: '无名修士',
  性别: '男',
  出生日期: { 年: 982, 月: 1, 日: 1 },
  种族: '人族',
  世界: '朝天大陆',
  天资: '凡人',
  出生: '散修',
  灵根: '五行杂灵根',
  天赋: [],
  先天六司: { 根骨: 5, 灵性: 5, 悟性: 5, 气运: 5, 魅力: 5, 心性: 5 },
  后天六司: { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 },
});

export function migrateSaveDataToLatest(raw: SaveData): { migrated: SaveDataV3; report: SaveMigrationReport } {
  const sourceRaw = deepClone(raw ?? ({} as any)) as any;
  const source = stripAIFieldsDeep(sourceRaw) as any;

  const report: SaveMigrationReport = {
    legacyKeysFound: [],
    removedLegacyKeys: [],
    warnings: [],
  };

  if (isSaveDataV3(source)) {
    const normalized = deepClone(source) as any;
    if (!isPlainObject(normalized.社交)) normalized.社交 = {};
    normalized.社交.记忆 = normalizeMemory(normalized.社交.记忆);
    return { migrated: normalized as SaveDataV3, report };
  }

  report.legacyKeysFound = LEGACY_ROOT_KEYS.filter((k) => k in source) as string[];

  const nowIso = new Date().toISOString();

  const flatCharacter =
    source.角色 ??
    source.角色基础信息 ??
    source.玩家角色基础信息 ??
    source.玩家角色信息 ??
    source.玩家角色状态信息?.角色 ??
    null;

  const legacyStatusLike = source.属性 ?? source.状态 ?? source.玩家角色状态 ?? source.玩家角色状态信息 ?? null;
  const legacyStatusObj = isPlainObject(legacyStatusLike) ? legacyStatusLike : ({} as any);

  const flatAttributes = {
    境界: (legacyStatusObj as any).境界 ?? null,
    声望: (legacyStatusObj as any).声望 ?? 0,
    气血: (legacyStatusObj as any).气血 ?? { 当前: 100, 上限: 100 },
    灵气: (legacyStatusObj as any).灵气 ?? { 当前: 50, 上限: 50 },
    神识: (legacyStatusObj as any).神识 ?? { 当前: 30, 上限: 30 },
    寿命: (legacyStatusObj as any).寿命 ?? { 当前: 18, 上限: 80 },
  };

  const effectsCandidate =
    source.效果 ??
    source.修行状态 ??
    (legacyStatusObj as any).状态效果 ??
    source.状态效果 ??
    [];
  const flatEffects = Array.isArray(effectsCandidate) ? effectsCandidate : [];

  const flatLocation =
    source.位置 ??
    (legacyStatusObj as any).位置 ??
    (source.状态位置 as any) ??
    { 描述: '朝天大陆·无名之地', x: 5000, y: 5000 };

  const flatTime = coerceTime(source.元数据?.时间 ?? source.时间 ?? source.游戏时间);

  const flatInventory = source.背包 ?? { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} };
  const flatEquipment =
    source.装备 ?? source.装备栏 ?? { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null };

  const flatTechniqueSystem =
    source.功法 ??
    {
      当前功法ID: null,
      功法进度: {},
      功法套装: { 主修: null, 辅修: [] },
    };

  const flatCultivation =
    source.修炼 ?? (source.修炼功法 !== undefined ? { 修炼功法: source.修炼功法 } : { 修炼功法: null });

  const flatDao = source.大道 ?? source.三千大道 ?? { 大道列表: {} };
  const flatSkills =
    source.技能 ??
    (source.掌握技能
      ? { 掌握技能: source.掌握技能, 装备栏: [], 冷却: {} }
      : { 掌握技能: [], 装备栏: [], 冷却: {} });

  const flatSect = source.宗门 ?? source.宗门系统 ?? undefined;
  const flatRelationships = source.关系 ?? source.人物关系 ?? {};
  const flatMemory = normalizeMemory(source.记忆 ?? source.社交?.记忆);

  const flatEventRaw = source.事件 ?? source.事件系统 ?? buildDefaultEventSystem();
  const flatEvent = (() => {
    const eventSystem = isPlainObject(flatEventRaw)
      ? (deepClone(flatEventRaw) as any)
      : (buildDefaultEventSystem() as any);

    if (!Array.isArray(eventSystem.事件记录)) eventSystem.事件记录 = [];
    if (!isPlainObject(eventSystem.下次事件时间)) eventSystem.下次事件时间 = null;

    return eventSystem as any;
  })();

  const worldInfoCandidate = source.世界?.信息 ?? source.世界 ?? source.世界信息 ?? source.worldInfo ?? undefined;
  const worldInfo = isPlainObject(worldInfoCandidate) ? worldInfoCandidate : buildDefaultWorldInfo(nowIso);

  const systemConfig = source.系统?.配置 ?? source.系统 ?? source.系统配置 ?? undefined;

  const narrative =
    source.系统?.历史?.叙事 ??
    source.历史?.叙事 ??
    (source.叙事历史 ? source.叙事历史 : source.对话历史 ? source.对话历史 : []);

  const online =
    source.系统?.联机 ??
    source.联机 ??
    buildDefaultOnline();

  const identity = (isPlainObject(flatCharacter) ? (flatCharacter as any) : buildDefaultIdentity()) as any;
  const migrated: SaveDataV3 = {
    元数据: {
      版本号: 3,
      存档ID: String(source.元数据?.存档ID ?? source.存档ID ?? `save_${Date.now()}`),
      存档名: String(source.元数据?.存档名 ?? source.存档名 ?? '迁移存档'),
      游戏版本: source.元数据?.游戏版本 ?? source.游戏版本,
      创建时间: String(source.元数据?.创建时间 ?? source.创建时间 ?? nowIso),
      更新时间: nowIso,
      游戏时长秒: Number(source.元数据?.游戏时长秒 ?? source.游戏时长秒 ?? source.元数据?.游戏时长 ?? source.游戏时长 ?? 0),
      时间: flatTime,
    },
    角色: {
      身份: identity,
      属性: flatAttributes,
      位置: flatLocation,
      效果: flatEffects,
      身体: source.身体 ?? (source.身体部位开发 ? { 部位开发: source.身体部位开发 } : undefined),
      背包: flatInventory,
      装备: flatEquipment,
      功法: flatTechniqueSystem,
      修炼: flatCultivation,
      大道: flatDao,
      技能: flatSkills,
    },
    社交: {
      关系: flatRelationships,
      宗门: flatSect ?? null,
      事件: flatEvent,
      记忆: flatMemory,
    },
    世界: {
      信息: worldInfo as any,
      状态: source.世界?.状态 ?? source.世界状态 ?? undefined,
    },
    系统: {
      配置: systemConfig,
      设置: source.系统?.设置 ?? source.设置 ?? undefined,
      缓存: source.系统?.缓存 ?? source.缓存 ?? undefined,
      行动队列: source.系统?.行动队列 ?? source.行动队列 ?? undefined,
      历史: { 叙事: Array.isArray(narrative) ? narrative : [] },
      扩展: source.系统?.扩展 ?? source.扩展 ?? {},
      联机: isPlainObject(online) ? { ...buildDefaultOnline(), ...(online as any) } : buildDefaultOnline(),
    },
  };

  // 清除旧key：迁移后的对象严格只保留新字段
  for (const key of LEGACY_ROOT_KEYS) {
    if (key in source) report.removedLegacyKeys.push(String(key));
  }

  // 最小校验与告警
  for (const key of REQUIRED_V3_KEYS) {
    if (!(key in migrated as any)) report.warnings.push(`迁移后缺少必填字段：${String(key)}`);
  }
  if (!migrated.角色?.身份) report.warnings.push('迁移后仍缺少 角色.身份（将导致部分界面无法展示）');

  return { migrated: migrated as SaveDataV3, report };
}
