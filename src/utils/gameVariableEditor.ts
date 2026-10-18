import { get, has } from 'lodash';

export type VariableEditMode = 'normal' | 'advanced' | 'developer';

const ROOTS = new Set(['角色', '社交', '世界', '系统']);
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const PROTECTED_PREFIXES = [
  '元数据',
  '系统.联机',
  '系统.存档',
  '系统.历史',
  '系统.图廊',
];

export function describeVariablePath(path: string): string {
  if (path.startsWith('角色.')) return '角色状态';
  if (path.startsWith('社交.')) return '人物关系与记忆';
  if (path.startsWith('世界.')) return '世界和宗门';
  if (path.startsWith('系统.')) return '系统数据';
  return '存档数据';
}

export function validateVariableEdit(
  saveData: unknown,
  path: string,
  value: unknown,
  mode: VariableEditMode,
): string | null {
  const segments = path.split('.');
  if (segments.length < 2 || segments.some((part) => !part || FORBIDDEN_SEGMENTS.has(part))) {
    return '变量路径无效';
  }
  if (!ROOTS.has(segments[0]) || PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}.`))) {
    return '该字段属于存档元数据或系统保护字段，不能直接修改';
  }
  if (!has(saveData, path)) return '字段不存在，无法直接新建存档结构';
  const previous = get(saveData, path);
  if (previous === null || previous === undefined) return mode === 'developer' ? null : '空值字段仅可在开发者模式编辑';
  if (Array.isArray(previous) !== Array.isArray(value)) return '新旧值类型不一致';
  if (Array.isArray(previous)) {
    if (mode !== 'developer') return '数组仅可在开发者模式编辑';
    return null;
  }
  if (typeof previous !== typeof value) return '新旧值类型不一致';
  if (typeof previous === 'object') {
    return mode === 'developer' ? null : mode === 'advanced' ? null : '对象仅可在高级或开发者模式编辑';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '数字必须为有限值';
    if (/(数量|贡献|声望|当前经验|总经验|当前阶段|突破经验|上限|当前)$/.test(path) && value < 0) {
      return '该数值不能小于零';
    }
  }
  if (typeof value === 'string' && value.length > 20000) return '文本不能超过 20000 字';
  return null;
}
