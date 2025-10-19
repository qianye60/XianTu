/**
 * 全局调试工具类
 * 根据设置控制调试信息的显示
 */
export class DebugLogger {
  private static instance: DebugLogger;
  private debugMode: boolean = false;
  private consoleDebug: boolean = false;
  private performanceMonitor: boolean = false;

  private constructor() {
    this.loadDebugSettings();
  }

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  /**
   * 从本地存储加载调试设置
   */
  private loadDebugSettings(): void {
    try {
      const settings = localStorage.getItem('dad_game_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        this.debugMode = parsedSettings.debugMode || false;
        this.consoleDebug = parsedSettings.consoleDebug || false;
        this.performanceMonitor = parsedSettings.performanceMonitor || false;
      }
    } catch (error) {
      console.error('加载调试设置失败:', error);
      this.debugMode = false;
      this.consoleDebug = false;
      this.performanceMonitor = false;
    }
  }

  /**
   * 重新加载调试设置
   */
  public reloadSettings(): void {
    this.loadDebugSettings();
  }

  /**
   * 设置调试模式
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.reloadSettings(); // 重新加载所有设置
    if (this.consoleDebug) {
      console.log(`[调试] 调试模式${enabled ? '已启用' : '已禁用'}`);
    }
  }

  /**
   * 获取当前调试模式状态
   */
  public isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * 获取控制台调试状态
   */
  public isConsoleDebugEnabled(): boolean {
    return this.debugMode && this.consoleDebug;
  }

  /**
   * 获取性能监控状态
   */
  public isPerformanceMonitorEnabled(): boolean {
    return this.debugMode && this.performanceMonitor;
  }

  /**
   * 调试日志 - 只有在启用调试模式和控制台调试时才显示
   */
  public log(component: string, message: string, data?: any): void {
    if (this.isConsoleDebugEnabled()) {
      if (data !== undefined) {
        console.log(`[${component}] ${message}`, data);
      } else {
        console.log(`[${component}] ${message}`);
      }
    }
  }

  /**
   * 调试警告 - 只有在启用调试模式和控制台调试时才显示
   */
  public warn(component: string, message: string, data?: any): void {
    if (this.isConsoleDebugEnabled()) {
      if (data !== undefined) {
        console.warn(`[${component}] ${message}`, data);
      } else {
        console.warn(`[${component}] ${message}`);
      }
    }
  }

  /**
   * 调试错误 - 始终显示（错误信息很重要）
   */
  public error(component: string, message: string, error?: any): void {
    if (error !== undefined) {
      console.error(`[${component}] ${message}`, error);
    } else {
      console.error(`[${component}] ${message}`);
    }
  }

  /**
   * 性能测试开始 - 只有启用性能监控时才执行
   */
  public timeStart(label: string): void {
    if (this.isPerformanceMonitorEnabled()) {
      try {
        console.time(`[性能] ${label}`);
      } catch (e) {
        // 静默处理计时器错误
      }
    }
  }

  /**
   * 性能测试结束 - 只有启用性能监控时才执行
   */
  public timeEnd(label: string): void {
    if (this.isPerformanceMonitorEnabled()) {
      try {
        console.timeEnd(`[性能] ${label}`);
      } catch (e) {
        // 静默处理计时器不存在的错误
      }
    }
  }

  /**
   * 分组开始 - 只有在启用控制台调试时才执行
   */
  public group(label: string): void {
    if (this.isConsoleDebugEnabled()) {
      console.group(`[调试] ${label}`);
    }
  }

  /**
   * 结束分组 - 只有在启用控制台调试时才执行
   */
  public groupEnd(): void {
    if (this.isConsoleDebugEnabled()) {
      console.groupEnd();
    }
  }

  /**
   * 信息日志 - 重要信息，在调试模式下始终显示
   */
  public info(component: string, message: string, data?: any): void {
    if (this.debugMode) {
      if (data !== undefined) {
        console.info(`[${component}] ${message}`, data);
      } else {
        console.info(`[${component}] ${message}`);
      }
    }
  }

  /**
   * 表格显示数据 - 只在控制台调试模式下显示
   */
  public table(component: string, label: string, data: any): void {
    if (this.isConsoleDebugEnabled()) {
      console.log(`[${component}] ${label}:`);
      console.table(data);
    }
  }

  /**
   * 统计信息 - 只在性能监控模式下显示
   */
  public count(label: string): void {
    if (this.isPerformanceMonitorEnabled()) {
      console.count(`[统计] ${label}`);
    }
  }

  /**
   * 重置统计 - 只在性能监控模式下执行
   */
  public countReset(label: string): void {
    if (this.isPerformanceMonitorEnabled()) {
      console.countReset(`[统计] ${label}`);
    }
  }
}

// 创建全局实例
export const debugLogger = DebugLogger.getInstance();

// 便捷方法
export const debug = {
  log: (component: string, message: string, data?: any) => debugLogger.log(component, message, data),
  warn: (component: string, message: string, data?: any) => debugLogger.warn(component, message, data),
  error: (component: string, message: string, error?: any) => debugLogger.error(component, message, error),
  info: (component: string, message: string, data?: any) => debugLogger.info(component, message, data),
  timeStart: (label: string) => debugLogger.timeStart(label),
  timeEnd: (label: string) => debugLogger.timeEnd(label),
  group: (label: string) => debugLogger.group(label),
  groupEnd: () => debugLogger.groupEnd(),
  table: (component: string, label: string, data: any) => debugLogger.table(component, label, data),
  count: (label: string) => debugLogger.count(label),
  countReset: (label: string) => debugLogger.countReset(label),
  setMode: (enabled: boolean) => debugLogger.setDebugMode(enabled),
  isEnabled: () => debugLogger.isDebugMode(),
  reload: () => debugLogger.reloadSettings()
};

// 导出一个兼容旧console.log的函数，用于替换项目中现有的console.log
export const consoleLog = (component: string, ...args: any[]) => {
  if (args.length === 1 && typeof args[0] === 'string') {
    debug.log(component, args[0]);
  } else if (args.length >= 2) {
    debug.log(component, args[0], args.slice(1));
  }
};

export const consoleWarn = (component: string, ...args: any[]) => {
  if (args.length === 1 && typeof args[0] === 'string') {
    debug.warn(component, args[0]);
  } else if (args.length >= 2) {
    debug.warn(component, args[0], args.slice(1));
  }
};

export const consoleError = (component: string, ...args: any[]) => {
  if (args.length === 1 && typeof args[0] === 'string') {
    debug.error(component, args[0]);
  } else if (args.length >= 2) {
    debug.error(component, args[0], args.slice(1));
  }
};