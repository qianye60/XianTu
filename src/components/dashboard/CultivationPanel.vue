<template>
  <div class="cultivation-panel game-panel">
    <!-- 头部统计 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">⚡</div>
        <div class="header-info">
          <h3 class="panel-title">功法系统</h3>
          <span class="panel-subtitle">{{ totalSkillsCount }}门功法</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refreshCultivationData" :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span class="btn-text">刷新</span>
        </button>
        <button class="action-btn primary" @click="startCultivation">
          <Zap :size="16" />
          <span class="btn-text">修炼</span>
        </button>
      </div>
    </div>

    <div class="panel-content">
      <!-- 功法修炼概要卡片 -->
      <div class="detail-section cultivation-overview-card">
        <div class="overview-content">
          <div class="overview-stats">
            <div class="stat-item">
              <div class="stat-icon">📚</div>
              <div class="stat-info">
                <span class="stat-value">{{ totalSkillsCount }}</span>
                <span class="stat-label">已学功法</span>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">⚡</div>
              <div class="stat-info">
                <span class="stat-value">{{ mainTechnique ? '1' : '0' }}</span>
                <span class="stat-label">主修功法</span>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">🎯</div>
              <div class="stat-info">
                <span class="stat-value">{{ learnedSkills.length }}</span>
                <span class="stat-label">辅助技能</span>
              </div>
            </div>
          </div>
          
          <div class="cultivation-hint">
            <div class="hint-icon">💡</div>
            <div class="hint-text">专注修炼功法技能，提升战力与修为进度</div>
          </div>
        </div>
      </div>

      <!-- 主修功法卡片 -->
      <div class="detail-section main-technique-card">
        <div class="detail-header">
          <h4 class="detail-title">主修功法</h4>
          <button v-if="!mainTechnique" class="action-btn primary" @click="chooseTechnique('主修功法')">
            <Plus :size="16" />
            选择功法
          </button>
        </div>
        
        <div v-if="mainTechnique" class="technique-display">
          <div class="technique-icon">⚡</div>
          <div class="technique-info">
            <div class="technique-name">{{ mainTechnique }}</div>
            <div class="technique-stats">
              <div class="proficiency-info">
                <span class="proficiency-label">熟练度</span>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: mainTechniqueProficiency.percent + '%' }"></div>
                </div>
                <span class="proficiency-text">{{ mainTechniqueProficiency.level }}</span>
              </div>
            </div>
          </div>
          <div class="technique-actions">
            <button class="action-btn" @click="practiceTechnique(mainTechnique)">
              <BookOpen :size="16" />
              修炼
            </button>
            <button class="action-btn secondary" @click="chooseTechnique('主修功法')">
              <RefreshCw :size="16" />
              更换
            </button>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <div class="empty-icon">📜</div>
          <div class="empty-text">尚未选择主修功法</div>
          <div class="empty-hint">选择一门适合的功法开始修炼之路</div>
        </div>
      </div>

      <!-- 已学技能列表 -->
      <div class="detail-section skills-container">
        <div class="detail-header">
          <h4 class="detail-title">已学技能</h4>
          <div class="skill-count">{{ learnedSkills.length }}项</div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner">⏳</div>
          <div class="loading-text">正在读取功法技能...</div>
        </div>
        
        <div v-else-if="learnedSkills.length === 0" class="empty-state">
          <div class="empty-icon">🎯</div>
          <div class="empty-text">尚未习得任何技能</div>
          <div class="empty-hint">通过修炼和历练来学习新的技能</div>
        </div>

        <div v-else class="skills-list">
          <div 
            v-for="skill in displaySkills" 
            :key="skill.id"
            class="skill-card"
            :class="{ selected: selectedSkill?.id === skill.id }"
            @click="selectSkill(skill)"
          >
            <div class="skill-icon">{{ getSkillIcon(skill.name) }}</div>
            <div class="skill-info">
              <div class="skill-name">{{ skill.name }}</div>
              <div class="skill-meta">
                <span class="skill-type">{{ skill.type || '通用技能' }}</span>
                <span v-if="skill.level" class="skill-level">Lv.{{ skill.level }}</span>
              </div>
              <div v-if="skill.proficiency" class="skill-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: skill.proficiency.percent + '%' }"></div>
                </div>
                <span class="progress-text">{{ skill.proficiency.current }}/{{ skill.proficiency.max }}</span>
              </div>
            </div>
            <div class="skill-actions">
              <button class="action-btn" @click.stop="practiceSkill(skill)">
                <Zap :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 天赋显示卡片 -->
      <div class="detail-section talents-display-card">
        <div class="detail-header">
          <h4 class="detail-title">先天天赋</h4>
          <div class="talent-count">{{ talentsCount }}项天赋</div>
        </div>
        
        <div v-if="characterBaseInfo.天赋 && characterBaseInfo.天赋.length > 0" class="talents-list">
          <div 
            v-for="talent in characterBaseInfo.天赋" 
            :key="talent"
            class="talent-item"
          >
            <div class="talent-icon">🌟</div>
            <div class="talent-info">
              <div class="talent-name">{{ talent }}</div>
              <div class="talent-description">先天天赋，无法修炼提升</div>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <div class="empty-icon">⭐</div>
          <div class="empty-text">道友尚未觉醒特殊天赋，勤修苦练终有所成</div>
        </div>
      </div>
    </div>

    <!-- 技能详情面板 -->
    <div v-if="selectedSkill" class="skill-detail-panel">
      <div class="detail-header">
        <div class="detail-icon">{{ getSkillIcon(selectedSkill.name) }}</div>
        <div class="detail-info">
          <h4 class="detail-name">{{ selectedSkill.name }}</h4>
          <div class="detail-badges">
            <span v-if="selectedSkill.type" class="type-badge">{{ selectedSkill.type }}</span>
            <span v-if="selectedSkill.level" class="level-badge">Lv.{{ selectedSkill.level }}</span>
          </div>
        </div>
        <button class="action-btn" @click="selectedSkill = null">
          <X :size="20" />
        </button>
      </div>

      <div class="detail-content">
        <div v-if="selectedSkill.description" class="detail-section">
          <h5>技能描述</h5>
          <p>{{ selectedSkill.description }}</p>
        </div>

        <div v-if="selectedSkill.proficiency" class="detail-section">
          <h5>熟练度进度</h5>
          <div class="proficiency-progress">
            <div class="progress-info">
              <span class="current-proficiency">{{ selectedSkill.proficiency.current }} / {{ selectedSkill.proficiency.max }}</span>
              <span class="proficiency-level-text">{{ selectedSkill.proficiency.level || '初学' }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: selectedSkill.proficiency.percent + '%' }"></div>
            </div>
          </div>
        </div>

        <div v-if="selectedSkill.effects && selectedSkill.effects.length > 0" class="detail-section">
          <h5>技能效果</h5>
          <div class="effects-list">
            <div v-for="effect in selectedSkill.effects" :key="effect" class="effect-item">
              <span class="effect-text">{{ effect }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-actions">
        <button class="action-btn primary" @click="practiceSkill(selectedSkill)">
          <Zap :size="16" />
          修炼此技能
        </button>
        <button class="action-btn secondary" @click="getSkillInfo(selectedSkill)">
          <Info :size="16" />
          详细了解
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Zap, RefreshCw, Plus, BookOpen, Info, X } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import type { CultivationSkills, CharacterBaseInfo, PlayerStatus } from '@/types/game';

