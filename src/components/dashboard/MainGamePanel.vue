<template>
  <div class="main-game-panel">
    <!-- 短期记忆区域 -->
    <div class="memory-section" v-if="showMemorySection">
      <div class="memory-header" @click="toggleMemory">
        <span class="memory-title">📝 短期记忆</span>
        <ChevronDown v-if="memoryExpanded" :size="16" class="memory-icon" />
        <ChevronRight v-else :size="16" class="memory-icon" />
      </div>

      <!-- 下拉悬浮的记忆内容 -->
      <Transition name="memory-dropdown">
        <div v-if="memoryExpanded" class="memory-dropdown">
          <div class="memory-content">
            <div v-for="(memory, index) in recentMemories" :key="index" class="memory-item">
              {{ memory }}
            </div>
            <div v-if="recentMemories.length === 0" class="no-memory">
              脑海中一片清净，尚未留下修行痕迹...
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 文本显示区域 - 当前AI回复 -->
    <div class="content-area" ref="contentAreaRef">
      <div class="main-content-wrapper">
        <!-- 左侧：当前叙述 -->
        <div class="current-narrative">
          <!-- AI处理时显示 -->
          <div v-if="isAIProcessing" class="ai-processing-display">
            <!-- 如果有流式内容则显示 -->
            <div v-if="useStreaming && streamingContent" class="streaming-content">
              <div class="narrative-meta streaming-meta">
                <span class="narrative-time">{{ formatCurrentTime() }}</span>
                <div class="streaming-indicator">
                  <span class="streaming-dot"></span>
                  <span class="streaming-text">接收中 {{ streamingCharCount }} 字</span>
                </div>
                <!-- 空白占位符，用于平衡布局 -->
                <span class="narrative-time-placeholder"></span>
              </div>
              <div class="narrative-text">
                <FormattedText :text="streamingContent" />
              </div>
            </div>
            <!-- 等待响应的加载动画 -->
            <div v-else class="waiting-animation">
              <div class="thinking-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
              <div class="waiting-text">天道感应中...</div>
            </div>
          </div>

          <!-- 非AI处理时显示 -->
          <template v-else>
            <div v-if="currentNarrative" class="narrative-content">
              <div class="narrative-meta">
                <span class="narrative-time">{{ currentNarrative.time }}</span>
                <!-- 变量更新按钮 -->
                <button
                  @click="toggleVariableUpdates"
                  class="variable-updates-toggle"
                  :class="{
                    active: variableUpdatesExpanded,
                    disabled: !lastStateChanges || lastStateChanges.changes.length === 0
                  }"
                  :disabled="!lastStateChanges || lastStateChanges.changes.length === 0"
                  :title="lastStateChanges && lastStateChanges.changes.length > 0 ? '查看本次对话的变量更新' : '暂无变量更新记录'"
                >
                  <Activity :size="16" />
                  <span class="update-count">{{ lastStateChanges?.changes.length || 0 }}</span>
                </button>
              </div>
              <div class="narrative-text">
                <FormattedText :text="currentNarrative.content" />
              </div>
            </div>
            <div v-else class="empty-narrative">
              静待天机变化...
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 悬浮的变量更新面板 -->
    <Transition name="variable-updates-modal">
      <div v-if="variableUpdatesExpanded" 
           class="variable-updates-overlay" 
           @click.self="variableUpdatesExpanded = false">
        <div class="variable-updates-modal">
          <div class="updates-header">
            <h4>🔄 {{ lastStateChanges && lastStateChanges.changes.length > 0 ? '本次对话更新' : '变量更新记录' }}</h4>
            <button @click="variableUpdatesExpanded = false" class="close-updates-btn">
              <ChevronRight :size="16" />
            </button>
          </div>
          
          <div class="updates-content">
            <div v-if="lastStateChanges && lastStateChanges.changes.length > 0" class="changes-list">
              <div 
                v-for="(change, index) in lastStateChanges.changes" 
                :key="index"
                class="change-item"
                :class="change.action"
              >
                <div class="change-header">
                  <span class="change-action">{{ getActionText(change.action) }}</span>
                  <span class="change-key">{{ getVariableDisplayName(change.key) }}</span>
                </div>
                <div class="change-details">
                  <!-- 详细变更说明 -->
                  <div class="change-description">
                    {{ getChangeDescription(change) }}
                  </div>
                  
                  <!-- 数值变化显示 -->
                  <div v-if="change.action === 'set' || change.action === 'update'" class="change-values">
                    <span class="old-value">{{ formatValue(change.oldValue) }}</span>
                    <span class="arrow">→</span>
                    <span class="new-value">{{ formatValue(change.newValue) }}</span>
                  </div>
                  <div v-else-if="change.action === 'add'" class="change-add">
                    <span class="added-value">+ {{ formatValue(change.newValue) }}</span>
                  </div>
                  <div v-else-if="change.action === 'remove'" class="change-remove">
                    <span class="removed-value">- {{ formatValue(change.oldValue) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="no-changes">
              <Activity :size="48" class="empty-icon" />
              <p class="empty-text">暂无变量更新记录</p>
              <p class="empty-hint">进行游戏对话后，这里会显示角色状态的变化</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 输入区域 -->
    <div class="input-section">
      <!-- 动作队列显示区域 -->
      <div v-if="actionQueue.pendingActions.length > 0" class="action-queue-display">
        <div class="queue-header">
          <span class="queue-title">📝 最近操作</span>
          <button @click="clearActionQueue" class="clear-queue-btn" title="清空记录">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="queue-actions">
          <div 
            v-for="(action, index) in actionQueue.pendingActions" 
            :key="action.id" 
            class="queue-action-item"
          >
            <span class="action-text">{{ action.description }}</span>
            <div class="action-controls">
              <button 
                @click="removeActionFromQueue(index)" 
                class="remove-action-btn"
                :title="isUndoableAction(action) ? '撤回并恢复' : '删除此动作'"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="input-wrapper">
        <button
          @click="showActionSelector"
          class="action-selector-btn"
          :disabled="!hasActiveCharacter"
          title="快捷行动"
        >
          <ChevronDown :size="16" />
        </button>

        <div class="input-container">
          <textarea
            v-model="inputText"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
            @keydown="handleKeyDown"
            @input="handleInput"
            :placeholder="hasActiveCharacter ? '请输入您的选择或行动...' : '请先选择角色...'"
            class="game-input"
            ref="inputRef"
            rows="1"
            wrap="soft"
            :disabled="!hasActiveCharacter || isAIProcessing"
          ></textarea>

          <!-- 流式传输选项在输入框内部右侧 -->
          <label class="stream-toggle-inside">
            <input type="checkbox" v-model="useStreaming" />
            <span class="label-text">流式</span>
          </label>
        </div>

        <button
          @click="sendMessage"
          :disabled="!inputText.trim() || isAIProcessing || !hasActiveCharacter"
          class="send-button"
        >
          <Loader2 v-if="isAIProcessing" :size="16" class="animate-spin" />
          <Send v-else :size="16" />
        </button>
      </div>

      <!-- 行动选择弹窗 -->
      <div v-if="showActionModal" class="action-modal-overlay" @click.self="hideActionSelector">
        <div class="action-modal">
          <div class="modal-header">
            <h3>🎯 快捷行动</h3>
            <button @click="hideActionSelector" class="close-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="action-grid">
            <button
              v-for="action in flatActions"
              :key="action.name"
              @click="selectAction(action)"
              class="quick-action-btn"
              :class="action.type"
            >
              <div class="action-icon">{{ action.icon }}</div>
              <div class="action-text">{{ action.name }}</div>
            </button>
          </div>
        </div>
      </div>

      <!-- 行动配置弹窗 -->
      <div v-if="selectedAction" class="action-config-overlay" @click.self="cancelAction">
        <div class="action-config-modal">
          <div class="config-header">
            <h3>{{ selectedAction.icon }} {{ selectedAction.name }}</h3>
            <button @click="cancelAction" class="close-btn">×</button>
          </div>
          <div class="config-content">
            <p class="action-description">{{ selectedAction.description }}</p>

            <!-- 时间配置 -->
            <div v-if="selectedAction.timeRequired" class="config-section">
              <label class="config-label">修炼时间</label>
              <div class="time-selector">
                <button
                  v-for="timeOption in timeOptions"
                  :key="timeOption.value"
                  @click="selectedTime = timeOption.value"
                  class="time-btn"
                  :class="{ active: selectedTime === timeOption.value }"
                >
                  {{ timeOption.label }}
                </button>
              </div>
              <div class="time-custom">
                <label>自定义：</label>
                <input
                  v-model.number="customTime"
                  type="number"
                  min="1"
                  max="365"
                  class="time-input"
                /> 天
              </div>
            </div>

            <!-- 其他配置选项 -->
            <div v-if="selectedAction.options" class="config-section">
              <label class="config-label">选项</label>
              <div class="action-options">
                <label
                  v-for="option in selectedAction.options"
                  :key="option.key"
                  class="option-item"
                >
                  <input
                    type="radio"
                    :name="'option-' + selectedAction.name"
                    :value="option.key"
                    v-model="selectedOption"
                  />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="config-actions">
            <button @click="cancelAction" class="cancel-btn">取消</button>
            <button @click="confirmAction" class="confirm-btn">确认</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { Send, Loader2, ChevronDown, ChevronRight, Activity } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { useActionQueueStore } from '@/stores/actionQueueStore';
import { EnhancedActionQueueManager } from '@/utils/enhancedActionQueue';
import { getTavernHelper } from '@/utils/tavern';
import { MultiLayerMemorySystem } from '@/utils/MultiLayerMemorySystem';
import { AIBidirectionalSystem } from '@/utils/AIBidirectionalSystem';
import { GameStateManager } from '@/utils/GameStateManager';
import { RuntimeReasonabilityValidator, type DifficultyLevel, type AuditResult } from '@/utils/prompts/reasonabilityAudit';
import { toast } from '@/utils/toast';
import FormattedText from '@/components/common/FormattedText.vue';
import type { GameMessage, SaveData, CharacterProfile } from '@/types/game';
import type { GM_Response } from '@/types/AIGameMaster';

// 定义状态变更日志类型
interface StateChangeLog {
  changes: Array<{
    key: string;
    action: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

const inputText = ref('');
const isInputFocused = ref(false);
const isAIProcessing = ref(false);
const inputRef = ref<HTMLTextAreaElement>();
const contentAreaRef = ref<HTMLDivElement>();
const memoryExpanded = ref(false);
const showMemorySection = ref(true);

// 切换记忆面板
const toggleMemory = () => {
  memoryExpanded.value = !memoryExpanded.value;
};

// AI处理状态持久化 - 在面板切换时保持等待状态
const persistAIProcessingState = () => {
  if (isAIProcessing.value) {
    sessionStorage.setItem('ai-processing-state', 'true');
    sessionStorage.setItem('ai-processing-timestamp', Date.now().toString());
  } else {
    sessionStorage.removeItem('ai-processing-state');
    sessionStorage.removeItem('ai-processing-timestamp');
  }
};

// 恢复AI处理状态
const restoreAIProcessingState = () => {
  const saved = sessionStorage.getItem('ai-processing-state');
  const timestamp = sessionStorage.getItem('ai-processing-timestamp');
  
  if (saved === 'true' && timestamp) {
    const elapsed = Date.now() - parseInt(timestamp);
    // 如果超过5分钟，认为已超时，清除状态
    if (elapsed < 5 * 60 * 1000) {
      isAIProcessing.value = true;
      console.log('[状态恢复] 恢复AI处理状态');
    } else {
      sessionStorage.removeItem('ai-processing-state');
      sessionStorage.removeItem('ai-processing-timestamp');
    }
  }
};

// 监听AI处理状态变化
watch(isAIProcessing, persistAIProcessingState);

// 行动选择相关
const showActionModal = ref(false);
const selectedAction = ref<ActionItem | null>(null);
const selectedTime = ref(1);
const customTime = ref(1);
const selectedOption = ref('');

// 行动类型定义
interface ActionItem {
  name: string;
  icon: string;
  type: string;
  description: string;
  timeRequired?: boolean;
  options?: Array<{ key: string; label: string }>;
}

const characterStore = useCharacterStore();
const actionQueue = useActionQueueStore();
const enhancedActionQueue = EnhancedActionQueueManager.getInstance();
const memorySystem = MultiLayerMemorySystem.getInstance();
const bidirectionalSystem = AIBidirectionalSystem.getInstance();
const gameStateManager = GameStateManager.getInstance();

// 流式输出状态
const streamingMessageIndex = ref<number | null>(null);
const streamingContent = ref('');
const useStreaming = ref(true);
const streamingCharCount = computed(() => streamingContent.value.length);

// 合理性审查配置
const auditDifficulty = ref<DifficultyLevel>('normal');

const gameMessages = ref<GameMessage[]>([]);

// 变量更新面板状态
const variableUpdatesExpanded = ref(false);
const lastStateChanges = ref<StateChangeLog | null>(null);

// 切换变量更新面板
const toggleVariableUpdates = () => {
  variableUpdatesExpanded.value = !variableUpdatesExpanded.value;
};

// 获取操作文本 - 增强版本，提供详细的中文说明
const getActionText = (action: string): string => {
  const actionMap: Record<string, string> = {
    'add': '新增',
    'set': '设定',
    'update': '更新',
    'remove': '删除',
    'delete': '删除', 
    'push': '添加',
    'pull': '移除',
    'inc': '递增',
    'dec': '递减',
    'append': '追加',
    'prepend': '前置',
    'merge': '合并',
    'replace': '替换',
    'clear': '清空',
    'reset': '重置'
  };
  return actionMap[action] || action;
};

// 获取变量显示名称 - 将技术性的变量路径转换为用户友好的名称
const getVariableDisplayName = (key: string): string => {
  const nameMap: Record<string, string> = {
    // 角色基础属性
    'character.saveData.角色属性.生命值': '生命值',
    'character.saveData.角色属性.灵力值': '灵力值',
    'character.saveData.角色属性.境界': '修炼境界',
    'character.saveData.角色属性.修为': '修为',
    'character.saveData.角色属性.经验值': '经验值',
    
    // 背包相关
    'character.saveData.背包.灵石.下品': '下品灵石',
    'character.saveData.背包.灵石.中品': '中品灵石', 
    'character.saveData.背包.灵石.上品': '上品灵石',
    'character.saveData.背包.灵石.极品': '极品灵石',
    'character.saveData.背包.物品': '背包物品',
    
    // 装备栏
    'character.saveData.装备栏': '装备栏',
    'character.saveData.装备栏.装备1': '装备栏1',
    'character.saveData.装备栏.装备2': '装备栏2',
    'character.saveData.装备栏.装备3': '装备栏3',
    
    // 修炼功法
    'character.saveData.修炼功法.功法': '修炼功法',
    'character.saveData.修炼功法.熟练度': '功法熟练度',
    'character.saveData.修炼功法.修炼时间': '修炼时间',
    
    // 游戏进度
    'character.saveData.游戏进度.当前章节': '当前章节',
    'character.saveData.游戏进度.完成任务': '完成任务',
    'character.saveData.游戏进度.解锁区域': '解锁区域',
    
    // 人际关系
    'character.saveData.人际关系': '人际关系',
    'character.saveData.声望.宗门声望': '宗门声望',
    'character.saveData.声望.江湖声望': '江湖声望',
    
    // 记忆系统
    'character.shortTermMemories': '短期记忆',
    'character.midTermMemories': '中期记忆',
    'character.longTermMemories': '长期记忆'
  };
  
  // 如果有精确匹配，返回对应的中文名称
  if (nameMap[key]) {
    return nameMap[key];
  }
  
  // 模式匹配 - 处理动态生成的键名
  if (key.includes('character.saveData.背包.物品.')) {
    const itemId = key.split('.').pop();
    return `物品: ${itemId?.substring(0, 10)}...`;
  }
  
  if (key.includes('character.saveData.人际关系.')) {
    const npcName = key.split('.').pop();
    return `关系: ${npcName}`;
  }
  
  if (key.includes('.装备')) {
    return '装备栏位';
  }
  
  // 去除技术前缀，保留有意义的部分
  const simplifiedKey = key
    .replace('character.saveData.', '')
    .replace('character.', '')
    .split('.')
    .slice(-2) // 取最后两段
    .join('.');
    
  return simplifiedKey;
};

// 生成变更描述 - 提供上下文相关的详细说明
const getChangeDescription = (change: { key: string; action: string; oldValue: unknown; newValue: unknown }): string => {
  const { key, action, oldValue, newValue } = change;
  
  // 根据变量类型和操作类型生成描述
  if (key.includes('灵石')) {
    const stoneName = getVariableDisplayName(key);
    if (action === 'set') {
      return `${stoneName}数量变更为 ${formatValue(newValue)}`;
    } else if (action === 'add') {
      return `获得了 ${formatValue(newValue)} 枚${stoneName}`;
    } else if (action === 'inc') {
      const diff = Number(newValue) - Number(oldValue);
      return `${stoneName}增加了 ${diff} 枚`;
    }
  }
  
  if (key.includes('生命值') || key.includes('灵力值')) {
    const attrName = getVariableDisplayName(key);
    if (action === 'set') {
      const change = Number(newValue) - Number(oldValue);
      const direction = change > 0 ? '恢复' : '损失';
      return `${attrName}${direction}了 ${Math.abs(change)} 点`;
    }
  }
  
  if (key.includes('境界') || key.includes('修为')) {
    if (action === 'set') {
      return `修炼境界从 ${formatValue(oldValue)} 提升到 ${formatValue(newValue)}`;
    }
  }
  
  if (key.includes('背包.物品')) {
    if (action === 'add') {
      return `获得了新物品`;
    } else if (action === 'remove') {
      return `失去了物品`;
    } else if (action === 'set') {
      return `物品属性发生变化`;
    }
  }
  
  if (key.includes('装备栏')) {
    if (action === 'set') {
      if (newValue && !oldValue) {
        return `装备了新的法宝`;
      } else if (!newValue && oldValue) {
        return `卸下了装备`;
      } else {
        return `更换了装备`;
      }
    }
  }
  
  if (key.includes('修炼功法')) {
    if (action === 'set') {
      if (newValue && !oldValue) {
        return `开始修炼新功法`;
      } else if (!newValue && oldValue) {
        return `停止修炼功法`;
      } else {
        return `切换修炼功法`;
      }
    }
  }
  
  if (key.includes('人际关系')) {
    if (action === 'set') {
      const changeAmount = Number(newValue) - Number(oldValue);
      if (changeAmount > 0) {
        return `关系好感度提升了 ${changeAmount} 点`;
      } else {
        return `关系好感度下降了 ${Math.abs(changeAmount)} 点`;
      }
    } else if (action === 'add') {
      return `建立了新的人际关系`;
    }
  }
  
  if (key.includes('记忆')) {
    if (action === 'add') {
      return `新增了记忆条目`;
    } else if (action === 'set') {
      return `记忆内容发生变化`;
    }
  }
  
  // 默认描述
  const actionText = getActionText(action);
  const varName = getVariableDisplayName(key);
  
  if (action === 'set' || action === 'update') {
    return `${actionText}了${varName}的数值`;
  } else if (action === 'add') {
    return `${actionText}了${varName}`;
  } else if (action === 'remove') {
    return `${actionText}了${varName}`;
  }
  
  return `对${varName}执行了${actionText}操作`;
};
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '空';
  }
  
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  
  if (typeof value === 'number') {
    // 格式化数字显示
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}千`;
    }
    return value.toString();
  }
  
  if (typeof value === 'string') {
    // 字符串长度控制和特殊值处理
    if (value.length === 0) return '空字符串';
    if (value.length > 50) {
      return `${value.substring(0, 47)}...`;
    }
    return value;
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '空数组';
    if (value.length <= 3) {
      return `[${value.map(v => formatValue(v)).join(', ')}]`;
    }
    return `[${value.length}项数组]`;
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '空对象';
    if (keys.length <= 2) {
      return `{${keys.join(', ')}}`;
    }
    return `{${keys.length}个属性}`;
  }
  
  return String(value);
};

// 当前显示的叙述内容（只显示最新的AI回复）
const currentNarrative = ref<GameMessage | null>(null);

// 短期记忆设置 - 可配置
const maxShortTermMemories = ref(5); // 默认5条，避免token过多
const maxMidTermMemories = ref(20); // 默认20条，可自由配置
// 长期记忆无限制，不设上限

// 从设置加载记忆配置
const loadMemorySettings = () => {
  try {
    // 从localStorage读取设置
    const memorySettings = localStorage.getItem('memory-settings');
    if (memorySettings) {
      const settings = JSON.parse(memorySettings);
      if (settings.maxShortTerm) maxShortTermMemories.value = settings.maxShortTerm;
      if (settings.maxMidTerm) maxMidTermMemories.value = settings.maxMidTerm;
      console.log('[记忆设置] 已加载配置:', { 
        短期记忆上限: maxShortTermMemories.value, 
        中期记忆上限: maxMidTermMemories.value 
      });
    }
  } catch (error) {
    console.warn('[记忆设置] 加载配置失败，使用默认值:', error);
  }
};

// 保存记忆配置
const saveMemorySettings = () => {
  try {
    const settings = {
      maxShortTerm: maxShortTermMemories.value,
      maxMidTerm: maxMidTermMemories.value
    };
    localStorage.setItem('memory-settings', JSON.stringify(settings));
    console.log('[记忆设置] 已保存配置:', settings);
  } catch (error) {
    console.warn('[记忆设置] 保存配置失败:', error);
  }
};

// 更新记忆配置的外部接口
const updateMemorySettings = (shortTerm?: number, midTerm?: number) => {
  if (shortTerm !== undefined && shortTerm > 0) {
    maxShortTermMemories.value = shortTerm;
  }
  if (midTerm !== undefined && midTerm > 0) {
    maxMidTermMemories.value = midTerm;
  }
  saveMemorySettings();
  console.log('[记忆设置] 配置已更新:', { 
    短期记忆上限: maxShortTermMemories.value, 
    中期记忆上限: maxMidTermMemories.value 
  });
};

// 暴露给父组件（如果需要）
defineExpose({
  updateMemorySettings,
  getMemorySettings: () => ({
    maxShortTerm: maxShortTermMemories.value,
    maxMidTerm: maxMidTermMemories.value
  })
});

// 计算属性：检查是否有激活的角色
const hasActiveCharacter = computed(() => {
  const profile = characterStore.activeCharacterProfile;
  console.log('[主面板] 激活角色检查:', {
    hasProfile: !!profile,
    profileName: profile?.角色基础信息?.名字,
    activeSlot: characterStore.rootState.当前激活存档
  });
  return !!profile;
});

// 计算属性：角色名称
const characterName = computed(() => {
  return characterStore.activeCharacterProfile?.角色基础信息?.名字 || '无名道友';
});

// 扁平化的行动列表，用于简化UI显示
const flatActions = computed(() => {
  const actions: ActionItem[] = [];
  actionCategories.value.forEach(category => {
    actions.push(...category.actions);
  });
  return actions;
});

// 时间选项
const timeOptions = ref([
  { label: '1天', value: 1 },
  { label: '3天', value: 3 },
  { label: '7天', value: 7 },
  { label: '30天', value: 30 }
]);

// 行动分类数据
const actionCategories = ref([
  {
    name: '修炼',
    icon: '🧘',
    actions: [
      {
        name: '基础修炼',
        icon: '⚡',
        type: 'cultivation',
        description: '进行基础的修为修炼，提升境界',
        timeRequired: true
      },
      {
        name: '炼体',
        icon: '💪',
        type: 'cultivation',
        description: '锻炼肉身，增强体质',
        timeRequired: true
      },
      {
        name: '冥想',
        icon: '🌟',
        type: 'cultivation',
        description: '静心冥想，稳固心境',
        timeRequired: true
      }
    ]
  },
  {
    name: '探索',
    icon: '🗺️',
    actions: [
      {
        name: '野外探索',
        icon: '🌲',
        type: 'exploration',
        description: '前往野外探索，寻找机缘',
        options: [
          { key: 'nearby', label: '附近区域' },
          { key: 'far', label: '远方区域' },
          { key: 'dangerous', label: '危险区域' }
        ]
      },
      {
        name: '城镇逛街',
        icon: '🏛️',
        type: 'exploration',
        description: '在城镇中闲逛，了解信息',
        options: [
          { key: 'market', label: '集市' },
          { key: 'tavern', label: '酒楼' },
          { key: 'shop', label: '商铺' }
        ]
      }
    ]
  },
  {
    name: '交流',
    icon: '💬',
    actions: [
      {
        name: '拜访朋友',
        icon: '👥',
        type: 'social',
        description: '拜访认识的朋友',
        options: [
          { key: 'random', label: '随机拜访' },
          { key: 'close', label: '亲密朋友' }
        ]
      },
      {
        name: '结交新友',
        icon: '🤝',
        type: 'social',
        description: '主动结交新的朋友'
      }
    ]
  },
  {
    name: '其他',
    icon: '⚙️',
    actions: [
      {
        name: '休息',
        icon: '😴',
        type: 'other',
        description: '好好休息，恢复精神',
        timeRequired: true
      },
      {
        name: '查看状态',
        icon: '📊',
        type: 'other',
        description: '查看当前的详细状态'
      }
    ]
  }
]);

// 行动选择器函数
const showActionSelector = () => {
  showActionModal.value = true;
};

const hideActionSelector = () => {
  showActionModal.value = false;
};

const selectAction = (action: ActionItem) => {
  selectedAction.value = action;
  showActionModal.value = false;

  // 重置选择
  selectedTime.value = 1;
  customTime.value = 1;
  selectedOption.value = '';

  // 如果不需要配置，直接执行
  if (!action.timeRequired && !action.options) {
    confirmAction();
  }
};

const cancelAction = () => {
  selectedAction.value = null;
  selectedTime.value = 1;
  customTime.value = 1;
  selectedOption.value = '';
};

const confirmAction = () => {
  if (!selectedAction.value) return;

  let actionText = selectedAction.value.name;

  // 添加时间信息
  if (selectedAction.value.timeRequired) {
    const time = customTime.value > 0 ? customTime.value : selectedTime.value;
    actionText += `（${time}天）`;
  }

  // 添加选项信息
  if (selectedOption.value && selectedAction.value.options) {
    const option = selectedAction.value.options.find(opt => opt.key === selectedOption.value);
    if (option) {
      actionText += `（${option.label}）`;
    }
  }

  // 填充到输入框
  inputText.value = actionText;

  // 清理状态
  cancelAction();

  // 聚焦输入框
  nextTick(() => {
    inputRef.value?.focus();
  });
};

// 中期记忆临时数组
const midTermMemoryBuffer = ref<string[]>([]);

// 短期记忆获取 - 统一从酒馆变量获取
const recentMemories = computed(() => {
  try {
    console.log('[短期记忆] 开始获取短期记忆数据...');
    
    // 从存档数据获取短期记忆
    const save = characterStore.activeSaveSlot;
    const sd = save?.存档数据;
    if (sd?.记忆?.短期记忆) {
      const memories = sd.记忆.短期记忆.slice(0, maxShortTermMemories.value);
      console.log('[短期记忆] 从存档数据获取:', memories.length, '条记忆');
      return memories;
    }
    
    console.log('[短期记忆] 存档中未找到短期记忆数据');
    return [];
  } catch (error) {
    console.warn('[短期记忆] 获取短期记忆失败:', error);
    return [];
  }
});

// AI响应结构验证
const validateAIResponse = (response: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!response) {
    errors.push('AI响应为空');
    return { isValid: false, errors };
  }
  
  // 检查基本结构
  if (!response.text || typeof response.text !== 'string') {
    errors.push('缺少有效的text字段');
  }
  
  // 检查mid_term_memory字段（可选）
  if (response.mid_term_memory && typeof response.mid_term_memory !== 'string') {
    errors.push('mid_term_memory字段格式不正确');
  }
  
  // 检查tavern_commands字段（可选）
  if (response.tavern_commands) {
    if (!Array.isArray(response.tavern_commands)) {
      errors.push('tavern_commands字段必须是数组');
    } else {
      // 检查每个命令的基本结构
      response.tavern_commands.forEach((cmd: any, index: number) => {
        if (!cmd || typeof cmd !== 'object') {
          errors.push(`tavern_commands[${index}]不是有效对象`);
        } else if (!cmd.command || !cmd.target) {
          errors.push(`tavern_commands[${index}]缺少必要字段(command/target)`);
        }
      });
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

// 重新请求AI响应（当结构验证失败时）
const retryAIResponse = async (
  userMessage: string, 
  character: CharacterProfile, 
  gameState: Record<string, unknown>,
  previousErrors: string[],
  maxRetries: number = 2
): Promise<Record<string, unknown> | null> => {
  console.log('[AI响应重试] 开始重试，之前的错误:', previousErrors);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI响应重试] 第${attempt}次尝试`);
      
      // 在用户消息中添加结构要求
      const enhancedMessage = `${userMessage}

【重要提醒】请严格按照以下JSON结构返回响应：
{
  "text": "正文内容，用于短期记忆和显示",
  "mid_term_memory": "可选-精简的中期记忆内容，包含关键事件和变化",
  "tavern_commands": [
    {"command": "操作类型", "target": "目标变量", "value": "新值"}
  ]
}

上次响应的问题：${previousErrors.join(', ')}
请修正这些问题并确保结构正确。`;

      const aiResponse = await bidirectionalSystem.processPlayerAction(
        enhancedMessage,
        character,
        gameState,
        { 
          onProgressUpdate: (progress: string) => {
            console.log('[AI重试进度]', progress);
          }
        }
      );

      if (aiResponse.gmResponse) {
        const validation = validateAIResponse(aiResponse.gmResponse);
        if (validation.isValid) {
          console.log(`[AI响应重试] 第${attempt}次尝试成功`);
          return aiResponse;
        } else {
          console.warn(`[AI响应重试] 第${attempt}次尝试验证失败:`, validation.errors);
          previousErrors = validation.errors;
        }
      }
    } catch (error) {
      console.error(`[AI响应重试] 第${attempt}次尝试出错:`, error);
    }
  }
  
  console.error('[AI响应重试] 所有重试尝试都失败了');
  return null;
};

