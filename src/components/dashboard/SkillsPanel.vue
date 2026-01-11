<template>
  <div class="skills-panel">
    <!-- 标签页导航 -->
    <div class="panel-tabs">
      <button
        class="panel-tab"
        :class="{ active: activeTab === 'cultivation' }"
        @click="activeTab = 'cultivation'"
      >
        <Zap :size="16" />
        <span>{{ t('修炼') }}</span>
      </button>
      <button
        class="panel-tab"
        :class="{ active: activeTab === 'mastered' }"
        @click="activeTab = 'mastered'"
      >
        <Sparkles :size="16" />
        <span>{{ t('掌握技能') }}</span>
        <span v-if="masteredSkills.length" class="tab-count">{{ masteredSkills.length }}</span>
      </button>
      <button
        class="panel-tab"
        :class="{ active: activeTab === 'library' }"
        @click="activeTab = 'library'"
      >
        <BookOpen :size="16" />
        <span>{{ t('功法库') }}</span>
        <span v-if="techniqueTotalCount" class="tab-count">{{ techniqueTotalCount }}</span>
      </button>
    </div>

    <!-- 修炼页面 -->
    <div v-if="activeTab === 'cultivation'" class="tab-content">
      <!-- 当前修炼功法 -->
      <div class="cultivation-card" :class="cultivationSkills ? getQualityBorderClass(cultivationSkills) : ''">
        <div class="cultivation-header">
          <div class="cultivation-info">
            <div class="technique-icon" :class="cultivationSkills ? getQualityBgClass(cultivationSkills) : ''">
              <ScrollText :size="20" />
            </div>
            <div class="technique-meta">
              <span class="meta-label">{{ cultivationSkills ? t('当前修炼') : t('未在修炼') }}</span>
              <span class="technique-name" :class="cultivationSkills ? getQualityTextClass(cultivationSkills) : ''">
                {{ cultivationSkills?.名称 || t('请从功法库选择功法') }}
              </span>
            </div>
          </div>

          <div class="cultivation-actions">
            <template v-if="cultivationSkills">
              <button class="action-btn primary" @click="startCultivation('normal')" :title="t('修炼')">
                <Zap :size="16" />
                <span>{{ t('修炼') }}</span>
              </button>
              <button class="action-btn" @click="startCultivation('secluded')" :title="t('闭关')">
                <Moon :size="16" />
                <span>{{ t('闭关') }}</span>
              </button>
              <button class="action-btn" @click="showCultivationDialog" :title="t('深修')">
                <Clock :size="16" />
                <span>{{ t('深修') }}</span>
              </button>
              <button v-if="canBreakthrough" class="action-btn warning" @click="attemptBreakthrough" :title="t('突破')">
                <TrendingUp :size="16" />
                <span>{{ t('突破') }}</span>
              </button>
              <button class="action-btn danger" @click="unequipSkill" :title="t('卸下')">
                <X :size="16" />
                <span>{{ t('卸下') }}</span>
              </button>
            </template>
          </div>
        </div>

        <!-- 修炼统计 -->
        <div v-if="cultivationSkills" class="cultivation-stats">
          <div class="stat-item">
            <span class="stat-label">{{ t('品质') }}</span>
            <span class="stat-value" :class="getQualityTextClass(cultivationSkills)">{{ cultivationSkills.品质?.quality || '凡' }}品</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('进度') }}</span>
            <span class="stat-value">{{ formatProgress(cultivationSkills.修炼进度) }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('速度') }}</span>
            <span class="stat-value">{{ cultivationSpeed }}%/日</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('已解锁') }}</span>
            <span class="stat-value success">{{ allLearnedSkills.length }}/{{ sortedSkills.length }}</span>
          </div>
          <div v-if="canBreakthrough" class="stat-item highlight">
            <span class="stat-label">{{ t('突破率') }}</span>
            <span class="stat-value warning">{{ breakthroughChance }}%</span>
          </div>
        </div>

        <!-- 进度条 -->
        <div v-if="cultivationSkills" class="progress-bar">
          <div class="progress-fill" :style="{ width: formatProgress(cultivationSkills.修炼进度) + '%' }"></div>
        </div>
      </div>

      <!-- 功法技能列表 -->
      <div v-if="cultivationSkills && sortedSkills.length > 0" class="skills-section">
        <div class="section-header">
          <Sparkles :size="16" />
          <span>{{ t('功法技能') }}</span>
          <span class="section-count">{{ allLearnedSkills.length }}/{{ sortedSkills.length }}</span>
        </div>
        <div class="skills-grid">
          <div
            v-for="skill in sortedSkills"
            :key="skill.技能名称"
            class="skill-card"
            :class="{ unlocked: isTechniqueSkillUnlocked(skill.技能名称) }"
          >
            <div class="skill-header">
              <span class="skill-name">{{ skill.技能名称 }}</span>
              <span class="skill-badge" :class="isTechniqueSkillUnlocked(skill.技能名称) ? 'success' : 'locked'">
                {{ isTechniqueSkillUnlocked(skill.技能名称) ? t('已解锁') : t('未解锁') }}
              </span>
            </div>
            <p class="skill-desc">{{ skill.技能描述 || t('暂无描述') }}</p>
            <div v-if="!isTechniqueSkillUnlocked(skill.技能名称)" class="skill-progress">
              <div class="progress-info">
                <span>{{ formatProgress(cultivationSkills.修炼进度) }}%</span>
                <span>/</span>
                <span>{{ getTechniqueSkillUnlockAt(skill) }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: getTechniqueSkillUnlockProgress(skill) + '%' }"></div>
              </div>
            </div>
            <div v-else class="skill-cost">
              <span>{{ t('消耗') }}: {{ skill.消耗 || t('无') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 掌握技能 -->
    <div v-else-if="activeTab === 'mastered'" class="tab-content">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <Search :size="16" />
        <input v-model="masteredQuery" type="text" :placeholder="t('搜索技能...')" />
      </div>

      <div v-if="masteredSkillsFiltered.length === 0" class="empty-state">
        <Sparkles :size="32" class="empty-icon" />
        <p>{{ masteredQuery.trim() ? t('没有匹配的技能') : t('暂无掌握技能') }}</p>
      </div>

      <div v-else class="mastered-grid">
        <div
          v-for="skill in masteredSkillsFiltered"
          :key="skill.技能名称 + '::' + (skill.来源 || '')"
          class="mastered-card"
          :class="{ active: selectedMasteredSkillKey === (skill.技能名称 + '::' + (skill.来源 || '')) }"
          @click="selectMasteredSkill(skill)"
        >
          <div class="mastered-header">
            <span class="mastered-name">{{ skill.技能名称 }}</span>
            <span class="mastered-badge">{{ t('已掌握') }}</span>
          </div>
          <p class="mastered-desc">{{ skill.技能描述 || t('暂无描述') }}</p>
          <div class="mastered-meta">
            <span class="meta-tag">{{ skill.来源 || t('未知来源') }}</span>
            <span class="meta-stat">{{ t('熟练度') }} {{ skill.熟练度 ?? 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 功法库 -->
    <div v-else class="tab-content">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <Search :size="16" />
        <input v-model="techniqueQuery" type="text" :placeholder="t('搜索功法...')" />
      </div>

      <div v-if="filteredInventoryTechniques.length === 0" class="empty-state">
        <BookOpen :size="32" class="empty-icon" />
        <p>{{ t('功法库为空或无匹配结果') }}</p>
      </div>

      <div v-else class="library-grid">
        <div
          v-for="technique in filteredInventoryTechniques"
          :key="technique.物品ID"
          class="technique-card"
          :class="[
            { equipped: isEquipped(technique) },
            getQualityBorderClass(technique)
          ]"
        >
          <div class="technique-header">
            <span class="technique-name" :class="getQualityTextClass(technique)">{{ technique.名称 }}</span>
            <span v-if="isEquipped(technique)" class="equipped-badge">{{ t('修炼中') }}</span>
          </div>
          <p class="technique-desc">{{ technique.描述 || t('暂无描述') }}</p>
          <div class="technique-footer">
            <span class="quality-tag" :class="getQualityTextClass(technique)">{{ (technique.品质?.quality || '凡') }}品</span>
            <span class="skill-count">{{ technique.功法技能?.length || 0 }} {{ t('技能') }}</span>
          </div>
          <div class="technique-actions">
            <button
              v-if="isEquipped(technique)"
              class="tech-btn"
              disabled
            >{{ t('修炼中') }}</button>
            <button
              v-else
              class="tech-btn primary"
              @click.stop="equipTechnique(technique)"
            >{{ t('装备') }}</button>
          </div>
        </div>
      </div>
    </div>

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
import { computed, ref, watch } from 'vue';
import { BookOpen, Clock, Moon, ScrollText, Search, Sparkles, TrendingUp, X, Zap } from 'lucide-vue-next';
import DeepCultivationModal from '@/components/common/DeepCultivationModal.vue';
import { useI18n } from '@/i18n';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useUIStore } from '@/stores/uiStore';
import { EnhancedActionQueueManager } from '@/utils/enhancedActionQueue';
import type { MasteredSkill, TechniqueItem, TechniqueSkill } from '@/types/game';

const { t } = useI18n();
const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();
const uiStore = useUIStore();

const activeTab = ref<'cultivation' | 'mastered' | 'library'>('cultivation');
const showDialog = ref(false);

const techniqueQuery = ref('');
const masteredQuery = ref('');
const selectedMasteredSkillKey = ref<string | null>(null);

const cultivationSkills = computed((): TechniqueItem | null => {
  const inventory = gameStateStore.inventory?.物品;
  if (!inventory) return null;

  const refId = (gameStateStore as any).cultivationTechnique?.物品ID as string | undefined;
  if (refId && inventory[refId]) {
    return inventory[refId] as TechniqueItem;
  }

  const found = Object.values(inventory).find(item => {
    const type = (item as any)?.类型 || (item as any)?.type;
    const isTechnique = type === '功法' || String(type || '').includes('功法');
    const equipped = (item as any)?.已装备 === true || (item as any)?.修炼中 === true;
    return isTechnique && equipped;
  });
  return (found as TechniqueItem) || null;
});

const allTechniques = computed((): TechniqueItem[] => {
  const inventory = gameStateStore.inventory?.物品;
  if (!inventory) return [];
  return Object.values(inventory).filter((item): item is TechniqueItem => {
    const type = (item as any)?.类型 || (item as any)?.type;
    return type === '功法' || String(type || '').includes('功法');
  });
});

const inventoryTechniques = computed((): TechniqueItem[] => {
  return allTechniques.value.filter(t => !(t as any).已装备 && !(t as any).修炼中);
});

const techniqueTotalCount = computed(() => {
  return allTechniques.value.length;
});

const sortedSkills = computed(() => {
  if (!cultivationSkills.value?.功法技能) return [];
  return [...cultivationSkills.value.功法技能].sort((a, b) =>
    (getTechniqueSkillUnlockAt(a)) - (getTechniqueSkillUnlockAt(b))
  );
});

const allLearnedSkills = computed(() => {
  if (!cultivationSkills.value?.功法技能) return [];
  const unlocked = cultivationSkills.value.已解锁技能 || [];
  return cultivationSkills.value.功法技能.filter(s => unlocked.includes(s.技能名称));
});

const getTechniqueSkillUnlockAt = (skill: TechniqueSkill): number => {
  const raw = (skill.熟练度要求 ?? (skill as any).解锁需要熟练度) as unknown;
  const n = typeof raw === 'number' ? raw : Number(raw || 0);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const isTechniqueSkillUnlocked = (skillName: string): boolean => {
  return cultivationSkills.value?.已解锁技能?.includes(skillName) || false;
};

const getTechniqueSkillUnlockProgress = (skill: TechniqueSkill): number => {
  const currentProgress = cultivationSkills.value?.修炼进度 || 0;
  const requiredProgress = getTechniqueSkillUnlockAt(skill) || 100;
  return Math.min(100, (currentProgress / requiredProgress) * 100);
};

const masteredSkills = computed((): MasteredSkill[] => {
  return (gameStateStore.masteredSkills || []) as MasteredSkill[];
});

const masteredSkillsFiltered = computed(() => {
  const q = masteredQuery.value.trim().toLowerCase();
  if (!q) return masteredSkills.value;
  return masteredSkills.value.filter(s => {
    const hay = `${s.技能名称} ${s.技能描述 || ''} ${s.来源 || ''}`.toLowerCase();
    return hay.includes(q);
  });
});

const selectMasteredSkill = (skill: MasteredSkill) => {
  selectedMasteredSkillKey.value = skill.技能名称 + '::' + (skill.来源 || '');
};

const canBreakthrough = computed(() => {
  if (!cultivationSkills.value) return false;
  return (cultivationSkills.value.修炼进度 || 0) >= 100;
});

const getQualitySpeedBonus = (quality?: string): number => {
  const bonusMap: Record<string, number> = {
    仙: 3.0, 神: 2.5, 圣: 2.0, 天: 1.8, 地: 1.5, 玄: 1.3, 黄: 1.1, 凡: 1.0
  };
  return bonusMap[quality || '凡'] || 1.0;
};

const cultivationSpeed = computed(() => {
  const technique = cultivationSkills.value;
  if (!technique) return '0';
  const baseSpeed = 1;
  const qualityBonus = getQualitySpeedBonus(technique.品质?.quality);
  const effectBonus = technique.功法效果?.修炼速度加成 || 1;
  return (baseSpeed * qualityBonus * effectBonus).toFixed(1);
});

const breakthroughChance = computed(() => {
  if (!canBreakthrough.value) return 0;
  const technique = cultivationSkills.value;
  if (!technique) return 0;
  const qualityChanceMap: Record<string, number> = { 仙: 30, 神: 40, 圣: 50, 天: 60, 地: 70, 玄: 75, 黄: 80, 凡: 85 };
  const baseChance = qualityChanceMap[technique.品质?.quality || '凡'] || 70;
  return Math.min(95, baseChance);
});

const startCultivation = async (type: 'normal' | 'secluded') => {
  if (!cultivationSkills.value) return;

  const { useActionQueueStore } = await import('@/stores/actionQueueStore');
  const actionQueue = useActionQueueStore();

  if (type === 'normal') {
    actionQueue.addAction({
      type: 'cultivate',
      itemName: cultivationSkills.value.名称,
      itemType: t('功法'),
      description: `开始修炼《${cultivationSkills.value.名称}》，提升功法熟练度`,
    });
    uiStore.showToast(`开始修炼《${cultivationSkills.value.名称}》`, { type: 'success' });
  } else {
    actionQueue.addAction({
      type: 'secluded_cultivation',
      itemName: cultivationSkills.value.名称,
      itemType: t('闭关'),
      description: `进入闭关状态，专心修炼《${cultivationSkills.value.名称}》，效率大幅提升`,
    });
    uiStore.showToast(`进入闭关修炼《${cultivationSkills.value.名称}》`, { type: 'info' });
  }
};

const attemptBreakthrough = async () => {
  if (!cultivationSkills.value || !canBreakthrough.value) return;

  const { useActionQueueStore } = await import('@/stores/actionQueueStore');
  const actionQueue = useActionQueueStore();

  actionQueue.addAction({
    type: 'breakthrough',
    itemName: cultivationSkills.value.名称,
    itemType: t('突破'),
    description: `尝试突破《${cultivationSkills.value.名称}》的当前境界，进入更高层次`,
  });
  uiStore.showToast(`尝试突破《${cultivationSkills.value.名称}》`, { type: 'warning' });
};

const techniqueForModal = computed((): TechniqueItem | null => cultivationSkills.value);

const formatProgress = (progress?: number): string => Math.min(100, Math.max(0, progress || 0)).toFixed(1);

const getQualityTextClass = (item: TechniqueItem): string => `text-quality-${item?.品质?.quality || '凡'}`;
const getQualityBorderClass = (item: TechniqueItem): string => `border-quality-${item?.品质?.quality || '凡'}`;
const getQualityBgClass = (item: TechniqueItem): string => `bg-quality-${item?.品质?.quality || '凡'}`;

const isEquipped = (technique: TechniqueItem): boolean => {
  return (technique as any).已装备 === true || (technique as any).修炼中 === true;
};

const getCultivationProgress = (): number => cultivationSkills.value?.修炼进度 || 0;

const equipTechnique = async (technique: TechniqueItem) => {
  if (!technique?.物品ID) return;
  if ((technique as any).已装备 === true || (technique as any).修炼中 === true) return;
  const action = async () => {
    try {
      await characterStore.equipTechnique(technique.物品ID!);
      activeTab.value = 'cultivation';
    } catch (error) {
      console.error('[SkillsPanel] Equip technique failed:', error);
    }
  };

  if (cultivationSkills.value) {
    uiStore.showRetryDialog({
      title: t('切换功法'),
      message: `${t('当前正在修炼')}《${cultivationSkills.value.名称}》，${t('确定要切换到')}《${technique.名称}》${t('吗')}？`,
      onConfirm: action,
      onCancel: () => {},
    });
  } else {
    await action();
  }
};

const enhancedActionQueue = EnhancedActionQueueManager.getInstance();

const unequipSkill = async () => {
  if (!cultivationSkills.value?.物品ID) return;
  const skillToUnequip = cultivationSkills.value;
  uiStore.showRetryDialog({
    title: t('卸下功法'),
    message: `${t('确定要卸下')}《${skillToUnequip.名称}》${t('吗')}？`,
    confirmText: t('确定卸下'),
    cancelText: t('取消'),
    onConfirm: async () => {
      try {
        // 检查是否有正在修炼的功法，且与要卸下的功法匹配
        const cultivatingId = (gameStateStore.cultivation as any)?.修炼功法?.物品ID;
        if (cultivatingId === skillToUnequip.物品ID) {
          // 只有当前正在修炼这个功法时才停止修炼
          await enhancedActionQueue.stopCultivation(skillToUnequip as any);
        }
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
      itemType: t('功法'),
      description: `对《${cultivationSkills.value.名称}》进行${totalDays}天的深度修炼`,
    });
  } catch (error) {
    console.error('[SkillsPanel] Add deep cultivation action failed:', error);
  }
};

const checkAndUnlockSkills = () => {
  if (!cultivationSkills.value) return;
  const technique = cultivationSkills.value;
  if (!technique.功法技能 || !Array.isArray(technique.功法技能)) return;

  const currentProgress = technique.修炼进度 || 0;
  let unlocked = false;

  if (!technique.已解锁技能) technique.已解锁技能 = [];

  technique.功法技能.forEach(skill => {
    const unlockThreshold = skill.熟练度要求 || 0;
    if (currentProgress >= unlockThreshold && !technique.已解锁技能!.includes(skill.技能名称)) {
      technique.已解锁技能!.push(skill.技能名称);
      unlocked = true;
    }
  });

  if (unlocked) characterStore.saveCurrentGame();
};

watch(cultivationSkills, () => {
  checkAndUnlockSkills();
}, { immediate: true });

const filteredInventoryTechniques = computed(() => {
  const q = techniqueQuery.value.trim().toLowerCase();
  const list = allTechniques.value.filter(t => {
    if (!q) return true;
    const name = String(t.名称 || '').toLowerCase();
    const desc = String(t.描述 || '').toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  const qualityRank: Record<string, number> = { 仙: 1, 神: 2, 圣: 3, 道: 4, 天: 5, 地: 6, 玄: 7, 黄: 8, 凡: 9 };
  return [...list].sort((a, b) => {
    const ae = (a as any).已装备 === true || (a as any).修炼中 === true;
    const be = (b as any).已装备 === true || (b as any).修炼中 === true;
    if (ae !== be) return ae ? -1 : 1;
    const qa = qualityRank[a.品质?.quality || '凡'] ?? 99;
    const qb = qualityRank[b.品质?.quality || '凡'] ?? 99;
    if (qa !== qb) return qa - qb;
    return String(a.名称 || '').localeCompare(String(b.名称 || ''), 'zh-Hans-CN');
  });
});
</script>

<style scoped>
.skills-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 16px;
  overflow: hidden;
}

/* 标签页导航 */
.panel-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.panel-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.panel-tab:hover {
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-text);
}

.panel-tab.active {
  background: var(--color-primary);
  color: #fff;
}

.tab-count {
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 12px;
}

.panel-tab:not(.active) .tab-count {
  background: rgba(var(--color-primary-rgb), 0.15);
  color: var(--color-primary);
}

/* 内容区域 */
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  min-height: 0;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text-secondary);
}

.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
}

/* 修炼卡片 */
.cultivation-card {
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.03) 0%, var(--color-surface) 100%);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.cultivation-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.cultivation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.cultivation-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.technique-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.technique-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.technique-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.cultivation-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.action-btn:hover {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.08);
}

