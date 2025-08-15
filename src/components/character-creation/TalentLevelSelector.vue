<template>
  <div class="talent-level-selector">
    <h3 class="selector-title">【 天赋品级 】</h3>
    <p class="selector-desc">
      {{ isOnlineMode ? '联机模式下，部分天赋品级由AI根据角色设定生成，圣人天赋需兑换码解锁。' : '选择你的开局天赋等级，这将决定你的初始属性点数和天赋点数。' }}
    </p>

    <div class="talent-levels-grid">
      <div
        v-for="level in filteredTalentLevels"
        :key="level.name"
        class="level-card"
        :class="{
          selected: selectedLevel?.name === level.name,
          disabled: isLevelDisabled(level)
        }"
        @click="selectLevel(level)"
      >
        <div class="level-header">
          <h4 class="level-name">{{ level.name }}</h4>
          <div class="level-rarity" :class="level.rarity">{{ level.rarity }}</div>
        </div>

        <p class="level-description">{{ level.description }}</p>

        <div class="level-benefits">
          <div class="benefit-item">
            <i class="benefit-icon">⚡</i>
            <span>属性点: <strong>{{ level.attributePoints }}</strong></span>
          </div>
          <div class="benefit-item">
            <i class="benefit-icon">✨</i>
            <span>天赋点: <strong>{{ level.talentPoints }}</strong></span>
          </div>
          <div class="benefit-item">
            <i class="benefit-icon">🎯</i>
            <span>最大天赋数: <strong>{{ level.maxTalents }}</strong></span>
          </div>
        </div>

        <div v-if="level.specialEffects" class="special-effects">
          <h5>特殊效果:</h5>
          <ul>
            <li v-for="effect in level.specialEffects" :key="effect">{{ effect }}</li>
          </ul>
        </div>

        <div v-if="isOnlineMode && level.name === '圣人天赋' && !isSaintTalentUnlocked" class="unlock-requirement">
          <p class="unlock-text">请输入兑换码以勘破天机:</p>
          <div class="redemption-form">
            <input 
              v-model="redemptionCode" 
              placeholder="天道机缘" 
              class="redemption-input"
              @click.stop
            />
            <button @click.stop="validateCode" class="redemption-btn">验证</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCreationStore } from '@/stores/creation'
import { storeToRefs } from 'pinia'
import { useGameMode } from '@/composables/useGameMode'
import { useToast } from '@/composables/useToast'
import { postData } from '@/services/api'


export interface TalentLevel {
  name: string
  description: string
  rarity: string
  attributePoints: number
  talentPoints: number
  maxTalents: number
  specialEffects?: string[]
  unlockRequirement?: string
}

const store = useCreationStore()
const { stepModels } = storeToRefs(store)
const { isOnlineMode } = useGameMode()
const { showToast } = useToast()

const redemptionCode = ref('')
const isSaintTalentUnlocked = ref(false)

// 天赋等级配置
const talentLevels = ref<TalentLevel[]>([
  {
    name: '凡人天赋',
    description: '普通凡人的天赋水准，需要通过努力才能有所成就',
    rarity: 'common',
    attributePoints: 20,
    talentPoints: 10,
    maxTalents: 2,
  },
  {
    name: '小有天赋',
    description: '略高于常人的天赋，在某些方面有不俗的潜力',
    rarity: 'uncommon',
    attributePoints: 25,
    talentPoints: 15,
    maxTalents: 3,
  },
  {
    name: '天才根骨',
    description: '万中无一的天才，天生就有着超凡的修行资质',
    rarity: 'rare',
    attributePoints: 30,
    talentPoints: 20,
    maxTalents: 4,
    specialEffects: [
      '所有天赋效果增强10%',
      '突破瓶颈几率提升'
    ]
  },
  {
    name: '天骄之姿',
    description: '罕世奇才，千年难遇的绝世天骄，注定要在修仙界留下传说',
    rarity: 'epic',
    attributePoints: 35,
    talentPoints: 30,
    maxTalents: 5,
    specialEffects: [
      '所有天赋效果增强20%',
      '大幅度提升突破成功率',
      '天赋可以进化升级'
    ]
  },
  {
    name: '圣人天赋',
    description: '传说中的圣人之资，万年难遇的绝世天才，天道宠儿',
    rarity: 'legendary',
    attributePoints: 50,
    talentPoints: 50,
    maxTalents: 7,
    unlockRequirement: 'redemption_code',
    specialEffects: [
      '所有天赋效果增强50%',
      '可选择任意天赋无视限制',
      '天赋自动进化为最高级',
      '获得独有传说天赋'
    ]
  }
])

const filteredTalentLevels = computed(() => {
  if (isOnlineMode.value) {
    // 联机模式只显示凡人、小有和需要解锁的圣人天赋
    return talentLevels.value.filter(level => 
      level.name === '凡人天赋' || 
      level.name === '小有天赋' || 
      level.name === '圣人天赋'
    )
  }
  // 单机模式显示所有
  return talentLevels.value
})

const selectedLevel = computed(() => stepModels.value.talentLevel)

