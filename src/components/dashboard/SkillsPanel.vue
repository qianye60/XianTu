<template>
  <div class="game-panel skills-panel">
    <!-- 顶部标签页 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <button
          class="filter-tab"
          :class="{ active: activeTab === 'cultivation' }"
          @click="activeTab = 'cultivation'"
        >
          <Zap :size="16" class="tab-icon" />
          <span class="tab-name">修炼</span>
        </button>
        <button
          class="filter-tab"
          :class="{ active: activeTab === 'library' }"
          @click="activeTab = 'library'"
        >
          <BookOpen :size="16" class="tab-icon" />
          <span class="tab-name">功法库</span>
          <span class="tab-count">{{ inventoryTechniques.length }}</span>
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="panel-content">
      <!-- 修炼标签页 -->
      <div v-if="activeTab === 'cultivation'" class="cultivation-tab-content">
        <!-- 当前修炼功法 -->
        <div class="current-cultivation-card" :class="cultivationSkills ? getQualityClass(cultivationSkills) : ''">
          <div class="card-background-glow"></div>
          <div class="card-content-wrapper">
            <div v-if="cultivationSkills" class="detail-content">
              <div class="detail-header">
                <div class="title-group">
                  <div class="title-icon-wrapper">
                    <ScrollText :size="24" class="title-icon" />
                  </div>
                  <div>
                    <p class="cultivation-status">正在修炼</p>
                    <h3 class="detail-title">{{ cultivationSkills.名称 }}</h3>
                  </div>
                </div>
                <div class="header-actions">
                  <button class="action-btn primary" @click="showCultivationDialog">
                    <Sparkles :size="16" class="btn-icon" />
                    <span class="btn-text">深度修炼</span>
                  </button>
                  <button class="action-btn" @click="unequipSkill">
                    <PackageOpen :size="16" class="btn-icon" />
                    <span class="btn-text">卸下</span>
                  </button>
                </div>
              </div>

              <!-- 功法基本信息 -->
              <div class="technique-info-container">
                <div class="info-row">
                  <span class="info-label">品质</span>
                  <span class="info-value" :class="getQualityTextClass(cultivationSkills)">{{ cultivationSkills.品质?.quality || '凡' }}品</span>
                </div>
                <div class="info-row">
                  <span class="info-label">类型</span>
                  <span class="info-value">{{ cultivationSkills.类型 || '功法' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">技能数</span>
                  <span class="info-value">{{ (cultivationSkills.功法技能?.length || 0) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">已解锁</span>
                  <span class="info-value text-success">{{ allLearnedSkills.length }}</span>
                </div>
              </div>

              <!-- 修炼进度 -->
              <div class="progress-section">
                <div class="progress-info">
                  <div class="progress-label">
                    <div class="label-icon">
                      <Zap :size="16" />
                    </div>
                    <span class="label-text">修炼熟练度</span>
                  </div>
                  <span class="progress-value">{{ formatProgress(cultivationSkills.修炼进度) }}%</span>
                </div>
                <div class="progress-bar-wrapper">
                  <div class="progress-bar large">
                    <div class="progress-fill" :style="{ width: formatProgress(cultivationSkills.修炼进度) + '%' }">
                      <div class="progress-shine"></div>
                    </div>
                    <div class="progress-milestones">
                      <div
                        v-for="skill in sortedSkills"
                        :key="skill.技能名称"
                        class="milestone"
                        :class="{ 'unlocked': isSkillUnlocked(skill.技能名称) }"
                        :style="{ left: (skill.熟练度要求 || skill.解锁需要熟练度 || 0) + '%' }"
                        :title="`${skill.技能名称} - ${skill.熟练度要求 || skill.解锁需要熟练度 || 0}%`"
                      >
                        <span class="milestone-name">{{ skill.技能名称 }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="upcomingSkill" class="upcoming-skill-info">
                  下一技能: <strong>{{ upcomingSkill.技能名称 }}</strong> ({{ upcomingSkill.熟练度要求 || upcomingSkill.解锁需要熟练度 || 0 }}%)
                </div>
              </div>
            </div>
            
            <div v-else class="empty-state">
              <ScrollText :size="48" class="empty-icon" />
              <p class="empty-text">从功法库中选择一部功法开始修炼</p>
              <p class="empty-hint">功法中蕴含多种技能，随着熟练度提升逐步解锁</p>
            </div>
          </div>
        </div>

        <!-- 技能列表 -->
        <div v-if="cultivationSkills" class="skills-list-section">
          <!-- 已掌握技能 -->
          <div v-if="allLearnedSkills.length > 0" class="skills-category">
            <div class="category-header">
              <h4 class="list-title">
                <div class="title-badge success">
                  <Check :size="16" />
                </div>
                已掌握技能
              </h4>
              <span class="skill-count">{{ allLearnedSkills.length }}/{{ (cultivationSkills.功法技能?.length || 0) }}</span>
            </div>
            <div class="skills-grid">
              <div v-for="skill in allLearnedSkills" :key="skill.技能名称" class="skill-card mastered">
                <div class="skill-header">
                  <span class="skill-name">{{ skill.技能名称 }}</span>
                  <span class="unlock-badge">已解锁</span>
                </div>
                <p class="skill-description">{{ skill.技能描述 }}</p>
                <div class="skill-footer">
                  <span class="unlock-condition">解锁于 {{ skill.熟练度要求 || skill.解锁需要熟练度 || 0 }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 待解锁技能 -->
          <div v-if="unmasteredSkills.length > 0" class="skills-category">
            <div class="category-header">
              <h4 class="list-title">
                <div class="title-badge warning">
                  <Lock :size="16" />
                </div>
                待解锁技能
              </h4>
              <span class="skill-count">{{ unmasteredSkills.length }} 个</span>
            </div>
            <div class="skills-grid">
              <div v-for="skill in unmasteredSkills" :key="skill.技能名称" class="skill-card locked">
                <div class="skill-header">
                  <span class="skill-name">{{ skill.技能名称 }}</span>
                  <span class="lock-icon">🔒</span>
                </div>
                <p class="skill-description dimmed">{{ skill.技能描述 }}</p>
                <div class="skill-footer">
                  <span class="unlock-condition">需要熟练度 {{ skill.熟练度要求 || skill.解锁需要熟练度 || 0 }}%</span>
                  <div class="unlock-progress-bar">
                    <div
                      class="unlock-progress-fill"
                      :style="{ width: getSkillUnlockProgress(skill) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 功法库标签页 -->
      <div v-if="activeTab === 'library'" class="library-tab-content">
        <div v-if="inventoryTechniques.length === 0" class="empty-state">
          <Package :size="48" class="empty-icon" />
          <p class="empty-text">功法库为空，探索世界获取功法秘籍</p>
        </div>
        <div v-else class="items-grid techniques-grid">
          <div
            v-for="technique in inventoryTechniques"
            :key="technique.物品ID"
            class="item-card technique-card"
            @click="selectTechnique(technique)"
          >
            <div class="item-quality-indicator" :class="getQualityClass(technique)"></div>
            <div class="item-icon">功</div>
            <div class="item-name" :class="getQualityTextClass(technique)">{{ technique.名称 }}</div>
            <div class="item-info">{{ technique.品质?.quality || '凡' }}品</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 功法详情弹窗 (样式待根据全局弹窗组件调整) -->
    <div v-if="selectedTechnique" class="technique-modal-overlay" @click="closeModal">
      <div class="technique-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ selectedTechnique.名称 }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-content">
          <p>{{ selectedTechnique.描述 }}</p>
          <!-- 更多详情... -->
        </div>
        <div class="modal-actions">
          <button class="action-btn primary" @click="equipTechnique(selectedTechnique)">装备修炼</button>
          <button class="action-btn" @click="closeModal">取消</button>
        </div>
      </div>
    </div>

    <!-- 深度修炼对话框 -->
    <DeepCultivationModal
      :visible="showDialog"
      :technique="techniqueForModal"
      :current-progress="getCultivationProgress()"
      @close="closeDialog"
      @confirm="handleCultivationConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Zap, BookOpen, Sparkles, PackageOpen, ScrollText, Package, Check, Lock } from 'lucide-vue-next';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useUIStore } from '@/stores/uiStore';
import DeepCultivationModal from '@/components/common/DeepCultivationModal.vue';
import type { TechniqueItem, TechniqueSkill } from '@/types/game';

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();
const uiStore = useUIStore();

const upcomingSkill = computed(() => {
  if (!cultivationSkills.value) return null;
  // Find the first skill in the sorted list that is not yet unlocked
  return sortedSkills.value.find(s => !isSkillUnlocked(s.技能名称)) || null;
});

const activeTab = ref('cultivation');
const selectedTechnique = ref<TechniqueItem | null>(null);
const showDialog = ref(false);

const cultivationSkills = computed((): TechniqueItem | null => {
  const inventory = gameStateStore.inventory?.物品;
  if (!inventory) return null;
  const cultivatingTechnique = Object.values(inventory).find(
    item => item?.类型 === '功法' && item?.已装备 === true
  );
  return (cultivatingTechnique as TechniqueItem) || null;
});

const inventoryTechniques = computed((): TechniqueItem[] => {
  const inventory = gameStateStore.inventory?.物品;
  if (!inventory) return [];
  return Object.values(inventory).filter((item): item is TechniqueItem =>
    item?.类型 === '功法' && !item.已装备
  );
});

const allLearnedSkills = computed(() => {
  if (!cultivationSkills.value?.功法技能) return [];
  const unlocked = cultivationSkills.value.已解锁技能 || [];
  return cultivationSkills.value.功法技能.filter(s => unlocked.includes(s.技能名称));
});

const unmasteredSkills = computed(() => {
  if (!cultivationSkills.value?.功法技能) return [];
  const unlocked = cultivationSkills.value.已解锁技能 || [];
  return cultivationSkills.value.功法技能.filter(s => !unlocked.includes(s.技能名称));
});

const sortedSkills = computed(() => {
  if (!cultivationSkills.value?.功法技能) return [];
  return [...cultivationSkills.value.功法技能].sort(
    (a, b) => (a.熟练度要求 || a.解锁需要熟练度 || 0) - (b.熟练度要求 || b.解锁需要熟练度 || 0)
  );
});

const isSkillUnlocked = (skillName: string): boolean => {
  return cultivationSkills.value?.已解锁技能?.includes(skillName) || false;
};

const getSkillUnlockProgress = (skill: TechniqueSkill): number => {
  const currentProgress = cultivationSkills.value?.修炼进度 || 0;
  const requiredProgress = skill.熟练度要求 || skill.解锁需要熟练度 || 100;
  return Math.min(100, (currentProgress / requiredProgress) * 100);
};

const techniqueForModal = computed((): TechniqueItem | null => {
  return cultivationSkills.value;
});

const formatProgress = (progress?: number): string => {
  return Math.min(100, Math.max(0, progress || 0)).toFixed(1);
};

const getQualityClass = (item: TechniqueItem): string => `quality-${item?.品质?.quality || '凡'}`;
const getQualityTextClass = (item: TechniqueItem): string => `text-quality-${item?.品质?.quality || '凡'}`;

const getCultivationProgress = (): number => cultivationSkills.value?.修炼进度 || 0;

const selectTechnique = (technique: TechniqueItem) => {
  selectedTechnique.value = technique;
};

const closeModal = () => {
  selectedTechnique.value = null;
};

const equipTechnique = async (technique: TechniqueItem) => {
  if (!technique?.物品ID) return;
  const action = async () => {
    try {
      await characterStore.equipTechnique(technique.物品ID!);
      closeModal();
    } catch (error) {
      console.error('[SkillsPanel] Equip technique failed:', error);
    }
  };

  if (cultivationSkills.value) {
    uiStore.showRetryDialog({
      title: '切换功法',
      message: `当前正在修炼《${cultivationSkills.value.名称}》，确定要切换到《${technique.名称}》吗？`,
      onConfirm: action,
      onCancel: () => {},
    });
  } else {
    await action();
  }
};

const unequipSkill = async () => {
  if (!cultivationSkills.value?.物品ID) return;
  const skillToUnequip = cultivationSkills.value;
  uiStore.showRetryDialog({
    title: '卸下功法',
    message: `确定要卸下《${skillToUnequip.名称}》吗？`,
    confirmText: '确定卸下',
    cancelText: '取消',
    onConfirm: async () => {
      try {
        await characterStore.unequipTechnique(skillToUnequip.物品ID!);
      } catch (error) {
        console.error('[SkillsPanel] Unequip technique failed:', error);
      }
    },
    onCancel: () => {},
  });
};

const showCultivationDialog = () => {
  if (cultivationSkills.value) showDialog.value = true;
};

const closeDialog = () => {
  showDialog.value = false;
};

const handleCultivationConfirm = async (totalDays: number) => {
  showDialog.value = false;
  if (!cultivationSkills.value) return;
  try {
    const { useActionQueueStore } = await import('@/stores/actionQueueStore');
    useActionQueueStore().addAction({
      type: 'cultivate',
      itemName: cultivationSkills.value.名称,
      itemType: '功法',
      description: `对《${cultivationSkills.value.名称}》进行${totalDays}天的深度修炼`,
    });
  } catch (error) {
    console.error('[SkillsPanel] Add deep cultivation action failed:', error);
  }
};

// 🔥 [修复] 页面加载时自动检查并解锁应该解锁的技能
const checkAndUnlockSkills = () => {
  if (!cultivationSkills.value) return;

  const technique = cultivationSkills.value;
  if (!technique.功法技能 || !Array.isArray(technique.功法技能)) return;

  const currentProgress = technique.修炼进度 || 0;
  let unlocked = false;

  if (!technique.已解锁技能) {
    technique.已解锁技能 = [];
  }

  technique.功法技能.forEach(skill => {
    const unlockThreshold = skill.熟练度要求 || skill.解锁需要熟练度 || 0;
    if (currentProgress >= unlockThreshold && !technique.已解锁技能!.includes(skill.技能名称)) {
      technique.已解锁技能!.push(skill.技能名称);
      console.log(`[SkillsPanel] 自动解锁技能: ${skill.技能名称} (阈值: ${unlockThreshold}%)`);
      unlocked = true;
    }
  });

  if (unlocked) {
    // 保存更新
    characterStore.saveCurrentGame();
  }
};

// 监听 cultivationSkills 变化，自动检查技能解锁
watch(cultivationSkills, () => {
  checkAndUnlockSkills();
}, { immediate: true });
</script>

<style scoped>
.skills-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--color-background-light);
}

.panel-content {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* --- Current Cultivation Card --- */
.current-cultivation-card {
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  position: relative;
  overflow: hidden;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}

.card-background-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.1) 0%, rgba(var(--color-primary-rgb), 0) 70%);
  animation: rotateGlow 15s linear infinite;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.current-cultivation-card.quality-凡 .card-background-glow { opacity: 0; }
.current-cultivation-card.quality-人 .card-background-glow { background: radial-gradient(circle, rgba(var(--color-success-rgb), 0.1) 0%, transparent 70%); opacity: 1; }
.current-cultivation-card.quality-地 .card-background-glow { background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.15) 0%, transparent 70%); opacity: 1; }
.current-cultivation-card.quality-天 .card-background-glow { background: radial-gradient(circle, rgba(var(--color-accent-rgb), 0.2) 0%, transparent 70%); opacity: 1; }
.current-cultivation-card.quality-道 .card-background-glow { background: radial-gradient(circle, rgba(var(--color-warning-rgb), 0.25) 0%, transparent 70%); opacity: 1; }


@keyframes rotateGlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-content-wrapper {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.title-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--color-primary-rgb), 0.1);
}
.title-icon {
  color: var(--color-primary);
  margin: 0;
}

