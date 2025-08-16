<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>创建新角色</h2>
        <button @click="closeModal" class="close-btn">×</button>
      </div>

      <div class="creation-content">
        <!-- 步骤指示器 -->
        <div class="step-indicator">
          <div v-for="(step, index) in steps" :key="index" 
               :class="['step', { 'active': currentStep === index, 'completed': currentStep > index }]">
            <span class="step-number">{{ index + 1 }}</span>
            <span class="step-title">{{ step.title }}</span>
          </div>
        </div>

        <!-- 第一步：基本信息 -->
        <div v-if="currentStep === 0" class="step-content">
          <h3>基本信息</h3>
          <div class="form-group">
            <label>角色名称</label>
            <input 
              v-model="characterData.character_name" 
              type="text" 
              placeholder="请输入角色名称"
              maxlength="20"
            />
          </div>
          <div class="form-group">
            <label>出生年龄</label>
            <select v-model="characterData.birth_age">
              <option v-for="age in 19" :key="age - 1" :value="age - 1">
                {{ age - 1 }}岁
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>选择世界</label>
            <select v-model="characterData.world_id">
              <option value="">请选择世界</option>
              <option v-for="world in availableWorlds" :key="world.id" :value="world.id">
                {{ world.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>天资等级</label>
            <select v-model="characterData.talent_tier_id">
              <option value="">请选择天资等级</option>
              <option v-for="tier in availableTiers" :key="tier.id" :value="tier.id">
                {{ tier.name }} ({{ tier.total_points }}点)
              </option>
            </select>
          </div>
        </div>

        <!-- 第二步：属性分配 -->
        <div v-if="currentStep === 1" class="step-content">
          <h3>先天六司分配</h3>
          <div class="attribute-allocation">
            <div class="points-info">
              <span>总点数: {{ selectedTier?.total_points || 0 }}</span>
              <span>已分配: {{ allocatedPoints }}</span>
              <span>剩余: {{ remainingPoints }}</span>
            </div>
            
            <div class="attribute-list">
              <div v-for="attr in attributes" :key="attr.key" class="attribute-item">
                <div class="attr-info">
                  <span class="attr-name">{{ attr.name }}</span>
                  <span class="attr-desc">{{ attr.description }}</span>
                </div>
                <div class="attr-controls">
                  <button @click="decreaseAttribute(attr.key)" :disabled="characterData[attr.key] <= 0">-</button>
                  <span class="attr-value">{{ characterData[attr.key] }}</span>
                  <button @click="increaseAttribute(attr.key)" :disabled="remainingPoints <= 0 || characterData[attr.key] >= 10">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 第三步：选择出身和灵根 -->
        <div v-if="currentStep === 2" class="step-content">
          <h3>出身与灵根</h3>
          
          <div class="selection-section">
            <h4>选择出身</h4>
            <div class="options-grid">
              <div 
                v-for="origin in creationData.origins" 
                :key="origin.id"
                :class="['option-card', { 'selected': characterData.origin_id === origin.id }]"
                @click="selectOrigin(origin)"
              >
                <h5>{{ origin.name }}</h5>
                <p class="description">{{ origin.description }}</p>
                <div class="cost">消耗天赋点: {{ origin.talent_cost }}</div>
              </div>
            </div>
          </div>

          <div class="selection-section">
            <h4>选择灵根</h4>
            <div class="options-grid">
              <div 
                v-for="root in creationData.spirit_roots" 
                :key="root.id"
                :class="['option-card', { 'selected': characterData.spirit_root_id === root.id }]"
                @click="selectSpiritRoot(root)"
              >
                <h5>{{ root.name }}</h5>
                <p class="description">{{ root.description }}</p>
                <div class="multiplier">灵气倍率: {{ root.base_multiplier }}x</div>
                <div class="cost">消耗天赋点: {{ root.talent_cost }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 第四步：选择天赋 -->
        <div v-if="currentStep === 3" class="step-content">
          <h3>选择天赋</h3>
          <div class="talent-info">
            <span>可用天赋点: {{ availableTalentPoints }}</span>
            <span>已选天赋: {{ selectedTalents.length }}</span>
          </div>

          <div class="talent-grid">
            <div 
              v-for="talent in creationData.talents" 
              :key="talent.id"
              :class="['talent-card', { 
                'selected': isSelectedTalent(talent.id),
                'disabled': !canSelectTalent(talent)
              }]"
              @click="toggleTalent(talent)"
            >
              <h5>{{ talent.name }}</h5>
              <p class="description">{{ talent.description }}</p>
              <div class="talent-meta">
                <span class="cost">消耗: {{ talent.talent_cost }}点</span>
                <span class="rarity">稀有度: {{ talent.rarity }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 第五步：确认创建 -->
        <div v-if="currentStep === 4" class="step-content">
          <h3>确认角色信息</h3>
          <div class="character-summary">
            <div class="summary-section">
              <h4>基本信息</h4>
              <p><strong>角色名称:</strong> {{ characterData.character_name }}</p>
              <p><strong>世界:</strong> {{ getWorldName(characterData.world_id) }}</p>
              <p><strong>天资等级:</strong> {{ getTierName(characterData.talent_tier_id) }}</p>
              <p><strong>出生年龄:</strong> {{ characterData.birth_age }}岁</p>
            </div>

            <div class="summary-section">
              <h4>先天六司</h4>
              <div class="attributes-summary">
                <span v-for="attr in attributes" :key="attr.key">
                  {{ attr.name }}: {{ characterData[attr.key] }}
                </span>
              </div>
            </div>

            <div v-if="selectedOrigin" class="summary-section">
              <h4>出身</h4>
              <p><strong>{{ selectedOrigin.name }}</strong></p>
              <p>{{ selectedOrigin.description }}</p>
            </div>

            <div v-if="selectedSpiritRoot" class="summary-section">
              <h4>灵根</h4>
              <p><strong>{{ selectedSpiritRoot.name }}</strong></p>
              <p>{{ selectedSpiritRoot.description }}</p>
            </div>

            <div v-if="selectedTalents.length" class="summary-section">
              <h4>天赋</h4>
              <div class="selected-talents">
                <span v-for="talent in selectedTalentObjects" :key="talent.id" class="talent-tag">
                  {{ talent.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button v-if="currentStep > 0" @click="previousStep" class="btn-secondary">上一步</button>
        <button @click="closeModal" class="btn-cancel">取消</button>
        <button 
          v-if="currentStep < steps.length - 1" 
          @click="nextStep" 
          :disabled="!canProceed"
          class="btn-primary"
        >
          下一步
        </button>
        <button 
          v-if="currentStep === steps.length - 1" 
          @click="createCharacter"
          :disabled="creating"
          class="btn-create"
        >
          {{ creating ? '创建中...' : '创建角色' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { request } from '@/services/request'
import type { World, TalentTier, CreationData, AttributeKey, Origin, SpiritRoot, Talent, CharacterCreationPayload } from '@/types'

const emit = defineEmits<{
  close: []
  created: []
}>()

// 步骤定义
const steps = [
  { title: '基本信息' },
  { title: '属性分配' },
  { title: '出身灵根' },
  { title: '选择天赋' },
  { title: '确认创建' }
]

const currentStep = ref(0)
const creating = ref(false)

// 角色数据
const characterData = ref<CharacterCreationPayload>({
  character_name: '',
  world_id: '',
  talent_tier_id: '',
  birth_age: 16,
  root_bone: 0,
  spirituality: 0,
  comprehension: 0,
  fortune: 0,
  charm: 0,
  temperament: 0,
  origin_id: null,
  spirit_root_id: null,
  selected_talent_ids: []
})

// 可用数据
const availableWorlds = ref<World[]>([
  // Note: This might be fetched from an API in a real scenario
  { id: 1, name: '太乙仙门' }
])
const availableTiers = ref<TalentTier[]>([])
const creationData = ref<CreationData>({
  origins: [],
  spirit_roots: [],
  talents: []
})

// 属性定义
const attributes: { key: AttributeKey; name: string; description: string }[] = [
  { key: 'root_bone', name: '根骨', description: '体质根基' },
  { key: 'spirituality', name: '灵性', description: '灵气亲和' },
  { key: 'comprehension', name: '悟性', description: '理解天赋' },
  { key: 'fortune', name: '气运', description: '机缘造化' },
  { key: 'charm', name: '魅力', description: '容貌气质' },
  { key: 'temperament', name: '心性', description: '道心坚韧' }
]

// 计算属性
const selectedTier = computed(() => 
  availableTiers.value.find(tier => tier.id === characterData.value.talent_tier_id)
)

const allocatedPoints = computed(() => 
  attributes.reduce((sum, attr) => sum + characterData.value[attr.key], 0)
)

const remainingPoints = computed(() => 
  (selectedTier.value?.total_points || 0) - allocatedPoints.value
)

const selectedOrigin = computed(() =>
  creationData.value.origins.find(o => o.id === characterData.value.origin_id)
)

const selectedSpiritRoot = computed(() =>
  creationData.value.spirit_roots.find(r => r.id === characterData.value.spirit_root_id)
)

const selectedTalents = computed(() => characterData.value.selected_talent_ids)

const selectedTalentObjects = computed(() =>
  creationData.value.talents.filter(t => selectedTalents.value.includes(t.id))
)

const usedTalentPoints = computed(() => {
  let total = 0
  if (selectedOrigin.value) total += selectedOrigin.value.talent_cost
  if (selectedSpiritRoot.value) total += selectedSpiritRoot.value.talent_cost
  total += selectedTalentObjects.value.reduce((sum, t) => sum + t.talent_cost, 0)
  return total
})

const availableTalentPoints = computed(() => {
  // 假设每个天资等级都有额外的天赋点
  const baseTalentPoints = 10 // 基础天赋点
  return baseTalentPoints - usedTalentPoints.value
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      return characterData.value.character_name && 
             characterData.value.world_id && 
             characterData.value.talent_tier_id &&
             characterData.value.birth_age !== null
    case 1:
      return remainingPoints.value === 0
    case 2:
    case 3:
      return availableTalentPoints.value >= 0
    default:
      return true
  }
})

// 方法
const loadTalentTiers = async () => {
  try {
    const data = await request.get<TalentTier[]>('/api/v1/characters/talent_tiers')
    availableTiers.value = data
  } catch (error) {
    console.error('加载天资等级失败:', error)
  }
}

const loadCreationData = async () => {
  if (!characterData.value.world_id) return
  
  try {
    const data = await request.get<CreationData>(`/api/v1/characters/creation_data?world_id=${characterData.value.world_id}`)
    creationData.value = data
  } catch (error) {
    console.error('加载创建数据失败:', error)
  }
}

const increaseAttribute = (key: AttributeKey) => {
  if (remainingPoints.value > 0 && characterData.value[key] < 10) {
    characterData.value[key]++
  }
}

const decreaseAttribute = (key: AttributeKey) => {
  if (characterData.value[key] > 0) {
    characterData.value[key]--
  }
}

const selectOrigin = (origin: Origin) => {
  characterData.value.origin_id = characterData.value.origin_id === origin.id ? null : origin.id
}

const selectSpiritRoot = (root: SpiritRoot) => {
  characterData.value.spirit_root_id = characterData.value.spirit_root_id === root.id ? null : root.id
}

const isSelectedTalent = (talentId: number) => {
  return selectedTalents.value.includes(talentId)
}

const canSelectTalent = (talent: Talent) => {
  if (isSelectedTalent(talent.id)) return true
  return availableTalentPoints.value >= talent.talent_cost
}

const toggleTalent = (talent: Talent) => {
  if (!canSelectTalent(talent)) return
  
  const index = selectedTalents.value.indexOf(talent.id)
  if (index > -1) {
    selectedTalents.value.splice(index, 1)
  } else {
    selectedTalents.value.push(talent.id)
  }
}

const nextStep = () => {
  if (canProceed.value && currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const createCharacter = async () => {
  creating.value = true
  try {
    // Ensure IDs are numbers before sending
    const payload = {
      ...characterData.value,
      world_id: Number(characterData.value.world_id),
      talent_tier_id: Number(characterData.value.talent_tier_id),
    };
    await request.post('/api/v1/characters/create', payload)
    emit('created')
  } catch (error) {
    console.error('创建角色失败:', error)
    alert('创建角色失败')
  } finally {
    creating.value = false
  }
}

const closeModal = () => {
  emit('close')
}

// 辅助函数
const getWorldName = (worldId: number | '') => {
  return availableWorlds.value.find(w => w.id === worldId)?.name || '未知'
}

const getTierName = (tierId: number | '') => {
  return availableTiers.value.find(t => t.id === tierId)?.name || '未知'
}

onMounted(async () => {
  await loadTalentTiers()
})

// 监听世界选择变化，自动加载创建数据
watch(() => characterData.value.world_id, async (newWorldId) => {
  if (newWorldId) {
    await loadCreationData()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid #eee;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.creation-content {
  padding: 30px;
}

.step-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 20px;
  position: relative;
}

.step.active .step-number {
  background: #4caf50;
  color: white;
}

.step.completed .step-number {
  background: #2196f3;
  color: white;
}

.step-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 5px;
}

.step-title {
  font-size: 12px;
  color: #666;
}

.step-content {
  min-height: 400px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.attribute-allocation {
  max-width: 600px;
  margin: 0 auto;
}

.points-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.attribute-list {
  space-y: 15px;
}

.attribute-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 10px;
}

.attr-info {
  flex: 1;
}

.attr-name {
  font-weight: 600;
  margin-bottom: 3px;
}

.attr-desc {
  font-size: 12px;
  color: #666;
}

.attr-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.attr-controls button {
  width: 30px;
  height: 30px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.attr-value {
  font-weight: bold;
  min-width: 30px;
  text-align: center;
}

.selection-section {
  margin-bottom: 30px;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.option-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.option-card:hover {
  border-color: #4caf50;
}

.option-card.selected {
  border-color: #4caf50;
  background: #f0f8f0;
}

.talent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.talent-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.talent-card.selected {
  border-color: #4caf50;
  background: #f0f8f0;
}

.talent-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.talent-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
  margin-top: 10px;
}

.character-summary {
  max-width: 600px;
  margin: 0 auto;
}

.summary-section {
  margin-bottom: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
}

.attributes-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.selected-talents {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.talent-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 20px 30px;
  border-top: 1px solid #eee;
}

.modal-footer button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-cancel {
  background: #f5f5f5;
  color: #333;
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-create {
  background: #4caf50;
  color: white;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>