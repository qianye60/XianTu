<template>
  <div class="creation-container">
    <VideoBackground />
    <div class="creation-scroll">
      <!-- 进度条 -->
      <div class="header-container">
        <div class="progress-steps">
          <div
            v-for="step in store.totalSteps"
          :key="step"
          class="step"
          :class="{ active: store.currentStep >= step }"
        >
          <div class="step-circle">{{ step }}</div>
          <div class="step-label">{{ stepLabels[step - 1] }}</div>
        </div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="step-content">
        <transition name="fade-step" mode="out-in">
          <div :key="store.currentStep" class="step-wrapper">
            <Step1_WorldSelection
              v-if="store.currentStep === 1"
              ref="step1Ref"
              @ai-generate="handleAIGenerateClick"
            />
            <Step2_TalentTierSelection
              v-else-if="store.currentStep === 2"
              ref="step2Ref"
              @ai-generate="handleAIGenerateClick"
            />
            <Step3_OriginSelection
              v-else-if="store.currentStep === 3"
              ref="step3Ref"
              @ai-generate="handleAIGenerateClick"
            />
            <Step4_SpiritRootSelection
              v-else-if="store.currentStep === 4"
              ref="step4Ref"
              @ai-generate="handleAIGenerateClick"
            />
            <Step5_TalentSelection
              v-else-if="store.currentStep === 5"
              ref="step5Ref"
              @ai-generate="handleAIGenerateClick"
            />
            <Step6_AttributeAllocation v-else-if="store.currentStep === 6" />
            <Step7_Preview
              v-else-if="store.currentStep === 7"
              :is-local-creation="store.isLocalCreation"
            />
          </div>
        </transition>
      </div>

      <!-- 导航 -->
      <div class="navigation-buttons">
        <button @click.prevent="handleBack" type="button" class="btn btn-secondary">
          {{ store.currentStep === 1 ? '返回道途' : '上一步' }}
        </button>

        <!-- 剩余点数显示 -->
        <div class="points-display">
          <div v-if="store.currentStep >= 3 && store.currentStep <= 7" class="destiny-points">
            <span class="points-label">剩余天道点:</span>
            <span class="points-value" :class="{ low: store.remainingTalentPoints < 0 }">
              {{ store.remainingTalentPoints }}
            </span>
          </div>
        </div>

        <button
          type="button"
          @click.prevent="(event: Event) => { console.log('[DEBUG] 开启仙途按钮被点击!'); handleNext(event); }"
          :disabled="
            isGenerating ||
            isNextDisabled ||
            (store.currentStep === store.totalSteps && store.remainingTalentPoints < 0)
          "
          class="btn"
          :class="{ 
            'btn-complete': store.currentStep === store.totalSteps,
            'disabled': isGenerating || isNextDisabled || (store.currentStep === store.totalSteps && store.remainingTalentPoints < 0)
          }"
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
    <LoadingModal :visible="isGenerating" :message="loadingMessage" />
  </div>
</template>

<script setup lang="ts">
import VideoBackground from '@/components/common/VideoBackground.vue';
import { useCharacterCreationStore } from '../stores/characterCreationStore';
import { useUserStore } from '../stores/userStore';
import type { CharacterCreationPayload } from '../types/index';
import Step1_WorldSelection from '../components/character-creation/Step1_WorldSelection.vue'
import Step2_TalentTierSelection from '../components/character-creation/Step2_TalentTierSelection.vue'
import Step3_OriginSelection from '../components/character-creation/Step3_OriginSelection.vue'
import Step4_SpiritRootSelection from '../components/character-creation/Step4_SpiritRootSelection.vue'
import Step5_TalentSelection from '../components/character-creation/Step5_TalentSelection.vue'
import Step6_AttributeAllocation from '../components/character-creation/Step6_AttributeAllocation.vue'
import Step7_Preview from '../components/character-creation/Step7_Preview.vue'
import RedemptionCodeModal from '../components/character-creation/RedemptionCodeModal.vue'
import LoadingModal from '../components/LoadingModal.vue'
import { request } from '../services/request'
import { toast } from '../utils/toast'
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { renameCurrentCharacter, getCurrentCharacterName } from '../utils/tavern';


const props = defineProps<{
  onBack: () => void;
}>();

const emit = defineEmits<{
  (e: 'creation-complete', payload: CharacterCreationPayload): void;
}>()
const store = useCharacterCreationStore();
const userStore = useUserStore();
const isCodeModalVisible = ref(false)
const isGenerating = ref(false)
const loadingMessage = ref('天机推演中...')