.action-btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.action-btn.warning {
  background: rgba(var(--color-warning-rgb), 0.15);
  border-color: var(--color-warning);
  color: var(--color-warning);
}

.action-btn.danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

/* 修炼统计 */
.cultivation-stats {
  display: flex;
  gap: 12px;
  padding: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: rgba(var(--color-primary-rgb), 0.05);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  min-width: 80px;
}

.stat-item.highlight {
  background: rgba(var(--color-warning-rgb), 0.1);
  border-color: rgba(var(--color-warning-rgb), 0.3);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.stat-value.success { color: var(--color-success); }
.stat-value.warning { color: var(--color-warning); }

/* 进度条 */
.progress-bar {
  height: 6px;
  background: rgba(var(--color-primary-rgb), 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), rgba(var(--color-primary-rgb), 0.6));
  transition: width 0.3s;
}

/* 功法技能区域 */
.skills-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
  color: var(--color-text);
}

.section-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  padding: 12px;
}

.skill-card {
  padding: 12px;
  background: rgba(var(--color-primary-rgb), 0.03);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.2s;
}

.skill-card.unlocked {
  background: rgba(var(--color-success-rgb), 0.05);
  border-color: rgba(var(--color-success-rgb), 0.2);
}

.skill-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.skill-name {
  font-weight: 600;
  color: var(--color-text);
}

