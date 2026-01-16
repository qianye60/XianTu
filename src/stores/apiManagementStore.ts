/**
 * API管理Store - 支持多个API配置
 *
 * 双模式架构：
 * - 酒馆端（Tavern）：主API（main）永远通过酒馆TavernHelper调用，辅助功能可配置独立API
 * - 网页端（Web）：所有功能都通过配置的自定义API调用
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { APIProvider } from '@/services/aiService';

export interface APIConfig {
  id: string;
  name: string;
  provider: APIProvider;
  url: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

export type APIUsageType =
  | 'main'  // 主游戏流程
  | 'memory_summary'  // 记忆总结（包括NPC记忆）
  | 'embedding'  // 向量/语义检索用 Embedding
  | 'text_optimization'  // 文本优化
  | 'cot'  // 思维链
  | 'instruction_generation'  // 指令生成
  | 'world_generation'  // 世界生成
  | 'event_generation'  // 世界事件生成（随机事件/世界变革等）
  | 'sect_generation';  // 宗门内容生成（藏经阁、贡献商店等）

/**
 * 辅助功能的生成模式（仅酒馆端可选）
 * - raw: 仅使用提示词和必要上下文，不包含完整角色卡和聊天历史
 * - standard: 包含完整角色卡、聊天历史和游戏状态
 */
export type GenerationMode = 'raw' | 'standard';

export interface FunctionModeConfig {
  type: APIUsageType;
  mode: GenerationMode;  // 仅酒馆端有效，网页端强制raw
}

/**
 * 功能启用状态配置
 * 用于控制某些可选功能是否启用（如文本优化、记忆总结等）
 */
export interface FunctionEnabledConfig {
  type: APIUsageType;
  enabled: boolean;
}

export interface APIAssignment {
  type: APIUsageType;
  apiId: string;  // 对应API配置的ID
}

/**
 * 运行模式
 * - tavern: 酒馆端，主API通过TavernHelper，辅助功能可用独立API
 * - web: 网页端，所有功能都通过自定义API
 */
export type RunMode = 'tavern' | 'web';

