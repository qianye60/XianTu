<template>
  <div class="skills-content">
    <!-- 修炼心法功法区域 -->
    <div class="cultivation-section">
      <div class="section-header">
        <h3>修炼功法</h3>
        <span class="section-subtitle">当前修炼的功法技能</span>
      </div>
      
      <div class="skill-slots-grid">
        <!-- 功法槽位 -->
        <div class="skill-slot-group">
          <h4 class="slot-group-title">功法</h4>
          <div 
            class="skill-slot technique-method"
            :class="{ 'has-skill': cultivationSkills.功法 }"
            @click="selectSkill(cultivationSkills.功法, '功法')"
          >
            <div v-if="cultivationSkills.功法" class="skill-info">
              <div class="skill-icon" :class="getSkillQualityClass(cultivationSkills.功法)">
                <span class="skill-type-text">功</span>
              </div>
              <div class="skill-details">
                <div class="skill-name" :class="getSkillQualityClass(cultivationSkills.功法, 'text')">
                  {{ cultivationSkills.功法.名称 }}
                </div>
                <div class="skill-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: `${cultivationSkills.功法.修炼进度 || 0}%` }"></div>
                  </div>
                  <span class="progress-text">{{ cultivationSkills.功法.修炼进度 || 0 }}%</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-slot">
              <div class="empty-icon">⚡</div>
              <span>功法槽位</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 功法详情侧边栏 -->
    <div class="skill-details-sidebar">
      <div v-if="selectedSkillData" class="skill-details-content">
        <div class="details-header">
          <div class="details-icon-large" :class="getSkillQualityClass(selectedSkillData)">
            <span class="skill-type-text-large">{{ getSkillTypeIcon(selectedSkillSlot) }}</span>
          </div>
          <div class="details-title-area">
            <h3 :class="getSkillQualityClass(selectedSkillData, 'text')">{{ selectedSkillData.名称 }}</h3>
            <div class="details-meta">{{ selectedSkillSlot }} / {{ selectedSkillData.品质?.quality || '凡品' }}</div>
          </div>
        </div>
        
        <div class="details-body">
          <p class="details-description">{{ selectedSkillData.描述 }}</p>
          
          <!-- 功法等级 -->
          <div class="technique-level-section">
            <h4>功法品质</h4>
            <div class="quality-display" :class="getSkillQualityClass(selectedSkillData, 'text')">
              {{ selectedSkillData.品质?.quality || '凡' }}品{{ selectedSkillData.品质?.grade || 0 }}级
            </div>
          </div>
          
          <!-- 修炼进度 -->
          <div class="cultivation-progress-section">
            <h4>修炼进度</h4>
            <div class="progress-container">
              <div class="progress-bar-large">
                <div class="progress-fill" :style="{ width: `${selectedSkillData.修炼进度 || 0}%` }"></div>
              </div>
              <span class="progress-percentage">{{ selectedSkillData.修炼进度 || 0 }}%</span>
            </div>
            <div v-if="cultivationSkills.熟练度" class="proficiency-info">
              熟练度: {{ cultivationSkills.熟练度 }}%
            </div>
          </div>
          
          <!-- 功法效果 -->
          <div v-if="selectedSkillData.功法效果" class="skill-effects-section">
            <h4>功法效果</h4>
            <div class="effect-details">
              <div v-if="selectedSkillData.功法效果.修炼速度加成" class="effect-item">
                <span class="effect-label">修炼速度:</span>
                <span class="effect-value">+{{ (selectedSkillData.功法效果.修炼速度加成 * 100).toFixed(0) }}%</span>
              </div>
              <div v-if="selectedSkillData.功法效果.属性加成" class="effect-item">
                <span class="effect-label">属性加成:</span>
                <span class="effect-value">{{ formatAttributeBonus(selectedSkillData.功法效果.属性加成) }}</span>
              </div>
              <div v-if="selectedSkillData.功法效果.特殊能力?.length" class="effect-item">
                <span class="effect-label">特殊能力:</span>
                <div class="special-abilities">
                  <span v-for="ability in selectedSkillData.功法效果.特殊能力" :key="ability" class="ability-tag">
                    {{ ability }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 功法技能 -->
          <div v-if="selectedSkillData.功法技能 && Object.keys(selectedSkillData.功法技能).length > 0" class="technique-skills-section">
            <h4>功法技能</h4>
            <div class="skills-list">
              <div v-for="(skill, skillName) in selectedSkillData.功法技能" :key="skillName" class="skill-item">
                <div class="skill-header">
                  <span class="skill-name">{{ skillName }}</span>
                  <span class="skill-type" :class="`type-${skill.技能类型}`">{{ skill.技能类型 }}</span>
                </div>
                <div class="skill-description">{{ skill.技能描述 }}</div>
                <div class="skill-unlock">{{ skill.解锁条件 }}</div>
                <div v-if="unlockedSkillsMap.has(String(skillName))" class="skill-status unlocked">已解锁</div>
                <div v-else class="skill-status locked">未解锁</div>
              </div>
            </div>
          </div>
          
          <!-- 已解锁技能 -->
          <div v-if="cultivationSkills.已解锁技能?.length" class="unlocked-skills-section">
            <h4>已掌握技能</h4>
            <div class="unlocked-skills">
              <span v-for="skill in cultivationSkills.已解锁技能" :key="skill" class="unlocked-skill-tag">
                {{ skill }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="details-actions">
          <button class="action-btn cultivate-btn" @click="cultivateSkill">深度修炼</button>
          <button class="action-btn unequip-btn" @click="unequipSkill">卸下功法</button>
        </div>
      </div>
      <div v-else class="details-placeholder">
        <div class="placeholder-icon">🧘</div>
        <p>选择功法查看详情</p>
        <span class="placeholder-tip">从背包中装备功法开始修炼</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';

// 定义功法技能接口
interface TechniqueSkill {
  解锁条件: string;
  技能描述: string;
  技能类型: '攻击' | '防御' | '辅助' | '移动' | '其他';
}

const characterStore = useCharacterStore();
const selectedSkillData = ref<any | null>(null);
const selectedSkillSlot = ref<string>('');

// 修炼功法数据
const cultivationSkills = computed(() => {
  const saveData = characterStore.activeSaveSlot?.存档数据;
  if (!saveData?.修炼功法) {
    return {
      功法: null
    };
  }
  return saveData.修炼功法;
});

// 选择技能
const selectSkill = (skill: any, slotName: string) => {
  selectedSkillData.value = skill;
  selectedSkillSlot.value = slotName;
};

// 获取功法品质样式类
const getSkillQualityClass = (skill: any, type: 'border' | 'text' = 'border'): string => {
  if (!skill) return '';
  const quality = skill.品质?.quality || '凡';
  return `${type}-quality-${quality}`;
};

// 获取功法类型图标
const getSkillTypeIcon = (slotName: string): string => {
  if (slotName === '功法') return '功';
  return '技';
};

// 格式化功法效果
const formatSkillEffects = (effects: any): string => {
  if (!effects || typeof effects !== 'object') {
    return '无特殊效果';
  }
  
  const effectsArray = Object.entries(effects).map(([key, value]) => `${key}: ${value}`);
  return effectsArray.join('、') || '无特殊效果';
};

// 格式化属性加成
const formatAttributeBonus = (bonus: any): string => {
  if (!bonus || typeof bonus !== 'object') {
    return '无';
  }
  
  const bonusArray = Object.entries(bonus).map(([key, value]) => `${key}+${value}`);
  return bonusArray.join('、') || '无';
};

// 计算已解锁技能的 Set，优化查询性能
const unlockedSkillsMap = computed(() => {
  return new Set(cultivationSkills.value.已解锁技能 || []);
});

// 检查是否可以解锁新技能
const checkSkillUnlock = (skillName: string, unlockCondition: string): boolean => {
  const currentProgress = selectedSkillData.value?.修炼进度 || 0;
  const currentProficiency = cultivationSkills.value.熟练度 || 0;
  
  // 简单的解锁条件解析
  if (unlockCondition.includes('熟练度达到')) {
    const match = unlockCondition.match(/熟练度达到(\d+)%/);
    if (match) {
      const required = parseInt(match[1]);
      return currentProficiency >= required;
    }
  }
  
  if (unlockCondition.includes('修炼进度达到')) {
    const match = unlockCondition.match(/修炼进度达到(\d+)%/);
    if (match) {
      const required = parseInt(match[1]);
      return currentProgress >= required;
    }
  }
  
  return false;
};

// 深度修炼功法
const cultivateSkill = async () => {
  if (!selectedSkillData.value || !selectedSkillSlot.value) {
    return;
  }
  
  console.log('[技能面板] 深度修炼:', selectedSkillData.value.名称);
  
  try {
    // 增加修炼进度（这里是示例逻辑）
    const currentProgress = selectedSkillData.value.修炼进度 || 0;
    const newProgress = Math.min(100, currentProgress + 10); // 每次增加10%
    
    // 更新存档数据
    if (characterStore.activeSaveSlot?.存档数据?.修炼功法) {
      const skillSlots = characterStore.activeSaveSlot.存档数据.修炼功法;
      if (skillSlots.功法) {
        // 更新功法修炼进度
        skillSlots.功法.修炼进度 = newProgress;
        
        // 更新熟练度 (基于修炼进度计算)
        const newProficiency = Math.min(100, (skillSlots.熟练度 || 0) + 5);
        skillSlots.熟练度 = newProficiency;
        
        // 检查是否可以解锁新技能
        if (selectedSkillData.value.功法技能) {
          const unlockedSkills = skillSlots.已解锁技能 || [];
          
          for (const [skillName, skill] of Object.entries(selectedSkillData.value.功法技能)) {
            const skillData = skill as TechniqueSkill;
            if (!unlockedSkills.includes(skillName) && checkSkillUnlock(skillName, skillData.解锁条件)) {
              unlockedSkills.push(skillName);
              console.log(`[技能面板] 解锁新技能: ${skillName}`);
            }
          }
          
          skillSlots.已解锁技能 = unlockedSkills;
        }
      }
      
      await characterStore.commitToStorage();
      console.log('[技能面板] 修炼进度提升至:', newProgress);
    }
    
  } catch (error) {
    console.error('[技能面板] 修炼失败:', error);
  }
};

// 卸下功法
const unequipSkill = async () => {
  if (!selectedSkillData.value || !selectedSkillSlot.value) {
    return;
  }
  
  // 确认卸下
  if (!confirm(`确定要卸下 ${selectedSkillData.value.名称} 吗？`)) {
    return;
  }
  
  console.log('[技能面板] 卸下功法:', selectedSkillData.value.名称);
  
  try {
    // 从修炼槽位移除
    if (characterStore.activeSaveSlot?.存档数据?.修炼功法) {
      const skillSlots = characterStore.activeSaveSlot.存档数据.修炼功法;
      skillSlots.功法 = null;
      
      await characterStore.commitToStorage();
      console.log('[技能面板] 功法卸下成功');
      
      // 清除选择
      selectedSkillData.value = null;
      selectedSkillSlot.value = '';
    }
    
  } catch (error) {
    console.error('[技能面板] 卸下失败:', error);
  }
};

onMounted(async () => {
  console.log('[技能面板] 组件挂载，同步酒馆数据...');
  
  try {
    await characterStore.syncFromTavern();
  } catch (error) {
    console.error('[技能面板] 同步数据失败:', error);
  }
});
</script>

<style scoped>
.skills-content {
  width: 100%;
  height: 100%;
  display: flex;
  background: var(--color-background);
  overflow: hidden;
}

/* 修炼区域 */
.cultivation-section {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.section-header {
  margin-bottom: 24px;
  text-align: center;
}

.section-header h3 {
  margin: 0 0 4px 0;
  color: var(--color-warning);
  font-size: 1.5rem;
  font-weight: 600;
}

.section-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

/* 技能槽位网格 */
.skill-slots-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.skill-slot-group {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
}

.slot-group-title {
  margin: 0 0 16px 0;
  color: var(--color-accent);
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
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

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success), var(--color-info));
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

/* 详情侧边栏 */
.skill-details-sidebar {
  width: 320px;
  border-left: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
}

.skill-details-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.details-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 16px;
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
  font-size: 1.1rem;
  font-weight: 600;
}

.details-meta {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.details-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.details-description {
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 20px;
}

/* 修炼进度部分 */
.cultivation-progress-section {
  margin-bottom: 20px;
}

.cultivation-progress-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar-large {
  flex: 1;
  height: 12px;
  background: var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.progress-percentage {
  font-weight: 600;
  color: var(--color-success);
  min-width: 40px;
}

/* 功法效果部分 */
.skill-effects-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

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

/* 操作按钮 */
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
.technique-skills-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

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
.unlocked-skills-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

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

/* 响应式设计 */
@media (max-width: 768px) {
  .skills-content {
    flex-direction: column;
  }
  
  .skill-details-sidebar {
    width: 100%;
    max-height: 300px;
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
  
  .cultivation-section {
    padding: 16px;
  }
  
  .skill-slot {
    min-height: 60px;
    padding: 12px;
  }
  
  .skill-icon {
    width: 40px;
    height: 40px;
  }
  
  .skill-type-text {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .section-header h3 {
    font-size: 1.3rem;
  }
  
  .skill-slot-group {
    padding: 16px;
  }
  
  .skill-info {
    gap: 8px;
  }
  
  .details-header {
    padding: 16px;
    gap: 12px;
  }
  
  .details-icon-large {
    width: 50px;
    height: 50px;
  }
  
  .skill-type-text-large {
    font-size: 20px;
  }
}
</style>