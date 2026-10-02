/**
 * 回合判定：前端算好基础值、幸运点和环境/状态修正，模型只负责选用并写进〔〕。
 *
 * 有效属性 = 先天 × 0.7 + 后天 × 0.3
 * 属性加权 = 主 × 0.5 + 副 × 0.3 + 辅 × 0.2
 * 基础值 = 底子 10 + 属性加权 + 境界加成
 * 判定值 = 基础值 + 幸运点 + 环境修正 + 状态修正
 * 有对手时基础不变，按对手强弱换难度档位。
 */

import { realmRank } from '@/utils/realmOrder'

export type SixSiKey = '根骨' | '灵性' | '悟性' | '气运' | '魅力' | '心性'

export interface SixSi {
  根骨: number
  灵性: number
  悟性: number
  气运: number
  魅力: number
  心性: number
}

/** 主 / 副 / 辅 */
const TYPE_WEIGHTS: Record<string, [SixSiKey, SixSiKey, SixSiKey]> = {
  战斗: ['根骨', '灵性', '气运'],
  战斗攻: ['根骨', '灵性', '气运'],
  战斗防: ['根骨', '心性', '灵性'],
  修炼: ['悟性', '灵性', '心性'],
  突破: ['悟性', '灵性', '心性'],
  炼制: ['悟性', '灵性', '心性'],
  探索: ['气运', '灵性', '悟性'],
  社交: ['魅力', '悟性', '心性'],
  逃跑: ['灵性', '气运', '根骨'],
  感知: ['灵性', '悟性', '气运'],
}

/**
 * 人人都有的底子。凡人属性加权只有 3～5，没有这 10 点，简单、极易会被"难度至少为 1"截住，
 * 跟普通几乎一样难，新手连极易的事都会失败。
 */
const BASE_FLOOR = 10

/** 与境界序号对齐：凡人0 … 渡劫9。同序号的武道境界共用这一档。 */
const REALM_BONUS_BY_RANK = [0, 5, 12, 20, 30, 42, 55, 70, 79, 88]

export interface JudgementBaseLine {
  属性加权: number
  基础: number
}

export interface JudgementRound {
  幸运点: number
  气运: number
  幸运下限: number
  幸运上限: number
  状态修正: number
  境界名: string
  境界加成: number
  环境: {
    灵气浓度: number
    修炼: number
    炼制: number
    战斗: number
  }
  分项: Record<string, JudgementBaseLine>
}

const SIX_KEYS: SixSiKey[] = ['根骨', '灵性', '悟性', '气运', '魅力', '心性']

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function readSix(raw: unknown, fallback: number): SixSi {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  const read = (key: SixSiKey) => {
    if (!src || src[key] === undefined || src[key] === null || src[key] === '') return fallback
    return num(src[key], fallback)
  }
  return {
    根骨: read('根骨'),
    灵性: read('灵性'),
    悟性: read('悟性'),
    气运: read('气运'),
    魅力: read('魅力'),
    心性: read('心性'),
  }
}

/** 先天 70%，后天 30%。装备、功法、大道对六司的提升算在后天里。 */
export function effectiveAttribute(innate: number, acquired: number): number {
  return innate * 0.7 + acquired * 0.3
}

export function effectiveSix(innate: SixSi, acquired: SixSi): SixSi {
  return SIX_KEYS.reduce((acc, key) => {
    acc[key] = effectiveAttribute(innate[key], acquired[key])
    return acc
  }, {} as SixSi)
}

export function weightedAttribute(attrs: SixSi, [main, sub, aux]: [SixSiKey, SixSiKey, SixSiKey]): number {
  return attrs[main] * 0.5 + attrs[sub] * 0.3 + attrs[aux] * 0.2
}

export function realmJudgementBonus(realmName: string): number {
  const rank = realmRank(realmName)
  if (rank < 0) return 0
  if (rank < REALM_BONUS_BY_RANK.length) return REALM_BONUS_BY_RANK[rank]
  const last = REALM_BONUS_BY_RANK.length - 1
  return REALM_BONUS_BY_RANK[last] + (rank - last) * 12
}

/**
 * 气运取有效值后限制在 0–10。区间随气运上移，均匀抽取：
 * 气运 0：-8～+6；气运 5：-6～+11；气运 10：-3～+16。
 */
