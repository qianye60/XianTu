<!-- src/components/game-view/MessagePanel.vue -->
<template>
  <div class="chat-window" ref="chatWindowRef">
    <TransitionGroup name="list" tag="div" class="message-list">
      <div v-for="(msg, index) in messages" :key="index" class="chat-message">
        <p v-html="formatMessage(msg)"></p>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  messages: string[];
}>();

const chatWindowRef = ref<HTMLElement | null>(null);

// 监听消息数组的变化，当有新消息时自动滚动到底部
watch(
  () => props.messages,
  async () => {
    await nextTick();
    if (chatWindowRef.value) {
      chatWindowRef.value.scrollTop = chatWindowRef.value.scrollHeight;
    }
  },
  { deep: true }
);

// 简单的格式化，将换行符转为 <br>
const formatMessage = (msg: string) => {
  return msg.replace(/\n/g, '<br />');
};
</script>

<style scoped>
/* 样式从 GameView.vue 迁移 */
.chat-window {
  flex-grow: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chat-message {
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 8px;
  border-left: 3px solid var(--color-accent, #e5c07b);
  line-height: 1.6;
  transition: all 0.5s ease;
}

/* --- 列表过渡动画 --- */
.list-enter-from {
  opacity: 0;
  transform: translateY(30px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute; /* 使得离开的元素不占位，动画更流畅 */
}
</style>