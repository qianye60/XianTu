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
                <span v-if="streamingContent" class="streaming-text">{{ streamingCharCount }} 字</span>
              </div>
              <!-- 重置按钮 - 右侧 -->
              <button
                @click="forceResetAIProcessingState"
                class="reset-state-btn"
                title="如果长时间无响应，点击此处重置状态"
              >
                🔄 重置状态
              </button>
            </div>
            <div class="narrative-text">
              <FormattedText :text="streamingContent" />
            </div>
          </div>
          <!-- 等待响应的加载动画 -->
          <div v-else class="waiting-for-stream">
            <div class="narrative-meta streaming-meta">
              <span class="narrative-time">{{ formatCurrentTime() }}</span>
              <div class="streaming-indicator">
                <span class="streaming-dot"></span>
                <span class="streaming-text">天道感应中...</span>
              </div>
              <!-- 重置按钮 - 右侧 -->
              <button
                @click="forceResetAIProcessingState"
                class="reset-state-btn"
                title="如果长时间无响应，点击此处重置状态"
              >
                🔄 重置状态
              </button>
            </div>
            <div class="narrative-text">
              <div class="waiting-animation">
                <div class="thinking-dots">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 非AI处理时显示 -->
        <template v-else>
          <div v-if="currentNarrative" class="narrative-content">
            <div class="narrative-meta">
              <span class="narrative-time">{{ currentNarrative.time }}</span>
              <!-- 命令日志按钮 (居中) -->
              <button
                @click="showStateChanges(currentNarrative.stateChanges)"
                class="variable-updates-toggle"
                :class="{ disabled: currentNarrativeStateChanges.length === 0 }"
                :disabled="currentNarrativeStateChanges.length === 0"
                :title="currentNarrativeStateChanges.length > 0 ? '查看本次对话的变更日志' : '本次对话无变更记录'"
              >
                <ScrollText :size="16" />
                <span class="update-count">{{ currentNarrativeStateChanges.length }}</span>
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
        <!-- 隐藏的文件选择器 -->
        <input
          type="file"
          ref="imageInputRef"
          @change="handleImageSelect"
          multiple
          accept="image/*"
          style="display: none"
        />

        <!-- 图片上传按钮 -->
        <button
          @click="openImagePicker"
          class="action-selector-btn image-upload-btn"
          :disabled="!hasActiveCharacter"
          title="上传图片"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>

        <button
          @click="showActionSelector"
          class="action-selector-btn"
          :disabled="!hasActiveCharacter"
          title="快捷行动"
        >
          <ChevronDown :size="16" />
        </button>

        <div class="input-container">
          <!-- 图片预览区域 -->
          <div v-if="selectedImages.length > 0" class="image-preview-container">
            <div
              v-for="(image, index) in selectedImages"
              :key="index"
              class="image-preview-item"
            >
              <img :src="getImagePreviewUrl(image)" :alt="image.name" />
              <button @click="removeImage(index)" class="remove-image-btn" title="移除图片">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

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
import { checkCharacterDeath } from '@/utils/judgement/heavenlyRules';
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import {
  Send, Loader2, ChevronDown, ChevronRight, Activity, ScrollText, X,
  PackagePlus, PackageMinus, ArrowUpRight, ArrowDownRight, UserPlus, UserMinus,
  Swords, Shield, BookOpen, Heart, Bot
} from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { useActionQueueStore, type GameAction } from '@/stores/actionQueueStore';
import { useUIStore } from '@/stores/uiStore';
import { EnhancedActionQueueManager } from '@/utils/enhancedActionQueue';
import { getTavernHelper } from '@/utils/tavern';
import { MultiLayerMemorySystem } from '@/utils/MultiLayerMemorySystem';
import { AIBidirectionalSystem } from '@/utils/AIBidirectionalSystem';
import { GameStateManager } from '@/utils/GameStateManager';
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


// --- 计算属性：从当前叙述中安全地获取状态变更列表 ---
const currentNarrativeStateChanges = computed(() => {
  return currentNarrative.value?.stateChanges?.changes || [];
});


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
    // 如果超过2分钟，认为已超时，清除状态
    if (elapsed < 2 * 60 * 1000) {
      isAIProcessing.value = true;
      console.log('[状态恢复] 恢复AI处理状态');
    } else {
      console.log('[状态恢复] AI处理状态已超时，清除状态');
      sessionStorage.removeItem('ai-processing-state');
      sessionStorage.removeItem('ai-processing-timestamp');
      isAIProcessing.value = false;
    }
  }
};

// 监听AI处理状态变化
watch(isAIProcessing, persistAIProcessingState);

// 强制清除AI处理状态的方法
const forceResetAIProcessingState = () => {
  console.log('[强制重置] 清除AI处理状态和会话存储');
  isAIProcessing.value = false;
  sessionStorage.removeItem('ai-processing-state');
  sessionStorage.removeItem('ai-processing-timestamp');
  streamingMessageIndex.value = null;
  streamingContent.value = '';
  toast.info('AI处理状态已重置');
};