// 技能数据接口
interface SkillItem {
  id: string;
  name: string;
  type?: string;
  level?: number;
  description?: string;
  effects?: string[];
  proficiency?: {
    current: number;
    max: number;
    level: string;
    percent: number;
  } | null;
}

// 天赋进度接口（删除，因为天赋是固定的）
// interface TalentProgressItem {
//   name: string;
//   level: number;
//   currentExp: number;
//   nextLevelExp: number;
//   totalExp: number;
//   progressPercent: number;
// }

const characterStore = useCharacterStore();

// 响应式数据
const loading = ref(false);
const mainTechnique = ref<string | null>(null);
const learnedSkills = ref<SkillItem[]>([]);
// const talentProgresses = ref<TalentProgressItem[]>([]); // 删除，天赋不需要进度
const selectedSkill = ref<SkillItem | null>(null);

// 计算属性
const characterBaseInfo = computed((): CharacterBaseInfo => {
  const profile = characterStore.activeCharacterProfile;
  return profile?.角色基础信息 || {
    名字: '未知',
    性别: '未知',
    年龄: 18,
    出生: '未知',
    灵根: '凡人灵根',
    天资: '普通',
    天赋: [],
    先天六司: { 根骨: 10, 灵性: 10, 悟性: 10, 气运: 10, 魅力: 10, 心性: 10 },
    创建时间: new Date().toISOString(),
    描述: '',
    世界: '未知世界'
  };
});

const playerStatus = computed((): PlayerStatus | null => {
  const activeSave = characterStore.activeSaveSlot;
  return activeSave?.存档数据?.玩家角色状态 || null;
});

const cultivationSkills = computed((): CultivationSkills | null => {
  const activeSave = characterStore.activeSaveSlot;
  return activeSave?.存档数据?.功法技能 || null;
});


const totalSkillsCount = computed(() => {
  let count = 0;
  if (mainTechnique.value) count += 1;
  count += learnedSkills.value.length;
  return count;
});

