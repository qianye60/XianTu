<template>
  <div class="creation-container">
    <VideoBackground />
    <div class="creation-scroll">
      <!-- 进度条 -->
      <div class="header-container">
        <div class="header-top">
          <!-- 左侧：模式指示 -->
          <div class="mode-indicator">
            {{ store.isLocalCreation ? '单机模式' : '联机模式' }}
          </div>

          <!-- 右侧：云端同步按钮（仅单机模式显示） -->
          <div v-if="store.isLocalCreation" class="cloud-sync-container">
            <CloudDataSync @sync-completed="onSyncCompleted" variant="compact" size="small" />
            <StorePreSeting
              variant="compact"
              size="small"
              :current-step="store.currentStep"
              :total-steps="store.totalSteps"
              @store-completed="onStoreCompleted"
            />
            <LoadingPreSeting variant="compact" size="small" @load-completed="onLoadCompleted" />
            <DataClearButtons variant="horizontal" size="small" @data-cleared="onDataCleared" />
          </div>
        </div>

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
      :type="currentAIType"
      title="使用仙缘信物"
      @close="isCodeModalVisible = false"
      @submit="handleCodeSubmit"
    />

    <!-- AI生成等待由全局toast处理 -->
  </div>
</template>

<script setup lang="ts">
import VideoBackground from '@/components/common/VideoBackground.vue';
import CloudDataSync from '@/components/common/CloudDataSync.vue';
import DataClearButtons from '@/components/common/DataClearButtons.vue';
import StorePreSeting from '@/components/common/StorePreSeting.vue';
import LoadingPreSeting from '@/components/common/LoadingPreSeting.vue';
import { useCharacterCreationStore } from '../stores/characterCreationStore';
import Step1_WorldSelection from '../components/character-creation/Step1_WorldSelection.vue'
import Step2_TalentTierSelection from '../components/character-creation/Step2_TalentTierSelection.vue'
import Step3_OriginSelection from '../components/character-creation/Step3_OriginSelection.vue'
import Step4_SpiritRootSelection from '../components/character-creation/Step4_SpiritRootSelection.vue'
import Step5_TalentSelection from '../components/character-creation/Step5_TalentSelection.vue'
import Step6_AttributeAllocation from '../components/character-creation/Step6_AttributeAllocation.vue'
import Step7_Preview from '../components/character-creation/Step7_Preview.vue'
import RedemptionCodeModal from '../components/character-creation/RedemptionCodeModal.vue'
import { request } from '../services/request'
import { toast } from '../utils/toast'
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { getCurrentCharacterName } from '../utils/tavern';


const props = defineProps<{
  onBack: () => void;
}>();

const emit = defineEmits<{
  (e: 'creation-complete', payload: { error?: unknown; [key: string]: unknown }): void; // 允许传递错误对象
}>()
const store = useCharacterCreationStore();
const isCodeModalVisible = ref(false)
const isGenerating = ref(false) // This now primarily acts as a state guard for buttons
const currentAIType = ref<'world' | 'talent_tier' | 'origin' | 'spirit_root' | 'talent'>('world')

