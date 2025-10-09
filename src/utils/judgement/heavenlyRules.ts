/**
 * 天道演算 v5.0 — 精简高效判定系统
 * 核心原则：
 * - 数值计算完全程序化，无文本匹配
 * - 提示词精简高效，节约token
 * - 支持通用判定（战斗、交互、修炼等）
 * - 完善死亡机制和游戏阻断
 */

import { get, set } from 'lodash';
import { getTavernHelper } from '@/utils/tavern';
import type {
  SaveData,
  CharacterBaseInfo,
  Item,
  NpcProfile,
  HeavenlyCalculation,
  HeavenlySystem,
  DeathState,
  EquipmentItem,
  TechniqueItem,
  StatusEffect
} from '@/types/game';

// 判定类型
export type CheckType = '攻击' | '防御' | '修炼' | '交互' | '探索' | '炼制';

// 伤害类型
export type DamageType = '物理' | '法术' | '心魔' | '天劫';

// 判定结果等级
export type ResultLevel = '大败' | '失败' | '成功' | '大成' | '完美';

// 战斗结果
export interface CombatResult {
  命中: boolean;
  暴击: boolean;
  伤害: number;
  防御减免: number;
  最终伤害: number;
  附加效果?: string[];
}

// 通用判定结果
export interface CheckResult {
  成功: boolean;
  等级: ResultLevel;
  数值: number;
  加成: number;
  最终结果: number;
}

// 安全数值提取
function safeNum(val: any, defaultVal = 0): number {
  const num = Number(val);
  return Number.isFinite(num) ? num : defaultVal;
}

// [重构] 计算核心属性，适配新的 HeavenlySystem 类型
function calculateCoreAttributes(saveData: SaveData, baseInfo: CharacterBaseInfo): HeavenlySystem['核心属性'] {
  // 基础属性
  const 根骨 = safeNum(baseInfo?.先天六司?.根骨, 10);
  const 灵性 = safeNum(baseInfo?.先天六司?.灵性, 10);
  const 悟性 = safeNum(baseInfo?.先天六司?.悟性, 10);
  const 心性 = safeNum(baseInfo?.先天六司?.心性, 10);
  const 气运 = safeNum(baseInfo?.先天六司?.气运, 5);

  // 资源状态
  const 气血 = get(saveData, '玩家角色状态.气血', { 当前: 100, 上限: 100 });
  const 灵气 = get(saveData, '玩家角色状态.灵气', { 当前: 100, 上限: 100 });
  const 神识 = get(saveData, '玩家角色状态.神识', { 当前: 100, 上限: 100 });

  // 境界名称映射到等级（用于数值计算）
  const 境界名称 = String(get(saveData, '玩家角色状态.境界.名称', '凡人'));
  const 境界映射: Record<string, number> = {
    '凡人': 0, '练气': 1, '炼气': 1, '筑基': 2, '金丹': 3,
    '元婴': 4, '化神': 5, '炼虚': 6, '合体': 7, '渡劫': 8
  };
  const 境界等级 = 境界映射[境界名称] || 0;
  const 境界加成 = 1 + 境界等级 * 0.1;

  // 装备数值加成
  const 装备加成 = calculateEquipmentBonus(saveData);

  // 功法数值加成
  const 功法加成 = calculateTechniqueBonus(saveData);

  // 状态效果数值加成
  const 状态加成 = calculateStatusBonus(saveData);

  // 计算最终属性
  const 攻击力 = Math.round((根骨 * 3 + 灵性 * 4 + safeNum(灵气.当前) * 0.5 + 装备加成.攻击 + 功法加成.攻击 + 状态加成.攻击) * 境界加成);
  const 防御力 = Math.round((根骨 * 4 + 心性 * 3 + safeNum(气血.上限) * 0.3 + 装备加成.防御 + 功法加成.防御 + 状态加成.防御) * 境界加成);
  const 灵识 = Math.round((悟性 * 4 + 灵性 * 3 + safeNum(神识.当前) * 0.6 + 装备加成.灵识 + 功法加成.灵识 + 状态加成.灵识) * 境界加成);
  const 敏捷 = Math.round((灵性 * 3 + 根骨 * 2 + 装备加成.敏捷 + 功法加成.敏捷 + 状态加成.敏捷) * 境界加成);

  return {
    攻击力,
    防御力,
    灵识,
    敏捷,
    气运,
    境界加成
  };
}