.cultivation-status {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 0 0 0.25rem 0;
  text-transform: uppercase;
}

.detail-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* --- Progress Section --- */
.progress-section {
  margin-top: 1.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.progress-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.label-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: white;
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.3);
}

.label-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.progress-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.progress-bar-wrapper {
  position: relative;
  padding-top: 2rem; /* Space for milestone labels */
  margin-bottom: 1rem; /* Space below the bar */
}

.progress-bar.large {
  height: 16px;
  background: var(--color-surface-light);
  border-radius: 8px;
  overflow: visible;
  position: relative;
}

.progress-fill {
  background: linear-gradient(90deg, var(--color-primary-light), var(--color-primary));
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.progress-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shine 2.5s ease-in-out infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-milestones {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.milestone {
  position: absolute;
  bottom: 100%; /* Position above the bar */
  transform: translateX(-50%);
  padding-bottom: 8px; /* Space for the line */
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: all;
}

.milestone::after { /* This will be the line */
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 1px;
  height: 8px;
  background: var(--color-border);
}

.milestone-name { /* This is the text box */
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  border: 1px solid var(--color-border);
}

.milestone.unlocked .milestone-name {
  color: var(--color-success);
  border-color: var(--color-success);
  font-weight: 600;
}

.milestone.unlocked::after {
  background: var(--color-success);
}

.upcoming-skill-info {
  margin-top: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.5rem;
  border-radius: 6px;
}
.upcoming-skill-info strong {
  color: var(--color-primary);
}

/* --- Skills List --- */
.skills-list-section {
  margin-top: 1rem;
}

.skills-category {
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 1rem;
  margin-bottom: 1rem;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.list-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.title-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.title-badge.success {
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success);
}

.title-badge.warning {
  background: rgba(var(--color-warning-rgb), 0.15);
  color: var(--color-warning);
}

.skill-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 0.25rem 0.75rem;
  background: var(--color-surface-light);
  border-radius: 12px;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.skill-card {
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid transparent;
  background: var(--color-surface-light);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.skill-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary);
}

.skill-card.mastered {
  background: linear-gradient(135deg, var(--color-surface), rgba(var(--color-success-rgb), 0.05));
}

.skill-card.locked {
  background: linear-gradient(135deg, var(--color-surface), rgba(var(--color-warning-rgb), 0.05));
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.skill-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
}

.unlock-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success);
  border-radius: 4px;
  font-weight: 500;
}

