/**
 * 全局Console补丁
 *
 * 功能:
 * - 根据调试模式控制console输出
 * - 非调试模式下隐藏log/warn/info等输出
 * - error级别始终显示
 *
 * 被以下文件引用:
 * - src/main.ts (全局初始化)
 */

import { debugLogger } from '@/utils/debug';

type ConsoleMethod = (...args: any[]) => void;

const original = {
  log: console.log.bind(console) as ConsoleMethod,
  warn: console.warn.bind(console) as ConsoleMethod,
  info: console.info.bind(console) as ConsoleMethod,
  debug: (console as any).debug ? (console as any).debug.bind(console) as ConsoleMethod : undefined,
  table: console.table ? console.table.bind(console) as ConsoleMethod : undefined,
  group: console.group ? console.group.bind(console) as ConsoleMethod : undefined,
  groupCollapsed: (console as any).groupCollapsed ? (console as any).groupCollapsed.bind(console) as ConsoleMethod : undefined,
  groupEnd: console.groupEnd ? console.groupEnd.bind(console) as ConsoleMethod : undefined,
  error: console.error.bind(console) as ConsoleMethod,
};

// Helper guards
const canConsoleDebug = () => debugLogger.isConsoleDebugEnabled();
const isDebugMode = () => debugLogger.isDebugMode();

// Patch non-error outputs
console.log = ((...args: any[]) => {
  if (canConsoleDebug()) original.log(...args);
}) as ConsoleMethod;

console.warn = ((...args: any[]) => {
  if (canConsoleDebug()) original.warn(...args);
}) as ConsoleMethod;

console.info = ((...args: any[]) => {
  if (isDebugMode()) original.info(...args);
}) as ConsoleMethod;

if (original.debug) {
  (console as any).debug = ((...args: any[]) => {
    if (canConsoleDebug()) (original.debug as ConsoleMethod)(...args);
  }) as ConsoleMethod;
}

if (original.table) {
  console.table = ((...args: any[]) => {
    if (canConsoleDebug()) (original.table as ConsoleMethod)(...args);
  }) as ConsoleMethod;
}

if (original.group) {
  console.group = ((...args: any[]) => {
    if (canConsoleDebug()) (original.group as ConsoleMethod)(...args);
  }) as ConsoleMethod;
}

if (original.groupCollapsed) {
  (console as any).groupCollapsed = ((...args: any[]) => {
    if (canConsoleDebug()) (original.groupCollapsed as ConsoleMethod)(...args);
  }) as ConsoleMethod;
}

if (original.groupEnd) {
  console.groupEnd = ((...args: any[]) => {
    if (canConsoleDebug()) (original.groupEnd as ConsoleMethod)(...args);
  }) as ConsoleMethod;
}

// Keep console.error always visible to avoid hiding real errors.
// Do NOT patch console.error.

