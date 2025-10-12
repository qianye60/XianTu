<template>
  <div class="cultivation-panel game-panel">
    <!-- 头部统计 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">⚡</div>
        <div class="header-info">
          <h3 class="panel-title">修炼系统</h3>
          <span class="panel-subtitle">功法与天赋</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refreshCultivationData" :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span class="btn-text">刷新</span>
        </button>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <div class="loading-text">正在读取修炼数据...</div>
      </div>

      <div v-else class="cultivation-sections">
        <!-- 修炼功法卡片 -->
        <div class="detail-section cultivation-card">
          <div class="detail-header">
            <div class="header-icon">📖</div>
            <h4 class="detail-title">修炼功法</h4>
            <div class="cultivation-status">{{ currentTechnique ? '修炼中' : '未修炼' }}</div>
          </div>

          <div v-if="!currentTechnique" class="empty-state">
            <div class="empty-icon">📕</div>
            <div class="empty-text">尚未修炼功法</div>
            <div class="empty-hint">前往背包装备功法开始修炼</div>
          </div>

          <div v-else class="cultivation-info">
            <div v-if="currentTechnique" class="technique-item">
              <div class="technique-icon" :class="getTechniqueQualityClass(currentTechnique)">📖</div>
              <div class="technique-info">
                <div class="technique-name" :class="getTechniqueQualityClass(currentTechnique, 'text')">
                  {{ currentTechnique.名称 }}
                </div>
                <div class="technique-quality">
                  {{ currentTechnique.品质?.quality || '凡' }}阶 {{ getGradeText(currentTechnique.品质?.grade || 0) }}({{ currentTechnique.品质?.grade || 0 }})
                </div>
                <div class="technique-progress">
                    <div class="progress-bar">
                      <div
                        class="progress-fill"
                        :style="{ width: Math.max(2, Math.min(100, Math.max(0, currentTechnique.修炼进度 || 0))) + '%' }"
                      ></div>
                    </div>
                    <span class="progress-text">{{ Math.min(100, Math.max(0, currentTechnique.修炼进度 || 0)).toFixed(0) }}%</span>
                  </div>
                </div>
                <div class="technique-actions">
                  <button class="action-btn cultivate-btn" @click="startDeepCultivation">
                    深度修炼
                  </button>
                  <button class="action-btn stop-cultivation-btn" @click="stopCultivation">
                    停止修炼
                  </button>
                </div>
              </div>

              <!-- 功法详情 -->
              <div v-if="currentTechnique" class="technique-details">
                <!-- 功法描述 -->
                <div class="detail-block">
                  <h5 class="detail-block-title">功法描述</h5>
                  <p class="detail-block-content description-text">{{ currentTechnique.描述 || '暂无描述' }}</p>
                </div>

                <!-- 功法效果 -->
                <div v-if="techniqueEffects" class="detail-block">
                  <h5 class="detail-block-title">功法效果</h5>
                  <ul class="effects-list">
                    <li v-if="techniqueEffects.修炼速度加成">
                      <span class="effect-icon">🚀</span>
                      <strong>修炼速度:</strong> +{{ ((techniqueEffects.修炼速度加成 || 1) * 100 - 100).toFixed(0) }}%
                    </li>
                    <li v-if="attributeBonuses.length > 0">
                      <span class="effect-icon">💪</span>
                      <strong>属性加成:</strong>
                      <span v-for="(bonus, index) in attributeBonuses" :key="index" class="attribute-bonus">
                        {{ bonus.key }} +{{ bonus.value }}
                      </span>
                    </li>
                    <li v-for="(ability, index) in (techniqueEffects.特殊能力 || [])" :key="index">
                      <span class="effect-icon">✨</span>
                      <strong>特殊能力:</strong> {{ ability }}
                    </li>
                  </ul>
                </div>
              </div>

              <!-- 已学技能列表 -->
              <div v-if="currentTechnique && learnedSkills.length > 0" class="skills-section">
                <div class="skills-header">
                  <h5 class="skills-title">已掌握技能</h5>
                <div class="skills-count">({{ learnedSkills.length }}个)</div>
              </div>
              <div class="skills-list">
                <div
                  v-for="skill in learnedSkills"
                  :key="skill.name"
                  class="skill-item"
                  @click="showSkillDetails(skill)"
                >
                  <div class="skill-icon">{{ getSkillTypeIcon(skill.type) }}</div>
                  <div class="skill-info">
                    <div class="skill-header-info">
                      <div class="skill-name">{{ skill.name }}</div>
                      <div class="skill-type">{{ skill.type }}</div>
                    </div>
                    <div class="skill-source-tag" :class="getSourceClass(skill.source)">
                      {{ skill.source }}
                    </div>
                    <!-- 显示解锁条件（如果有） -->
                    <div v-if="skill.unlockRequirement" class="skill-unlock-requirement">
                      解锁条件：功法熟练度 {{ skill.unlockRequirement }}%
                    </div>
                    <div class="skill-proficiency">
                      <span class="proficiency-label">熟练度：</span>
                      <div class="proficiency-bar">
                        <div
                          class="proficiency-fill"
                          :style="{ width: Math.min(100, Math.max(0, skill.proficiency)) + '%' }"
                        ></div>
                      </div>
                      <span class="proficiency-text">{{ Math.min(100, Math.max(0, skill.proficiency)).toFixed(0) }}%</span>
                    </div>
                  </div>
                  <div class="skill-level" :class="getSkillLevelClass(skill.proficiency)">
                    {{ getSkillLevel(skill.proficiency) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 深度修炼弹窗 -->
    <DeepCultivationModal
      :visible="showDeepCultivationModal"
      :technique="currentTechnique"
      :current-progress="currentTechnique?.修炼进度 || 0"
      @close="showDeepCultivationModal = false"
      @confirm="confirmDeepCultivation"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RefreshCw } from 'lucide-vue-next';
import { useCharacterCultivationData, useCharacterBasicData, useUnifiedCharacterData } from '@/composables/useCharacterData';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';
import { debug } from '@/utils/debug';
import DeepCultivationModal from '@/components/common/DeepCultivationModal.vue';
import type { TechniqueItem, TechniqueSkill } from '@/types/game';

// 组合式函数
const { saveData: cultivationSaveData } = useCharacterCultivationData();
const { basicInfo } = useCharacterBasicData();
const { characterData } = useUnifiedCharacterData();
const characterStore = useCharacterStore();

// 深度修炼弹窗状态
const showDeepCultivationModal = ref(false);

const loading = computed(() => !cultivationSaveData.value && !basicInfo.value);

const techniqueEffects = computed(() => {
  return currentTechnique.value?.功法效果;
});

const attributeBonuses = computed(() => {
  const bonuses = techniqueEffects.value?.属性加成;
  if (!bonuses) return [];
  return Object.entries(bonuses).map(([key, value]) => ({ key, value }));
});

// 类型定义
type LearnedSkillDisplay = {
  name: string;
  type: string;
  source: string;
  proficiency: number;
  description?: string;
  unlocked: true;
  unlockRequirement?: number; // 解锁需要的功法熟练度
};

// 获取当前修炼功法 - 从背包中查找已装备的功法
const currentTechnique = computed((): TechniqueItem | null => {
  const inventory = characterData.value?.背包_物品;

  if (!inventory) return null;

  // 从背包中查找已装备=true且类型=功法的物品
  const cultivatingTechnique = Object.values(inventory).find(
    item => item?.类型 === '功法' && item?.已装备 === true
  );

  if (cultivatingTechnique) {
    // ✅ 直接返回背包中的功法本体，所有数据都在这里
    console.log('[修炼面板-调试] 当前修炼功法数据:', {
      名称: cultivatingTechnique.名称,
      品质字段存在: !!cultivatingTechnique.品质,
      品质内容: cultivatingTechnique.品质,
      完整数据: cultivatingTechnique
    });
    return cultivatingTechnique as TechniqueItem;
  }

  return null;
});

// 获取已学技能列表
const learnedSkills = computed((): LearnedSkillDisplay[] => {
  const technique = currentTechnique.value;

  if (!technique) return [];

  const skills: LearnedSkillDisplay[] = [];
  const skillNameSet = new Set<string>(); // 防止重复添加技能

  // ✅ 从功法技能定义获取（达到条件解锁的技能）
  if (technique?.功法技能) {
    const skills技能列表 = Array.isArray(technique.功法技能) ? technique.功法技能 : [];
    skills技能列表.forEach((skillInfo: TechniqueSkill) => {
      const skillName = skillInfo.技能名称;
      if (!skillNameSet.has(skillName)) {
        // 检查是否已解锁
        const unlocked = checkSkillUnlocked(skillName, technique);
        if (unlocked) {
          skillNameSet.add(skillName);
          skills.push({
            name: skillName,
            proficiency: getPersistentProficiency(skillName, 'technique'), // 获取持久化熟练度
            source: '功法传承',
            type: '功法技能',
            description: skillInfo.技能描述 || '通过功法修炼掌握的技能',
            unlocked: true,
            unlockRequirement: skillInfo.解锁需要熟练度
          });
        }
      }
    });
  }

  return skills;
});

// 获取持久化的熟练度（根据技能名和来源生成固定熟练度）
const getPersistentProficiency = (skillName: string, source: string): number => {
  // 使用技能名和来源生成一个固定的种子
  const seed = skillName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + source.length;
  // 基于种子生成 30-95 之间的固定值
  return 30 + (seed % 66);
};

// 检查技能是否已解锁
const checkSkillUnlocked = (skillName: string, technique: TechniqueItem): boolean => {
  if (!technique.功法技能) return false;

  const skills技能列表 = Array.isArray(technique.功法技能) ? technique.功法技能 : [];
  const skillInfo = skills技能列表.find(s => s.技能名称 === skillName);

  if (!skillInfo) return false;

  // 检查是否达到解锁条件
  const currentProgress = technique.修炼进度 || 0;
  const requiredProgress = skillInfo.解锁需要熟练度 || 0;

  return currentProgress >= requiredProgress;
};

// 品级文本显示
const getGradeText = (grade: number): string => {
  if (grade === 0) return '残缺';
  if (grade >= 1 && grade <= 3) return '下品';
  if (grade >= 4 && grade <= 6) return '中品';
  if (grade >= 7 && grade <= 9) return '上品';
  if (grade === 10) return '极品';
  return '未知';
};

// 获取功法品质样式
const getTechniqueQualityClass = (technique: TechniqueItem | null, type: 'border' | 'text' = 'border'): string => {
  if (!technique) return '';
  const quality = technique.品质?.quality || '凡';
  return `${type}-quality-${quality}`;
};

// 获取技能类型图标
const getSkillTypeIcon = (skillType: string): string => {
  const iconMap: Record<string, string> = {
    '主动技能': '⚡',
    '被动技能': '🛡️',
    '辅助技能': '✨',
    '攻击技能': '⚔️',
    '防御技能': '🛡️',
    '治疗技能': '💚',
    '辅助': '✨',
    '攻击': '⚔️',
    '防御': '🛡️',
    '治疗': '💚'
  };
  return iconMap[skillType] || '⚡';
};

// 获取来源样式类名
const getSourceClass = (source: string): string => {
  const classMap: Record<string, string> = {
    '修炼习得': 'source-direct',
    '功法传承': 'source-technique'
  };
  return classMap[source] || 'source-default';
};

// 获取技能等级
const getSkillLevel = (proficiency: number): string => {
  if (proficiency >= 90) return '宗师';
  if (proficiency >= 75) return '精通';
  if (proficiency >= 50) return '熟练';
  if (proficiency >= 25) return '入门';
  return '初学';
};

// 获取技能等级样式
const getSkillLevelClass = (proficiency: number): string => {
  if (proficiency >= 90) return 'level-master';
  if (proficiency >= 75) return 'level-expert';
  if (proficiency >= 50) return 'level-proficient';
  if (proficiency >= 25) return 'level-beginner';
  return 'level-novice';
};

// 显示技能详情
const showSkillDetails = (skill: LearnedSkillDisplay) => {
  const proficiencyLevel = getSkillLevel(skill.proficiency);
  const effectDescription = getSkillEffectDescription(skill);

  const message = `${skill.name}\n\n` +
    `类型：${skill.type}\n` +
    `来源：${skill.source}\n` +
    `熟练度：${skill.proficiency}% (${proficiencyLevel})\n\n` +
    `技能描述：\n${skill.description || '暂无描述'}\n\n` +
    `修炼效果：\n${effectDescription}`;

  alert(message);
};

// 获取技能效果描述
const getSkillEffectDescription = (skill: LearnedSkillDisplay): string => {
  const proficiency = skill.proficiency;
  if (proficiency >= 90) {
    return '技能威力极大提升，消耗降低，可触发特殊效果';
  } else if (proficiency >= 75) {
    return '技能威力大幅提升，消耗适中，偶有精妙表现';
  } else if (proficiency >= 50) {
    return '技能威力中等，消耗正常，表现稳定';
  } else if (proficiency >= 25) {
    return '技能威力较弱，消耗较高，偶有失误';
  } else {
    return '技能威力微弱，消耗很高，容易失误';
  }
};


// 刷新修炼数据
const refreshCultivationData = async () => {
  // 数据是响应式的，理论上不需要手动刷新
  // 如果需要强制刷新，应该在 store 中实现
  toast.info('数据已通过中央存储自动更新');
};

// 停止修炼
const stopCultivation = async () => {
  if (!currentTechnique.value) {
    toast.error('当前没有正在修炼的功法');
    return;
  }

  const techniqueToStop = currentTechnique.value;
  debug.log('修炼面板', '请求停止修炼', techniqueToStop.名称);

  try {
    await characterStore.unequipTechnique(techniqueToStop.物品ID);
    toast.success(`已停止修炼《${techniqueToStop.名称}》`);
    debug.log('修炼面板', '停止修炼成功', techniqueToStop.名称);
  } catch (error) {
    debug.error('修炼面板', '停止修炼失败', error);
    toast.error(`停止修炼失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 深度修炼
const startDeepCultivation = () => {
  if (!currentTechnique.value) {
    toast.error('当前没有正在修炼的功法');
    return;
  }
  showDeepCultivationModal.value = true;
};

// 确认深度修炼
const confirmDeepCultivation = async (totalDays: number) => {
  showDeepCultivationModal.value = false;

  if (!currentTechnique.value) {
    toast.error('当前没有正在修炼的功法');
    return;
  }

  const techniqueData = currentTechnique.value;

  // 添加到动作队列
  try {
    const { useActionQueueStore } = await import('@/stores/actionQueueStore');
    const actionQueue = useActionQueueStore();

    actionQueue.addAction({
      type: 'cultivate',
      itemName: techniqueData.名称,
      itemType: '功法',
      description: `对《${techniqueData.名称}》进行${totalDays}天的深度修炼`
    });

    toast.success(`已开始${totalDays}天的深度修炼`);
    debug.log('修炼面板', `已添加${totalDays}天深度修炼到动作队列:`, techniqueData.名称);
  } catch (error) {
    debug.error('修炼面板', '添加深度修炼动作失败:', error);
    toast.error('添加修炼动作失败');
  }
};
</script>

<style scoped>

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  margin: 1rem 1rem 0 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary);
}

.panel-subtitle {
  font-size: 0.875rem;
  color: var(--color-accent);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* 修炼容器 */
.panel-content {
  flex: 1;
  margin: 0 1rem 1rem 1rem;
  overflow-y: auto;
  min-height: 0;
}

.cultivation-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.loading-spinner {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.loading-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.empty-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* 修炼功法卡片 */
.cultivation-status {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

.cultivation-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.technique-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface-light);
  border: 2px solid var(--color-border);
  border-radius: 0.75rem;
  transition: var(--transition-fast);
}

.technique-item:hover {
  background: rgba(var(--color-primary-rgb), 0.05);
  border-color: var(--color-primary);
}

.technique-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 2px solid;
  background: var(--color-surface);
}

.technique-info {
  flex: 1;
  min-width: 0;
}

.technique-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-block-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.description-text {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.effects-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.effects-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.effect-icon {
  font-size: 1rem;
}

.attribute-bonus {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  margin-left: 0.25rem;
}

.technique-name {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.technique-quality {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.technique-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 技能部分 */
.skills-section {
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
}

.skills-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.skills-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.skills-title::before {
  content: '⚡';
  font-size: 1rem;
}

.skills-count {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skill-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: var(--transition-fast);
}

.skill-item:hover {
  background: rgba(var(--color-info-rgb), 0.05);
  border-color: var(--color-info);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.skill-icon {
  font-size: 1rem;
  flex-shrink: 0;
  color: var(--color-warning);
}

.skill-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.skill-header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.skill-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.skill-type {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.skill-source-tag {
  font-size: 0.7rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.5rem;
  font-weight: 500;
  width: fit-content;
  margin-bottom: 0.125rem;
}

.skill-unlock-requirement {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-bottom: 0.25rem;
  padding: 0.125rem 0.375rem;
  background: rgba(var(--color-info-rgb), 0.1);
  border-left: 2px solid var(--color-info);
  border-radius: 0.25rem;
}

.source-direct {
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  border: 1px solid rgba(var(--color-success-rgb), 0.2);
}

.source-technique {
  background: rgba(var(--color-info-rgb), 0.1);
  color: var(--color-info);
  border: 1px solid rgba(var(--color-info-rgb), 0.2);
}

.source-default {
  background: rgba(var(--color-border-rgb), 0.1);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.skill-proficiency {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.proficiency-label {
  color: var(--color-text-secondary);
  min-width: 3.5rem;
}

.proficiency-bar {
  flex: 1;
  height: 3px;
  background: rgba(var(--color-border-rgb), 0.3);
  border-radius: 1.5px;
  overflow: hidden;
}

.proficiency-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-warning), var(--color-success));
  transition: width 0.3s ease;
}

.proficiency-text {
  color: var(--color-text-secondary);
  font-weight: 500;
  min-width: 2.5rem;
  text-align: right;
}

.skill-level {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid;
  text-align: center;
  min-width: 3rem;
}

.level-master {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
  border-color: #ef4444;
  color: #dc2626;
}

.level-expert {
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(147, 51, 234, 0.1));
  border-color: #9333ea;
  color: #7c3aed;
}

.level-proficient {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
  border-color: #3b82f6;
  color: #2563eb;
}

.level-beginner {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
  border-color: #22c55e;
  color: #16a34a;
}

.level-novice {
  background: linear-gradient(135deg, rgba(156, 163, 175, 0.2), rgba(156, 163, 175, 0.1));
  border-color: #9ca3af;
  color: #6b7280;
}

/* 品质颜色 */
.border-quality-神, .text-quality-神 { border-color: #ef4444; color: #ef4444; }
.border-quality-仙, .text-quality-仙 { border-color: #f59e0b; color: #f59e0b; }
.border-quality-天, .text-quality-天 { border-color: #8b5cf6; color: #8b5cf6; }
.border-quality-地, .text-quality-地 { border-color: #3b82f6; color: #3b82f6; }
.border-quality-玄, .text-quality-玄 { border-color: #10b981; color: #10b981; }
.border-quality-黄, .text-quality-黄 { border-color: #84cc16; color: #84cc16; }
.border-quality-凡, .text-quality-凡 { border-color: var(--color-border); color: var(--color-text); }

/* 大道列表 */
.dao-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

.dao-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dao-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  transition: var(--transition-fast);
}

.dao-item:hover {
  background: rgba(var(--color-primary-rgb), 0.05);
  border-color: var(--color-primary);
}

.dao-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.dao-info {
  flex: 1;
  min-width: 0;
}

.dao-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.dao-stage {
  font-size: 0.75rem;
  color: var(--color-accent);
  margin-bottom: 0.25rem;
}

.dao-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 8px; /* 增加高度 */
  background: #e2e8f0; /* 更明显的背景色 */
  border: 1px solid #cbd5e1; /* 添加边框 */
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); /* 添加轻微阴影 */
}

.progress-fill {
  height: 100%;
  min-width: 1px; /* 确保最小可见宽度 */
  background: linear-gradient(90deg, #22c55e, #3b82f6); /* 明确的颜色 */
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.625rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  min-width: 2rem;
  text-align: right;
}

.more-dao {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 0.5rem;
  font-style: italic;
}

/* 装备系统 */
.equipment-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

.equipment-slots {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.equipment-slot {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  transition: var(--transition-fast);
}

.equipment-slot.equipped {
  background: rgba(var(--color-success-rgb), 0.05);
  border-color: var(--color-success);
}

.slot-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.slot-info {
  flex: 1;
  min-width: 0;
}

.slot-name {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.125rem;
}

.slot-equipment {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.equipment-slot:not(.equipped) .slot-equipment {
  color: var(--color-text-secondary);
  font-style: italic;
}

/* 天赋列表 */
.talent-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

.talents-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.talent-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

.talent-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  color: var(--color-warning);
}

.talent-info {
  flex: 1;
  min-width: 0;
}

.talent-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.talent-description {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.technique-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

/* 按钮样式 */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.cultivate-btn {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.cultivate-btn:hover {
  background: #93c5fd;
  transform: translateY(-1px);
}

.stop-cultivation-btn {
  background: #fef3e2;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.stop-cultivation-btn:hover {
  background: #fed7aa;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 动画 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .header-actions .btn-text {
    display: none;
  }

  .equipment-slots {
    grid-template-columns: 1fr;
  }
}
</style>