.lock-icon {
  font-size: 1rem;
  color: var(--color-warning);
}

.skill-description {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  flex-grow: 1;
}

.skill-description.dimmed {
  color: var(--color-text-secondary);
  filter: blur(1px);
  opacity: 0.7;
}

.skill-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: auto;
}

.unlock-condition {
  font-weight: 500;
}

.unlock-progress-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.unlock-progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.techniques-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}

.technique-card {
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.technique-card:hover {
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  border-color: var(--color-primary);
}

.technique-card .item-quality-indicator {
  height: 4px;
}

.technique-card .item-icon {
  font-size: 2rem;
  font-weight: bold;
  line-height: 1;
  text-align: center;
  padding: 1rem 0;
  color: var(--color-text);
}

.technique-card .item-name {
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
  padding: 0.5rem;
  background: var(--color-surface-light);
  border-top: 1px solid var(--color-border);
}

.technique-card .item-info {
  display: none; /* Hide old info */
}

/* 功法信息 */
.technique-info-container {
  background: var(--color-surface-light);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.info-value {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 600;
}

.technique-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.technique-modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  max-width: 500px; width: 90%;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
.modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex; justify-content: space-between; align-items: center;
}
.modal-title { font-size: 1.125rem; font-weight: 600; margin: 0; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-secondary); }
.modal-content { padding: 1rem; }
.modal-actions {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex; gap: 0.5rem; justify-content: flex-end;
}
</style>