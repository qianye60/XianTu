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
             <Step1_WorldSelection v-if="store.currentStep === 1" ref="step1Ref" @ai-generate="handleAIGenerateClick" />
             <Step2_TalentTierSelection v-else-if="store.currentStep === 2" ref="step2Ref" @ai-generate="handleAIGenerateClick" />
             <Step3_OriginSelection v-else-if="store.currentStep === 3" ref="step3Ref" @ai-generate="handleAIGenerateClick" />
             <Step4_SpiritRootSelection v-else-if="store.currentStep === 4" ref="step4Ref" @ai-generate="handleAIGenerateClick" />
             <Step5_TalentSelection v-else-if="store.currentStep === 5" ref="step5Ref" @ai-generate="handleAIGenerateClick" />
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

    <!-- 仙缘信物按钮 - 只在联机模式下点击AI推演时显示 -->

    <RedemptionCodeModal
      :visible="isCodeModalVisible"
      title="使用仙缘信物"
      @close="isCodeModalVisible = false"
      @submit="handleCodeSubmit"
    />

    <!-- AI生成等待弹窗 -->
    <LoadingModal
      :visible="isGenerating"
      :message="loadingMessage"
    />
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
import RedemptionCodeModal from '../components/character-creation/RedemptionCodeModal.vue';
import LoadingModal from '../components/LoadingModal.vue';
import { request } from '../services/request';
import { toast } from '../utils/toast';
import { ref } from 'vue';

const emit = defineEmits(['back']);
const store = useCharacterCreationStore();
const isCodeModalVisible = ref(false);
const isGenerating = ref(false);
const loadingMessage = ref('天机推演中...');

// 处理AI推演按钮点击 - 在联机模式下显示兑换码弹窗
function handleAIGenerateClick() {
  if (store.mode === 'multi') {
    isCodeModalVisible.value = true;
  }
}

// 暴露给步骤组件调用
defineExpose({
  handleAIGenerateClick
});

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

const step1Ref = ref<any>(null);
const step2Ref = ref<any>(null);
const step3Ref = ref<any>(null);
const step4Ref = ref<any>(null);
const step5Ref = ref<any>(null);

async function handleCodeSubmit(code: string) {
  // 1. 检查登录状态
  const token = localStorage.getItem('access_token');
  if (!token) {
    toast.error("身份凭证缺失，请先登录再记录天机。");
    isCodeModalVisible.value = false;
    return;
  }

  // 2. 验证兑换码格式
  if (!code || code.trim().length < 6) {
    toast.error("请输入有效的仙缘信物！");
    return;
  }

  // 3. 确定内容类型
  let type = '';
  let currentStepRef: any = null;

  switch(store.currentStep) {
    case 1: type = 'world'; currentStepRef = step1Ref.value; break;
    case 2: type = 'talent_tier'; currentStepRef = step2Ref.value; break;
    case 3: type = 'origin'; currentStepRef = step3Ref.value; break;
    case 4: type = 'spirit_root'; currentStepRef = step4Ref.value; break;
    case 5: type = 'talent'; currentStepRef = step5Ref.value; break;
    default:
      toast.error("当前步骤不支持AI生成！");
      return;
  }

  // 4. 先验证兑换码是否可用（可选，如果想在生成前就验证）
  try {
    loadingMessage.value = '正在验证仙缘信物...';
    isGenerating.value = true;
    isCodeModalVisible.value = false;
    
    const validateResponse = await request<any>(`/api/v1/validate/${code}`, {
      method: 'POST'
    });
    
    if (!validateResponse || validateResponse.is_used) {
      toast.error("仙缘信物已被使用或无效！");
      isGenerating.value = false;
      return;
    }
  } catch (error) {
    // 如果验证接口不存在或失败，继续执行（向后兼容）
    console.warn('兑换码预验证失败，继续执行:', error);
  }

  try {

    // 5. 开始AI生成
    loadingMessage.value = '正在推演玄妙...';
    
    let generatedContent: any = null;
    
    if (type === 'world') {
      const { generateWorldWithTavernAI } = await import('../utils/tavernAI');
      generatedContent = await generateWorldWithTavernAI();
      if (generatedContent) store.selectedWorld = generatedContent;
    } else if (type === 'talent_tier') {
      const { generateTalentTierWithTavernAI } = await import('../utils/tavernAI');
      generatedContent = await generateTalentTierWithTavernAI();
      if (generatedContent) store.selectedTalentTier = generatedContent;
    } else if (type === 'origin') {
      if (!store.selectedWorld) {
        toast.error('请先选择世界！');
        return;
      }
      const { generateOriginWithTavernAI } = await import('../utils/tavernAI');
      generatedContent = await generateOriginWithTavernAI(store.selectedWorld);
      if (generatedContent) store.selectedOrigin = generatedContent;
    } else if (type === 'spirit_root') {
      const { generateSpiritRootWithTavernAI } = await import('../utils/tavernAI');
      generatedContent = await generateSpiritRootWithTavernAI();
      if (generatedContent) store.selectedSpiritRoot = generatedContent;
    } else if (type === 'talent') {
      const { generateTalentWithTavernAI } = await import('../utils/tavernAI');
      generatedContent = await generateTalentWithTavernAI();
      if (generatedContent) {
        if (!store.selectedTalents) store.selectedTalents = [];
        store.selectedTalents.push(generatedContent);
      }
    }

    if (!generatedContent) {
      toast.error('天机推演失败，请重试。');
      return;
    }

    // 6. 保存到云端并消耗兑换码
    loadingMessage.value = '正在将结果铭刻于云端...';

    const saveResult = await request<any>('/api/v1/ai/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code.trim().toUpperCase(), // 统一转大写
        type,
        content: generatedContent
      })
    });

    // 只有在明确收到成功响应时才显示成功消息
    if (saveResult && saveResult.message) {
      if (saveResult.code_used) {
        toast.success(`天机已成功记录！信物使用次数：${saveResult.code_used}`);
      } else {
        toast.success('天机已成功记录于云端！');
      }
      
      if (currentStepRef && currentStepRef.fetchData) {
        loadingMessage.value = '正在同步云端数据...';
        await currentStepRef.fetchData();
        toast.success('云端数据同步完成！');
      }
    }
    
  } catch (error: any) {
    if (error.message?.includes('兑换码') || error.message?.includes('信物')) {
      toast.error(error.message);
    } else if (error.message?.includes('登录')) {
      toast.error('身份验证失败，请重新登录！');
    } else {
      toast.error('天机紊乱：' + (error.message || '未知错误'));
    }
  } finally {
    isGenerating.value = false;
  }
}

