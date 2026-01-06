/**
 * @fileoverview 状态效果管理系统 - 数值化时间管理
 * 使用精确的数值计算进行状态效果的时间管理和自动过期检测
 */

import type { SaveData, StatusEffect, GameTime } from '@/types/game';
import { get, set } from 'lodash';

/**
 * 兼容旧格式的状态效果类型
 */
type LegacyStatusEffect = Partial<StatusEffect> & {
  时间?: string;
  剩余时间?: string;
  name?: string;
  type?: 'buff' | 'debuff';
  description?: string;
  intensity?: number;
  source?: string;
  duration?: string;
};

/**
 * 将时间转换为总分钟数
 * @param gameTime 时间对象
 * @returns 总分钟数
 */
export function gameTimeToTotalMinutes(gameTime: GameTime): number {
  const minutes = gameTime.分钟 ?? 0;
  return gameTime.年 * 365 * 24 * 60 +
         gameTime.月 * 30 * 24 * 60 +
         gameTime.日 * 24 * 60 +
         gameTime.小时 * 60 +
         minutes;
}

/**
 * 将分钟数格式化为可读的持续时间字符串
 * @param minutes 分钟数
 * @returns 格式化的时间字符串
 */
export function formatMinutesToDuration(minutes: number): string {
  if (minutes <= 0) return '已过期';
  if (minutes >= 99999) return '永久';

  const years = Math.floor(minutes / (365 * 24 * 60));
  const months = Math.floor((minutes % (365 * 24 * 60)) / (30 * 24 * 60));
  const days = Math.floor((minutes % (30 * 24 * 60)) / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  const parts = [];
  if (years > 0) parts.push(`${years}年`);
  if (months > 0) parts.push(`${months}月`);
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (mins > 0) parts.push(`${mins}分钟`);

  return parts.length > 0 ? parts.join('') : '不足1分钟';
}

/**
 * 解析持续时间字符串为分钟数（向后兼容旧格式）
 * @param duration 持续时间字符串，如"2小时30分钟"、"3天"、"1年2月"
 * @returns 分钟数
 */
export function parseDurationToMinutes(duration: string): number {
  if (!duration || typeof duration !== 'string') return 0;

  let totalMinutes = 0;

  const yearMatch = duration.match(/(\d+)年/);
  if (yearMatch) {
    totalMinutes += parseInt(yearMatch[1]) * 365 * 24 * 60;
  }

  const monthMatch = duration.match(/(\d+)月/);
  if (monthMatch) {
    totalMinutes += parseInt(monthMatch[1]) * 30 * 24 * 60;
  }

  const dayMatch = duration.match(/(\d+)天/);
  if (dayMatch) {
    totalMinutes += parseInt(dayMatch[1]) * 24 * 60;
  }

  const hourMatch = duration.match(/(\d+)小时/);
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60;
  }

  const minuteMatch = duration.match(/(\d+)分钟/);
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1]);
  }

  return totalMinutes;
}

/**
 * 检查状态效果是否已过期
 * @param effect 状态效果对象
 * @param currentGameTime 当前时间
 * @returns 是否已过期
 */
export function isStatusEffectExpired(effect: StatusEffect, currentGameTime: GameTime): boolean {
  if (effect.生成时间 && typeof effect.持续时间分钟 === 'number') {
    if (effect.持续时间分钟 < 0 || effect.持续时间分钟 >= 99999) {
      return false;
    }

    const effectStartTime = gameTimeToTotalMinutes(effect.生成时间);
    const currentTime = gameTimeToTotalMinutes(currentGameTime);
    const elapsedMinutes = currentTime - effectStartTime;

    return elapsedMinutes >= effect.持续时间分钟;
  }

  if (effect.时间 && effect.剩余时间) {
    const remainingMinutes = parseDurationToMinutes(effect.剩余时间);
    return remainingMinutes <= 0;
  }

  return false;
}

/**
 * 计算状态效果的剩余时间（分钟）
 * @param effect 状态效果对象
 * @param currentGameTime 当前时间
 * @returns 剩余时间（分钟），如果已过期返回0
 */