// 执行合理性审查
const performReasonabilityAudit = async (
  gmResponse: GM_Response,
  character: SaveData,
  userAction: string
): Promise<AuditResult> => {
  try {
    // 使用运行时验证器进行审查
    const auditResult = RuntimeReasonabilityValidator.validateGMResponse(
      gmResponse,
      character,
      userAction,
      auditDifficulty.value
    );

    // 记录审查结果
    console.log('[合理性审查] 审查完成:', {
      isValid: auditResult.isValid,
      confidence: auditResult.confidence,
      issues: auditResult.issues.length,
      difficulty: auditDifficulty.value
    });

    return auditResult;
  } catch (error) {
    console.error('[合理性审查] 审查过程出错:', error);
    // 返回默认通过结果，避免阻塞游戏流程
    return {
      isValid: true,
      confidence: 0.5,
      issues: [],
      suggestions: ['审查系统暂时不可用']
    };
  }
};

const handleStreamingResponse = (chunk: string) => {
  if (streamingMessageIndex.value !== null) {
    streamingContent.value += chunk;
    // 更新流式消息内容
    const message = gameMessages.value[streamingMessageIndex.value];
    if (message) {
      message.content = streamingContent.value;
      // 自动滚动到底部
      nextTick(() => {
        if (contentAreaRef.value) {
          contentAreaRef.value.scrollTop = contentAreaRef.value.scrollHeight;
        }
      });
    }
  }
};

