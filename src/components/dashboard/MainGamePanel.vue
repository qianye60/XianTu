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
      <div class="current-narrative">
        <div v-if="currentNarrative" class="narrative-content">
          <div class="narrative-meta">
            <span class="narrative-time">{{ currentNarrative.time }}</span>
          </div>
          <div class="narrative-text">
            <FormattedText :text="currentNarrative.content" />
          </div>
        </div>
        <div v-else-if="!isAIProcessing" class="empty-narrative">
          静待天机变化...
        </div>

        <!-- AI处理时的等待指示器 - 只在AI处理时显示 -->
        <div v-if="isAIProcessing" class="ai-processing-display">
          <!-- 如果有流式内容则显示 -->
          <div v-if="useStreaming && streamingContent" class="streaming-content">
            <div class="narrative-meta">
              <span class="narrative-time">{{ formatCurrentTime() }}</span>
              <div class="streaming-indicator">
                <span class="streaming-dot"></span>
                <span class="streaming-text">接收中 {{ streamingCharCount }} 字</span>
              </div>
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
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-section">
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
import { ref, onMounted, nextTick, computed } from 'vue';
import { Send, Loader2, ChevronDown, ChevronRight } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { useActionQueueStore } from '@/stores/actionQueueStore';
import { getTavernHelper } from '@/utils/tavern';
import { MultiLayerMemorySystem } from '@/utils/MultiLayerMemorySystem';
import { AIBidirectionalSystem } from '@/utils/AIBidirectionalSystem';
import { GameStateManager } from '@/utils/GameStateManager';
import { RuntimeReasonabilityValidator, type DifficultyLevel, type AuditResult } from '@/utils/prompts/reasonabilityAudit';
import { toast } from '@/utils/toast';
import FormattedText from '@/components/common/FormattedText.vue';
import type { GameMessage, SaveData } from '@/types/game';
import type { GM_Response } from '@/types/AIGameMaster';

const inputText = ref('');
const isInputFocused = ref(false);
const isAIProcessing = ref(false);
const inputRef = ref<HTMLTextAreaElement>();
const contentAreaRef = ref<HTMLDivElement>();
const memoryExpanded = ref(false);
const showMemorySection = ref(true);

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

// 当前显示的叙述内容（只显示最新的AI回复）
const currentNarrative = ref<GameMessage | null>(null);

// 短期记忆设置
const maxShortTermMemories = ref(10); // 最大短期记忆数量
const maxMidTermMemories = ref(50); // 最大中期记忆数量

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

// 短期记忆相关 - 优化版本
const recentMemories = computed(() => {
  try {
    // 优先从多层记忆系统获取
    // const memories = memorySystem.getShortTermMemories();
    // const memorySettings = aiService.getMemorySettings?.() || { shortTerm: { maxLength: 5 } };
    const maxLength = 5; // 临时硬编码

    // 后备方案：从存档获取
    const save = characterStore.activeSaveSlot;
    let backupMemories: string[] = [];
    if (save?.存档数据?.记忆?.短期记忆) {
      backupMemories = save.存档数据.记忆.短期记忆;
    } else {
      const legacyShort = (save?.存档数据 as any)?.短期记忆;
      if (Array.isArray(legacyShort)) {
        backupMemories = legacyShort;
      }
    }

    if (Array.isArray(backupMemories) && backupMemories.length > 0) {
      return backupMemories.slice(-maxLength);
    }

    return [];
  } catch (error) {
    console.warn('[主面板] 获取短期记忆失败:', error);
    return [];
  }
});

