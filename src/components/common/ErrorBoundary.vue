<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-container">
      <div class="error-icon">⚠️</div>
      <h2>{{ $t('道法受阻') }}</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-details" v-if="showDetails">
        <pre>{{ errorDetails }}</pre>
      </div>
      <div class="error-actions">
        <button @click="retry" class="btn-retry">{{ $t('重试') }}</button>
        <button @click="goBack" class="btn-back">{{ $t('返回') }}</button>
        <button @click="toggleDetails" class="btn-details">
          {{ showDetails ? $t('隐藏详情') : $t('查看详情') }}
        </button>
      </div>
    </div>
  </div>
  <slot v-else></slot>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const hasError = ref(false);
const errorMessage = ref('');
const errorDetails = ref('');
const showDetails = ref(false);

onErrorCaptured((error: Error, instance, info) => {
  console.error('[错误边界] 捕获到错误:', error);
  console.error('[错误边界] 组件信息:', info);

  hasError.value = true;
  errorMessage.value = error.message || '未知错误';
  errorDetails.value = `
错误: ${error.name}: ${error.message}
堆栈: ${error.stack || '无堆栈信息'}
组件: ${info}
  `.trim();

  // 阻止错误继续传播
  return false;
});

const retry = () => {
  hasError.value = false;
  errorMessage.value = '';
  errorDetails.value = '';
  showDetails.value = false;
  // 刷新当前路由
  router.go(0);
};

const goBack = () => {
  hasError.value = false;
  router.back();
};

const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  padding: 2rem;
}

.error-container {
  max-width: 600px;
  width: 100%;
  background: var(--color-surface);
  border: 2px solid var(--color-error);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.error-container h2 {
  color: var(--color-error);
  margin: 0 0 1rem 0;
  font-size: 1.8rem;
}

.error-message {
  color: var(--color-text);
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  line-height: 1.6;
}

.error-details {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  text-align: left;
  max-height: 300px;
  overflow-y: auto;
}

.error-details pre {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-retry,
.btn-back,
.btn-details {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-retry {
  background: var(--color-primary);
  color: white;
}

.btn-retry:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
}

.btn-back {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-back:hover {
  background: var(--color-background);
}

.btn-details {
  background: var(--color-info);
  color: white;
}

.btn-details:hover {
  background: var(--color-info-dark);
}

@media (max-width: 640px) {
  .error-boundary {
    padding: 1rem;
  }

  .error-container {
    padding: 1.5rem;
  }

  .error-container h2 {
    font-size: 1.5rem;
  }

  .error-actions {
    flex-direction: column;
  }

  .btn-retry,
  .btn-back,
  .btn-details {
    width: 100%;
  }
}
</style>
