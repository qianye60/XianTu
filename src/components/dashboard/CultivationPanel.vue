<template>
  <div class="cultivation-panel">
    <!-- 头部统计 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">⚡</div>
        <div class="header-info">
          <h3 class="panel-title">功法系统</h3>
          <span class="cultivation-count">{{ totalSkillsCount }}门功法</span>
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

    <!-- 境界状态卡片 -->
    <div class="realm-status-card">
      <div class="status-header">
        <div class="realm-info">
          <h4 class="current-realm">{{ realmData.name }}</h4>
          <div class="realm-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <span class="progress-text">{{ realmData.progress }} / {{ realmData.required }}</span>
          </div>
        </div>
        
        <div class="realm-stats">
          <div class="stat-item">
            <span class="stat-label">修为</span>
            <span class="stat-value">{{ cultivationExp.current }} / {{ cultivationExp.max }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">进度</span>
            <span class="stat-value">{{ Math.round(progressPercent) }}%</span>
          </div>
        </div>
      </div>

      <div class="status-details">
        <div class="detail-item">
          <span class="detail-label">突破描述</span>
          <span class="detail-value">{{ realmData.description || '持续修炼' }}</span>
        </div>
        <div v-if="characterBaseInfo.灵根" class="detail-item">
          <span class="detail-label">灵根</span>
          <span class="detail-value">{{ characterBaseInfo.灵根 }}</span>
        </div>
        <div v-if="characterBaseInfo.天资" class="detail-item">
          <span class="detail-label">天资</span>
          <span class="detail-value">{{ characterBaseInfo.天资 }}</span>
        </div>
      </div>
    </div>

    <!-- 主修功法卡片 -->
    <div class="main-technique-card">
      <div class="card-header">
        <h4>主修功法</h4>
        <button v-if="!mainTechnique" class="choose-btn" @click="chooseTechnique('主修功法')">
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
              <div class="proficiency-bar">
                <div class="proficiency-fill" :style="{ width: mainTechniqueProficiency.percent + '%' }"></div>
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
      
      <div v-else class="empty-technique">
        <div class="empty-icon">📜</div>
        <div class="empty-text">尚未选择主修功法</div>
        <div class="empty-hint">选择一门适合的功法开始修炼之路</div>
      </div>
    </div>

    <!-- 已学技能列表 -->
    <div class="skills-container">
      <div class="section-header">
        <h4>已学技能</h4>
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
              <div class="progress-bar-small">
                <div class="progress-fill-small" :style="{ width: skill.proficiency.percent + '%' }"></div>
              </div>
              <span class="progress-text-small">{{ skill.proficiency.current }}/{{ skill.proficiency.max }}</span>
            </div>
          </div>
          <div class="skill-actions">
            <button class="action-btn mini" @click.stop="practiceSkill(skill)">
              <Zap :size="14" />
            </button>
          </div>
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
        <button class="close-btn" @click="selectedSkill = null">
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
            <div class="progress-bar-large">
              <div class="progress-fill-large" :style="{ width: selectedSkill.proficiency.percent + '%' }"></div>
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

    <!-- 天赋进度卡片 -->
    <div class="talents-progress-card">
      <div class="card-header">
        <h4>天赋进度</h4>
        <div class="talent-count">{{ talentsCount }}项天赋</div>
      </div>
      
      <div v-if="talentProgresses.length > 0" class="talents-list">
        <div 
          v-for="talent in talentProgresses" 
          :key="talent.name"
          class="talent-item"
        >
          <div class="talent-icon">🌟</div>
          <div class="talent-info">
            <div class="talent-name">{{ talent.name }}</div>
            <div class="talent-progress">
              <div class="progress-bar-mini">
                <div class="progress-fill-mini" :style="{ width: talent.progressPercent + '%' }"></div>
              </div>
              <span class="progress-text-mini">Lv.{{ talent.level }}</span>
            </div>
          </div>
          <div class="talent-exp">
            <span class="exp-text">{{ talent.currentExp }} / {{ talent.nextLevelExp }}</span>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-talents">
        <div class="empty-icon">⭐</div>
        <div class="empty-text">暂无天赋进度记录</div>
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

// 天赋进度接口
interface TalentProgressItem {
  name: string;
  level: number;
  currentExp: number;
  nextLevelExp: number;
  totalExp: number;
  progressPercent: number;
}

const characterStore = useCharacterStore();

// 响应式数据
const loading = ref(false);
const mainTechnique = ref<string | null>(null);
const learnedSkills = ref<SkillItem[]>([]);
const talentProgresses = ref<TalentProgressItem[]>([]);
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

const realmData = computed(() => {
  const status = playerStatus.value;
  if (!status) return { name: '凡人', progress: 0, required: 10, description: '凡人境界' };
  
  return {
    name: status.境界?.名称 || '凡人',
    progress: status.境界?.当前进度 || 0,
    required: status.境界?.下一级所需 || 10,
    description: status.境界?.突破描述 || '持续修炼'
  };
});

const cultivationExp = computed(() => {
  const status = playerStatus.value;
  return {
    current: status?.修为?.当前 || 0,
    max: status?.修为?.最大 || 10
  };
});

const progressPercent = computed(() => {
  const realm = realmData.value;
  return realm.required > 0 ? (realm.progress / realm.required) * 100 : 0;
});

const totalSkillsCount = computed(() => {
  let count = 0;
  if (mainTechnique.value) count += 1;
  count += learnedSkills.value.length;
  return count;
});

const talentsCount = computed(() => talentProgresses.value.length);

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
      
      // 构建已学技能列表
      const skillsList: SkillItem[] = skills.已学技能.map(skillId => {
        const proficiency = skills.技能熟练度[skillId];
        let proficiencyData = null;
        
        if (proficiency) {
          const percent = (proficiency.下级所需 ?? 0) > 0 ? (proficiency.经验 / (proficiency.下级所需 ?? 0)) * 100 : 0;
          proficiencyData = {
            current: proficiency.经验,
            max: proficiency.下级所需 ?? 0,
            level: getProficiencyLevel(proficiency.等级),
            percent
          };
        }
        
        return {
          id: skillId,
          name: skillId,
          type: '功法技能',
          proficiency: proficiencyData
        };
      });
      
      learnedSkills.value = skillsList;
      
      // 构建天赋进度列表
      const talentsList: TalentProgressItem[] = Object.entries(skills.天赋进度).map(([talentName, progress]) => {
        const progressPercent = progress.下级所需 > 0 ? (progress.当前经验 / progress.下级所需) * 100 : 0;
        
        return {
          name: talentName,
          level: progress.等级,
          currentExp: progress.当前经验,
          nextLevelExp: progress.下级所需,
          totalExp: progress.总经验,
          progressPercent
        };
      });
      
      talentProgresses.value = talentsList;
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
      已学技能数: learnedSkills.value.length,
      天赋进度数: talentProgresses.value.length
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
  overflow: hidden;
  padding: 1rem;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #fde68a;
  flex-shrink: 0;
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
  color: #d97706;
}