// [重构] 计算装备数值加成，适配新的 Item 和 AttributeBonus 类型
function calculateEquipmentBonus(saveData: SaveData) {
  let 攻击 = 0, 防御 = 0, 灵识 = 0, 敏捷 = 0;

  try {
    const 装备栏 = get(saveData, '装备栏', {});
    const 背包物品对象 = get(saveData, '背包.物品', {}) as Record<string, Item>;

    Object.values(装备栏).forEach((equipRef: any) => {
      if (!equipRef || typeof equipRef !== 'object') return;

      const equipId = equipRef.物品ID || equipRef;
      const item = 背包物品对象[equipId];

      if (item && item.类型 === '装备') {
        const equip = item as EquipmentItem;
        const 增幅 = equip.装备增幅;
        if (增幅) {
          攻击 += safeNum(增幅.攻击力);
          防御 += safeNum(增幅.防御力);
          灵识 += safeNum(增幅.灵识);
          敏捷 += safeNum(增幅.敏捷);
        }
      }
    });
  } catch (error) {
    console.warn('[天道演算] 装备加成计算失败:', error);
  }

  return { 攻击, 防御, 灵识, 敏捷 };
}

// [重构] 计算功法数值加成，适配新的 TechniqueItem 和 TechniqueEffects 类型
function calculateTechniqueBonus(saveData: SaveData) {
  let 攻击 = 0, 防御 = 0, 灵识 = 0, 敏捷 = 0;

  try {
    const 功法数据 = get(saveData, '修炼功法');
    if (!功法数据) return { 攻击, 防御, 灵识, 敏捷 };

    // 新结构：修炼功法直接包含功法数据和进度
    const 熟练度 = safeNum(功法数据.熟练度, 0);
    if (熟练度 > 0) {
      const 基础加成 = Math.floor(熟练度 / 10);
      攻击 += 基础加成 * 2;
      防御 += 基础加成;
      灵识 += 基础加成 * 1.5;
      敏捷 += 基础加成 * 0.5;
    }

    // 功法数据直接在修炼功法对象中
    if (功法数据.类型 === '功法') {
      const technique = 功法数据 as unknown as TechniqueItem;
      const 效果 = technique.功法效果;
      if (效果?.属性加成) {
        攻击 += safeNum(效果.属性加成.攻击力);
        防御 += safeNum(效果.属性加成.防御力);
        灵识 += safeNum(效果.属性加成.灵识);
        敏捷 += safeNum(效果.属性加成.敏捷);
      }
    }
  } catch (error) {
    console.warn('[天道演算] 功法加成计算失败:', error);
  }

  return { 攻击, 防御, 灵识, 敏捷 };
}

// [重构] 计算状态效果数值加成，适配新的 StatusEffect 类型
function calculateStatusBonus(saveData: SaveData) {
  let 攻击 = 0, 防御 = 0, 灵识 = 0, 敏捷 = 0;

  try {
    const 状态列表 = get(saveData, '玩家角色状态.状态效果', []) as StatusEffect[];
    
    状态列表.forEach((状态) => {
      if (!状态) return;
      const 强度 = safeNum(状态.强度, 1);

      // 这里假设加成属性直接存在状态对象上，如果存在子对象需要修改
      攻击 += safeNum((状态 as any).攻击加成) * 强度;
      防御 += safeNum((状态 as any).防御加成) * 强度;
      灵识 += safeNum((状态 as any).灵识加成) * 强度;
      敏捷 += safeNum((状态 as any).敏捷加成) * 强度;

      if (状态.类型 === 'buff') {
        攻击 += 5 * 强度;
        防御 += 3 * 强度;
        灵识 += 4 * 强度;
        敏捷 += 2 * 强度;
      } else if (状态.类型 === 'debuff') {
        攻击 -= 8 * 强度;
        防御 -= 5 * 强度;
        灵识 -= 6 * 强度;
        敏捷 -= 4 * 强度;
      }
    });
  } catch (error) {
    console.warn('[天道演算] 状态加成计算失败:', error);
  }

  return { 攻击, 防御, 灵识, 敏捷 };
}

