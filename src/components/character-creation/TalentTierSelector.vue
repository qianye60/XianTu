<template>
  <div class="talent-tier-selector">
    <div class="section-header">
      <h3 class="section-title">【 先天天资 】</h3>
      <p class="section-description">
        天资决定修行起点，不同天资可获得不同的属性点数，请择其一以定汝之根基。
      </p>
    </div>

    <div v-if="!talentTiers || talentTiers.length === 0" class="loading-state">
      <p>天道推演中...</p>
    </div>

    <div v-else class="talent-tiers-grid">
      <div
        v-for="tier in sortedTiers"
        :key="tier.id"
        class="talent-tier-card"
        :class="{ 
          'selected': selectedTier?.id === tier.id,
          'rarity-1': tier.rarity === 1,
          'rarity-2': tier.rarity === 2,
          'rarity-3': tier.rarity === 3,
          'rarity-4': tier.rarity === 4,
          'rarity-5': tier.rarity === 5,
          'rarity-6': tier.rarity === 6
        }"
        @click="selectTier(tier)"
      >
        <div class="tier-header">
          <h4 class="tier-name" :style="{ color: tier.color }">
            {{ tier.name }}
          </h4>
          <div class="tier-points">
            {{ tier.total_points }} 点
          </div>
        </div>
        
        <div class="tier-rarity">
          <span class="rarity-label">稀有度：</span>
          <div class="rarity-stars">
            <span 
              v-for="star in 6" 
              :key="star" 
              class="star"
              :class="{ 'filled': star <= (7 - tier.rarity) }"
            >
              ★
            </span>
          </div>
        </div>

        <div v-if="tier.description" class="tier-description">
          {{ tier.description }}
        </div>

        <div v-if="selectedTier?.id === tier.id" class="selection-indicator">
          ✓ 已选择
        </div>
      </div>
    </div>

    <div v-if="selectedTier" class="selected-info">
      <h4>当前选择：{{ selectedTier.name }}</h4>
      <p>可分配属性点数：<span class="highlight">{{ selectedTier.total_points }}</span></p>
      <p class="info-text">请在后续步骤中分配这些属性点到先天六司。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { TalentTier } from '@/core/rules/characterCreation'

// Props
const props = defineProps<{
  talentTiers?: TalentTier[]
  modelValue?: TalentTier | null
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: TalentTier | null): void
}>()

// Computed
const selectedTier = computed(() => props.modelValue)

const sortedTiers = computed(() => {
  if (!props.talentTiers) return []
  // Sort by rarity (ascending - more rare first)
  return [...props.talentTiers].sort((a, b) => a.rarity - b.rarity)
})

// Methods
const selectTier = (tier: TalentTier) => {
  emit('update:modelValue', tier)
}

// Auto-select first tier if none selected
watch(
  () => props.talentTiers,
  (newTiers) => {
    if (newTiers && newTiers.length > 0 && !selectedTier.value) {
      // Select the most common tier (highest rarity number) by default
      const defaultTier = [...newTiers].sort((a, b) => b.rarity - a.rarity)[0]
      selectTier(defaultTier)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.talent-tier-selector {
  padding: 1.5rem;
}

.section-header {
  text-align: center;
  margin-bottom: 2rem;
}

.section-title {
  font-family: var(--font-family-serif);
  font-size: 1.8rem;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.section-description {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
  font-family: var(--font-family-serif);
}

.talent-tiers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.talent-tier-card {
  background: linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(20, 30, 50, 0.9) 100%);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  backdrop-filter: blur(10px);
}

.talent-tier-card:hover {
  border-color: rgba(var(--color-primary-rgb), 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.talent-tier-card.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.3);
  transform: translateY(-2px);
}

/* Rarity-based styling */
.talent-tier-card.rarity-1 {
  background: linear-gradient(135deg, rgba(255, 0, 0, 0.2) 0%, rgba(139, 0, 0, 0.3) 100%);
}

.talent-tier-card.rarity-2 {
  background: linear-gradient(135deg, rgba(255, 165, 0, 0.2) 0%, rgba(255, 140, 0, 0.3) 100%);
}

.talent-tier-card.rarity-3 {
  background: linear-gradient(135deg, rgba(255, 255, 0, 0.2) 0%, rgba(255, 215, 0, 0.3) 100%);
}

.talent-tier-card.rarity-4 {
  background: linear-gradient(135deg, rgba(0, 255, 0, 0.2) 0%, rgba(0, 128, 0, 0.3) 100%);
}

.talent-tier-card.rarity-5 {
  background: linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(0, 100, 200, 0.3) 100%);
}

.talent-tier-card.rarity-6 {
  background: linear-gradient(135deg, rgba(128, 128, 128, 0.2) 0%, rgba(169, 169, 169, 0.3) 100%);
}

.tier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.tier-name {
  font-family: var(--font-family-serif);
  font-size: 1.4rem;
  font-weight: bold;
  margin: 0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.tier-points {
  background: rgba(var(--color-primary-rgb), 0.2);
  color: var(--color-primary);
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.9rem;
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
}

.tier-rarity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.rarity-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.rarity-stars {
  display: flex;
  gap: 2px;
}

.star {
  color: rgba(255, 215, 0, 0.3);
  font-size: 1rem;
  transition: color 0.2s ease;
}

.star.filled {
  color: #ffd700;
  text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
}

.tier-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.selection-indicator {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: var(--color-primary);
  color: white;
  padding: 0.3rem 0.6rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
}

.selected-info {
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1) 0%, rgba(var(--color-primary-rgb), 0.05) 100%);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
  border-radius: 10px;
  padding: 1.5rem;
  text-align: center;
}

.selected-info h4 {
  color: var(--color-primary);
  margin: 0 0 0.5rem 0;
  font-family: var(--font-family-serif);
}

.selected-info p {
  margin: 0.5rem 0;
  color: rgba(255, 255, 255, 0.8);
}

.highlight {
  color: var(--color-primary);
  font-weight: bold;
}

.info-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
}
</style>