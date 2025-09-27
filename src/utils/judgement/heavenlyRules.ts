/**
 * 天道演算 v5.0 — 精简高效判定系统
 * 核心原则：
 * - 数值计算完全程序化，无文本匹配
 * - 提示词精简高效，节约token
 * - 支持通用判定（战斗、交互、修炼等）
 * - 完善死亡机制和游戏阻断
 */

import { get, set, unset } from 'lodash';
import { getTavernHelper } from '@/utils/tavern';
import type { SaveData, CharacterBaseInfo, Item, NpcProfile, HeavenlyCalculation, CoreAttributes, DeathState } from '@/types/game';

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

// 计算核心属性（纯数值计算，无文本匹配）
function calculateCoreAttributes(saveData: SaveData, baseInfo: CharacterBaseInfo): CoreAttributes {
  // 基础属性
  const 根骨 = safeNum(baseInfo?.先天六司?.根骨, 10);
  const 灵性 = safeNum(baseInfo?.先天六司?.灵性, 10);
  const 悟性 = safeNum(baseInfo?.先天六司?.悟性, 10);
  const 心性 = safeNum(baseInfo?.先天六司?.心性, 10);
  const 气运 = safeNum(baseInfo?.先天六司?.气运, 5);

  // 资源状态
  const 气血 = get(saveData, '玩家角色状态.气血', { 当前: 100, 最大: 100 });
  const 灵气 = get(saveData, '玩家角色状态.灵气', { 当前: 100, 最大: 100 });
  const 神识 = get(saveData, '玩家角色状态.神识', { 当前: 100, 最大: 100 });

  // 境界等级
  const 境界等级 = safeNum(get(saveData, '玩家角色状态.境界.等级', 0));
  const 境界加成 = 1 + 境界等级 * 0.1;

  // 装备数值加成（仅计算明确的数值字段）
  const 装备加成 = calculateEquipmentBonus(saveData);

  // 功法数值加成
  const 功法加成 = calculateTechniqueBonus(saveData);

  // 状态效果数值加成
  const 状态加成 = calculateStatusBonus(saveData);

  // 计算最终属性
  const 攻击力 = Math.round((根骨 * 3 + 灵性 * 4 + safeNum(灵气.当前) * 0.5 + 装备加成.攻击 + 功法加成.攻击 + 状态加成.攻击) * 境界加成);
  const 防御力 = Math.round((根骨 * 4 + 心性 * 3 + safeNum(气血.最大) * 0.3 + 装备加成.防御 + 功法加成.防御 + 状态加成.防御) * 境界加成);
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

// 计算装备数值加成（仅处理明确的数值字段）
function calculateEquipmentBonus(saveData: SaveData) {
  let 攻击 = 0, 防御 = 0, 灵识 = 0, 敏捷 = 0;

  try {
    const 装备栏 = get(saveData, '装备栏', {});
    const 背包物品 = get(saveData, '背包.物品', {});

    // 遍历装备栏
    Object.values(装备栏).forEach((equipRef: any) => {
      if (!equipRef) return;

      // 获取装备物品
      let item: any = null;
      if (typeof equipRef === 'string') {
        item = (背包物品 as Record<string, Item>)[equipRef];
      } else if (typeof equipRef === 'object' && equipRef.物品ID) {
        item = (背包物品 as Record<string, Item>)[equipRef.物品ID];
      } else {
        item = equipRef;
      }

      if (!item || typeof item !== 'object') return;

      // 只处理明确的数值字段
      if (typeof item.攻击力 === 'number') 攻击 += item.攻击力;
      if (typeof item.防御力 === 'number') 防御 += item.防御力;
      if (typeof item.灵识 === 'number') 灵识 += item.灵识;
      if (typeof item.敏捷 === 'number') 敏捷 += item.敏捷;

      // 装备增幅中的数值加成
      const 增幅 = item.装备增幅;
      if (增幅 && typeof 增幅 === 'object') {
        if (typeof 增幅.攻击力 === 'number') 攻击 += 增幅.攻击力;
        if (typeof 增幅.防御力 === 'number') 防御 += 增幅.防御力;
        if (typeof 增幅.灵识 === 'number') 灵识 += 增幅.灵识;
        if (typeof 增幅.敏捷 === 'number') 敏捷 += 增幅.敏捷;
      }
    });

  } catch (error) {
    console.warn('[天道演算] 装备加成计算失败:', error);
  }

  return { 攻击, 防御, 灵识, 敏捷 };
}

// 计算功法数值加成
function calculateTechniqueBonus(saveData: SaveData) {
  let 攻击 = 0, 防御 = 0, 灵识 = 0, 敏捷 = 0;

  try {
    const 功法数据 = get(saveData, '修炼功法', {}) as any;
    const 熟练度 = safeNum(功法数据.熟练度, 0);

    if (熟练度 > 0) {
      // 基于熟练度的固定加成
      const 基础加成 = Math.floor(熟练度 / 10);
      攻击 += 基础加成 * 2;
      防御 += 基础加成;
      灵识 += 基础加成 * 1.5;
      敏捷 += 基础加成 * 0.5;

      // 功法引用的物品加成
      const 功法引用 = 功法数据.功法;
      if (功法引用?.物品ID) {
        const 背包物品 = get(saveData, '背包.物品', {}) as Record<string, Item>;
        const 功法物品 = 背包物品[功法引用.物品ID];
        
        if (功法物品?.功法效果) {
          const 效果 = 功法物品.功法效果 as any;
          if (typeof 效果.攻击加成 === 'number') 攻击 += 效果.攻击加成;
          if (typeof 效果.防御加成 === 'number') 防御 += 效果.防御加成;
          if (typeof 效果.灵识加成 === 'number') 灵识 += 效果.灵识加成;
          if (typeof 效果.敏捷加成 === 'number') 敏捷 += 效果.敏捷加成;
        }
      }
    }

  } catch (error) {
    console.warn('[天道演算] 功法加成计算失败:', error);
  }

  return { 攻击, 防御, 灵识, 敏捷 };
}

// 计算状态效果数值加成
function calculateStatusBonus(saveData: SaveData) {
  let 攻击 = 0, 防御 = 0, 灵识 = 0, 敏捷 = 0;

  try {
    const 状态列表 = get(saveData, '玩家角色状态.状态效果', []);
    
    状态列表.forEach((状态: any) => {
      if (!状态 || typeof 状态 !== 'object') return;

      const 强度 = safeNum(状态.强度, 1);

      // 处理明确的数值字段
      if (typeof 状态.攻击加成 === 'number') 攻击 += 状态.攻击加成 * 强度;
      if (typeof 状态.防御加成 === 'number') 防御 += 状态.防御加成 * 强度;
      if (typeof 状态.灵识加成 === 'number') 灵识 += 状态.灵识加成 * 强度;
      if (typeof 状态.敏捷加成 === 'number') 敏捷 += 状态.敏捷加成 * 强度;

      // 基于类型的简单计算
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

// 检查并更新死亡状态的实现
function checkAndUpdateDeathStateImpl(saveData: SaveData): DeathState {
  try {
    const 气血 = get(saveData, '玩家角色状态.气血', { 当前: 100, 最大: 100 });
    const 寿命 = get(saveData, '玩家角色状态.寿命', { 当前: 100, 最大: 100 });
    const 现有死亡状态 = get(saveData, '玩家角色状态.死亡状态', { 已死亡: false });

    // 如果已经死亡，直接返回
    if (现有死亡状态.已死亡) {
      return 现有死亡状态;
    }

    const 当前气血 = safeNum(气血.当前, 100);
    const 当前寿命 = safeNum(寿命.当前, 100);

    // 检查死亡条件
    let 死亡状态: DeathState = { 已死亡: false };

    if (当前气血 <= 0) {
      死亡状态 = {
        已死亡: true,
        死亡时间: getCurrentGameTime(saveData),
        死亡原因: '气血耗尽',
        死亡类型: '战斗死亡'
      };
    } else if (当前寿命 <= 0) {
      死亡状态 = {
        已死亡: true,
        死亡时间: getCurrentGameTime(saveData),
        死亡原因: '寿元耗尽',
        死亡类型: '寿元耗尽'
      };
    }

    // 更新死亡状态到存档
    if (死亡状态.已死亡) {
      set(saveData, '玩家角色状态.死亡状态', 死亡状态);
      console.log('[死亡系统] 角色死亡:', 死亡状态);
    }

    return 死亡状态;

  } catch (error) {
    console.error('[死亡系统] 检查死亡状态失败:', error);
    return { 已死亡: false };
  }
}

// 获取当前游戏时间
function getCurrentGameTime(saveData: SaveData): string {
  const 游戏时间 = get(saveData, '游戏时间', {}) as any;
  const 年 = safeNum(游戏时间.年, 1);
  const 月 = safeNum(游戏时间.月, 1);
  const 日 = safeNum(游戏时间.日, 1);
  return `${年}年${月}月${日}日`;
}

// 执行通用判定
export function executeCheck(
  checkType: CheckType,
  difficulty: number,
  attributes: CoreAttributes,
  气运调整 = 0
): CheckResult {
  // 根据判定类型选择主要属性
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

  // 计算成功率
  const 基础数值 = 主属性 + attributes.境界加成 * 10;
  const 气运加成 = (attributes.气运 + 气运调整 - 5) * 2; // -10 到 +10
  const 最终数值 = 基础数值 + 气运加成;

  // 成功率计算（对数函数）
  const 成功率 = Math.min(0.95, Math.max(0.05, 
    1 / (1 + Math.exp(-(最终数值 - difficulty * 10) / 20))
  ));

  // 模拟投骰
  const 随机值 = Math.random();
  const 成功 = 随机值 < 成功率;

  // 判定等级
  let 等级: ResultLevel;
  if (随机值 < 0.05) {
    等级 = '完美';
  } else if (随机值 < 成功率 * 0.3) {
    等级 = '大成';
  } else if (成功) {
    等级 = '成功';
  } else if (随机值 > 0.95) {
    等级 = '大败';
  } else {
    等级 = '失败';
  }

  return {
    成功,
    等级,
    数值: Math.round(最终数值),
    加成: Math.round(气运加成),
    最终结果: Math.round(成功率 * 100)
  };
}

// 执行战斗判定
export function executeCombat(
  攻击方属性: CoreAttributes,
  防御方属性: CoreAttributes,
  攻击类型: DamageType = '物理'
): CombatResult {
  // 命中判定
  const 命中检定 = executeCheck('攻击', 5, 攻击方属性);
  const 闪避检定 = executeCheck('防御', 5, 防御方属性);
  const 命中 = 命中检定.成功 && !闪避检定.成功;

  if (!命中) {
    return {
      命中: false,
      暴击: false,
      伤害: 0,
      防御减免: 0,
      最终伤害: 0
    };
  }

  // 暴击判定
  const 暴击率 = Math.min(0.3, Math.max(0.05, 攻击方属性.敏捷 / 1000));
  const 暴击 = Math.random() < 暴击率;

  // 伤害计算
  let 基础伤害 = 攻击方属性.攻击力 * (0.8 + Math.random() * 0.4);
  if (暴击) {
    基础伤害 *= 1.5 + (攻击方属性.气运 - 5) * 0.1;
  }

  // 防御减免
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
    
    // 根据伤害类型调整伤害
    let 实际伤害 = 伤害;
    switch (伤害类型) {
      case '心魔':
        实际伤害 = Math.round(伤害 * 1.2); // 心魔伤害更高
        break;
      case '天劫':
        实际伤害 = Math.round(伤害 * 1.5); // 天劫伤害最高
        break;
    }

    // 应用伤害
    const 新气血 = Math.max(0, 当前气血 - 实际伤害);
    set(saveData, '玩家角色状态.气血.当前', 新气血);

    console.log(`[战斗系统] 造成${实际伤害}点${伤害类型}伤害，剩余气血: ${新气血}`);

    // 检查死亡
    return checkAndUpdateDeathState(saveData);

  } catch (error) {
    console.error('[战斗系统] 应用伤害失败:', error);
    return { 已死亡: false };
  }
}

// 应用伤害给NPC
export function applyDamageToNpc(
  npc: NpcProfile,
  伤害: number,
  伤害类型: DamageType = '物理'
): boolean {
  try {
    if (!npc.角色存档信息) return false;

    const 当前气血 = safeNum(npc.角色存档信息.当前气血, 100);
    const 新气血 = Math.max(0, 当前气血 - 伤害);
    
    npc.角色存档信息.当前气血 = 新气血;
    
    console.log(`[战斗系统] NPC ${npc.角色基础信息.名字} 受到${伤害}点伤害，剩余气血: ${新气血}`);
    
    return 新气血 <= 0; // 返回是否死亡

  } catch (error) {
    console.error('[战斗系统] NPC受伤失败:', error);
    return false;
  }
}

// 重置死亡状态（复活）
export function resetDeathState(saveData: SaveData): void {
  try {
    const 死亡状态: DeathState = { 已死亡: false };
    set(saveData, '玩家角色状态.死亡状态', 死亡状态);

    // 恢复最少气血
    const 气血 = get(saveData, '玩家角色状态.气血', { 当前: 1, 最大: 100 });
    const 最大气血 = safeNum(气血.最大, 100);
    set(saveData, '玩家角色状态.气血.当前', Math.max(1, Math.floor(最大气血 * 0.1)));

    console.log('[死亡系统] 角色已复活');

  } catch (error) {
    console.error('[死亡系统] 复活失败:', error);
  }
}

// 计算并返回完整的天道演算结果
export function computeHeavenlyCalculation(
  saveData: SaveData,
  baseInfo: CharacterBaseInfo
): HeavenlyCalculation {
  const 核心属性 = calculateCoreAttributes(saveData, baseInfo);
  const 死亡状态 = checkAndUpdateDeathState(saveData);
  const 境界等级 = safeNum(get(saveData, '玩家角色状态.境界.等级', 0));

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
    // 1. 计算天道演算结果
    const calculation = computeHeavenlyCalculation(saveData, baseInfo);
    
    // 2. 将结果直接存入 saveData
    set(saveData, '玩家角色状态.heavenly', calculation);

    // 3. 将更新后的完整 saveData 同步到酒馆
    await helper.insertOrAssignVariables({
      'character.saveData': saveData
    }, { type: 'chat' });

    console.log('[天道演算] 同步完成，天道演算结果已存入存档');

  } catch (error) {
    console.error('[天道演算] 同步失败:', error);
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
角色数据已预计算，请直接使用 character.heavenlyCalculation 中的数值。

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
气血≤0时角色死亡，游戏结束。寿元≤0同样死亡。

### 使用方式
1. 根据行动选择判定类型
2. 使用预计算数值执行判定
3. 基于结果等级叙述后果
4. 更新角色状态（伤害/奖励）

**重要：严格按照数值计算，不得随意修改结果。**
`;
}