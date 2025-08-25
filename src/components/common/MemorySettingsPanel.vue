<template>
  <div class="memory-settings-panel">
    <div class="settings-header">
      <h2>AI记忆管理设置</h2>
    </div>

    <div class="settings-content">
      <!-- 记忆长度设置 -->
      <section class="settings-section">
        <h3>记忆分层设置</h3>
        
        <!-- 短期记忆 -->
        <div class="memory-level">
          <div class="level-header">
            <label class="level-title">
              <input 
                type="checkbox" 
                v-model="localSettings.memory.shortTerm.enabled"
                @change="updateSettings"
              >
              短期记忆 (最近对话)
            </label>
          </div>
          
          <div class="level-controls" v-if="localSettings.memory.shortTerm.enabled">
            <div class="control-group">
              <label>最大长度: {{ localSettings.memory.shortTerm.maxLength }}</label>
              <input 
                type="range" 
                :min="1"
                :max="10"
                v-model.number="localSettings.memory.shortTerm.maxLength"
                @input="updateSettings"
              >
            </div>
            
            <div class="control-group">
              <label>
                <input 
                  type="checkbox" 
                  v-model="localSettings.memory.shortTerm.autoConvert"
                  @change="updateSettings"
                >
                自动转换为中期记忆
              </label>
            </div>
          </div>
        </div>

        <!-- 中期记忆 -->
        <div class="memory-level">
          <div class="level-header">
            <label class="level-title">
              <input 
                type="checkbox" 
                v-model="localSettings.memory.midTerm.enabled"
                @change="updateSettings"
              >
              中期记忆 (重要事件)
            </label>
          </div>
          
          <div class="level-controls" v-if="localSettings.memory.midTerm.enabled">
            <div class="control-group">
              <label>最大长度: {{ localSettings.memory.midTerm.maxLength }}</label>
              <input 
                type="range" 
                :min="10"
                :max="40"
                v-model.number="localSettings.memory.midTerm.maxLength"
                @input="updateSettings"
              >
            </div>
            
            <div class="control-group">
              <label>
                <input 
                  type="checkbox" 
                  v-model="localSettings.memory.midTerm.autoSummarize"
                  @change="updateSettings"
                >
                自动总结记忆
              </label>
            </div>
          </div>
        </div>

        <!-- 长期记忆 -->
        <div class="memory-level">
          <div class="level-header">
            <label class="level-title">
              <input 
                type="checkbox" 
                v-model="localSettings.memory.longTerm.enabled"
                @change="updateSettings"
              >
              长期记忆 (成长轨迹)
            </label>
          </div>
          
          <div class="level-controls" v-if="localSettings.memory.longTerm.enabled">
            <div class="control-group">
              <label>
                <input 
                  type="checkbox" 
                  v-model="localSettings.memory.longTerm.unlimited"
                  @change="updateSettings"
                >
                无限制长度
              </label>
            </div>
            
            <div class="control-group" v-if="!localSettings.memory.longTerm.unlimited">
              <label>最大长度: {{ localSettings.memory.longTerm.maxLength || 200 }}</label>
              <input 
                type="range" 
                :min="50"
                :max="1000"
                :step="10"
                v-model.number="localSettings.memory.longTerm.maxLength"
                @input="updateSettings"
              >
            </div>
          </div>
        </div>
      </section>

      <!-- 记忆统计 -->
      <section class="settings-section">
        <h3>记忆统计</h3>
        <div class="memory-stats">
          <div class="stat-item">
            <span class="stat-label">短期记忆:</span>
            <span class="stat-value">{{ memoryStats.shortTermCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">中期记忆:</span>
            <span class="stat-value">{{ memoryStats.midTermCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">长期记忆:</span>
            <span class="stat-value">{{ memoryStats.longTermCount }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { SettingsManager } from '@/utils/settings/settingsManager'
import type { AIMemorySettings } from '@/utils/settings/memorySettings'

const settingsManager = SettingsManager.getInstance()

const localSettings = reactive<AIMemorySettings>(settingsManager.getSettings())
const memoryStats = reactive({
  shortTermCount: 0,
  midTermCount: 0,
  longTermCount: 0
})

// 更新设置
const updateSettings = async () => {
  try {
    await settingsManager.updateSettings(localSettings)
  } catch (error) {
    console.error('更新设置失败:', error)
  }
}

onMounted(() => {
  // 监听设置变化
  settingsManager.onSettingsChange('settings_updated', (settings) => {
    Object.assign(localSettings, settings)
  })
})
</script>

<style scoped>
.memory-settings-panel {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.settings-header h2 {
  color: #1e293b;
  font-size: 1.5rem;
  margin: 0 0 20px 0;
}

.settings-section {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
}

.settings-section h3 {
  color: #334155;
  font-size: 1.125rem;
  margin: 0 0 15px 0;
}

.memory-level {
  background: white;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
  border: 1px solid #e2e8f0;
}

.level-header {
  margin-bottom: 10px;
}

.level-title {
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.level-controls {
  padding-left: 20px;
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 5px;
}

.control-group input[type="range"] {
  width: 100%;
  margin: 5px 0;
}

.control-group input[type="checkbox"] {
  margin-right: 8px;
}

.memory-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.stat-item {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #3b82f6;
}

/* 深色主题 */
[data-theme="dark"] .memory-settings-panel {
  background: #1e293b;
  color: #e2e8f0;
}

[data-theme="dark"] .settings-header h2 {
  color: #e2e8f0;
}

[data-theme="dark"] .settings-section {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .settings-section h3 {
  color: #e2e8f0;
}

[data-theme="dark"] .memory-level {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .level-title {
  color: #cbd5e1;
}

[data-theme="dark"] .control-group label {
  color: #94a3b8;
}

[data-theme="dark"] .stat-item {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .stat-label {
  color: #94a3b8;
}
</style>