// 检查动作是否可撤回
const isUndoableAction = (action: { type: string }): boolean => {
  // NPC交互类操作不支持撤回，只能删除
  const npcInteractionTypes = ['npc_trade', 'npc_request', 'npc_steal'];
  if (npcInteractionTypes.includes(action.type)) {
    return false;
  }
  // 其他操作支持撤回
  return ['equip', 'unequip', 'use', 'cultivate'].includes(action.type);
};

// 动作队列管理方法
const clearActionQueue = async () => {
  actionQueue.clearActions();
  toast.success('操作记录已清空');
};

const removeActionFromQueue = async (index: number) => {
  if (index >= 0 && index < actionQueue.pendingActions.length) {
    const action = actionQueue.pendingActions[index];
    
    // NPC交互类操作不支持撤回，只能删除
    const npcInteractionTypes = ['npc_trade', 'npc_request', 'npc_steal'];
    if (npcInteractionTypes.includes(action.type)) {
      actionQueue.removeAction(action.id);
      toast.success('已移除NPC交互动作');
      return;
    }
    
    // 如果是装备、卸下、使用或修炼类操作，尝试按名称精准撤回
    if (['equip', 'unequip', 'use', 'cultivate'].includes(action.type)) {
      const success = await enhancedActionQueue.undoByItemName(action.type as any, action.itemName);
      if (success) {
        toast.success('已撤回并恢复');
        return;
      }
    }
    
    // 普通删除操作
    actionQueue.removeAction(action.id);
    toast.success('已移除动作');
  }
};