// 检查并更新死亡状态
export function checkAndUpdateDeathState(saveData: SaveData): DeathState {
  return checkAndUpdateDeathStateImpl(saveData);
}

// 兼容旧接口的函数
export function checkCharacterDeath(saveData: SaveData): {
  isDead: boolean;
  deathReason?: string;
  shouldBlockGame: boolean;
} {
  const deathState = checkAndUpdateDeathState(saveData);
  return {
    isDead: deathState.已死亡,
    deathReason: deathState.死亡原因,
    shouldBlockGame: deathState.已死亡
  };
}

// [重构] 检查并更新死亡状态的实现，适配新的 DeathState 类型
function checkAndUpdateDeathStateImpl(saveData: SaveData): DeathState {
  try {
    const 气血 = get(saveData, '玩家角色状态.气血', { 当前: 100, 上限: 100 });
    const 最大寿命 = safeNum(get(saveData, '玩家角色状态.寿命.上限'), 100);
    const 现有死亡状态 = get(saveData, '玩家角色状态.死亡状态', { 已死亡: false });

    if (现有死亡状态?.已死亡) {
      return 现有死亡状态;
    }

    const 当前气血 = safeNum(气血.当前, 100);

    // 通过出生日期和当前游戏时间计算年龄（仅判断年份）
    const 出生年份 = safeNum(get(saveData, '角色基础信息.出生日期.年'), 0);
    const 当前年份 = safeNum(get(saveData, '游戏时间.年'), 1);
    const 当前年龄 = 出生年份 > 0 ? 当前年份 - 出生年份 : safeNum(get(saveData, '角色基础信息.年龄'), 18);

    // 🔥 调试日志：寿命检测
    console.log('[死亡系统] 寿命检测:', {
      出生年份,
      当前年份,
      当前年龄,
      最大寿命,
      是否超限: 当前年龄 >= 最大寿命
    });

    let 死亡状态: DeathState = { 已死亡: false };

    if (当前气血 <= 0) {
      死亡状态 = {
        已死亡: true,
        死亡时间: getCurrentGameTime(saveData),
        死亡原因: '气血耗尽',
      };
    } else if (当前年龄 >= 最大寿命) {
      // 🔥 增加额外验证：确保寿命上限合理（至少80岁）
      if (最大寿命 < 80) {
        console.warn('[死亡系统] ⚠️ 检测到异常寿命上限:', 最大寿命, '已忽略死亡判定');
        // 寿命上限异常，不触发死亡
      } else {
        // 当年龄达到或超过最大寿命时判定死亡
        死亡状态 = {
          已死亡: true,
          死亡时间: getCurrentGameTime(saveData),
          死亡原因: '寿元耗尽',
        };
      }
    }

    if (死亡状态.已死亡) {
      set(saveData, '玩家角色状态.死亡状态', 死亡状态);
      console.log('[死亡系统] 角色死亡:', 死亡状态, `当前年龄: ${当前年龄}, 最大寿命: ${最大寿命}`);
    }

    return 死亡状态;
  } catch (error) {
    console.error('[死亡系统] 检查死亡状态失败:', error);
    return { 已死亡: false };
  }
}

// 获取当前游戏时间
function getCurrentGameTime(saveData: SaveData): string {
  const 游戏时间 = get(saveData, '游戏时间', { 年: 1, 月: 1, 日: 1 });
  return `${游戏时间.年}年${游戏时间.月}月${游戏时间.日}日`;
}