.cultivation-count {
  font-size: 0.875rem;
  color: #f59e0b;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* 境界状态卡片 */
.realm-status-card {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #fde68a;
  padding: 1.25rem;
  flex-shrink: 0;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.realm-info {
  flex: 1;
  min-width: 0;
}

.current-realm {
  margin: 0 0 0.75rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #d97706;
}

.realm-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #fef3c7;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #d97706);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #d97706;
  white-space: nowrap;
}

.realm-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #92400e;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #d97706;
}

/* 按钮样式 */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #fde68a;
  border-radius: 0.5rem;
  background: white;
  color: #d97706;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.action-btn:hover:not(:disabled) {
  background: #fefce8;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.action-btn.primary:hover:not(:disabled) {
  background: #d97706;
}

.action-btn.secondary {
  background: white;
  color: #d97706;
}

.action-btn.secondary:hover:not(:disabled) {
  background: #fefce8;
}

.action-btn.mini {
  padding: 0.5rem;
  min-width: 2rem;
}

.btn-text {
  display: inline;
}

@media (max-width: 768px) {
  .btn-text {
    display: none;
  }
}

.status-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #fefce8;
  border-radius: 0.5rem;
}

.detail-label {
  font-size: 0.875rem;
  color: #92400e;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #d97706;
}

/* 主修功法卡片 */
.main-technique-card {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #fde68a;
  padding: 1.25rem;
  flex-shrink: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #d97706;
}

.choose-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.choose-btn:hover {
  background: #d97706;
  transform: translateY(-1px);
}

.technique-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fefce8;
  border-radius: 0.5rem;
  border: 1px solid #fde68a;
}

.technique-icon {
  font-size: 2rem;
  width: 3rem;
  text-align: center;
}

.technique-info {
  flex: 1;
  min-width: 0;
}

.technique-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: #d97706;
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
  color: #92400e;
  white-space: nowrap;
}

.proficiency-bar {
  flex: 1;
  height: 6px;
  background: #fde68a;
  border-radius: 3px;
  overflow: hidden;
}

.proficiency-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s ease;
}

.proficiency-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #059669;
  white-space: nowrap;
}