// 在 window 上暴露方法以便调试
if (typeof window !== 'undefined') {
  (window as any).forceResetAIState = forceResetAIProcessingState;
  
  // 暴露调试短期记忆的方法（支持双存储）
  (window as any).debugMemory = async () => {
    const save = characterStore.activeSaveSlot;
    const sd = save?.存档数据;
    console.log('[调试] 当前存档数据:', save);
    console.log('[调试] 存档中短期记忆:', sd?.记忆?.短期记忆);
    console.log('[调试] 存档中中期记忆:', sd?.记忆?.中期记忆);
    console.log('[调试] 存档中长期记忆:', sd?.记忆?.长期记忆);

    // 检查本地存储
    const localStorageData = localStorage.getItem('characterStoreV3');
    console.log('[调试] LocalStorage原始数据长度:', localStorageData?.length);

    // 检查酒馆变量
    try {
      const helper = getTavernHelper();
      if (helper) {
        const chatVars = await helper.getVariables({ type: 'chat' });
        console.log('[调试] 酒馆Chat变量:', chatVars);
        console.log('[调试] 酒馆中的character.saveData:', chatVars['character.saveData']);
        console.log('[调试] 酒馆中的短期记忆:', (chatVars['character.saveData'] as SaveData)?.记忆?.短期记忆);
      } else {
        console.warn('[调试] 无法获取酒馆Helper');
      }
    } catch (e) {
      console.error('[调试] 检查酒馆变量失败:', e);
    }

    return {
      存档: save,
      存档中短期记忆: sd?.记忆?.短期记忆,
      存档中中期记忆: sd?.记忆?.中期记忆,
      存档中长期记忆: sd?.记忆?.长期记忆,
      本地存储可用: !!localStorageData
    };
  };
  
  // 暴露手动添加测试记忆的方法
  (window as any).testAddMemory = async (text: string) => {
    console.log('[测试] 手动添加记忆:', text);
    await addToShortTermMemory(text, 'assistant');
    console.log('[测试] 记忆添加完成，检查持久化...');
    await characterStore.commitToStorage();
    console.log('[测试] 持久化完成');
  };
  

  // 暴露调试AI响应存储的方法
  (window as any).debugAIResponse = async () => {
    console.log('[调试AI响应] 开始检查AI响应存储流程...');

    // 检查最近的AI响应流程
    const save = characterStore.activeSaveSlot;
    const sd = save?.存档数据;

    console.log('[调试AI响应] 当前存档:', save);
    console.log('[调试AI响应] 短期记忆:', sd?.记忆?.短期记忆);

    // 检查酒馆变量
    try {
      const helper = getTavernHelper();
      if (helper) {
        const chatVars = await helper.getVariables({ type: 'chat' });
        const tavernSaveData = chatVars['character.saveData'] as SaveData;
        console.log('[调试AI响应] 酒馆saveData:', tavernSaveData);
        console.log('[调试AI响应] 酒馆短期记忆:', tavernSaveData?.记忆?.短期记忆);

        // 对比本地和酒馆数据
        const localCount = sd?.记忆?.短期记忆?.length || 0;
        const tavernCount = tavernSaveData?.记忆?.短期记忆?.length || 0;
        console.log('[调试AI响应] 本地短期记忆数量:', localCount);
        console.log('[调试AI响应] 酒馆短期记忆数量:', tavernCount);

        if (localCount !== tavernCount) {
          console.error('[调试AI响应] 🚨 数据同步问题：本地和酒馆记忆数量不一致！');
        }
      }
    } catch (e) {
      console.error('[调试AI响应] 检查酒馆变量失败:', e);
    }

    return {
      本地短期记忆: sd?.记忆?.短期记忆,
      存档状态: !!save,
      数据完整性: !!sd
    };
  };
}

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
const uiStore = useUIStore();
const enhancedActionQueue = EnhancedActionQueueManager.getInstance();
const memorySystem = MultiLayerMemorySystem.getInstance();
const bidirectionalSystem = AIBidirectionalSystem.getInstance();
const gameStateManager = GameStateManager.getInstance();

// 流式输出状态
const streamingMessageIndex = ref<number | null>(null);
const streamingContent = ref('');
const useStreaming = ref(true);
const streamingCharCount = computed(() => streamingContent.value.length);

// 图片上传相关
const selectedImages = ref<File[]>([]);
const imageInputRef = ref<HTMLInputElement>();

// 打开图片选择器
const openImagePicker = () => {
  imageInputRef.value?.click();
};

// 处理图片选择
const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const newFiles = Array.from(target.files);
    selectedImages.value.push(...newFiles);
    console.log('[图片上传] 已选择图片:', newFiles.length, '张');
    toast.success(`已选择 ${newFiles.length} 张图片`);
  }
};

// 移除已选择的图片
const removeImage = (index: number) => {
  selectedImages.value.splice(index, 1);
  toast.info('已移除图片');
};

// 清空所有图片
const clearImages = () => {
  selectedImages.value = [];
  if (imageInputRef.value) {
    imageInputRef.value.value = '';
  }
};

// 获取图片预览 URL
const getImagePreviewUrl = (file: File): string => {
  return URL.createObjectURL(file);
};


// gameMessages 数组将被移除，currentNarrative 成为显示内容的唯一来源
// const gameMessages = ref<GameMessage[]>([]);

// --- 移除旧的变量更新面板逻辑 ---
// const variableUpdatesExpanded = ref(false);
// const toggleVariableUpdates = () => { ... };

// --- 命令日志相关函数 ---

// 根据命令内容获取对应的Lucide图标
const getIconForCommand = (change: { key: string; action: string; oldValue: unknown; newValue: unknown }) => {
  const key = change.key || '';
  const action = change.action || '';

  if (key.includes('物品')) {
    return action === 'add' || action === 'push' ? PackagePlus : PackageMinus;
  }
  if (key.includes('人际关系')) {
    return action === 'add' || action === 'set' ? UserPlus : UserMinus;
  }
  if (key.includes('装备')) {
    return action === 'set' ? Swords : Shield;
  }
  if (key.includes('功法') || key.includes('技能')) {
    return BookOpen;
  }
  if (key.includes('好感度') || key.includes('生命')) {
    return Heart;
  }
  if (action === 'inc' || action === 'add' || (action === 'set' && Number(change.newValue) > Number(change.oldValue))) {
    return ArrowUpRight;
  }
  if (action === 'dec' || action === 'remove' || (action === 'set' && Number(change.newValue) < Number(change.oldValue))) {
    return ArrowDownRight;
  }
  
  return Activity; // 默认图标
};

