<template>
  <div class="styled-step-indicator">
    <div class="steps-wrapper">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="step-item"
        :class="{
          active: currentStep === index + 1,
          completed: currentStep > index + 1,
          clickable: index + 1 <= currentStep
        }"
       @click="selectStep(index + 1)"
      >
        <div class="step-node-wrapper">
          <div class="step-node">
            <i :class="step.icon"></i>
          </div>
        </div>
        <div class="step-label">{{ step.name }}</div>
      </div>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: progressWidth }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Step {
  id: string
  name: string
  icon: string
}

const props = defineProps<{
  steps: Step[]
  currentStep: number
}>()

const emit = defineEmits<{
  (e: 'update:currentStep', value: number): void
}>()

const selectStep = (stepNumber: number) => {
  // For now, only allow navigating to steps that are already completed or the current active one.
  // This prevents skipping ahead.
  if (stepNumber <= props.currentStep) {
    emit('update:currentStep', stepNumber)
  }
}

const progressWidth = computed(() => {
  if (props.steps.length <= 1) {
    return '0%'
  }
  return ((props.currentStep - 1) / (props.steps.length - 1)) * 100 + '%'
})
</script>

<style scoped>
.styled-step-indicator {
  position: relative;
  width: 100%;
  padding: 20px 0;
  margin-bottom: 40px;
}

.steps-wrapper {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 2;
}

.progress-track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--color-border, #3a4556);
  transform: translateY(-50%);
  margin-top: -25px; /* Adjust to align with nodes */
  z-index: 1;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--color-primary, #9b7653),
    var(--color-primary-hover, #b8926c)
  );
  transition: width 0.5s cubic-bezier(0.65, 0, 0.35, 1);
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--color-text-secondary, #a09385);
  transition: color 0.3s;
}

.step-node-wrapper {
  position: relative;
}

.step-node {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--color-surface, #1a2332);
  border: 2px solid var(--color-border, #3a4556);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s ease;
  position: relative;
  z-index: 3;
}

.step-label {
  font-size: 0.9rem;
  font-family: var(--font-family-serif);
  transition: all 0.3s;
}

.step-item.clickable {
  cursor: pointer;
}

.step-item.clickable:hover .step-label {
  color: var(--color-primary-hover);
}

.step-item.clickable:hover .step-node {
    border-color: var(--color-primary-hover);
}

/* --- States --- */
.step-item.completed .step-node {
  border-color: var(--color-primary, #9b7653);
  color: var(--color-primary, #9b7653);
}

.step-item.completed .step-label {
  color: var(--color-text, #d4c5b9);
}

.step-item.active .step-node {
  border-color: var(--color-accent, #6fb3b8);
  background-color: var(--color-accent, #6fb3b8);
  color: var(--color-background, #0f1419);
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(111, 179, 184, 0.5);
}

.step-item.active .step-label {
  color: var(--color-accent, #6fb3b8);
  font-weight: bold;
}
</style>
