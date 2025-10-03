// 统一的境界显示工具：始终返回带阶段（初期/中期/后期/圆满/极境）的名称
// 兼容多种数据结构：中文/英文键名、字符串、数字

export type RealmLike =
  | undefined
  | null
  | number
  | string
  | {
      名称?: string;
      name?: string;
      阶段?: string;
      stage?: string;
      当前进度?: number;
      progress?: number;
      currentProgress?: number;
      下一级所需?: number;
      maxProgress?: number;
    };

const MAJOR_REALM_BY_LEVEL: Record<number, string> = {
  0: '凡人',
  1: '炼气',
  2: '筑基',
  3: '金丹',
  4: '元婴',
  5: '化神',
  6: '炼虚',
  7: '合体',
  8: '渡劫'
};

const STAGE_KEYWORDS = ['初期', '中期', '后期', '圆满', '极境'];

function containsStage(name?: string): boolean {
  if (!name) return false;
  return STAGE_KEYWORDS.some(s => name.includes(s));
}

function normalizeMajorName(name?: string): string | undefined {
  if (!name) return undefined;
  // 先去掉可能存在的“期”等后缀
  let n = name.replace(/期$/u, '');
  // 去掉阶段词
  STAGE_KEYWORDS.forEach(s => {
    n = n.replace(s, '');
  });
  // 统一“练/炼”气为“炼气”
  n = n.replace('练气', '炼气');
  return n;
}

function stageFromInput(input: RealmLike): string | undefined {
  if (typeof input === 'object' && input) {
    return (
      (input.阶段 as string | undefined) ??
      (input.stage as string | undefined)
    );
  }
  return undefined;
}

function nameFromInput(input: RealmLike): string | undefined {
  if (typeof input === 'string') return input;
  if (typeof input === 'object' && input) {
    return (input.名称 as string | undefined) ?? (input.name as string | undefined);
  }
  return undefined;
}

function progressFromInput(input: RealmLike): { current?: number; max?: number } {
  if (typeof input === 'object' && input) {
    const current =
      (input.当前进度 as number | undefined) ??
      (input.progress as number | undefined) ??
      (input.currentProgress as number | undefined);
    const max =
      (input.下一级所需 as number | undefined) ??
      (input.maxProgress as number | undefined);
    return { current, max };
  }
  return {};
}

export function inferStage(current?: number, max?: number): '初期' | '中期' | '后期' | '圆满' {
  if (!current || !max || max <= 0) return '初期';
  const pct = Math.max(0, Math.min(100, Math.floor((current / max) * 100)));
  if (pct < 20) return '初期';
  if (pct < 50) return '中期';
  if (pct < 80) return '后期';
  return '圆满';
}

export function formatRealmWithStage(input: RealmLike): string {
  // 取名与阶段
  const rawName = nameFromInput(input);
  const explicitStage = stageFromInput(input);
  const { current, max } = progressFromInput(input);

  // 名称已包含阶段则直接返回（仍统一"练气"到"炼气"）
  if (rawName && containsStage(rawName)) {
    return rawName.replace('练气', '炼气');
  }

  // 确定大境界名
  const baseName = normalizeMajorName(rawName) || '凡人';

  // 🔥 核心修复：凡人境界永远不显示阶段/层级，无论是否有显式指定
  // 凡人就是凡人，没有"凡人第0层"这种说法
  if (baseName === '凡人') {
    return '凡人';
  }

  // 使用显式阶段，或者根据进度推断阶段
  const stage = explicitStage || inferStage(current, max);
  return `${baseName}${stage}`;
}