// 发送消息给AI（优化版）
const sendMessage = async () => {
  if (!inputText.value.trim()) return;
  if (isAIProcessing.value) {
    toast.warning('AI正在处理中，请稍等...');
    return;
  }
  if (!hasActiveCharacter.value) {
    toast.error('请先选择或创建角色');
    return;
  }

  // 清空上一轮的状态变更记录，确保每次交互都只显示最新的变化
  lastStateChanges.value = null;

  const userMessage = inputText.value.trim();

  // 获取动作队列中的文本
  const actionQueueText = actionQueue.getActionPrompt();

  // 将动作队列文本和用户输入合并
  const finalUserMessage = actionQueueText ?
    `${userMessage}${actionQueueText}` :
    userMessage;

  // 清空动作队列（动作已经添加到消息中）
  if (actionQueueText) {
    actionQueue.clearActions();
  }

  // 重置输入框高度
  nextTick(() => {
    adjustTextareaHeight();
  });

  // 用户消息只作为行动趋向提示词，不添加到消息历史和记忆中
  // 不调用 addMessage 和 addToShortTermMemory

  isAIProcessing.value = true;

  try {
    // 获取当前游戏状态
    const gameState = gameStateManager.getCurrentState();
    const character = characterStore.activeCharacterProfile;

    if (!character) {
      throw new Error('角色数据缺失');
    }

    // 用户消息不存储到记忆，只作为行动提示词使用
    // 移除: await addToShortTermMemory(userMessage, 'user');

    // 初始化流式输出
    const streamingMessageIndex_local = gameMessages.value.length;
    streamingMessageIndex.value = streamingMessageIndex_local;
    streamingContent.value = '';

    // 添加AI响应占位消息
    addMessage({
      type: 'ai',
      content: '',
      time: formatCurrentTime()
    });

    // 使用优化的AI请求系统进行双向交互
    let aiResponse: Record<string, unknown> | null = null;

    try {
      const options: Record<string, unknown> = {
        onProgressUpdate: (progress: string) => {
          console.log('[AI进度]', progress);
        },
        onStateChange: (newState: Record<string, unknown>) => {
          try {
            gameStateManager.updateState(newState);
          } catch (error) {
            console.error('[状态更新] 更新失败:', error);
          }
        }
      };
      if (useStreaming.value) {
        options.onStreamChunk = handleStreamingResponse;
      }
      
      aiResponse = await bidirectionalSystem.processPlayerAction(
        finalUserMessage,
        character,
        gameState,
        options
      );

      // 验证AI响应结构
      if (aiResponse.gmResponse) {
        const validation = validateAIResponse(aiResponse.gmResponse);
        if (!validation.isValid) {
          console.warn('[AI响应验证] 结构验证失败:', validation.errors);
          toast.warning('AI响应格式不正确，正在重试...');
          
          // 尝试重新生成
          const retryResponse = await retryAIResponse(
            finalUserMessage,
            character,
            gameState,
            validation.errors
          );
          
          if (retryResponse) {
            aiResponse = retryResponse;
            toast.success('AI响应重试成功');
          } else {
            toast.error('AI响应重试失败，使用原始响应');
          }
        }
      }

      // 合理性审查检查
      const sdForAudit = characterStore.activeSaveSlot?.存档数据;
      if (aiResponse.gmResponse && sdForAudit) {
        const auditResult = await performReasonabilityAudit(
          aiResponse.gmResponse as GM_Response,
          sdForAudit,
          userMessage
        );
        if (!auditResult.isValid) {
          console.warn('[合理性审查] 检测到不合理内容:', auditResult.issues);

          if (auditResult.adjustedResponse) {
            aiResponse.gmResponse = auditResult.adjustedResponse;
            toast.info('AI响应已根据游戏规则进行调整');
          } else {
            toast.warning('AI响应可能不完全合理，已记录审查结果');
          }
        } else {
          console.log('[合理性审查] 响应通过审查，可信度:', auditResult.confidence.toFixed(2));
        }
      }

      // 完成流式输出
      streamingMessageIndex.value = null;

      // 处理AI返回的完整响应 - 支持三种数据结构
      if (aiResponse.gmResponse) {
        const gmResp = aiResponse.gmResponse as GM_Response;
        
        // 1. 处理正文内容 (text) - 用于短期记忆和显示
        let finalText = '';
        if (gmResp.text && typeof gmResp.text === 'string') {
          finalText = gmResp.text;
        } else if (aiResponse.finalContent && typeof aiResponse.finalContent === 'string') {
          finalText = aiResponse.finalContent;
        }
        
        if (finalText) {
          const finalMessage = gameMessages.value[streamingMessageIndex_local];
          if (finalMessage) {
            finalMessage.content = finalText;
          }
          
          // 添加正文内容到短期记忆
          await addToShortTermMemory(finalText, 'assistant');
          console.log('[AI响应处理] 正文内容已添加到短期记忆');
        }
        
        // 2. 处理中期记忆 (mid_term_memory) - 作为预处理记忆，进入短期记忆流转
        if (gmResp.mid_term_memory && typeof gmResp.mid_term_memory === 'string') {
          // 按照设计，AI返回的mid_term_memory作为“预处理”的中期记忆，先进入短期记忆流转
          await addToShortTermMemory(gmResp.mid_term_memory, 'assistant');
          console.log('[AI响应处理] AI建议的中期记忆已添加到短期记忆流转:', gmResp.mid_term_memory.substring(0, 50));
        }
        
        // 3. tavern_commands 在 AIBidirectionalSystem 中已处理
        if (gmResp.tavern_commands && Array.isArray(gmResp.tavern_commands) && gmResp.tavern_commands.length > 0) {
          console.log('[AI响应处理] tavern_commands 已由AI双向系统处理:', gmResp.tavern_commands.length, '条指令');
        }
      } else if (aiResponse.finalContent && typeof aiResponse.finalContent === 'string') {
        // 备用处理：如果没有 gmResponse 但有 finalContent
        const finalMessage = gameMessages.value[streamingMessageIndex_local];
        if (finalMessage) {
          finalMessage.content = aiResponse.finalContent;
        }
        
        // 添加到短期记忆
        await addToShortTermMemory(aiResponse.finalContent, 'assistant');
        console.log('[AI响应处理] 备用路径：finalContent 已添加到短期记忆');
      }

      // 处理游戏状态更新
      if (aiResponse.stateChanges) {
        await gameStateManager.applyStateChanges(aiResponse.stateChanges);
        characterStore.updateCharacterData(aiResponse.stateChanges);
        
        // 更新变量更新面板显示
        lastStateChanges.value = aiResponse.stateChanges as StateChangeLog;
        console.log('[变量更新] 状态变更已记录:', lastStateChanges.value);
      }

      // 处理记忆更新
      if (aiResponse.memoryUpdates) {
        await memorySystem.processMemoryUpdates(aiResponse.memoryUpdates);
      }

    } catch (aiError) {
      console.error('[AI处理失败]', aiError);

      // 回退到简化处理
      const fallbackResponse = await generateFallbackResponse(userMessage);

      const finalMessage = gameMessages.value[streamingMessageIndex_local];
      if (finalMessage) {
        finalMessage.content = fallbackResponse;
      }

      streamingMessageIndex.value = null;
      toast.warning('AI系统繁忙，使用备用响应');

      // 创建空的响应对象以避免后续错误
      aiResponse = { systemMessages: [], finalContent: '', stateChanges: null, memoryUpdates: null };
    }

    // 添加系统消息（如果有）
    if (aiResponse && aiResponse.systemMessages && Array.isArray(aiResponse.systemMessages)) {
      aiResponse.systemMessages.forEach((msg: string) => {
        addMessage({
          type: 'system',
          content: msg,
          time: formatCurrentTime()
        });
      });
    }

    // 保存对话历史
    saveConversationHistory();

    toast.success('天道已应');

  } catch (error: unknown) {
    console.error('[AI交互] 处理失败:', error);

    // 清理流式输出状态
    streamingMessageIndex.value = null;
    streamingContent.value = '';

    // 移除占位消息，添加错误消息
    if (gameMessages.value.length > 0) {
      gameMessages.value.pop();
    }

    addMessage({
      type: 'system',
      content: `【天道无应】${error instanceof Error ? error.message : '修仙路上遇到了未知阻碍'}`,
      time: formatCurrentTime()
    });

    toast.error('天道无应，请稍后再试');
  } finally {
    isAIProcessing.value = false;
    // 清除状态持久化
    persistAIProcessingState();
  }
};