export function luckyRange(fortune: number): { min: number; max: number } {
  const f = Math.min(10, Math.max(0, Math.round(fortune)))
  return {
    min: -8 + Math.floor(f * 0.5),
    max: 6 + f,
  }
}

export function rollLuckyPoints(fortune: number, random: () => number = Math.random): number {
  const { min, max } = luckyRange(fortune)
  const span = max - min + 1
  return min + Math.floor(random() * span)
}

export function environmentModifier(spiritDensity: number, kind: '修炼' | '炼制' | '战斗'): number {
  const density = num(spiritDensity, 50)
  const divisor = kind === '修炼' ? 10 : kind === '炼制' ? 15 : 20
  return Math.round((density - 50) / divisor)
}

function ratioOf(current: unknown, max: unknown): number | null {
  const cap = num(max, NaN)
  const now = num(current, NaN)
  if (!Number.isFinite(cap) || cap <= 0 || !Number.isFinite(now)) return null
  return now / cap
}

function effectSign(effect: unknown): number | null {
  if (!effect || typeof effect !== 'object') return null
  const kind = String((effect as { 类型?: unknown }).类型 || '').toLowerCase()
  if (kind === 'buff' || kind === '增益') return 1
  if (kind === 'debuff' || kind === '减益') return -1
  return null
}

/**
 * 气血、灵气、神识与增益/减益，合计限制在 -10～+15。
 * 伤病只取最重的一项，不叠加：受伤后减值叠满，下一次判定几乎必败，会一路输到死。
 */
export function statusModifier(attributes: unknown, effects: unknown): number {
  const attrs = attributes && typeof attributes === 'object' ? (attributes as Record<string, any>) : {}
  let injury = 0

  const hp = ratioOf(attrs.气血?.当前, attrs.气血?.上限)
  if (hp !== null) {
    if (hp < 0.25) injury = -6
    else if (hp < 0.5) injury = -3
  }
  const spirit = ratioOf(attrs.灵气?.当前, attrs.灵气?.上限)
  if (spirit !== null && spirit < 0.3) injury = Math.min(injury, -2)
  const sense = ratioOf(attrs.神识?.当前, attrs.神识?.上限)
  if (sense !== null && sense < 0.3) injury = Math.min(injury, -3)
  let mod = injury

  if (Array.isArray(effects)) {
    for (const effect of effects) {
      const sign = effectSign(effect)
      if (sign === null) continue
      const raw = num((effect as { 强度?: unknown }).强度, 2)
      const magnitude = Math.min(10, Math.max(1, Math.round(Math.abs(raw))))
      mod += sign * magnitude
    }
  }

  return Math.min(15, Math.max(-10, mod))
}

/**
 * 难度跟着该类型基础值走，不再使用固定的 10/20/35/50。
 * 幸运大约在 -8～+16，档位必须落在这个跨度里。气运 4、无伤时成功率约：
 * 简单 100%｜普通 65%｜困难 47%｜艰难 29%｜极难 12%。
 */
export function difficultyBands(base: number): Record<'极易' | '简单' | '普通' | '困难' | '艰难' | '极难', number> {
  const atLeastOne = (n: number) => Math.max(1, n)
  return {
    极易: atLeastOne(base - 12),
    简单: atLeastOne(base - 6),
    普通: atLeastOne(base),
    困难: base + 3,
    艰难: base + 6,
    极难: base + 9,
  }
}

/** 档位间距跟幸运跨度对齐：原先完美要 +30，幸运最多 +15，永远出不来。 */
export function computeJudgementResult(finalValue: number, difficulty: number): string {
  if (finalValue >= difficulty + 15) return '完美'
  if (finalValue >= difficulty + 8) return '大成功'
  if (finalValue >= difficulty) return '成功'
  if (finalValue < difficulty - 12) return '大失败'
  return '失败'
}

function realmNameOf(attributes: unknown): string {
  const realm = attributes && typeof attributes === 'object' ? (attributes as { 境界?: unknown }).境界 : undefined
  if (typeof realm === 'string') return realm
  if (realm && typeof realm === 'object' && '名称' in realm) return String((realm as { 名称?: unknown }).名称 || '')
  return ''
}