// 格式化命令为人类可读的描述
const formatCommandDescription = (change: { key: string; action: string; oldValue: unknown; newValue: unknown }): string => {
  return getChangeDescription(change);
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
    const getItemName = (item: any): string => {
      if (typeof item === 'object' && item !== null) {
        return item.名称 || item.name || '未知物品';
      }
      return '未知物品';
    };

    if (action === 'add' || action === 'push') {
      return `获得物品：${getItemName(newValue)}`;
    } else if (action === 'remove' || action === 'pull') {
      return `失去物品：${getItemName(oldValue)}`;
    } else if (action === 'set') {
      return `物品变化：${getItemName(newValue)}`;
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
    if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}千`;
    return value.toString();
  }

  if (typeof value === 'string') {
    if (value.length === 0) return '空字符串';
    if (value.length > 50) return `${value.substring(0, 47)}...`;
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '空数组';
    if (value.length <= 3) return `[${value.map(v => formatValue(v)).join(', ')}]`;
    return `[${value.length}项数组]`;
  }

  if (typeof value === 'object' && value !== null) {
    const valAsRecord = value as Record<string, unknown>;
    if (typeof valAsRecord['当前'] === 'number' && typeof valAsRecord['最大'] === 'number') {
      return `${valAsRecord['当前']} / ${valAsRecord['最大']}`;
    }
    
    const keys = Object.keys(value);
    if (keys.length === 0) return '空对象';
    
    const jsonString = JSON.stringify(value);
    if (jsonString.length > 50) {
      return `${jsonString.substring(0, 47)}...`;
    }
    return jsonString;
  }

  return String(value);
};

// 显示状态变更详情
const showStateChanges = (log: any) => {
  if (!log || !log.changes || log.changes.length === 0) {
    toast.info('本次对话无变更记录');
    return;
  }
  // [核心改造] 调用 uiStore 中新的方法来打开专属的 StateChangeViewer 弹窗
  uiStore.openStateChangeViewer(log);
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

// 移除中期记忆临时数组，防止数据丢失
// const midTermMemoryBuffer = ref<string[]>([]);

// 短期记忆获取 - 直接从角色存档数据中获取
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
const validateAIResponse = (response: unknown): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!response) {
    errors.push('AI响应为空');
    return { isValid: false, errors };
  }

  // 类型断言，确保response是对象
  const resp = response as Record<string, unknown>;

  // 检查基本结构
  if (!resp.text || typeof resp.text !== 'string') {
    errors.push('缺少有效的text字段');
  }

  // 检查mid_term_memory字段（可选）
  if (resp.mid_term_memory && typeof resp.mid_term_memory !== 'string') {
    errors.push('mid_term_memory字段格式不正确');
  }

  // 检查tavern_commands字段（可选）
  if (resp.tavern_commands) {
    if (!Array.isArray(resp.tavern_commands)) {
      errors.push('tavern_commands字段必须是数组');
    } else {
      // 检查每个命令的基本结构
      resp.tavern_commands.forEach((cmd: unknown, index: number) => {
        const command = cmd as Record<string, unknown>;
        if (!cmd || typeof cmd !== 'object') {
          errors.push(`tavern_commands[${index}]不是有效对象`);
        } else if (!command.action || !command.key) {
          errors.push(`tavern_commands[${index}]缺少必要字段(action/key)`);
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
    {"action": "set", "key": "character.saveData.path.to.variable", "value": "新值"}
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


const handleStreamingResponse = (chunk: string) => {
  if (streamingMessageIndex.value !== null) {
    streamingContent.value += chunk;
    // 自动滚动到底部
    nextTick(() => {
      if (contentAreaRef.value) {
        contentAreaRef.value.scrollTop = contentAreaRef.value.scrollHeight;
      }
    });
  }
};

// 检查动作是否可撤回
const isUndoableAction = (action: { type?: string }): boolean => {
  if (!action.type) return false;
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
    if (action.type && npcInteractionTypes.includes(action.type)) {
      actionQueue.removeAction(action.id);
      toast.success('已移除NPC交互动作');
      return;
    }

    // 如果是装备、卸下、使用或修炼类操作，尝试按名称精准撤回
    if (action.type && ['equip', 'unequip', 'use', 'cultivate'].includes(action.type) && action.itemName) {
      const success = await enhancedActionQueue.undoByItemName(action.type as 'equip' | 'unequip' | 'use' | 'cultivate', action.itemName);
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

  // 检查角色死亡状态
  const saveData = characterStore.activeSaveSlot?.存档数据;
  if (saveData) {
    const deathStatus = checkCharacterDeath(saveData);
    if (deathStatus.isDead) {
      toast.error(`角色已死亡：${deathStatus.deathReason}。无法继续游戏，请重新开始或复活角色。`);
      currentNarrative.value = {
        type: 'system',
        content: `【死亡提示】${characterName.value}已经死亡（${deathStatus.deathReason}），修仙之路戛然而止。若要继续游戏，请选择其他角色或重新开始。`,
        time: formatCurrentTime(),
        stateChanges: { changes: [] }
      };
      return;
    }
  }

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

  // 用户消息只作为行动趋向提示词，不添加到记忆中
  isAIProcessing.value = true;

  // 强制清空当前叙述，为流式响应或等待动画做准备，彻底避免内容重叠
  currentNarrative.value = null;
  streamingContent.value = ''; // 重置流式内容
  streamingMessageIndex.value = 1; // 设置一个虚拟索引以启用流式处理

  try {
    // 获取当前游戏状态
    const gameState = gameStateManager.getCurrentState();
    const character = characterStore.activeCharacterProfile;

    if (!character) {
      throw new Error('角色数据缺失');
    }

    // 用户消息不存储到记忆，只作为行动提示词使用
    // 移除: await addToShortTermMemory(userMessage, 'user');

    // 不再使用 gameMessages，直接准备 currentNarrative
    currentNarrative.value = {
      type: 'ai',
      content: '',
      time: formatCurrentTime(),
      stateChanges: { changes: [] }
    };

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
        options.useStreaming = true;
      }
      // 添加图片上传支持
      if (selectedImages.value.length > 0) {
        options.image = selectedImages.value;
        console.log('[图片上传] 将发送', selectedImages.value.length, '张图片');
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
            // 所有重试都失败了，中止处理
            throw new Error('AI响应格式错误，且多次重试失败');
          }
        }
      }


      // 完成流式输出
      streamingMessageIndex.value = null;

      // --- 核心逻辑：整合最终文本并更新状态 ---
      let finalText = '';
      const gmResp = aiResponse.gmResponse as GM_Response | undefined;

      console.log('[AI响应处理] 开始处理AI响应文本');
      console.log('[AI响应处理] aiResponse:', aiResponse);
      console.log('[AI响应处理] gmResp:', gmResp);
      console.log('[AI响应处理] streamingContent:', streamingContent.value);

      // 优先从结构化响应中获取最准确的文本
      if (gmResp?.text && typeof gmResp.text === 'string') {
        finalText = gmResp.text;
        console.log('[AI响应处理] 使用 gmResponse.text 作为最终文本，长度:', finalText.length);
      } else if (aiResponse.finalContent && typeof aiResponse.finalContent === 'string') {
        finalText = aiResponse.finalContent;
        console.log('[AI响应处理] 使用 aiResponse.finalContent 作为最终文本，长度:', finalText.length);
      } else if (streamingContent.value) {
        // 如果以上都没有，使用流式输出的最终结果作为备用
        finalText = streamingContent.value;
        console.log('[AI响应处理] 使用 streamingContent 作为最终文本，长度:', finalText.length);
      } else {
        console.warn('[AI响应处理] 未找到任何有效的文本内容');
      }

      console.log('[AI响应处理] 最终文本内容预览:', finalText.substring(0, 100) + '...');

      // 如果最终有文本内容，则进行处理
      if (finalText) {
        console.log('[AI响应处理] 开始处理最终文本...');
        
        // 更新UI显示
        if (currentNarrative.value) {
          currentNarrative.value.content = finalText;
          console.log('[AI响应处理] 已更新UI显示');
        }

        // 缓存预生成的中期记忆
        if (gmResp?.mid_term_memory && typeof gmResp.mid_term_memory === 'string') {
          await characterStore.manageTavernMemoryCache.addSummary(finalText, gmResp.mid_term_memory);
          console.log('[记忆管理] 预生成的中期记忆已缓存');
        }

        // 添加到短期记忆
        console.log('[AI响应处理] 准备将文本添加到短期记忆...');
        await addToShortTermMemory(finalText, 'assistant');
        console.log('[AI响应处理] 最终文本已添加到短期记忆，文本长度:', finalText.length);
      } else {
        console.error('[AI响应处理] 没有找到有效的文本内容，跳过记忆保存');
      }

      // tavern_commands 已在 AIBidirectionalSystem 中处理
      if (gmResp?.tavern_commands?.length) {
        console.log(`[AI响应处理] ${gmResp.tavern_commands.length} 条 tavern_commands 已由AI双向系统处理`);
      }

    // 处理游戏状态更新（仅在有有效AI响应时执行）
    if (aiResponse && aiResponse.stateChanges) {
      // 先清空上一次的日志（在收到新响应时清空，而不是发送消息时）
      uiStore.clearCurrentMessageStateChanges();
      console.log('[日志清空] 收到新响应，已清空上一条消息的状态变更日志');

      await gameStateManager.applyStateChanges(aiResponse.stateChanges);
      characterStore.updateCharacterData(aiResponse.stateChanges);

      // 将状态变更附加到当前叙述上
      if (currentNarrative.value) {
        currentNarrative.value.stateChanges = aiResponse.stateChanges as StateChangeLog;

        // 保存到叙事历史
        const saveData = characterStore.activeSaveSlot?.存档数据;
        if (saveData) {
          if (!saveData.叙事历史) {
            saveData.叙事历史 = [];
          }
          // 添加到历史记录（最新的在前）
          saveData.叙事历史.unshift({
            type: currentNarrative.value.type,
            content: currentNarrative.value.content,
            time: currentNarrative.value.time,
            stateChanges: currentNarrative.value.stateChanges
          });
          // 保留最近100条记录
          if (saveData.叙事历史.length > 100) {
            saveData.叙事历史 = saveData.叙事历史.slice(0, 100);
          }
          characterStore.saveCurrentGame();
        }
      }

      // 将新的状态变更保存到 uiStore 的内存中（会覆盖之前的）
      uiStore.setCurrentMessageStateChanges(aiResponse.stateChanges);
      console.log('[日志面板] State changes received and stored in memory:', aiResponse.stateChanges);

      // 检查角色死亡状态（在状态更新后）
      const currentSaveData = characterStore.activeSaveSlot?.存档数据;
      if (currentSaveData) {
        const deathStatus = checkCharacterDeath(currentSaveData);
        if (deathStatus.isDead) {
          // 如果死亡，用死亡信息覆盖当前叙述
          currentNarrative.value = {
            type: 'system',
            content: `💀【死亡通知】${characterName.value}在此次行动中不幸死亡（${deathStatus.deathReason}）。修仙路断，生命已逝。`,
            time: formatCurrentTime(),
            stateChanges: { changes: [] }
          };
          toast.error(`角色已死亡：${deathStatus.deathReason}`);
        }
      }
    } else if (aiResponse) {
      console.log('[日志面板] No state changes received in this response.');
    }

    // 处理记忆更新（仅在有有效AI响应时执行）
    if (aiResponse && aiResponse.memoryUpdates) {
      await memorySystem.processMemoryUpdates(aiResponse.memoryUpdates);
    }

    } catch (aiError) {
      console.error('[AI处理失败]', aiError);

      // 清理流式输出状态
      streamingMessageIndex.value = null;
      streamingContent.value = '';

      // 显示失败弹窗，明确告知用户生成失败
      const errorMessage = aiError instanceof Error ? aiError.message : '未知错误';
      toast.error(`AI生成失败：${errorMessage}`, {
        duration: 5000
      });

      // 设置当前叙述为错误消息
      currentNarrative.value = {
        type: 'system',
        content: `【生成失败】天道感应中断，未能生成有效回应。原有游戏状态未发生任何变化，请重新尝试。`,
        time: formatCurrentTime(),
        stateChanges: { changes: [] }
      };

      // 重要：不设置任何响应对象，确保后续处理跳过
      aiResponse = null;
    }

    // 系统消息直接覆盖当前叙述
    if (aiResponse && aiResponse.systemMessages && Array.isArray(aiResponse.systemMessages) && aiResponse.systemMessages.length > 0) {
      currentNarrative.value = {
        type: 'system',
        content: aiResponse.systemMessages.join('\n'),
        time: formatCurrentTime(),
        stateChanges: { changes: [] }
      };
    }

    // 成功的提示
    if (aiResponse) {
      toast.success('天道已回');

      // 清空已发送的图片
      clearImages();
      // 清空输入框
      inputText.value = '';

      // 确保数据已保存到本地存储（使用超时保护）
      try {
        console.log('[AI响应处理] 确保最终数据持久化...');
        await Promise.race([
          characterStore.commitToStorage(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('存储超时')), 5000)
          )
        ]);
        console.log('[AI响应处理] 最终数据持久化完成');
      } catch (storageError) {
        console.error('[AI响应处理] 数据持久化失败:', storageError);
        toast.warning('数据保存可能不完整，建议手动保存游戏');
      }
    }

  } catch (error: unknown) {
    console.error('[AI交互] 处理失败:', error);

    // 清理流式输出状态
    streamingMessageIndex.value = null;
    streamingContent.value = '';

    // 设置当前叙述为错误消息
    currentNarrative.value = {
      type: 'system',
      content: `【天道无应】${error instanceof Error ? error.message : '修仙路上遇到了未知阻碍'}`,
      time: formatCurrentTime(),
      stateChanges: { changes: [] }
    };

    toast.error('天道无应，请稍后再试');
  } finally {
    isAIProcessing.value = false;
    // 清除状态持久化
    persistAIProcessingState();
  }
};

// 移除 addMessage 函数，不再需要

// 中期记忆转换缓存系统
const midTermMemoryCache = {
  // 缓存准备转换的中期记忆（临时存储，等待批量转换）
  async cachePendingMidTermMemory(shortTermContent: string, midTermSummary: string) {
    try {
      const helper = getTavernHelper();
      if (!helper) return;

      // 使用简短ID作为key，避免存储完整内容
      const cacheKey = '_pending_mid_term_cache';
      const currentCache = (await helper.getVariables({ type: 'chat' }))[cacheKey] as Record<string, any> || {};

      // 使用简短哈希作为key，而不是完整内容
      const shortId = `mid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      currentCache[shortId] = {
        contentHash: shortTermContent.substring(0, 100), // 只存前100字符用于匹配
        summary: midTermSummary,
        timestamp: new Date().toISOString(),
        processed: false
      };

      // 自动清理超过20条的旧缓存
      const entries = Object.entries(currentCache);
      if (entries.length > 20) {
        const sorted = entries.sort((a: any, b: any) =>
          new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime()
        );
        const cleaned = Object.fromEntries(sorted.slice(0, 20));
        await helper.insertOrAssignVariables({ [cacheKey]: cleaned }, { type: 'chat' });
        console.log('[中期记忆缓存] 已清理旧缓存，保留最新20条');
      } else {
        await helper.insertOrAssignVariables({ [cacheKey]: currentCache }, { type: 'chat' });
      }

      console.log('[中期记忆缓存] 已缓存待转换记忆，缓存数量:', Object.keys(currentCache).length);

      return currentCache;
    } catch (error) {
      console.error('[中期记忆缓存] 缓存失败:', error);
    }
  },

  async getCachedMidTermSummary(shortTermContent: string) {
    try {
      const helper = getTavernHelper();
      if (!helper) return null;

      const cacheKey = '_pending_mid_term_cache';
      const cache = (await helper.getVariables({ type: 'chat' }))[cacheKey] as Record<string, any> || {};

      // 通过前100字符匹配
      const contentPrefix = shortTermContent.substring(0, 100);
      const entry = Object.values(cache).find((item: any) =>
        item.contentHash === contentPrefix && !item.processed
      );

      return entry?.summary || null;
    } catch (error) {
      console.error('[中期记忆缓存] 读取失败:', error);
      return null;
    }
  },
  
  async processPendingMidTermMemories() {
    try {
      const helper = getTavernHelper();
      if (!helper) return [];
      
      const cacheKey = '_pending_mid_term_cache';
      const cache = (await helper.getVariables({ type: 'chat' }))[cacheKey] as Record<string, any> || {};
      const pendingEntries = Object.entries(cache).filter(([_, data]: [string, any]) => !data.processed);
      
      if (pendingEntries.length === 0) return [];
      
      console.log('[中期记忆缓存] 开始处理', pendingEntries.length, '条待转换记忆');
      
      // 准备转换的中期记忆列表
      const midTermMemories = pendingEntries.map(([shortContent, data]: [string, any]) => {
        // 标记为已处理
        cache[shortContent].processed = true;
        return data.summary;
      });
      
      // 更新缓存状态
      await helper.insertOrAssignVariables({ [cacheKey]: cache }, { type: 'chat' });
      
      console.log('[中期记忆缓存] 已处理完成，生成', midTermMemories.length, '条中期记忆');
      return midTermMemories;
    } catch (error) {
      console.error('[中期记忆缓存] 处理失败:', error);
      return [];
    }
  },
  
  async clearProcessedCache() {
    try {
      const helper = getTavernHelper();
      if (!helper) return;
      
      const cacheKey = '_pending_mid_term_cache';
      const cache = (await helper.getVariables({ type: 'chat' }))[cacheKey] as Record<string, any> || {};
      
      // 只清除已处理的条目
      const unprocessedCache = Object.fromEntries(
        Object.entries(cache).filter(([_, data]: [string, any]) => !data.processed)
      );
      
      await helper.insertOrAssignVariables({ [cacheKey]: unprocessedCache }, { type: 'chat' });
      console.log('[中期记忆缓存] 已清除已处理的缓存条目');
    } catch (error) {
      console.error('[中期记忆缓存] 清除缓存失败:', error);
    }
  }
};
const addToShortTermMemory = async (content: string, role: 'user' | 'assistant' = 'assistant') => {
  try {
    console.log(`[记忆管理] 开始添加 ${role} 消息到短期记忆`);
    console.log(`[记忆管理] 内容长度: ${content.length}`);
    console.log(`[记忆管理] 内容预览: ${content.substring(0, 100)}...`);

    const save = characterStore.activeSaveSlot;
    const sd = save?.存档数据;
    
    console.log(`[记忆管理] 当前存档槽位:`, save);
    console.log(`[记忆管理] 存档数据可用性:`, !!sd);
    
    if (!sd) {
      console.warn('[记忆管理] 存档数据不可用，无法存储短期记忆');
      return;
    }

    // 确保记忆结构存在
    if (!sd.记忆) {
      console.log('[记忆管理] 初始化记忆结构');
      sd.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
    }
    if (!Array.isArray(sd.记忆.短期记忆)) {
      console.log('[记忆管理] 初始化短期记忆数组');
      sd.记忆.短期记忆 = [];
    }

    console.log(`[记忆管理] 添加前短期记忆数量: ${sd.记忆.短期记忆.length}`);

    // 检查是否有AI生成的中期记忆总结
    const gmResp = (window as any).lastGmResponse; // 临时获取最新的AI响应
    if (gmResp?.mid_term_memory && typeof gmResp.mid_term_memory === 'string' && gmResp.mid_term_memory.trim()) {
      console.log('[记忆管理] 发现AI生成的中期记忆，缓存以备转换');
      await midTermMemoryCache.cachePendingMidTermMemory(content, gmResp.mid_term_memory);
    }

    // 添加新记忆到短期记忆
    sd.记忆.短期记忆.unshift(content);
    console.log(`[记忆管理] 短期记忆已添加，当前数量: ${sd.记忆.短期记忆.length}`);

    // 检查短期记忆是否超出限制，触发转换
    if (sd.记忆.短期记忆.length > maxShortTermMemories.value) {
      console.log(`[记忆管理] 短期记忆超出限制（${maxShortTermMemories.value}），开始转换到中期记忆`);
      
      // 获取溢出的短期记忆
      const overflow = sd.记忆.短期记忆.splice(maxShortTermMemories.value).reverse();
      console.log(`[记忆管理] ${overflow.length}条短期记忆需要转换`);

      // 确保中期记忆结构存在
      if (!sd.记忆.中期记忆) sd.记忆.中期记忆 = [];

      // 处理转换：优先使用缓存的中期记忆总结
      const summariesToAdd: string[] = [];
      const gameTime = sd.游戏时间;
      const timeString = gameTime ? `【${gameTime.年}年${gameTime.月}月${gameTime.日}日】` : '';

      for (const narrative of overflow) {
        // 首先尝试从缓存获取中期记忆总结
        const cachedSummary = await midTermMemoryCache.getCachedMidTermSummary(narrative);

        if (cachedSummary) {
          console.log('[记忆管理] 使用缓存的中期记忆总结');
          summariesToAdd.push(`${timeString} ${cachedSummary}`);
        } else {
          // 回退：尝试从旧的缓存系统获取
          const summary = await characterStore.manageTavernMemoryCache.getSummary(narrative);

          if (summary) {
            summariesToAdd.push(`${timeString} ${summary}`);
            await characterStore.manageTavernMemoryCache.removeSummary(narrative);
            console.log('[记忆管理] 使用旧缓存系统的总结');
          } else {
            // 没有mid_term_memory就不存储
            console.warn(`[记忆管理] 未找到中期记忆总结，跳过存储此条记忆`);
          }
        }
      }

      // 添加到中期记忆
      sd.记忆.中期记忆.unshift(...summariesToAdd);
      console.log(`[记忆管理] 已转换 ${summariesToAdd.length} 条到中期记忆，当前中期记忆数量: ${sd.记忆.中期记忆.length}`);

      // 清理已处理的缓存
      await midTermMemoryCache.clearProcessedCache();

      // 检查中期记忆是否需要转换到长期记忆
      if (sd.记忆.中期记忆.length > maxMidTermMemories.value) {
        await transferToLongTermMemory();
      }
    }
    
    console.log('[记忆管理] 短期记忆保存完成');
    
    // 立即验证保存结果
    const verifyMemories = sd.记忆.短期记忆;
    console.log(`[记忆管理] 验证: 当前短期记忆总数: ${verifyMemories.length}`);
    if (verifyMemories.length > 0) {
      console.log(`[记忆管理] 验证: 最新记忆: ${verifyMemories[0].substring(0, 50)}...`);
    }
    
    // 关键：立即持久化到本地存储（使用超时保护）
    console.log('[记忆管理] 开始持久化存档数据...');
    try {
      await Promise.race([
        characterStore.commitToStorage(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('存储超时')), 5000)
        )
      ]);
      console.log('[记忆管理] 存档数据已持久化到本地存储');
    } catch (error) {
      console.error('[记忆管理] 存档数据持久化失败:', error);
      toast.warning('数据保存可能不完整');
    }
    
    // 关键：同步到酒馆变量
    console.log('[记忆管理] 开始同步数据到酒馆变量...');
    const activeCharId = characterStore.rootState.当前激活存档?.角色ID;
    console.log('[记忆管理] 当前激活角色ID:', activeCharId);
    
    if (activeCharId) {
      await characterStore.setActiveCharacterInTavern(activeCharId);
      console.log('[记忆管理] 数据已同步到酒馆变量 character.saveData');
    } else {
      console.warn('[记忆管理] 没有激活的角色ID，跳过酒馆同步');
      // 尝试直接更新存档数据到酒馆
      try {
        const helper = getTavernHelper();
        if (helper && sd) {
          await helper.insertOrAssignVariables({
            'character.saveData': sd
          }, { type: 'chat' });
          console.log('[记忆管理] 已直接同步存档数据到酒馆');
        }
      } catch (e) {
        console.error('[记忆管理] 直接同步失败:', e);
      }
    }
    
  } catch (error) {
    console.error('[记忆管理] 添加短期记忆或转移中期记忆失败:', error);
  }
};