onMounted(async () => {
  // 1. 初始化创世神殿（确保数据已加载）
  // 单机模式也需要获取云端数据作为备选
  console.log('【角色创建】当前模式:', store.isLocalCreation ? '单机' : '联机');

  // 2. 初始化创世神殿，确保本地和云端数据都加载
  await store.initializeStore(store.isLocalCreation ? 'single' : 'cloud');

  // 检查是否需要补充云端数据（检查总数据量而不是source标记）
  const totalWorlds = store.creationData.worlds.length;
  const totalTalents = store.creationData.talents.length;

  console.log('【角色创建】当前数据量:');
  console.log('- 总世界数量:', totalWorlds);
  console.log('- 总天赋数量:', totalTalents);

  // 在联机模式下，如果数据量明显不足（小于等于本地数据量），尝试获取云端数据
  if (!store.isLocalCreation && (totalWorlds <= 3 || totalTalents <= 5)) {
    console.log('【角色创建】联机模式下数据量不足，尝试获取云端数据...');

    await store.fetchAllCloudData();

    console.log('【角色创建】云端数据获取完成，最终数据量:');
    console.log('- 总世界数量:', store.creationData.worlds.length);
    console.log('- 总天赋数量:', store.creationData.talents.length);
  }

  // 2. 获取角色名字 - 自动从酒馆获取，无需用户输入
  try {
    const tavernCharacterName = await getCurrentCharacterName();
    if (tavernCharacterName) {
      console.log('【角色创建】成功获取酒馆角色卡名字:', tavernCharacterName);
      store.characterPayload.character_name = tavernCharacterName;
    } else {
      console.log('【角色创建】无法获取酒馆角色卡名字，使用默认值');
      store.characterPayload.character_name = store.isLocalCreation ? '无名者' : '修士';
    }
  } catch (error) {
    console.error('【角色创建】获取角色名字时出错:', error);
    store.characterPayload.character_name = store.isLocalCreation ? '无名者' : '修士';
  }
});

onUnmounted(() => {
  store.resetOnExit();
});

// 此函数只处理联机模式的AI生成（需要消耗信物）
async function executeCloudAiGeneration(code: string, userPrompt?: string) {
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

  isGenerating.value = true;
  const toastId = `cloud-ai-generate-${type}`;
  const initialMessage = userPrompt ? '基于你的心愿推演玄妙...' : '天机推演中...';
  toast.loading(initialMessage, { id: toastId });

  try {
    // 1. 验证兑换码 (可选，后端会做最终验证)
    toast.loading('正在验证仙缘信物...', { id: toastId });
    try {
      const validateResponse = await request<{is_used: boolean}>(`/api/v1/redemption/validate/${code}`, { method: 'POST' });
      if (validateResponse?.is_used) {
        toast.error('仙缘信物已被使用或无效！', { id: toastId });
        isGenerating.value = false;
        return;
      }
    } catch (error) {
      console.warn('兑换码预验证失败，继续执行:', error);
    }

    // 2. 开始AI生成
    toast.loading('已连接天机阁，正在推演...', { id: toastId });
    // tavernAI 模块已移除,这个功能已不再可用
    toast.error('AI生成功能暂时不可用（tavernAI模块已移除）', { id: toastId });
    isGenerating.value = false;
    return;

    // 3. 保存到云端 (此功能已移除)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    if (message.includes('兑换码') || message.includes('信物')) {
      toast.error(message, { id: toastId });
    } else if (message.includes('登录')) {
      toast.error('身份验证失败，请重新登录！', { id: toastId });
    } else {
      toast.error('天机紊乱：' + message, { id: toastId });
    }
  } finally {
    isGenerating.value = false;
    // 确保toast在非成功路径也被关闭
    setTimeout(() => toast.hide(toastId), 3000);
  }
}