async function createCharacter() {
    try {
        // 确保有角色名
        if (!store.characterName) {
            toast.error('请输入道号！');
            return;
        }

        // 单机模式：计算属性并更新酒馆角色名
        if (store.mode === 'single') {
            // 导入本地计算函数
            const { calculateCoreAttributes } = await import('../utils/characterCalculation');
            
            // 计算核心属性
            const coreAttrs = calculateCoreAttributes(
                store.attributes.root_bone,
                store.attributes.spirituality,
                store.attributes.comprehension,
                store.attributes.luck,
                store.attributes.charm,
                store.attributes.temperament
            );
            
            // 保存角色数据到本地存储
            const characterData = {
                characterName: store.characterName,
                world: store.selectedWorld,
                talentTier: store.selectedTalentTier,
                origin: store.selectedOrigin,
                spiritRoot: store.selectedSpiritRoot,
                talents: store.selectedTalents,
                attributes: {
                    rootBone: store.attributes.root_bone,
                    spirituality: store.attributes.spirituality,
                    comprehension: store.attributes.comprehension,
                    fortune: store.attributes.luck,
                    charm: store.attributes.charm,
                    temperament: store.attributes.temperament
                },
                coreAttributes: coreAttrs,
                createdAt: new Date().toISOString()
            };
            
            // 保存到localStorage
            localStorage.setItem('currentCharacter', JSON.stringify(characterData));
            
            // 调用酒馆的 /rename-char 命令来更新角色名
            if (window.SillyTavern?.executeSlashCommands) {
                try {
                    await window.SillyTavern.executeSlashCommands(`/rename-char ${store.characterName}`);
                    toast.success(`道号 "${store.characterName}" 设定成功！仙途即将开启！`);
                } catch (e) {
                    console.error('执行酒馆命令失败:', e);
                    toast.warning('道号设定失败，但您可以在酒馆中手动修改。');
                }
            } else {
                toast.success(`角色创建成功！\\n\\n道号: ${store.characterName}\\n\\n请在酒馆中手动修改角色名为: ${store.characterName}`);
            }
            
            // 重置并返回
            store.reset();
            emit('back');
            return;
        }

        // 联机模式：调用后端API创建角色
        const payload = {
            character_name: store.characterName,
            world_id: store.selectedWorld?.id,
            talent_tier_id: store.selectedTalentTier?.id,
            origin_id: store.selectedOrigin?.id,
            spirit_root_id: store.selectedSpiritRoot?.id,
            selected_talent_ids: store.selectedTalents.map(t => t.id),
            root_bone: store.attributes.root_bone,
            spirituality: store.attributes.spirituality,
            comprehension: store.attributes.comprehension,
            fortune: store.attributes.luck,
            charm: store.attributes.charm,
            temperament: store.attributes.temperament,
        };

        const characterData = await request<any>('/api/v1/characters/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        // 联机模式下也尝试更新酒馆角色名
        if (window.SillyTavern?.executeSlashCommands) {
            try {
                await window.SillyTavern.executeSlashCommands(`/rename-char ${store.characterName}`);
            } catch (e) {
                console.error('执行酒馆命令失败:', e);
            }
        }
        
        // 显示角色创建成功信息（不显示具体数值）
        if (characterData.game_state) {
            toast.success(`角色 ${characterData.character_name} 创建成功！仙途即将开启！`);
        } else {
            toast.success(`角色 ${characterData.character_name} 创建成功！`);
        }
        store.reset();
        emit('back');

    } catch (error: any) {
        // request函数已处理toast.error
        console.error("创建角色时发生错误:", error);
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

.code-redeem-fab {
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  z-index: 10;
}
</style>
