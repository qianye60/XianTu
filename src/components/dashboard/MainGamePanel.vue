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

    <!-- 文本显示区域 -->
    <div class="content-area" ref="contentAreaRef">
      <div class="message-container">
        <div 
          v-for="(message, index) in gameMessages" 
          :key="index" 
          class="message" 
          :class="`message-${message.type}`"
        >
          <div class="message-meta">
            <span class="message-time">{{ message.time }}</span>
          </div>
          <div class="message-text">{{ message.content }}</div>
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
        <textarea
          v-model="inputText"
          @focus="isInputFocused = true"
          @blur="isInputFocused = false"
          @keydown="handleKeyDown"
          :placeholder="hasActiveCharacter ? '请输入您的选择或行动...' : '请先选择角色...'"
          class="game-input"
          ref="inputRef"
          rows="1"
          :disabled="!hasActiveCharacter || isAIProcessing"
        ></textarea>
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
import { getTavernHelper } from '@/utils/tavern';
import { MultiLayerMemorySystem } from '@/utils/MultiLayerMemorySystem';
import { AIBidirectionalSystem } from '@/utils/AIBidirectionalSystem';
import { GameStateManager } from '@/utils/GameStateManager';
import { RuntimeReasonabilityValidator, type DifficultyLevel, type AuditResult } from '@/utils/prompts/reasonabilityAudit';
import { toast } from '@/utils/toast';
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
const memorySystem = MultiLayerMemorySystem.getInstance();
const bidirectionalSystem = AIBidirectionalSystem.getInstance();
const gameStateManager = GameStateManager.getInstance();

// 流式输出状态
const streamingMessageIndex = ref<number | null>(null);
const streamingContent = ref('');

// 合理性审查配置
const auditDifficulty = ref<DifficultyLevel>('normal');

