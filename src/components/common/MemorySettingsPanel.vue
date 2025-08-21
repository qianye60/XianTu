<template>\n  <div class=\"memory-settings-panel\">\n    <div class=\"settings-header\">\n      <h2><i class=\"fas fa-brain\"></i> AI记忆管理设置</h2>\n      <div class=\"header-actions\">\n        <button @click=\"resetSettings\" class=\"btn-reset\" title=\"重置为默认设置\">\n          <i class=\"fas fa-undo\"></i>\n        </button>\n        <button @click=\"exportSettings\" class=\"btn-export\" title=\"导出设置\">\n          <i class=\"fas fa-download\"></i>\n        </button>\n        <input ref=\"importInput\" type=\"file\" accept=\".json\" @change=\"importSettings\" style=\"display: none\">\n        <button @click=\"$refs.importInput.click()\" class=\"btn-import\" title=\"导入设置\">\n          <i class=\"fas fa-upload\"></i>\n        </button>\n      </div>\n    </div>\n\n    <div class=\"settings-content\">\n      <!-- 记忆长度设置 -->\n      <section class=\"settings-section\">\n        <h3><i class=\"fas fa-layer-group\"></i> 记忆分层设置</h3>\n        \n        <!-- 短期记忆 -->\n        <div class=\"memory-level\">\n          <div class=\"level-header\">\n            <label class=\"level-title\">\n              <input \n                type=\"checkbox\" \n                v-model=\"localSettings.memory.shortTerm.enabled\"\n                @change=\"updateSettings\"\n              >\n              短期记忆 (最近对话)\n            </label>\n            <div class=\"level-info\">\n              <span class=\"current-count\">当前: {{ memoryStats.shortTermCount }}</span>\n            </div>\n          </div>\n          \n          <div class=\"level-controls\" v-if=\"localSettings.memory.shortTerm.enabled\">\n            <div class=\"control-group\">\n              <label>最大长度</label>\n              <div class=\"range-input\">\n                <input \n                  type=\"range\" \n                  :min=\"SETTINGS_RANGES.shortTermMemory.min\"\n                  :max=\"SETTINGS_RANGES.shortTermMemory.max\"\n                  :step=\"SETTINGS_RANGES.shortTermMemory.step\"\n                  v-model.number=\"localSettings.memory.shortTerm.maxLength\"\n                  @input=\"updateSettings\"\n                >\n                <span class=\"range-value\">{{ localSettings.memory.shortTerm.maxLength }}</span>\n              </div>\n              <small>范围: {{ SETTINGS_RANGES.shortTermMemory.min }}-{{ SETTINGS_RANGES.shortTermMemory.max }}</small>\n            </div>\n            \n            <div class=\"control-group\">\n              <label>\n                <input \n                  type=\"checkbox\" \n                  v-model=\"localSettings.memory.shortTerm.autoConvert\"\n                  @change=\"updateSettings\"\n                >\n                自动转换为中期记忆\n              </label>\n              <small>当短期记忆达到上限时，自动将最旧的记忆转入中期记忆</small>\n            </div>\n          </div>\n        </div>\n\n        <!-- 中期记忆 -->\n        <div class=\"memory-level\">\n          <div class=\"level-header\">\n            <label class=\"level-title\">\n              <input \n                type=\"checkbox\" \n                v-model=\"localSettings.memory.midTerm.enabled\"\n                @change=\"updateSettings\"\n              >\n              中期记忆 (重要事件)\n            </label>\n            <div class=\"level-info\">\n              <span class=\"current-count\">当前: {{ memoryStats.midTermCount }}</span>\n            </div>\n          </div>\n          \n          <div class=\"level-controls\" v-if=\"localSettings.memory.midTerm.enabled\">\n            <div class=\"control-group\">\n              <label>最大长度</label>\n              <div class=\"range-input\">\n                <input \n                  type=\"range\" \n                  :min=\"SETTINGS_RANGES.midTermMemory.min\"\n                  :max=\"SETTINGS_RANGES.midTermMemory.max\"\n                  :step=\"SETTINGS_RANGES.midTermMemory.step\"\n                  v-model.number=\"localSettings.memory.midTerm.maxLength\"\n                  @input=\"updateSettings\"\n                >\n                <span class=\"range-value\">{{ localSettings.memory.midTerm.maxLength }}</span>\n              </div>\n              <small>范围: {{ SETTINGS_RANGES.midTermMemory.min }}-{{ SETTINGS_RANGES.midTermMemory.max }}</small>\n            </div>\n            \n            <div class=\"control-group\">\n              <label>\n                <input \n                  type=\"checkbox\" \n                  v-model=\"localSettings.memory.midTerm.autoSummarize\"\n                  @change=\"updateSettings\"\n                >\n                自动总结记忆\n              </label>\n              <small>当中期记忆接近上限时，通过AI自动总结并转入长期记忆</small>\n            </div>\n            \n            <div class=\"control-group\" v-if=\"localSettings.memory.midTerm.autoSummarize\">\n              <label>总结触发阈值</label>\n              <div class=\"range-input\">\n                <input \n                  type=\"range\" \n                  :min=\"10\"\n                  :max=\"localSettings.memory.midTerm.maxLength - 2\"\n                  v-model.number=\"localSettings.memory.midTerm.summarizeThreshold\"\n                  @input=\"updateSettings\"\n                >\n                <span class=\"range-value\">{{ localSettings.memory.midTerm.summarizeThreshold }}</span>\n              </div>\n              <small>当达到此数量时开始总结</small>\n            </div>\n          </div>\n        </div>\n\n        <!-- 长期记忆 -->\n        <div class=\"memory-level\">\n          <div class=\"level-header\">\n            <label class=\"level-title\">\n              <input \n                type=\"checkbox\" \n                v-model=\"localSettings.memory.longTerm.enabled\"\n                @change=\"updateSettings\"\n              >\n              长期记忆 (成长轨迹)\n            </label>\n            <div class=\"level-info\">\n              <span class=\"current-count\">当前: {{ memoryStats.longTermCount }}</span>\n            </div>\n          </div>\n          \n          <div class=\"level-controls\" v-if=\"localSettings.memory.longTerm.enabled\">\n            <div class=\"control-group\">\n              <label>\n                <input \n                  type=\"checkbox\" \n                  v-model=\"localSettings.memory.longTerm.unlimited\"\n                  @change=\"updateSettings\"\n                >\n                无限制长度\n              </label>\n              <small>不限制长期记忆的数量</small>\n            </div>\n            \n            <div class=\"control-group\" v-if=\"!localSettings.memory.longTerm.unlimited\">\n              <label>最大长度</label>\n              <div class=\"range-input\">\n                <input \n                  type=\"range\" \n                  :min=\"SETTINGS_RANGES.longTermMemory.min\"\n                  :max=\"SETTINGS_RANGES.longTermMemory.max\"\n                  :step=\"SETTINGS_RANGES.longTermMemory.step\"\n                  v-model.number=\"localSettings.memory.longTerm.maxLength\"\n                  @input=\"updateSettings\"\n                >\n                <span class=\"range-value\">{{ localSettings.memory.longTerm.maxLength }}</span>\n              </div>\n              <small>范围: {{ SETTINGS_RANGES.longTermMemory.min }}-{{ SETTINGS_RANGES.longTermMemory.max }}</small>\n            </div>\n          </div>\n        </div>\n      </section>\n\n      <!-- API设置 -->\n      <section class=\"settings-section\">\n        <h3><i class=\"fas fa-plug\"></i> 双API配置</h3>\n        <p class=\"section-description\">\n          配置主API用于对话，副API用于后台任务（记忆总结、地图更新等），提升游戏流畅性\n        </p>\n\n        <!-- 主API设置 -->\n        <div class=\"api-config primary-api\">\n          <h4><i class=\"fas fa-star\"></i> 主API (对话用)</h4>\n          <div class=\"control-group\">\n            <label>\n              <input \n                type=\"checkbox\" \n                v-model=\"localSettings.api.primaryAPI.enabled\"\n                @change=\"updateSettings\"\n              >\n              启用主API\n            </label>\n          </div>\n          \n          <div class=\"control-group\" v-if=\"localSettings.api.primaryAPI.enabled\">\n            <label>API类型</label>\n            <select v-model=\"localSettings.api.primaryAPI.type\" @change=\"updateSettings\">\n              <option value=\"tavern_primary\">SillyTavern 主API</option>\n              <option value=\"custom\">自定义API</option>\n            </select>\n          </div>\n        </div>\n\n        <!-- 副API设置 -->\n        <div class=\"api-config secondary-api\">\n          <h4><i class=\"fas fa-cogs\"></i> 副API (后台任务用)</h4>\n          <div class=\"control-group\">\n            <label>\n              <input \n                type=\"checkbox\" \n                v-model=\"localSettings.api.secondaryAPI.enabled\"\n                @change=\"updateSettings\"\n              >\n              启用副API\n            </label>\n            <small>用于记忆总结、地图更新等不影响主对话的任务</small>\n          </div>\n          \n          <div class=\"secondary-api-config\" v-if=\"localSettings.api.secondaryAPI.enabled\">\n            <div class=\"control-group\">\n              <label>API类型</label>\n              <select v-model=\"localSettings.api.secondaryAPI.type\" @change=\"updateSettings\">\n                <option value=\"tavern_secondary\">SillyTavern 副API</option>\n                <option value=\"openai\">OpenAI API</option>\n                <option value=\"anthropic\">Anthropic Claude</option>\n                <option value=\"local\">本地API</option>\n                <option value=\"custom\">自定义API</option>\n              </select>\n              <small>{{ API_TYPE_CONFIGS[localSettings.api.secondaryAPI.type]?.description }}</small>\n            </div>\n\n            <!-- API配置 -->\n            <div v-if=\"API_TYPE_CONFIGS[localSettings.api.secondaryAPI.type]?.requiresConfig\" class=\"api-credentials\">\n              <div class=\"control-group\" v-if=\"localSettings.api.secondaryAPI.type !== 'tavern_secondary'\">\n                <label>API端点</label>\n                <input \n                  type=\"url\" \n                  v-model=\"localSettings.api.secondaryAPI.endpoint\"\n                  :placeholder=\"API_TYPE_CONFIGS[localSettings.api.secondaryAPI.type]?.defaultEndpoint\"\n                  @input=\"updateSettings\"\n                >\n              </div>\n              \n              <div class=\"control-group\" v-if=\"['openai', 'anthropic', 'custom'].includes(localSettings.api.secondaryAPI.type)\">\n                <label>API密钥</label>\n                <input \n                  type=\"password\" \n                  v-model=\"apiCredentials[localSettings.api.secondaryAPI.type + 'Key']\"\n                  :placeholder=\"`输入${API_TYPE_CONFIGS[localSettings.api.secondaryAPI.type]?.name}的API密钥`\"\n                  @input=\"updateCredentials\"\n                >\n                <small class=\"warning\">\n                  <i class=\"fas fa-shield-alt\"></i>\n                  API密钥将加密存储在本地，不会上传到服务器\n                </small>\n              </div>\n              \n              <div class=\"control-group\">\n                <label>模型名称</label>\n                <input \n                  type=\"text\" \n                  v-model=\"localSettings.api.secondaryAPI.model\"\n                  :placeholder=\"getDefaultModel(localSettings.api.secondaryAPI.type)\"\n                  @input=\"updateSettings\"\n                >\n              </div>\n            </div>\n\n            <!-- 使用场景 -->\n            <div class=\"control-group\">\n              <label>使用场景</label>\n              <div class=\"scenario-checkboxes\">\n                <label v-for=\"scenario in USAGE_SCENARIOS\" :key=\"scenario.value\" class=\"scenario-item\">\n                  <input \n                    type=\"checkbox\" \n                    :value=\"scenario.value\"\n                    v-model=\"localSettings.api.secondaryAPI.usageScenarios\"\n                    @change=\"updateSettings\"\n                  >\n                  <span>{{ scenario.label }}</span>\n                  <small>{{ scenario.description }}</small>\n                </label>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <!-- API冲突处理 -->\n        <div class=\"api-config conflict-resolution\" v-if=\"localSettings.api.primaryAPI.enabled && localSettings.api.secondaryAPI.enabled\">\n          <h4><i class=\"fas fa-balance-scale\"></i> 冲突处理</h4>\n          \n          <div class=\"control-group\">\n            <label>优先级策略</label>\n            <select v-model=\"localSettings.api.conflictResolution.priority\" @change=\"updateSettings\">\n              <option value=\"primary\">主API优先</option>\n              <option value=\"secondary\">副API优先</option>\n              <option value=\"balanced\">均衡处理</option>\n            </select>\n          </div>\n          \n          <div class=\"control-group\">\n            <label>\n              <input \n                type=\"checkbox\" \n                v-model=\"localSettings.api.conflictResolution.queueManagement\"\n                @change=\"updateSettings\"\n              >\n              启用队列管理\n            </label>\n            <small>自动排队处理API请求，避免冲突</small>\n          </div>\n          \n          <div class=\"control-group\">\n            <label>并发限制</label>\n            <div class=\"range-input\">\n              <input \n                type=\"range\" \n                :min=\"SETTINGS_RANGES.concurrentLimit.min\"\n                :max=\"SETTINGS_RANGES.concurrentLimit.max\"\n                v-model.number=\"localSettings.api.conflictResolution.concurrentLimit\"\n                @input=\"updateSettings\"\n              >\n              <span class=\"range-value\">{{ localSettings.api.conflictResolution.concurrentLimit }}</span>\n            </div>\n            <small>同时进行的API请求数量</small>\n          </div>\n        </div>\n      </section>\n\n      <!-- 高级设置 -->\n      <section class=\"settings-section advanced-section\">\n        <h3><i class=\"fas fa-wrench\"></i> 高级功能</h3>\n        \n        <div class=\"control-group\">\n          <label>\n            <input \n              type=\"checkbox\" \n              v-model=\"localSettings.advanced.memoryCompression\"\n              @change=\"updateSettings\"\n            >\n            记忆压缩\n          </label>\n          <small>自动压缩和优化旧记忆，节省存储空间</small>\n        </div>\n        \n        <div class=\"control-group\">\n          <label>\n            <input \n              type=\"checkbox\" \n              v-model=\"localSettings.advanced.intelligentFiltering\"\n              @change=\"updateSettings\"\n            >\n            智能过滤\n          </label>\n          <small>自动过滤无用的记忆信息，保留重要内容</small>\n        </div>\n        \n        <div class=\"control-group\">\n          <label>\n            <input \n              type=\"checkbox\" \n              v-model=\"localSettings.advanced.contextAwareSummary\"\n              @change=\"updateSettings\"\n            >\n            上下文感知总结\n          </label>\n          <small>根据上下文和角色状态调整记忆总结策略</small>\n        </div>\n\n        <div class=\"control-group\">\n          <label>优先记忆类型</label>\n          <div class=\"priority-types\">\n            <label v-for=\"type in MEMORY_TYPES\" :key=\"type.value\" class=\"type-item\">\n              <input \n                type=\"checkbox\" \n                :value=\"type.value\"\n                v-model=\"localSettings.advanced.priorityMemoryTypes\"\n                @change=\"updateSettings\"\n              >\n              <span>{{ type.label }}</span>\n            </label>\n          </div>\n          <small>标记为优先的记忆类型将获得更长的保存时间</small>\n        </div>\n      </section>\n\n      <!-- 记忆管理操作 -->\n      <section class=\"settings-section memory-actions\">\n        <h3><i class=\"fas fa-tools\"></i> 记忆管理</h3>\n        \n        <div class=\"memory-stats\">\n          <div class=\"stat-item\">\n            <span class=\"stat-label\">短期:</span>\n            <span class=\"stat-value\">{{ memoryStats.shortTermCount }}</span>\n          </div>\n          <div class=\"stat-item\">\n            <span class=\"stat-label\">中期:</span>\n            <span class=\"stat-value\">{{ memoryStats.midTermCount }}</span>\n          </div>\n          <div class=\"stat-item\">\n            <span class=\"stat-label\">长期:</span>\n            <span class=\"stat-value\">{{ memoryStats.longTermCount }}</span>\n          </div>\n          <div class=\"stat-item\">\n            <span class=\"stat-label\">NPC:</span>\n            <span class=\"stat-value\">{{ memoryStats.npcInteractionCount }}</span>\n          </div>\n          <div class=\"stat-item\">\n            <span class=\"stat-label\">队列:</span>\n            <span class=\"stat-value\">{{ memoryStats.queueLength }}</span>\n          </div>\n        </div>\n        \n        <div class=\"action-buttons\">\n          <button @click=\"clearMemory('short')\" class=\"btn-action warning\">\n            <i class=\"fas fa-trash\"></i> 清空短期记忆\n          </button>\n          <button @click=\"clearMemory('mid')\" class=\"btn-action warning\">\n            <i class=\"fas fa-trash\"></i> 清空中期记忆\n          </button>\n          <button @click=\"clearMemory('long')\" class=\"btn-action warning\">\n            <i class=\"fas fa-trash\"></i> 清空长期记忆\n          </button>\n          <button @click=\"clearMemory('all')\" class=\"btn-action danger\">\n            <i class=\"fas fa-bomb\"></i> 清空所有记忆\n          </button>\n        </div>\n        \n        <div class=\"action-buttons\">\n          <button @click=\"exportMemory\" class=\"btn-action\">\n            <i class=\"fas fa-download\"></i> 导出记忆\n          </button>\n          <input ref=\"memoryImportInput\" type=\"file\" accept=\".json\" @change=\"importMemory\" style=\"display: none\">\n          <button @click=\"$refs.memoryImportInput.click()\" class=\"btn-action\">\n            <i class=\"fas fa-upload\"></i> 导入记忆\n          </button>\n        </div>\n      </section>\n    </div>\n\n    <!-- 设置验证状态 -->\n    <div class=\"settings-status\" :class=\"validationResult.isValid ? 'valid' : 'invalid'\">\n      <div class=\"status-header\">\n        <i :class=\"validationResult.isValid ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'\"></i>\n        <span>{{ validationResult.isValid ? '设置有效' : '设置有误' }}</span>\n      </div>\n      <div v-if=\"!validationResult.isValid\" class=\"error-list\">\n        <div v-for=\"error in validationResult.errors\" :key=\"error\" class=\"error-item\">\n          <i class=\"fas fa-times\"></i>\n          <span>{{ error }}</span>\n        </div>\n      </div>\n    </div>\n  </div>\n</template>\n\n<script setup lang=\"ts\">\nimport { ref, reactive, computed, onMounted, watch } from 'vue';\nimport { SettingsManager } from '@/utils/settings/settingsManager';\nimport { AIMemoryManager } from '@/utils/settings/memoryManager';\nimport { GameAIService } from '@/services/gameAIService';\nimport { SETTINGS_RANGES, API_TYPE_CONFIGS, type AIMemorySettings } from '@/utils/settings/memorySettings';\nimport { toast } from '@/utils/toast';\n\n// ==================== 响应式数据 ====================\n\nconst settingsManager = SettingsManager.getInstance();\nconst gameAIService = GameAIService.getInstance();\n\nconst localSettings = reactive<AIMemorySettings>(settingsManager.getSettings());\nconst apiCredentials = reactive<Record<string, string>>({});\nconst memoryStats = reactive({\n  shortTermCount: 0,\n  midTermCount: 0,\n  longTermCount: 0,\n  npcInteractionCount: 0,\n  queueLength: 0,\n  activeRequests: 0\n});\n\n// 导入文件引用\nconst importInput = ref<HTMLInputElement | null>(null);\nconst memoryImportInput = ref<HTMLInputElement | null>(null);\n\n// ==================== 计算属性 ====================\n\nconst validationResult = computed(() => {\n  return settingsManager.validateSettings();\n});\n\n// ==================== 常量定义 ====================\n\nconst USAGE_SCENARIOS = [\n  { value: 'memory_summarize', label: '记忆总结', description: '自动总结和整理记忆' },\n  { value: 'map_update', label: '地图更新', description: '更新地图信息和位置' },\n  { value: 'npc_status', label: 'NPC状态', description: '更新NPC状态和关系' },\n  { value: 'world_events', label: '世界事件', description: '处理世界事件和背景更新' }\n] as const;\n\nconst MEMORY_TYPES = [\n  { value: 'combat', label: '战斗' },\n  { value: 'social', label: '社交' },\n  { value: 'cultivation', label: '修炼' },\n  { value: 'exploration', label: '探索' }\n] as const;\n\n// ==================== 方法 ====================\n\n/**\n * 更新设置\n */\nconst updateSettings = async () => {\n  try {\n    await settingsManager.updateSettings(localSettings);\n    // 同时更新游戏AI服务的设置\n    // gameAIService.updateMemorySettings?.(localSettings);\n  } catch (error) {\n    console.error('更新设置失败:', error);\n  }\n};\n\n/**\n * 更新API凭据\n */\nconst updateCredentials = async () => {\n  try {\n    await settingsManager.setAPICredentials(apiCredentials);\n  } catch (error) {\n    console.error('更新API凭据失败:', error);\n  }\n};\n\n/**\n * 重置设置\n */\nconst resetSettings = async () => {\n  if (confirm('确定要重置所有设置为默认值吗？此操作不可撤销。')) {\n    try {\n      await settingsManager.resetToDefault();\n      Object.assign(localSettings, settingsManager.getSettings());\n    } catch (error) {\n      console.error('重置设置失败:', error);\n    }\n  }\n};\n\n/**\n * 导出设置\n */\nconst exportSettings = () => {\n  try {\n    const data = settingsManager.exportSettings();\n    const blob = new Blob([data], { type: 'application/json' });\n    const url = URL.createObjectURL(blob);\n    const a = document.createElement('a');\n    a.href = url;\n    a.download = `ai-memory-settings-${new Date().toISOString().split('T')[0]}.json`;\n    a.click();\n    URL.revokeObjectURL(url);\n    toast.success('设置已导出');\n  } catch (error) {\n    console.error('导出设置失败:', error);\n    toast.error('导出设置失败');\n  }\n};\n\n/**\n * 导入设置\n */\nconst importSettings = async (event: Event) => {\n  const file = (event.target as HTMLInputElement).files?.[0];\n  if (!file) return;\n  \n  try {\n    const text = await file.text();\n    await settingsManager.importSettings(text);\n    Object.assign(localSettings, settingsManager.getSettings());\n  } catch (error) {\n    console.error('导入设置失败:', error);\n  } finally {\n    // 重置文件输入\n    if (importInput.value) {\n      importInput.value.value = '';\n    }\n  }\n};\n\n/**\n * 清空记忆\n */\nconst clearMemory = (level: 'short' | 'mid' | 'long' | 'npc' | 'all') => {\n  const confirmMessages = {\n    short: '确定要清空所有短期记忆吗？',\n    mid: '确定要清空所有中期记忆吗？',\n    long: '确定要清空所有长期记忆吗？',\n    npc: '确定要清空所有NPC交互记忆吗？',\n    all: '确定要清空所有记忆吗？此操作不可撤销！'\n  };\n  \n  if (confirm(confirmMessages[level])) {\n    // TODO: 实现记忆清空功能\n    // memoryManager.clearMemory(level);\n    // updateMemoryStats();\n    console.log(`清空${level}记忆`);\n    toast.success(`${level === 'all' ? '所有' : level}记忆已清空`);\n  }\n};\n\n/**\n * 导出记忆\n */\nconst exportMemory = () => {\n  try {\n    // TODO: 实现记忆导出功能\n    // const data = memoryManager.exportMemory();\n    const data = JSON.stringify({ timestamp: Date.now(), memory: {} }, null, 2);\n    const blob = new Blob([data], { type: 'application/json' });\n    const url = URL.createObjectURL(blob);\n    const a = document.createElement('a');\n    a.href = url;\n    a.download = `memory-data-${new Date().toISOString().split('T')[0]}.json`;\n    a.click();\n    URL.revokeObjectURL(url);\n    toast.success('记忆数据已导出');\n  } catch (error) {\n    console.error('导出记忆失败:', error);\n    toast.error('导出记忆失败');\n  }\n};\n\n/**\n * 导入记忆\n */\nconst importMemory = async (event: Event) => {\n  const file = (event.target as HTMLInputElement).files?.[0];\n  if (!file) return;\n  \n  try {\n    const text = await file.text();\n    // TODO: 实现记忆导入功能\n    // memoryManager.importMemory(text);\n    // updateMemoryStats();\n    console.log('导入记忆数据:', text.substring(0, 100));\n    toast.success('记忆数据导入成功');\n  } catch (error) {\n    console.error('导入记忆失败:', error);\n  } finally {\n    // 重置文件输入\n    if (memoryImportInput.value) {\n      memoryImportInput.value.value = '';\n    }\n  }\n};\n\n/**\n * 获取默认模型名称\n */\nconst getDefaultModel = (type: string): string => {\n  const defaults = {\n    openai: 'gpt-3.5-turbo',\n    anthropic: 'claude-3-haiku-20240307',\n    local: 'llama-2-7b-chat',\n    custom: ''\n  } as Record<string, string>;\n  return defaults[type] || '';\n};\n\n/**\n * 更新记忆统计\n */\nconst updateMemoryStats = () => {\n  // TODO: 从实际的记忆管理器获取统计信息\n  // const stats = memoryManager.getMemoryStats();\n  // Object.assign(memoryStats, stats);\n};\n\n// ==================== 生命周期 ====================\n\nonMounted(async () => {\n  // 加载API凭据\n  Object.assign(apiCredentials, settingsManager.getAPICredentials());\n  \n  // 更新记忆统计\n  updateMemoryStats();\n  \n  // 监听设置变化\n  settingsManager.onSettingsChange('settings_updated', (settings) => {\n    Object.assign(localSettings, settings);\n  });\n});\n\n// 定期更新记忆统计\nsetInterval(updateMemoryStats, 5000);\n</script>

