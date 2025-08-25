<template>
  <div class="skills-panel">
    <!-- 头部统计 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">📚</div>
        <div class="header-info">
          <h3 class="panel-title">道法技艺</h3>
          <span class="skills-count">{{ totalSkillsCount }}项技艺</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refreshSkillsData" :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span class="btn-text">刷新</span>
        </button>
      </div>
    </div>

    <!-- 技艺分类筛选 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <button 
          v-for="category in skillCategories" 
          :key="category.key"
          class="filter-tab"
          :class="{ active: activeFilter === category.key }"
          @click="setActiveFilter(category.key)"
        >
          <span class="tab-icon">{{ category.icon }}</span>
          <span class="tab-name">{{ category.name }}</span>
          <span class="tab-count">{{ getCategoryCount(category.key) }}</span>
        </button>
      </div>
    </div>

    <!-- 技艺列表 -->
    <div class="skills-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <div class="loading-text">正在加载技艺数据...</div>
      </div>
      
      <div v-else-if="filteredSkills.length === 0" class="empty-state">
        <div class="empty-icon">📖</div>
        <div class="empty-text">{{ getEmptyText() }}</div>
        <div class="empty-hint">通过修炼和实践可以获得各种技艺</div>
      </div>

      <div v-else class="skills-list">
        <div 
          v-for="skill in filteredSkills" 
          :key="skill.name"
          class="skill-card"
          :class="getProficiencyClass(skill.proficiency)"
          @click="selectSkill(skill)"
        >
          <div class="skill-icon">{{ getSkillIcon(skill.name) }}</div>
          
          <div class="skill-info">
            <div class="skill-name">{{ skill.name }}</div>
            <div class="skill-level">{{ skill.levelName }}</div>
            <div class="skill-description">{{ skill.description }}</div>
            
            <div class="proficiency-section">
              <div class="proficiency-bar">
                <div 
                  class="proficiency-fill" 
                  :style="{ width: getProficiencyPercent(skill.proficiency) + '%' }"
                ></div>
              </div>
              <div class="proficiency-text">
                {{ skill.proficiency }} / {{ getNextLevelRequirement(skill.proficiency) }}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RefreshCw } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';

interface Skill {
  name: string;
  proficiency: number;
  levelName: string;
  description: string;
  category: string;
}

const characterStore = useCharacterStore();
const loading = ref(false);
const activeFilter = ref('all');

// 技艺数据
const skillsData = ref<any>(null);

// 技艺分类
const skillCategories = [
  { key: 'all', name: '全部', icon: '📚' },
  { key: '炼丹', name: '炼丹', icon: '💊' },
  { key: '炼器', name: '炼器', icon: '⚔️' },
  { key: '符箓', name: '符箓', icon: '📜' },
  { key: '阵法', name: '阵法', icon: '🔮' },
  { key: '其他', name: '其他', icon: '✨' }
];

// 解析技艺数据
const allSkills = computed((): Skill[] => {
  if (!skillsData.value || !Array.isArray(skillsData.value[0])) {
    return [];
  }

  const skills: Skill[] = [];
  const skillsArray = skillsData.value[0];

  skillsArray.forEach((skillObj: any) => {
    if (typeof skillObj === 'object' && skillObj !== null) {
      Object.entries(skillObj).forEach(([skillName, skillData]: [string, any]) => {
        if (skillName !== '$__META_EXTENSIBLE__$' && Array.isArray(skillData) && skillData.length >= 3) {
          skills.push({
            name: skillName,
            proficiency: skillData[0],
            levelName: skillData[1],
            description: skillData[2],
            category: skillName
          });
        }
      });
    }
  });

  return skills;
});

// 筛选后的技艺
const filteredSkills = computed(() => {
  if (activeFilter.value === 'all') {
    return allSkills.value;
  }
  return allSkills.value.filter(skill => skill.category === activeFilter.value);
});

// 总技艺数量
const totalSkillsCount = computed(() => allSkills.value.length);

// 获取分类数量
const getCategoryCount = (category: string): number => {
  if (category === 'all') return allSkills.value.length;
  return allSkills.value.filter(skill => skill.category === category).length;
};

// 获取空状态文本
const getEmptyText = (): string => {
  if (activeFilter.value === 'all') return '尚未掌握任何技艺';
  const category = skillCategories.find(c => c.key === activeFilter.value);
  return `尚未掌握${category?.name}技艺`;
};

// 获取技艺图标
const getSkillIcon = (skillName: string): string => {
  const iconMap: Record<string, string> = {
    '炼丹': '💊',
    '炼器': '⚔️',
    '符箓': '📜',
    '阵法': '🔮'
  };
  return iconMap[skillName] || '✨';
};

