/**
 * 天道演算 v4.2 — 判定预计算与规则核心
 * 目标：
 * - 提供高阶“检定/斗法”所需的派生属性与成功率曲线的预计算结果
 * - 将预计算结果写入 Tavern 聊天变量：`character.saveData.系统.天道演算`
 * - 供 AI 叙事在接到【判定请求】时直接引用，避免在模型侧重复推导
 */

import { get } from 'lodash';
import { getTavernHelper } from '@/utils/tavern';
import type { SaveData, CharacterBaseInfo, Item } from '@/types/game';

// 判定类型
export type HeavenlyCheckType = '法力' | '神海' | '道心' | '空速' | '气运';

// 交互参与者类型
export type InteractionParticipant = '用户' | 'NPC' | '环境';

// 交互模式
export interface InteractionContext {
  发起者: InteractionParticipant;
  接受者: InteractionParticipant;
  交互类型: '对话' | '斗法' | '比试' | '合作' | '交易' | '探索' | '修炼';
  情境描述?: string;
  难度调整?: number; // -5 到 +5 的难度修正
}

// 预计算结构
export interface HeavenlyDerivedAttributes {
  版本: string;
  角色: {
    名字: string;
    世界?: string;
    境界: { 名称: string; 等级: number };
    年龄?: number;
  };
  派生属性: {
    法力: number; // 基于灵气与装备映射
    神海: number; // 基于神识与悟性映射
    道心: number; // 基于心性/悟性/状态
    空速: number; // 基于境界/装备“速度”
    气运: number; // 基于先天六司.气运与状态
  };
  加权因子: {
    境界倍率: number; // 用于将资源映射到“检定强度”尺度
    装备命中: number; // 装备带来的命中加值（0-100线性）
    装备闪避: number; // 装备带来的闪避加值（0-100线性）
    装备暴击: number; // 装备带来的暴击几率（0-1）
    装备速度: number; // 装备带来的移动/出手机动
  };
  特许: {
    天道之眷标签: string[]; // 与本局角色绑定的“绝对优势”标签（示例：神品灵根-火、仙品体质-剑修）
    触发提示: string; // 说明如何触发特许（供AI参考）
  };
  成功率曲线: Record<HeavenlyCheckType, Array<{ DC: number; 成功率: number; 临界区间: { 大成: number; 大败: number } }>>;
  斗法基线: {
    命中率基线: number; // 对等敌手下的命中率基线
    闪避率基线: number; // 对等敌手下的闪避率基线
    暴击率基线: number; // 对等敌手下的暴击率基线
    伤害系数: number;   // 用于将“法力/神海”映射到伤害的系数
    豁免强度: number;   // 防御方道心对伤害的减免曲线强度
  };
  文字增幅: {
    天眷: string[];
    完胜: string[];
    险胜: string[];
    失手: string[];
    反噬: string[];
  };
  输出模板: {
    通用判定: string; // 供AI套入占位符
    斗法判定: string;
    用户对NPC: string; // 用户对NPC的交互模板
    NPC对用户: string; // NPC对用户的交互模板
    NPC对NPC: string;  // NPC对NPC的交互模板
  };
  交互支持: {
    支持的交互类型: string[];
    模式说明: Record<string, string>;
  };
  更新时间: string;
}

// 安全提取数值
function n(val: any, def = 0): number { const v = Number(val); return Number.isFinite(v) ? v : def; }

// 平滑函数：受控幅度的双曲正切，用于边际递减
function smooth(x: number, k = 1.2, scale = 1): number {
  return Math.tanh(x * k) * scale;
}

// 计算成功率（0.02~0.98），attr 为派生属性，DC 按“难度门槛”的惯例
// 调整：使用对数逻辑函数映射，极端值更平滑；气运偏移对称（-5%~+5%）。
function successRate(attr: number, DC: number, luck: number, bonus = 0): number {
  const ratio = (Math.max(0, attr) || 0) / Math.max(1, DC * 10);
  const z = Math.log(Math.max(1e-6, ratio)) * 2.2; // 灵敏度
  let p = 1 / (1 + Math.exp(-z));
  const luckBias = ((Math.min(10, Math.max(0, luck || 0)) - 5) * 0.01); // [-0.05,+0.05]
  p += luckBias + bonus;
  return Math.min(0.98, Math.max(0.02, p));
}

