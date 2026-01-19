<template>
  <div class="prompt-panel">
    <div class="panel-header compact">
      <div class="panel-title-compact">
        <span class="title-text">📝 提示词管理</span>
      </div>
      <div class="panel-search">
        <input
          v-model="searchQuery"
          class="search-input"
          type="text"
          placeholder="搜索提示词（名称 / 键名 / 描述）"
          :disabled="Object.keys(promptsByCategory).length === 0"
        />
        <button class="clear-btn" @click="searchQuery = ''" :disabled="!searchQuery" title="清空搜索">×</button>
      </div>
      <div class="panel-actions">
        <button class="action-btn-compact" @click="expandAllCategories" title="全部展开">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button class="action-btn-compact" @click="collapseAllCategories" title="全部折叠">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button class="action-btn-compact" @click="exportPrompts" title="导出全部">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button class="action-btn-compact" @click="importPrompts" title="导入" :disabled="isOnlineMode">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </button>
        <button class="action-btn-compact primary" @click="saveAll" title="保存全部" :disabled="isOnlineMode">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- 联机模式警告 -->
    <div v-if="isOnlineMode" class="online-mode-warning">
      <span class="warning-icon">🔒</span>
      <span class="warning-text">联机模式下提示词仅供查看，无法编辑</span>
    </div>

    <div class="prompt-list">
      <div v-if="Object.keys(displayPromptsByCategory).length === 0" class="empty-search">
        未找到匹配的提示词
      </div>
      <!-- 分类显示 -->
      <div v-for="(categoryData, categoryKey) in displayPromptsByCategory" :key="categoryKey" class="category-section">
        <!-- 分类头部 -->
        <div class="category-header" @click="toggleCategory(String(categoryKey))">
          <div class="category-title">
            <span class="category-icon">{{ categoryData.info.icon }}</span>
            <span class="category-name">{{ categoryData.info.name }}</span>
            <span class="category-count">{{ categoryData.prompts.length }} 个提示词</span>
          </div>
          <div class="category-actions">
            <span class="category-desc">{{ categoryData.info.description }}</span>
            <svg
              class="expand-icon"
              :class="{ expanded: expandedCategories[categoryKey] }"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <!-- 分类内容 -->
        <div v-if="expandedCategories[categoryKey]" class="category-content">
          <div v-for="prompt in categoryData.prompts" :key="prompt.key" class="prompt-item">
            <div class="prompt-header" @click="togglePrompt(prompt.key)">
              <div class="prompt-title-area">
                <!-- 启用/禁用开关 -->
                <label class="toggle-switch" @click.stop>
                  <input
                    type="checkbox"
                    :checked="prompt.enabled"
                    @change="toggleEnabled(prompt.key, ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="toggle-slider"></span>
                </label>
                <!-- 序号已包含在name中，不再单独显示 -->
                <span class="prompt-title" :class="{ disabled: !prompt.enabled }">{{ prompt.name }}</span>
              </div>
              <div class="prompt-meta">
                <div v-if="prompt.weight !== undefined" class="weight-editor" @click.stop>
                  <label class="weight-label">W</label>
                  <input
                    type="number"
                    class="weight-input"
                    :class="getWeightClass(prompt.weight)"
                    :value="prompt.weight"
                    min="1"
                    max="10"
                    :disabled="isOnlineMode"
                    @change="updateWeight(prompt.key, Number(($event.target as HTMLInputElement).value))"
                    @click.stop
                  />
                </div>
                <span v-if="prompt.description" class="prompt-desc" :title="prompt.description">
                  {{ truncateText(prompt.description, 30) }}
                </span>
                <span class="prompt-key" :title="prompt.key" @click.stop>
                  {{ prompt.key }}
                </span>
                <span class="prompt-status" :class="{ modified: prompt.modified }">
                  {{ prompt.modified ? '已修改' : '默认' }}
                </span>
              </div>
            </div>
            <div v-if="expandedPrompts[prompt.key]" class="prompt-content">
              <div v-if="prompt.description" class="prompt-description-full">
                {{ prompt.description }}
              </div>
              <textarea
                v-model="prompt.content"
                @input="markModified(prompt.key)"
                rows="20"
                class="prompt-textarea"
                :disabled="isOnlineMode"
                :class="{ 'readonly-mode': isOnlineMode }"
              ></textarea>
              <div class="prompt-actions">
                <button class="btn-small" @click="resetPrompt(prompt.key)" :disabled="isOnlineMode">重置为默认</button>
                <button class="btn-small" @click="exportSingle(prompt.key)">导出此项</button>
                <button class="btn-small btn-primary" @click="saveSingle(prompt.key)" :disabled="isOnlineMode">保存修改</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { promptStorage, type PromptItem, type PromptsByCategory } from '@/services/promptStorage';
