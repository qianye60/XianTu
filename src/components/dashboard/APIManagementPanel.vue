<template>
  <div class="api-management-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">🔌</div>
        <div class="header-info">
          <h3 class="panel-title">{{ t('API管理') }}</h3>
          <span class="settings-subtitle">{{ t('管理多个API配置和功能分配') }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="handleImport">
          <Upload :size="16" />
          <span class="btn-text">{{ t('导入') }}</span>
        </button>
        <button class="action-btn" @click="handleExport">
          <Download :size="16" />
          <span class="btn-text">{{ t('导出') }}</span>
        </button>
        <button class="action-btn primary" @click="showAddDialog = true">
          <Plus :size="16" />
          <span class="btn-text">{{ t('新增API') }}</span>
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="settings-container">
      <!-- API列表区 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">📡 {{ t('API配置列表') }}</h4>
          <span class="section-count">{{ apiStore.apiConfigs.length }} {{ t('个配置') }}</span>
        </div>
        <div class="api-list">
          <div
            v-for="api in apiStore.apiConfigs"
            :key="api.id"
            class="api-card"
            :class="{ disabled: !api.enabled, default: api.id === 'default' }"
          >
            <div class="api-card-header">
              <div class="api-info">
                <span class="api-name">{{ api.name }}</span>
                <span class="api-provider">{{ getProviderName(api.provider) }}</span>
              </div>
              <div class="api-actions">
                <label class="setting-switch" :title="t('启用/禁用')">
                  <input
                    type="checkbox"
                    :checked="api.enabled"
                    @change="toggleAPI(api.id)"
                  />
                  <span class="switch-slider"></span>
                </label>
                <button class="icon-btn" @click="testAPI(api)" :title="t('测试连接')">
                  <FlaskConical :size="16" :class="{ 'loading-pulse': testingApiId === api.id }" />
                </button>
                <button class="icon-btn" @click="editAPI(api)" :title="t('编辑')">
                  <Edit2 :size="16" />
                </button>
                <button
                  class="icon-btn danger"
                  @click="deleteAPI(api.id)"
                  :title="t('删除')"
                  :disabled="api.id === 'default'"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
            <div class="api-card-body">
              <div class="api-detail">
                <span class="detail-label">{{ t('模型') }}:</span>
                <span class="detail-value">{{ api.model }}</span>
              </div>
              <div class="api-detail">
                <span class="detail-label">{{ t('地址') }}:</span>
                <span class="detail-value url">{{ api.url || t('默认') }}</span>
              </div>
              <div class="api-detail">
                <span class="detail-label">{{ t('状态') }}:</span>
                <span class="detail-value" :class="getAPIStatus(api.id)">
                  {{ getAPIStatusText(api.id) }}
                </span>
              </div>
            </div>
            <div class="api-card-footer" v-if="getAssignedFunctions(api.id).length > 0">
              <span class="assigned-label">{{ t('已分配功能') }}:</span>
              <div class="assigned-tags">
                <span
                  v-for="func in getAssignedFunctions(api.id)"
                  :key="func"
                  class="function-tag"
                >
                  {{ getFunctionName(func) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能分配区 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">⚙️ {{ t('功能分配') }}</h4>
        </div>
        <div class="settings-list">
          <div
            v-for="assignment in apiStore.apiAssignments"
            :key="assignment.type"
            class="setting-item"
          >
            <div class="setting-info">
              <label class="setting-name">{{ getFunctionName(assignment.type) }}</label>
              <span class="setting-desc">{{ getFunctionDesc(assignment.type) }}</span>
            </div>
            <div class="setting-control">
              <select
                :value="assignment.apiId"
                @change="updateAssignment(assignment.type, ($event.target as HTMLSelectElement).value)"
                class="setting-select"
              >
                <option
                  v-for="api in apiStore.enabledAPIs"
                  :key="api.id"
                  :value="api.id"
                >
                  {{ api.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 通用AI设置区 -->
      <div class="settings-section">
        <div class="section-header">
          <h4 class="section-title">🤖 {{ t('通用AI设置') }}</h4>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('流式传输') }}</label>
              <span class="setting-desc">{{ t('实时显示AI生成内容') }}</span>
            </div>
            <div class="setting-control">
              <label class="setting-switch">
                <input type="checkbox" v-model="streamingEnabled" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('记忆总结模式') }}</label>
              <span class="setting-desc">{{ t('Raw模式更准确，标准模式包含预设') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="memorySummaryMode" class="setting-select">
                <option value="raw">{{ t('Raw模式（推荐）') }}</option>
                <option value="standard">{{ t('标准模式') }}</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-name">{{ t('开局生成模式') }}</label>
              <span class="setting-desc">{{ t('角色初始化使用的生成模式') }}</span>
            </div>
            <div class="setting-control">
              <select v-model="initMode" class="setting-select">
                <option value="generate">{{ t('标准模式') }}</option>
                <option value="generateRaw">{{ t('Raw模式') }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑API弹窗 -->
    <div v-if="showAddDialog || showEditDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ showEditDialog ? t('编辑API配置') : t('新增API配置') }}</h3>
          <button class="close-btn" @click="closeDialogs">
            <X :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ t('配置名称') }}</label>
            <input v-model="editingAPI.name" class="form-input" :placeholder="t('例如：主力API')" />
          </div>

          <div class="form-group">
            <label>{{ t('API提供商') }}</label>
            <select v-model="editingAPI.provider" class="form-select" @change="onProviderChange">
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
              <option value="deepseek">DeepSeek</option>
              <option value="custom">{{ t('自定义(OpenAI兼容)') }}</option>
            </select>
          </div>

          <div class="form-group">
            <label>{{ t('API地址') }}</label>
            <input
              v-model="editingAPI.url"
              class="form-input"
              :placeholder="getProviderPresetUrl(editingAPI.provider || 'openai')"
            />
          </div>

          <div class="form-group">
            <label>{{ t('API密钥') }}</label>
            <input
              v-model="editingAPI.apiKey"
              type="password"
              class="form-input"
              placeholder="sk-..."
            />
          </div>

          <div class="form-group">
            <label>{{ t('模型名称') }}</label>
            <div class="model-select-wrapper">
              <div class="model-input-row">
                <input
                  v-model="editingAPI.model"
                  class="form-input"
                  :placeholder="getProviderPresetModel(editingAPI.provider || 'openai')"
                  @focus="showModelDropdown = true"
                  @input="filterModels"
                />
                <button class="utility-btn" @click="fetchModelsForEditing" :disabled="isFetchingModels">
                  <RefreshCw :size="16" :class="{ 'loading-pulse': isFetchingModels }" />
                </button>
              </div>
              <div v-if="showModelDropdown && filteredModels.length > 0" class="model-dropdown">
                <div
                  v-for="model in filteredModels"
                  :key="model"
                  class="model-dropdown-item"
                  :class="{ active: editingAPI.model === model }"
                  @mousedown.prevent="selectModel(model)"
                >
                  {{ model }}
                </div>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>{{ t('温度参数') }}</label>
              <input
                v-model.number="editingAPI.temperature"
                type="number"
                class="form-input"
                min="0"
                max="2"
                step="0.1"
              />
            </div>
            <div class="form-group half">
              <label>{{ t('最大Token数') }}</label>
              <input
                v-model.number="editingAPI.maxTokens"
                type="number"
                class="form-input"
                min="100"
                max="128000"
              />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeDialogs">{{ t('取消') }}</button>
          <button class="btn-confirm" @click="saveAPI">{{ t('保存') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Plus, Edit2, Trash2, Upload, Download, X, RefreshCw, FlaskConical } from 'lucide-vue-next';
import { useAPIManagementStore, type APIConfig, type APIUsageType } from '@/stores/apiManagementStore';
import { aiService, API_PROVIDER_PRESETS, type APIProvider } from '@/services/aiService';
import { useUIStore } from '@/stores/uiStore';
import { toast } from '@/utils/toast';
import { useI18n } from '@/i18n';

const { t } = useI18n();
const apiStore = useAPIManagementStore();
const uiStore = useUIStore();

// 初始化加载
onMounted(() => {
  apiStore.loadFromStorage();
  loadAIServiceConfig();
});

// AI服务通用配置
const streamingEnabled = ref(true);
const memorySummaryMode = ref<'raw' | 'standard'>('raw');
const initMode = ref<'generate' | 'generateRaw'>('generate');

const loadAIServiceConfig = () => {
  const config = aiService.getConfig();
  streamingEnabled.value = config.streaming !== false;
  memorySummaryMode.value = config.memorySummaryMode || 'raw';
  initMode.value = config.initMode || 'generate';
};

// 监听通用配置变化
watch([streamingEnabled, memorySummaryMode, initMode], () => {
  aiService.saveConfig({
    streaming: streamingEnabled.value,
    memorySummaryMode: memorySummaryMode.value,
    initMode: initMode.value
  });
  uiStore.useStreaming = streamingEnabled.value;
});

// 对话框状态
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const editingAPI = ref<Partial<APIConfig>>({
  name: '',
  provider: 'openai',
  url: '',
  apiKey: '',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 16000,
  enabled: true
});
const editingAPIId = ref<string | null>(null);

// 模型获取状态
const isFetchingModels = ref(false);
const availableModels = ref<string[]>([]);
const showModelDropdown = ref(false);

// 过滤后的模型列表
const filteredModels = computed(() => {
  const query = editingAPI.value.model?.toLowerCase() || '';
  if (!query) return availableModels.value;
  return availableModels.value.filter(m => m.toLowerCase().includes(query));
});

// 过滤模型
const filterModels = () => {
  showModelDropdown.value = true;
};

// 选择模型
const selectModel = (model: string) => {
  editingAPI.value.model = model;
  showModelDropdown.value = false;
};

// API测试状态
const testingApiId = ref<string | null>(null);
const apiTestResults = ref<Record<string, 'success' | 'fail' | null>>({});

// 获取提供商名称
const getProviderName = (provider: APIProvider): string => {
  return API_PROVIDER_PRESETS[provider]?.name || provider;
};

const getProviderPresetUrl = (provider: APIProvider): string => {
  return API_PROVIDER_PRESETS[provider]?.url || 'https://api.openai.com';
};

const getProviderPresetModel = (provider: APIProvider): string => {
  return API_PROVIDER_PRESETS[provider]?.defaultModel || 'gpt-4o';
};

// 当提供商变化时更新默认值
const onProviderChange = () => {
  const preset = API_PROVIDER_PRESETS[editingAPI.value.provider as APIProvider];
  if (preset) {
    editingAPI.value.url = preset.url;
    editingAPI.value.model = preset.defaultModel;
  }
};

// 获取功能名称
const getFunctionName = (type: APIUsageType): string => {
  const names: Record<APIUsageType, string> = {
    main: '主游戏流程',
    memory_summary: '记忆总结',
    text_optimization: '文本优化',
    cot: '思维链',
    world_generation: '世界生成',
    quest_generation: '任务生成',
    npc_generation: 'NPC生成'
  };
  return names[type] || type;
};

// 获取功能描述
const getFunctionDesc = (type: APIUsageType): string => {
  const descs: Record<APIUsageType, string> = {
    main: '游戏主要交互和剧情生成',
    memory_summary: '压缩和总结历史记忆',
    text_optimization: '优化AI输出的文本质量',
    cot: '思维链推理辅助',
    world_generation: '生成世界、地点等内容',
    quest_generation: '生成任务和目标',
    npc_generation: '生成NPC角色'
  };
  return descs[type] || '';
};

// 获取已分配到某API的功能列表
const getAssignedFunctions = (apiId: string): APIUsageType[] => {
  return apiStore.apiAssignments
    .filter(a => a.apiId === apiId)
    .map(a => a.type);
};

// 获取API状态
const getAPIStatus = (apiId: string): string => {
  const result = apiTestResults.value[apiId];
  if (result === 'success') return 'success';
  if (result === 'fail') return 'fail';
  return 'unknown';
};

const getAPIStatusText = (apiId: string): string => {
  const result = apiTestResults.value[apiId];
  if (result === 'success') return t('连接正常');
  if (result === 'fail') return t('连接失败');
  return t('未测试');
};

// 切换API启用状态
const toggleAPI = (id: string) => {
  apiStore.toggleAPI(id);
};

// 编辑API
const editAPI = (api: APIConfig) => {
  editingAPI.value = { ...api };
  editingAPIId.value = api.id;
  showEditDialog.value = true;
};

// 删除API
const deleteAPI = (id: string) => {
  if (id === 'default') {
    toast.error(t('不能删除默认API配置'));
    return;
  }

  uiStore.showRetryDialog({
    title: t('确认删除'),
    message: t('确定要删除这个API配置吗？使用它的功能将自动回退到默认API。'),
    confirmText: t('删除'),
    cancelText: t('取消'),
    onConfirm: () => {
      apiStore.deleteAPI(id);
      toast.success(t('API配置已删除'));
    },
    onCancel: () => {}
  });
};

// 测试API连接
const testAPI = async (api: APIConfig) => {
  if (testingApiId.value) return;

  testingApiId.value = api.id;
  try {
    // 临时保存当前配置并切换到要测试的API
    const currentConfig = aiService.getConfig();

    aiService.saveConfig({
      mode: 'custom',
      customAPI: {
        provider: api.provider,
        url: api.url,
        apiKey: api.apiKey,
        model: api.model,
        temperature: api.temperature,
        maxTokens: api.maxTokens
      }
    });

    const testPrompt = '你正在进行API连通性测试。请仅输出：仙途本-连通测试-OK';
    const response = await aiService.generate({
      user_input: testPrompt,
      should_stream: false,
      generation_id: `api_test_${Date.now()}`
    });

    const ok = response.toLowerCase().includes('仙途本') || response.toLowerCase().includes('ok');
    apiTestResults.value[api.id] = ok ? 'success' : 'fail';

    if (ok) {
      toast.success(`${api.name} ${t('连接成功')}`);
    } else {
      toast.warning(`${api.name} ${t('响应异常')}`);
    }

    // 恢复原配置
    aiService.saveConfig(currentConfig);
  } catch (error) {
    apiTestResults.value[api.id] = 'fail';
    toast.error(`${api.name} ${t('连接失败')}: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    testingApiId.value = null;
  }
};

// 获取模型列表
const fetchModelsForEditing = async () => {
  if (isFetchingModels.value) return;
  if (!editingAPI.value.url || !editingAPI.value.apiKey) {
    toast.warning(t('请先填写API地址和密钥'));
    return;
  }

  isFetchingModels.value = true;
  try {
    // 临时设置配置
    const currentConfig = aiService.getConfig();
    aiService.saveConfig({
      mode: 'custom',
      customAPI: {
        provider: editingAPI.value.provider as APIProvider,
        url: editingAPI.value.url,
        apiKey: editingAPI.value.apiKey,
        model: editingAPI.value.model || 'gpt-4o',
        temperature: editingAPI.value.temperature || 0.7,
        maxTokens: editingAPI.value.maxTokens || 16000
      }
    });

    const models = await aiService.fetchModels();
    availableModels.value = models;
    toast.success(`${t('获取到')} ${models.length} ${t('个模型')}`);

    // 恢复配置
    aiService.saveConfig(currentConfig);
  } catch (error) {
    toast.error(t('获取模型列表失败'));
  } finally {
    isFetchingModels.value = false;
  }
};

// 保存API配置
const saveAPI = () => {
  if (!editingAPI.value.name) {
    toast.warning(t('请填写配置名称'));
    return;
  }

  if (showEditDialog.value && editingAPIId.value) {
    // 编辑模式
    apiStore.updateAPI(editingAPIId.value, editingAPI.value);
    toast.success(t('API配置已更新'));
  } else {
    // 新增模式
    const newConfig = {
      name: editingAPI.value.name!,
      provider: editingAPI.value.provider as APIProvider,
      url: editingAPI.value.url || getProviderPresetUrl(editingAPI.value.provider as APIProvider),
      apiKey: editingAPI.value.apiKey || '',
      model: editingAPI.value.model || getProviderPresetModel(editingAPI.value.provider as APIProvider),
      temperature: editingAPI.value.temperature || 0.7,
      maxTokens: editingAPI.value.maxTokens || 16000,
      enabled: true
    };
    apiStore.addAPI(newConfig);
    toast.success(t('API配置已添加'));
  }

  closeDialogs();

  // 同步默认API配置到aiService
  syncDefaultAPIToService();
};

// 同步默认API到aiService
const syncDefaultAPIToService = () => {
  const defaultAPI = apiStore.apiConfigs.find(a => a.id === 'default');
  if (defaultAPI) {
    aiService.saveConfig({
      mode: 'custom',
      customAPI: {
        provider: defaultAPI.provider,
        url: defaultAPI.url,
        apiKey: defaultAPI.apiKey,
        model: defaultAPI.model,
        temperature: defaultAPI.temperature,
        maxTokens: defaultAPI.maxTokens
      }
    });
  }
};

// 更新功能分配
const updateAssignment = (type: APIUsageType, apiId: string) => {
  apiStore.assignAPI(type, apiId);
  toast.success(`${getFunctionName(type)} ${t('已分配到')} ${apiStore.apiConfigs.find(a => a.id === apiId)?.name || 'API'}`);
};

// 关闭对话框
const closeDialogs = () => {
  showAddDialog.value = false;
  showEditDialog.value = false;
  editingAPIId.value = null;
  editingAPI.value = {
    name: '',
    provider: 'openai',
    url: '',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 16000,
    enabled: true
  };
  availableModels.value = [];
};

// 导出配置
const handleExport = () => {
  const data = apiStore.exportConfig();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `仙途-API配置-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(t('API配置已导出'));
};

// 导入配置
const handleImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      apiStore.importConfig(data);
      syncDefaultAPIToService();
      toast.success(t('API配置已导入'));
    } catch (error) {
      toast.error(t('导入失败，请检查文件格式'));
    }
  };
  input.click();
};
</script>

<style scoped>
.api-management-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background);
  overflow: hidden;
  padding: 1rem;
  gap: 1rem;
  position: relative;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.settings-subtitle {
  font-size: 0.875rem;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.action-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.action-btn.primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.action-btn.primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

/* 内容区域 */
.settings-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 0.5rem 3rem 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.3) rgba(243, 244, 246, 0.5);
}

