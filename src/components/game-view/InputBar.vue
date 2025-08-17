<!-- src/components/game-view/InputBar.vue -->
<template>
  <div class="input-bar-container">
    <input 
      type="text" 
      class="chat-input" 
      placeholder="在此输入你的行动..." 
      v-model="inputText"
      @keyup.enter="sendMessage"
    />
    <button class="send-button" @click="sendMessage">发送</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'send', message: string): void;
}>();

const inputText = ref('');

const sendMessage = () => {
  if (inputText.value.trim()) {
    emit('send', inputText.value.trim());
    inputText.value = '';
  }
};
</script>

<style scoped>
.input-bar-container {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.chat-input {
  flex-grow: 1;
  background-color: #1a1a1a;
  border: 1px solid #555;
  border-radius: 20px;
  color: #e0e0e0;
  padding: 0.5rem 1rem;
  font-size: 1em;
}

.send-button {
  background: #e5c07b;
  color: #1a1a1a;
  border: none;
  border-radius: 20px;
  padding: 0.5rem 1.5rem;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}
.send-button:hover {
  background: #f0cfa8;
}
</style>