const selectLevel = (level: TalentLevel) => {
  if (isLevelDisabled(level)) {
    if (level.name === '圣人天赋' && isOnlineMode.value) {
      showToast({
        title: '天机未至',
        message: '请先使用兑换码解锁圣人天赋。',
        type: 'info'
      })
    }
    return
  }
  
  store.setStepData('talentLevel', level)
  
  // 重置后续步骤的数据
  store.setStepData('attributes', {})
  store.setStepData('talents', [])
}

const isLevelDisabled = (level: TalentLevel): boolean => {
  if (!isOnlineMode.value) return false // 单机模式全部可用
  if (level.name === '圣人天赋') {
    return !isSaintTalentUnlocked.value
  }
  // 联机模式下，除了圣人天赋，其他都由AI决定，所以禁用
  return level.name !== '凡人天赋' && level.name !== '小有天赋'
}

const validateCode = async () => {
  if (!redemptionCode.value.trim()) {
    showToast({ title: '请输入兑换码', type: 'warning' })
    return
  }
  try {
    const response = await postData('/api/v1/redemption/validate', { code: redemptionCode.value });
    if (response.valid) {
      isSaintTalentUnlocked.value = true
      showToast({ title: '机缘已至！', message: '圣人天赋已解锁。', type: 'success' })
      // 自动选择圣人天赋
      const saintTalent = talentLevels.value.find(t => t.name === '圣人天赋')
      if (saintTalent) {
        selectLevel(saintTalent)
      }
    } else {
      showToast({ title: '机缘未到', message: response.message || '兑换码无效或已使用。', type: 'error' })
    }
  } catch (error) {
    console.error('兑换码验证失败:', error)
    showToast({ title: '天机混沌', message: '验证时发生错误，请稍后再试。', type: 'error' })
  }
}

// 初始化默认天赋等级
onMounted(() => {
  if (!selectedLevel.value) {
    const defaultLevel = isOnlineMode.value ? talentLevels.value[0] : talentLevels.value[1]
    selectLevel(defaultLevel)
  }
})
</script>

<style scoped>
.talent-level-selector {
  width: 100%;
  text-align: center;
}

.selector-title {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-family: var(--font-family-serif);
  font-weight: bold;
}

.selector-desc {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  font-size: 1rem;
  line-height: 1.6;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.talent-levels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: clamp(1rem, 3vw, 2rem);
  margin-bottom: 2rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.level-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 16px;
  padding: clamp(1.5rem, 4vw, 2rem);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  position: relative;
  overflow: hidden;
}

.level-card:hover:not(.disabled) {
  border-color: var(--color-primary);
  box-shadow: 0 8px 25px rgba(var(--color-primary-rgb, 58, 95, 125), 0.2);
  transform: translateY(-4px);
}

.level-card.selected {
  border-color: var(--color-primary);
  background: var(--color-surface-light);
  box-shadow: 0 0 30px rgba(var(--color-primary-rgb, 58, 95, 125), 0.4);
}

.level-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  position: relative;
}

.level-card.disabled::before {
  content: '🔒';
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 1.5rem;
  opacity: 0.7;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.level-name {
  font-size: 1.3rem;
  font-weight: bold;
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-family-serif);
}

.level-card.selected .level-name {
  color: var(--color-primary);
}

.level-rarity {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.level-rarity.common {
  background: #6b7280;
  color: white;
}

.level-rarity.uncommon {
  background: #10b981;
  color: white;
}

.level-rarity.rare {
  background: #3b82f6;
  color: white;
}

.level-rarity.epic {
  background: #8b5cf6;
  color: white;
}

.level-rarity.legendary {
  background: linear-gradient(45deg, #f59e0b, #ef4444);
  color: white;
  animation: legendary-glow 2s ease-in-out infinite alternate;
}

@keyframes legendary-glow {
  from {
    box-shadow: 0 0 5px rgba(245, 158, 11, 0.5);
  }
  to {
    box-shadow: 0 0 15px rgba(245, 158, 11, 0.8);
  }
}

.level-description {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.level-card.selected .level-description {
  color: var(--color-text);
}

.level-benefits {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(var(--color-primary-rgb, 58, 95, 125), 0.1);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border-left: 3px solid var(--color-primary);
}

.benefit-icon {
  font-size: 1.1rem;
  width: 20px;
  text-align: center;
}

.special-effects {
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.special-effects h5 {
  color: var(--color-accent);
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  font-weight: bold;
}

.special-effects ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.special-effects li {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
  padding-left: 1rem;
  position: relative;
}

.special-effects li::before {
  content: '✦';
  color: var(--color-accent);
  position: absolute;
  left: 0;
  top: 0;
}

.unlock-requirement {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.unlock-text {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0 0 0.75rem 0;
  font-weight: bold;
}

.redemption-form {
  display: flex;
  gap: 0.5rem;
}

.redemption-input {
  flex-grow: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem;
  color: var(--color-text);
}

.redemption-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.redemption-btn:hover {
  background: var(--color-primary-dark);
}

@media (max-width: 768px) {
  .talent-levels-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>