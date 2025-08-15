<template>
  <div class="creation-container">
    <video autoplay muted loop playsinline class="video-background" src="http://38.55.124.252:13145/1394774d3043156d.mp4"></video>
    <div class="video-overlay"></div>
    <div class="creation-scroll">
      <!-- 进度条 -->
      <div class="progress-steps">
        <div v-for="step in store.totalSteps" :key="step" class="step" :class="{ active: store.currentStep >= step }" @click="store.goToStep(step)">
          <div class="step-circle">{{ step }}</div>
          <div class="step-label">{{ stepLabels[step - 1] }}</div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="step-content">
        <transition name="fade-step" mode="out-in">
          <div :key="store.currentStep" class="step-wrapper">
             <Step1_WorldSelection v-if="store.currentStep === 1" />
             <Step2_TalentTierSelection v-else-if="store.currentStep === 2" />
             <Step3_OriginSelection v-else-if="store.currentStep === 3" />
             <Step4_SpiritRootSelection v-else-if="store.currentStep === 4" />
             <Step5_TalentSelection v-else-if="store.currentStep === 5" />
             <Step6_AttributeAllocation v-else-if="store.currentStep === 6" />
             <Step7_Preview v-else-if="store.currentStep === 7" />
          </div>
        </transition>
      </div>

      <!-- 导航 -->
      <div class="navigation-buttons">
        <button @click="handleBack" class="btn btn-secondary">
          {{ store.currentStep === 1 ? '返回道途' : '上一步' }}
        </button>

        <!-- 剩余点数显示 -->
        <div class="points-display" v-if="store.currentStep < store.totalSteps">
          <div v-if="store.currentStep >= 3 && store.currentStep <= 6" class="destiny-points">
            <span class="points-label">剩余天道点:</span>
            <span class="points-value" :class="{ 'low': store.remainingTalentPoints < 5 }">
              {{ store.remainingTalentPoints }}
            </span>
          </div>
        </div>
        <!-- For alignment purposes, add an empty div when points are not shown -->
        <div class="points-display" v-else></div>

        <button
          @click="handleNext"
          :disabled="isNextDisabled"
          class="btn"
          :class="{ 'btn-complete': store.currentStep === store.totalSteps }"
        >
          {{ store.currentStep === store.totalSteps ? '开启仙途' : '下一步' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCharacterCreationStore } from '../stores/characterCreationStore';
import Step1_WorldSelection from '../components/character-creation/Step1_WorldSelection.vue';
import Step2_TalentTierSelection from '../components/character-creation/Step2_TalentTierSelection.vue';
import Step3_OriginSelection from '../components/character-creation/Step3_OriginSelection.vue';
import Step4_SpiritRootSelection from '../components/character-creation/Step4_SpiritRootSelection.vue';
import Step5_TalentSelection from '../components/character-creation/Step5_TalentSelection.vue';
import Step6_AttributeAllocation from '../components/character-creation/Step6_AttributeAllocation.vue';
import Step7_Preview from '../components/character-creation/Step7_Preview.vue';

const emit = defineEmits(['back']);
const store = useCharacterCreationStore();

const stepLabels = ['诸天问道', '仙缘初定', '转世因果', '测灵问道', '神通择定', '命格天成', '窥天算命'];

import { computed } from 'vue';

const handleBack = () => {
  if (store.currentStep > 1) {
    store.prevStep();
  } else {
    emit('back');
  }
};

const isNextDisabled = computed(() => {
    // You can add validation logic here for each step
    if (store.currentStep === 1 && !store.selectedWorld) return true;
    if (store.currentStep === 2 && !store.selectedTalentTier) return true;
    if (store.currentStep === 3 && !store.selectedOrigin) return true;
    // Step 4 allows random, so no validation needed if nothing is selected
    return false;
});

async function handleNext() {
    if (store.currentStep < store.totalSteps) {
        store.nextStep();
    } else {
        // Final step: Create Character
        await createCharacter();
    }
}

async function createCharacter() {
    try {
        const payload = {
            name: store.characterName,
            world_id: store.selectedWorld?.id,
            talent_tier_id: store.selectedTalentTier?.id,
            origin_id: store.selectedOrigin?.id,
            spirit_root_id: store.selectedSpiritRoot?.id, // Can be null for random
            talent_ids: store.selectedTalents.map(t => t.id),
            attributes: {
                root_bone: store.attributes.root_bone,
                spirituality: store.attributes.spirituality,
                comprehension: store.attributes.comprehension,
                luck: store.attributes.luck,
                charm: store.attributes.charm,
                temperament: store.attributes.temperament,
            }
        };

        const response = await fetch('http://127.0.0.1:12345/api/v1/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`洞天开辟失败: ${errorData.detail || response.status}`);
        }

        const characterData = await response.json();
        alert(`角色 ${characterData.name} 创建成功！`);
        // Here you would typically redirect to the game view
        // For now, we can just reset the creation process
        store.reset();
        emit('back'); // Go back to mode selection

    } catch (error: any) {
        console.error("创建角色时发生错误:", error);
        alert(`错误: ${error.message}`);
    }
}
</script>

<style>
/* Step transition animation */
.fade-step-enter-active,
.fade-step-leave-active {
  transition: opacity 0.3s ease;
}

.fade-step-enter-from,
.fade-step-leave-to {
  opacity: 0;
}
</style>

<style scoped>
.step-wrapper {
  height: 100%;
}
.creation-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding: 1rem; /* 添加内边距，避免贴边 */
  box-sizing: border-box;
}

.video-background {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: translate(-50%, -50%);
  z-index: -2;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(10, 15, 24, 0.6);
  z-index: -1;
}

.creation-scroll {
  width: 95%; /* 增加宽度利用率 */
  max-width: 1400px; /* 增加最大宽度 */
  height: 92vh; /* 增加高度利用率 */
  max-height: 900px; /* 增加最大高度 */
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 15px;
  box-shadow: 0 0 40px rgba(var(--color-primary-rgb), 0.3);
  display: flex;
  flex-direction: column;
  padding: 2rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.step.active {
  opacity: 1;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #333;
  border: 2px solid #555;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
  font-weight: bold;
  transition: all 0.3s ease;
}

.step.active .step-circle {
  background: var(--color-accent);
  color: var(--color-background);
  border-color: var(--color-accent);
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.5);
}

.step-label {
  margin-top: 0.5rem;
  font-size: 0.8rem;
}

.step-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 2rem 1rem; /* 增加内边距，内容更舒适 */
  margin: 1rem 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.navigation-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  gap: 1rem;
}

.points-display {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
}

.destiny-points,
.attribute-points {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid var(--color-primary);
  border-radius: 20px;
}

.points-label {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.points-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--color-accent);
}

.points-value.low {
  color: var(--color-danger);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

button {
  /* Now using the .btn class from style.css */
}
</style>
