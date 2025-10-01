/**
 * @fileoverview 状态变更日志格式化工具
 * 将原始的 StateChangeLog 对象转换为人类可读的、具有游戏语义的格式。
 */

import type { StateChangeLog, StateChange, Item } from '@/types/game';
import { get, isObject, isArray } from 'lodash';

// --- 核心数据结构 ---

/** 格式化后的单条变更项 */
export interface FormattedChange {
  icon: 'add' | 'remove' | 'update' | 'info'; // 用于UI显示的图标类型
  color: 'green' | 'red' | 'blue' | 'gray'; // 用于UI显示的颜色
  title: string; // 变更的标题，例如 "获得物品"
  description: string; // 变更的详细描述，例如 "【玄铁剑】x 1"
  details?: string[]; // 更详细的属性变化列表
}

/** 格式化后的变更日志 */
export interface FormattedStateChangeLog {
  summary: {
    added: number;
    removed: number;
    updated: number;
  };
  changes: FormattedChange[];
}

// --- 辅助函数 ---

function getItemName(item: Item | any): string {
  if (!isObject(item)) return '未知物品';
  return item.名称 || '无名物品';
}

function getQuantity(item: Item | any): number {
  if (!isObject(item)) return 1;
  return item.数量 || 1;
}

// --- 解析器模块 ---

/**
 * 解析物品变更
 * @param change - 单条变更记录
 * @returns FormattedChange | null
 */
function parseItemChange(change: StateChange): FormattedChange | null {
  const { key, action, oldValue, newValue } = change;

  // 适用于 `背包.物品` 数组的变更
  if (key.includes('背包.物品')) {
    if (action === 'push') { // 新增物品
      const item = newValue as any;
      return {
        icon: 'add',
        color: 'green',
        title: '获得物品',
        description: `【${getItemName(item)}】x ${getQuantity(item)}`,
      };
    }
    if (action === 'delete' || action === 'pull') { // 删除物品
      const item = oldValue as any;
      return {
        icon: 'remove',
        color: 'red',
        title: '失去物品',
        description: `【${getItemName(item)}】x ${getQuantity(item)}`,
      };
    }
    // todo: 解析数组内物品数量变更等更复杂情况
  }
  
  // 适用于灵石变更
  if (key.startsWith('背包.灵石')) {
    const stoneType = key.split('.').pop() || '灵石';
    const diff = (newValue as number) - (oldValue as number);
    if (diff > 0) {
      return {
        icon: 'add',
        color: 'green',
        title: `获得${stoneType}`,
        description: `+ ${diff}`,
      };
    } else if (diff < 0) {
      return {
        icon: 'remove',
        color: 'red',
        title: `消耗${stoneType}`,
        description: `${diff}`,
      };
    }
  }

  return null;
}

/**
 * 解析角色核心属性变更 (修为、气血等)
 * @param change - 单条变更记录
 * @returns FormattedChange | null
 */
function parsePlayerStatusChange(change: StateChange): FormattedChange | null {
  const { key, action, oldValue, newValue } = change;
  if (!key.startsWith('玩家角色状态')) return null;

  const attributeName = key.split('.').pop() || '属性';
  
  // 处理 ValuePair 结构, e.g., { 当前: 100, 最大: 100 }
  if (isObject(newValue) && '当前' in newValue && isObject(oldValue) && '当前' in oldValue) {
    const diff = (newValue as any).当前 - (oldValue as any).当前;
    const maxChanged = (newValue as any).最大 !== (oldValue as any).最大;
    
    let description = `${(oldValue as any).当前} -> ${(newValue as any).当前}`;
    if (diff > 0) description += ` (+${diff})`;
    if (diff < 0) description += ` (${diff})`;
    if (maxChanged) description += ` (上限变为 ${(newValue as any).最大})`;

    return {
      icon: 'update',
      color: 'blue',
      title: `${attributeName}变化`,
      description,
    };
  }
  
  // 处理直接的数值变更
  if (typeof newValue === 'number' && typeof oldValue === 'number') {
    const diff = newValue - oldValue;
    let description = `${oldValue} -> ${newValue}`;
    if (diff > 0) description += ` (+${diff})`;
    if (diff < 0) description += ` (${diff})`;
    
    return {
      icon: 'update',
      color: 'blue',
      title: `${attributeName}变化`,
      description,
    };
  }

  return null;
}

/**
 * 通用解析器，用于处理未被特殊解析的变更
 * @param change - 单条变更记录
 * @returns FormattedChange
 */
function parseGenericChange(change: StateChange): FormattedChange {
  const { key, action, oldValue, newValue } = change;
  
  let description = '';
  if (action === 'set' || action === 'update') {
    description = `值从 ${JSON.stringify(oldValue)} 变为 ${JSON.stringify(newValue)}`;
  } else if (action === 'add') {
    description = `数值增加了 ${newValue}`;
  } else if (action === 'delete') {
    description = `移除了该字段`;
  } else {
    description = `执行了 ${action} 操作`;
  }

  return {
    icon: 'info',
    color: 'gray',
    title: `数据变更: ${key}`,
    description,
  };
}


// --- 主函数 ---

/**
 * 格式化完整的状态变更日志
 * @param log - 原始的 StateChangeLog
 * @returns FormattedStateChangeLog
 */
export function formatStateChanges(log: StateChangeLog): FormattedStateChangeLog {
  const formatted: FormattedStateChangeLog = {
    summary: {
      added: 0,
      removed: 0,
      updated: 0,
    },
    changes: [],
  };

  if (!log || !isArray(log.changes)) {
    return formatted;
  }

  for (const change of log.changes) {
    let parsedChange: FormattedChange | null = null;

    // 按优先级尝试不同的解析器
    parsedChange = parseItemChange(change);
    if (!parsedChange) {
      parsedChange = parsePlayerStatusChange(change);
    }
    // ... 在这里可以添加更多解析器，例如大道、人际关系等

    // 如果所有特殊解析器都失败了，使用通用解析器
    if (!parsedChange) {
      parsedChange = parseGenericChange(change);
    }
    
    formatted.changes.push(parsedChange);

    // 更新统计信息
    if (parsedChange.icon === 'add') formatted.summary.added++;
    else if (parsedChange.icon === 'remove') formatted.summary.removed++;
    else if (parsedChange.icon === 'update') formatted.summary.updated++;
  }

  return formatted;
}