// 从装备/背包或装备栏中抽取“速度/命中/暴击/闪避”倾向（尽量宽容地读取结构）
function aggregateEquipAffix(saveData: SaveData | any) {
  let 命中 = 0, 闪避 = 0, 暴击 = 0, 速度 = 0;

  try {
    const equip = get(saveData, '装备栏', {} as Record<string, Item | string | null>);
    const bag = get(saveData, '背包.物品', {}) as Record<string, Item>;

    const collectFromItem = (it: any) => {
      if (!it || typeof it !== 'object') return;
      // 新物品系统 attributes[] 与套装 setBonus
      const attrs = (it.attributes || it.属性 || []) as Array<{ type?: string; value?: number; percentage?: boolean; 描述?: string; }>;
      const setAttrs = (it.setBonus?.bonus || []) as Array<{ type?: string; value?: number; percentage?: boolean; description?: string; }>;
      if (Array.isArray(attrs)) {
        for (const a of attrs) {
          const t = String((a.type || '')).trim();
          const v = n(a.value);
          if (/(命中|命中率|锐目|灵视)/.test(t)) 命中 += v;
          if (/(闪避|闪避率|腾挪|回避)/.test(t)) 闪避 += v;
          if (/(暴击|暴击率|会心)/.test(t)) 暴击 += (a.percentage ? v : v / 100);
          if (/(速度|移速|空速|轻身|风行|雷步|敏捷)/.test(t)) 速度 += v;
        }
      }
      if (Array.isArray(setAttrs)) {
        for (const a of setAttrs) {
          const t = String((a.type || '')).trim();
          const v = n(a.value);
          if (/(命中|命中率)/.test(t)) 命中 += v;
          if (/(闪避|闪避率)/.test(t)) 闪避 += v;
          if (/(暴击|暴击率)/.test(t)) 暴击 += (a.percentage ? v : v / 100);
          if (/(速度|移速|空速)/.test(t)) 速度 += v;
        }
      }
      // 兼容旧字段
      if (it.装备增幅) {
        const m = it.装备增幅 as any;
        if (m.后天六司?.心性) 闪避 += n(m.后天六司.心性) * 0.5;
        if (m.后天六司?.灵性) 命中 += n(m.后天六司.灵性) * 0.5;
      }
    };

    // 装备栏
    if (equip && typeof equip === 'object') {
      for (const key of Object.keys(equip)) {
        const ref = (equip as any)[key];
        const item = (typeof ref === 'string') ? bag?.[ref] : ref;
        collectFromItem(item);
      }
    }

    // 背包中常驻增幅（被动饰品）
    if (bag && typeof bag === 'object') {
      for (const key of Object.keys(bag)) {
        const it = bag[key];
        if (it?.装备特效 && Array.isArray(it.装备特效)) {
          if (it.装备特效.some((s: string) => /(轻身|追风|风行|雷步)/.test(s))) 速度 += 2;
          if (it.装备特效.some((s: string) => /(锐目|灵视|命中)/.test(s))) 命中 += 2;
        }
      }
    }

  } catch { /* 忽略解析失败 */ }

  return { 命中, 闪避, 暴击: Math.max(0, Math.min(0.6, 暴击)), 速度 };
}

