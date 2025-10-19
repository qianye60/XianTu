<template>
  <div class="skills-content">
    <!-- 左侧：当前修炼+功法库 -->
    <div class="skills-main">
      <!-- 当前修炼功法槽位 -->
      <div class="current-technique-section">
        <h3 class="section-header">
          <span class="header-icon">⚡</span>
          <span class="header-text">当前修炼</span>
        </h3>
        <div
          class="current-technique-slot"
          :class="{ 'has-technique': cultivationSkills }"
          @click="cultivationSkills && selectSkill(cultivationSkills, '功法')"
        >
          <div v-if="cultivationSkills" class="technique-content">
            <div class="technique-icon-wrapper" :class="getSkillQualityClass(cultivationSkills)">
              <span class="technique-icon-text">功</span>
            </div>
            <div class="technique-info">
              <div class="technique-name" :class="getSkillQualityClass(cultivationSkills, 'text')">
                {{ cultivationSkills.名称 }}
              </div>
              <div class="technique-quality">
                {{ cultivationSkills.品质?.quality || '凡' }}品
                <span
                  v-if="cultivationSkills.品质?.grade !== undefined"
                  class="grade-display"
                  :class="getGradeClass(cultivationSkills.品质.grade)"
                >
                  {{ getGradeText(cultivationSkills.品质.grade) }}({{ cultivationSkills.品质.grade }})
                </span>
              </div>
              <div class="technique-progress">
                <div class="progress-bar-wrapper">
                  <ProgressBar
                    v-bind="{
                      value: Math.min(100, Math.max(0, cultivationSkills.修炼进度 || 0)),
                      max: 100,
                      size: 'sm',
                      showLabel: false
                    }"
                  />
                </div>
                <span class="progress-text">{{ Math.min(100, Math.max(0, cultivationSkills.修炼进度 || 0)).toFixed(1) }}/100</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-slot-placeholder">
            <div class="empty-icon">📜</div>
            <span class="empty-text">未修炼功法</span>
            <span class="empty-hint">从下方功法库选择装备</span>
          </div>
        </div>
      </div>

      <div class="skills-and-library-grid">
        <div class="skills-column">
          <!-- 未掌握技能列表 -->
          <div v-if="unmasteredSkills.length > 0" class="unmastered-skills-section">
            <h3 class="section-header">
              <span class="header-icon">🔒</span>
              <span class="header-text">未掌握技能</span>
              <span class="count-badge">{{ unmasteredSkills.length }}</span>
            </h3>
            <div class="unmastered-skills-grid">
              <div
                v-for="skill in unmasteredSkills"
                :key="skill.技能名称"
                class="unmastered-skill-card"
              >
                <div class="skill-card-icon">🔒</div>
                <div class="skill-card-body">
                  <div class="skill-card-name">{{ skill.技能名称 }}</div>
                  <div class="skill-card-source">
                    当前: {{ (cultivationSkills?.修炼进度 || 0).toFixed(1) }}% / 需要: {{ skill.解锁需要熟练度 }}%
                  </div>
                  <div class="skill-card-progress">
                    <div class="skill-progress-bar">
                      <div
                        class="skill-progress-fill"
                        :style="{ width: Math.min(100, ((cultivationSkills?.修炼进度 || 0) / skill.解锁需要熟练度) * 100) + '%' }"
                      ></div>
                    </div>
                  </div>
                  <div class="skill-card-desc">{{ truncateText(skill.技能描述, 60) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 已学技能列表 -->
          <div class="learned-skills-section">
            <h3 class="section-header">
              <span class="header-icon">⚔️</span>
              <span class="header-text">已学技能</span>
              <span class="count-badge">{{ allLearnedSkills.length }}</span>
            </h3>

            <div v-if="allLearnedSkills.length === 0" class="empty-library">
              <div class="empty-icon">📖</div>
              <div class="empty-text">暂无已学技能</div>
              <div class="empty-hint">修炼功法解锁技能</div>
            </div>

            <div v-else class="learned-skills-grid">
              <div
                v-for="skill in allLearnedSkills"
                :key="skill.技能名称"
                class="learned-skill-card"
              >
                <div class="skill-card-icon">⚡</div>
                <div class="skill-card-body">
                  <div class="skill-card-name">{{ skill.技能名称 }}</div>
                  <div class="skill-card-source">来源: {{ skill.来源功法 }}</div>
                  <div class="skill-card-desc">{{ truncateText(skill.技能描述, 60) }}</div>
                  <div v-if="skill.消耗" class="skill-card-cost">消耗: {{ skill.消耗 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 功法库列表 -->
        <div
          class="technique-library-section"
        :class="{ 'is-mobile': isMobile, 'is-open': showMobileLibrary }"
      >
        <h3 class="section-header">
          <span class="header-icon">📚</span>
          <span class="header-text">功法库</span>
          <span class="count-badge">{{ inventoryTechniques.length }}</span>
        </h3>
        <button
          v-if="isMobile"
          type="button"
          class="mobile-library-close"
          @click="showMobileLibrary = false"
        >
          收起
        </button>

        <div v-if="inventoryTechniques.length === 0" class="empty-library">
          <div class="empty-icon">📦</div>
          <div class="empty-text">功法库为空</div>
          <div class="empty-hint">从世界中获取功法秘籍</div>
        </div>

        <div v-else class="technique-grid">
          <div
            v-for="technique in inventoryTechniques"
            :key="technique.物品ID"
            class="technique-card"
            :class="[
              getSkillQualityClass(technique),
              { 'selected': selectedSkillData === technique }
            ]"
            @click="selectSkill(technique, '背包功法')"
          >
            <div class="card-icon" :class="getSkillQualityClass(technique)">
              <span class="icon-text">功</span>
            </div>
            <div class="card-body">
              <div class="card-title" :class="getSkillQualityClass(technique, 'text')">
                {{ technique.名称 }}
              </div>
              <div class="card-quality">
                {{ technique.品质?.quality || '凡' }}品
                <span
                  v-if="technique.品质?.grade !== undefined"
                  class="grade-display"
                  :class="getGradeClass(technique.品质.grade)"
                >
                  {{ getGradeText(technique.品质.grade) }}({{ technique.品质.grade }})
                </span>
              </div>
              <div v-if="technique.描述" class="card-desc">
                {{ truncateText(technique.描述, 50) }}
              </div>
            </div>
          </div>
          </div>
      </div>
    </div>

    <!-- 功法详情底部面板 -->
    <button
      v-if="isMobile"
      type="button"
      class="mobile-library-toggle"
      :disabled="showMobileLibrary"
      @click="showMobileLibrary = true"
    >
      <span class="toggle-icon">📚</span>
      <span>功法库 ({{ inventoryTechniques.length }})</span>
    </button>

    <div class="skill-details-bottom" :class="{ 'no-selection': !selectedSkillData }">
      <div v-if="selectedSkillData" class="skill-details-content">
        <!-- 顶部信息卡片 -->
        <div class="details-card" :class="getSkillQualityClass(selectedSkillData)">
          <div class="card-bg-glow"></div>
          <div class="card-header">
            <div class="details-icon-large" :class="getSkillQualityClass(selectedSkillData)">
              <span class="skill-type-text-large">{{ getSkillTypeIcon(selectedSkillSlot) }}</span>
            </div>
            <div class="details-title-area">
              <h3 :class="getSkillQualityClass(selectedSkillData, 'text')">{{ selectedSkillData.名称 }}</h3>
              <div class="details-meta">
                <span class="meta-tag type-tag">{{ selectedSkillSlot }}</span>
                <span class="meta-tag quality-tag" :class="getSkillQualityClass(selectedSkillData, 'text')">
                  {{ selectedSkillData.品质?.quality || '凡' }}品
                </span>
                <span
                  v-if="selectedSkillData.品质?.grade !== undefined"
                  class="grade-display"
                  :class="getGradeClass(selectedSkillData.品质.grade)"
                >
                  {{ getGradeText(selectedSkillData.品质.grade) }}({{ selectedSkillData.品质.grade }})
                </span>
              </div>
            </div>
          </div>
          <p class="details-description">{{ selectedSkillData.描述 }}</p>
        </div>

        <!-- 标签页导航 -->
        <div class="details-tabs">
          <button class="tab-btn" :class="{ active: activeTab === 'effects' }" @click="activeTab = 'effects'">功法效果</button>
          <button class="tab-btn" :class="{ active: activeTab === 'skills' }" @click="activeTab = 'skills'">功法技能</button>
        </div>

        <!-- 标签页内容 -->
        <div class="details-body">
          <!-- 功法效果 -->
          <div v-if="activeTab === 'effects'" class="tab-content">
            <div v-if="selectedSkillData.功法效果" class="skill-effects-section">
              <div class="effect-details">
                <div v-if="selectedSkillData.功法效果.修炼速度加成" class="effect-item">
                  <span class="effect-label">修炼速度</span>
                  <span class="effect-value">{{ cultivationSpeedBonusText }}</span>
                </div>
                <div v-if="selectedSkillData.功法效果.属性加成" class="effect-item">
                  <span class="effect-label">属性加成</span>
                  <span class="effect-value">{{ formatAttributeBonus(selectedSkillData.功法效果.属性加成) }}</span>
                </div>
                <div v-if="selectedSkillData.功法效果.特殊能力?.length" class="effect-item">
                  <span class="effect-label">特殊能力</span>
                  <div class="special-abilities">
                    <span v-for="ability in selectedSkillData.功法效果.特殊能力" :key="ability" class="ability-tag">
                      {{ ability }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-tab">此功法无特殊效果</div>
          </div>

          <!-- 功法技能 -->
          <div v-if="activeTab === 'skills'" class="tab-content">
            <div v-if="selectedSkillData.功法技能?.length" class="technique-skills-section">
              <div class="skills-list">
                <div v-for="(skill, index) in selectedSkillData.功法技能" :key="index" class="skill-item">
                  <div class="skill-header">
                    <span class="skill-name">{{ skill.技能名称 }}</span>
                    <div v-if="unlockedSkillsMap.has(skill.技能名称)" class="skill-status unlocked">已掌握</div>
                    <div v-else class="skill-status locked">未掌握</div>
                  </div>
                  <div class="skill-description">{{ skill.技能描述 }}</div>
                  <div v-if="skill.解锁需要熟练度" class="skill-unlock-condition">
                    解锁条件：修炼进度 {{ skill.解锁需要熟练度 }}%
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-tab">此功法无附加技能</div>
          </div>
        </div>

        <!-- 底部操作按钮 -->
        <div class="details-actions">
          <button v-if="selectedSkillSlot === '功法'" class="action-btn cultivate-btn" @click="showCultivationDialog">深度修炼</button>
          <button v-if="selectedSkillSlot === '功法'" class="action-btn unequip-btn" @click="unequipSkill">卸下</button>
          <button v-if="selectedSkillSlot === '背包功法'" class="action-btn equip-btn" @click="equipTechnique">装备</button>
        </div>
      </div>
      <div v-else class="details-placeholder">
        <div class="placeholder-icon">📜</div>
        <p>选择一部功法</p>
        <span class="placeholder-tip">点击功法卡片查看详情</span>
      </div>
    </div>

    <div
      v-if="isMobile && showMobileLibrary"
      class="mobile-library-backdrop"
      @click="showMobileLibrary = false"
    ></div>

      <!-- 深度修炼对话框 -->
      <DeepCultivationModal
        :visible="showDialog"
        :technique="techniqueForModal"
        :current-progress="getCultivationProgress()"
        @close="closeDialog"
        @confirm="handleCultivationConfirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useUIStore } from '@/stores/uiStore';
import ProgressBar from '@/components/common/ProgressBar.vue';
import DeepCultivationModal from '@/components/common/DeepCultivationModal.vue';
import type { Item, TechniqueItem } from '@/types/game';

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();
const uiStore = useUIStore();
const selectedSkillData = ref<TechniqueItem | null>(null);
const selectedSkillSlot = ref<string>('');
const activeTab = ref('effects'); // 新增：控制标签页显示
const showMobileLibrary = ref(false);
const isMobile = ref(false);

const updateIsMobile = () => {
  if (typeof window === 'undefined') {
    return;
  }
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) {
    showMobileLibrary.value = false;
  }
};

onMounted(() => {
  updateIsMobile();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateIsMobile);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateIsMobile);
  }
});

