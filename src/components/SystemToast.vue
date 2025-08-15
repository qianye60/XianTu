<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast" :class="type">
        <div class="toast-content">
          <span class="toast-message">{{ message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

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
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 4px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast-message {
  font-size: 14px;
  color: #333333;
}

.toast.success {
  background-color: #f0f9eb;
  border: 1px solid #e1f3d8;
}

.toast.error {
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
}

.toast.warning {
  background-color: #fdf6ec;
  border: 1px solid #faecd8;
}

.toast.info {
  background-color: #f4f4f5;
  border: 1px solid #e9e9eb;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