// 读取状态效果对派生属性的修正（更贴近实际战况）
function computeStatusAdjustments(saveData: SaveData) {
  const effects = (get(saveData, '玩家角色状态.状态效果', []) || []) as Array<any>;
  let 法力 = 0, 神海 = 0, 道心 = 0, 空速 = 0;
  for (const e of effects) {
    const name = String(e?.状态名称 || e?.状态名 || e?.name || '').trim();
    const type = String(e?.类型 || e?.type || '').toLowerCase();
    const power = n(e?.强度, 1) || 1;
    // 道心相关
    if (/(心魔|恐惧|惊惧|畏缩|噬心)/.test(name) || (type === 'debuff' && /(心|意志)/.test(name))) {
      道心 -= 5 * power;
    }
    if (/(禅定|清明|心如止水|凝神)/.test(name) || (type === 'buff' && /(心|意志)/.test(name))) {
      道心 += 3 * power;
    }
    // 法力/神海相关
    if (/(灵力充盈|灵气涌动|灵力澎湃)/.test(name)) 法力 += 15 * power;
    if (/(灵力枯竭|灵气枯竭|乏力)/.test(name)) 法力 -= 20 * power;
    if (/(冥想|专注|神游|凝神)/.test(name)) 神海 += 10 * power;
    if (/(神识涣散|恍惚|分心)/.test(name)) 神海 -= 15 * power;
    // 速度相关
    if (/(迟缓|束缚|减速|负重|迟滞)/.test(name)) 空速 -= 5 * power;
    if (/(迅捷|轻身|风行|追风|雷步)/.test(name)) 空速 += 5 * power;
  }
  return { 法力, 神海, 道心, 空速 };
}

// 提取先天与资源，映射到“检定强度”
function deriveCore(saveData: SaveData, baseInfo: CharacterBaseInfo) {
  const realmName = get(saveData, '玩家角色状态.境界.名称', get(saveData, '玩家角色状态.境界', '凡人')) as string;
  const realmLevel = n(get(saveData, '玩家角色状态.境界.等级', 0));

  const 气血 = get(saveData, '玩家角色状态.气血', { 当前: 0, 最大: 0 });
  const 灵气 = get(saveData, '玩家角色状态.灵气', { 当前: 0, 最大: 0 });
  const 神识 = get(saveData, '玩家角色状态.神识', { 当前: 0, 最大: 0 });
  const 年龄 = n(get(saveData, '玩家角色状态.寿命.当前', undefined), undefined);

  const 根骨 = n(get(baseInfo, '先天六司.根骨', 10), 10);
  const 灵性 = n(get(baseInfo, '先天六司.灵性', 10), 10);
  const 悟性 = n(get(baseInfo, '先天六司.悟性', 10), 10);
  const 心性 = n(get(baseInfo, '先天六司.心性', 10), 10);
  const 气运 = n(get(baseInfo, '先天六司.气运', 5), 5);

  // 境界倍率：贴近 GameStateManager 的加成曲线，但更温和
  const 境界倍率 = 1 + realmLevel * 0.08;

  // 派生属性映射：资源与先天混合映射为“检定强度”尺度（0-1000+）
  const 法力 = Math.round((n(灵气.当前) * 0.8 + n(灵气.最大) * 0.4 + 灵性 * 6) * 境界倍率);
  const 神海 = Math.round((n(神识.当前) * 0.9 + n(神识.最大) * 0.5 + 悟性 * 5) * 境界倍率);
  const 道心 = Math.round((心性 * 10 + 悟性 * 6 + 根骨 * 4) * (1 + Math.min(0.2, (年龄 || 0) / 500)));
  const 空速 = Math.round((20 + 灵性 * 2 + 根骨 * 1.5) * 境界倍率);
  const 先天气运 = Math.max(0, Math.min(10, 气运));

  return { realmName, realmLevel, 年龄, 法力, 神海, 道心, 空速, 气运: 先天气运, 境界倍率 };
}

// 识别“天道之眷”标签
function scanHeavenlyFavors(baseInfo: CharacterBaseInfo): string[] {
  const tags: string[] = [];
  const talents = (baseInfo?.天赋详情 || baseInfo?.天赋 || []) as any[];
  const spirit = baseInfo?.灵根详情 || baseInfo?.灵根;

  const pushIf = (cond: boolean, label: string) => { if (cond) tags.push(label); };

  try {
    // 灵根品质/名称
    const srName = typeof spirit === 'string' ? spirit : spirit?.名称 || spirit?.name || '';
    const srQuality = spirit?.品质?.quality || spirit?.品质 || spirit?.阶位;
    pushIf(/神|仙/.test(String(srQuality || '')), `灵根-${String(srQuality)}`);
    pushIf(/火|雷|剑|金|木|水|土|风|冰/.test(String(srName || '')), `灵根-偏向:${String(srName)}`);

    // 天赋条目
    for (const t of talents) {
      const name = (typeof t === 'string') ? t : (t?.名称 || t?.name || '');
      pushIf(/神|仙/.test(String(name)), `天赋-${String(name)}`);
    }
  } catch { /* 忽略 */ }

  return Array.from(new Set(tags));
}