export function calculateRemainingMinutes(effect: StatusEffect, currentGameTime: GameTime): number {
  if (effect.生成时间 && typeof effect.持续时间分钟 === 'number') {
    if (effect.持续时间分钟 < 0 || effect.持续时间分钟 >= 99999) {
      return 99999;
    }

    const effectStartTime = gameTimeToTotalMinutes(effect.生成时间);
    const currentTime = gameTimeToTotalMinutes(currentGameTime);
    const elapsedMinutes = currentTime - effectStartTime;
    const remainingMinutes = effect.持续时间分钟 - elapsedMinutes;

    return Math.max(0, remainingMinutes);
  }

  return 60;
}

/**
 * 规范化状态效果对象，确保使用新的数值化格式
 * @param effect 状态效果对象或旧格式数据
 * @param gameTime 当前时间
 * @returns 规范化的状态效果对象，如果无法规范化返回null
 */
export function normalizeStatusEffect(effect: LegacyStatusEffect, gameTime: GameTime): StatusEffect | null {
  try {
    if (!effect || typeof effect !== 'object') {
      console.warn('[状态效果] 无效的状态效果数据:', effect);
      return null;
    }

    if (effect.生成时间 && typeof effect.持续时间分钟 === 'number') {
      return effect as StatusEffect;
    }

    const normalizedEffect: StatusEffect = {
      状态名称: effect.状态名称 || effect.name || '未知状态',
      类型: effect.类型 || effect.type || 'buff',
      生成时间: {
        年: gameTime.年,
        月: gameTime.月,
        日: gameTime.日,
        小时: gameTime.小时 || 0,
        分钟: gameTime.分钟 ?? 0
      },
      持续时间分钟: 0,
      状态描述: effect.状态描述 || effect.description || '无描述',
      强度: effect.强度 || effect.intensity,
      来源: effect.来源 || effect.source
    };

    if (effect.剩余时间) {
      normalizedEffect.持续时间分钟 = parseDurationToMinutes(effect.剩余时间);
    } else if (effect.duration) {
      normalizedEffect.持续时间分钟 = parseDurationToMinutes(effect.duration);
    } else {
      normalizedEffect.持续时间分钟 = 60;
    }

    return normalizedEffect;

  } catch (error) {
    console.error('[状态效果] 规范化状态效果失败:', error);
    return null;
  }
}

/**
 * 更新状态效果列表，移除过期的状态效果
 * @param saveData 存档数据
 * @returns 返回一个对象，其中包含被移除的状态效果名称列表
 */
export function updateStatusEffects(saveData: SaveData): { removedEffects: string[] } {
  const removedEffects: string[] = [];
  try {
    const statusEffects = get(saveData, '角色.效果', get(saveData, '效果', [])) as StatusEffect[];
    if (!Array.isArray(statusEffects) || statusEffects.length === 0) {
      return { removedEffects };
    }

    const currentGameTime = ((saveData as any).元数据?.时间 ?? (saveData as any).时间) as GameTime | undefined;
    if (!currentGameTime) {
      console.warn('[状态效果] 时间不存在，无法更新状态效果');
      return { removedEffects };
    }

    const updatedEffects: StatusEffect[] = [];

    for (const effect of statusEffects) {
      if (!effect || typeof effect !== 'object') {
        console.warn('[状态效果] 跳过无效的状态效果:', effect);
        continue;
      }

      const normalizedEffect = normalizeStatusEffect(effect, currentGameTime);
      if (!normalizedEffect) {
        console.warn('[状态效果] 跳过无法规范化的状态效果:', effect);
        continue;
      }

      if (isStatusEffectExpired(normalizedEffect, currentGameTime)) {
        console.log(`[状态效果] 状态效果"${normalizedEffect.状态名称}"已过期，将被移除`);
        removedEffects.push(normalizedEffect.状态名称);
      } else {
        updatedEffects.push(normalizedEffect);
      }
    }

    if (removedEffects.length > 0) {
      // V3：写回 角色.效果（旧字段不再写回）
      if (!(saveData as any).角色) (saveData as any).角色 = {};
      set(saveData, '角色.效果', updatedEffects);
    }

    return { removedEffects };

  } catch (error) {
    console.error('[状态效果] 更新状态效果失败:', error);
    return { removedEffects };
  }
}