const gameMessages = ref<GameMessage[]>([]);

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
    } else if (save?.存档数据?.短期记忆) {
      backupMemories = save.存档数据.短期记忆;
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
  inputText.value = '';
  
  // 添加用户消息
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
      aiResponse = await bidirectionalSystem.processPlayerAction(
        userMessage,
        character,
        gameState,
        {
          onStreamChunk: handleStreamingResponse,
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
        }
      );
      
      // 合理性审查检查
      if (aiResponse.gmResponse && characterStore.activeSaveSlot?.存档数据) {
        const auditResult = await performReasonabilityAudit(
          aiResponse.gmResponse as GM_Response,
          characterStore.activeSaveSlot.存档数据,
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

// 添加消息并滚动到底部
const addMessage = (message: GameMessage) => {
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

// 格式化当前时间
function formatCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

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

// 初始化时加载对话历史（增强版）
onMounted(async () => {
  try {
    // 初始化系统连接
    await initializeSystemConnections();
    
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
    } else if (saveData.存档数据?.短期记忆?.[0]) {
      initialMessage = saveData.存档数据.短期记忆[0];
      console.log('[主面板] 从存档记忆中加载到初始消息（短期记忆路径）:', initialMessage.substring(0, 100));
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
      const activeSlot = characterStore.activeSaveSlot;
      let birthplaceName = '';
      try {
        const worldInfo = activeSlot?.存档数据?.世界信息 as any;
        const birthplace = worldInfo?.玩家出生地 || {};
        birthplaceName = birthplace.出生地名称 || birthplace.名称 || birthplace.name || '';
      } catch {}
      const birthplaceText = birthplaceName ? `你出生于【${birthplaceName}】。` : '';
      initialMessage = `【${profile.角色基础信息.名字}】${birthplaceText}发现自己身处在一个陌生而神秘的修仙世界中。作为一名${profile.角色基础信息.出生}出身的修士，拥有${profile.角色基础信息.灵根}，你感受到了体内微弱的灵气波动。修仙之路漫漫，从这一刻开始，你将踏上寻求长生大道的征途。`;
    }
    
    // 显示初始消息
    addMessage({
      type: 'gm',
      content: initialMessage,
      time: formatCurrentTime()
    });
    
    console.log('[主面板] 初始消息加载完成');
    
  } catch (error) {
    console.error('[主面板] 加载初始消息失败:', error);
    
    // 添加默认开局消息
    addMessage({
      type: 'gm',
      content: `【${characterName.value}】你睁开双眼，发现自己身处在一个全新的修仙世界中。周围的一切都显得古朴而神秘，空气中弥漫着淡淡的灵气。你感受到体内有着一股前所未有的力量在涌动，这是属于修仙者的开始...`,
      time: formatCurrentTime()
    });
  }
};

// 加载对话历史
const loadConversationHistory = async () => {
  try {
    const save = characterStore.activeSaveSlot;
    if (save?.存档数据?.对话历史) {
      const history = save.存档数据.对话历史;
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
    if (save?.存档数据) {
      // 保存到角色存档
      save.存档数据.对话历史 = gameMessages.value.map(msg => ({
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
  background: white;
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
  background: white;
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
  padding: 16px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  box-sizing: border-box;
  min-height: 200px;
}

.content-area::-webkit-scrollbar {
  width: 6px;
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
}

.content-area::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.content-area::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.message-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: none;
}

.message {
  padding: 16px 20px;
  border-radius: 12px;
  transition: all 0.2s ease;
  animation: messageSlideIn 0.3s ease-out;
  position: relative;
  overflow: hidden;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-system {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-left: 4px solid #94a3b8;
  color: #475569;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.message-ai {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-left: 4px solid #0ea5e9;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
}

.message-game {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #bbf7d0;
  border-left: 4px solid #22c55e;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.1);
}

.message-player {
  background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
  border: 1px solid #fde68a;
  border-left: 4px solid #eab308;
  color: #0f172a;
  margin-left: 10%;
  margin-right: 5%;
  box-shadow: 0 2px 8px rgba(234, 179, 8, 0.1);
  position: relative;
}

.message-player::before {
  content: "💭";
  position: absolute;
  top: -8px;
  right: 16px;
  background: #f59e0b;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.message-meta {
  margin-bottom: 6px;
}

.message-time {
  font-size: 0.75rem;
  color: #64748b;
  font-family: 'Courier New', monospace;
}

.message-text {
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
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
  align-items: flex-end;
  width: 100%;
  max-width: none;
}

.game-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #374151;
  background: white;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  font-family: inherit;
  transition: all 0.2s ease;
}

.game-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.game-input:disabled {
  background: #f9fafb;
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
  background: #1e293b;
}

[data-theme="dark"] .content-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .content-area::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

[data-theme="dark"] .message-system {
  background: #334155;
  border-left-color: #64748b;
  color: #e2e8f0;
}

[data-theme="dark"] .message-ai {
  background: #1e3a8a;
  border-left-color: #3b82f6;
  color: #e2e8f0;
}

[data-theme="dark"] .message-game {
  background: #14532d;
  border-left-color: #22c55e;
  color: #e2e8f0;
}

[data-theme="dark"] .message-player {
  background: #422006;
  border-left-color: #eab308;
  color: #e2e8f0;
}

[data-theme="dark"] .message-time {
  color: #94a3b8;
}

[data-theme="dark"] .input-section {
  background: #334155;
  border-top-color: #475569;
}

[data-theme="dark"] .game-input {
  background: #1e293b;
  border-color: #475569;
  color: #e2e8f0;
}

[data-theme="dark"] .game-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

[data-theme="dark"] .game-input:disabled {
  background: #0f172a;
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

/* 行动选择器按钮 */
.action-selector-btn {
  width: 44px;
  height: 44px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6366f1;
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
  background: white;
  border-radius: 12px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.action-config-modal {
  background: white;
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
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
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
  background: white;
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
  background: white;
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
  background: white;
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