// 生成成功率曲线（DC: 20,40,60,80,100）
function buildCurves(派生: { [k in HeavenlyCheckType]: number }, 境界倍率: number, luck: number) {
  const DCs = [20, 40, 60, 80, 100];
  const out: Record<HeavenlyCheckType, Array<{ DC: number; 成功率: number; 临界区间: { 大成: number; 大败: number } }>> = {
    法力: [], 神海: [], 道心: [], 空速: [], 气运: []
  };
  (Object.keys(out) as HeavenlyCheckType[]).forEach((k) => {
    const base = 派生[k];
    out[k] = DCs.map(DC => {
      const p = successRate(base * 境界倍率, DC, luck, 0);
      // 动态临界区间：熟练越高（p越大）大成窗口略增，大败窗口略缩
      const 大成 = Math.max(1, Math.min(10, Math.round(3 + (p - 0.5) * 8)));
      const 大败 = Math.max(90, Math.min(99, Math.round(98 - (p - 0.5) * 12)));
      return { DC, 成功率: Math.round(p * 1000) / 10, 临界区间: { 大成, 大败 } };
    });
  });
  return out;
}

// 斗法基线
function buildCombatBaselines(派生: { 法力: number; 神海: number; 道心: number; 空速: number }, affix: { 命中: number; 闪避: number; 暴击: number; 速度: number }) {
  // 速度在对等情况下对命中/闪避都产生小幅影响
  const 速度影响 = smooth((派生.空速 + affix.速度 - 200) / 300, 1.0, 0.12); // [-0.12, +0.12]
  const 命中率基线 = Math.min(0.9, Math.max(0.2,
    0.58 + smooth((派生.神海 - 320) / 280, 1.1, 0.22) + (affix.命中 / 500) + 速度影响 * 0.4
  ));
  const 闪避率基线 = Math.min(0.7, Math.max(0.05,
    0.18 + smooth((派生.空速 - 220) / 260, 1.05, 0.26) + (affix.闪避 / 600) + 速度影响 * 0.6
  ));
  const 暴击率基线 = Math.min(0.5, Math.max(0.02,
    0.05 + smooth((派生.神海 - 420) / 420, 1.0, 0.14) + affix.暴击
  ));
  // 伤害系数受法力为主，同时受暴击率小幅加权
  const 伤害系数 = Math.max(0.8, 1.0 + smooth((派生.法力 - 400) / 400, 1.0, 0.5) + (暴击率基线 - 0.05) * 0.3);
  const 豁免强度 = Math.max(0.8, 1.0 + smooth((派生.道心 - 300) / 300, 1.0, 0.4));
  return { 命中率基线, 闪避率基线, 暴击率基线, 伤害系数, 豁免强度 };
}

// 文字增幅词库
function buildAmplifiers() {
  return {
    天眷: ['【天意归一】', '【大道垂怜】', '【气机圆满】', '【神运傍身】'],
    完胜: ['【水到渠成】', '【顺势而为】', '【稳中取胜】', '【神来之笔】'],
    险胜: ['【背水一战】', '【一线生机】', '【反手成势】', '【勉力而成】'],
    失手: ['【力有未逮】', '【气机不顺】', '【道行尚浅】', '【时也命也】'],
    反噬: ['【天机逆转】', '【灵机受挫】', '【心魔作祟】', '【天谴难逃】'],
  };
}