// [重构] 执行通用判定，适配新的 HeavenlySystem['核心属性'] 类型
export function executeCheck(
  checkType: CheckType,
  difficulty: number,
  attributes: HeavenlySystem['核心属性'],
  气运调整 = 0
): CheckResult {
  let 主属性: number;
  switch (checkType) {
    case '攻击':
      主属性 = attributes.攻击力;
      break;
    case '防御':
      主属性 = attributes.防御力;
      break;
    case '修炼':
    case '炼制':
      主属性 = attributes.灵识;
      break;
    case '交互':
      主属性 = (attributes.灵识 + attributes.气运 * 5) / 2;
      break;
    case '探索':
      主属性 = (attributes.敏捷 + attributes.灵识) / 2;
      break;
    default:
      主属性 = attributes.灵识;
  }

  const 基础数值 = 主属性 + attributes.境界加成 * 10;
  const 气运加成 = (attributes.气运 + 气运调整 - 5) * 2;
  const 最终数值 = 基础数值 + 气运加成;

  const 成功率 = Math.min(0.95, Math.max(0.05,
    1 / (1 + Math.exp(-(最终数值 - difficulty * 10) / 20))
  ));

  const 随机值 = Math.random();
  const 成功 = 随机值 < 成功率;

  let 等级: ResultLevel;
  if (随机值 < 0.05) 等级 = '完美';
  else if (随机值 < 成功率 * 0.3) 等级 = '大成';
  else if (成功) 等级 = '成功';
  else if (随机值 > 0.95) 等级 = '大败';
  else 等级 = '失败';

  return {
    成功,
    等级,
    数值: Math.round(最终数值),
    加成: Math.round(气运加成),
    最终结果: Math.round(成功率 * 100)
  };
}

// [重构] 执行战斗判定，适配新的 HeavenlySystem['核心属性'] 类型
export function executeCombat(
  攻击方属性: HeavenlySystem['核心属性'],
  防御方属性: HeavenlySystem['核心属性'],
  攻击类型: DamageType = '物理'
): CombatResult {
  const 命中检定 = executeCheck('攻击', 5, 攻击方属性);
  const 闪避检定 = executeCheck('防御', 5, 防御方属性);
  const 命中 = 命中检定.成功 && !闪避检定.成功;

  if (!命中) {
    return { 命中: false, 暴击: false, 伤害: 0, 防御减免: 0, 最终伤害: 0 };
  }

  const 暴击率 = Math.min(0.3, Math.max(0.05, 攻击方属性.敏捷 / 1000));
  const 暴击 = Math.random() < 暴击率;

  let 基础伤害 = 攻击方属性.攻击力 * (0.8 + Math.random() * 0.4);
  if (暴击) {
    基础伤害 *= 1.5 + (攻击方属性.气运 - 5) * 0.1;
  }

  const 防御减免 = 防御方属性.防御力 * 0.5;
  const 最终伤害 = Math.max(1, Math.round(基础伤害 - 防御减免));

  return {
    命中,
    暴击,
    伤害: Math.round(基础伤害),
    防御减免: Math.round(防御减免),
    最终伤害
  };
}

// 应用伤害并检查死亡
export function applyDamageAndCheckDeath(
  saveData: SaveData,
  伤害: number,
  伤害类型: DamageType = '物理'
): DeathState {
  try {
    const 气血 = get(saveData, '玩家角色状态.气血', { 当前: 100, 最大: 100 });
    const 当前气血 = safeNum(气血.当前, 100);
    
    let 实际伤害 = 伤害;
    switch (伤害类型) {
      case '心魔': 实际伤害 = Math.round(伤害 * 1.2); break;
      case '天劫': 实际伤害 = Math.round(伤害 * 1.5); break;
    }

    const 新气血 = Math.max(0, 当前气血 - 实际伤害);
    set(saveData, '玩家角色状态.气血.当前', 新气血);

    console.log(`[战斗系统] 造成${实际伤害}点${伤害类型}伤害，剩余气血: ${新气血}`);

    return checkAndUpdateDeathState(saveData);
  } catch (error) {
    console.error('[战斗系统] 应用伤害失败:', error);
    return { 已死亡: false };
  }
}