const toggleMemory = () => {
  memoryExpanded.value = !memoryExpanded.value;
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

  const userMessage = inputText.value.trim();

  // 获取并消费操作队列中的提示词
  const actionPrompt = actionQueue.consumeActions();

  // 将操作提示词附加到用户消息
  const finalUserMessage = actionPrompt ? userMessage + actionPrompt : userMessage;

  inputText.value = '';

  // 重置输入框高度
  nextTick(() => {
    adjustTextareaHeight();
  });

  // 添加用户消息（显示原始消息）
  addMessage({
    type: 'player',
    content: userMessage,
    time: formatCurrentTime()
  });

  isAIProcessing.value = true;

  try {
    // 获取当前游戏状态
    const gameState = gameStateManager.getCurrentState();
    const character = characterStore.activeCharacterProfile;

    if (!character) {
      throw new Error('角色数据缺失');
    }

    // 更新记忆系统
    // await memorySystem.addShortTermMemory(userMessage, 'player');

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
      const options: Record<string, any> = {
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

      // 处理AI返回的完整响应
      if (aiResponse.finalContent && typeof aiResponse.finalContent === 'string') {
        const finalMessage = gameMessages.value[streamingMessageIndex_local];
        if (finalMessage) {
          finalMessage.content = aiResponse.finalContent;
        }
      }

      // 处理游戏状态更新
      if (aiResponse.stateChanges) {
        await gameStateManager.applyStateChanges(aiResponse.stateChanges);
        characterStore.updateCharacterData(aiResponse.stateChanges);
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
  }
};

// 添加消息 - 新的记忆管理机制
const addMessage = (message: GameMessage) => {
  // 将旧的当前叙述移入短期记忆
  if (currentNarrative.value && (message.type === 'ai' || message.type === 'gm')) {
    addToShortTermMemory(currentNarrative.value.content);
  }

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

// 添加到短期记忆
const addToShortTermMemory = (content: string) => {
  try {
    const save = characterStore.activeSaveSlot;
    const sd = save?.存档数据;
    if (sd) {
      // 确保短期记忆数组存在
      if (!sd.记忆) {
        sd.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
      }
      if (!sd.记忆.短期记忆) {
        sd.记忆.短期记忆 = [];
      }
      if (!sd.记忆.中期记忆) {
        sd.记忆.中期记忆 = [];
      }

      // 添加到短期记忆开头
      sd.记忆.短期记忆.unshift(content);

      // 检查短期记忆是否超出限制
      if (sd.记忆.短期记忆.length > maxShortTermMemories.value) {
        // 将超出的记忆批量转移到中期记忆（不逐条生成总结）
        const overflow = sd.记忆.短期记忆.splice(maxShortTermMemories.value);
        // 保持时间顺序：最旧的在前
        overflow.reverse().forEach(mem => sd.记忆.中期记忆.unshift(mem));

        // 限制中期记忆数量
        if (sd.记忆.中期记忆.length > maxMidTermMemories.value) {
          sd.记忆.中期记忆.splice(maxMidTermMemories.value);
        }

        console.log(`[记忆管理] 短期记忆达到限制，转移${overflow.length}条到中期记忆（无总结）`);
      }
    }
  } catch (error) {
    console.warn('[记忆管理] 添加短期记忆失败:', error);
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

    // 优先从存档的记忆中获取初始消息（由characterInitialization.ts保存）
    let initialMessage = '';

    // 尝试从不同的存档结构路径获取初始消息
    if (saveData.存档数据?.记忆?.短期记忆?.[0]) {
      initialMessage = saveData.存档数据.记忆.短期记忆[0];
      console.log('[主面板] 从存档记忆中加载到初始消息（记忆路径）:', initialMessage.substring(0, 100));
    } else {
      const legacyShort = (saveData.存档数据 as any)?.短期记忆;
      if (legacyShort?.[0]) {
        initialMessage = legacyShort[0];
        console.log('[主面板] 从存档记忆中加载到初始消息（短期记忆路径）:', initialMessage.substring(0, 100));
      }
    }

    // 如果存档中没有初始消息，尝试从酒馆变量中获取
    if (!initialMessage) {
      console.log('[主面板] 存档中未找到初始消息，尝试从酒馆变量获取...');
      try {
        const helper = getTavernHelper();
        if (helper) {
          // 为 saveData 添加类型定义以解决 TypeScript 错误
          interface SaveDataWithMemory {
            记忆?: {
              短期记忆?: string[];
            };
          }

          const chatVars = await helper.getVariables({ type: 'chat' });
          const saveData = chatVars['character.saveData'] as SaveDataWithMemory | undefined;

          if (saveData?.记忆?.短期记忆?.[0]) {
            initialMessage = saveData.记忆.短期记忆[0];
            console.log('[主面板] 从character.saveData中加载到初始消息:', initialMessage.substring(0, 100));
          }
        }
      } catch (error) {
        console.warn('[主面板] 从酒馆变量获取初始消息失败:', error);
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

.streaming-content .narrative-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--color-primary);
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
}

.narrative-time {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

.narrative-text {
  /* 移除重复的样式，让内部FormattedText组件处理 */
}

.empty-narrative {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-style: italic;
  font-size: 0.9rem;
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

[data-theme="dark"] .empty-narrative {
  color: #6b7280;
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
[data-theme="dark"] .streaming-content .narrative-meta {
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
</style>
