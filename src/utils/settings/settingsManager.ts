/**
 * @fileoverview 设置存储管理器 - 处理设置的持久化存储
 */

import type { AIMemorySettings } from './memorySettings';
import { DEFAULT_MEMORY_SETTINGS, MemorySettingsValidator } from './memorySettings';
import { toast } from '../toast';

/**
 * 设置键名常量
 */
const SETTINGS_KEYS = {
  MEMORY_SETTINGS: 'ai_memory_settings',
  USER_PREFERENCES: 'user_preferences',
  API_CREDENTIALS: 'api_credentials' // 敏感信息单独存储
} as const;

/**
 * 设置存储管理器
 */
export class SettingsManager {
  private static instance: SettingsManager;
  private memorySettings: AIMemorySettings;
  private listeners: Map<string, ((settings: AIMemorySettings) => void)[]> = new Map();

  private constructor() {
    this.memorySettings = this.loadSettings();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * 获取当前设置
   */
  getSettings(): AIMemorySettings {
    return { ...this.memorySettings };
  }

  /**
   * 更新设置
   */
  async updateSettings(newSettings: Partial<AIMemorySettings>): Promise<void> {
    try {
      // 合并设置
      const updatedSettings = this.deepMerge(this.memorySettings, newSettings);
      
      // 验证设置
      if (updatedSettings.memory) {
        MemorySettingsValidator.validateMemorySettings(updatedSettings.memory);
      }
      if (updatedSettings.api) {
        MemorySettingsValidator.validateAPISettings(updatedSettings.api);
      }
      
      // 保存设置
      this.memorySettings = updatedSettings;
      await this.saveSettings();
      
      // 通知监听器
      this.notifyListeners('settings_updated', this.memorySettings);
      
      toast.success('设置已保存');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[设置管理] 更新设置失败:', error);
      toast.error(`设置保存失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 重置为默认设置
   */
  async resetToDefault(): Promise<void> {
    try {
      this.memorySettings = { ...DEFAULT_MEMORY_SETTINGS };
      await this.saveSettings();
      this.notifyListeners('settings_reset', this.memorySettings);
      toast.success('设置已重置为默认值');
    } catch (error: unknown) {
      console.error('[设置管理] 重置设置失败:', error);
      toast.error('重置设置失败');
    }
  }

  /**
   * 导出设置
   */
  exportSettings(): string {
    const exportData = {
      version: '1.0.0',
      timestamp: Date.now(),
      settings: this.memorySettings
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导入设置
   */
  async importSettings(data: string): Promise<void> {
    try {
      const imported = JSON.parse(data);
      
      if (!imported.settings) {
        throw new Error('无效的设置文件格式');
      }
      
      // 版本兼容性检查
      if (imported.version && imported.version !== '1.0.0') {
        console.warn('[设置管理] 设置文件版本不匹配，尝试兼容性导入');
      }
      
      await this.updateSettings(imported.settings);
      toast.success('设置导入成功');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[设置管理] 导入设置失败:', error);
      toast.error(`设置导入失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 监听设置变化
   */
  onSettingsChange(event: string, callback: (settings: AIMemorySettings) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)!.push(callback);
    
    // 返回取消监听的函数
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 获取API凭据（单独处理敏感信息）
   */
  getAPICredentials(): { openaiKey?: string; anthropicKey?: string; customConfigs?: Record<string, unknown> } {
    try {
      const stored = localStorage.getItem(SETTINGS_KEYS.API_CREDENTIALS);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[设置管理] 获取API凭据失败:', error);
      return {};
    }
  }

  /**
   * 设置API凭据
   */
  async setAPICredentials(credentials: {
    openaiKey?: string;
    anthropicKey?: string;
    customConfigs?: Record<string, unknown>;
  }): Promise<void> {
    try {
      // 过滤空值
      const filtered = Object.fromEntries(
        Object.entries(credentials).filter(([_, value]) => value != null && value !== '')
      );
      
      localStorage.setItem(SETTINGS_KEYS.API_CREDENTIALS, JSON.stringify(filtered));
      
      // 更新内存中的设置
      if (filtered.openaiKey && this.memorySettings.api.secondaryAPI.type === 'openai') {
        this.memorySettings.api.secondaryAPI.apiKey = filtered.openaiKey as string;
      }
      if (filtered.anthropicKey && this.memorySettings.api.secondaryAPI.type === 'anthropic') {
        this.memorySettings.api.secondaryAPI.apiKey = filtered.anthropicKey as string;
      }
      
      this.notifyListeners('credentials_updated', this.memorySettings);
      toast.success('API凭据已保存');
      
    } catch (error: unknown) {
      console.error('[设置管理] 保存API凭据失败:', error);
      toast.error('保存API凭据失败');
      throw error;
    }
  }

  /**
   * 检查设置完整性
   */
  validateSettings(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      MemorySettingsValidator.validateMemorySettings(this.memorySettings.memory);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      errors.push(`记忆设置错误: ${errorMessage}`);
    }
    
    try {
      MemorySettingsValidator.validateAPISettings(this.memorySettings.api);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      errors.push(`API设置错误: ${errorMessage}`);
    }
    
    // 检查API密钥
    const credentials = this.getAPICredentials();
    if (this.memorySettings.api.secondaryAPI.enabled) {
      const type = this.memorySettings.api.secondaryAPI.type;
      if (type === 'openai' && !credentials.openaiKey) {
        errors.push('OpenAI API密钥未配置');
      }
      if (type === 'anthropic' && !credentials.anthropicKey) {
        errors.push('Anthropic API密钥未配置');
      }
      if (type === 'custom' && !this.memorySettings.api.secondaryAPI.endpoint) {
        errors.push('自定义API端点未配置');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取设置摘要（用于显示）
   */
  getSettingsSummary(): {
    memoryLevels: { short: number; mid: number; long: string };
    apiStatus: { primary: boolean; secondary: boolean; type: string };
    features: { autoConvert: boolean; autoSummarize: boolean; intelligent: boolean };
  } {
    const { memory, api, advanced } = this.memorySettings;
    
    return {
      memoryLevels: {
        short: memory.shortTerm.maxLength,
        mid: memory.midTerm.maxLength,
        long: memory.longTerm.unlimited ? '无限' : (memory.longTerm.maxLength?.toString() || '未设置')
      },
      apiStatus: {
        primary: api.primaryAPI.enabled,
        secondary: api.secondaryAPI.enabled,
        type: api.secondaryAPI.type
      },
      features: {
        autoConvert: memory.shortTerm.autoConvert,
        autoSummarize: memory.midTerm.autoSummarize,
        intelligent: advanced.intelligentFiltering
      }
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 加载设置
   */
  private loadSettings(): AIMemorySettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEYS.MEMORY_SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 合并默认设置和存储的设置，确保所有字段都存在
        const merged = this.deepMerge(DEFAULT_MEMORY_SETTINGS, parsed);
        
        // 加载API凭据
        const credentials = this.getAPICredentials();
        if (credentials.openaiKey && merged.api.secondaryAPI.type === 'openai') {
          merged.api.secondaryAPI.apiKey = credentials.openaiKey as string;
        }
        if (credentials.anthropicKey && merged.api.secondaryAPI.type === 'anthropic') {
          merged.api.secondaryAPI.apiKey = credentials.anthropicKey as string;
        }
        
        return merged;
      }
    } catch (error) {
      console.error('[设置管理] 加载设置失败，使用默认设置:', error);
    }
    
    return { ...DEFAULT_MEMORY_SETTINGS };
  }

  /**
   * 保存设置
   */
  private async saveSettings(): Promise<void> {
    try {
      // 创建副本并移除敏感信息
      const toSave = { ...this.memorySettings };
      if (toSave.api.secondaryAPI.apiKey) {
        toSave.api.secondaryAPI.apiKey = undefined;
      }
      if (toSave.api.primaryAPI.apiKey) {
        toSave.api.primaryAPI.apiKey = undefined;
      }
      
      localStorage.setItem(SETTINGS_KEYS.MEMORY_SETTINGS, JSON.stringify(toSave, null, 2));
    } catch (error) {
      console.error('[设置管理] 保存设置失败:', error);
      throw new Error('无法保存设置到本地存储');
    }
  }

  /**
   * 深度合并对象
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== undefined) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] as never, source[key] as never);
        } else {
          result[key] = source[key] as never;
        }
      }
    }
    
    return result;
  }

  /**
   * 通知监听器
   */
  private notifyListeners(event: string, settings: AIMemorySettings): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(settings);
        } catch (error) {
          console.error(`[设置管理] 监听器回调失败 (${event}):`, error);
        }
      });
    }
  }
}