onMounted(async () => {
  // 1. 初始化创世神殿（确保数据已加载）
  if (!store.isLocalCreation) {
    // 联机模式下，确保云端数据已加载
    const cloudWorlds = store.creationData.worlds.filter(w => w.source === 'cloud');
    if (cloudWorlds.length === 0) {
      console.log('【角色创建】联机模式下缺少云端世界数据，重新获取...');
      await store.fetchAllCloudData();
      
      // 再次检查，如果还是没有数据则显示错误
      const retryCloudWorlds = store.creationData.worlds.filter(w => w.source === 'cloud');
      if (retryCloudWorlds.length === 0) {
        toast.error('无法获取云端创世数据，请返回重试');
        props.onBack();
        return;
      }
    }
  }
  
  // 2. 模式已由外部 Store Action 设定，初始化创世神殿
  await store.initializeStore(store.isLocalCreation ? 'single' : 'cloud');

  // 2. 获取角色名字作为默认道号 - 优先使用酒馆角色卡名字
  try {
    // 首先尝试从酒馆获取角色卡名字
    const tavernCharacterName = await getCurrentCharacterName();
    if (tavernCharacterName) {
      console.log('【角色创建】成功获取酒馆角色卡名字:', tavernCharacterName);
      store.characterPayload.character_name = tavernCharacterName;
    } else {
      console.log('【角色创建】无法获取酒馆角色卡名字，尝试用户信息');
      // 备用方案：使用用户信息
      if (!userStore.user) {
        await userStore.loadUserInfo();
      }
      if (userStore.user) {
        store.characterPayload.character_name = userStore.user.user_name;
        console.log('【角色创建】使用用户名作为道号:', userStore.user.user_name);
      } else if (store.isLocalCreation) {
        // 最后的备用方案：本地模式设为"无名者"
        store.characterPayload.character_name = '无名者';
        console.warn("【角色创建】无法获取任何角色信息，本地模式下道号设为'无名者'");
      } else {
        // 联机模式下获取不到用户信息是严重错误
        store.characterPayload.character_name = '';
        toast.error('无法获取用户信息，请重新登录！');
      }
    }
  } catch (error) {
    console.error('【角色创建】获取角色名字时出错:', error);
    // 如果出错，使用原来的逻辑作为后备
    if (!userStore.user) {
      await userStore.loadUserInfo();
    }
    if (userStore.user) {
      store.characterPayload.character_name = userStore.user.user_name;
    } else {
      store.characterPayload.character_name = store.isLocalCreation ? '无名者' : '';
      if (!store.isLocalCreation) {
        toast.error('无法获取用户信息，请重新登录！');
      }
    }
  }
});

onUnmounted(() => {
  store.resetOnExit();
});

// 此函数只处理联机模式的AI生成（需要消耗信物）
async function executeCloudAiGeneration(code: string) {
  let type = ''
  switch (store.currentStep) {
    case 1: type = 'world'; break
    case 2: type = 'talent_tier'; break
    case 3: type = 'origin'; break
    case 4: type = 'spirit_root'; break
    case 5: type = 'talent'; break
    default:
      toast.error('当前步骤不支持AI生成！')
      return
  }

  isGenerating.value = true
  loadingMessage.value = '天机推演中...'

  try {
    // 1. 验证兑换码
    loadingMessage.value = '正在验证仙缘信物...'
    // 预验证逻辑可以保留，作为一道防线
    try {
      const validateResponse = await request<{is_used: boolean}>(`/api/v1/redemption/validate/${code}`, { method: 'POST' })
      if (!validateResponse || validateResponse.is_used) {
        toast.error('仙缘信物已被使用或无效！')
        isGenerating.value = false;
        return
      }
    } catch (error) {
      console.warn('兑换码预验证失败，继续执行:', error)
    }

    // 2. 开始AI生成
    loadingMessage.value = '正在推演玄妙...'
    const aiModule = await import('../utils/tavernAI');
    let generatedContent: unknown = null;
    switch (type) {
        case 'world':
            generatedContent = await aiModule.generateWorld();
            break;
        case 'talent_tier':
            generatedContent = await aiModule.generateTalentTier();
            break;
        case 'origin':
            if (!store.selectedWorld) {
                toast.error('请先选择世界！');
                return;
            }
            generatedContent = await aiModule.generateOrigin();
            break;
        case 'spirit_root':
            generatedContent = await aiModule.generateSpiritRoot();
            break;
        case 'talent':
            generatedContent = await aiModule.generateTalent();
            break;
    }

    if (!generatedContent) {
      toast.error('天机推演失败，请重试。')
      return
    }

    // 3. 保存到云端
    loadingMessage.value = '正在将结果铭刻于云端...'
    const saveResult = await request<{ message: string; code_used?: number }>('/api/v1/ai/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        type,
        content: generatedContent,
      }),
    })

    if (saveResult && saveResult.message) {
      store.addGeneratedData(type, generatedContent);
      if (saveResult.code_used) {
        toast.success(`天机已成功记录！信物使用次数：${saveResult.code_used}`)
      } else {
        toast.success('天机已成功记录于云端！')
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    if (message.includes('兑换码') || message.includes('信物')) {
      toast.error(message)
    } else if (message.includes('登录')) {
      toast.error('身份验证失败，请重新登录！')
    } else {
      toast.error('天机紊乱：' + message)
    }
  } finally {
    isGenerating.value = false
  }
}