import { toast } from '@/utils/toast';
import { createDadBundle, unwrapDadBundle } from '@/utils/dadBundle';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';

const characterStore = useCharacterStore();
const gameStateStore = useGameStateStore();

// 检测是否为联机模式
const isOnlineMode = computed(() => {
  return characterStore.activeCharacterProfile?.模式 === '联机';
});

// 检测是否开启分步生成
const isSplitGeneration = computed(() => {
  const settings = localStorage.getItem('dad_game_settings');
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      return parsed.splitResponseGeneration !== false; // 默认为true
    } catch {
      return true;
    }
  }
  return true;
});

// 检测是否开启事件系统
const isEventSystemEnabled = computed(() => {
  return gameStateStore.eventSystem?.配置?.启用随机事件 !== false;
});

const promptsByCategory = ref<PromptsByCategory>({});
const expandedPrompts = ref<Record<string, boolean>>({});
const expandedCategories = ref<Record<string, boolean>>({});
const searchQuery = ref('');

const displayPromptsByCategory = computed<PromptsByCategory>(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return promptsByCategory.value;

  const filtered: PromptsByCategory = {};
  for (const [categoryKey, categoryData] of Object.entries(promptsByCategory.value)) {
    const prompts = categoryData.prompts.filter((prompt) => {
      const haystack = [prompt.key, prompt.name, prompt.description ?? ''].join('\n').toLowerCase();
      return haystack.includes(query);
    });
    if (prompts.length > 0) {
      filtered[categoryKey] = { info: categoryData.info, prompts };
    }
  }
  return filtered;
});

onMounted(async () => {
  await loadPrompts();
});

async function loadPrompts() {
  promptsByCategory.value = await promptStorage.loadByCategory({
    isOnlineMode: isOnlineMode.value,
    isSplitGeneration: isSplitGeneration.value,
    isEventSystemEnabled: isEventSystemEnabled.value
  });
  // 默认展开第一个分类
  const firstCategory = Object.keys(promptsByCategory.value)[0];
  if (firstCategory) {
    expandedCategories.value[firstCategory] = true;
  }
}

watch(searchQuery, () => {
  const query = searchQuery.value.trim();
  if (!query) return;
  for (const key of Object.keys(displayPromptsByCategory.value)) {
    expandedCategories.value[key] = true;
  }
});


function toggleCategory(categoryKey: string) {
  expandedCategories.value[categoryKey] = !expandedCategories.value[categoryKey];
}

function togglePrompt(key: string) {
  expandedPrompts.value[key] = !expandedPrompts.value[key];
}

async function toggleEnabled(key: string, enabled: boolean) {
  // 更新本地状态
  for (const categoryKey in promptsByCategory.value) {
    const prompt = promptsByCategory.value[categoryKey].prompts.find(p => p.key === key);
    if (prompt) {
      prompt.enabled = enabled;
      break;
    }
  }
  // 保存到存储
  await promptStorage.setEnabled(key, enabled);
  toast.info(enabled ? '已启用' : '已禁用');
}