.technique-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-technique {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-text {
  font-size: 1rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: #a3a3a3;
}

/* 技能容器 - 修复滚动 */
.skills-container {
  flex: 1;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #fde68a;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.section-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #d97706;
}

.skill-count {
  font-size: 0.75rem;
  color: #92400e;
  background: #fefce8;
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.loading-spinner,
.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.loading-text,
.empty-text {
  font-size: 1rem;
  font-weight: 600;
  color: #d97706;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: #a3a3a3;
}

.skills-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  padding-right: 0.5rem;
  padding-bottom: 2rem;
  
  /* 改进的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(245, 158, 11, 0.3) rgba(243, 244, 246, 0.5);
}

/* Webkit 滚动条样式 */
.skills-list::-webkit-scrollbar {
  width: 8px;
}

.skills-list::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.skills-list::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.skills-list::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.5);
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fefce8;
  border: 1px solid #fde68a;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.skill-card:hover {
  background: white;
  border-color: #f59e0b;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
}

.skill-card.selected {
  background: white;
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
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
  color: #d97706;
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
  background: #fde68a;
  color: #92400e;
}

.skill-level {
  background: #dcfce7;
  color: #166534;
}

.skill-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar-small {
  flex: 1;
  height: 4px;
  background: #fde68a;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill-small {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s ease;
}

.progress-text-small {
  font-size: 0.75rem;
  color: #92400e;
  white-space: nowrap;
}

.skill-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* 技能详情面板 */
.skill-detail-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background: white;
  border-left: 1px solid #fde68a;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

@media (max-width: 768px) {
  .skill-detail-panel {
    position: fixed;
    width: 100%;
    left: 0;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  }
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #fde68a;
  flex-shrink: 0;
}

.detail-icon {
  font-size: 2rem;
}

.detail-info {
  flex: 1;
  min-width: 0;
}

.detail-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #d97706;
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
  background: #fefce8;
  color: #d97706;
}

.level-badge {
  background: #dcfce7;
  color: #166534;
}

.close-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: #fde68a;
  color: #d97706;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #fcd34d;
}

.detail-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #d97706;
}

.detail-section p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #6b7280;
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
  color: #374151;
}

.proficiency-level-text {
  font-size: 0.875rem;
  color: #10b981;
  font-weight: 600;
}

.progress-bar-large {
  width: 100%;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill-large {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s ease;
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.effect-item {
  padding: 0.5rem 0.75rem;
  background: #fefce8;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  color: #d97706;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #fde68a;
  flex-shrink: 0;
}

/* 天赋进度卡片 */
.talents-progress-card {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #fde68a;
  padding: 1.25rem;
  flex-shrink: 0;
}

.talent-count {
  font-size: 0.75rem;
  color: #92400e;
  background: #fefce8;
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
}

.talents-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
}

.talent-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #fefce8;
  border-radius: 0.5rem;
  border: 1px solid #fde68a;
}

.talent-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.talent-info {
  flex: 1;
  min-width: 0;
}

.talent-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #d97706;
  margin-bottom: 0.25rem;
}

.talent-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar-mini {
  flex: 1;
  height: 4px;
  background: #fde68a;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill-mini {
  height: 100%;
  background: linear-gradient(90deg, #a855f7, #7c3aed);
  transition: width 0.3s ease;
}

.progress-text-mini {
  font-size: 0.75rem;
  font-weight: 600;
  color: #7c3aed;
  white-space: nowrap;
}

.talent-exp {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.exp-text {
  font-size: 0.75rem;
  color: #92400e;
}

.empty-talents {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 深色主题适配 */
[data-theme="dark"] .cultivation-panel {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

[data-theme="dark"] .panel-header,
[data-theme="dark"] .realm-status-card,
[data-theme="dark"] .main-technique-card,
[data-theme="dark"] .skills-container,
[data-theme="dark"] .skill-detail-panel,
[data-theme="dark"] .talents-progress-card {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .panel-title,
[data-theme="dark"] .current-realm,
[data-theme="dark"] .card-header h4,
[data-theme="dark"] .section-header h4,
[data-theme="dark"] .detail-name {
  color: #f1f5f9;
}

[data-theme="dark"] .detail-item,
[data-theme="dark"] .technique-display,
[data-theme="dark"] .skill-card,
[data-theme="dark"] .talent-item {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .skill-card:hover {
  background: #1e293b;
}

[data-theme="dark"] .action-btn {
  background: #334155;
  border-color: #475569;
  color: #cbd5e1;
}

[data-theme="dark"] .action-btn:hover {
  background: #475569;
}

[data-theme="dark"] .action-btn.primary {
  background: #f59e0b;
  color: white;
}
</style>