export const useAPIManagementStore = defineStore('apiManagement', () => {
  const DEFAULT_API_ASSIGNMENTS: APIAssignment[] = [
    { type: 'main', apiId: 'default' },
    { type: 'memory_summary', apiId: 'default' },
    { type: 'embedding', apiId: 'default' },
    { type: 'text_optimization', apiId: 'default' },
    { type: 'cot', apiId: 'default' },
    { type: 'instruction_generation', apiId: 'default' },
    { type: 'world_generation', apiId: 'default' },
    { type: 'event_generation', apiId: 'default' },
    { type: 'sect_generation', apiId: 'default' }
  ];

  const DEFAULT_FUNCTION_MODES: FunctionModeConfig[] = [
    { type: 'memory_summary', mode: 'raw' },
    { type: 'text_optimization', mode: 'raw' },
    { type: 'world_generation', mode: 'raw' },
    { type: 'event_generation', mode: 'raw' },
    { type: 'sect_generation', mode: 'raw' }
  ];

  // 默认功能启用状态（可选功能默认关闭，核心功能默认开启）
  const DEFAULT_FUNCTION_ENABLED: FunctionEnabledConfig[] = [
    { type: 'memory_summary', enabled: true },
    { type: 'text_optimization', enabled: false },
    { type: 'world_generation', enabled: true },
    { type: 'event_generation', enabled: true },
    { type: 'sect_generation', enabled: true },
    { type: 'cot', enabled: false },  // 思维链默认关闭
  ];

  // API配置列表
  const apiConfigs = ref<APIConfig[]>([]);

  // API分配：不同功能使用哪个API
  const apiAssignments = ref<APIAssignment[]>([...DEFAULT_API_ASSIGNMENTS]);

  // 功能模式配置：辅助功能使用raw还是standard模式（仅酒馆端有效）
  const functionModes = ref<FunctionModeConfig[]>([...DEFAULT_FUNCTION_MODES]);

  // 功能启用状态配置
  const functionEnabled = ref<FunctionEnabledConfig[]>([...DEFAULT_FUNCTION_ENABLED]);

  // AI生成设置
  const aiGenerationSettings = ref({
    enableSystemCoT: false, // 是否启用系统思维链
    splitStep2Streaming: false, // 分步生成第2步是否使用流式传输（默认关闭）
  });

  // 计算属性：获取所有已启用的API
  const enabledAPIs = computed(() => {
    return apiConfigs.value.filter(api => api.enabled);
  });

  // 计算属性：判断是否需要自动启用分步生成
  // 如果 cot、main、instruction_generation 任一分配了独立API且启用，则自动启用分步生成
  const shouldEnableSplitGeneration = computed(() => {
    const cotAssignment = apiAssignments.value.find(a => a.type === 'cot');
    const mainAssignment = apiAssignments.value.find(a => a.type === 'main');
    const instructionAssignment = apiAssignments.value.find(a => a.type === 'instruction_generation');

    return (
      (cotAssignment?.apiId && cotAssignment.apiId !== 'default') ||
      (mainAssignment?.apiId && mainAssignment.apiId !== 'default') ||
      (instructionAssignment?.apiId && instructionAssignment.apiId !== 'default')
    );
  });

  // 初始化：从localStorage加载
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('api_management_config');
      if (saved) {
        const data = JSON.parse(saved);

        // 加载AI生成设置
        if (data.aiGenerationSettings) {
          aiGenerationSettings.value = {
            ...aiGenerationSettings.value,
            ...data.aiGenerationSettings
          };
        }
        apiConfigs.value = data.apiConfigs || [];

        const knownTypes = new Set(DEFAULT_API_ASSIGNMENTS.map(a => a.type));
        const mergedAssignments = new Map<APIUsageType, APIAssignment>();
        DEFAULT_API_ASSIGNMENTS.forEach(a => mergedAssignments.set(a.type, { ...a }));

        const savedAssignments = Array.isArray(data.apiAssignments) ? data.apiAssignments : [];
        for (const a of savedAssignments) {
          const type = a?.type as APIUsageType;
          const apiId = typeof a?.apiId === 'string' ? a.apiId : 'default';
          if (!type || !knownTypes.has(type)) continue;
          mergedAssignments.set(type, { type, apiId });
        }

        // 如果保存的apiId不存在，回退default
        const existingApiIds = new Set((apiConfigs.value || []).map((c: any) => c?.id).filter(Boolean));
        const normalizedAssignments = DEFAULT_API_ASSIGNMENTS.map(a => {
          const current = mergedAssignments.get(a.type) || a;
          const apiId = existingApiIds.has(current.apiId) ? current.apiId : 'default';
          return { type: a.type, apiId };
        });
        apiAssignments.value = normalizedAssignments;

        const knownModeTypes = new Set(DEFAULT_FUNCTION_MODES.map(m => m.type));
        const mergedModes = new Map<APIUsageType, FunctionModeConfig>();
        DEFAULT_FUNCTION_MODES.forEach(m => mergedModes.set(m.type, { ...m }));

        const savedModes = Array.isArray(data.functionModes) ? data.functionModes : [];
        for (const m of savedModes) {
          const type = m?.type as APIUsageType;
          const mode = m?.mode === 'standard' ? 'standard' : 'raw';
          if (!type || !knownModeTypes.has(type)) continue;
          mergedModes.set(type, { type, mode });
        }
        functionModes.value = DEFAULT_FUNCTION_MODES.map(m => mergedModes.get(m.type) || m);

        // 加载功能启用状态
        const knownEnabledTypes = new Set(DEFAULT_FUNCTION_ENABLED.map(e => e.type));
        const mergedEnabled = new Map<APIUsageType, FunctionEnabledConfig>();
        DEFAULT_FUNCTION_ENABLED.forEach(e => mergedEnabled.set(e.type, { ...e }));

        const savedEnabled = Array.isArray(data.functionEnabled) ? data.functionEnabled : [];
        for (const e of savedEnabled) {
          const type = e?.type as APIUsageType;
          const enabled = e?.enabled === true;
          if (!type || !knownEnabledTypes.has(type)) continue;
          mergedEnabled.set(type, { type, enabled });
        }
        functionEnabled.value = DEFAULT_FUNCTION_ENABLED.map(e => mergedEnabled.get(e.type) || e);

        // 清理旧版本/非法配置（如未知 type：npc_generation），并补齐新功能的默认项（如 embedding）
        // 这里直接回写一次，避免下次加载又出现脏数据
        saveToStorage();
      }

      // 如果没有配置，添加默认配置
      if (apiConfigs.value.length === 0) {
        apiConfigs.value.push({
          id: 'default',
          name: '默认API',
          provider: 'openai',
          url: 'https://api.openai.com',
          apiKey: '',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 16000,
          enabled: true
        });
      }
    } catch (error) {
      console.error('[API管理] 加载配置失败:', error);
    }
  };

  // 保存到localStorage
  const saveToStorage = () => {
    try {
      const data = {
        apiConfigs: apiConfigs.value,
        apiAssignments: apiAssignments.value,
        functionModes: functionModes.value,
        functionEnabled: functionEnabled.value,
        aiGenerationSettings: aiGenerationSettings.value
      };
      localStorage.setItem('api_management_config', JSON.stringify(data));
    } catch (error) {
      console.error('[API管理] 保存配置失败:', error);
    }
  };

  // 添加API配置
  const addAPI = (config: Omit<APIConfig, 'id'>) => {
    const newAPI: APIConfig = {
      ...config,
      id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    apiConfigs.value.push(newAPI);
    saveToStorage();
    return newAPI.id;
  };

  // 更新API配置
  const updateAPI = (id: string, updates: Partial<APIConfig>) => {
    const index = apiConfigs.value.findIndex(api => api.id === id);
    if (index !== -1) {
      apiConfigs.value[index] = { ...apiConfigs.value[index], ...updates };
      saveToStorage();
    }
  };

  // 删除API配置
  const deleteAPI = (id: string) => {
    // 不能删除默认API
    if (id === 'default') {
      throw new Error('不能删除默认API配置');
    }

    // 如果有功能使用了这个API，将它们改回默认API
    apiAssignments.value.forEach(assignment => {
      if (assignment.apiId === id) {
        assignment.apiId = 'default';
      }
    });

    apiConfigs.value = apiConfigs.value.filter(api => api.id !== id);
    saveToStorage();
  };

  // 设置功能使用的API
  const assignAPI = (type: APIUsageType, apiId: string) => {
    const assignment = apiAssignments.value.find(a => a.type === type);
    if (assignment) {
      assignment.apiId = apiId;
    } else {
      apiAssignments.value.push({ type, apiId });
    }
    saveToStorage();
  };

  // 获取功能使用的API配置
  const getAPIForType = (type: APIUsageType): APIConfig | null => {
    const assignment = apiAssignments.value.find(a => a.type === type);
    if (!assignment) return null;

    const api = apiConfigs.value.find(a => a.id === assignment.apiId && a.enabled);
    if (!api) {
      // 如果找不到或未启用，返回默认API
      return apiConfigs.value.find(a => a.id === 'default') || null;
    }

    return api;
  };

  // 切换API启用状态
  const toggleAPI = (id: string) => {
    const api = apiConfigs.value.find(a => a.id === id);
    if (api) {
      api.enabled = !api.enabled;
      saveToStorage();
    }
  };

  // 设置功能的生成模式（仅酒馆端有效）
  const setFunctionMode = (type: APIUsageType, mode: GenerationMode) => {
    const config = functionModes.value.find(c => c.type === type);
    if (config) {
      config.mode = mode;
    } else {
      functionModes.value.push({ type, mode });
    }
    saveToStorage();
  };

  // 获取功能的生成模式
  const getFunctionMode = (type: APIUsageType): GenerationMode => {
    const config = functionModes.value.find(c => c.type === type);
    return config?.mode || 'raw';
  };

  // 设置功能的启用状态
  const setFunctionEnabled = (type: APIUsageType, enabled: boolean) => {
    const config = functionEnabled.value.find(c => c.type === type);
    if (config) {
      config.enabled = enabled;
    } else {
      functionEnabled.value.push({ type, enabled });
    }
    saveToStorage();
  };

  // 获取功能的启用状态
  const isFunctionEnabled = (type: APIUsageType): boolean => {
    const config = functionEnabled.value.find(c => c.type === type);
    return config?.enabled ?? true;  // 默认启用
  };

  // 更新 AI 生成设置
  const updateAIGenerationSettings = (settings: Partial<typeof aiGenerationSettings.value>) => {
    aiGenerationSettings.value = { ...aiGenerationSettings.value, ...settings };
    saveToStorage();
  };

  // 导出配置
  const exportConfig = () => {
    return {
      apiConfigs: apiConfigs.value,
      apiAssignments: apiAssignments.value,
      functionModes: functionModes.value,
      functionEnabled: functionEnabled.value,
      aiGenerationSettings: aiGenerationSettings.value,
      exportTime: new Date().toISOString()
    };
  };

  // 导入配置
  const importConfig = (data: any) => {
    try {
      if (data.apiConfigs && Array.isArray(data.apiConfigs)) {
        apiConfigs.value = data.apiConfigs;
      }
      if (data.apiAssignments && Array.isArray(data.apiAssignments)) {
        apiAssignments.value = data.apiAssignments;
      }
      if (data.functionModes && Array.isArray(data.functionModes)) {
        functionModes.value = data.functionModes;
      }
      if (data.functionEnabled && Array.isArray(data.functionEnabled)) {
        functionEnabled.value = data.functionEnabled;
      }
      if (data.aiGenerationSettings) {
        aiGenerationSettings.value = {
          ...aiGenerationSettings.value,
          ...data.aiGenerationSettings
        };
      }
      saveToStorage();
    } catch (error) {
      console.error('[API管理] 导入配置失败:', error);
      throw error;
    }
  };

  return {
    apiConfigs,
    apiAssignments,
    functionModes,
    functionEnabled,
    aiGenerationSettings,
    enabledAPIs,
    shouldEnableSplitGeneration,
    loadFromStorage,
    saveToStorage,
    addAPI,
    updateAPI,
    deleteAPI,
    assignAPI,
    getAPIForType,
    toggleAPI,
    setFunctionMode,
    getFunctionMode,
    setFunctionEnabled,
    isFunctionEnabled,
    updateAIGenerationSettings,
    exportConfig,
    importConfig
  };
});