function expandAllCategories() {
  for (const key in displayPromptsByCategory.value) {
    expandedCategories.value[key] = true;
  }
}

function collapseAllCategories() {
  for (const key in displayPromptsByCategory.value) {
    expandedCategories.value[key] = false;
  }
  // 同时折叠所有提示词
  expandedPrompts.value = {};
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function getWeightClass(weight: number): string {
  if (weight >= 9) return 'weight-high';
  if (weight >= 6) return 'weight-medium';
  return 'weight-low';
}

function markModified(key: string) {
  // 找到对应的提示词并标记为已修改
  for (const categoryKey in promptsByCategory.value) {
    const prompt = promptsByCategory.value[categoryKey].prompts.find(p => p.key === key);
    if (prompt) {
      prompt.modified = prompt.content !== prompt.default;
      break;
    }
  }
}

/**
 * 更新提示词权重
 */
async function updateWeight(key: string, weight: number) {
  // 验证权重范围
  const clampedWeight = Math.min(10, Math.max(1, Math.round(weight)));

  for (const categoryKey in promptsByCategory.value) {
    const prompt = promptsByCategory.value[categoryKey].prompts.find(p => p.key === key);
    if (prompt) {
      prompt.weight = clampedWeight;
      // 保存到存储（保留当前内容和启用状态）
      await promptStorage.save(key, prompt.content, prompt.enabled, clampedWeight);
      toast.success(`权重已更新为 ${clampedWeight}`);
      break;
    }
  }
}

async function saveSingle(key: string) {
  for (const categoryKey in promptsByCategory.value) {
    const prompt = promptsByCategory.value[categoryKey].prompts.find(p => p.key === key);
    if (prompt) {
      await promptStorage.save(key, prompt.content, prompt.enabled, prompt.weight);
      toast.success(`已保存: ${prompt.name}`);
      break;
    }
  }
}

async function saveAll() {
  let savedCount = 0;
  for (const categoryKey in promptsByCategory.value) {
    for (const prompt of promptsByCategory.value[categoryKey].prompts) {
      if (prompt.modified) {
        await promptStorage.save(prompt.key, prompt.content, prompt.enabled, prompt.weight);
        savedCount++;
      }
    }
  }
  if (savedCount > 0) {
    toast.success(`已保存 ${savedCount} 项修改`);
  } else {
    toast.info('没有需要保存的修改');
  }
}

async function resetPrompt(key: string) {
  for (const categoryKey in promptsByCategory.value) {
    const prompt = promptsByCategory.value[categoryKey].prompts.find(p => p.key === key);
    if (prompt) {
      prompt.content = prompt.default;
      prompt.modified = false;
      await promptStorage.reset(key);
      toast.info(`已重置: ${prompt.name}`);
      break;
    }
  }
}

function exportSingle(key: string) {
  for (const categoryKey in promptsByCategory.value) {
    const prompt = promptsByCategory.value[categoryKey].prompts.find(p => p.key === key);
    if (prompt) {
      const data = createDadBundle('prompts', { [key]: prompt.content });
      downloadJSON(data, `prompt_${key}.json`);
      break;
    }
  }
}

async function exportPrompts() {
  const rawData = await promptStorage.exportAll();
  const data = createDadBundle('prompts', rawData);
  downloadJSON(data, 'prompts_all.json');
  toast.success('已导出全部提示词');
}

function importPrompts() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rawData = JSON.parse(text);
      // 使用 unwrapDadBundle 解析，兼容新旧格式
      const unwrapped = unwrapDadBundle(rawData);
      const promptsData = unwrapped.type === 'prompts' ? unwrapped.payload : rawData;
      const count = await promptStorage.importPrompts(promptsData);
      // 重新加载
      await loadPrompts();
      toast.success(`成功导入 ${count} 个提示词`);
    } catch (error) {
      toast.error('导入失败，请检查文件格式');
    }
  };
  input.click();
}

function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.prompt-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background);
}