// 父组件的AI生成处理器，只响应来自子组件的"联机"请求
function handleAIGenerateClick() {
  if (!store.isLocalCreation) {
    isCodeModalVisible.value = true
  }
  // 本地模式的点击事件由子组件自行处理，此处无需操作
}

// 暴露给步骤组件调用
defineExpose({
  handleAIGenerateClick,
})

const stepLabels = [
  '诸天问道',
  '仙缘初定',
  '转世因果',
  '测灵问道',
  '神通择定',
  '命格天成',
  '窥天算命',
]


const handleBack = () => {
  if (store.currentStep > 1) {
    store.prevStep()
  } else {
    props.onBack();
  }
}

const isNextDisabled = computed(() => {
  const currentStep = store.currentStep;
  const totalSteps = store.totalSteps;
  const selectedWorld = store.selectedWorld;
  const selectedTalentTier = store.selectedTalentTier;
  const remainingPoints = store.remainingTalentPoints;
  const generating = isGenerating.value;
  
  console.log('[DEBUG] 按钮状态检查 - 当前步骤:', currentStep, '/', totalSteps);
  console.log('[DEBUG] 按钮状态检查 - isGenerating:', generating);
  console.log('[DEBUG] 按钮状态检查 - 选中的世界:', selectedWorld?.name);
  console.log('[DEBUG] 按钮状态检查 - 选中的天资:', selectedTalentTier?.name);
  console.log('[DEBUG] 按钮状态检查 - 剩余天赋点:', remainingPoints);
  
  // You can add validation logic here for each step
  if (currentStep === 1 && !selectedWorld) {
    console.log('[DEBUG] 按钮被禁用：第1步未选择世界');
    return true;
  }
  if (currentStep === 2 && !selectedTalentTier) {
    console.log('[DEBUG] 按钮被禁用：第2步未选择天资');
    return true;
  }
  
  console.log('[DEBUG] 按钮状态：启用');
  return false;
})

async function handleNext(event?: Event) {
  console.log('[DEBUG] handleNext 被调用，当前步骤:', store.currentStep, '总步骤:', store.totalSteps);
  
  if (event) {
    event.preventDefault();
    event.stopPropagation();
    console.log('[DEBUG] 事件已阻止默认行为');
  }
  
  if (store.currentStep < store.totalSteps) {
    console.log('[DEBUG] 执行下一步');
    store.nextStep()
  } else {
    // Final step: Create Character
    console.log('[DEBUG] 最后一步，准备创建角色');
    await createCharacter()
  }
}

const step1Ref = ref<InstanceType<typeof Step1_WorldSelection> | null>(null)
const step2Ref = ref<InstanceType<typeof Step2_TalentTierSelection> | null>(null)
const step3Ref = ref<InstanceType<typeof Step3_OriginSelection> | null>(null)
const step4Ref = ref<InstanceType<typeof Step4_SpiritRootSelection> | null>(null)
const step5Ref = ref<InstanceType<typeof Step5_TalentSelection> | null>(null)

// 处理仙缘信物提交 (仅联机模式)
async function handleCodeSubmit(code: string) {
  const token = localStorage.getItem('access_token')
  if (!token) {
    toast.error('身份凭证缺失，请先登录再使用信物。')
    isCodeModalVisible.value = false
    return
  }

  if (!code || code.trim().length < 6) {
    toast.error('请输入有效的仙缘信物！')
    return
  }

  isCodeModalVisible.value = false
  await executeCloudAiGeneration(code)
}