// 获取熟练度等级样式
const getProficiencyClass = (proficiency: number): string => {
  if (proficiency >= 3600) return 'master';
  if (proficiency >= 2800) return 'grandmaster';  
  if (proficiency >= 2100) return 'expert';
  if (proficiency >= 1500) return 'advanced';
  if (proficiency >= 1000) return 'intermediate';
  if (proficiency >= 600) return 'basic';
  if (proficiency >= 300) return 'novice';
  if (proficiency >= 100) return 'beginner';
  if (proficiency >= 1) return 'apprentice';
  return 'none';
};

// 获取熟练度百分比
const getProficiencyPercent = (proficiency: number): number => {
  const nextLevel = getNextLevelRequirement(proficiency);
  const currentLevelMin = getCurrentLevelMin(proficiency);
  return Math.min(100, ((proficiency - currentLevelMin) / (nextLevel - currentLevelMin)) * 100);
};

// 获取当前等级最小值
const getCurrentLevelMin = (proficiency: number): number => {
  if (proficiency >= 3600) return 3600;
  if (proficiency >= 2800) return 2800;
  if (proficiency >= 2100) return 2100;
  if (proficiency >= 1500) return 1500;
  if (proficiency >= 1000) return 1000;
  if (proficiency >= 600) return 600;
  if (proficiency >= 300) return 300;
  if (proficiency >= 100) return 100;
  if (proficiency >= 1) return 1;
  return 0;
};

// 获取下一级要求
const getNextLevelRequirement = (proficiency: number): number => {
  if (proficiency >= 3600) return 4000; // 已经是最高级
  if (proficiency >= 2800) return 3600;
  if (proficiency >= 2100) return 2800;
  if (proficiency >= 1500) return 2100;
  if (proficiency >= 1000) return 1500;
  if (proficiency >= 600) return 1000;
  if (proficiency >= 300) return 600;
  if (proficiency >= 100) return 300;
  if (proficiency >= 1) return 100;
  return 1;
};

// 设置活跃筛选器
const setActiveFilter = (filterKey: string) => {
  activeFilter.value = filterKey;
};

// 选择技艺
const selectSkill = (skill: Skill) => {
  toast.info(`查看${skill.name}详情`);
};

// 修炼技艺（移除按钮后不再需要）
// const practiceSkill = (skillName: string) => {
//   toast.info(`开始修炼${skillName}`);
// };

// 刷新技艺数据
const refreshSkillsData = async () => {
  loading.value = true;
  try {
    await loadSkillsData();
    toast.success('技艺数据已刷新');
  } catch (error) {
    console.error('[道法技艺] 刷新失败:', error);
    toast.error('刷新失败');
  } finally {
    loading.value = false;
  }
};

// 加载技艺数据
const loadSkillsData = async () => {
  try {
    // 首先从角色存档中加载
    const activeSave = characterStore.activeSaveSlot;
    if (activeSave?.存档数据?.道法技艺) {
      skillsData.value = activeSave.存档数据.道法技艺;
      console.log('[道法技艺] 从存档加载数据:', skillsData.value);
    }

    // 尝试从酒馆变量获取更新的数据
    const helper = getTavernHelper();
    if (helper) {
      const chatVars = await helper.getVariables({ type: 'chat' });
      
      // 检查酒馆中的技艺数据
      if (chatVars['character.skills'] || chatVars['道法技艺']) {
        const tavernSkills = chatVars['character.skills'] || chatVars['道法技艺'];
        if (tavernSkills) {
          skillsData.value = tavernSkills;
          console.log('[道法技艺] 从酒馆加载数据:', skillsData.value);
        }
      }
    }

    // 如果没有数据，创建默认结构
    if (!skillsData.value) {
      skillsData.value = [
        [
          {
            "炼丹": [0, "一窍不通", "【丹道之术】炼制各种丹药的玄妙技艺。熟练度影响成丹率、丹药品质和炼制速度。高深者可炼制起死回生之仙丹。"]
          },
          {
            "炼器": [0, "一窍不通", "【器道之术】锻造法器、灵器的高深技艺。熟练度影响成器率、器物品质和锻造效率。大师可铸造开天辟地之神兵。"]
          },
          {
            "符箓": [0, "一窍不通", "【符道之术】绘制各种符箓的神秘技艺。熟练度影响成符率、符箓威力和绘制速度。高手可绘制移山填海之神符。"]
          },
          {
            "阵法": [0, "一窍不通", "【阵道之术】布置和破解阵法的玄奥技艺。熟练度影响阵法威力、布阵速度和破阵成功率。宗师可布下困仙锁神之大阵。"]
          }
        ],
        "【道法技艺熟练度系统】记录各种修仙功法、技艺的掌握程度，技艺的熟练度对成品的质量，数量和制作的效率有提升。技艺境界划分：一窍不通(0)、初窥门径(1-99)、略知皮毛(100-299)、小有所成(300-599)、融会贯通(600-999)、登堂入室(1000-1499)、炉火纯青(1500-2099)、出神入化(2100-2799)、返璞归真(2800-3599)、登峰造极(3600+)。每个技艺对象结构：[熟练度数值, '当前境界名称', '技艺描述及作用']。熟练度通过实践操作、研读典籍、名师传授等方式提升。境界越高，可掌握的配方、手法、秘术越玄妙。"
      ];
      console.log('[道法技艺] 创建默认数据结构');
    }

  } catch (error) {
    console.error('[道法技艺] 加载数据失败:', error);
  }
};