// transferToMidTermMemory 函数已被合并到 addToShortTermMemory 中，故移除

// 转移到长期记忆 - 直接操作存档数据
const transferToLongTermMemory = async () => {
  try {
    console.log('[记忆管理] 开始转移到长期记忆');

    const save = characterStore.activeSaveSlot;
    const sd = save?.存档数据;
    if (!sd?.记忆?.中期记忆) {
      console.warn('[记忆管理] 存档或中期记忆数据不可用，无法处理长期记忆转移');
      return;
    }

    const excess = sd.记忆.中期记忆.length - maxMidTermMemories.value;

    if (excess > 0) {
      const oldMemories = sd.记忆.中期记忆.splice(maxMidTermMemories.value);

      // 生成长期记忆总结
      const summary = await generateLongTermSummary(oldMemories);
      if (summary) {
        // 确保长期记忆结构存在
        if (!sd.记忆.长期记忆) sd.记忆.长期记忆 = [];

        // 添加新的总结到长期记忆开头
        sd.记忆.长期记忆.unshift(summary);

        console.log(`[记忆管理] 总结 ${oldMemories.length} 条记忆到长期记忆，长期记忆总数: ${sd.记忆.长期记忆.length} 条`);
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
    // 单行基准高度（根据line-height计算）
    const lineHeight = 1.4; // 与CSS中的line-height一致
    const fontSize = 0.9; // rem
    const padding = 16; // 8px * 2
    const singleLineHeight = fontSize * 16 * lineHeight + padding; // 约36px

    // 计算所需高度
    textarea.style.height = `${singleLineHeight}px`; // 先设置为单行高度
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120; // 与CSS中的max-height保持一致

    // 只有当内容超过单行时才增加高度
    if (scrollHeight > singleLineHeight) {
      const newHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }

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

// 初始化/重新初始化面板以适应当前存档
const initializePanelForSave = async () => {
  console.log('[主面板] 为当前存档初始化面板 (新逻辑)...');
  try {
    if (hasActiveCharacter.value) {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      const memories = saveData?.记忆?.短期记忆;

      // 优先从叙事历史中恢复最近的一条记录（包含stateChanges）
      if (saveData?.叙事历史 && saveData.叙事历史.length > 0) {
        const latestNarrative = saveData.叙事历史[0];
        console.log('[主面板] 从叙事历史恢复最新叙述（含状态变更日志）');

        currentNarrative.value = {
          type: latestNarrative.type,
          content: latestNarrative.content,
          time: latestNarrative.time,
          stateChanges: latestNarrative.stateChanges || { changes: [] }
        };
      } else if (memories && memories.length > 0) {
        // 回退：从记忆加载（无stateChanges）
        const initialMessageContent = memories[0];
        console.log('[主面板] 从存档加载最新叙述:', initialMessageContent.substring(0, 100));

        // 对于新角色，初始状态变更被临时存储。我们在这里消费它，确保只显示一次。
        const initialChanges = characterStore.consumeInitialCreationStateChanges();

        currentNarrative.value = {
          type: 'gm', // 将第一条消息视为GM消息
          content: initialMessageContent,
          time: formatCurrentTime(),
          // 如果有初始变更，就使用它们；否则，默认为空。
          stateChanges: initialChanges || { changes: [] },
        };

        if (initialChanges) {
            console.log('[主面板] 已加载并消费角色创建时的初始状态变更。');
        }

      } else {
        // 未找到记忆，说明角色创建时AI生成失败，应当重新尝试生成
        console.error('[主面板] 未在存档中找到任何记忆，角色创建可能失败！');
        currentNarrative.value = {
          type: 'system',
          content: '【系统错误】角色创建未完成，请重新创建角色。',
          time: formatCurrentTime(),
          stateChanges: { changes: [] },
        };
      }
      await syncGameState();
    } else {
      // 没有激活的角色
      currentNarrative.value = {
        type: 'system',
        content: '【提示】请先选择或创建角色开始游戏。',
        time: formatCurrentTime(),
        stateChanges: { changes: [] }
      };
    }
    nextTick(() => {
      if (contentAreaRef.value) {
        contentAreaRef.value.scrollTop = contentAreaRef.value.scrollHeight;
      }
    });
  } catch (error) {
    console.error('[主面板] 初始化存档数据失败:', error);
    currentNarrative.value = {
      type: 'system',
      content: '【系统】加载存档数据时遇到问题。',
      time: formatCurrentTime(),
      stateChanges: { changes: [] }
    };
  }
};

// 重置面板状态以进行存档切换
const resetPanelState = () => {
  console.log('[主面板] 检测到存档切换，正在重置面板状态...');
  actionQueue.clearActions();
  currentNarrative.value = null;
  inputText.value = '';

  // --- 重置命令日志相关状态 ---

  // isAIProcessing 在切换存档时应重置为 false
  isAIProcessing.value = false;
  persistAIProcessingState(); // 清除持久化状态
};

// 监听激活存档ID的变化
watch(() => characterStore.rootState.当前激活存档, async (newSlotId, oldSlotId) => {
  // 仅在实际发生切换时执行，忽略组件首次加载（oldSlotId为undefined）
  if (newSlotId && newSlotId !== oldSlotId) {
    console.log(`[主面板] 存档已切换: 从 ${oldSlotId || '无'} 到 ${newSlotId}`);
    resetPanelState();
    await initializePanelForSave();
  }
});

// 监听短期记忆的变化，确保显示始终同步
watch(() => characterStore.activeSaveSlot?.存档数据?.记忆?.短期记忆, (newMemories) => {
  // AI处理期间不更新，避免覆盖流式输出
  if (!isAIProcessing.value && newMemories && newMemories.length > 0) {
    const latestMemory = newMemories[0];
    // 如果当前显示的内容不是最新的记忆，则更新
    if (!currentNarrative.value || currentNarrative.value.content !== latestMemory) {
      console.log('[主面板] 检测到短期记忆变更，同步更新显示。');
      currentNarrative.value = {
        type: 'ai',
        content: latestMemory,
        time: formatCurrentTime(),
        stateChanges: { changes: [] } // 状态变更是瞬时的，此处不显示历史变更
      };
    }
  }
}, { deep: true });

// 组件挂载时执行一次性初始化
onMounted(async () => {
  try {
    // 一次性设置
    loadMemorySettings();
    restoreAIProcessingState();
    await initializeSystemConnections();
    nextTick(adjustTextareaHeight);

    // 为初始加载的存档初始化面板
    await initializePanelForSave();

  } catch (error) {
    console.error('[主面板] 首次挂载失败:', error);
    currentNarrative.value = {
      type: 'system',
      content: '【系统】初始化遇到问题，请刷新页面重试。',
      time: formatCurrentTime(),
      stateChanges: { changes: [] }
    };
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

// [已删除] 不再需要 generateAndShowInitialMessage 函数，因为新的 initializePanelForSave 逻辑更可靠。

// 移除 loadConversationHistory 和 saveConversationHistory 函数
</script>

<style scoped>
/* 命令日志弹窗样式 */
.command-log-overlay {
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

.command-log-modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

/* 弹窗动画 */
.command-log-modal-enter-active,
.command-log-modal-leave-active {
  transition: all 0.3s ease;
}
.command-log-modal-enter-from,
.command-log-modal-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.command-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--color-surface-light) 0%, var(--color-surface-hover) 100%);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.command-log-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-log-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-log-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  transform: rotate(90deg);
}

.command-log-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.command-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.command-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.command-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary);
}

.command-icon-wrapper {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.command-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.command-description {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.4;
}

.command-values {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-family: var(--font-family-mono);
}

.old-value, .new-value {
  padding: 4px 8px;
  border-radius: 4px;
}

.old-value {
  background: rgba(var(--color-error-rgb), 0.1);
  color: var(--color-danger);
  text-decoration: line-through;
}

.new-value {
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  font-weight: 600;
}

.arrow {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.no-commands {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.no-commands .empty-icon {
  opacity: 0.5;
  margin-bottom: 1rem;
}

.no-commands .empty-text {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-size: 1rem;
}

.no-commands .empty-hint {
  font-size: 0.85rem;
  opacity: 0.8;
}

/* 深色主题适配 */
[data-theme="dark"] .command-log-modal {
  background: #1e293b;
  border-color: #475569;
}
[data-theme="dark"] .command-log-header {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  border-color: #475569;
}
[data-theme="dark"] .command-item {
  background: #334155;
  border-color: #475569;
}
[data-theme="dark"] .command-item:hover {
  border-color: var(--color-primary);
}
[data-theme="dark"] .command-icon-wrapper {
  background: rgba(var(--color-primary-rgb), 0.1);
}
[data-theme="dark"] .old-value {
  background: rgba(var(--color-error-rgb), 0.2);
}
[data-theme="dark"] .new-value {
  background: rgba(var(--color-success-rgb), 0.2);
}

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

/* 当前叙述显示区域 */
.current-narrative {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0; /* 防止flex收缩问题 */
  border-radius: 12px; /* 圆角 */
  box-shadow: none !important; /* 移除阴影 */
  background-color: var(--color-background) !important; /* 与padding区域相同背景色 */
}

.content-area {
  background-color: var(--color-background) !important; /* 强制应用背景色 */
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  /* 显示可见的滚动拇指，但轨道透明 */
  scrollbar-color: rgba(148, 163, 184, 0.6) transparent;
  box-sizing: border-box;
  min-height: 200px;
  display: flex; /* 让子元素可以撑满高度 */
  box-shadow: none !important; /* 移除阴影 */
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
  background: var(--color-surface); /* 确保AI处理区域使用主题表面颜色 */
}

/* 重置状态按钮 */
.reset-state-btn {
  padding: 4px 12px;
  font-size: 13px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto; /* 推到右侧 */
}

.reset-state-btn:hover {
  background: #d97706;
  transform: translateY(-1px);
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
  align-items: center;
  justify-content: center;
  padding: 60px 0; /* 增加一些垂直空间 */
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

/* .waiting-text is no longer used */

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
  padding: 8px 16px;
  padding-right: 0; /* 右侧留给流式传输选项 */
  outline: none;
  box-shadow: none;
  resize: none;
  overflow-y: auto;
  width: 100%; /* 确保宽度填满容器 */
  min-height: 24px; /* 单行高度 */
  max-height: 120px;
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
/* .current-narrative 样式已合并到 line 1996 */

.narrative-content {
  line-height: 1.8;
  color: var(--color-text);
  font-size: 0.95rem;
  background: var(--color-surface); /* 确保叙述内容区域背景一致 */
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
  padding: 16px 20px 20px 20px; /* 进一步增加底部内边距 */
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


[data-theme="dark"] .ai-processing-display {
  background: #1e293b !important;
}

[data-theme="dark"] .reset-state-btn {
  background: #f59e0b;
}

[data-theme="dark"] .reset-state-btn:hover {
  background: #d97706;
}

[data-theme="dark"] .narrative-content {
  background: #1e293b !important;
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

/* 图片预览容器样式 */
.image-preview-container {
  display: flex;
  gap: 8px;
  padding: 8px;
  flex-wrap: wrap;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.image-preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
  transition: all 0.2s ease;
}

.image-preview-item:hover {
  border-color: #3b82f6;
  transform: scale(1.05);
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  padding: 0;
  background: rgba(239, 68, 68, 0.9);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
}

.image-preview-item:hover .remove-image-btn {
  opacity: 1;
}

.remove-image-btn:hover {
  background: rgba(220, 38, 38, 1);
  transform: scale(1.1);
}

/* 图片上传按钮特殊样式 */
.image-upload-btn svg {
  color: #10b981;
}

.image-upload-btn:hover:not(:disabled) svg {
  color: #059669;
}

/* 深色主题图片预览样式 */
[data-theme="dark"] .image-preview-container {
  background: #0f172a;
  border-bottom-color: #475569;
}

[data-theme="dark"] .image-preview-item {
  border-color: #475569;
}

[data-theme="dark"] .image-preview-item:hover {
  border-color: #3b82f6;
}
</style>
