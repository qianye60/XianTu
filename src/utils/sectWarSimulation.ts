import type { SaveData, SectWarReport, SectWarSideState, SectWarStageName, SectWarState, WorldFaction } from '@/types/game';

export type SectWarPowerBreakdownItem = {
  label: string;
  value: number;
  note?: string;
};

export type SectWarComputedSide = {
  side: SectWarSideState;
  breakdown: SectWarPowerBreakdownItem[];
  meta: {
    baseFrom: string;
    totalMembers: number;
    facilityAvg: number;
    treasuryStone: number;
  };
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const int = (v: unknown, fallback = 0) => Math.max(0, Math.floor(num(v, fallback)));

export function randomIntInclusive(min: number, max: number): number {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pickFaction(saveData: SaveData, sectName: string): WorldFaction | null {
  const factions = ((saveData as any)?.世界?.信息?.势力信息 ?? []) as WorldFaction[];
  const name = String(sectName || '').trim();
  if (!name) return null;
  return factions.find((f) => String((f as any)?.名称 || '').trim() === name) ?? null;
}

function getManagement(saveData: SaveData, sectName: string): any | null {
  const name = String(sectName || '').trim();
  if (!name) return null;
  return ((saveData as any)?.社交?.宗门?.宗门经营 ?? null)?.[name] ?? null;
}

function extractMemberCounts(faction: any): { outer: number; inner: number; core: number } {
  const total = int(faction?.成员数量?.总数, 0);
  const byRealm = faction?.成员数量?.按境界 ?? null;
  if (byRealm && typeof byRealm === 'object') {
    const qi = int((byRealm as any).练气, 0);
    const foundation = int((byRealm as any).筑基, 0);
    const golden = int((byRealm as any).金丹, 0);
    const nascent = int((byRealm as any).元婴, 0);
    const soul = int((byRealm as any).化神, 0);
    const others = Object.entries(byRealm as any).reduce((acc, [k, v]) => {
      if (['练气', '筑基', '金丹', '元婴', '化神'].includes(k)) return acc;
      return acc + int(v, 0);
    }, 0);
    return {
      outer: qi,
      inner: foundation,
      core: golden + nascent + soul + others,
    };
  }
  if (!total) return { outer: 50, inner: 20, core: 5 };
  return {
    outer: Math.max(0, Math.round(total * 0.75)),
    inner: Math.max(0, Math.round(total * 0.22)),
    core: Math.max(0, total - Math.round(total * 0.75) - Math.round(total * 0.22)),
  };
}

function extractLeadershipPower(faction: any): { value: number; from: string } {
  const leadership = faction?.领导层 ?? null;
  const p1 = num(leadership?.综合战力, NaN);
  if (Number.isFinite(p1) && p1 > 0) return { value: clamp(Math.round(p1), 1, 100), from: '宗门档案.领导层.综合战力' };

  const p2 = num(faction?.综合战力, NaN);
  if (Number.isFinite(p2) && p2 > 0) return { value: clamp(Math.round(p2), 1, 100), from: '宗门档案.综合战力' };

  return { value: 55, from: '默认值(55)' };
}

function computeFacilityAvg(management: any): number {
  const facilities = management?.设施 ?? null;
  if (!facilities || typeof facilities !== 'object') return 0;
  const values = Object.values(facilities).map((v) => num(v, 0)).filter((v) => Number.isFinite(v));
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeSectWarSide(saveData: SaveData, sectName: string): SectWarComputedSide {
  const faction = pickFaction(saveData, sectName);
  const management = getManagement(saveData, sectName);

  const { value: leadershipPower, from: baseFrom } = extractLeadershipPower(faction);
  const counts = extractMemberCounts(faction);
  const totalMembers = counts.outer + counts.inner + counts.core;

  const mPower = clamp(int(management?.战力, 0), 0, 100);
  const stability = clamp(int(management?.安定, 60), 0, 100);
  const training = clamp(int(management?.外门训练度, 55), 0, 100);
  const treasuryStone = int(management?.府库?.灵石, 0);
  const facilityAvg = computeFacilityAvg(management);

  // 各项加成：尽量“可解释”且幅度温和
  const memberScore = clamp(Math.round((counts.outer * 0.02 + counts.inner * 0.06 + counts.core * 0.25) / 10), 0, 15);
  const stabilityBonus = Math.round((stability - 60) / 10); // -6..+4
  const trainingBonus = Math.round((training - 55) / 12); // -4..+4
  const facilityBonus = clamp(Math.round(facilityAvg / 2), 0, 6); // 0..5/6
  const treasuryBonus = clamp(Math.round(Math.log10(Math.max(10, treasuryStone)) - 3), 0, 5); // 0..5

  const breakdown: SectWarPowerBreakdownItem[] = [
    { label: `基准战力（${baseFrom}）`, value: leadershipPower },
  ];

  let base = leadershipPower;
  if (mPower > 0) {
    // 经营战力更偏向“当前状态”，占比稍低，避免覆盖宗门档案
    const adj = Math.round((mPower - 50) / 10); // -5..+5
    breakdown.push({ label: '经营战力修正', value: adj, note: `宗门经营.战力=${mPower}` });
    base += adj;
  }

  breakdown.push({ label: '成员结构修正', value: memberScore, note: `外门${counts.outer}/内门${counts.inner}/核心${counts.core}` });
  breakdown.push({ label: '安定修正', value: stabilityBonus, note: `安定=${stability}` });
  breakdown.push({ label: '训练度修正', value: trainingBonus, note: `外门训练度=${training}` });
  breakdown.push({ label: '设施修正', value: facilityBonus, note: `设施均值≈${facilityAvg.toFixed(1)}` });
  breakdown.push({ label: '府库修正', value: treasuryBonus, note: `灵石=${treasuryStone}` });

  const totalPower = clamp(Math.round(base + memberScore + stabilityBonus + trainingBonus + facilityBonus + treasuryBonus), 1, 100);
  const morale = clamp(60 + stabilityBonus * 3 + trainingBonus * 2, 35, 95);

  const side: SectWarSideState = {
    宗门名称: String(sectName || '').trim(),
    战力: totalPower,
    外门: counts.outer,
    内门: counts.inner,
    核心: counts.core,
    士气: morale,
  };

  return { side, breakdown, meta: { baseFrom, totalMembers, facilityAvg, treasuryStone } };
}

export type SectWarStageResolution = {
  stage: SectWarStageName;
  roll: number; // 1-20
  advantage: number; // >0 我方优
  grade: '大成功' | '成功' | '小胜' | '小败' | '失败' | '大失败';
  ourLoss: { 外门: number; 内门: number; 核心: number };
  enemyLoss: { 外门: number; 内门: number; 核心: number };
  moraleDelta: { 我方: number; 敌方: number };
};

function stageIntensity(stage: SectWarStageName): number {
  switch (stage) {
    case '侦察':
      return 0.35;
    case '交锋':
      return 0.9;
    case '破阵':
      return 0.75;
    case '攻山':
      return 1.15;
    case '善后':
      return 0.25;
    default:
      return 0.8;
  }
}

function gradeFromAdvantage(a: number): SectWarStageResolution['grade'] {
  if (a >= 14) return '大成功';
  if (a >= 7) return '成功';
  if (a >= 0) return '小胜';
  if (a >= -7) return '小败';
  if (a >= -14) return '失败';
  return '大失败';
}

function applyLosses(side: SectWarSideState, loss: { 外门: number; 内门: number; 核心: number }): SectWarSideState {
  return {
    ...side,
    外门: clamp(side.外门 - loss.外门, 0, 1_000_000),
    内门: clamp(side.内门 - loss.内门, 0, 1_000_000),
    核心: clamp(side.核心 - loss.核心, 0, 1_000_000),
  };
}

function computeLoss(total: number, intensity: number, winFactor: number): number {
  // winFactor: 0.6 (优势方更少) ~ 1.4 (劣势方更多)
  const base = Math.max(1, Math.round(total * intensity * 0.03 * winFactor));
  return clamp(base, 0, Math.max(1, Math.round(total * 0.25)));
}

function splitLoss(totalLoss: number, weights: { 外门: number; 内门: number; 核心: number }): { 外门: number; 内门: number; 核心: number } {
  const sum = weights.外门 + weights.内门 + weights.核心;
  if (sum <= 0) return { 外门: totalLoss, 内门: 0, 核心: 0 };
  const o = Math.round((totalLoss * weights.外门) / sum);
  const i = Math.round((totalLoss * weights.内门) / sum);
  const c = Math.max(0, totalLoss - o - i);
  return { 外门: o, 内门: i, 核心: c };
}

export function resolveWarStage(args: {
  war: SectWarState;
  stage: SectWarStageName;
  nowIso: string;
  roll?: number;
}): { war: SectWarState; report: SectWarReport; resolution: SectWarStageResolution } {
  const { war, stage, nowIso } = args;
  const roll = typeof args.roll === 'number' ? clamp(Math.floor(args.roll), 1, 20) : randomIntInclusive(1, 20);

  const our = war.我方;
  const enemy = war.敌方;
  const intensity = stageIntensity(stage);

  const ourScore = num(our.战力, 50) + num(our.士气, 60) / 10;
  const enemyScore = num(enemy.战力, 50) + num(enemy.士气, 60) / 10;

  // d20 波动：以 10 为中值（-9..+10）
  const advantage = Math.round(ourScore - enemyScore + (roll - 10));
  const grade = gradeFromAdvantage(advantage);

  const ourTotal = Math.max(1, our.外门 + our.内门 + our.核心);
  const enemyTotal = Math.max(1, enemy.外门 + enemy.内门 + enemy.核心);

  const ourWinFactor = advantage >= 0 ? 0.75 : 1.25;
  const enemyWinFactor = advantage >= 0 ? 1.25 : 0.75;

  const ourLossTotal = computeLoss(ourTotal, intensity, ourWinFactor);
  const enemyLossTotal = computeLoss(enemyTotal, intensity, enemyWinFactor);

  // 劣势方核心损失更大一点
  const ourWeights = advantage >= 0 ? { 外门: 82, 内门: 16, 核心: 2 } : { 外门: 70, 内门: 24, 核心: 6 };
  const enemyWeights = advantage >= 0 ? { 外门: 70, 内门: 24, 核心: 6 } : { 外门: 82, 内门: 16, 核心: 2 };

  const ourLoss = splitLoss(ourLossTotal, ourWeights);
  const enemyLoss = splitLoss(enemyLossTotal, enemyWeights);

  const moraleDeltaOur = clamp(Math.round(advantage / 6), -8, 6);
  const moraleDeltaEnemy = clamp(Math.round(-advantage / 6), -8, 6);

  const nextWar: SectWarState = {
    ...war,
    我方: applyLosses(
      {
        ...our,
        士气: clamp(num(our.士气, 60) + moraleDeltaOur, 0, 100),
        战力: clamp(num(our.战力, 50) + Math.round(advantage / 20), 1, 100),
      },
      ourLoss
    ),
    敌方: applyLosses(
      {
        ...enemy,
        士气: clamp(num(enemy.士气, 60) + moraleDeltaEnemy, 0, 100),
        战力: clamp(num(enemy.战力, 50) + Math.round(-advantage / 20), 1, 100),
      },
      enemyLoss
    ),
    累计伤亡: {
      我方: {
        外门: (war.累计伤亡?.我方?.外门 ?? 0) + ourLoss.外门,
        内门: (war.累计伤亡?.我方?.内门 ?? 0) + ourLoss.内门,
        核心: (war.累计伤亡?.我方?.核心 ?? 0) + ourLoss.核心,
      },
      敌方: {
        外门: (war.累计伤亡?.敌方?.外门 ?? 0) + enemyLoss.外门,
        内门: (war.累计伤亡?.敌方?.内门 ?? 0) + enemyLoss.内门,
        核心: (war.累计伤亡?.敌方?.核心 ?? 0) + enemyLoss.核心,
      },
    },
  };

  const summary = `阶段「${stage}」：${grade}（d20=${roll}，优势=${advantage >= 0 ? '+' : ''}${advantage}）。我方伤亡 外门-${ourLoss.外门}/内门-${ourLoss.内门}/核心-${ourLoss.核心}；敌方伤亡 外门-${enemyLoss.外门}/内门-${enemyLoss.内门}/核心-${enemyLoss.核心}。`;

  const report: SectWarReport = {
    时间: nowIso,
    阶段: stage,
    摘要: summary,
    我方变化: {
      士气: moraleDeltaOur,
      战力: Math.round(advantage / 20),
      伤亡: ourLoss,
    },
    敌方变化: {
      士气: moraleDeltaEnemy,
      战力: Math.round(-advantage / 20),
      伤亡: enemyLoss,
    },
  };

  const resolution: SectWarStageResolution = {
    stage,
    roll,
    advantage,
    grade,
    ourLoss,
    enemyLoss,
    moraleDelta: { 我方: moraleDeltaOur, 敌方: moraleDeltaEnemy },
  };

  return { war: nextWar, report, resolution };
}

export function concludeWar(args: { war: SectWarState; nowIso: string; roll?: number }): { war: SectWarState; report: SectWarReport } {
  const roll = typeof args.roll === 'number' ? clamp(Math.floor(args.roll), 1, 20) : randomIntInclusive(1, 20);
  const { war, nowIso } = args;
  const our = war.我方;
  const enemy = war.敌方;
  const score = (our.战力 + num(our.士气, 60) / 10) - (enemy.战力 + num(enemy.士气, 60) / 10) + (roll - 10);
  const win = score >= 0;
  const status = win ? '胜利' : '失败';

  const finalized: SectWarState = {
    ...war,
    状态: status,
    当前阶段: '终局',
  };

  const report: SectWarReport = {
    时间: nowIso,
    阶段: '终局',
    摘要: `终局判定：${status}（d20=${roll}，终局差值=${score >= 0 ? '+' : ''}${Math.round(score)}）。累计伤亡：我方 外门-${finalized.累计伤亡?.我方?.外门 ?? 0}/内门-${finalized.累计伤亡?.我方?.内门 ?? 0}/核心-${finalized.累计伤亡?.我方?.核心 ?? 0}；敌方 外门-${finalized.累计伤亡?.敌方?.外门 ?? 0}/内门-${finalized.累计伤亡?.敌方?.内门 ?? 0}/核心-${finalized.累计伤亡?.敌方?.核心 ?? 0}。`,
  };

  return { war: finalized, report };
}

export function buildWarMemoryLine(war: SectWarState): string {
  const status = war.状态;
  const attacker = war.发起方;
  const defender = war.守方;
  const ourLoss = war.累计伤亡?.我方 ?? {};
  const enemyLoss = war.累计伤亡?.敌方 ?? {};
  const ourLossText = `外门-${ourLoss.外门 ?? 0}/内门-${ourLoss.内门 ?? 0}/核心-${ourLoss.核心 ?? 0}`;
  const enemyLossText = `外门-${enemyLoss.外门 ?? 0}/内门-${enemyLoss.内门 ?? 0}/核心-${enemyLoss.核心 ?? 0}`;
  const goal = war.目标 ? `，目标：${war.目标}` : '';
  return `【宗门大战】${attacker} 对 ${defender}${goal} —— 结果：${status}。累计伤亡：我方(${ourLossText})，敌方(${enemyLossText})。`;
}