// 深度修炼对话框状态
const showDialog = ref(false);

// 为模态框创建一个类型安全的计算属性
const techniqueForModal = computed((): TechniqueItem | null => {
  if (selectedSkillData.value && selectedSkillData.value.类型 === '功法') {
    return selectedSkillData.value as TechniqueItem;
  }
  return null;
});

// 获取当前修炼进度
const getCultivationProgress = (): number => {
  return cultivationSkills.value?.修炼进度 || 0;
};

// 修炼功法数据 - 从背包查找已装备的功法
const cultivationSkills = computed((): TechniqueItem | null => {
  const inventory = gameStateStore.inventory;
  if (!inventory) return null;

  const cultivatingTechnique = Object.values(inventory).find(
    item => item?.类型 === '功法' && item?.已装备 === true
  );

  return (cultivatingTechnique as TechniqueItem) || null;
});

// 背包中的功法物品 - 排除已装备的
const inventoryTechniques = computed((): TechniqueItem[] => {
  const inventory = gameStateStore.inventory;
  if (!inventory) return [];

  return Object.values(inventory).filter((item): item is TechniqueItem =>
    item?.类型 === '功法' && !item.已装备
  );
});

// 计算所有已学技能（从已解锁技能列表读取）
const allLearnedSkills = computed(() => {
  const skills: Array<{
    技能名称: string;
    技能描述: string;
    消耗?: string;
    来源功法: string;
    解锁需要熟练度: number;
  }> = [];

  if (!cultivationSkills.value) return skills;

  const unlockedSkillNames = cultivationSkills.value.已解锁技能 || [];
  const techniqueSkills = cultivationSkills.value.功法技能;

  if (!Array.isArray(techniqueSkills)) return skills;

  // ✅ 从已解锁技能列表中获取技能详情
  techniqueSkills.forEach((skill: { 技能名称: string; 技能描述: string; 消耗?: string; 解锁需要熟练度?: number }) => {
    if (unlockedSkillNames.includes(skill.技能名称)) {
      skills.push({
        技能名称: skill.技能名称,
        技能描述: skill.技能描述,
        消耗: skill.消耗,
        来源功法: cultivationSkills.value!.名称,
        解锁需要熟练度: skill.解锁需要熟练度 || 0
      });
    }
  });

  return skills;
});

