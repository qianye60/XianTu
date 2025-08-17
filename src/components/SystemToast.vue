<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast" :class="type">
        <div class="toast-content">
                  <div class="toast-icon" v-html="iconSvg"></div>
                  <span class="toast-message">{{ message }}</span>
                </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

export interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  duration: 3000,
})

const visible = ref(true)

const iconSvg = computed(() => {
  switch (props.type) {
    case 'success':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    case 'error':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    case 'warning':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    case 'info':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    default:
      return '';
  }
});

// 当组件挂载时开始计时
onMounted(() => {
  if (props.duration > 0) {
    setTimeout(() => {
      visible.value = false
    }, props.duration)
  }
})
</script>

<style scoped>
.toast {
  position: fixed;
  top: 30px; /* 稍微下移 */
  left: 50%;
  transform: translateX(-50%);
  min-width: 280px;
  max-width: 90%;
  border-radius: 8px; /* 更圆润的边角 */
  z-index: 9999;
  color: #e0e0e0;
  font-family: 'Microsoft YaHei', 'SimSun', sans-serif;
  border-width: 1px;
  border-style: solid;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px; /* 增加图标与文字的间距 */
  padding: 12px 20px;
}

.toast-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
}

.toast-message {
  font-size: 15px;
  line-height: 1.5;
}

/* --- 不同类型的样式 --- */
.toast.success {
  background: linear-gradient(135deg, rgba(39, 174, 96, 0.5), rgba(46, 204, 113, 0.3));
  border-color: rgba(46, 204, 113, 0.8);
  box-shadow: 0 4px 20px rgba(46, 204, 113, 0.4);
}
.toast.success .toast-icon {
  color: #2ecc71;
}

.toast.error {
  background: linear-gradient(135deg, rgba(192, 57, 43, 0.5), rgba(231, 76, 60, 0.3));
  border-color: rgba(231, 76, 60, 0.8);
  box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
}
.toast.error .toast-icon {
  color: #e74c3c;
}

.toast.warning {
  background: linear-gradient(135deg, rgba(243, 156, 18, 0.5), rgba(241, 196, 15, 0.3));
  border-color: rgba(241, 196, 15, 0.8);
  box-shadow: 0 4px 20px rgba(241, 196, 15, 0.4);
}
.toast.warning .toast-icon {
  color: #f1c40f;
}

.toast.info {
  background: linear-gradient(135deg, rgba(41, 52, 72, 0.6), rgba(52, 73, 94, 0.4));
  border-color: rgba(52, 73, 94, 0.8);
  box-shadow: 0 4px 20px rgba(52, 73, 94, 0.4);
}
.toast.info .toast-icon {
  color: #3498db;
}


/* --- 动画效果 --- */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.8) translateY(-30px);
}
</style>