// 删除天赋进度相关代码，根据存档结构，天赋是在角色基础信息中的固定数组
const talentsCount = computed(() => characterBaseInfo.value.天赋?.length || 0);

const displaySkills = computed(() => learnedSkills.value.slice(0, 20));

const mainTechniqueProficiency = computed(() => {
  const skills = cultivationSkills.value;
  const mainTech = mainTechnique.value;
  
  if (!skills || !mainTech || !skills.技能熟练度[mainTech]) {
    return { level: '未入门', percent: 0, current: 0, max: 100 };
  }
  
  const prof = skills.技能熟练度[mainTech];
  const percent = (prof.下级所需 ?? 0) > 0 ? (prof.经验 / (prof.下级所需 ?? 0)) * 100 : 0;
  
  return {
    level: getProficiencyLevel(prof.等级),
    percent,
    current: prof.经验,
    max: prof.下级所需 ?? 0
  };
});

// 工具函数
const getSkillIcon = (skillName: string): string => {
  const iconMap: Record<string, string> = {
    '基础修炼': '⚡',
    '吐纳术': '🌬️',
    '导引术': '🧘',
    '炼体术': '💪',
    '剑法': '⚔️',
    '刀法': '🔪',
    '拳法': '👊',
    '轻功': '💨',
    '内功': '🔥',
    '阵法': '📐',
    '炼丹': '⚗️',
    '符咒': '📜'
  };
  
  // 检查技能名称关键词
  for (const [key, icon] of Object.entries(iconMap)) {
    if (skillName.includes(key)) return icon;
  }
  
  return '🎯'; // 默认图标
};

const getProficiencyLevel = (level: number): string => {
  if (level >= 10) return '大成';
  if (level >= 8) return '精通';
  if (level >= 6) return '熟练';
  if (level >= 4) return '入门';
  if (level >= 2) return '初学';
  return '未入门';
};

// 选择技能
const selectSkill = (skill: SkillItem) => {
  selectedSkill.value = selectedSkill.value?.id === skill.id ? null : skill;
};

// 修炼技能
const practiceSkill = (skill: SkillItem) => {
  toast.info(`开始修炼${skill.name}...`);
  // 这里应该通过游戏主界面发送AI指令
};

// 修炼主功法
const practiceTechnique = (techniqueName: string) => {
  toast.info(`开始修炼${techniqueName}...`);
  // 这里应该通过游戏主界面发送AI指令
};

// 选择功法
const chooseTechnique = (type: string) => {
  toast.info(`选择${type}...`);
  // 这里应该打开功法选择界面或发送AI指令
};

// 开始修炼
const startCultivation = () => {
  if (mainTechnique.value) {
    practiceTechnique(mainTechnique.value);
  } else {
    toast.warning('请先选择主修功法');
  }
};

// 获取技能信息
const getSkillInfo = (skill: SkillItem) => {
  toast.info(`查看${skill.name}详细信息`);
  // 这里应该发送AI指令获取技能详情
};

// 刷新修炼数据
const refreshCultivationData = async () => {
  loading.value = true;
  try {
    await loadCultivationData();
    toast.success('功法技能数据已刷新');
  } catch (error) {
    console.error('[功法系统] 刷新失败:', error);
    toast.error('刷新失败');
  } finally {
    loading.value = false;
  }
};

