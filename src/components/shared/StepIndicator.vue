<template>
  <div class="flex justify-between items-center mb-8">
    <div
      v-for="(step, index) in steps"
      :key="index"
      class="flex-1 relative"
    >
      <!-- 连接线 -->
      <div
        v-if="index < steps.length - 1"
        class="absolute top-6 left-1/2 w-full h-1 -z-10"
      >
        <div
          :class="[
            'h-full transition-all duration-500',
            currentStep > index 
              ? 'bg-gradient-to-r from-amber-400 to-yellow-400' 
              : 'bg-gray-300'
          ]"
        ></div>
      </div>

      <!-- 步骤节点 -->
      <div
        @click="$emit('step-click', index)"
        :class="[
          'relative flex flex-col items-center cursor-pointer group',
          currentStep === index ? 'scale-110' : '',
          currentStep > index || (currentStep === index && isValid) ? '' : 'opacity-50'
        ]"
      >
        <!-- 圆形指示器 -->
        <div
          :class="[
            'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg',
            currentStep === index
              ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white animate-pulse'
              : currentStep > index
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-600'
          ]"
        >
          <span
            v-if="currentStep > index"
            class="text-xl"
          >
            ✓
          </span>
          <span
            v-else
            class="text-xl"
          >
            {{ step.icon }}
          </span>
        </div>

        <!-- 步骤标签 -->
        <span
          :class="[
            'mt-2 text-sm font-medium transition-all duration-300',
            currentStep === index
              ? 'text-amber-600 font-bold'
              : currentStep > index
              ? 'text-green-600'
              : 'text-gray-500'
          ]"
        >
          {{ step.label }}
        </span>

        <!-- 悬浮提示 -->
        <div
          class="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none"
        >
          {{ currentStep > index ? '已完成' : currentStep === index ? '当前步骤' : '待完成' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Step {
  label: string
  icon: string
}

interface Props {
  steps: Step[]
  currentStep: number
  isValid?: boolean
}

defineProps<Props>()
defineEmits<{
  'step-click': [index: number]
}>()
</script>

<style scoped>
/* 动画效果 */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(251, 191, 36, 0);
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>