// 添加消息 - 简化版本
const addMessage = (message: GameMessage) => {
  // 更新当前显示的叙述（显示AI和GM消息）
  if (message.type === 'ai' || message.type === 'gm') {
    currentNarrative.value = message;
  }

  // 保存到完整消息历史
  gameMessages.value.push(message);

  // 自动保存对话历史
  saveConversationHistory();

  // 滚动到底部
  nextTick(() => {
    if (contentAreaRef.value) {
      contentAreaRef.value.scrollTop = contentAreaRef.value.scrollHeight;
    }
  });
};

// 添加到中期记忆 - 直接添加，不经过短期记忆
const addToMidTermMemory = async (content: string) => {
  try {
    const save = characterStore.activeSaveSlot;
    const sd = save?.存档数据;
    if (!sd) return;

    // 确保记忆结构存在
    if (!sd.记忆) {
      sd.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
    }
    if (!sd.记忆.中期记忆) sd.记忆.中期记忆 = [];

    // 直接添加到中期记忆开头
    sd.记忆.中期记忆.unshift(content);

    console.log(`[记忆管理] 已直接添加AI返回的中期记忆`);

    // 检查中期记忆是否超出限制
    if (sd.记忆.中期记忆.length > maxMidTermMemories.value) {
      await transferToLongTermMemory();
    }
  } catch (error) {
    console.warn('[记忆管理] 添加中期记忆失败:', error);
  }
};

// 添加到短期记忆 - 统一使用酒馆变量存储
const addToShortTermMemory = async (content: string, role: 'user' | 'assistant' = 'assistant') => {
  try {
    console.log(`[记忆管理] 添加${role}消息到短期记忆:`, content.substring(0, 50));
    
    // 获取酒馆助手
    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[记忆管理] 酒馆助手不可用，无法存储短期记忆');
      return;
    }

    // 从酒馆变量获取当前短期记忆
    const chatVars = await helper.getVariables({ type: 'chat' });
    let currentMemories = chatVars['character.shortTermMemories'] as string[] | undefined;
    if (!Array.isArray(currentMemories)) {
      currentMemories = [];
    }

    // 添加新记忆到开头
    currentMemories.unshift(content);

    // 检查是否需要转换到中期记忆
    if (currentMemories.length > maxShortTermMemories.value) {
      // 将超出的记忆转移到中期记忆处理
      const overflow = currentMemories.splice(maxShortTermMemories.value);
      midTermMemoryBuffer.value.push(...overflow.reverse());
      
      // 处理中期记忆转换
      await transferToMidTermMemory();
    }

    // 更新酒馆变量中的短期记忆
    await helper.insertOrAssignVariables({
      'character.shortTermMemories': currentMemories
    }, { type: 'chat' });

    console.log(`[记忆管理] 已更新酒馆变量中的短期记忆，当前数量: ${currentMemories.length}`);
    
    // 同步更新存档数据（保持数据一致性）
    const save = characterStore.activeSaveSlot;
    if (save?.存档数据) {
      if (!save.存档数据.记忆) {
        save.存档数据.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
      }
      save.存档数据.记忆.短期记忆 = [...currentMemories];
    }

  } catch (error) {
    console.warn('[记忆管理] 添加短期记忆失败:', error);
  }
};

// 转移到中期记忆 - 以酒馆变量为主
const transferToMidTermMemory = async () => {
  try {
    console.log('[记忆管理] 开始转移到中期记忆');
    
    // 如果没有待转移的记忆，直接返回
    if (midTermMemoryBuffer.value.length === 0) {
      return;
    }

    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[记忆管理] 酒馆助手不可用，无法处理中期记忆转移');
      return;
    }

    // 获取当前中期记忆
    const midTermVars = await helper.getVariables({ type: 'chat' });
    let currentMidTermMemories = midTermVars['character.midTermMemories'] as string[] | undefined;
    if (!Array.isArray(currentMidTermMemories)) {
      currentMidTermMemories = [];
    }

    // 添加缓冲区中的记忆到中期记忆
    currentMidTermMemories.unshift(...midTermMemoryBuffer.value);
    
    // 检查中期记忆是否需要转换到长期记忆
    if (currentMidTermMemories.length > maxMidTermMemories.value) {
      await transferToLongTermMemory(currentMidTermMemories);
      // 保留最新的中期记忆
      currentMidTermMemories = currentMidTermMemories.slice(0, maxMidTermMemories.value);
    }

    // 更新酒馆变量
    await helper.insertOrAssignVariables({
      'character.midTermMemories': currentMidTermMemories
    }, { type: 'chat' });

    console.log(`[记忆管理] 转移${midTermMemoryBuffer.value.length}条到中期记忆，当前中期记忆数量: ${currentMidTermMemories.length}`);
    
    // 清空缓冲区
    midTermMemoryBuffer.value = [];
    
    // 同步更新存档数据
    const save = characterStore.activeSaveSlot;
    if (save?.存档数据) {
      if (!save.存档数据.记忆) {
        save.存档数据.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
      }
      save.存档数据.记忆.中期记忆 = [...currentMidTermMemories];
    }

  } catch (error) {
    console.warn('[记忆管理] 转移中期记忆失败:', error);
  }
};

// 转移到长期记忆 - 以酒馆变量为主
const transferToLongTermMemory = async (midTermMemories?: string[]) => {
  try {
    console.log('[记忆管理] 开始转移到长期记忆');
    
    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[记忆管理] 酒馆助手不可用，无法处理长期记忆转移');
      return;
    }

    // 获取需要总结的中期记忆
    let toSummarize = midTermMemories;
    if (!toSummarize) {
      const midTermVars = await helper.getVariables({ type: 'chat' });
      const midTermFromTavern = midTermVars['character.midTermMemories'] as string[] | undefined;
      toSummarize = midTermFromTavern;
      if (!Array.isArray(toSummarize)) {
        toSummarize = [];
      }
    }

    const excess = toSummarize.length - maxMidTermMemories.value;
    
    if (excess > 0) {
      const oldMemories = toSummarize.slice(-excess);
      
      // 生成长期记忆总结
      const summary = await generateLongTermSummary(oldMemories);
      if (summary) {
        // 获取当前长期记忆
        const longTermVars = await helper.getVariables({ type: 'chat' });
        let currentLongTermMemories = longTermVars['character.longTermMemories'] as string[] | undefined;
        if (!Array.isArray(currentLongTermMemories)) {
          currentLongTermMemories = [];
        }
        
        // 添加新的总结到长期记忆开头
        currentLongTermMemories.unshift(summary);
        
        // 更新酒馆变量
        await helper.insertOrAssignVariables({
          'character.longTermMemories': currentLongTermMemories
        }, { type: 'chat' });
        
        console.log(`[记忆管理] 总结${oldMemories.length}条记忆到长期记忆，长期记忆总数: ${currentLongTermMemories.length}条`);
        
        // 同步更新存档数据
        const save = characterStore.activeSaveSlot;
        if (save?.存档数据) {
          if (!save.存档数据.记忆) {
            save.存档数据.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
          }
          save.存档数据.记忆.长期记忆 = [...currentLongTermMemories];
        }
      }
    }
  } catch (error) {
    console.warn('[记忆管理] 转移长期记忆失败:', error);
  }
};

