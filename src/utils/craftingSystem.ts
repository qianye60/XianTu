import type { InnateAttributes, Item, ItemQuality, ThousandDaoSystem } from '@/types/game';
import type { QualityType, GradeType } from '@/data/itemQuality';

export type CraftingType = '炼丹' | '炼器';

export type FireLevel = '文火' | '中火' | '武火' | '暴火';
export type Formation =
  | '无阵'
  | '稳灵阵'
  | '聚灵阵'
  | '凝神阵'
  | '凝丹阵'
  | '淬器阵'
  // 丹炉扩展
  | '净尘阵'
  | '封息阵'
  | '阴阳调和阵'
  // 器炉扩展
  | '锻纹阵'
  | '缚形阵'
  | '共鸣阵';

export interface CraftingOptions {
  type: CraftingType;
  fire: FireLevel;
  formation: Formation;
  // 1-100：用于让“同一档火候”也有强弱差别；不传则按档位处理
  firePowerPercent?: number;
  // 1-100：用于让玩家用“投入强度”影响成功率/品质；不传则视作0
  manaUsePercent?: number;
  spiritUsePercent?: number;
  // 若存在（例如AI推演后确认），则以该成功率为准（5-95），用于避免“推演与最终不一致”
  overrideSuccessRate?: number;
}

export interface CraftingComputationInput {
  materials: Item[];
  innate: InnateAttributes;
  post?: Partial<InnateAttributes> | null;
  thousandDao?: ThousandDaoSystem | null;
  options: CraftingOptions;
  rng?: () => number;
}

export interface CraftingComputationResult {
  successRate: number; // 0-100
  success: boolean;
  resultQuality: ItemQuality;
  materialQualityScore: number;
  daoBonusStage: number;
}

