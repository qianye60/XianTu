<template>
  <div class="world-info-section">
    <div class="section-header">
      <h3 class="section-title">World Info (世界信息)</h3>
    </div>
    <div class="world-info-content">
      <div v-if="worldInfo && Object.keys(worldInfo).length > 0" class="data-display">
        <pre class="code-pre">{{ JSON.stringify(worldInfo, null, 2) }}</pre>
      </div>
      <div v-else class="empty-state">
        <Book :size="32" />
        <p>暂无世界信息</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Book } from 'lucide-vue-next'

interface Props {
  worldInfo: any
}

defineProps<Props>()
</script>

<style scoped>
.world-info-section {
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

.world-info-content {
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
  .world-info-section {
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
  .world-info-section {
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