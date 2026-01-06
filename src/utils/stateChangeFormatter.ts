/**
 * @fileoverview 状态变更日志格式化工具
 * 将原始的 StateChangeLog 对象转换为人类可读的、具有游戏语义的格式。
 */

import type { StateChangeLog, StateChange, Item } from '@/types/game';
import { get, isObject, isArray } from 'lodash';

// --- 核心数据结构 ---

/** 格式化后的单条变更项 */
export interface FormattedChange {
  icon: 'add' | 'remove' | 'update' | 'info' | 'error'; // 用于UI显示的图标类型
  color: 'green' | 'red' | 'blue' | 'gray' | 'orange'; // 用于UI显示的颜色
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
    errors: number;
  };
  changes: FormattedChange[];
}

// --- 辅助函数 ---

function getItemName(item: Item | Record<string, any>): string {
  if (!isObject(item)) return '未知物品';
  return (item as any).名称 || (item as any).name || '无名物品';
}

function getQuantity(item: Item | Record<string, any>): number {
  if (!isObject(item)) return 1;
  return (item as any).数量 || 1;
}

// --- 解析器模块 ---

/**
 * 解析物品变更
 * V3：角色.背包.物品
 * @param change - 单条变更记录
 * @returns FormattedChange | null
 */
function parseItemChange(change: StateChange): FormattedChange | null {
  const { key, action, oldValue, newValue } = change;

  const isInventoryItem = key.includes('角色.背包.物品');

  if (isInventoryItem) {
    if (action === 'set' && newValue && !oldValue) {
      // 新增物品（从无到有）
      const item = newValue as any;
      return {
        icon: 'add',
        color: 'green',
        title: '获得物品',
        description: `【${getItemName(item)}】x ${getQuantity(item)}`,
      };
    }
    if (action === 'push') {
      // 新增物品（push操作）
      const item = newValue as any;
      return {
        icon: 'add',
        color: 'green',
        title: '获得物品',
        description: `【${getItemName(item)}】x ${getQuantity(item)}`,
      };
    }
    if (action === 'delete' || action === 'pull' || (action === 'set' && !newValue && oldValue)) {
      // 删除物品
      const item = oldValue as any;
      return {
        icon: 'remove',
        color: 'red',
        title: '失去物品',
        description: `【${getItemName(item)}】x ${getQuantity(item)}`,
      };
    }
    if (action === 'set' && oldValue && newValue) {
      // 物品数量变更
      const oldQty = getQuantity(oldValue);
      const newQty = getQuantity(newValue);
      if (oldQty !== newQty) {
        const diff = newQty - oldQty;
        return {
          icon: diff > 0 ? 'add' : 'remove',
          color: diff > 0 ? 'green' : 'red',
          title: diff > 0 ? '获得物品' : '消耗物品',
          description: `【${getItemName(newValue)}】${diff > 0 ? '+' : ''}${diff}`,
        };
      }
    }
  }

  // 灵石（V3：角色.背包.灵石.下品/中品/上品/极品）
  if (key.startsWith('角色.背包.灵石.') || key.includes('.背包.灵石.')) {
    const stoneType = key.split('.').pop() || '灵石';
    const oldNum = typeof oldValue === 'number' ? oldValue : 0;
    const newNum = typeof newValue === 'number' ? newValue : 0;
    const diff = newNum - oldNum;

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
 * V3：角色.属性 / 角色.位置
 * @param change - 单条变更记录
 * @returns FormattedChange | null
 */
function parsePlayerStatusChange(change: StateChange): FormattedChange | null {
  const { key, action, oldValue, newValue } = change;

  const isPlayerStatus =
    key.startsWith('角色.属性.') ||
    key.startsWith('角色.位置.') ||
    key.includes('.角色.属性.') ||
    key.includes('.角色.位置.') ||
    key.includes('.气血') ||
    key.includes('.灵气') ||
    key.includes('.神识') ||
    key.includes('.寿命');

  if (!isPlayerStatus) return null;

  const attributeName = key.split('.').pop() || '属性';

  // 境界突破
  if (key === '角色.属性.境界.名称' || key.endsWith('.境界.名称')) {
    return {
      icon: 'add',
      color: 'green',
      title: '境界突破',
      description: `${oldValue || '凡人'} → ${newValue}`,
    };
  }

  if (key === '角色.属性.境界.阶段' || key.endsWith('.境界.阶段')) {
    return {
      icon: 'update',
      color: 'blue',
      title: '境界阶段提升',
      description: `${oldValue || '无'} → ${newValue}`,
    };
  }

  // 位置变更
  if (key === '角色.位置.描述' || key.endsWith('.位置.描述')) {
    // 提取描述字符串（处理对象和字符串两种情况）
    const extractLocation = (val: unknown): string => {
      if (!val) return '未知';
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val !== null) {
        const obj = val as Record<string, unknown>;
        if (typeof obj.描述 === 'string') return obj.描述;
        if (typeof obj.description === 'string') return obj.description;
      }
      return String(val);
    };

    return {
      icon: 'update',
      color: 'blue',
      title: '位置变更',
      description: `${extractLocation(oldValue)} → ${extractLocation(newValue)}`,
    };
  }

  // 🔥 修复：识别"上限"和"当前"的单独变更
  // 路径格式: 角色.属性.气血.上限 / 角色.属性.气血.当前（以及其它属性同理）
  const pathParts = key.split('.');
  const fieldType = pathParts[pathParts.length - 1]; // "上限"/"当前"/"最大"
  const attributeBaseName = pathParts[pathParts.length - 2] || attributeName; // "气血"/"灵气"/"神识"

  if ((fieldType === '上限' || fieldType === '最大') && typeof newValue === 'number') {
    const diff = typeof oldValue === 'number' ? newValue - oldValue : newValue;
    let description = '';
    if (typeof oldValue === 'number') {
      description = `${oldValue} -> ${newValue}`;
      if (diff > 0) description += ` (+${diff})`;
    } else {
      description = `设为 ${newValue}`;
    }
    return {
      icon: 'update',
      color: 'blue',
      title: `${attributeBaseName}上限变化`,
      description,
    };
  }

  if (fieldType === '当前' && typeof newValue === 'number') {
    const diff = typeof oldValue === 'number' ? newValue - oldValue : newValue;
    let description = '';
    if (typeof oldValue === 'number') {
      description = `${oldValue} -> ${newValue}`;
      if (diff > 0) description += ` (+${diff})`;
      if (diff < 0) description += ` (${diff})`;
    } else {
      description = `设为 ${newValue}`;
    }
    return {
      icon: 'update',
      color: 'blue',
      title: `${attributeBaseName}当前值变化`,
      description,
    };
  }

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
 * 解析NPC关系变更
 * V3：社交.关系
 * @param change - 单条变更记录
 * @returns FormattedChange | null
 */
function parseRelationshipChange(change: StateChange): FormattedChange | null {
  const { key, action, oldValue, newValue } = change;

  if (key.startsWith('社交.关系.') || key.includes('.社交.关系.')) {
    const parts = key.split('.');
    const npcName = parts[2] || '某人'; // 社交.关系.云裳仙子.好感度 -> 云裳仙子
    const field = parts[parts.length - 1]; // 好感度

    // 好感度变化
    if (field === '好感度' && typeof oldValue === 'number' && typeof newValue === 'number') {
      const diff = newValue - oldValue;
      return {
        icon: diff > 0 ? 'add' : 'remove',
        color: diff > 0 ? 'green' : 'red',
        title: `【${npcName}】好感度变化`,
        description: `${oldValue} → ${newValue} (${diff > 0 ? '+' : ''}${diff})`,
      };
    }

    // 人物记忆新增
    if (field === '人物记忆' && action === 'push') {
      return {
        icon: 'add',
        color: 'blue',
        title: `【${npcName}】记忆更新`,
        description: `新增了关于你的记忆`,
      };
    }

    // 关系状态变化
    if (field === '关系状态') {
      return {
        icon: 'update',
        color: 'blue',
        title: `【${npcName}】关系变化`,
        description: `${oldValue || '初识'} → ${newValue}`,
      };
    }

    // 通用关系属性变更，处理深层嵌套路径
    const subPathParts = parts.slice(2);
    if (subPathParts.length > 0) {
      const subPath = subPathParts.join('.');
      // 将 a.b.0.c 格式化为 a.b[0].c，支持数字索引
      const readablePath = subPath.replace(/\.([0-9]+)(?=\.|$)/g, '[$1]');

      let description = `'${readablePath}' 已更新`;
      // 对于简单值的变更，直接在描述中显示
      if (
        (typeof newValue !== 'object' || newValue === null) &&
        (typeof oldValue !== 'object' || oldValue === null)
      ) {
        description = `'${readablePath}' 从 ${JSON.stringify(oldValue)} 变为 ${JSON.stringify(newValue)}`;
      }

      return {
        icon: 'update',
        color: 'blue',
        title: `【${npcName}】信息更新`,
        description: description,
      };
    }
  }

  return null;
}

/**
 * 解析验证错误
 * @param change - 单条变更记录
 * @returns FormattedChange | null
 */
function parseValidationError(change: StateChange): FormattedChange | null {
  const { key, action, newValue } = change;

  // 检查是否是验证错误（支持两种key格式）
  if (action === 'validation_error' && (key === '❌ 错误指令' || key === '❌ 格式错误（已拒绝）')) {
    const errorData = newValue as any;
    const errors = errorData?.errors || [];
    const command = errorData?.command || '未知指令';

    return {
      icon: 'error',
      color: 'red',
      title: '❌ AI指令格式错误',
      description: `以下指令验证失败，未被执行`,
      details: [
        `指令内容:\n${command}`,
        `\n错误原因:`,
        ...errors.map((err: string) => `  • ${err}`)
      ]
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
      errors: 0,
    },
    changes: [],
  };

  if (!log || !isArray(log.changes)) {
    return formatted;
  }

  for (const change of log.changes) {
    let parsedChange: FormattedChange | null = null;

    // 按优先级尝试不同的解析器
    // 🔥 优先检查验证错误
    parsedChange = parseValidationError(change);
    if (!parsedChange) {
      parsedChange = parseItemChange(change);
    }
    if (!parsedChange) {
      parsedChange = parsePlayerStatusChange(change);
    }
    if (!parsedChange) {
      parsedChange = parseRelationshipChange(change);
    }
    // ... 可以继续添加更多专用解析器（大道、技能等）

    // 如果所有特殊解析器都失败了，使用通用解析器
    if (!parsedChange) {
      parsedChange = parseGenericChange(change);
    }

    formatted.changes.push(parsedChange);

    // 更新统计信息
    if (parsedChange.icon === 'add') formatted.summary.added++;
    else if (parsedChange.icon === 'remove') formatted.summary.removed++;
    else if (parsedChange.icon === 'update') formatted.summary.updated++;
    else if (parsedChange.icon === 'error') formatted.summary.errors++;
  }

  return formatted;
}