// 生成长期记忆总结
const generateLongTermSummary = async (memories: string[]): Promise<string | null> => {
  try {
    const helper = getTavernHelper();
    if (!helper) return null;

    const prompt = `请将以下游戏记忆总结成一段简洁的长期记忆，保留关键信息和重要事件：\n\n${memories.join('\n\n')}\n\n总结要求：\n1. 保持第三人称视角\n2. 突出重要的修炼进展、人物关系、重大事件\n3. 控制在100字以内\n4. 使用修仙小说的语言风格`;

    const response = await helper.generate({ user_input: prompt });
    return response?.trim() || null;
  } catch (error) {
    console.warn('[记忆管理] 生成长期记忆总结失败:', error);
    return null;
  }
};

// （移除逐条总结逻辑）不再对溢出的短期记忆逐条生成总结

// 格式化当前时间
const formatCurrentTime = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

// 生成回退响应的函数
const generateFallbackResponse = async (userMessage: string): Promise<string> => {
  const responses = [
    `系统正在处理"${userMessage}"，请稍候...`,
    `收到道友的请求，天道正在感应中...`,
    `道友的行动已记录，正在计算因果变化...`,
    `系统繁忙，但你的修行之路依然继续...`,
    `天道无常，此时无法给出完整回应，请稍后再试。`
  ];

  // 模拟异步处理延迟
  await new Promise(resolve => setTimeout(resolve, 500));

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  return randomResponse;
};

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// 自动调整输入框高度
const adjustTextareaHeight = () => {
  const textarea = inputRef.value;
  if (textarea) {
    // 重置高度以获取正确的scrollHeight
    textarea.style.height = 'auto'; // 让浏览器自动计算

    // 计算所需高度
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120; // 与CSS中的max-height保持一致
    const minHeight = 32; // 更小的最小高度，真正对应单行

    // 设置新高度，但不超过最大高度
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;

    // 如果内容超出最大高度，启用滚动
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }
};

// 监听输入变化以调整高度
const handleInput = () => {
  nextTick(() => {
    adjustTextareaHeight();
  });
};

// 初始化时加载对话历史（增强版）
onMounted(async () => {
  try {
    // 加载记忆配置
    loadMemorySettings();
    
    // 恢复AI处理状态
    restoreAIProcessingState();

    // 初始化系统连接
    await initializeSystemConnections();

    // 初始化输入框高度
    nextTick(() => {
      adjustTextareaHeight();
    });

    // 加载审查配置
    const savedDifficulty = localStorage.getItem('audit-difficulty') as DifficultyLevel;
    if (savedDifficulty && ['normal', 'medium', 'hard'].includes(savedDifficulty)) {
      auditDifficulty.value = savedDifficulty;
    }

    if (hasActiveCharacter.value) {
      // 尝试从存档恢复对话历史
      await loadConversationHistory();

      // 如果没有对话历史，生成并显示初始消息
      if (gameMessages.value.length === 0) {
        await generateAndShowInitialMessage();
      }

      // 同步游戏状态
      await syncGameState();

    } else {
      addMessage({
        type: 'system',
        content: '【提示】请先选择或创建角色开始游戏。',
        time: formatCurrentTime()
      });
    }

    // 滚动到底部
    nextTick(() => {
      if (contentAreaRef.value) {
        contentAreaRef.value.scrollTop = contentAreaRef.value.scrollHeight;
      }
    });

  } catch (error) {
    console.error('[主面板] 初始化失败:', error);
    addMessage({
      type: 'system',
      content: '【系统】初始化遇到问题，请刷新页面重试。',
      time: formatCurrentTime()
    });
  }
});

// 初始化系统连接
const initializeSystemConnections = async () => {
  try {
    console.log('[主面板] 初始化系统连接...');

    // 确保所有系统已初始化
    // await memorySystem.initialize();
    // await gameStateManager.initialize();
    // await bidirectionalSystem.initialize();

    console.log('[主面板] 系统连接初始化完成');
  } catch (error) {
    console.error('[主面板] 系统连接初始化失败:', error);
  }
};

// 同步游戏状态
const syncGameState = async () => {
  try {
    const character = characterStore.activeCharacterProfile;
    if (!character) return;

    console.log('[主面板] 游戏状态同步完成');
  } catch (error) {
    console.error('[主面板] 游戏状态同步失败:', error);
  }
};

// 加载并显示初始消息（不重新生成）
const generateAndShowInitialMessage = async () => {
  try {
    console.log('[主面板] 加载角色初始化时的开局消息...');

    const profile = characterStore.activeCharacterProfile;
    const saveData = characterStore.activeSaveSlot;

    if (!profile || !saveData) {
      throw new Error('角色或存档数据缺失');
    }

    // 优先从酒馆变量中获取初始消息
    let initialMessage = '';

    // 尝试从酒馆变量获取初始消息
    try {
      const helper = getTavernHelper();
      if (helper) {
        const chatVars = await helper.getVariables({ type: 'chat' });
        const tavernMemories = chatVars['character.shortTermMemories'] as string[] | undefined;
        if (Array.isArray(tavernMemories) && tavernMemories.length > 0) {
          initialMessage = tavernMemories[0];
          console.log('[主面板] 从酒馆变量中加载到初始消息:', initialMessage.substring(0, 100));
        }
      }
    } catch (error) {
      console.warn('[主面板] 从酒馆变量获取初始消息失败:', error);
    }

    // 如果酒馆变量中没有，尝试从存档的记忆中获取作为备用
    if (!initialMessage) {
      console.log('[主面板] 酒馆变量中未找到初始消息，尝试从存档记忆获取作为备用...');
      if (saveData.存档数据?.记忆?.短期记忆?.[0]) {
        initialMessage = saveData.存档数据.记忆.短期记忆[0];
        console.log('[主面板] 从存档记忆中加载到初始消息（备用路径）:', initialMessage.substring(0, 100));
      } else {
        const legacyShort = (saveData.存档数据 as unknown as Record<string, unknown>)?.短期记忆;
        if (Array.isArray(legacyShort) && legacyShort.length > 0) {
          initialMessage = legacyShort[0];
          console.log('[主面板] 从存档记忆中加载到初始消息（兼容路径）:', initialMessage.substring(0, 100));
        }
      }
    }

    // 如果还是没有，使用默认消息
    if (!initialMessage) {
      console.log('[主面板] 未找到保存的初始消息，使用默认开局');
      initialMessage = `【${profile.角色基础信息.名字}】发现自己身处在一个陌生而神秘的修仙世界中。作为一名${profile.角色基础信息.出生}出身的修士，拥有${profile.角色基础信息.灵根}，你感受到了体内微弱的灵气波动。修仙之路漫漫，从这一刻开始，你将踏上寻求长生大道的征途。`;
    }

    // 显示初始消息
    const gmMessage = {
      type: 'gm' as const,
      content: initialMessage,
      time: formatCurrentTime()
    };

    // 直接设置为当前叙述，不触发记忆转移
    currentNarrative.value = gmMessage;
    gameMessages.value.push(gmMessage);

    console.log('[主面板] 初始消息加载完成');

  } catch (error) {
    console.error('[主面板] 加载初始消息失败:', error);

    // 添加默认开局消息
    const defaultMessage = {
      type: 'gm' as const,
      content: `【${characterName.value}】你睁开双眼，发现自己身处在一个全新的修仙世界中。周围的一切都显得古朴而神秘，空气中弥漫着淡淡的灵气。你感受到体内有着一股前所未有的力量在涌动，这是属于修仙者的开始...`,
      time: formatCurrentTime()
    };

    // 直接设置为当前叙述
    currentNarrative.value = defaultMessage;
    gameMessages.value.push(defaultMessage);
  }
};

// 加载对话历史
const loadConversationHistory = async () => {
  try {
    const save = characterStore.activeSaveSlot;
    const sd = save?.存档数据;
    if (sd?.对话历史) {
      const history = sd.对话历史;
      if (Array.isArray(history) && history.length > 0) {
        // 清空当前消息，加载历史消息
        gameMessages.value = [];
        history.forEach((msg: GameMessage) => {
          if (msg.type && msg.content && msg.time) {
            gameMessages.value.push({
              type: msg.type,
              content: msg.content,
              time: msg.time
            });
          }
        });
        console.log(`[主面板] 已加载 ${history.length} 条对话历史`);
      }
    }
  } catch (error) {
    console.warn('[主面板] 加载对话历史失败:', error);
  }
};

// 保存对话历史到存档（增强版）
const saveConversationHistory = async () => {
  try {
    const save = characterStore.activeSaveSlot;
    const sd = save?.存档数据;
    if (sd) {
      // 保存到角色存档
      sd.对话历史 = gameMessages.value.map(msg => ({
        type: msg.type,
        content: msg.content,
        time: msg.time
      }));

      // 同时更新到记忆系统
      // await memorySystem.addShortTermMemory(recentMessages, 'conversation');

      console.log(`[主面板] 已保存 ${gameMessages.value.length} 条对话历史`);
    }
  } catch (error) {
    console.warn('[主面板] 保存对话历史失败:', error);
  }
};
</script>