// 计算所有未掌握技能（排除已解锁的技能）
const unmasteredSkills = computed(() => {
  const skills: Array<{
    技能名称: string;
    技能描述: string;
    消耗?: string;
    来源功法: string;
    解锁需要熟练度: number;
  }> = [];

  if (!cultivationSkills.value) return skills;

  const unlockedSkillNames = cultivationSkills.value.已解锁技能 || [];
  const techniqueSkills = cultivationSkills.value.功法技能;

  if (!Array.isArray(techniqueSkills)) return skills;

  // ✅ 筛选出未在已解锁列表中的技能
  techniqueSkills.forEach((skill: { 技能名称: string; 技能描述: string; 消耗?: string; 解锁需要熟练度?: number }) => {
    if (!unlockedSkillNames.includes(skill.技能名称)) {
      skills.push({
        技能名称: skill.技能名称,
        技能描述: skill.技能描述,
        消耗: skill.消耗,
        来源功法: cultivationSkills.value!.名称,
        解锁需要熟练度: skill.解锁需要熟练度 || 0
      });
    }
  });

  return skills;
});

// 截断文本
const truncateText = (text?: string, maxLength: number = 50): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// 选择技能
const selectSkill = (skill: TechniqueItem, slotName: string) => {
  selectedSkillData.value = skill;
  selectedSkillSlot.value = slotName;
  if (isMobile.value) {
    showMobileLibrary.value = false;
  }
};

