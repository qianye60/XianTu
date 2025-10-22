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
        <div class="current-cultivation-card detail-section">
          <div class="detail-header">
            <h3 class="detail-title">
              <ScrollText :size="20" class="title-icon" />
              {{ cultivationSkills ? `正在修炼: ${cultivationSkills.名称}` : '未选择功法' }}
            </h3>
            <div v-if="cultivationSkills" class="header-actions">
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
          
          <div v-if="cultivationSkills" class="detail-content">
            <!-- 功法基本信息 -->
            <div class="technique-info-grid">
              <div class="info-item">
                <span class="info-label">品质</span>
                <span class="info-value" :class="getQualityTextClass(cultivationSkills)">
                  {{ cultivationSkills.品质?.quality || '凡' }}品
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">类型</span>
                <span class="info-value">{{ cultivationSkills.类型 || '功法' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">技能数</span>
                <span class="info-value">{{ (cultivationSkills.功法技能?.length || 0) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">已解锁</span>
                <span class="info-value text-success">{{ allLearnedSkills.length }}</span>
              </div>
            </div>

            <!-- 功法描述 -->
            <div v-if="cultivationSkills.描述" class="technique-description">
              <div class="description-header">
                <BookOpen :size="16" />
                <span>功法要义</span>
              </div>
              <p class="description-text">{{ cultivationSkills.描述 }}</p>
            </div>

            <!-- 修炼进度 -->
            <div class="progress-section">
              <div class="progress-info">
                <span class="progress-label">
                  <Zap :size="14" />
                  修炼熟练度
                </span>
                <span class="progress-value">{{ formatProgress(cultivationSkills.修炼进度) }}%</span>
              </div>
              <div class="progress-bar large">
                <div class="progress-fill" :style="{ width: formatProgress(cultivationSkills.修炼进度) + '%' }"></div>
                <div class="progress-milestones">
                  <div
                    v-for="skill in sortedSkills"
                    :key="skill.技能名称"
                    class="milestone"
                    :class="{
                      'unlocked': isSkillUnlocked(skill.技能名称),
                      'upcoming': isUpcomingSkill(skill)
                    }"
                    :style="{ left: (skill.解锁需要熟练度 || 0) + '%' }"
                    :title="`${skill.技能名称} - ${skill.解锁需要熟练度}%`"
                  >
                    <div class="milestone-marker"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <ScrollText :size="48" class="empty-icon" />
            <p class="empty-text">从功法库中选择一部功法开始修炼</p>
            <p class="empty-hint">功法中蕴含多种技能，随着熟练度提升逐步解锁</p>
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
                  <span class="unlock-condition">解锁于 {{ skill.解锁需要熟练度 }}%</span>
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
                  <span class="unlock-condition">需要熟练度 {{ skill.解锁需要熟练度 }}%</span>
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
import { ref, computed } from 'vue';
import { Zap, BookOpen, Sparkles, PackageOpen, ScrollText, Package, Check, Lock } from 'lucide-vue-next';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useUIStore } from '@/stores/uiStore';
import DeepCultivationModal from '@/components/common/DeepCultivationModal.vue';
import type { Item, TechniqueItem } from '@/types/game';

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();
const uiStore = useUIStore();

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
    (a, b) => (a.解锁需要熟练度 || 0) - (b.解锁需要熟练度 || 0)
  );
});

const isSkillUnlocked = (skillName: string): boolean => {
  return cultivationSkills.value?.已解锁技能?.includes(skillName) || false;
};

const isUpcomingSkill = (skill: any): boolean => {
  const currentProgress = cultivationSkills.value?.修炼进度 || 0;
  const requiredProgress = skill.解锁需要熟练度 || 0;
  return !isSkillUnlocked(skill.技能名称) && currentProgress >= requiredProgress - 10;
};

const getSkillUnlockProgress = (skill: any): number => {
  const currentProgress = cultivationSkills.value?.修炼进度 || 0;
  const requiredProgress = skill.解锁需要熟练度 || 100;
  return Math.min(100, (currentProgress / requiredProgress) * 100);
};