<style scoped>
.main-game-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-sizing: border-box;
}

/* 短期记忆区域 */
.memory-section {
  padding: 12px 20px;
  background: linear-gradient(135deg, #fefbff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  position: relative;
  z-index: 20;
  flex-shrink: 0;
}

.memory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 0;
  transition: all 0.2s ease;
}

.memory-header:hover {
  background: rgba(99, 102, 241, 0.05);
  border-radius: 6px;
  margin: -4px;
  padding: 8px 4px;
}

.memory-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6366f1;
}

.memory-icon {
  color: #94a3b8;
  transition: transform 0.2s ease;
}

/* 下拉悬浮效果 */
.memory-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-background);
  border: 1px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 19;
  max-height: 300px;
  overflow-y: auto;
}

.memory-content {
  padding: 16px 20px;
}

.memory-item {
  font-size: 0.85rem;
  color: #374151;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  border-left: 3px solid #6366f1;
  line-height: 1.5;
}

.memory-item:last-child {
  margin-bottom: 0;
}

.no-memory {
  font-size: 0.9rem;
  color: #9ca3af;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

/* 下拉动画 */
.memory-dropdown-enter-active,
.memory-dropdown-leave-active {
  transition: all 0.3s ease;
}

.memory-dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.memory-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 主内容包装器 */
.main-content-wrapper {
  display: flex;
  height: 100%;
  gap: 12px;
}

/* 当前叙述显示区域 */
.current-narrative {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--color-background);
  min-width: 0; /* 防止flex收缩问题 */
}

.content-area {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  /* 显示可见的滚动拇指，但轨道透明 */
  scrollbar-color: rgba(148, 163, 184, 0.6) transparent;
  box-sizing: border-box;
  min-height: 200px;
}

/* WebKit滚动条样式 */
.content-area::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
}

.content-area::-webkit-scrollbar-track-piece {
  background: transparent;
}

.content-area::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background-color: rgba(148, 163, 184, 0.6);
}

/* 悬停时略微增强可见度 */
.content-area:hover::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.8);
}

.content-area::-webkit-scrollbar-button {
  display: none;
}

.content-area::-webkit-scrollbar-corner {
  background: transparent;
}


/* AI处理时的显示样式 */
.ai-processing-display {
  width: 100%;
  padding: 20px;
}

/* 流式内容显示 */
.streaming-content {
  width: 100%;
}

.streaming-meta {
  display: flex;
  justify-content: space-between; /* 使用 space-between 实现三栏布局 */
  align-items: center;
  width: 100%;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--color-primary);
  /* 确保指示器在中间 */
  flex-grow: 1;
  justify-content: center;
}

.narrative-time-placeholder {
  /* 占位符与时间戳宽度一致，确保中间元素居中 */
  visibility: hidden;
  width: auto; /* 自动宽度，与时间戳内容匹配 */
  white-space: nowrap;
}

.streaming-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: pulse 1.2s ease-in-out infinite;
}

.streaming-text {
  font-weight: 500;
}

/* 等待动画样式 */
.waiting-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
}

.thinking-dots {
  display: flex;
  gap: 8px;
}

.thinking-dots .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: thinking 1.4s ease-in-out infinite;
}

.thinking-dots .dot:nth-child(1) {
  animation-delay: 0s;
}

.thinking-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking {
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  30% {
    transform: scale(1.3);
    opacity: 1;
  }
}

.waiting-text {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 currentColor; opacity: 0.8; }
  70% { box-shadow: 0 0 0 6px transparent; opacity: 1; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: 0.8; }
}

/* 输入框右侧的流式传输选项样式 - 删除旧样式 */

/* 输入框容器样式 */
.input-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: stretch; /* 让内部元素垂直拉伸 */
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: var(--color-background);
  transition: all 0.2s ease;
  min-height: 32px; /* 减小最小高度以对应单行 */
  max-width: 100%; /* 防止横向扩展 */
  overflow: hidden; /* 确保内容不会溢出容器 */
}

.input-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-container:has(.game-input:disabled) {
  background: #f9fafb;
}

/* 输入框内部的文本区域 */
.input-container .game-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 16px;
  padding-right: 0; /* 右侧留给流式传输选项 */
  outline: none;
  box-shadow: none;
  resize: none;
  overflow-y: auto;
  width: 100%; /* 确保宽度填满容器 */
  min-width: 0; /* 允许缩小 */
  box-sizing: border-box;
  word-wrap: break-word;
  white-space: pre-wrap; /* 保持换行和空格 */
  overflow-wrap: break-word;
  /* 移除自动高度相关样式，用JS控制 */
  height: auto;
  line-height: 1.4;
  /* 透明滚动条（Firefox） */
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.6) transparent;
}

.input-container .game-input:focus {
  border: none;
  box-shadow: none;
}

/* 透明滚动条（WebKit） */
.input-container .game-input::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}

.input-container .game-input::-webkit-scrollbar-track,
.input-container .game-input::-webkit-scrollbar-track-piece,
.input-container .game-input::-webkit-scrollbar-corner {
  background: transparent;
}

.input-container .game-input::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background-color: rgba(148, 163, 184, 0.6);
}

.input-container .game-input:hover::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.8);
}

/* 输入框内部的流式传输选项 */
.stream-toggle-inside {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  padding: 4px 12px;
  border-left: 1px solid #e5e7eb;
  margin-left: 8px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  align-self: stretch; /* 垂直拉伸以匹配容器高度 */
  min-height: 32px; /* 减小最小高度以对应单行 */
}

.stream-toggle-inside:hover {
  color: var(--color-text);
}

.stream-toggle-inside input[type="checkbox"] {
  width: 12px;
  height: 12px;
  cursor: pointer;
}

.stream-toggle-inside .label-text {
  cursor: pointer;
}

/* 当前叙述显示区域 */
.current-narrative {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative; /* 添加相对定位，让等待覆盖层能正确定位 */
  background: var(--color-background); /* 确保整个区域背景一致 */
}

.narrative-content {
  padding: 20px;
  line-height: 1.8;
  color: #1f2937;
  font-size: 0.95rem;
  background: var(--color-background);
}

.narrative-meta {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.narrative-time {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

/* 变量更新按钮 */
.variable-updates-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  position: relative;
  overflow: hidden;
}

.variable-updates-toggle::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.variable-updates-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, #2563eb, #1e40af);
}

.variable-updates-toggle:hover::before {
  left: 100%;
}

.variable-updates-toggle.active {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.variable-updates-toggle.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, #9ca3af, #6b7280);
  box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3);
}

.variable-updates-toggle.disabled:hover {
  transform: none;
  background: linear-gradient(135deg, #9ca3af, #6b7280);
  box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3);
}

.variable-updates-toggle.disabled::before {
  display: none;
}

.update-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 悬浮面板覆盖层 */
.variable-updates-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

/* 悬浮面板主体 */
.variable-updates-modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  animation: modal-appear 0.3s ease-out;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 悬浮面板动画 */
.variable-updates-modal-enter-active,
.variable-updates-modal-leave-active {
  transition: all 0.3s ease;
}

.variable-updates-modal-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.variable-updates-modal-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

/* 悬浮面板头部 */
.variable-updates-modal .updates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid var(--color-border);
}

.variable-updates-modal .updates-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-updates-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-updates-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  transform: rotate(90deg);
}

/* 悬浮面板内容 */
.variable-updates-modal .updates-content {
  padding: 16px;
  overflow-y: auto;
  max-height: 60vh;
}

/* 移除重复的样式，让内部FormattedText组件处理 */

.empty-narrative {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-style: italic;
  font-size: 0.9rem;
}

/* 动作队列显示区域 */
.action-queue-display {
  margin-bottom: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.queue-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6366f1;
}

.clear-queue-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-queue-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.queue-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.queue-action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 6px;
  font-size: 0.85rem;
}

.action-text {
  flex: 1;
  color: #374151;
  line-height: 1.4;
  margin-right: 8px;
}