// 获取功法品质样式类
const getSkillQualityClass = (skill: unknown, type: 'border' | 'text' = 'border'): string => {
  if (!skill) return '';
  const typedSkill = skill as { 品质?: { quality?: string } };
  const quality = typedSkill.品质?.quality || '凡';
  return `${type}-quality-${quality}`;
};

// 获取品级文本显示
const getGradeText = (grade: number): string => {
  if (grade === 0) return '残缺'
  if (grade >= 1 && grade <= 3) return '下品'
  if (grade >= 4 && grade <= 6) return '中品'
  if (grade >= 7 && grade <= 9) return '上品'
  if (grade === 10) return '极品'
  return '未知'
}

// 获取品级样式
const getGradeClass = (grade: number): string => {
  if (grade === 0) return 'grade-broken'
  if (grade >= 1 && grade <= 3) return 'grade-low'
  if (grade >= 4 && grade <= 6) return 'grade-mid'
  if (grade >= 7 && grade <= 9) return 'grade-high'
  if (grade === 10) return 'grade-perfect'
  return 'grade-unknown'
}

// 获取功法类型图标
const getSkillTypeIcon = (slotName: string): string => {
  if (slotName === '功法') return '功';
  return '技';
};

// 格式化属性加成
const formatAttributeBonus = (bonus: unknown): string => {
  if (!bonus || typeof bonus !== 'object') {
    return '无';
  }

  const bonusArray = Object.entries(bonus as Record<string, unknown>).map(([key, value]) => `${key}+${value}`);
  return bonusArray.join('、') || '无';
};

// 计算已解锁技能的 Set，优化查询性能
const unlockedSkillsMap = computed(() => {
  // BUG修复：直接从存档的 `已解锁技能` 数组生成Set，而不是动态计算
  // 这是确保技能状态持久化且唯一的关键
  if (cultivationSkills.value && Array.isArray(cultivationSkills.value.已解锁技能)) {
    return new Set(cultivationSkills.value.已解锁技能);
  }
  return new Set<string>();
});