.settings-container::-webkit-scrollbar {
  width: 8px;
}

.settings-container::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.settings-container::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.3);
  border-radius: 4px;
}

/* 设置区块 */
.settings-section {
  margin-bottom: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.section-count {
  font-size: 0.875rem;
  color: #64748b;
}

/* API卡片列表 */
.api-list {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.api-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

.api-card:hover {
  border-color: #94a3b8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.api-card.disabled {
  opacity: 0.6;
}

.api-card.default {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
}

.api-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.api-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.api-name {
  font-weight: 600;
  color: #1e293b;
}

.api-provider {
  font-size: 0.75rem;
  color: #64748b;
  background: #e2e8f0;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
}

.api-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.icon-btn.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.api-card-body {
  padding: 0.75rem 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.api-detail {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.detail-label {
  color: #64748b;
}

.detail-value {
  color: #1e293b;
  font-weight: 500;
}

.detail-value.url {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-value.success {
  color: #059669;
}

.detail-value.fail {
  color: #dc2626;
}

.detail-value.unknown {
  color: #64748b;
}

.api-card-footer {
  padding: 0.5rem 1rem;
  background: rgba(59, 130, 246, 0.05);
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.assigned-label {
  font-size: 0.75rem;
  color: #64748b;
}

.assigned-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.function-tag {
  font-size: 0.75rem;
  background: #3b82f6;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
}

/* 设置列表 */
.settings-list {
  padding: 0.5rem;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  transition: background 0.2s ease;
}

.setting-item:hover {
  background: #f8fafc;
}

.setting-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-name {
  font-weight: 500;
  color: #1e293b;
}

.setting-desc {
  font-size: 0.875rem;
  color: #64748b;
}

.setting-control {
  display: flex;
  align-items: center;
}

.setting-select {
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background-color: white;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  appearance: none;
  min-width: 140px;
}

/* 开关样式 */
.setting-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.setting-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.2s;
  border-radius: 24px;
}

.switch-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .switch-slider {
  background-color: #3b82f6;
}

input:checked + .switch-slider:before {
  transform: translateX(20px);
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  color: #374151;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-group.half {
  flex: 1;
}

.model-input-row {
  display: flex;
  gap: 0.5rem;
}

.model-input-row .form-input {
  flex: 1;
}

.model-select-wrapper {
  position: relative;
}

.model-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  margin-top: 4px;
}

.model-dropdown-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  transition: background 0.15s ease;
}

.model-dropdown-item:hover {
  background: #f1f5f9;
}

.model-dropdown-item.active {
  background: #eff6ff;
  color: #3b82f6;
  font-weight: 500;
}

.utility-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
  color: #374151;
  cursor: pointer;
}

.utility-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.utility-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.model-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.model-tag {
  padding: 0.25rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  font-size: 0.75rem;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.model-tag:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.model-tag.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel,
.btn-confirm {
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-cancel:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.btn-confirm {
  background: #3b82f6;
  border: 1px solid #3b82f6;
  color: white;
}

.btn-confirm:hover {
  background: #2563eb;
  border-color: #2563eb;
}

/* 加载动画 */
.loading-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 响应式 */
@media (max-width: 640px) {
  .header-actions .btn-text {
    display: none;
  }

  .api-card-body {
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-row {
    flex-direction: column;
    gap: 1rem;
  }
}

/* 深色主题 */
[data-theme='dark'] .api-management-panel {
  background: var(--color-background);
}

[data-theme='dark'] .panel-header,
[data-theme='dark'] .settings-section {
  background: #1e293b;
  border-color: #475569;
}

[data-theme='dark'] .section-header {
  background: #334155;
  border-bottom-color: #475569;
}

[data-theme='dark'] .panel-title,
[data-theme='dark'] .section-title,
[data-theme='dark'] .setting-name,
[data-theme='dark'] .api-name {
  color: #f1f5f9;
}

[data-theme='dark'] .settings-subtitle,
[data-theme='dark'] .setting-desc,
[data-theme='dark'] .detail-label {
  color: #94a3b8;
}

[data-theme='dark'] .api-card {
  background: #334155;
  border-color: #475569;
}

[data-theme='dark'] .api-card-header {
  background: #1e293b;
  border-bottom-color: #475569;
}

[data-theme='dark'] .setting-item:hover,
[data-theme='dark'] .api-card:hover {
  background: #334155;
}

[data-theme='dark'] .action-btn,
[data-theme='dark'] .setting-select,
[data-theme='dark'] .form-input,
[data-theme='dark'] .form-select {
  background: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
}

[data-theme='dark'] .modal-content {
  background: #1e293b;
}

[data-theme='dark'] .modal-header {
  border-bottom-color: #475569;
}

[data-theme='dark'] .modal-header h3 {
  color: #f1f5f9;
}

[data-theme='dark'] .modal-footer {
  border-top-color: #475569;
}

[data-theme='dark'] .api-provider {
  background: #475569;
  color: #e5e7eb;
}

[data-theme='dark'] .model-tag {
  background: #475569;
  border-color: #4b5563;
  color: #e5e7eb;
}

[data-theme='dark'] .model-dropdown {
  background: #374151;
  border-color: #4b5563;
}

[data-theme='dark'] .model-dropdown-item {
  color: #e5e7eb;
}

[data-theme='dark'] .model-dropdown-item:hover {
  background: #4b5563;
}

[data-theme='dark'] .model-dropdown-item.active {
  background: #1e40af;
  color: #93c5fd;
}
</style>