export function buildJudgementRound(input: {
  先天六司?: unknown
  后天六司?: unknown
  属性?: unknown
  效果?: unknown
  灵气浓度?: unknown
  random?: () => number
}): JudgementRound {
  const innate = readSix(input.先天六司, 5)
  const acquired = readSix(input.后天六司, 0)
  const attrs = effectiveSix(innate, acquired)
  const fortune = Math.min(10, Math.max(0, Math.round(attrs.气运)))
  const range = luckyRange(fortune)
  const realmName = realmNameOf(input.属性)
  const realmBonus = realmJudgementBonus(realmName)
  const density = num(input.灵气浓度, 50)

  const 分项: Record<string, JudgementBaseLine> = {}
  for (const [type, weights] of Object.entries(TYPE_WEIGHTS)) {
    if (type === '战斗') continue
    const weighted = Math.round(weightedAttribute(attrs, weights))
    分项[type] = { 属性加权: weighted, 基础: BASE_FLOOR + weighted + realmBonus }
  }

  return {
    幸运点: rollLuckyPoints(fortune, input.random),
    气运: fortune,
    幸运下限: range.min,
    幸运上限: range.max,
    状态修正: statusModifier(input.属性, input.效果),
    境界名: realmName || '未知',
    境界加成: realmBonus,
    环境: {
      灵气浓度: density,
      修炼: environmentModifier(density, '修炼'),
      炼制: environmentModifier(density, '炼制'),
      战斗: environmentModifier(density, '战斗'),
    },
    分项,
  }
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : String(n)
}

const PROMPT_TYPES = ['战斗攻', '战斗防', '修炼', '突破', '炼制', '探索', '社交', '逃跑', '感知'] as const

function environmentForType(type: string, round: JudgementRound): number {
  if (type === '修炼' || type === '突破') return round.环境.修炼
  if (type === '炼制') return round.环境.炼制
  if (type === '战斗攻' || type === '战斗防') return round.环境.战斗
  return 0
}

/** 贴在玩家操作旁边。同数值的类型合并成一行。正常行事用简单，够到所选难度就必须写成功。 */
export function formatJudgementBlock(round: JudgementRound): string {
  const groups = new Map<string, { types: string[]; base: number; env: number; value: number; easy: string; normal: string }>()
  for (const type of PROMPT_TYPES) {
    const line = round.分项[type]
    const env = environmentForType(type, round)
    const value = line.基础 + round.幸运点 + env + round.状态修正
    const bands = difficultyBands(line.基础)
    const easy = computeJudgementResult(value, bands.简单)
    const normal = computeJudgementResult(value, bands.普通)
    const key = `${line.基础}|${env}|${value}|${easy}|${normal}`
    const group = groups.get(key)
    if (group) group.types.push(type)
    else groups.set(key, { types: [type], base: line.基础, env, value, easy, normal })
  }
  const lines = [...groups.values()].map((group) => {
    const bands = difficultyBands(group.base)
    return `- ${group.types.join('、')}: 判定值${group.value}，基础${group.base}，环境${signed(group.env)}。简单难度${bands.简单}→${group.easy}，普通难度${bands.普通}→${group.normal}`
  })
  return `# 本回合判定（数值已掷好，禁止重算，禁止改结果）
幸运${signed(round.幸运点)}，状态${signed(round.状态修正)}。判定值 = 基础 + 幸运 + 环境 + 状态。〔〕里必须写上幸运。
本境界正常行事（修炼、赶路、打听、对等交手、炼制当前境界能接触的物品）用简单难度。普通只用于明确偏难但仍在本境界内的事。
判定值 ≥ 所选难度就必须写成功、大成功或完美，禁止改成失败。只有越级、条件不足的强行突破、硬闯才用困难及以上。
困难=基础+3，艰难=基础+6，极难=基础+9。禁止使用 10/20/35/50/70/90 这类固定难度。
境界：${round.境界名}。凡人没有初期/中期/后期。
${lines.join('\n')}
有明确对手时：基础不变，按对手强弱选难度。对手弱一个大境界及以上免判；弱一两个小阶段=简单；同阶=普通；高一个小阶段=困难；高两个小阶段=艰难；高一个大境界=极难；高两个大境界及以上免判，只能逃、躲、求饶。逃跑比正面交手低两档。
失败是吃亏，不是死：失败最多轻伤，大失败才重伤；气血 25% 以上时一次判定不会致死；濒死时也要留活路（逃脱、昏迷被救、被俘），除非玩家执意送死。`
}