async function createCharacter() {
  console.log('[DEBUG] createCharacter 开始执行');
  console.log('[DEBUG] isGenerating.value:', isGenerating.value);
  
  if (isGenerating.value) return;
  console.log('[CharacterCreation.vue] createCharacter() called.');

  // 1. 统一数据校验
  console.log('[DEBUG] 开始数据校验');
  console.log('[DEBUG] 角色名:', store.characterPayload.character_name);
  console.log('[DEBUG] 选中的世界:', store.selectedWorld);
  console.log('[DEBUG] 选中的天资:', store.selectedTalentTier);
  console.log('[DEBUG] 选中的出身:', store.selectedOrigin);
  console.log('[DEBUG] 选中的灵根:', store.selectedSpiritRoot);
  
  if (!store.characterPayload.character_name) {
    console.log('[DEBUG] 验证失败：缺少角色名');
    toast.error('请输入道号！');
    return;
  }
  if (!store.selectedWorld || !store.selectedTalentTier) {
    console.log('[DEBUG] 验证失败：缺少必需选择项');
    console.log('[DEBUG] selectedWorld:', store.selectedWorld);
    console.log('[DEBUG] selectedTalentTier:', store.selectedTalentTier);
    toast.error('创建数据不完整，请检查世界和天资选择！');
    return;
  }
  
  // 出身和灵根可以为空（表示随机选择）
  console.log('[DEBUG] selectedOrigin:', store.selectedOrigin, '(可为空，表示随机出生)');
  console.log('[DEBUG] selectedSpiritRoot:', store.selectedSpiritRoot, '(可为空，表示随机灵根)');
  if (!store.isLocalCreation && !window.parent?.TavernHelper) {
    console.log('[DEBUG] 验证失败：联机模式但非SillyTavern环境');
    toast.error('联机模式需要在SillyTavern扩展中运行。');
    return;
  }

  console.log('[DEBUG] 数据校验通过，开始创建角色');
  isGenerating.value = true;
  loadingMessage.value = '正在为您凝聚法身...';

  try {
    // 2. 将最终道号同步回酒馆
    await renameCurrentCharacter(store.characterPayload.character_name);

    // 3. 构造 CharacterBaseInfo
    const baseInfo = {
      名字: store.characterPayload.character_name,
      性别: store.characterPayload.gender,
      世界: store.selectedWorld.name,
      天资: store.selectedTalentTier.name,
      出生: store.selectedOrigin?.name || '随机出身',
      灵根: store.selectedSpiritRoot?.name || '随机灵根',
      天赋: store.selectedTalents.map(t => t.name),
      先天六司: {
        根骨: store.attributes.root_bone,
        灵性: store.attributes.spirituality,
        悟性: store.attributes.comprehension,
        气运: store.attributes.fortune,
        魅力: store.attributes.charm,
        心性: store.attributes.temperament,
      },
    };

    // 4. 构造完整的创建载荷并发射creation-complete事件
    const creationPayload = {
      charId: `char_${Date.now()}`,
      characterName: store.characterPayload.character_name,
      world: store.selectedWorld,
      talentTier: store.selectedTalentTier,
      origin: store.selectedOrigin,
      spiritRoot: store.selectedSpiritRoot,
      talents: store.selectedTalents,
      角色基础信息: baseInfo,
      baseAttributes: {
        root_bone: store.attributes.root_bone,
        spirituality: store.attributes.spirituality,
        comprehension: store.attributes.comprehension,
        fortune: store.attributes.fortune,
        charm: store.attributes.charm,
        temperament: store.attributes.temperament,
      },
      mode: (store.isLocalCreation ? '单机' : '联机') as '单机' | '联机',
      age: store.characterPayload.current_age,
      gender: store.characterPayload.gender,
    };

    console.log('发射creation-complete事件，载荷:', creationPayload);
    
    // 发射事件让App.vue处理创建逻辑
    emit('creation-complete', creationPayload);

  } catch (error: unknown) {
    console.error('创建角色时发生严重错误:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    toast.error('凝聚法身时遭遇天劫：' + message);
  } finally {
    isGenerating.value = false;
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
  padding: 0; /* 移除内边距，充满屏幕 */
  box-sizing: border-box;
}

.creation-scroll {
  width: 95%; /* 增加宽度利用率 */
  max-width: 1400px; /* 增加最大宽度 */
  height: 92vh; /* 增加高度利用率 */
  max-height: 900px; /* 增加最大高度 */
  background: var(--color-surface-transparent);
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

.header-container {
  /* This container no longer needs flex properties */
  margin-bottom: 2rem;
}

.progress-steps {
  display: flex;
  justify-content: space-between; /* Distribute steps evenly across the full width */
  width: 100%; /* Ensure the container spans the full width */
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  margin: 0; /* 移除margin避免多余空间 */
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  /* 隐藏滚动条但保留滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

/* Chrome, Safari and Opera */
.step-content::-webkit-scrollbar {
  display: none;
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
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.code-redeem-fab {
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  z-index: 10;
}
</style>