const QUALITY_ORDER: QualityType[] = ['凡', '黄', '玄', '地', '天', '仙', '神'];

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function toGradeNumber(grade: unknown): number {
  if (typeof grade === 'number' && Number.isFinite(grade)) return grade;
  if (typeof grade === 'string') {
    const parsed = Number(grade);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getItemQualityScore(item: Item): number {
  const quality = item.品质?.quality ?? '凡';
  const grade = toGradeNumber(item.品质?.grade);
  const rank = Math.max(1, QUALITY_ORDER.indexOf(quality) + 1);
  const normalizedGrade = Math.max(0, Math.min(10, grade)) / 10;
  return rank + normalizedGrade;
}

export function getAverageMaterialQualityScore(materials: Item[]): number {
  const list = materials.filter(Boolean);
  if (list.length === 0) return 0;
  const sum = list.reduce((acc, item) => acc + getItemQualityScore(item), 0);
  return sum / list.length;
}

function getMaxDaoStage(thousandDao: ThousandDaoSystem | null | undefined, keyword: string): number {
  const list = thousandDao?.大道列表;
  if (!list || typeof list !== 'object') return 0;

  let maxStage = 0;
  for (const [daoName, data] of Object.entries(list)) {
    if (!data?.是否解锁) continue;
    if (!daoName.includes(keyword)) continue;
    const stage = Number(data.当前阶段 ?? 0);
    if (Number.isFinite(stage)) maxStage = Math.max(maxStage, stage);
  }
  return maxStage;
}

function getDaoBonusStage(thousandDao: ThousandDaoSystem | null | undefined, type: CraftingType): number {
  if (type === '炼丹') {
    return Math.max(getMaxDaoStage(thousandDao, '炼丹'), getMaxDaoStage(thousandDao, '丹'));
  }
  return Math.max(getMaxDaoStage(thousandDao, '炼器'), getMaxDaoStage(thousandDao, '器'));
}

function getFireMods(fire: FireLevel): { success: number; quality: number } {
  switch (fire) {
    case '文火':
      return { success: 6, quality: -1 };
    case '中火':
      return { success: 0, quality: 0 };
    case '武火':
      return { success: -6, quality: 1 };
    case '暴火':
      return { success: -14, quality: 2 };
  }
}

function getFormationMods(formation: Formation, type: CraftingType): { success: number; quality: number } {
  switch (formation) {
    case '无阵':
      return { success: 0, quality: 0 };
    case '稳灵阵':
      return { success: 8, quality: -1 };
    case '聚灵阵':
      return { success: 4, quality: 1 };
    case '凝神阵':
      return { success: 2, quality: 1 };
    case '凝丹阵':
      return type === '炼丹' ? { success: 2, quality: 2 } : { success: -2, quality: 0 };
    case '淬器阵':
      return type === '炼器' ? { success: 2, quality: 2 } : { success: -2, quality: 0 };
    case '净尘阵':
      return type === '炼丹' ? { success: 5, quality: 0 } : { success: 1, quality: 0 };
    case '封息阵':
      return type === '炼丹' ? { success: 3, quality: 1 } : { success: 1, quality: 0 };
    case '阴阳调和阵':
      return type === '炼丹' ? { success: 2, quality: 2 } : { success: 0, quality: 1 };
    case '锻纹阵':
      return type === '炼器' ? { success: -1, quality: 2 } : { success: -2, quality: 0 };
    case '缚形阵':
      return type === '炼器' ? { success: 5, quality: -1 } : { success: 1, quality: 0 };
    case '共鸣阵':
      return type === '炼器' ? { success: -4, quality: 3 } : { success: -2, quality: 0 };
  }
}

export function computeCrafting(input: CraftingComputationInput): CraftingComputationResult {
  const rng = input.rng ?? Math.random;
  const materials = input.materials.filter(Boolean);

  const materialQualityScore = getAverageMaterialQualityScore(materials);
  const daoBonusStage = getDaoBonusStage(input.thousandDao ?? null, input.options.type);

  const innate = input.innate;
  const post = input.post ?? null;

  const comprehension = Number(innate.悟性 ?? 0);
  const spirituality = Number(innate.灵性 ?? 0);
  const postComprehension = Number(post?.悟性 ?? 0);
  const postSpirituality = Number(post?.灵性 ?? 0);

  const fireMods = getFireMods(input.options.fire);
  const formationMods = getFormationMods(input.options.formation, input.options.type);

  // 若外部提供（例如AI推演后确认），则以该成功率为准，避免“推演<->最终”不一致
  const override = Number(input.options.overrideSuccessRate);
  const hasOverride = Number.isFinite(override);

  let successRate = hasOverride ? override : 22;
  if (!hasOverride) {
    successRate += (comprehension * 2) + (spirituality * 1.5);
  }
  successRate += (postComprehension + postSpirituality) * 0.8;
  successRate += daoBonusStage * 3;
  successRate += Math.max(0, materialQualityScore - 1) * 6;
  successRate += (materials.length - 1) * 1.5;
  successRate += fireMods.success + formationMods.success;

  if (!hasOverride) {
    const fp = Number(input.options.firePowerPercent);
    if (Number.isFinite(fp)) {
      const p = clampInt(fp, 1, 100);
      // 火候越温和越稳；越猛烈越易失控
      successRate += (50 - p) * 0.12;
    }

    const manaP = clampInt(Number(input.options.manaUsePercent ?? 0), 0, 100);
    const spiritP = clampInt(Number(input.options.spiritUsePercent ?? 0), 0, 100);
    // 投入越多，成功率越高，但边际收益递减
    successRate += Math.sqrt(manaP) * 0.9 + Math.sqrt(spiritP) * 0.75;
  }

  successRate = Math.max(5, Math.min(95, Math.round(successRate)));

  const roll = rng() * 100;
  const success = roll <= successRate;

  let qualityBonus = fireMods.quality + formationMods.quality + Math.floor(daoBonusStage / 2);
  const fp2 = Number(input.options.firePowerPercent);
  if (Number.isFinite(fp2)) {
    const p = clampInt(fp2, 1, 100);
    // 火候越猛，越可能提升品质（但成功率更难）
    qualityBonus += (p - 50) / 35;
  }
  const spiritP2 = Number(input.options.spiritUsePercent);
  if (Number.isFinite(spiritP2)) {
    const p = clampInt(spiritP2, 0, 100);
    // 神识投入对精细度（品质）略有加成
    qualityBonus += (p - 40) / 80;
  }
  const avgRank = materialQualityScore > 0 ? Math.max(1, Math.min(7, Math.round(materialQualityScore))) : 1;
  const targetRank = Math.max(1, Math.min(7, avgRank + (success ? qualityBonus : -2)));

  const successGradeBase = clampInt((successRate / 100) * 10, 1, 10);
  const gradeVariance = clampInt((rng() - 0.5) * 4, -2, 2);
  const targetGrade = clampInt(successGradeBase + gradeVariance + (success ? qualityBonus : -5), 0, 10);

  const quality: QualityType = success ? (QUALITY_ORDER[targetRank - 1] ?? '凡') : '凡';
  const grade: GradeType = clampInt(success ? targetGrade : 0, 0, 10) as GradeType;

  const resultQuality: ItemQuality = { quality, grade };

  return {
    successRate,
    success,
    resultQuality,
    materialQualityScore,
    daoBonusStage,
  };
}
