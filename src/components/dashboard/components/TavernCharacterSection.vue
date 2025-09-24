<template>
  <div class="character-section">
    <div class="section-header">
      <h3 class="section-title">Character Data (角色数据)</h3>
    </div>
    <div class="character-info" v-if="characterData">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">角色名称:</span>
          <span class="info-value">{{ characterData?.name || characterData?.名字 || '未知' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">角色ID:</span>
          <span class="info-value">{{ characterData?.id || '未知' }}</span>
        </div>
      </div>
      <div class="data-detail">
        <h4 class="detail-title">完整角色数据:</h4>
        <pre class="code-pre">{{ JSON.stringify(characterData, null, 2) }}</pre>
      </div>
    </div>
    <div v-else class="empty-state">
      <Users :size="32" />
      <p>暂无角色数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Users } from 'lucide-vue-next'

interface Props {
  characterData: any
}

defineProps<Props>()
</script>

<style scoped>
.character-section {
  border-radius: 8px;
  padding: 1rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.info-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.data-detail {
  margin-top: 1rem;
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
}

.detail-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.code-pre {
  margin: 0;
  padding: 0.75rem;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  max-height: 60vh;
  overflow: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--color-text-secondary);
}

/* 手机端适配 */
@media (max-width: 768px) {
  .code-pre {
    max-height: 50vh;
    font-size: 0.8rem;
    padding: 0.5rem;
  }
  
  .character-section {
    padding: 0.75rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .code-pre {
    max-height: 40vh;
    font-size: 0.75rem;
    padding: 0.4rem;
  }
  
  .character-section {
    padding: 0.5rem;
  }
  
  .empty-state {
    padding: 2rem;
  }
}
</style>
