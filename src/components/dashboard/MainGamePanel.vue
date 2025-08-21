<template>
  <div class="main-game-panel">
    <!-- 文本显示区域 -->
    <div class="text-area" ref="textAreaRef">
      <div class="message-list">
        <div v-for="(message, index) in gameMessages" :key="index" class="message-item" :class="message.type">
          <div class="message-time">{{ message.time }}</div>
          <div class="message-content">{{ message.content }}</div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-container" :class="{ 'focused': isInputFocused }">
        <textarea
          v-model="inputText"
          @focus="isInputFocused = true"
          @blur="isInputFocused = false"
          @keydown="handleKeyDown"
          :placeholder="hasActiveCharacter ? '输入你的选择或行动...' : '请先选择角色...'"
          class="game-input"
          ref="inputRef"
          rows="1"
        ></textarea>
        <button @click="sendMessage" :disabled="!inputText.trim() || isAIProcessing || !hasActiveCharacter" class="send-btn">
          {{ isAIProcessing ? '思考中...' : '发送' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { GameAIService, type GameMessage } from '@/services/gameAIService';
import { toast } from '@/utils/toast';

const inputText = ref('');
const isInputFocused = ref(false);
const isAIProcessing = ref(false);
const inputRef = ref<HTMLTextAreaElement>();
const textAreaRef = ref<HTMLDivElement>();

const characterStore = useCharacterStore();
const aiService = GameAIService.getInstance();

const gameMessages = ref<GameMessage[]>([
  {
    type: 'system',
    content: '【系统】修仙模拟器已启动，准备进入修行世界...',
    time: formatCurrentTime()
  }
]);

// 计算属性：检查是否有激活的角色
const hasActiveCharacter = computed(() => {
  return !!characterStore.activeCharacterProfile;
});

// 计算属性：角色名称
const characterName = computed(() => {
  return characterStore.activeCharacterProfile?.角色基础信息.名字 || '无名道友';
});

// 发送消息给AI
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
    // 显示AI思考状态
    const thinkingMessageIndex = gameMessages.value.length;
    addMessage({
      type: 'system',
      content: '【天道推演】正在感悟您的行动...',
      time: formatCurrentTime()
    });
    
    // 调用AI服务处理消息
    const aiResponse = await aiService.sendMessageToAI(
      userMessage, 
      characterStore.activeCharacterProfile!,
      (message) => {
        // 实时更新消息 - 替换思考消息
        if (message.type === 'ai') {
          gameMessages.value[thinkingMessageIndex] = message;
          saveConversationHistory();
          // 滚动到底部
          nextTick(() => {
            if (textAreaRef.value) {
              textAreaRef.value.scrollTop = textAreaRef.value.scrollHeight;
            }
          });
        }
      }
    );
    
    // 如果有额外的消息，添加它们
    if (aiResponse.length > 0) {
      aiResponse.forEach(message => {
        if (message.type !== 'ai') { // AI消息已经在回调中处理了
          addMessage(message);
        }
      });
    }
    
    toast.success('天道已应');
    
  } catch (error: any) {
    console.error('AI交互失败:', error);
    
    // 移除思考消息，添加错误消息
    gameMessages.value.pop();
    addMessage({
      type: 'system',
      content: `【天道无应】${error.message || '未知错误'}`,
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
    if (textAreaRef.value) {
      textAreaRef.value.scrollTop = textAreaRef.value.scrollHeight;
    }
  });
};

// 格式化当前时间
function formatCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// 初始化时添加欢迎消息和恢复对话历史
onMounted(async () => {
  if (hasActiveCharacter.value) {
    // 尝试从存档恢复对话历史
    await loadConversationHistory();
    
    const character = characterStore.activeCharacterProfile;
    const save = characterStore.activeSaveSlot;
    const location = save?.存档数据?.玩家角色状态?.位置?.描述 || '未知之地';
    const realm = save?.存档数据?.玩家角色状态?.境界?.名称 || '凡人境';
    
    addMessage({
      type: 'system',
      content: `【天道感应】${characterName.value}道友，您当前位于${location}，境界为${realm}。道路漫漫，愿您道心坚定...`,
      time: formatCurrentTime()
    });
    
    // 如果没有对话历史，添加开局描述
    if (gameMessages.value.length <= 2) {
      addMessage({
        type: 'ai',
        content: `晨光微曦，您在${location}缓缓睁开双眼。修行路上，每一日都是新的开始。您打算如何度过这新的一天？`,
        time: formatCurrentTime()
      });
    }
  } else {
    addMessage({
      type: 'system',
      content: '【提示】请先选择或创建角色开始游戏。',
      time: formatCurrentTime()
    });
  }
  
  // 滚动到底部
  nextTick(() => {
    if (textAreaRef.value) {
      textAreaRef.value.scrollTop = textAreaRef.value.scrollHeight;
    }
  });
});

// 加载对话历史
const loadConversationHistory = async () => {
  try {
    const save = characterStore.activeSaveSlot;
    if (save?.存档数据?.对话历史) {
      const history = save.存档数据.对话历史;
      if (Array.isArray(history) && history.length > 0) {
        // 清空当前消息，加载历史消息
        gameMessages.value = [];
        history.forEach((msg: any) => {
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

// 保存对话历史到存档
const saveConversationHistory = () => {
  try {
    const save = characterStore.activeSaveSlot;
    if (save?.存档数据) {
      save.存档数据.对话历史 = gameMessages.value.map(msg => ({
        type: msg.type,
        content: msg.content,
        time: msg.time
      }));
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
  background: #fff;
  border: 1px solid #d0d7de;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'SimSun', 'NSimSun', 'STSong', '宋体', serif;
}


/* 文本显示区域 */
.text-area {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(129, 199, 132, 0.3) transparent;
}

.text-area::-webkit-scrollbar {
  width: 6px;
}

.text-area::-webkit-scrollbar-track {
  background: transparent;
}

.text-area::-webkit-scrollbar-thumb {
  background: rgba(129, 199, 132, 0.3);
}

.text-area::-webkit-scrollbar-thumb:hover {
  background: rgba(129, 199, 132, 0.5);
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message-item {
  padding: 0.75rem 1rem;
  animation: messageSlideIn 0.3s ease-out;
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

.message-item.system {
  background: rgba(158, 158, 158, 0.1);
  border-left: 3px solid #9E9E9E;
}

.message-item.ai {
  background: rgba(129, 199, 132, 0.1);
  border-left: 3px solid #66BB6A;
}

.message-item.game {
  background: rgba(129, 199, 132, 0.1);
  border-left: 3px solid #66BB6A;
}

.message-item.player {
  background: rgba(33, 150, 243, 0.1);
  border-left: 3px solid #2196F3;
  margin-left: 2rem;
}

.message-time {
  font-size: 0.7rem;
  color: #666;
  margin-bottom: 0.25rem;
  font-family: 'Courier New', monospace;
}

.message-content {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 输入区域 */
.input-area {
  padding: 1rem 1.5rem;
  border-top: 1px solid #d0d7de;
  background: #f8f9fa;
}

.input-container {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  padding: 0.5rem;
  transition: all 0.3s ease;
  min-height: 40px;
}

.input-container.focused {
  border-color: #8b7355;
  min-height: 80px;
}

.game-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #333;
  resize: none;
  min-height: 20px;
  max-height: 120px;
  font-family: inherit;
}

.game-input::placeholder {
  color: #999;
}

.send-btn {
  background: #8b7355;
  color: white;
  border: 1px solid #8b7355;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  height: 32px;
  min-width: 60px;
}

.send-btn:hover:not(:disabled) {
  background: #6f5633;
  border-color: #6f5633;
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  background: #E0E0E0;
  color: #999;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 暗色主题适配 */
[data-theme="dark"] .main-game-panel {
  background: #161b22;
  border-color: #30363d;
}


[data-theme="dark"] .input-area {
  background: #21262d;
  border-color: #30363d;
}

[data-theme="dark"] .input-container {
  background: #161b22;
  border-color: #30363d;
}

[data-theme="dark"] .input-container.focused {
  border-color: #7d8590;
}

[data-theme="dark"] .game-input {
  color: #ffffff;
}

[data-theme="dark"] .game-input::placeholder {
  color: #666;
}

[data-theme="dark"] .message-time {
  color: #d0d0d0;
}

[data-theme="dark"] .message-content {
  color: #ffffff;
}

[data-theme="dark"] .send-btn {
  background: #7d8590;
  border-color: #7d8590;
}

[data-theme="dark"] .send-btn:hover:not(:disabled) {
  background: #656d76;
  border-color: #656d76;
}

[data-theme="dark"] .send-btn:disabled {
  background: #424242;
  color: #666;
}

[data-theme="dark"] .message-item.system {
  background: rgba(158, 158, 158, 0.2);
  border-left-color: #757575;
}

[data-theme="dark"] .message-item.ai {
  background: rgba(130, 163, 245, 0.2);
  border-left-color: #82A3F5;
}

[data-theme="dark"] .message-item.game {
  background: rgba(130, 163, 245, 0.2);
  border-left-color: #82A3F5;
}

[data-theme="dark"] .message-item.player {
  background: rgba(33, 150, 243, 0.2);
  border-left-color: #42A5F5;
}
</style>