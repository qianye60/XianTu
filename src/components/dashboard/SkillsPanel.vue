<template>
  <div class="skills-content">
    <!-- 修炼心法功法区域 -->
    <div class="cultivation-section">

      <div class="skill-slots-grid">
        <!-- 功法槽位 -->
        <div class="skill-slot-group">
          <div
            class="skill-slot technique-method"
            :class="{ 'has-skill': cultivationSkills.功法 }"
            @click="selectSkill(cultivationSkills.功法, '功法')"
            @mouseenter="onSkillHover(cultivationSkills.功法, '功法')"
          >
            <div v-if="cultivationSkills.功法" class="skill-info">
              <div class="skill-icon" :class="getSkillQualityClass(cultivationSkills.功法)">
                <span class="skill-type-text">功</span>
              </div>
              <div class="skill-details">
                <div class="skill-name" :class="getSkillQualityClass(cultivationSkills.功法, 'text')">
                  {{ (cultivationSkills.功法 as { 名称: string }).名称 }}
                </div>
                <div class="skill-progress">
                  <div class="progress-flex">
                    <ProgressBar
                      v-bind="{
                        value: Math.min(100, Math.max(0, (cultivationSkills.功法 as { 修炼进度?: number }).修炼进度 || 0)),
                        max: 100,
                        size: 'sm',
                        showLabel: false
                      }"
                    />
                  </div>
                  <span class="progress-text">{{ Math.min(100, Math.max(0, (cultivationSkills.功法 as { 修炼进度?: number }).修炼进度 || 0)).toFixed(0) }}%</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-slot">
              <div class="empty-icon">⚡</div>
              <span>功法槽位</span>
            </div>
          </div>
        </div>

        <!-- 背包中的功法物品 -->
        <div class="inventory-techniques-group">
          <h4 class="slot-group-title">背包功法</h4>
          <div class="techniques-grid">
            <div v-if="inventoryTechniques.length === 0" class="empty-inventory">
              <div class="empty-icon">📚</div>
              <span>暂无功法物品</span>
              <small>从背包面板装备功法</small>
            </div>
            <div
              v-for="technique in inventoryTechniques"
              :key="(technique as { 物品ID?: string }).物品ID"
              class="technique-card"
              :class="getSkillQualityClass(technique)"
              @click="selectInventoryTechnique(technique)"
              @mouseenter="onSkillHover(technique, '背包功法')"
            >
              <div class="technique-icon" :class="getSkillQualityClass(technique)">
                <span class="technique-type-text">功</span>
              </div>
              <div class="technique-info">
                <div class="technique-name" :class="getSkillQualityClass(technique, 'text')">
                  {{ (technique as { 名称: string }).名称 }}
                </div>
                <div class="technique-quality">
                  {{ ((technique as { 品质?: { quality?: string } }).品质?.quality || '凡') }}品{{ ((technique as { 品质?: { grade?: number } }).品质?.grade || 0) }}级
                </div>
              </div>
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
            <h3 :class="getSkillQualityClass(selectedSkillData, 'text')">{{ (selectedSkillData as { 名称: string }).名称 }}</h3>
            <div class="details-meta">{{ selectedSkillSlot }} / {{ ((selectedSkillData as { 品质?: { quality?: string } }).品质?.quality || '凡品') }}</div>
          </div>
        </div>

        <div class="details-body">
          <p class="details-description">{{ (selectedSkillData as { 描述?: string }).描述 }}</p>

          <!-- 修炼概览 -->
          <div v-if="selectedSkillSlot === '功法'" class="overview-section">
            <h4>修炼概览:</h4>
            <div class="overview-grid">
              <div class="overview-item">
                <span class="label">熟练度</span>
                <div class="value with-bar">
                  <ProgressBar v-bind="{ value: Math.min(100, Math.max(0, cultivationSkills.熟练度 || 0)), max: 100, size: 'sm', showLabel: false }" />
                  <span class="num">{{ Math.min(100, Math.max(0, cultivationSkills.熟练度 || 0)).toFixed(0) }}%</span>
                </div>
              </div>
              <div class="overview-item">
                <span class="label">修炼时间</span>
                <span class="value">{{ formatHoursToReadable(cultivationSkills.修炼时间 || 0) }}</span>
              </div>
              <div class="overview-item">
                <span class="label">突破次数</span>
                <span class="value">{{ cultivationSkills.突破次数 || 0 }}</span>
              </div>
              <div class="overview-item" v-if="(selectedSkillData as { 功法技能?: Record<string, unknown> }).功法技能">
                <span class="label">技能掌握</span>
                <span class="value">{{ (cultivationSkills.已解锁技能?.length || 0) }} / {{ Object.keys(((selectedSkillData as { 功法技能?: Record<string, unknown> }).功法技能 || {})).length }}</span>
              </div>
            </div>
          </div>

          <!-- 功法等级 -->
          <div class="technique-level-section">
            <h4>功法品质:</h4>
            <div class="quality-display" :class="getSkillQualityClass(selectedSkillData, 'text')">
              {{ ((selectedSkillData as { 品质?: { quality?: string } }).品质?.quality || '凡') }}品{{ ((selectedSkillData as { 品质?: { grade?: number } }).品质?.grade || 0) }}级
            </div>
          </div>

          <!-- 修炼进度 -->
          <div v-if="selectedSkillSlot === '功法' && cultivationSkills.功法" class="cultivation-progress-section">
            <h4>修炼进度:</h4>
            <div class="progress-container">
              <ProgressBar
              v-bind="{
                value: Math.min(100, Math.max(0, (selectedSkillData as { 熟练度?: number }).熟练度 || cultivationSkills.熟练度 || 0)),
                max: 100,
                size: 'lg',
                showLabel: true
              }"
              />
            </div>
          </div>

          <!-- 功法效果 -->
          <div v-if="(selectedSkillData as { 功法效果?: unknown }).功法效果" class="skill-effects-section">
            <h4>功法效果:</h4>
            <div class="effect-details">
              <div v-if="((selectedSkillData as { 功法效果?: { 修炼速度加成?: number } }).功法效果 as { 修炼速度加成?: number })?.修炼速度加成" class="effect-item">
                <span class="effect-label">修炼速度:</span>
                <span class="effect-value">+{{ (((selectedSkillData as { 功法效果?: { 修炼速度加成?: number } }).功法效果 as { 修炼速度加成?: number })?.修炼速度加成! * 100).toFixed(0) }}%</span>
              </div>
              <div v-if="((selectedSkillData as { 功法效果?: { 属性加成?: unknown } }).功法效果 as { 属性加成?: unknown })?.属性加成" class="effect-item">
                <span class="effect-label">属性加成:</span>
                <span class="effect-value">{{ formatAttributeBonus(((selectedSkillData as { 功法效果?: { 属性加成?: unknown } }).功法效果 as { 属性加成?: unknown })?.属性加成) }}</span>
              </div>
              <div v-if="((selectedSkillData as { 功法效果?: { 特殊能力?: string[] } }).功法效果 as { 特殊能力?: string[] })?.特殊能力?.length" class="effect-item">
                <span class="effect-label">特殊能力:</span>
                <div class="special-abilities">
                  <span v-for="ability in ((selectedSkillData as { 功法效果?: { 特殊能力?: string[] } }).功法效果 as { 特殊能力?: string[] })?.特殊能力" :key="ability" class="ability-tag">
                    {{ ability }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 功法技能 -->
          <div v-if="(selectedSkillData as { 功法技能?: Record<string, unknown> }).功法技能 && Object.keys((selectedSkillData as { 功法技能?: Record<string, unknown> }).功法技能!).length > 0" class="technique-skills-section">
            <h4>功法技能:</h4>
            <div class="skills-list">
              <div v-for="(skill, skillName) in (selectedSkillData as { 功法技能?: Record<string, unknown> }).功法技能" :key="skillName" class="skill-item">
                <div class="skill-header">
                  <span class="skill-name">{{ skillName }}</span>
                  <span class="skill-type" :class="`type-${(skill as TechniqueSkill).技能类型}`">{{ (skill as TechniqueSkill).技能类型 }}</span>
                </div>
                <div class="skill-description">{{ (skill as TechniqueSkill).技能描述 }}</div>
                <div class="skill-unlock">{{ (skill as TechniqueSkill).解锁条件 }}</div>
                <div v-if="unlockedSkillsMap.has(String(skillName))" class="skill-status unlocked">已解锁</div>
                <div v-else class="skill-status locked">未解锁</div>
              </div>
            </div>
          </div>

          <!-- 已解锁技能 -->
          <div v-if="selectedSkillSlot === '功法' && cultivationSkills.已解锁技能?.length" class="unlocked-skills-section">
            <h4>已掌握技能:</h4>
            <div class="unlocked-skills">
              <span v-for="skill in cultivationSkills.已解锁技能" :key="skill" class="unlocked-skill-tag">
                {{ skill }}
              </span>
            </div>
          </div>
        </div>

        <div class="details-actions">
          <button v-if="selectedSkillSlot === '功法'" class="action-btn cultivate-btn" @click="showCultivationDialog">深度修炼</button>
          <button v-if="selectedSkillSlot === '功法'" class="action-btn unequip-btn" @click="unequipSkill">卸下功法</button>
          <button v-if="selectedSkillSlot === '背包功法'" class="action-btn equip-btn" @click="equipTechnique">装备修炼</button>
        </div>
      </div>
      <div v-else class="details-placeholder">
        <div class="placeholder-icon">🧘</div>
        <p>选择功法查看详情</p>
        <span class="placeholder-tip">点击功法卡片查看详细信息</span>
      </div>
    </div>

    <!-- 深度修炼对话框 -->
    <div v-if="showDialog" class="dialog-overlay" @click="closeDialog">
      <div class="cultivation-dialog" @click.stop>
        <div class="dialog-header">
          <h3>深度修炼 - {{ (selectedSkillData as { 名称: string })?.名称 }}</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>

        <div class="dialog-content">
          <div class="cultivation-time-input">
            <h4>修炼时长:</h4>
            <div class="time-input-group">
              <div class="input-row">
                <label>年：</label>
                <input
                  type="number"
                  v-model.number="inputYears"
                  min="0"
                  max="100"
                  class="time-input"
                />
                <label>天：</label>
                <input
                  type="number"
                  v-model.number="inputDays"
                  min="0"
                  max="365"
                  class="time-input"
                />
              </div>
              <div class="time-total">
                总计：{{ getTotalDays() }} 天
              </div>
            </div>
          </div>

          <div class="cultivation-preview" v-if="getTotalDays() > 0">
            <h4>预期收益</h4>
            <div class="preview-stats">
              <div class="stat-item">
                <span class="stat-label">修炼进度增长：</span>
                <span class="stat-value">+{{ calculateProgressGain(getTotalDays()) }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">熟练度提升：</span>
                <span class="stat-value">+{{ calculateProficiencyGain(getTotalDays()) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="dialog-btn cancel-btn" @click="closeDialog">取消</button>
          <button class="dialog-btn confirm-btn" @click="startCultivation" :disabled="getTotalDays() <= 0">
            开始修炼
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { useUIStore } from '@/stores/uiStore';
import ProgressBar from '@/components/common/ProgressBar.vue';
import type { Item } from '@/types/game';

// 定义功法技能接口
interface TechniqueSkill {
  解锁条件: string;
  技能描述: string;
  技能类型: '攻击' | '防御' | '辅助' | '移动' | '其他';
}

const characterStore = useCharacterStore();
const uiStore = useUIStore();
const selectedSkillData = ref<unknown | null>(null);
const selectedSkillSlot = ref<string>('');

// 深度修炼对话框状态
const showDialog = ref(false);
const inputYears = ref(0);
const inputDays = ref(0);

// 计算总天数
const getTotalDays = (): number => {
  return (inputYears.value || 0) * 365 + (inputDays.value || 0);
};

// 初始化修炼功法数据的辅助函数
const initializeCultivationSkills = async (saveData: { 修炼功法?: unknown }) => {
  if (!saveData.修炼功法) {
    saveData.修炼功法 = {
      功法: null,
      熟练度: 0,
      已解锁技能: [],
      修炼时间: 0,
      突破次数: 0,
      正在修炼: false,
      修炼进度: 0
    };
    try {
      // 异步保存，不阻塞界面
      await characterStore.commitToStorage();
    } catch (err) {
      console.error('[技能面板] 初始化修炼功法数据失败:', err);
    }
  }
};

// 修炼功法数据
const cultivationSkills = computed(() => {
  const saveData = characterStore.activeSaveSlot?.存档数据;

  if (!saveData) {
    return {
      功法: null,
      熟练度: 0,
      已解锁技能: [],
      修炼时间: 0,
      突破次数: 0,
      正在修炼: false,
      修炼进度: 0
    };
  }

  // 确保修炼功法数据结构存在
  // 注意：这个调用是异步的，但我们不希望在这里 await 它，
  // 因为它的目的是在后台更新数据，而不是阻塞UI渲染。
  // Pinia 的响应性会处理UI更新。
  initializeCultivationSkills(saveData);

  return saveData.修炼功法 || {
    功法: null,
    熟练度: 0,
    已解锁技能: [],
    修炼时间: 0,
    突破次数: 0,
    正在修炼: false,
    修炼进度: 0
  };
});

// 背包中的功法物品
const inventoryTechniques = computed(() => {
  const saveData = characterStore.activeSaveSlot?.存档数据;
  const inventory = saveData?.背包?.物品;

  if (!inventory) return [];

  // 过滤出功法类型的有效物品（忽略以_开头的内部键与非对象值）
  const techniques = Object.entries(inventory)
    .filter(([key, val]) => !String(key).startsWith('_') && val && typeof val === 'object')
    .map(([, val]) => val as { 类型?: string })
    .filter(item => item.类型 === '功法');
  return techniques;
});

// 选择技能
const selectSkill = (skill: unknown, slotName: string) => {
  selectedSkillData.value = skill;
  selectedSkillSlot.value = slotName;
};

// 选择背包中的功法
const selectInventoryTechnique = (technique: unknown) => {
  selectedSkillData.value = technique;
  selectedSkillSlot.value = '背包功法';
};

// 桌面端：鼠标悬停预览（与点击选择一致，但不在移动端触发）
const isMobile = computed(() => {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
});

const onSkillHover = (skill: unknown, slotName: string) => {
  if (isMobile.value) return;
  selectedSkillData.value = skill;
  selectedSkillSlot.value = slotName;
};

// 获取功法品质样式类
const getSkillQualityClass = (skill: unknown, type: 'border' | 'text' = 'border'): string => {
  if (!skill) return '';
  const typedSkill = skill as { 品质?: { quality?: string } };
  const quality = typedSkill.品质?.quality || '凡';
  return `${type}-quality-${quality}`;
};

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
  return new Set(cultivationSkills.value.已解锁技能 || []);
});

// 检查是否可以解锁新技能
const checkSkillUnlock = (_skillName: string, unlockCondition: string): boolean => {
  const skillData = selectedSkillData.value as { 修炼进度?: number } | null;
  const currentProgress = skillData?.修炼进度 || 0;
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

// 显示修炼对话框
const showCultivationDialog = () => {
  if (!selectedSkillData.value || !selectedSkillSlot.value) {
    return;
  }
  inputYears.value = 0;
  inputDays.value = 0;
  showDialog.value = true;
};

// 关闭对话框
const closeDialog = () => {
  showDialog.value = false;
  inputYears.value = 0;
  inputDays.value = 0;
};

// 计算修炼进度增长
const calculateProgressGain = (days: number | null): number => {
  if (!days) return 0;
  // 基础公式：每天1-2%的进度，但有递减效应
  const baseGain = days * 1.5;
  const diminishingFactor = Math.pow(0.98, days / 30); // 每30天递减2%
  return Math.min(100, Math.round(baseGain * diminishingFactor));
};

// 计算熟练度提升
const calculateProficiencyGain = (days: number | null): number => {
  if (!days) return 0;
  // 熟练度提升比进度慢一些
  const baseGain = days * 0.8;
  const diminishingFactor = Math.pow(0.99, days / 30);
  return Math.min(100, Math.round(baseGain * diminishingFactor));
};

// 获取时间描述
const getTimeDescription = (days: number | null): string => {
  if (!days) return '';
  if (days < 7) return `${days}天`;
  if (days < 30) return `${Math.round(days / 7)}周`;
  if (days < 365) return `${Math.round(days / 30)}个月`;
  return `${Math.round(days / 365)}年`;
};

// 将小时数格式化为易读文本
const formatHoursToReadable = (hours: number): string => {
  if (!hours || hours <= 0) return '未修炼';
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  if (days > 0 && remainHours > 0) return `${days}天${remainHours}小时`;
  if (days > 0) return `${days}天`;
  return `${remainHours}小时`;
};

// 开始修炼
const startCultivation = async () => {
  const totalDays = getTotalDays();
  if (totalDays <= 0 || !selectedSkillData.value) {
    return;
  }

  const progressGain = calculateProgressGain(totalDays);
  const proficiencyGain = calculateProficiencyGain(totalDays);

  try {
    const skillData = selectedSkillData.value as Item;
    console.log(`[技能面板] 开始${totalDays}天深度修炼:`, skillData.名称);

    // 更新存档数据
    if (characterStore.activeSaveSlot?.存档数据?.修炼功法) {
      const skillSlots = characterStore.activeSaveSlot.存档数据.修炼功法;
      if (skillSlots.功法) {
        // 更新功法修炼进度
        const currentProgress = skillSlots.功法.修炼进度 || 0;
        const newProgress = Math.min(100, currentProgress + progressGain);
        skillSlots.功法.修炼进度 = newProgress;

        // 更新熟练度
        const currentProficiency = skillSlots.熟练度 || 0;
        const newProficiency = Math.min(100, currentProficiency + proficiencyGain);
        skillSlots.熟练度 = newProficiency;

        // 增加修炼时间
        skillSlots.修炼时间 = (skillSlots.修炼时间 || 0) + totalDays * 24; // 转换为小时

        // 检查是否可以解锁新技能
        if (skillData.功法技能) {
          const unlockedSkills = skillSlots.已解锁技能 || [];

          for (const [skillName, skill] of Object.entries(skillData.功法技能)) {
            const skillInfo = skill as TechniqueSkill;
            if (!unlockedSkills.includes(skillName) && checkSkillUnlock(skillName, skillInfo.解锁条件)) {
              unlockedSkills.push(skillName);
              console.log(`[技能面板] 解锁新技能: ${skillName}`);
            }
          }

          skillSlots.已解锁技能 = unlockedSkills;
        }

        // 更新游戏时间
        const saveData = characterStore.activeSaveSlot.存档数据;
        if (saveData?.游戏时间) {
          const currentTime = saveData.游戏时间;

          // 添加天数到游戏时间
          currentTime.日 += totalDays;

          // 处理月份进位
          while (currentTime.日 > 30) {
            currentTime.日 -= 30;
            currentTime.月 += 1;
            if (currentTime.月 > 12) {
              currentTime.月 = 1;
              currentTime.年 += 1;
            }
          }
        }

        await characterStore.commitToStorage();
        console.log(`[技能面板] ${totalDays}天修炼完成，进度提升${progressGain}%，熟练度提升${proficiencyGain}%`);
      }
    }

    closeDialog();

  } catch (error) {
    console.error('[技能面板] 深度修炼失败:', error);
  }
};

// 装备背包中的功法
const equipTechnique = async () => {
  if (!selectedSkillData.value || selectedSkillSlot.value !== '背包功法') {
    return;
  }

  const technique = selectedSkillData.value as {
    物品ID?: string;
    名称: string;
    类型: string;
    品质?: unknown;
    描述?: string;
    功法效果?: unknown;
    功法技能?: unknown;
  };

  console.log('[技能面板] 装备功法:', technique.名称);

  try {
    // 检查存档数据是否存在
    const saveData = characterStore.activeSaveSlot?.存档数据;
    if (!saveData) {
      console.error('[技能面板] 存档数据不存在');
      return;
    }

    // 确保修炼功法数据结构存在
    if (!saveData.修炼功法) {
      saveData.修炼功法 = {
        功法: null,
        熟练度: 0,
        已解锁技能: [],
        修炼时间: 0,
        突破次数: 0,
        正在修炼: false,
        修炼进度: 0
      };
    }

    const skillSlots = saveData.修炼功法;

    // 检查是否已经在修炼其他功法
    if (skillSlots.功法 && (skillSlots.功法 as { 物品ID?: string }).物品ID !== technique.物品ID) {
      const currentSkill = skillSlots.功法 as { 名称: string };
      uiStore.showRetryDialog({
        title: '切换功法',
        message: `当前正在修炼《${currentSkill.名称}》，确定要切换到《${technique.名称}》吗？`,
        confirmText: '确认切换',
        cancelText: '取消',
        onConfirm: async () => {
          const prev = skillSlots.功法 as {
            物品ID?: string;
            名称: string;
            类型: string;
            品质?: unknown;
            描述?: string;
            功法效果?: unknown;
            功法技能?: unknown;
          };
          if (prev?.物品ID && saveData.背包?.物品) {
            saveData.背包.物品[prev.物品ID] = {
              物品ID: prev.物品ID,
              名称: prev.名称,
              类型: prev.类型,
              品质: (prev.品质 as { quality: "神" | "仙" | "天" | "地" | "玄" | "黄" | "凡"; grade: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 }) || { quality: "凡", grade: 0 },
              描述: prev.描述,
              功法效果: prev.功法效果 || {},
              功法技能: (prev.功法技能 || {}) as {
                [技能名称: string]: {
                  解锁条件: string;
                  技能描述: string;
                  技能类型: '攻击' | '防御' | '辅助' | '移动' | '其他';
                };
              },
              数量: 1
            };
            console.log('[技能面板] 之前的功法已放回背包:', prev.名称);
          }
          // 确认后继续执行装备
          await finalizeEquipTechnique(technique);
        },
        onCancel: () => {}
      });
      return;
    }

    // 无冲突情况下直接完成装备
    await finalizeEquipTechnique(technique);

  } catch (error) {
    console.error('[技能面板] 装备功法失败:', error);
  }
};

// 卸下功法
const unequipSkill = async () => {
  if (!selectedSkillData.value || !selectedSkillSlot.value) {
    return;
  }

  const skillData = selectedSkillData.value as Item;

  // 确认卸下（使用项目内确认弹窗）
  uiStore.showRetryDialog({
    title: '卸下功法',
    message: `确定要卸下《${skillData.名称}》吗？`,
    confirmText: '确认卸下',
    cancelText: '取消',
    onConfirm: async () => {
      try {
        const saveData = characterStore.activeSaveSlot?.存档数据;
        if (saveData?.修炼功法) {
          const skillSlots = saveData.修炼功法;
          const currentSkill = skillSlots.功法 as {
            物品ID?: string;
            名称: string;
            类型: string;
            品质?: unknown;
            描述?: string;
            功法效果?: unknown;
            功法技能?: unknown;
          };
          
          // 将功法放回背包
          if (currentSkill && saveData.背包) {
            if (!saveData.背包.物品) {
              saveData.背包.物品 = {};
            }
            const itemId = currentSkill.物品ID || `功法_${currentSkill.名称}`;
            saveData.背包.物品[itemId] = {
              物品ID: itemId,
              名称: currentSkill.名称,
              类型: '功法',
              品质: (currentSkill.品质 as { quality: "神" | "仙" | "天" | "地" | "玄" | "黄" | "凡"; grade: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 }) || { quality: "凡", grade: 0 },
              描述: currentSkill.描述,
              功法效果: currentSkill.功法效果 || {},
              功法技能: (currentSkill.功法技能 || {}) as {
                [技能名称: string]: {
                  解锁条件: string;
                  技能描述: string;
                  技能类型: '攻击' | '防御' | '辅助' | '移动' | '其他';
                };
              },
              数量: 1
            };
            console.log('[技能面板] 功法已放回背包:', currentSkill.名称);
          }
          
          // 清空功法槽位
          skillSlots.功法 = null;
          await characterStore.commitToStorage();
          console.log('[技能面板] 功法卸下成功');
          
          // 清空选择状态
          selectedSkillData.value = null;
          selectedSkillSlot.value = '';
        }
      } catch (error) {
        console.error('[技能面板] 卸下失败:', error);
      }
    },
    onCancel: () => {}
  });
  return;
};

// 将功法装备到修炼槽位（封装）
const finalizeEquipTechnique = async (technique: {
  物品ID?: string;
  名称: string;
  类型: string;
  品质?: unknown;
  描述?: string;
  功法效果?: unknown;
  功法技能?: unknown;
}) => {
  const saveData = characterStore.activeSaveSlot?.存档数据;
  if (!saveData?.修炼功法) return;
  const skillSlots = saveData.修炼功法;
  skillSlots.功法 = {
    物品ID: technique.物品ID || '',
    名称: technique.名称,
    类型: technique.类型,
    品质: (technique.品质 as { quality: "神" | "仙" | "天" | "地" | "玄" | "黄" | "凡"; grade: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 }) || { quality: "凡", grade: 0 },
    描述: technique.描述,
    功法效果: technique.功法效果 || {},
    功法技能: (technique.功法技能 || {}) as {
      [技能名称: string]: {
        解锁条件: string;
        技能描述: string;
        技能类型: '攻击' | '防御' | '辅助' | '移动' | '其他';
      };
    },
    修炼进度: 0,
    数量: 1
  };

  if (!skillSlots.熟练度) skillSlots.熟练度 = 0;
  if (!skillSlots.已解锁技能) skillSlots.已解锁技能 = [];

  if (saveData.背包?.物品 && technique.物品ID) {
    delete saveData.背包.物品[technique.物品ID];
  }

  await characterStore.commitToStorage();
  console.log('[技能面板] 功法装备成功:', technique.名称);
  selectedSkillData.value = skillSlots.功法;
  selectedSkillSlot.value = '功法';
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

/* 背包功法区域 */
.inventory-techniques-group {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
}

.techniques-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.empty-inventory {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: var(--color-text-secondary);
  text-align: center;
  gap: 8px;
}

.empty-inventory small {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  opacity: 0.8;
}

.technique-card {
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
}

.technique-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2);
}

.technique-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  flex-shrink: 0;
  font-weight: bold;
  color: var(--color-text);
}

.technique-type-text {
  font-size: 14px;
  font-weight: bold;
}

.technique-info {
  flex: 1;
  min-width: 0;
}

.technique-name {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.technique-quality {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
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

.equip-btn {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.equip-btn:hover {
  background: var(--color-success-hover);
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
@media (max-width: 640px) {
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
