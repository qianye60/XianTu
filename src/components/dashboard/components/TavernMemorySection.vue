<template>
  <div class="memory-section">
    <div class="section-header">
      <h3 class="section-title">Memory Data (记忆数据)</h3>
    </div>
    <div class="memory-content">
      <div v-if="memoryData && Object.keys(memoryData).length > 0" class="data-display">
        <pre class="code-pre">{{ JSON.stringify(memoryData, null, 2) }}</pre>
      </div>
      <div v-else class="empty-state">
        <Brain :size="32" />
        <p>暂无记忆数据</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Brain } from 'lucide-vue-next'

interface Props {
  memoryData: any
}

defineProps<Props>()
</script>

<style scoped>
.memory-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.section-header {
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.section-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.memory-content {
  flex: 1;
  overflow: hidden;
}

.data-display {
  height: 100%;
  overflow: hidden;
}

.code-pre {
  margin: 0;
  padding: 0.75rem;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  height: 100%;
  overflow: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
  text-align: center;
}

/* 手机端适配 */
@media (max-width: 640px) {
  .memory-section {
    padding: 0.75rem;
  }
  
  .section-title {
    font-size: 1rem;
    text-align: center;
  }
  
  .code-pre {
    font-size: 0.75rem;
    padding: 0.5rem;
  }
  
  .empty-state {
    padding: 2rem 0.5rem;
  }
}

@media (max-width: 480px) {
  .memory-section {
    padding: 0.5rem;
  }
  
  .section-title {
    font-size: 0.9rem;
  }
  
  .code-pre {
    font-size: 0.7rem;
    padding: 0.4rem;
  }
}
</style>