onMounted(() => {
  loadSkillsData();
});
</script>

<style scoped>
.skills-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  overflow: hidden;
  padding: 1rem;
  gap: 1rem;
  position: relative;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #bae6fd;
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
  color: #0369a1;
}

.skills-count {
  font-size: 0.875rem;
  color: #0284c7;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #bae6fd;
  border-radius: 0.5rem;
  background: white;
  color: #0369a1;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.action-btn:hover {
  background: #f0f9ff;
  border-color: #0284c7;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 筛选器 */
.filter-section {
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #bae6fd;
  flex-shrink: 0;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #bae6fd;
  border-radius: 1.5rem;
  background: white;
  color: #0284c7;
  font-size: 0.875rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.filter-tab:hover {
  background: #f0f9ff;
}

.filter-tab.active {
  background: #0284c7;
  color: white;
}

.tab-count {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  min-width: 1.25rem;
  text-align: center;
}

.filter-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.2);
}

/* 技艺容器 */
.skills-container {
  flex: 1;
  padding: 0 1rem 1rem 1rem;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 3rem;
  
  /* 改进的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(2, 132, 199, 0.3) rgba(243, 244, 246, 0.5);
}

/* Webkit 滚动条样式 */
.skills-container::-webkit-scrollbar {
  width: 8px;
}

.skills-container::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.skills-container::-webkit-scrollbar-thumb {
  background: rgba(2, 132, 199, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.skills-container::-webkit-scrollbar-thumb:hover {
  background: rgba(2, 132, 199, 0.5);
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
  color: #0369a1;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: #9ca3af;
}

/* 技艺列表 */
.skills-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skill-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #bae6fd;
  cursor: pointer;
  transition: all 0.2s ease;
}

.skill-card:hover {
  background: #f0f9ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.15);
}

.skill-icon {
  font-size: 2rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f9ff;
  border-radius: 50%;
  flex-shrink: 0;
}

.skill-info {
  flex: 1;
  min-width: 0;
}

.skill-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 0.25rem;
}

.skill-level {
  font-size: 0.875rem;
  color: #0284c7;
  margin-bottom: 0.5rem;
}

.skill-description {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.4;
  margin-bottom: 0.75rem;
}

.proficiency-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.proficiency-bar {
  height: 0.5rem;
  background: #e2e8f0;
  border-radius: 0.25rem;
  overflow: hidden;
}

.proficiency-fill {
  height: 100%;
  background: linear-gradient(90deg, #0284c7, #0369a1);
  transition: width 0.3s ease;
}

.proficiency-text {
  font-size: 0.75rem;
  color: #64748b;
}


/* 熟练度等级样式 */
.skill-card.none { border-left: 4px solid #6b7280; }
.skill-card.apprentice { border-left: 4px solid #84cc16; }
.skill-card.beginner { border-left: 4px solid #22c55e; }
.skill-card.novice { border-left: 4px solid #06b6d4; }
.skill-card.basic { border-left: 4px solid #3b82f6; }
.skill-card.intermediate { border-left: 4px solid #8b5cf6; }
.skill-card.advanced { border-left: 4px solid #d946ef; }
.skill-card.expert { border-left: 4px solid #f59e0b; }
.skill-card.grandmaster { border-left: 4px solid #ef4444; }
.skill-card.master { border-left: 4px solid #dc2626; }

/* 响应式设计 */
@media (max-width: 768px) {
  .skills-panel {
    gap: 0.75rem;
  }
  
  .skill-card {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .header-actions .btn-text {
    display: none;
  }
}

/* 深色主题 */
[data-theme="dark"] .skills-panel {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
}

[data-theme="dark"] .panel-header,
[data-theme="dark"] .filter-section,
[data-theme="dark"] .skill-card {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .panel-title,
[data-theme="dark"] .skill-name {
  color: #0ea5e9;
}

[data-theme="dark"] .skills-count,
[data-theme="dark"] .skill-level {
  color: #38bdf8;
}

[data-theme="dark"] .action-btn,
[data-theme="dark"] .filter-tab {
  background: #374151;
  border-color: #475569;
  color: #0ea5e9;
}

[data-theme="dark"] .action-btn:hover,
[data-theme="dark"] .filter-tab:hover {
  background: #475569;
}

[data-theme="dark"] .filter-tab.active {
  background: #0ea5e9;
  color: white;
}

[data-theme="dark"] .skill-card:hover {
  background: #374151;
}

[data-theme="dark"] .skill-icon {
  background: #374151;
}
</style>