// 输出模板
function buildOutputTemplates() {
  return {
    通用判定: [
      '【判定：{类型}检定】',
      '角色: {{user}}',
      '属性: {属性名} ({属性值}) | 难度(DC): {DC}',
      '投骰: [{骰点}] / 成功率: [{成功率}%]',
      '结果: 【{等级}】{增幅词} {叙事}',
    ].join('\n'),
    斗法判定: [
      '【判定：斗法对抗】',
      '攻方: {{user}} | 守方: {敌人}',
      '[闪避] {闪避结果} | [命中] {命中结果} | [暴击] {暴击结果}',
      '最终伤害: {伤害}',
      '结果: 【{战况}】{增幅词} {叙事}',
    ].join('\n'),
    用户对NPC: [
      '【交互：{{user}} → {NPC名称}】',
      '交互类型: {交互类型} | 判定属性: {属性名}({属性值})',
      '难度调整: {难度调整} | 投骰: [{骰点}] / 成功率: [{成功率}%]',
      '结果: 【{等级}】{增幅词}',
      'NPC反应: {NPC反应描述}',
    ].join('\n'),
    NPC对用户: [
      '【交互：{NPC名称} → {{user}}】',
      '交互类型: {交互类型} | NPC意图: {NPC意图}',
      '用户应对: {应对属性}({属性值}) | 投骰: [{骰点}]',
      '结果: 【{等级}】{增幅词}',
      '后续影响: {影响描述}',
    ].join('\n'),
    NPC对NPC: [
      '【交互：{NPC1名称} ⇄ {NPC2名称}】',
      '交互类型: {交互类型} | 观察者: {{user}}',
      '双方实力: {实力对比} | 情境: {情境描述}',
      '结果: 【{结局}】{增幅词}',
      '对{{user}}的影响: {对用户影响}',
    ].join('\n'),
  };
}

// 交互支持配置
function buildInteractionSupport() {
  return {
    支持的交互类型: ['对话', '斗法', '比试', '合作', '交易', '探索', '修炼'],
    模式说明: {
      '用户对NPC': '用户主动与NPC进行交互，可能是对话、挑战、交易等',
      'NPC对用户': 'NPC主动找用户交互，用户需要应对',
      'NPC对NPC': '两个NPC之间的交互，用户作为观察者，可能受到影响',
      '对话': '通过言语进行交流，主要判定道心、神海',
      '斗法': '法术或武力对抗，主要判定法力、空速',
      '比试': '技能或能力比拼，根据具体内容判定相应属性',
      '合作': '协同完成任务，可能涉及多种属性',
      '交易': '商业交换，主要判定道心、气运',
      '探索': '探索未知区域，主要判定神海、空速、气运',
      '修炼': '修炼提升，主要判定法力、神海、道心'
    }
  };
}

// 主入口：计算并返回完整的“天道演算”对象
export function computeHeavenlyPrecalc(saveData: SaveData, baseInfo: CharacterBaseInfo): HeavenlyDerivedAttributes {
  const 版本 = '4.2';

  const 派生核心 = deriveCore(saveData, baseInfo);
  const 装备汇总 = aggregateEquipAffix(saveData);
  const 状态修正 = computeStatusAdjustments(saveData);

  const 派生属性 = {
    法力: Math.max(0, 派生核心.法力 + 状态修正.法力),
    神海: Math.max(0, 派生核心.神海 + 状态修正.神海),
    道心: Math.max(0, 派生核心.道心 + 状态修正.道心),
    空速: Math.max(0, Math.round(派生核心.空速 + 装备汇总.速度 + 状态修正.空速)),
    气运: 派生核心.气运,
  } as Record<HeavenlyCheckType, number> & any;

  const 成功率曲线 = buildCurves(派生属性, 1, 派生核心.气运);
  const 斗法基线 = buildCombatBaselines(
    { 法力: 派生属性.法力, 神海: 派生属性.神海, 道心: 派生属性.道心, 空速: 派生属性.空速 },
    装备汇总
  );

  const 天眷标签 = scanHeavenlyFavors(baseInfo);

  const 数据: HeavenlyDerivedAttributes = {
    版本,
    角色: {
      名字: baseInfo.名字,
      世界: baseInfo.世界,
      境界: { 名称: 派生核心.realmName, 等级: 派生核心.realmLevel },
      年龄: 派生核心.年龄,
    },
    派生属性,
    加权因子: {
      境界倍率: 派生核心.境界倍率,
      装备命中: 装备汇总.命中,
      装备闪避: 装备汇总.闪避,
      装备暴击: 装备汇总.暴击,
      装备速度: 装备汇总.速度,
    },
    特许: {
      天道之眷标签: 天眷标签,
      触发提示: '若“灵根/天赋”与检定类型强相关（如火灵根→法力/攻击），视为【天眷】，可直接判定大成或给予+20%成功率上限内修正',
    },
    成功率曲线,
    斗法基线,
    文字增幅: buildAmplifiers(),
    输出模板: buildOutputTemplates(),
    交互支持: buildInteractionSupport(),
    更新时间: new Date().toISOString(),
  };

  return 数据;
}