.skill-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.skill-badge.success {
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success);
}

.skill-badge.locked {
  background: rgba(var(--color-text-secondary-rgb, 128, 128, 128), 0.1);
  color: var(--color-text-secondary);
}

.skill-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0 0 8px 0;
}

.skill-progress {
  margin-top: 8px;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.progress-track {
  height: 4px;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.skill-cost {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-text-secondary);
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.02) 0%, transparent 100%);
  border-radius: 12px;
  border: 1px dashed var(--color-border);
}

.empty-icon {
  opacity: 0.4;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* 掌握技能网格 */
.mastered-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.mastered-card {
  padding: 16px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.mastered-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), rgba(var(--color-primary-rgb), 0.5));
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.mastered-card:hover {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.15);
}

.mastered-card:hover::before {
  transform: scaleX(1);
}

.mastered-card.active {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.08);
  box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.2);
}

.mastered-card.active::before {
  transform: scaleX(1);
}

.mastered-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.mastered-name {
  font-weight: 600;
  color: var(--color-text);
}

.mastered-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success);
}

.mastered-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0 0 10px 0;
}

.mastered-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.meta-tag {
  padding: 2px 8px;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 6px;
  color: var(--color-primary);
}

.meta-stat {
  color: var(--color-text-secondary);
}

/* 品质文本 */
.text-quality-仙 { color: #f59e0b; }
.text-quality-神 { color: #ef4444; }
.text-quality-圣 { color: #a855f7; }
.text-quality-道 { color: #3b82f6; }
.text-quality-天 { color: #22c55e; }
.text-quality-地 { color: #06b6d4; }
.text-quality-玄 { color: #8b5cf6; }
.text-quality-黄 { color: #eab308; }
.text-quality-凡 { color: var(--color-text-secondary); }

/* 品质边框 */
.border-quality-仙 { border-color: rgba(245, 158, 11, 0.4); }
.border-quality-神 { border-color: rgba(239, 68, 68, 0.4); }
.border-quality-圣 { border-color: rgba(168, 85, 247, 0.4); }
.border-quality-道 { border-color: rgba(59, 130, 246, 0.4); }
.border-quality-天 { border-color: rgba(34, 197, 94, 0.4); }
.border-quality-地 { border-color: rgba(6, 182, 212, 0.4); }
.border-quality-玄 { border-color: rgba(139, 92, 246, 0.4); }
.border-quality-黄 { border-color: rgba(234, 179, 8, 0.4); }
.border-quality-凡 { border-color: var(--color-border); }

/* 品质背景 */
.bg-quality-仙 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.bg-quality-神 { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.bg-quality-圣 { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.bg-quality-道 { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.bg-quality-天 { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.bg-quality-地 { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
.bg-quality-玄 { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
.bg-quality-黄 { background: rgba(234, 179, 8, 0.15); color: #eab308; }
.bg-quality-凡 { background: rgba(var(--color-primary-rgb), 0.1); }

/* 功法库网格 */
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.technique-card {
  padding: 16px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.technique-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), rgba(var(--color-primary-rgb), 0.5));
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.technique-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.technique-card:hover::before {
  transform: scaleX(1);
}

.technique-card.active {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.technique-card.equipped {
  border-color: var(--color-success);
  background: linear-gradient(135deg, rgba(var(--color-success-rgb), 0.05) 0%, var(--color-surface) 100%);
  box-shadow: 0 4px 16px rgba(var(--color-success-rgb), 0.15);
}

.technique-card.equipped::before {
  background: linear-gradient(90deg, var(--color-success), rgba(var(--color-success-rgb), 0.5));
  transform: scaleX(1);
}

.technique-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.technique-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.technique-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.quality-tag {
  font-size: 12px;
  font-weight: 600;
}

.skill-count {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.equipped-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success);
}

.technique-actions {
  display: flex;
  justify-content: flex-end;
}

.tech-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tech-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tech-btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.tech-btn.primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

/* 响应式 */
@media (max-width: 768px) {
  .panel-tabs {
    flex-wrap: wrap;
  }

  .cultivation-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .cultivation-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .cultivation-stats {
    flex-direction: column;
  }

  .stat-item {
    width: 100%;
  }
}
</style>
