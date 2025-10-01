import { defineStore } from 'pinia';

export interface DebugLogEntry {
  timestamp: number;
  category: string;
  message: string;
  data?: unknown;
  level: 'log' | 'warn' | 'error' | 'info';
}

interface DebugLogState {
  logs: DebugLogEntry[];
  maxLogs: number;
  categories: Set<string>;
}

export const useDebugLogStore = defineStore('debugLog', {
  state: (): DebugLogState => ({
    logs: [],
    maxLogs: 1000, // 最多保存1000条日志
    categories: new Set(),
  }),

  getters: {
    // 获取所有日志
    allLogs: (state): DebugLogEntry[] => state.logs,

    // 按类别过滤日志
    logsByCategory: (state) => (category: string): DebugLogEntry[] => {
      return state.logs.filter(log => log.category === category);
    },

    // 获取最近N条日志
    recentLogs: (state) => (count: number = 100): DebugLogEntry[] => {
      return state.logs.slice(-count);
    },

    // 获取所有类别
    allCategories: (state): string[] => Array.from(state.categories),

    // 按级别过滤
    logsByLevel: (state) => (level: 'log' | 'warn' | 'error' | 'info'): DebugLogEntry[] => {
      return state.logs.filter(log => log.level === level);
    },
  },

  actions: {
    // 添加日志
    log(category: string, message: string, data?: unknown) {
      const entry: DebugLogEntry = {
        timestamp: Date.now(),
        category,
        message,
        data,
        level: 'log',
      };

      this.logs.push(entry);
      this.categories.add(category);

      // 限制日志数量
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }

      // 同时输出到控制台
      if (data !== undefined) {
        console.log(`[${category}] ${message}`, data);
      } else {
        console.log(`[${category}] ${message}`);
      }
    },

    warn(category: string, message: string, data?: unknown) {
      const entry: DebugLogEntry = {
        timestamp: Date.now(),
        category,
        message,
        data,
        level: 'warn',
      };

      this.logs.push(entry);
      this.categories.add(category);

      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }

      if (data !== undefined) {
        console.warn(`[${category}] ${message}`, data);
      } else {
        console.warn(`[${category}] ${message}`);
      }
    },

    error(category: string, message: string, data?: unknown) {
      const entry: DebugLogEntry = {
        timestamp: Date.now(),
        category,
        message,
        data,
        level: 'error',
      };

      this.logs.push(entry);
      this.categories.add(category);

      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }

      if (data !== undefined) {
        console.error(`[${category}] ${message}`, data);
      } else {
        console.error(`[${category}] ${message}`);
      }
    },

    info(category: string, message: string, data?: unknown) {
      const entry: DebugLogEntry = {
        timestamp: Date.now(),
        category,
        message,
        data,
        level: 'info',
      };

      this.logs.push(entry);
      this.categories.add(category);

      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }

      if (data !== undefined) {
        console.info(`[${category}] ${message}`, data);
      } else {
        console.info(`[${category}] ${message}`);
      }
    },

    // 清除日志
    clearLogs() {
      this.logs = [];
      this.categories.clear();
    },

    // 清除指定类别的日志
    clearCategory(category: string) {
      this.logs = this.logs.filter(log => log.category !== category);

      // 检查是否还有该类别的日志
      const hasCategory = this.logs.some(log => log.category === category);
      if (!hasCategory) {
        this.categories.delete(category);
      }
    },

    // 导出日志为JSON
    exportLogs() {
      return JSON.stringify(this.logs, null, 2);
    },
  },

  // 持久化配置（可选）
  // persist: {
  //   enabled: false, // 默认不持久化到localStorage，因为日志量可能很大
  // },
});