// 加载修炼数据
const loadCultivationData = async () => {
  try {
    // 首先从角色存档中加载基础数据
    const skills = cultivationSkills.value;
    
    if (skills) {
      // 设置主修功法
      mainTechnique.value = skills.主修功法;
      
      // 构建已学技能列表（简化，直接使用已学技能数组）
      const skillsList: SkillItem[] = (skills.已学技能 || []).map(skillId => {
        const proficiency = skills.技能熟练度?.[skillId];
        let proficiencyData = null;
        
        if (proficiency && proficiency.等级 !== undefined) {
          const percent = proficiency.等级 * 10; // 简单计算进度百分比
          proficiencyData = {
            current: proficiency.经验 || 0,
            max: proficiency.下级所需 || 100,
            level: getProficiencyLevel(proficiency.等级 || 0),
            percent
          };
        }
        
        return {
          id: skillId,
          name: skillId,
          type: '功法技能',
          level: proficiency?.等级,
          proficiency: proficiencyData
        };
      });
      
      learnedSkills.value = skillsList;
    }

    // 尝试从酒馆变量获取更新的数据
    const helper = getTavernHelper();
    if (helper) {
      try {
        const chatVars = await helper.getVariables({ type: 'chat' });
        
        // 检查是否有酒馆中的功法技能数据更新
        if (chatVars['character.cultivation']) {
          const cultivationData = chatVars['character.cultivation'] as {
            main_technique?: string;
            skills?: Array<{
              id?: string;
              name?: string;
              type?: string;
              level?: number;
              description?: string;
              effects?: string[];
              proficiency?: {
                current: number;
                max: number;
                level: string;
                percent: number;
              };
            }>;
          };
          
          // 更新主修功法
          if (cultivationData.main_technique) {
            mainTechnique.value = cultivationData.main_technique;
          }
          
          // 更新技能列表
          if (cultivationData.skills && Array.isArray(cultivationData.skills)) {
            const updatedSkills = cultivationData.skills.map((skill) => ({
              id: skill.id || skill.name || `skill_${Date.now()}`,
              name: skill.name || '未知技能',
              type: skill.type || '通用技能',
              level: skill.level,
              description: skill.description,
              effects: skill.effects,
              proficiency: skill.proficiency
            }));
            
            // 合并数据，优先使用酒馆中的最新数据
            learnedSkills.value = updatedSkills;
          }
        }
        
        // 检查其他格式的功法数据
        const cultivationKeys = Object.keys(chatVars).filter(key => 
          key.includes('cultivation') || 
          key.includes('technique') || 
          key.includes('skill') ||
          key.includes('功法') ||
          key.includes('技能')
        );
        
        cultivationKeys.forEach(key => {
          const value = chatVars[key];
          if (value && typeof value === 'object') {
            console.log('[功法系统] 发现酒馆变量:', key, value);
            // 这里可以根据需要处理特定格式的数据
          }
        });
        
      } catch (error) {
        console.warn('[功法系统] 读取酒馆变量失败:', error);
      }
    }
    
    console.log('[功法系统] 加载完成:', {
      主修功法: mainTechnique.value,
      已学技能数: learnedSkills.value.length
    });
    
  } catch (error) {
    console.error('[功法系统] 加载数据失败:', error);
  }
};

onMounted(() => {
  loadCultivationData();
});
</script>

<style scoped>
.cultivation-panel {
  /* 使用统一的 game-panel 基础样式 */
}

/* 概要统计 */
.overview-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.overview-stats .stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: var(--transition-fast);
}

.overview-stats .stat-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.1);
}

.overview-stats .stat-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.overview-stats .stat-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.overview-stats .stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.overview-stats .stat-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.cultivation-hint {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(var(--color-accent-rgb), 0.1);
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
  border-radius: 6px;
}

.hint-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  color: var(--color-accent);
}

.hint-text {
  font-size: 0.875rem;
  color: var(--color-accent);
  font-weight: 500;
}

/* 主修功法 */
.technique-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.technique-icon {
  font-size: 2rem;
  width: 3rem;
  text-align: center;
  color: var(--color-primary);
}

.technique-info {
  flex: 1;
  min-width: 0;
}

.technique-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.technique-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.proficiency-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.proficiency-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.proficiency-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-success);
  white-space: nowrap;
}

.technique-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 技能卡片 */
.skills-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  padding-right: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.skills-list::-webkit-scrollbar {
  width: 6px;
}

.skills-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.skill-card:hover {
  background: var(--color-surface-light);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.15);
}

.skill-card.selected {
  background: var(--color-surface-light);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.skill-icon {
  font-size: 1.5rem;
  width: 2.5rem;
  text-align: center;
  flex-shrink: 0;
}

.skill-info {
  flex: 1;
  min-width: 0;
}

.skill-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.skill-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.skill-type,
.skill-level {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.75rem;
  font-weight: 500;
}

.skill-type {
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent);
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
}

.skill-level {
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  border: 1px solid rgba(var(--color-success-rgb), 0.3);
}

.skill-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.skill-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.skill-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

/* 技能详情面板 */
.skill-detail-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  z-index: 10;
  backdrop-filter: blur(10px);
}

@media (max-width: 768px) {
  .skill-detail-panel {
    position: fixed;
    width: 100%;
    left: 0;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  }
}

.detail-info {
  flex: 1;
  min-width: 0;
}

.detail-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}

.detail-badges {
  display: flex;
  gap: 0.5rem;
}

.type-badge,
.level-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  font-weight: 500;
}

.type-badge {
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent);
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
}

.level-badge {
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  border: 1px solid rgba(var(--color-success-rgb), 0.3);
}

.detail-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.detail-section h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.detail-section p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.proficiency-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-proficiency {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.proficiency-level-text {
  font-size: 0.875rem;
  color: var(--color-success);
  font-weight: 600;
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.effect-item {
  padding: 0.5rem 0.75rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* 天赋列表 */
.talents-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.talent-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 6px;
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

.talent-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
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
@media (max-width: 768px) {
  .btn-text {
    display: none;
  }
  
  .overview-stats {
    grid-template-columns: 1fr;
  }
}
</style>