// [重构] 应用伤害给NPC，适配新的 NpcProfile 类型
export function applyDamageToNpc(
  npc: NpcProfile,
  伤害: number,
  伤害类型: DamageType = '物理'
): boolean {
  // 简化：当前NPC结构没有血量，暂不处理
  console.warn(`[战斗系统] 尝试对NPC ${(npc as any).角色基础信息?.名字 || 'Unknown'} 造成伤害，但当前NPC结构不支持血量。`);
  return false;
}

// 重置死亡状态（复活）
export function resetDeathState(saveData: SaveData): void {
  try {
    const 死亡状态: DeathState = { 已死亡: false };
    set(saveData, '玩家角色状态.死亡状态', 死亡状态);

    const 气血 = get(saveData, '玩家角色状态.气血', { 当前: 1, 上限: 100 });
    const 最大气血 = safeNum(气血.上限, 100);
    set(saveData, '玩家角色状态.气血.当前', Math.max(1, Math.floor(最大气血 * 0.1)));

    console.log('[死亡系统] 角色已复活');
  } catch (error) {
    console.error('[死亡系统] 复活失败:', error);
  }
}

// [重构] 计算并返回完整的天道演算结果，适配新的 HeavenlySystem 类型
export function computeHeavenlyCalculation(
  saveData: SaveData,
  baseInfo: CharacterBaseInfo
): HeavenlySystem {
  const 核心属性 = calculateCoreAttributes(saveData, baseInfo);
  const 死亡状态 = checkAndUpdateDeathState(saveData);
  const 境界名称 = String(get(saveData, '玩家角色状态.境界.名称', '凡人'));
  const 境界映射: Record<string, number> = {
    '凡人': 0, '练气': 1, '炼气': 1, '筑基': 2, '金丹': 3,
    '元婴': 4, '化神': 5, '炼虚': 6, '合体': 7, '渡劫': 8
  };
  const 境界等级 = 境界映射[境界名称] || 0;

  return {
    版本: '5.0',
    角色名称: baseInfo.名字,
    境界等级,
    核心属性,
    死亡状态,
    更新时间: new Date().toISOString()
  };
}

// 同步到Tavern
export async function syncToTavern(saveData: SaveData, baseInfo: CharacterBaseInfo): Promise<void> {
  const helper = getTavernHelper();
  if (!helper) return;

  try {
    // heavenly 字段已废弃，不再存储
    const calculation = computeHeavenlyCalculation(saveData, baseInfo);

    // character.saveData 已废弃，现在使用分片数据结构，不再同步到酒馆
    // 数据由 characterStore 通过 syncToTavernAndSave() 自动同步

    console.log('[天道演算] 计算完成（数据由Store统一管理）');
  } catch (error) {
    console.error('[天道演算] 计算失败:', error);
  }
}

// 兼容旧接口的同步函数
export async function syncHeavenlyPrecalcToTavern(saveData: SaveData, baseInfo: CharacterBaseInfo): Promise<void> {
  return syncToTavern(saveData, baseInfo);
}

// 生成精简判定提示词
export function generateJudgmentPrompt(): string {
  return `
## 天道演算系统 v5.0

### 判定规则
根据角色的先天六司、境界、装备等综合因素进行判定。

#### 可用判定类型：
- 攻击/防御（战斗）
- 修炼/炼制（提升）
- 交互（社交）
- 探索（冒险）

#### 结果等级：
- 完美(5%)：超凡表现，额外奖励
- 大成(15%)：优秀结果，正常奖励
- 成功(60%)：达成目标，基础奖励
- 失败(15%)：未达目标，轻微惩罚
- 大败(5%)：严重失误，重大惩罚

#### 死亡机制：
当 \`heavenly.死亡状态.已死亡\` 为 true 时，角色死亡，游戏结束。

### 使用方式
1. 根据行动选择判定类型
2. 使用预计算数值执行判定
3. 基于结果等级叙述后果
4. 更新角色状态（伤害/奖励）

**重要：严格按照数值计算，不得随意修改结果。**
`;
}