const techniqueForModal = computed((): TechniqueItem | null => {
  return cultivationSkills.value;
});

const truncateText = (text?: string, maxLength: number = 50): string => {
  if (!text) return '';
  return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
};

const formatProgress = (progress?: number): string => {
  return Math.min(100, Math.max(0, progress || 0)).toFixed(1);
};

const getQualityClass = (item: any): string => `quality-${item?.品质?.quality || '凡'}`;
const getQualityTextClass = (item: any): string => `text-quality-${item?.品质?.quality || '凡'}`;

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
</script>

<style scoped>
.skills-panel {
  gap: 0; /* 移除基础面板的gap，由内部元素控制 */
}

.panel-content {
  padding: 0.5rem;
  overflow-y: auto;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .panel-content {
    padding: 0.375rem;
  }
  
  .filter-tabs {
    gap: 0.25rem;
  }
  
  .filter-tab {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
  
  .techniques-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 0.5rem;
  }
  
  .list-item {
    padding: 0.625rem;
  }
  
  .list-item-title {
    font-size: 0.875rem;
  }
  
  .list-item-subtitle {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .tab-name {
    font-size: 0.8125rem;
  }
  
  .btn-text {
    display: none;
  }
  
  .action-btn {
    padding: 0.5rem;
    min-width: 2.5rem;
  }
  
  .detail-title {
    font-size: 0.9375rem;
  }
  
  .techniques-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  }
}

.cultivation-tab-content, .library-tab-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.current-cultivation-card {
  margin: 0;
}

.tab-icon {
  flex-shrink: 0;
}

.btn-icon {
  flex-shrink: 0;
}

.empty-icon {
  color: var(--color-text-secondary);
  opacity: 0.6;
  flex-shrink: 0;
}

.title-icon {
  vertical-align: middle;
  margin-right: 0.5rem;
  color: var(--color-primary);
}

.technique-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.info-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.text-success {
  color: var(--color-success);
}

.technique-description {
  margin-bottom: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.05), rgba(var(--color-accent-rgb), 0.05));
  border-radius: 8px;
  border-left: 3px solid var(--color-primary);
}

.description-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--color-primary);
  font-size: 0.875rem;
}

.description-text {
  margin: 0;
  line-height: 1.6;
  color: var(--color-text);
  font-size: 0.875rem;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.progress-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-text-secondary);
}

.progress-value {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 1rem;
}

.progress-bar.large {
  height: 24px;
  position: relative;
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
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.milestone-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  transition: all 0.3s ease;
}

.milestone.unlocked .milestone-marker {
  background: var(--color-success);
  border-color: var(--color-success);
  box-shadow: 0 0 8px rgba(var(--color-success-rgb), 0.5);
}

.milestone.upcoming .milestone-marker {
  background: var(--color-warning);
  border-color: var(--color-warning);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.empty-hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.skills-category {
  margin-bottom: 1.5rem;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-border);
}

.list-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.title-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
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
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  transition: all 0.2s ease;
}

.skill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.skill-card.mastered {
  border-left: 3px solid var(--color-success);
  background: linear-gradient(135deg, rgba(var(--color-success-rgb), 0.03), transparent);
}

.skill-card.locked {
  border-left: 3px solid var(--color-warning);
  background: linear-gradient(135deg, rgba(var(--color-warning-rgb), 0.03), transparent);
  opacity: 0.85;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
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
  opacity: 0.6;
}

.skill-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text);
}

.skill-description.dimmed {
  color: var(--color-text-secondary);
}

.skill-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.unlock-condition {
  font-weight: 500;
}

.unlock-progress-bar {
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.unlock-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-warning), var(--color-success));
  transition: width 0.3s ease;
}

.techniques-grid {
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
}

.technique-card .item-icon {
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
}

/* 临时弹窗样式，后续应统一 */
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