/**
 * 添加新的状态效果
 * @param saveData 存档数据
 * @param effectData 状态效果数据
 * @returns 是否添加成功
 */
export function addStatusEffect(saveData: SaveData, effectData: LegacyStatusEffect): boolean {
  try {
    const currentGameTime = ((saveData as any).元数据?.时间 ?? (saveData as any).时间) as GameTime | undefined;
    if (!currentGameTime) {
      console.warn('[状态效果] 时间不存在，无法添加状态效果');
      return false;
    }

    const normalizedEffect = normalizeStatusEffect(effectData, currentGameTime);
    if (!normalizedEffect) {
      console.warn('[状态效果] 无法规范化状态效果数据:', effectData);
      return false;
    }

    const statusEffects = get(saveData, '角色.效果', get(saveData, '效果', [])) as StatusEffect[];
    statusEffects.push(normalizedEffect);
    if (!(saveData as any).角色) (saveData as any).角色 = {};
    set(saveData, '角色.效果', statusEffects);
    return true;

  } catch (error) {
    console.error('[状态效果] 添加状态效果失败:', error);
    return false;
  }
}

/**
 * 移除指定名称的状态效果
 * @param saveData 存档数据
 * @param effectName 状态效果名称
 * @returns 是否移除成功
 */
export function removeStatusEffect(saveData: SaveData, effectName: string): boolean {
  try {
    const statusEffects = get(saveData, '角色.效果', get(saveData, '效果', [])) as StatusEffect[];
    const initialLength = statusEffects.length;

    // 🔥 调试日志：显示所有状态效果名称
    console.log('[状态效果-调试] 尝试移除:', effectName);
    console.log('[状态效果-调试] 当前状态效果列表:', statusEffects.map(e => e.状态名称 || (e as any).name || '未知'));

    // 🔥 兼容性修复：同时检查 状态名称 和 name 字段
    const updatedEffects = statusEffects.filter(effect => {
      const effectNameInData = effect.状态名称 || (effect as any).name;
      return effectNameInData !== effectName;
    });

    if (!(saveData as any).角色) (saveData as any).角色 = {};
    set(saveData, '角色.效果', updatedEffects);

    const removed = initialLength > updatedEffects.length;
    console.log('[状态效果-调试] 移除结果:', removed ? '成功' : '失败', `(${initialLength} -> ${updatedEffects.length})`);

    return removed;

  } catch (error) {
    console.error('[状态效果] 移除状态效果失败:', error);
    return false;
  }
}

/**
 * 获取状态效果的显示信息（包含剩余时间）
 * @param saveData 存档数据
 * @returns 状态效果显示信息数组
 */
export function getStatusEffectDisplayInfo(saveData: SaveData): Array<{
  名称: string;
  类型: 'buff' | 'debuff';
  描述: string;
  剩余时间: string;
  强度?: number;
  来源?: string;
}> {
  try {
    const statusEffects = get(saveData, '角色.效果', get(saveData, '效果', [])) as StatusEffect[];
    const currentGameTime = ((saveData as any).元数据?.时间 ?? (saveData as any).时间) as GameTime | undefined;

    if (!currentGameTime || !Array.isArray(statusEffects)) {
      return [];
    }

    return statusEffects
      .filter(effect => effect && typeof effect === 'object' && effect.状态名称)
      .map(effect => ({
        名称: effect.状态名称,
        类型: effect.类型,
        描述: effect.状态描述,
        剩余时间: formatMinutesToDuration(calculateRemainingMinutes(effect, currentGameTime)),
        强度: effect.强度,
        来源: effect.来源
      }));

  } catch (error) {
    console.error('[状态效果] 获取显示信息失败:', error);
    return [];
  }
}