.action-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.undo-indicator {
  font-size: 12px;
  opacity: 0.7;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.remove-action-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-action-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.input-section {
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  box-sizing: border-box;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: stretch; /* 改为stretch让所有元素高度一致 */
  width: 100%;
  max-width: none;
}

.game-input {
  /* 这些样式现在由 .input-container 处理 */
  font-size: 0.9rem;
  line-height: 1.4;
  color: #374151;
  resize: none;
  /* 移除固定高度，改为自动调整 */
  /* min-height: 44px; */
  /* max-height: 120px; */
  font-family: inherit;
  /* 移除过渡效果，避免高度调整时的闪烁 */
  /* transition: all 0.2s ease; */
}

/* 移除原来的 focus 样式，现在由容器处理 */
/* .game-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
} */

.game-input:disabled {
  /* background: #f9fafb; */
  color: #9ca3af;
  cursor: not-allowed;
}

.game-input::placeholder {
  color: #9ca3af;
}

.send-button {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-family: inherit;
  min-height: 32px; /* 减小最小高度以匹配输入框 */
  align-self: stretch; /* 垂直拉伸以匹配容器高度 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.send-button:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 深色主题 */
[data-theme="dark"] .main-game-panel {
  background: var(--color-background);
}

/* 叙述内容深色主题 */
[data-theme="dark"] .narrative-content {
  background: #1e293b;
  color: #e2e8f0;
}

[data-theme="dark"] .narrative-meta {
  border-bottom-color: #374151;
}

[data-theme="dark"] .narrative-time {
  color: #94a3b8;
}

/* 深色主题 - 变量更新按钮 */
[data-theme="dark"] .variable-updates-toggle {
  background: linear-gradient(135deg, #3b82f6, #1e3a8a);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

[data-theme="dark"] .variable-updates-toggle:hover {
  background: linear-gradient(135deg, #2563eb, #1e40af);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.5);
}

[data-theme="dark"] .variable-updates-toggle.active {
  background: linear-gradient(135deg, #10b981, #065f46);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}

[data-theme="dark"] .variable-updates-toggle.active:hover {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.5);
}

[data-theme="dark"] .variable-updates-toggle.disabled {
  background: linear-gradient(135deg, #4b5563, #374151);
  box-shadow: 0 2px 8px rgba(75, 85, 99, 0.4);
}

[data-theme="dark"] .variable-updates-toggle.disabled:hover {
  background: linear-gradient(135deg, #4b5563, #374151);
  box-shadow: 0 2px 8px rgba(75, 85, 99, 0.4);
}

[data-theme="dark"] .variable-updates-overlay {
  background: rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .variable-updates-modal {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .variable-updates-modal .updates-header {
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-color: #475569;
}

[data-theme="dark"] .variable-updates-modal .updates-header h4 {
  color: #e2e8f0;
}

[data-theme="dark"] .close-updates-btn {
  color: #94a3b8;
}

[data-theme="dark"] .close-updates-btn:hover {
  background: #475569;
  color: #e2e8f0;
}

[data-theme="dark"] .empty-narrative {
  color: #6b7280;
}

/* 确保深色主题下当前叙述区域背景一致 */
[data-theme="dark"] .current-narrative {
  background: #1e293b;
}

[data-theme="dark"] .input-section {
  background: #334155;
  border-top-color: #475569;
}

[data-theme="dark"] .game-input {
  /* background: #1e293b; - 现在由容器处理 */
  /* border-color: #475569; - 现在由容器处理 */
  color: #e2e8f0;
}

/* 移除重复的深色主题 focus 样式 */
/* [data-theme="dark"] .game-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
} */

[data-theme="dark"] .game-input:disabled {
  /* background: #0f172a; - 现在由容器处理 */
  color: #64748b;
}

[data-theme="dark"] .game-input::placeholder {
  color: #64748b;
}

[data-theme="dark"] .send-button {
  background: #3b82f6;
}

[data-theme="dark"] .send-button:hover:not(:disabled) {
  background: #2563eb;
}

[data-theme="dark"] .send-button:disabled {
  background: #374151;
  color: #64748b;
}

/* 短期记忆深色主题 */
[data-theme="dark"] .memory-section {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
}

[data-theme="dark"] .memory-header:hover {
  background: rgba(99, 102, 241, 0.1);
}

[data-theme="dark"] .memory-title {
  color: #818cf8;
}

[data-theme="dark"] .memory-icon {
  color: #64748b;
}

[data-theme="dark"] .memory-dropdown {
  background: #1e293b;
  border-color: #475569;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .memory-item {
  background: rgba(129, 140, 248, 0.1);
  border-left-color: #818cf8;
  color: #e2e8f0;
}

/* 等待覆盖层深色主题 - 更新为AI处理显示样式 */
[data-theme="dark"] .streaming-meta {
  border-bottom-color: #374151;
}

[data-theme="dark"] .streaming-indicator {
  color: #60a5fa;
}

[data-theme="dark"] .streaming-dot {
  background: #60a5fa;
}

[data-theme="dark"] .thinking-dots .dot {
  background: #60a5fa;
}

[data-theme="dark"] .waiting-text {
  color: #94a3b8;
}

/* 输入框右侧流式传输选项深色主题 - 更新为内部样式 */
[data-theme="dark"] .input-container {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .input-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

[data-theme="dark"] .input-container:has(.game-input:disabled) {
  background: #0f172a;
}

[data-theme="dark"] .stream-toggle-inside {
  color: #94a3b8;
  border-left-color: #475569;
}

[data-theme="dark"] .stream-toggle-inside:hover {
  color: #e2e8f0;
}

/* 行动选择器按钮 */
.action-selector-btn {
  width: 44px;
  min-height: 32px; /* 减小最小高度以匹配输入框 */
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6366f1;
  align-self: stretch; /* 垂直拉伸以匹配容器高度 */
  flex-shrink: 0;
}

.action-selector-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #6366f1;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
}

.action-selector-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 行动选择弹窗 */
.action-modal-overlay,
.action-config-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.action-modal {
  background: var(--color-background);
  border-radius: 12px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.action-config-modal {
  background: var(--color-background);
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header,
.config-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-primary, #3b82f6);
}

.modal-header h3,
.config-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: white;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--color-surface-light);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.action-grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.quick-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: var(--color-background);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  min-height: 70px;
}

.quick-action-btn:hover {
  border-color: #3b82f6;
  background: #f8fafc;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.quick-action-btn.cultivation {
  border-color: rgba(34, 197, 94, 0.2);
  background: rgba(34, 197, 94, 0.03);
}

.quick-action-btn.cultivation:hover {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}

.quick-action-btn.exploration {
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.03);
}

.quick-action-btn.exploration:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.quick-action-btn.social {
  border-color: rgba(168, 85, 247, 0.2);
  background: rgba(168, 85, 247, 0.03);
}

.quick-action-btn.social:hover {
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.08);
}

.quick-action-btn.other {
  border-color: rgba(156, 163, 175, 0.2);
  background: rgba(156, 163, 175, 0.03);
}

.quick-action-btn.other:hover {
  border-color: #9ca3af;
  background: rgba(156, 163, 175, 0.08);
}

.action-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.action-text {
  font-weight: 500;
  color: #374151;
  text-align: center;
  line-height: 1.2;
}

/* 配置弹窗内容 */
.config-content {
  padding: 20px;
}

.action-description {
  margin: 0 0 20px 0;
  color: #6b7280;
  line-height: 1.5;
}

.config-section {
  margin-bottom: 20px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.time-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.time-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: var(--color-background);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.time-btn:hover {
  border-color: #3b82f6;
}

.time-btn.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.time-custom {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.time-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.action-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.option-item input[type="radio"] {
  margin: 0;
}

.config-actions {
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  border: 1px solid #d1d5db;
  background: var(--color-background);
  color: #6b7280;
}

.cancel-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.confirm-btn {
  border: 1px solid #3b82f6;
  background: #3b82f6;
  color: white;
}

.confirm-btn:hover {
  background: #2563eb;
  border-color: #2563eb;
}

/* 深色主题适配 */
[data-theme="dark"] .action-selector-btn {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

[data-theme="dark"] .action-selector-btn:hover:not(:disabled) {
  background: #4b5563;
  border-color: #6b7280;
}

[data-theme="dark"] .action-modal,
[data-theme="dark"] .action-config-modal {
  background: #1f2937;
}

[data-theme="dark"] .modal-header,
[data-theme="dark"] .config-header,
[data-theme="dark"] .config-actions {
  border-color: #374151;
}

[data-theme="dark"] .modal-header h3,
[data-theme="dark"] .config-header h3,
[data-theme="dark"] .category-title,
[data-theme="dark"] .config-label,
[data-theme="dark"] .action-name {
  color: #f9fafb;
}

[data-theme="dark"] .close-btn {
  background: #374151;
  color: #d1d5db;
}

[data-theme="dark"] .close-btn:hover {
  background: #4b5563;
  color: #f9fafb;
}

[data-theme="dark"] .action-btn {
  background: #374151;
  border-color: #4b5563;
}

[data-theme="dark"] .action-btn:hover {
  border-color: #3b82f6;
  background: #1f2937;
}

[data-theme="dark"] .time-btn,
[data-theme="dark"] .option-item {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

[data-theme="dark"] .time-input {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-theme="dark"] .cancel-btn {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

[data-theme="dark"] .cancel-btn:hover {
  background: #4b5563;
}

/* 深色主题动作队列样式 */
[data-theme="dark"] .action-queue-display {
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  border-color: #4b5563;
}

[data-theme="dark"] .queue-title {
  color: #818cf8;
}

[data-theme="dark"] .clear-queue-btn {
  color: #9ca3af;
}

[data-theme="dark"] .clear-queue-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

[data-theme="dark"] .queue-action-item {
  background: rgba(129, 140, 248, 0.1);
  border-color: rgba(129, 140, 248, 0.2);
}

[data-theme="dark"] .action-text {
  color: #e5e7eb;
}

[data-theme="dark"] .remove-action-btn {
  color: #9ca3af;
}

[data-theme="dark"] .remove-action-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

[data-theme="dark"] .action-controls {
  color: #d1d5db;
}

[data-theme="dark"] .undo-indicator {
  filter: brightness(1.2);
}

/* 变更描述样式 */
.change-description {
  color: var(--color-text);
  font-size: 0.8rem;
  margin-bottom: 6px;
  padding: 4px 8px;
  background: var(--color-surface-light);
  border-radius: 4px;
  border-left: 2px solid var(--color-primary);
  line-height: 1.3;
  font-style: italic;
}

/* 深色主题下的变更描述 */
[data-theme="dark"] .change-description {
  background: #334155;
  color: #e2e8f0;
  border-left-color: #60a5fa;
}

/* 空状态样式 */
.no-changes {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.no-changes .empty-icon {
  opacity: 0.5;
  margin-bottom: 1rem;
  color: var(--color-text-secondary);
}

.no-changes .empty-text {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-size: 0.9rem;
}

.no-changes .empty-hint {
  font-size: 0.8rem;
  opacity: 0.8;
  line-height: 1.4;
}
</style>
