<script setup lang="ts">
// =================================================================
// 【封印说明】
// 此组件乃上古遗迹，其所用法门与当前世界法度多有冲突。
// 为保世界稳定，暂将其封印。
// 日后可取其“AI辅助创生”之精华，融入新的“传法台”体系中。
// by 天工院首席架构师
// =================================================================

// import { reactive, computed, watch, ref } from 'vue'
// import { generateText, showToast } from '@/services/tavern'
// import type { Origin, Talent, CharacterAttributes } from '@/types/core'
// import { useLodash } from '@/services/tavern'

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div class="rule-creator-backdrop" @click.self="emit('close')">
    <div class="rule-creator-panel">
      <h2 class="panel-title">【 此路不通 】</h2>
      <div class="form-content">
        <p class="sealed-text">
          道友，此法阵乃上古遗迹，其所用法门与当前世界法度多有冲突。 为保世界稳定，暂将其封印。
          日后可取其“AI辅助创生”之精华，融入新的“传法台”体系中。
        </p>
      </div>
      <div class="panel-actions">
        <button @click="emit('close')" class="btn-cancel">返回</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rule-creator-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
  font-family: var(--font-main, 'Kaiti', 'STKaiti', serif);
}

.rule-creator-panel {
  width: 90%;
  max-width: 500px;
  background: rgba(10, 20, 30, 0.8);
  border: 1px solid var(--gold-primary);
  border-radius: 12px;
  padding: 2rem 3rem;
  box-shadow: 0 0 40px rgba(218, 165, 32, 0.4);
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 1.8rem;
  font-weight: normal;
  color: var(--gold-primary);
  text-align: center;
  margin-bottom: 2rem;
  text-shadow: 0 0 10px var(--gold-light);
}

.form-content {
  margin-bottom: 2rem;
}

.sealed-text {
  color: var(--text-color-secondary);
  line-height: 1.8;
  text-align: center;
}

.panel-actions {
  display: flex;
  justify-content: center;
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px solid var(--gold-dark);
}

.panel-actions button {
  background: transparent;
  font-family: inherit;
  font-size: 1rem;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel {
  border: 1px solid var(--text-color-secondary);
  color: var(--text-color-secondary);
}
.btn-cancel:hover {
  border-color: #fff;
  color: #fff;
}
</style>