/* 联机模式警告样式 */
.online-mode-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(251, 191, 36, 0.15);
  border-bottom: 1px solid rgba(251, 191, 36, 0.3);
  color: #fbbf24;
}

.online-mode-warning .warning-icon {
  font-size: 1rem;
}

.online-mode-warning .warning-text {
  font-size: 0.85rem;
  font-weight: 500;
}

/* 只读模式样式 */
.prompt-textarea.readonly-mode {
  opacity: 0.7;
  cursor: not-allowed;
  background: var(--color-surface-disabled, rgba(100, 100, 100, 0.1));
}

.btn-small:disabled,
.action-btn-compact:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-header.compact {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}


.panel-title-compact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
}

.title-text {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-text);
}

.panel-search {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1 1 260px;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 0.45rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  outline: none;
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.15);
}

.search-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn:not(:disabled):hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.empty-search {
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px dashed var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
  margin: 0.9rem 0;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn-compact:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-btn-compact.primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.action-btn-compact.primary:hover {
  background: var(--color-primary-hover);
}

.prompt-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

/* 分类样式 */
.category-section {
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-surface);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-hover) 100%);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.category-header:hover {
  background: var(--color-surface-hover);
}

.category-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.category-icon {
  font-size: 1.25rem;
}

.category-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
}

.category-count {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: var(--color-background);
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
}

.category-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.category-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.expand-icon {
  transition: transform 0.3s ease;
  color: var(--color-text-secondary);
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.category-content {
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

/* 提示词项目样式 */
.prompt-item {
  border-bottom: 1px solid var(--color-border);
}

.prompt-item:last-child {
  border-bottom: none;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.prompt-header:hover {
  background: var(--color-surface-hover);
}

.prompt-title-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 开关样式 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border);
  transition: 0.3s;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(16px);
}

.toggle-switch:hover .toggle-slider {
  box-shadow: 0 0 4px rgba(var(--color-primary-rgb), 0.4);
}

.prompt-order {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: var(--color-primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
}

.prompt-title {
  font-weight: 500;
  color: var(--color-text);
  transition: opacity 0.2s;
}

.prompt-title.disabled {
  opacity: 0.5;
  text-decoration: line-through;
}

.prompt-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.prompt-key {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.72rem;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  user-select: text;
}

.prompt-desc {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.prompt-status.modified {
  background: rgba(var(--color-warning-rgb), 0.2);
  color: var(--color-warning);
}

/* 权重编辑器 */
.weight-editor {
  display: flex;
  align-items: center;
  gap: 2px;
}

.weight-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.weight-input {
  width: 36px;
  height: 22px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
  background: transparent;
  transition: all 0.2s;
  -moz-appearance: textfield;
}

.weight-input::-webkit-outer-spin-button,
.weight-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.weight-input:hover {
  border-color: var(--color-border);
  background: var(--color-surface);
}

.weight-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.weight-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.weight-input.weight-high {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.weight-input.weight-medium {
  background: rgba(234, 179, 8, 0.2);
  color: #eab308;
}

.weight-input.weight-low {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.prompt-content {
  padding: 1rem 1.25rem;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
}

.prompt-description-full {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.prompt-textarea {
  width: 100%;
  min-height: 400px;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  resize: vertical;
}

.prompt-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.prompt-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  justify-content: flex-end;
}

.btn-small {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-small:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.btn-small.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-small.btn-primary:hover {
  background: var(--color-primary-hover);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .panel-header.compact {
    flex-wrap: wrap;
  }

  .panel-search {
    flex: 1 1 100%;
    min-width: 0;
  }

  .category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .category-actions {
    width: 100%;
    justify-content: space-between;
  }

  .prompt-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .prompt-meta {
    width: 100%;
    justify-content: space-between;
  }

  .prompt-desc {
    max-width: 150px;
  }

  .prompt-textarea {
    min-height: 300px;
  }
}
</style>
