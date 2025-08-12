<template>
  <div class="settings-panel-overlay" @click.self="$emit('close')">
    <div class="settings-panel">
      <h2 class="panel-title">炼丹房设定</h2>
      <p class="panel-description">
        此处设定用于提炼记忆的“他山真火”。请确保其为兼容OpenAI的API端点。
      </p>

      <div class="form-group">
        <label for="api-url">丹火地址 (API URL)</label>
        <input
          id="api-url"
          type="text"
          v-model="settings.summarizationApiUrl"
          placeholder="例如: https://api.openai.com/v1/chat/completions"
        />
      </div>

      <div class="form-group">
        <label for="api-key">催火法咒 (API Key)</label>
        <input
          id="api-key"
          type="password"
          v-model="settings.summarizationApiKey"
          placeholder="请填入你的API密钥"
        />
      </div>

      <button class="close-button" @click="$emit('close')">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

defineEmits(['close'])

const settings = useSettingsStore()
</script>

<style scoped>
.settings-panel-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.settings-panel {
  background: #1f2937;
  padding: 2.5rem;
  border-radius: 12px;
  border: 1px solid #374151;
  width: 100%;
  max-width: 600px;
  color: #e5e7eb;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}

.panel-title {
  font-size: 2rem;
  color: #fcd34d;
  text-align: center;
  margin-bottom: 1rem;
}

.panel-description {
  text-align: center;
  color: #9ca3af;
  margin-bottom: 2.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #d1d5db;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #374151;
  border: 1px solid #4b5563;
  border-radius: 6px;
  color: #e5e7eb;
  font-size: 1rem;
}

.form-group input::placeholder {
  color: #6b7280;
}

.close-button {
  width: 100%;
  padding: 0.8rem;
  margin-top: 1rem;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
}
</style>