// 新增：计算修炼速度加成文本，并修复逻辑错误
const cultivationSpeedBonusText = computed(() => {
  const technique = selectedSkillData.value;
  if (!technique?.功法效果?.修炼速度加成) return '无';

  const bonus = technique.功法效果.修炼速度加成;
  if (typeof bonus === 'number') {
    const percentage = (bonus - 1) * 100;
    if (Math.abs(percentage) < 1) return '无'; // 忽略可忽略的值
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(0)}%`;
  }
  return '无';
});

// 显示修炼对话框
const showCultivationDialog = () => {
  if (!selectedSkillData.value || !selectedSkillSlot.value) {
    return;
  }
  showDialog.value = true;
};

// 关闭对话框
const closeDialog = () => {
  showDialog.value = false;
};

// 处理深度修炼确认
const handleCultivationConfirm = async (totalDays: number) => {
  showDialog.value = false;

  if (!selectedSkillData.value) {
    return;
  }

  await startCultivation(totalDays);
};

// 开始修炼 - 添加到动作队列,不直接修改进度
const startCultivation = async (totalDays: number) => {
  if (totalDays <= 0 || !selectedSkillData.value) {
    return;
  }

  try {
    const skillData = selectedSkillData.value as Item;
    console.log(`[技能面板] 添加${totalDays}天深度修炼动作:`, skillData.名称);

    // 添加到动作队列
    const { useActionQueueStore } = await import('@/stores/actionQueueStore');
    const actionQueue = useActionQueueStore();

    actionQueue.addAction({
      type: 'cultivate',
      itemName: skillData.名称,
      itemType: '功法',
      description: `对《${skillData.名称}》进行${totalDays}天的深度修炼`
    });

    console.log(`[技能面板] ${totalDays}天深度修炼已添加到动作队列`);

    closeDialog();

  } catch (error) {
    console.error('[技能面板] 添加深度修炼动作失败:', error);
  }
};

// 卸下功法
const unequipSkill = async () => {
  if (!cultivationSkills.value?.物品ID) return;

  const skillToUnequip = cultivationSkills.value;

  uiStore.showRetryDialog({
    title: '卸下功法',
    message: `确定要卸下《${skillToUnequip.名称}》吗？`,
    confirmText: '确认卸下',
    cancelText: '取消',
    onConfirm: async () => {
      try {
        await characterStore.unequipTechnique(skillToUnequip.物品ID!);
        console.log('[技能面板] 功法卸下成功');
        selectedSkillData.value = null;
        selectedSkillSlot.value = '';
      } catch (error) {
        console.error('[技能面板] 卸下失败:', error);
      }
    },
    onCancel: () => {}
  });
};

// 装备背包中的功法
const equipTechnique = async () => {
  if (!selectedSkillData.value?.物品ID || selectedSkillSlot.value !== '背包功法') return;

  const techniqueToEquip = selectedSkillData.value;

  const equipAction = async () => {
    try {
      await characterStore.equipTechnique(techniqueToEquip.物品ID!);
      console.log('[技能面板] 功法装备成功:', techniqueToEquip.名称);
      selectedSkillData.value = techniqueToEquip;
      selectedSkillSlot.value = '功法';
    } catch (error) {
      console.error('[技能面板] 装备功法失败:', error);
    }
  };

  if (cultivationSkills.value) {
    uiStore.showRetryDialog({
      title: '切换功法',
      message: `当前正在修炼《${cultivationSkills.value.名称}》，确定要切换到《${techniqueToEquip.名称}》吗？`,
      confirmText: '确认切换',
      cancelText: '取消',
      onConfirm: equipAction,
      onCancel: () => {}
    });
  } else {
    await equipAction();
  }
};

// 监听修炼功法变化,自动选中
watch(cultivationSkills, (newValue) => {
  // 如果当前没有选中任何功法,或者选中的功法已经不是正在修炼的功法,则自动选中当前修炼的功法
  if (newValue && (!selectedSkillData.value || selectedSkillSlot.value !== '功法')) {
    selectedSkillData.value = newValue;
    selectedSkillSlot.value = '功法';
  } else if (!newValue && selectedSkillSlot.value === '功法') {
    // 如果取消了修炼,清空选中
    selectedSkillData.value = null;
    selectedSkillSlot.value = '';
  }
}, { immediate: true }); // immediate: true 确保初始化时也执行

</script>

<style scoped>
.skills-content {
  width: 100%;
  height: 100%;
  flex: 1;
  gap: 0;
  background: var(--color-background);
  overflow-y: auto;
}

/* 左侧：当前修炼+功法库 */
.skills-main {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 24px;
  gap: 24px;
}

.skills-and-library-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
  gap: 20px;
  align-items: flex-start;
}

@media (max-width: 1200px) {
  .skills-and-library-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.skills-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}


.current-technique-section,
.technique-library-section {
  display: flex;
  flex-direction: column;
}

/* 区块标题 */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-border);
}

.header-icon {
  font-size: 1.2rem;
}

.header-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.count-badge {
  margin-left: auto;
  padding: 2px 10px;
  background: var(--color-primary);
  color: white;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

/* 当前修炼槽位 */
.current-technique-slot {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  min-height: 120px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.current-technique-slot::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.current-technique-slot.has-technique {
  cursor: pointer;
  border-color: var(--color-success);
  background: linear-gradient(135deg, rgba(var(--color-success-rgb), 0.05) 0%, var(--color-surface) 100%);
}

.current-technique-slot.has-technique::before {
  opacity: 0.6;
  background: linear-gradient(90deg, transparent, var(--color-success), transparent);
}

.current-technique-slot.has-technique:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(var(--color-success-rgb), 0.3);
}

.current-technique-slot.has-technique:hover::before {
  opacity: 1;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
}

.technique-content {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.technique-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  border: 3px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-light);
  flex-shrink: 0;
}

.technique-icon-text {
  font-size: 28px;
  font-weight: bold;
  color: var(--color-text);
}

.technique-info {
  flex: 1;
}

.technique-name {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.technique-quality {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.technique-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar-wrapper {
  flex: 1;
}

.progress-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 45px;
  text-align: right;
}

/* 空槽位占位符 */
.empty-slot-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
  gap: 8px;
  padding: 20px;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.empty-text {
  font-size: 1rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.empty-hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

/* 已学技能区域 */
.learned-skills-section {
  display: flex;
  flex-direction: column;
}

.learned-skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 8px;
}

.learned-skill-card {
  background: linear-gradient(135deg, rgba(var(--color-success-rgb), 0.08) 0%, var(--color-surface) 100%);
  border: 2px solid var(--color-success);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  gap: 10px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.learned-skill-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--color-success), transparent);
  opacity: 0.6;
}

.learned-skill-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(var(--color-success-rgb), 0.25);
}

.skill-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--color-success), var(--color-info));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.skill-card-body {
  flex: 1;
  min-width: 0;
}

.skill-card-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-card-source {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.skill-card-desc {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.skill-card-cost {
  font-size: 0.7rem;
  color: var(--color-info);
  font-weight: 500;
}

/* 未掌握技能区域 */
.unmastered-skills-section {
  display: flex;
  flex-direction: column;
}

.unmastered-skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 8px;
}

.unmastered-skill-card {
  background: linear-gradient(135deg, rgba(var(--color-warning-rgb), 0.05) 0%, var(--color-surface) 100%);
  border: 2px dashed var(--color-warning);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  gap: 10px;
  opacity: 0.8;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.unmastered-skill-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-warning), transparent);
  opacity: 0.5;
}

.unmastered-skill-card:hover {
  opacity: 1;
  border-color: var(--color-info);
  border-style: solid;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-warning-rgb), 0.2);
}

.unmastered-skill-card .skill-card-icon {
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.unmastered-skill-card .skill-card-body {
  flex: 1;
  min-width: 0;
}

.unmastered-skill-card .skill-card-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unmastered-skill-card .skill-card-source {
  font-size: 0.75rem;
  color: var(--color-warning);
  margin-bottom: 4px;
  font-weight: 500;
}

.unmastered-skill-card .skill-card-progress {
  margin: 6px 0;
}

.unmastered-skill-card .skill-progress-bar {
  width: 100%;
  height: 6px;
  background: var(--color-surface-light);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.unmastered-skill-card .skill-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-info), var(--color-primary));
  transition: width 0.3s ease;
  border-radius: 2px;
}

.unmastered-skill-card .skill-card-desc {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 功法库区域 */
.technique-library-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-library-backdrop {
  display: none;
}

.empty-library {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  gap: 12px;
}

.empty-library .empty-icon {
  font-size: 4rem;
  opacity: 0.4;
}

.empty-library .empty-text {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}

.empty-library .empty-hint {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

/* 功法卡片网格 */
.technique-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  overflow-y: auto;
  padding-right: 8px;
}

@media (min-width: 1400px) {
  .technique-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

.mobile-library-close,
.mobile-library-toggle {
  display: none;
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mobile-library-close {
  align-self: flex-end;
  color: var(--color-text-secondary);
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
}

.mobile-library-close:hover {
  color: var(--color-text);
  border-color: var(--color-text-secondary);
}

.mobile-library-toggle {
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 12px 20px;
  font-weight: 600;
  background: var(--color-primary);
  color: #ffffff;
  box-shadow: 0 12px 20px rgba(var(--color-primary-rgb), 0.3);
  position: fixed;
  right: 24px;
  bottom: 32px;
  z-index: 1200;
}

.mobile-library-toggle .toggle-icon {
  font-size: 1.2rem;
}

.mobile-library-toggle:disabled {
  opacity: 0.7;
  cursor: default;
}

.mobile-library-toggle:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 24px rgba(var(--color-primary-rgb), 0.35);
}

.technique-card {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.technique-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.technique-card:hover::before {
  opacity: 1;
}

.technique-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(var(--color-primary-rgb), 0.15);
}

.technique-card.selected {
  border-color: var(--color-accent);
  background: linear-gradient(135deg, var(--color-surface-hover) 0%, var(--color-surface) 100%);
  box-shadow: 0 4px 16px rgba(var(--color-accent-rgb), 0.25);
}

.technique-card.selected::before {
  opacity: 1;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  border: 3px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-light);
  flex-shrink: 0;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.icon-text {
  font-size: 24px;
  font-weight: bold;
  color: var(--color-text);
}

.card-body {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-quality {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.card-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: left;
}



/* 技能槽位 */
.skill-slot {
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 80px;
  display: flex;
  align-items: center;
}

.skill-slot:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2);
}

.skill-slot.has-skill {
  border-color: var(--color-success);
  background: rgba(var(--color-success-rgb), 0.05);
}

/* 技能信息 */
.skill-info {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.skill-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  flex-shrink: 0;
  font-weight: bold;
  color: var(--color-text);
}

.skill-type-text {
  font-size: 18px;
  font-weight: bold;
}

.skill-details {
  flex: 1;
  min-width: 0;
}

.skill-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 进度条 */
.skill-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-flex {
  flex: 1;
}

.legacy-progress-bar {
  flex: 1;
  height: 8px; /* 增加高度 */
  background: #e2e8f0; /* 更明显的背景色 */
  border: 1px solid #cbd5e1; /* 添加边框 */
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); /* 添加轻微阴影 */
}

.legacy-progress-fill {
  height: 100%;
  min-width: 1px; /* 确保最小可见宽度 */
  background: linear-gradient(90deg, #22c55e, #3b82f6); /* 明确的颜色 */
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  min-width: 35px;
}

/* 空槽位 */
.empty-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-text-secondary);
  width: 100%;
  gap: 8px;
}

.empty-icon {
  font-size: 2rem;
  opacity: 0.5;
  margin-bottom: 4px;
}

/* 详情底部面板 */
.skill-details-bottom {
  width: 100%;
  border-top: 2px solid var(--color-border);
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  min-height: 300px;
}

.skill-details-bottom.no-selection {
  background: var(--color-surface);
  min-height: 200px;
}

.skill-details-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px; /* 统一内边距 */
  gap: 16px; /* 模块间距 */
}

/* 新增：顶部信息卡片 */
.details-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.card-bg-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.1) 0%, transparent 40%);
  animation: rotate-glow 10s linear infinite;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.details-card:hover .card-bg-glow {
  opacity: 1;
}

@keyframes rotate-glow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.details-icon-large {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  flex-shrink: 0;
  font-weight: bold;
}

.skill-type-text-large {
  font-size: 24px;
  font-weight: bold;
}

.details-title-area h3 {
  margin: 0;
  font-size: 1.2rem; /* 增大字体 */
  font-weight: 700; /* 加粗 */
}

.details-meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.meta-tag {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
}

.meta-tag.quality-tag {
  background: rgba(var(--quality-color-rgb), 0.1);
  border-color: rgba(var(--quality-color-rgb), 0.3);
  color: var(--quality-color);
}

.text-quality-神 { --quality-color-rgb: 239, 68, 68; --quality-color: #ef4444; }
.text-quality-仙 { --quality-color-rgb: 245, 158, 11; --quality-color: #f59e0b; }
.text-quality-天 { --quality-color-rgb: 139, 92, 246; --quality-color: #8b5cf6; }
.text-quality-地 { --quality-color-rgb: 59, 130, 246; --quality-color: #3b82f6; }
.text-quality-人 { --quality-color-rgb: 16, 185, 129; --quality-color: #10b981; }
.text-quality-凡 { --quality-color-rgb: 107, 114, 128; --quality-color: #6b7280; }


.details-description {
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-size: 0.85rem;
  margin: 0;
}

/* 新增：标签页系统 */
.details-tabs {
  display: flex;
  background: var(--color-surface);
  border-radius: 8px;
  padding: 4px;
  border: 1px solid var(--color-border);
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.3);
}

.tab-btn:not(.active):hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.details-body {
  flex: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.empty-tab {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 24px;
  font-style: italic;
}

/* 修炼概览 */
.overview-section h4,
.technique-level-section h4,
.cultivation-progress-section h4,
.skill-effects-section h4,
.technique-skills-section h4,
.unlocked-skills-section h4,
.cultivation-time-input h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  margin-bottom: 16px;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.overview-item .label {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  min-width: 72px;
}

.overview-item .value {
  color: var(--color-text);
  font-weight: 600;
}

.overview-item .with-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.overview-item .with-bar .num {
  min-width: 40px;
  color: var(--color-success);
  font-weight: 600;
}

/* 修炼进度部分 */
.cultivation-progress-section {
  margin-bottom: 20px;
}


.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-container .progress {
  background: var(--color-background) !important;
  border: 2px solid var(--color-primary) !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
  min-width: 200px;
}

.legacy-progress-bar-large {
  flex: 1;
  height: 16px; /* 增加高度让大进度条更明显 */
  background: #e2e8f0; /* 更明显的背景色 */
  border: 1px solid #cbd5e1; /* 添加边框 */
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); /* 添加更明显的内阴影 */
}

.progress-percentage {
  font-weight: 600;
  color: var(--color-success);
  min-width: 40px;
}

/* 功法效果部分 */

.effect-text {
  background: var(--color-background);
  border-radius: 6px;
  padding: 12px;
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.4;
  word-break: break-all;
}

/* 占位符 */
.details-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 40px 20px;
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.placeholder-tip {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 8px;
  opacity: 0.8;
}

.details-actions {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-hover);
  color: var(--color-text);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.action-btn:hover {
  transform: translateY(-1px);
}

/* 品级样式 */
.grade-display {
  font-size: 0.8rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid currentColor;
  white-space: nowrap;
}

.grade-broken { background: #6b7280; color: white; border-color: #6b7280; }
.grade-low { background: #10b981; color: white; border-color: #10b981; }
.grade-mid { background: #3b82f6; color: white; border-color: #3b82f6; }
.grade-high { background: #8b5cf6; color: white; border-color: #8b5cf6; }
.grade-perfect { background: #f59e0b; color: white; border-color: #f59e0b; }
.grade-unknown { background: #9ca3af; color: white; border-color: #9ca3af; }

.cultivate-btn {
  background: var(--color-info);
  border-color: var(--color-info);
  color: white;
}

.cultivate-btn:hover {
  background: var(--color-info-hover);
}

.unequip-btn {
  background: var(--color-warning);
  border-color: var(--color-warning);
  color: white;
}

.unequip-btn:hover {
  background: var(--color-warning-hover);
}

/* 品质样式 */
.border-quality-神 { border-color: #ef4444 !important; }
.border-quality-仙 { border-color: #f59e0b !important; }
.border-quality-天 { border-color: #8b5cf6 !important; }
.border-quality-地 { border-color: #3b82f6 !important; }
.border-quality-人 { border-color: #10b981 !important; }
.border-quality-凡 { border-color: var(--color-border) !important; }

.text-quality-神 { color: #ef4444 !important; }
.text-quality-仙 { color: #f59e0b !important; }
.text-quality-天 { color: #8b5cf6 !important; }
.text-quality-地 { color: #3b82f6 !important; }
.text-quality-人 { color: #10b981 !important; }
.text-quality-凡 { color: var(--color-text) !important; }

/* 功法等级显示 */
.technique-level-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.quality-display {
  font-weight: 600;
  font-size: 1.1rem;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--color-surface-light);
  text-align: center;
  border: 2px solid transparent;
}

.quality-display.text-quality-神 {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.quality-display.text-quality-仙 {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
}

.quality-display.text-quality-天 {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
}

.quality-display.text-quality-地 {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.quality-display.text-quality-人 {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

/* 熟练度信息 */
.proficiency-info {
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--color-info);
  font-weight: 500;
}

/* 功法效果详情 */
.effect-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.effect-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.effect-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 80px;
}

.effect-value {
  color: var(--color-success);
  font-weight: 500;
}

.special-abilities {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ability-tag {
  background: var(--color-info);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

/* 功法技能列表 */

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skill-item {
  background: var(--color-background);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.skill-item:hover {
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.skill-name {
  font-weight: 600;
  color: var(--color-text);
}

.skill-type {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.type-攻击 { background: #fee2e2; color: #dc2626; }
.type-防御 { background: #dbeafe; color: #2563eb; }
.type-辅助 { background: #ecfccb; color: #65a30d; }
.type-移动 { background: #fef3c7; color: #d97706; }
.type-其他 { background: #f3f4f6; color: #6b7280; }

.skill-description {
  font-size: 0.8rem;
  color: var(--color-text);
  line-height: 1.4;
  margin-bottom: 6px;
}

.skill-unlock {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.skill-status {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.skill-status.unlocked {
  background: #dcfce7;
  color: #16a34a;
}

.skill-status.locked {
  background: #fee2e2;
  color: #dc2626;
}

/* 已解锁技能 */

.unlocked-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.unlocked-skill-tag {
  background: var(--color-success);
  color: white;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* 自定义修炼时间输入 */

.time-input-group {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--color-border);
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.input-row label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  min-width: 30px;
}

.time-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
  background: var(--color-background);
  color: var(--color-text);
}

.time-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.time-total {
  font-size: 0.9rem;
  color: var(--color-accent);
  font-weight: 600;
  text-align: center;
  padding: 8px;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 4px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

/* 响应式设计 */
@media (max-width: 900px) {
  .skills-content {
    display: flex;
    flex-direction: column;
  }

  .skill-details-bottom {
    min-height: 250px;
  }
}

@media (max-width: 768px) {
  .skills-content {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .skills-main {
    overflow-y: visible;
    padding: 16px;
    gap: 20px;
  }

  .technique-library-section {
    display: none;
  }

  .technique-library-section.is-mobile {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    transform: translateY(100%);
    max-height: 80vh;
    padding: 20px 20px 28px;
    background: var(--color-background);
    box-shadow: 0 -16px 32px rgba(0, 0, 0, 0.35);
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    z-index: 1500;
    transition: transform 0.3s ease, opacity 0.3s ease;
    opacity: 0;
    pointer-events: none;
  }

  .technique-library-section.is-mobile.is-open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .technique-library-section.is-mobile .technique-grid {
    max-height: calc(80vh - 140px);
    overflow-y: auto;
    padding-right: 4px;
  }

  .mobile-library-close {
    display: inline-flex;
  }

  .mobile-library-toggle {
    display: inline-flex;
  }

  .mobile-library-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 1400;
  }

  .skill-details-bottom {
    position: static;
    width: 100%;
    max-height: none;
    min-height: 350px;
    border-top: 2px solid var(--color-border);
    overflow-y: visible;
  }

  .skill-details-bottom.no-selection {
    min-height: 180px;
  }
}

@media (max-width: 640px) {
  .skills-main {
    padding: 12px;
    gap: 16px;
  }

  .technique-grid,
  .learned-skills-grid,
  .unmastered-skills-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .section-header {
    font-size: 1rem;
    margin-bottom: 12px;
  }

  .header-text {
    font-size: 1rem;
  }

  .technique-content {
    gap: 12px;
  }

  .technique-icon-wrapper {
    width: 56px;
    height: 56px;
  }

  .technique-icon-text {
    font-size: 24px;
  }

  .skill-details-bottom {
    min-height: 280px;
  }

  .details-card {
    padding: 12px;
  }

  .card-header {
    gap: 12px;
  }

  .details-icon-large {
    width: 56px;
    height: 56px;
  }

  .skill-type-text-large {
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .skills-main {
    padding: 8px;
    gap: 12px;
  }

  .section-header {
    font-size: 0.9rem;
    margin-bottom: 10px;
    padding-bottom: 8px;
  }

  .header-text {
    font-size: 0.9rem;
  }

  .count-badge {
    font-size: 0.75rem;
    padding: 2px 8px;
  }

  .current-technique-slot {
    padding: 16px;
    min-height: 100px;
  }

  .details-icon-large {
    width: 48px;
    height: 48px;
  }

  .skill-type-text-large {
    font-size: 20px;
  }

  .details-title-area h3 {
    font-size: 1.05rem;
  }

  .mobile-library-toggle {
    padding: 10px 16px;
    font-size: 0.9rem;
  }
}
</style>