// 父组件的AI生成处理器，只响应来自子组件的"联机"请求
function handleAIGenerateClick() {
  // 根据当前步骤设置AI推演类型
  const typeMap = {
    1: 'world' as const,
    2: 'talent_tier' as const,
    3: 'origin' as const,
    4: 'spirit_root' as const,
    5: 'talent' as const
  };

  currentAIType.value = typeMap[store.currentStep as keyof typeof typeMap] || 'world';

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
async function handleCodeSubmit(data: { code: string; prompt?: string }) {
  const token = localStorage.getItem('access_token')
  if (!token) {
    toast.error('身份凭证缺失，请先登录再使用信物。')
    isCodeModalVisible.value = false
    return
  }

  if (!data.code || data.code.trim().length < 6) {
    toast.error('请输入有效的仙缘信物！')
    return
  }

  isCodeModalVisible.value = false
  await executeCloudAiGeneration(data.code, data.prompt)
}

async function createCharacter() {
  console.log('[DEBUG] createCharacter 开始执行');
  console.log('[DEBUG] isGenerating.value:', isGenerating.value);

  if (isGenerating.value) {
    console.warn('[CharacterCreation.vue] 角色创建已在进行中，忽略重复请求');
    return;
  }
  console.log('[CharacterCreation.vue] createCharacter() called.');

  // 立即设置生成状态，防止重复点击
  isGenerating.value = true;

  // 1. 统一数据校验
  console.log('[DEBUG] 开始数据校验');
  console.log('[DEBUG] 角色名:', store.characterPayload.character_name);
  console.log('[DEBUG] 选中的世界:', store.selectedWorld);
  console.log('[DEBUG] 选中的天资:', store.selectedTalentTier);
  console.log('[DEBUG] 选中的出身:', store.selectedOrigin);
  console.log('[DEBUG] 选中的灵根:', store.selectedSpiritRoot);

  // 角色名自动获取，如果为空则使用默认值
  if (!store.characterPayload.character_name) {
    console.log('[DEBUG] 角色名为空，使用默认值');
    store.characterPayload.character_name = '修士';
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

  try {
    // 2. 角色名由酒馆助手的角色管理功能编辑，此处不同步

    // 3. 构造 CharacterBaseInfo
    const baseInfo = {
      名字: store.characterPayload.character_name,
      性别: store.characterPayload.gender,
      种族: '人族',
      世界: store.selectedWorld.name,
      // 🔥 修复：传递完整对象而不仅仅是名字
      天资: store.selectedTalentTier, // 完整对象
      出生: store.selectedOrigin || '随机出身', // 完整对象或字符串
      灵根: store.selectedSpiritRoot || '随机灵根', // 完整对象或字符串
      天赋: store.selectedTalents, // 完整对象数组
      先天六司: {
        根骨: store.attributes.root_bone,
        灵性: store.attributes.spirituality,
        悟性: store.attributes.comprehension,
        气运: store.attributes.fortune,
        魅力: store.attributes.charm,
        心性: store.attributes.temperament,
      },
      后天六司: {
        根骨: 0,
        灵性: 0,
        悟性: 0,
        气运: 0,
        魅力: 0,
        心性: 0,
      },
      // 🔥 这些"详情"字段现在是冗余的，但保留以兼容
      世界详情: store.selectedWorld,
      天资详情: store.selectedTalentTier,
      出身详情: store.selectedOrigin,
      灵根详情: store.selectedSpiritRoot,
      天赋详情: store.selectedTalents,
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
    // 重置状态
    isGenerating.value = false;
    // 错误现在由App.vue统一处理，这里只记录日志并重新抛出，以便App.vue捕获
    emit('creation-complete', { error: error }); // 发射一个带错误的事件
  }
  // 注意：成功情况下不在这里重置isGenerating.value，因为需要等待整个流程完成
}

// 处理云端同步完成事件
function onSyncCompleted(result: { success: boolean; newItemsCount: number; message: string }) {
  console.log('[角色创建] 云端同步完成:', result);
  if (result.success && result.newItemsCount > 0) {
    toast.success(`已更新 ${result.newItemsCount} 项云端数据`);
  }
}

// 处理数据清除完成事件
function onDataCleared(type: string, count: number) {
  console.log('[角色创建] 数据清除完成:', { type, count });
  // 清除数据后可能需要重置当前选择
  if (count > 0) {
    // 如果清除的数据包含当前选中的项目，重置选择
    store.resetCharacter();
  }
}

// 处理存储预设完成事件
async function onStoreCompleted(result: { success: boolean; message: string; presetData?: any }) {
  console.log('[角色创建] 存储预设完成:', result);
  if (result.success && result.presetData) {
    try {
      const { savePreset } = await import('@/utils/presetManager');
      
      // 构造预设数据
      const presetData = {
        name: result.presetData.presetName,
        description: result.presetData.presetDescription,
        data: {
          world: store.selectedWorld,
          talentTier: store.selectedTalentTier,
          origin: store.selectedOrigin,
          spiritRoot: store.selectedSpiritRoot,
          talents: store.selectedTalents,
          baseAttributes: {
            root_bone: store.attributes.root_bone,
            spirituality: store.attributes.spirituality,
            comprehension: store.attributes.comprehension,
            fortune: store.attributes.fortune,
            charm: store.attributes.charm,
            temperament: store.attributes.temperament,
          }
        }
      };
      
      // 保存到 IndexedDB
      const presetId = await savePreset(presetData);
      console.log('[角色创建] 预设已保存到 IndexedDB, ID:', presetId);
      toast.success('预设保存成功！');
    } catch (error) {
      console.error('[角色创建] 保存预设到 IndexedDB 失败:', error);
      toast.error('预设保存失败');
    }
  }
}

// 处理加载预设完成事件
async function onLoadCompleted(result: { success: boolean; message: string; presetData?: any }) {
  console.log('[角色创建] 加载预设完成:', result);
  
  if (!result.success) {
    toast.error(result.message);
    return;
  }

  if (!result.presetData) {
    console.warn('[角色创建] 预设数据为空');
    toast.error('预设数据无效');
    return;
  }

  console.log('[角色创建] 准备使用预设数据创建角色:', result.presetData);
  
  // 使用预设数据恢复store状态
  try {
    const presetData = result.presetData.data;
    
    // 恢复选择的世界
    if (presetData.world) {
      const world = store.creationData.worlds.find(w => w.name === presetData.world.name);
      if (world) {
        store.selectWorld(world.id);
      }
    }
    
    // 恢复选择的天资
    if (presetData.talentTier) {
      const talentTier = store.creationData.talentTiers.find(
        t => t.name === presetData.talentTier.name
      );
      if (talentTier) {
        store.selectTalentTier(talentTier.id);
      }
    }
    
    // 恢复选择的出身
    if (presetData.origin) {
      const origin = store.creationData.origins.find(
        o => o.name === presetData.origin.name
      );
      if (origin) {
        store.selectOrigin(origin.id);
      }
    }
    
    // 恢复选择的灵根
    if (presetData.spiritRoot) {
      const spiritRoot = store.creationData.spiritRoots.find(
        s => s.name === presetData.spiritRoot.name
      );
      if (spiritRoot) {
        store.selectSpiritRoot(spiritRoot.id);
      }
    }
    
    // 恢复选择的天赋
    if (presetData.talents && Array.isArray(presetData.talents)) {
      store.characterPayload.selected_talent_ids = [];
      presetData.talents.forEach((talent: any) => {
        const t = store.creationData.talents.find(x => x.name === talent.name);
        if (t) {
          store.toggleTalent(t.id);
        }
      });
    }
    
    // 恢复属性分配
    if (presetData.baseAttributes) {
      store.setAttribute('root_bone', presetData.baseAttributes.root_bone);
      store.setAttribute('spirituality', presetData.baseAttributes.spirituality);
      store.setAttribute('comprehension', presetData.baseAttributes.comprehension);
      store.setAttribute('fortune', presetData.baseAttributes.fortune);
      store.setAttribute('charm', presetData.baseAttributes.charm);
      store.setAttribute('temperament', presetData.baseAttributes.temperament);
    }
    
    console.log('[角色创建] 预设数据恢复完成,准备创建角色');
    
    // 直接跳到最后一步并创建角色
    store.currentStep = store.totalSteps;
    
    // 等待视图更新后创建角色
    await new Promise(resolve => setTimeout(resolve, 100));
    await createCharacter();
    
  } catch (error) {
    console.error('[角色创建] 使用预设数据失败:', error);
    toast.error('预设数据处理失败');
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
  height: 90vh;
  max-height: 90vh; /* 使用视口高度 */
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
  overflow: hidden; /* 容器本身不滚动 */
}

.header-container {
  /* This container no longer needs flex properties */
  margin-bottom: 2rem;
  flex-shrink: 0; /* 防止被压缩 */
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.mode-indicator {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  padding: 0.25rem 0.75rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid var(--color-primary);
  border-radius: 15px;
  white-space: nowrap;
}

.cloud-sync-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.progress-steps {
  display: flex;
  justify-content: space-between; /* 电脑端两端对齐 */
  width: 100%; /* Ensure the container spans the full width */
  overflow-x: auto;
  overflow-y: hidden;
  gap: 1rem;
  padding: 0.5rem 0;
  /* 隐藏滚动条但保留滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.progress-steps::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.5;
  transition: opacity 0.3s ease;
  flex-shrink: 0; /* 防止步骤被压缩 */
  min-width: 60px; /* 确保最小宽度 */
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
  flex: 1 1 0;
  min-height: 0; /* 允许flex子元素缩小 */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2rem 1rem; /* 增加内边距，内容更舒适 */
  margin: 0; /* 移除margin避免多余空间 */
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
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
  gap: 1rem;
  flex-shrink: 0;
  background: var(--color-surface-transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--color-border);
  position: relative; /* For absolute positioning of points-display */
  z-index: 10;

  /* Stretch to cover parent padding */
  margin: 0 -2rem -2rem -2rem;
  padding: 1rem 2rem;
  border-bottom-left-radius: 15px;
  border-bottom-right-radius: 15px;
}

.points-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  /* Center element for flexbox without affecting button spacing */
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
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

/* 移动端适配 */
@media (max-width: 768px) {
  .creation-scroll {
    width: 98%;
    height: 95vh;
    max-height: 95vh;
    padding: 1rem;
    border-radius: 10px;
  }

  .header-container {
    margin-bottom: 1rem;
    flex-shrink: 0;
  }

  .header-top {
    gap: 0.75rem;
  }

  .mode-indicator {
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
  }

  .cloud-sync-container {
    gap: 0.5rem;
  }

  .progress-steps {
    justify-content: flex-start; /* 平板端左对齐，便于横向滚动 */
    gap: 0.5rem;
    padding: 0 0.25rem;
  }

  .step {
    min-width: 60px;
  }

  .step-circle {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .step-label {
    font-size: 0.7rem;
    margin-top: 0.3rem;
  }

  .step-content {
    padding: 1.5rem 0.5rem;
    flex: 1 1 0;
    min-height: 0;
  }

  .navigation-buttons {
      display: flex; /* Explicitly set display */
      justify-content: space-between;
      padding: 1rem;
      gap: 0.5rem;
      flex-wrap: wrap;
      flex-shrink: 0;
      margin: 0; /* Reset negative margins */
      border-radius: 0; /* Reset radius */
    }

    .points-display {
      flex-basis: 100%;
      order: -1;
      margin-bottom: 0.5rem;
      position: static; /* Unset absolute positioning */
      transform: none;
    }

  .destiny-points,
  .attribute-points {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }

  .points-label {
    font-size: 0.8rem;
  }

  .points-value {
    font-size: 1rem;
  }

  .navigation-buttons button {
    flex: 1;
    min-width: 100px;
    font-size: 0.9rem;
    padding: 0.6rem 1rem;
  }
}

@media (max-width: 480px) {
  .creation-scroll {
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    padding: 0.75rem;
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); /* 适配刘海屏底部安全区域 */
    border-radius: 0;
  }

  .header-container {
    flex-shrink: 0;
  }

  .header-top {
    flex-direction: column;
    align-items: stretch;
  }

  .mode-indicator {
    text-align: center;
  }

  .cloud-sync-container {
    justify-content: center;
  }

  .progress-steps {
    justify-content: flex-start; /* 移动端左对齐，便于横向滚动 */
    gap: 0.75rem;
  }

  .step {
    min-width: 55px;
  }

  .step-circle {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }

  .step-label {
    font-size: 0.65rem;
  }

  .step-content {
    padding: 1rem 0.25rem;
    flex: 1 1 0;
    min-height: 0;
  }

  .navigation-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem 0 0.5rem 0;
      flex-shrink: 0;
    }

  .points-display {
    order: 0;
    margin-bottom: 0.75rem;
  }

  .navigation-buttons button {
    width: 100%;
    min-width: auto;
    padding: 0.8rem 1rem; /* 增加按钮高度，更易点击 */
    font-size: 1rem; /* 增大字体，更易阅读 */
  }
}
</style>