// 执行交互判定
export function executeInteractionCheck(
  context: InteractionContext,
  checkType: HeavenlyCheckType,
  DC: number,
  precalc: HeavenlyDerivedAttributes
): {
  成功: boolean;
  骰点: number;
  成功率: number;
  等级: string;
  增幅词: string;
  模板: string;
} {
  const 属性值 = precalc.派生属性[checkType];
  const 气运 = precalc.派生属性.气运;
  const 难度调整 = context.难度调整 || 0;
  
  // 计算成功率
  const 基础成功率 = successRate(属性值, DC + 难度调整 * 5, 气运);
  
  // 模拟投骰
  const 骰点 = Math.floor(Math.random() * 100) + 1;
  const 成功 = 骰点 <= 基础成功率 * 100;
  
  // 判定等级
  let 等级: string;
  let 增幅词: string;
  
  if (骰点 <= 5) {
    等级 = '大成';
    增幅词 = precalc.文字增幅.完胜[Math.floor(Math.random() * precalc.文字增幅.完胜.length)];
  } else if (骰点 >= 95) {
    等级 = '大败';
    增幅词 = precalc.文字增幅.反噬[Math.floor(Math.random() * precalc.文字增幅.反噬.length)];
  } else if (成功) {
    if (骰点 <= 基础成功率 * 50) {
      等级 = '成功';
      增幅词 = precalc.文字增幅.完胜[Math.floor(Math.random() * precalc.文字增幅.完胜.length)];
    } else {
      等级 = '险胜';
      增幅词 = precalc.文字增幅.险胜[Math.floor(Math.random() * precalc.文字增幅.险胜.length)];
    }
  } else {
    等级 = '失败';
    增幅词 = precalc.文字增幅.失手[Math.floor(Math.random() * precalc.文字增幅.失手.length)];
  }
  
  // 选择合适的模板
  let 模板: string;
  if (context.发起者 === '用户' && context.接受者 === 'NPC') {
    模板 = precalc.输出模板.用户对NPC;
  } else if (context.发起者 === 'NPC' && context.接受者 === '用户') {
    模板 = precalc.输出模板.NPC对用户;
  } else if (context.发起者 === 'NPC' && context.接受者 === 'NPC') {
    模板 = precalc.输出模板.NPC对NPC;
  } else {
    模板 = precalc.输出模板.通用判定;
  }
  
  return {
    成功,
    骰点,
    成功率: Math.round(基础成功率 * 1000) / 10,
    等级,
    增幅词,
    模板
  };
}

// 写入到 Tavern 聊天变量
export async function syncHeavenlyPrecalcToTavern(saveData: SaveData, baseInfo: CharacterBaseInfo) {
  const helper = getTavernHelper();
  if (!helper) return;
  try {
    const precalc = computeHeavenlyPrecalc(saveData, baseInfo);
    
    // 确保系统字段存在
    if (!saveData.系统) {
      saveData.系统 = {};
    }
    saveData.系统.天道演算 = precalc;
    
    // 同步整个存档数据，而不是创建分离的结构
    await helper.insertOrAssignVariables({
      'character.saveData': saveData
    }, { type: 'chat' });
  } catch (e) {
    console.error('[天道演算] 同步到酒馆失败:', e);
  }
}