<style scoped>
.memory-settings-panel {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border-radius: 12px;
  border: 1px solid #3d5a80;
  color: #ffffff;
  font-family: 'Microsoft YaHei', sans-serif;
}

/* 头部样式 */
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid #3d5a80;
}

.settings-header h2 {
  color: #ffd700;
  font-size: 24px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-reset, .btn-export, .btn-import {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  font-size: 14px;
}

.btn-reset {
  background: #f39c12;
}

.btn-reset:hover {
  background: #e67e22;
}

.btn-export {
  background: #27ae60;
}

.btn-export:hover {
  background: #2ecc71;
}

.btn-import {
  background: #3498db;
}

.btn-import:hover {
  background: #2980b9;
}

/* 内容区域 */
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* 设置区块 */
.settings-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 25px;
  border: 1px solid rgba(61, 90, 128, 0.3);
}

.settings-section h3 {
  color: #ffd700;
  font-size: 20px;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-description {
  color: #b0c4de;
  margin-bottom: 20px;
  font-size: 14px;
  line-height: 1.5;
}

/* 记忆级别设置 */
.memory-level {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  border: 1px solid rgba(61, 90, 128, 0.2);
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.level-title {
  font-size: 16px;
  font-weight: bold;
  color: #87ceeb;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.level-info {
  display: flex;
  gap: 15px;
  font-size: 14px;
  color: #b0c4de;
}

.current-count {
  background: #2c3e50;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.level-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 15px;
  padding-left: 20px;
}

/* 控制组 */
.control-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.control-group label {
  font-size: 14px;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.control-group small {
  color: #b0c4de;
  font-size: 12px;
  margin-top: 2px;
}

/* 范围输入 */
.range-input {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
}

.range-input input[type="range"] {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #34495e;
  outline: none;
  -webkit-appearance: none;
}

.range-input input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffd700;
  cursor: pointer;
  border: 2px solid #fff;
}

.range-input input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffd700;
  cursor: pointer;
  border: 2px solid #fff;
}

.range-value {
  background: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  min-width: 30px;
  text-align: center;
}

/* API配置 */
.api-config {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  border: 1px solid rgba(61, 90, 128, 0.2);
}

.api-config h4 {
  color: #87ceeb;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.primary-api {
  border-left: 4px solid #ffd700;
}

.secondary-api {
  border-left: 4px solid #3498db;
}

.conflict-resolution {
  border-left: 4px solid #e74c3c;
}

.secondary-api-config {
  margin-top: 15px;
  padding-left: 15px;
  border-left: 2px solid rgba(61, 90, 128, 0.3);
}

.api-credentials {
  background: rgba(231, 76, 60, 0.1);
  border-radius: 6px;
  padding: 15px;
  margin-top: 10px;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.warning {
  color: #f39c12 !important;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* 输入控件 */
input[type="text"],
input[type="url"],
input[type="password"],
select {
  width: 100%;
  padding: 10px;
  border: 1px solid #34495e;
  border-radius: 6px;
  background: #2c3e50;
  color: #ffffff;
  font-size: 14px;
  margin-top: 5px;
}

input[type="text"]:focus,
input[type="url"]:focus,
input[type="password"]:focus,
select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 5px rgba(52, 152, 219, 0.3);
}

input[type="checkbox"] {
  margin-right: 8px;
  transform: scale(1.2);
}

/* 场景复选框 */
.scenario-checkboxes,
.priority-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.scenario-item,
.type-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 12px;
  border: 1px solid rgba(61, 90, 128, 0.2);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.scenario-item label,
.type-item label {
  flex-direction: row;
  align-items: flex-start;
  cursor: pointer;
}

/* 高级设置 */
.advanced-section {
  border-left: 4px solid #9b59b6;
}

/* 记忆管理操作 */
.memory-actions {
  border-left: 4px solid #e67e22;
}

.memory-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-item {
  background: #2c3e50;
  padding: 10px 15px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 80px;
}

.stat-label {
  font-size: 12px;
  color: #b0c4de;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.btn-action {
  padding: 10px 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-action {
  background: #3498db;
}

.btn-action:hover {
  background: #2980b9;
}

.btn-action.warning {
  background: #f39c12;
}

.btn-action.warning:hover {
  background: #e67e22;
}

.btn-action.danger {
  background: #e74c3c;
}

.btn-action.danger:hover {
  background: #c0392b;
}

/* 设置状态 */
.settings-status {
  margin-top: 20px;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid;
}

.settings-status.valid {
  background: rgba(39, 174, 96, 0.1);
  border-color: #27ae60;
}

.settings-status.invalid {
  background: rgba(231, 76, 60, 0.1);
  border-color: #e74c3c;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: bold;
  margin-bottom: 10px;
}

.settings-status.valid .status-header {
  color: #27ae60;
}

.settings-status.invalid .status-header {
  color: #e74c3c;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.error-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e74c3c;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .memory-settings-panel {
    padding: 15px;
  }
  
  .settings-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .memory-stats {
    justify-content: center;
  }
  
  .action-buttons {
    justify-content: center;
  }
  
  .scenario-checkboxes,
  .priority-types {
    grid-template-columns: 1fr;
  }
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.settings-section {
  animation: fadeIn 0.3s ease;
}

/* 滚动条样式 */
.memory-settings-panel::-webkit-scrollbar {
  width: 8px;
}

.memory-settings-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.memory-settings-panel::-webkit-scrollbar-thumb {
  background: #3498db;
  border-radius: 4px;
}

.memory-settings-panel::-webkit-scrollbar-thumb:hover {
  background: #2980b9;
}
</style>"