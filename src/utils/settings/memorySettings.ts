/**
 * @fileoverview AI记忆管理设置系统
 * 包括记忆长度配置、分层设置、双API支持等
 */

export interface MemoryLengthSettings {
  /** 短期记忆长度设置 */
  shortTerm: {
    enabled: boolean;
    maxLength: number; // 1-10，默认5
    autoConvert: boolean; // 是否自动转换为中期记忆
  };
  
  /** 中期记忆长度设置 */
  midTerm: {
    enabled: boolean;
    maxLength: number; // 10-40，默认20
    autoSummarize: boolean; // 是否自动总结
    summarizeThreshold: number; // 触发总结的阈值
  };
  
  /** 长期记忆设置 */
  longTerm: {
    enabled: boolean;
    unlimited: boolean; // 是否无限制
    maxLength?: number; // 如果不是无限制，最大长度
  };
}

export interface APISettings {
  /** 主API设置（用于正文对话） */
  primaryAPI: {
    type: 'tavern_primary' | 'custom';
    endpoint?: string;
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    enabled: boolean;
  };
  
  /** 副API设置（用于记忆总结、地图更新等后台任务） */
  secondaryAPI: {
    type: 'tavern_secondary' | 'openai' | 'anthropic' | 'local' | 'custom';
    endpoint?: string;
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    enabled: boolean;
    usageScenarios: ('memory_summarize' | 'map_update' | 'npc_status' | 'world_events')[];
  };
  
  /** API冲突处理 */
  conflictResolution: {
    priority: 'primary' | 'secondary' | 'balanced';
    queueManagement: boolean; // 是否排队处理请求
    concurrentLimit: number; // 并发请求限制
    retrySettings: {
      maxRetries: number;
      retryDelay: number; // 毫秒
    };
  };
}

export interface AIMemorySettings {
  memory: MemoryLengthSettings;
  api: APISettings;
  
  /** 高级设置 */
  advanced: {
    memoryCompression: boolean; // 是否压缩旧记忆
    intelligentFiltering: boolean; // 是否智能过滤无用记忆
    contextAwareSummary: boolean; // 是否根据上下文调整总结策略
    priorityMemoryTypes: ('combat' | 'social' | 'cultivation' | 'exploration')[];
  };
}

/** 默认设置 */
export const DEFAULT_MEMORY_SETTINGS: AIMemorySettings = {
  memory: {
    shortTerm: {
      enabled: true,
      maxLength: 5,
      autoConvert: true
    },
    midTerm: {
      enabled: true,
      maxLength: 20,
      autoSummarize: true,
      summarizeThreshold: 18 // 当达到18条时开始总结
    },
    longTerm: {
      enabled: true,
      unlimited: true
    }
  },
  
  api: {
    primaryAPI: {
      type: 'tavern_primary',
      enabled: true,
      maxTokens: 2000,
      temperature: 0.7
    },
    
    secondaryAPI: {
      type: 'openai',
      enabled: false,
      maxTokens: 1000,
      temperature: 0.3,
      usageScenarios: ['memory_summarize', 'map_update']
    },
    
    conflictResolution: {
      priority: 'primary',
      queueManagement: true,
      concurrentLimit: 2,
      retrySettings: {
        maxRetries: 3,
        retryDelay: 1000
      }
    }
  },
  
  advanced: {
    memoryCompression: true,
    intelligentFiltering: true,
    contextAwareSummary: true,
    priorityMemoryTypes: ['cultivation', 'social', 'combat', 'exploration']
  }
};

/** 设置验证器 */
export class MemorySettingsValidator {
  static validateMemorySettings(settings: MemoryLengthSettings): boolean {
    // 验证短期记忆设置
    if (settings.shortTerm.maxLength < 1 || settings.shortTerm.maxLength > 10) {
      throw new Error('短期记忆长度必须在1-10之间');
    }
    
    // 验证中期记忆设置
    if (settings.midTerm.maxLength < 10 || settings.midTerm.maxLength > 40) {
      throw new Error('中期记忆长度必须在10-40之间');
    }
    
    // 验证总结阈值
    if (settings.midTerm.summarizeThreshold >= settings.midTerm.maxLength) {
      throw new Error('总结阈值必须小于中期记忆最大长度');
    }
    
    return true;
  }
  
  static validateAPISettings(settings: APISettings): boolean {
    // 验证至少有一个API启用
    if (!settings.primaryAPI.enabled && !settings.secondaryAPI.enabled) {
      throw new Error('至少需要启用一个API');
    }
    
    // 验证API配置完整性
    if (settings.secondaryAPI.enabled && settings.secondaryAPI.type === 'custom') {
      if (!settings.secondaryAPI.endpoint) {
        throw new Error('自定义API需要提供endpoint');
      }
    }
    
    // 验证并发限制
    if (settings.conflictResolution.concurrentLimit < 1) {
      throw new Error('并发限制至少为1');
    }
    
    return true;
  }
}

/** 设置范围定义 */
export const SETTINGS_RANGES = {
  shortTermMemory: {
    min: 1,
    max: 10,
    default: 5,
    step: 1
  },
  midTermMemory: {
    min: 10,
    max: 40,
    default: 20,
    step: 1
  },
  longTermMemory: {
    min: 50,
    max: 1000,
    default: 200,
    step: 10
  },
  concurrentLimit: {
    min: 1,
    max: 5,
    default: 2,
    step: 1
  },
  retryCount: {
    min: 1,
    max: 10,
    default: 3,
    step: 1
  }
} as const;

/** API类型配置 */
export const API_TYPE_CONFIGS = {
  tavern_primary: {
    name: 'SillyTavern 主API',
    description: '使用SillyTavern的主要API配置',
    requiresConfig: false
  },
  tavern_secondary: {
    name: 'SillyTavern 副API',
    description: '使用SillyTavern的次要API配置',
    requiresConfig: false
  },
  openai: {
    name: 'OpenAI API',
    description: 'OpenAI GPT模型API',
    requiresConfig: true,
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions'
  },
  anthropic: {
    name: 'Anthropic Claude',
    description: 'Anthropic Claude模型API',
    requiresConfig: true,
    defaultEndpoint: 'https://api.anthropic.com/v1/messages'
  },
  local: {
    name: '本地API',
    description: '本地部署的AI模型',
    requiresConfig: true,
    defaultEndpoint: 'http://localhost:5000/v1/chat/completions'
  },
  custom: {
    name: '自定义API',
    description: '自定义配置的API端点',
    requiresConfig: true
  }
} as const;