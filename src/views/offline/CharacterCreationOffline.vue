<template>
  <div class="creation-page">
    <div class="creation-container">
      <header class="page-header">
        <button @click="goBack" class="back-btn">← 返回道途选择</button>
        <h1>单机闭关 - 角色创建</h1>
      </header>

      <div class="creation-content">
        <div class="step-indicator">
          <div
            v-for="(step, index) in steps"
            :key="index"
            :class="['step', { active: currentStep === index, completed: currentStep > index }]"
          >
            {{ step.name }}
          </div>
        </div>

        <div class="step-content">
          <div v-if="currentStep === 0" class="step-panel">
            <h2>角色命名</h2>
            <input v-model="characterData.name" placeholder="请输入角色名称" class="name-input" />
          </div>

          <div v-if="currentStep === 1" class="step-panel">
            <h2>选择出身</h2>
            <div class="options-grid">
              <div
                v-for="origin in origins"
                :key="origin.id"
                :class="['option-card', { selected: characterData.origin?.id === origin.id }]"
                @click="selectOrigin(origin)"
              >
                <h3>{{ origin.name }}</h3>
                <p>{{ origin.description }}</p>
              </div>
            </div>
          </div>

          <div v-if="currentStep === 2" class="step-panel">
            <h2>角色预览</h2>
            <div class="character-preview">
              <p><strong>姓名：</strong>{{ characterData.name }}</p>
              <p><strong>出身：</strong>{{ characterData.origin?.name }}</p>
              <p><strong>描述：</strong>{{ characterData.origin?.description }}</p>
            </div>
          </div>
        </div>

        <div class="navigation">
          <button @click="prevStep" :disabled="currentStep === 0" class="nav-btn">上一步</button>
          <button
            @click="nextStep"
            v-if="currentStep < steps.length - 1"
            :disabled="!canProceed"
            class="nav-btn primary"
          >
            下一步
          </button>
          <button
            @click="finishCreation"
            v-if="currentStep === steps.length - 1"
            :disabled="!isComplete"
            class="nav-btn success"
          >
            完成创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const steps = [{ name: '角色命名' }, { name: '选择出身' }, { name: '角色预览' }]

const currentStep = ref(0)

interface Origin {
  id: number
  name: string
  description: string
  attributeModifiers: {
    root_bone?: number
    spirituality?: number
    comprehension?: number
    fortune?: number
    charm?: number
    temperament?: number
  }
}

const characterData = ref<{
  name: string
  origin: Origin | null
}>({
  name: '',
  origin: null,
})

// 基础的出身数据
const origins = ref([
  {
    id: 1,
    name: '山村少年',
    description: '出身平凡山村，朴实无华，但心怀大志',
    attributeModifiers: {
      root_bone: 2, // 体魄较好
      fortune: -1, // 机缘较差
      spirituality: 1, // 灵性一般
    },
  },
  {
    id: 2,
    name: '书香门第',
    description: '出身书香世家，知书达理，文质彬彬',
    attributeModifiers: {
      comprehension: 2, // 悟性较高
      charm: 1, // 神韵较好
      root_bone: -1, // 体魄较差
    },
  },
  {
    id: 3,
    name: '江湖游侠',
    description: '闯荡江湖多年，武艺不凡，侠义心肠',
    attributeModifiers: {
      temperament: 2, // 心性坚韧
      fortune: 1, // 机缘较好
      spirituality: -1, // 灵性一般
    },
  },
])

const canProceed = computed(() => {
  if (currentStep.value === 0) return characterData.value.name.trim() !== ''
  if (currentStep.value === 1) return characterData.value.origin !== null
  return true
})

const isComplete = computed(() => {
  return characterData.value.name && characterData.value.origin
})

const goBack = () => {
  router.push('/')
}

const selectOrigin = (origin: Origin) => {
  characterData.value.origin = origin
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const nextStep = () => {
  if (canProceed.value && currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const finishCreation = () => {
  if (!characterData.value.name.trim()) {
    alert('请为你的道途取一个名字')
    return
  }

  if (!characterData.value.origin) {
    alert('请选择你的出身')
    return
  }

  // 计算基础属性
  const attributes = {
    root_bone: 10, // 根骨
    spirituality: 10, // 灵性
    comprehension: 10, // 悟性
    fortune: 10, // 机缘
    charm: 10, // 神韵
    temperament: 10, // 心性
  }

  // 应用出身加成
  if (characterData.value.origin.attributeModifiers) {
    Object.entries(characterData.value.origin.attributeModifiers).forEach(([key, value]) => {
      if (value && key in attributes) {
        attributes[key as keyof typeof attributes] += value
      }
    })
  }

  const summary = `角色创建完成！
姓名：${characterData.value.name}
出身：${characterData.value.origin.name}

基础属性：
根骨：${attributes.root_bone}
灵性：${attributes.spirituality}
悟性：${attributes.comprehension}
机缘：${attributes.fortune}
神韵：${attributes.charm}
心性：${attributes.temperament}

出身效果：${characterData.value.origin.description}`

  alert(summary)
  localStorage.setItem(
    'lastCreatedCharacter',
    JSON.stringify({
      ...characterData.value,
      attributes,
    }),
  )
  router.push('/')
}
</script>

<style scoped>
.creation-page {
  min-height: 100vh;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.creation-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 30px;
  max-width: 800px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.back-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover {
  background: #5a6268;
}

h1 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.step-indicator {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

.step {
  padding: 10px 20px;
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 25px;
  font-weight: 500;
  transition: all 0.3s;
}

.step.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.step.completed {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.step-content {
  min-height: 300px;
  margin-bottom: 30px;
}

.step-panel h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.name-input {
  width: 100%;
  padding: 15px;
  font-size: 16px;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  text-align: center;
}

.name-input:focus {
  outline: none;
  border-color: #007bff;
}

.options-grid {
  display: grid;
  gap: 15px;
}

.option-card {
  border: 2px solid #dee2e6;
  border-radius: 10px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  background: #f8f9fa;
}

.option-card:hover {
  border-color: #007bff;
  transform: translateY(-2px);
}

.option-card.selected {
  border-color: #007bff;
  background: rgba(0, 123, 255, 0.1);
}

.option-card h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.option-card p {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.character-preview {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  border: 2px solid #dee2e6;
}

.character-preview p {
  margin: 10px 0;
  font-size: 16px;
}

.navigation {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.nav-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-btn:not(:disabled):hover {
  transform: translateY(-2px);
}

.nav-btn.primary {
  background: #007bff;
  color: white;
}

.nav-btn.primary:hover:not(:disabled) {
  background: #0056b3;
}

.nav-btn.success {
  background: #28a745;
  color: white;
}

.nav-btn.success:hover:not(:disabled) {
  background: #1e7e34;
}

.nav-btn:not(.primary):not(.success) {
  background: #6c757d;
  color: white;
}

.nav-btn:not(.primary):not(.success):hover:not(:disabled) {
  background: #5a6268;
}
</style>
