<template>
  <div class="immortal-sidebar" :class="{ 'is-collapsed': collapsed }">
    <!-- 有角色数据时显示 -->
    <template v-if="characterData">
      <!-- 展开状态显示 -->
      <div class="sidebar-content" v-show="!collapsed">
        <!-- 角色基础信息 -->
        <CollapsibleSection title="角色信息" :defaultOpen="true">
          <div class="character-basic">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">道号</span>
                <span class="info-value">{{ characterData.name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">年龄</span>
                <span class="info-value">{{ characterData.age }}岁</span>
              </div>
              <div class="info-item">
                <span class="info-label">寿命</span>
                <span class="info-value">{{ characterData.lifespan.text }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">声望</span>
                <span class="info-value">{{ characterData.reputation }}</span>
              </div>
            </div>
            
            <!-- 境界信息 -->
            <div class="realm-section">
              <div class="realm-header">
                <span class="realm-label">当前境界</span>
                <span class="realm-name" @click="handleRealmClick">
                  {{ characterData.realm?.名称 || '凡人' }}
                </span>
              </div>
              <div v-if="characterData.realm" class="realm-progress">
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: `${(characterData.realm.当前进度 / characterData.realm.下一级所需) * 100}%` }"></div>
                </div>
                <div class="progress-numbers">{{ characterData.realm.当前进度 }} / {{ characterData.realm.下一级所需 }}</div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 修为属性 -->
        <CollapsibleSection title="修为属性" :defaultOpen="true">
          <div class="cultivation-attrs">
            <div class="attr-row">
              <span class="attr-name">气血</span>
              <div class="attr-bar-container">
                <div class="attr-bar">
                  <div class="attr-fill health" :style="{ width: characterData.health.percent + '%' }"></div>
                </div>
                <span class="attr-value">{{ characterData.health.text }}</span>
              </div>
            </div>
            <div class="attr-row">
              <span class="attr-name">灵气</span>
              <div class="attr-bar-container">
                <div class="attr-bar">
                  <div class="attr-fill mana" :style="{ width: characterData.mana.percent + '%' }"></div>
                </div>
                <span class="attr-value">{{ characterData.mana.text }}</span>
              </div>
            </div>
            <div class="attr-row">
              <span class="attr-name">神识</span>
              <div class="attr-bar-container">
                <div class="attr-bar">
                  <div class="attr-fill spirit" :style="{ width: characterData.spirit.percent + '%' }"></div>
                </div>
                <span class="attr-value">{{ characterData.spirit.text }}</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 状态效果 -->
        <CollapsibleSection title="状态效果" :defaultOpen="true" v-if="characterData.statusEffects.length > 0">
          <div class="status-effects">
            <div v-for="effect in characterData.statusEffects" :key="effect.状态名称" 
                 class="effect-item" :class="`effect-${effect.类型?.toLowerCase()}`">
              <div class="effect-header">
                <span class="effect-name">{{ effect.状态名称 }}</span>
                <span class="effect-type">{{ getEffectTypeText(effect.类型) }}</span>
              </div>
              <div class="effect-details">
                <div class="effect-time">{{ effect.时间 }}</div>
                <div class="effect-description">{{ effect.状态描述 }}</div>
                <div v-if="effect.强度" class="effect-intensity">强度: {{ effect.强度 }}/10</div>
                <div v-if="effect.来源" class="effect-source">来源: {{ effect.来源 }}</div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 无状态效果 -->
        <CollapsibleSection title="状态效果" :defaultOpen="true" v-else>
          <div class="no-effects">
            <div class="no-effects-content">
              <span class="no-effects-icon">◉</span>
              <div class="no-effects-text">
                <div class="no-effects-title">身心安泰</div>
                <div class="no-effects-desc">当前无任何状态影响</div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 六维命格 -->
        <CollapsibleSection title="六维命格" :defaultOpen="false">
          <div class="hexagon-wrapper">
            <HexagonChart v-if="characterData.innateAttributes" :stats="characterData.innateAttributes" :size="100" />
          </div>
        </CollapsibleSection>

        <!-- 先天神通 -->
        <CollapsibleSection title="先天神通" :defaultOpen="false">
          <div class="talents-list">
            <div v-if="characterData.talents && characterData.talents.length" class="talent-items">
              <TalentDisplay v-for="talent in characterData.talents.slice(0, 2)" :key="talent.name" :talent="talent" :compact="true" />
              <div v-if="characterData.talents.length > 2" class="more-talents">还有{{ characterData.talents.length - 2 }}个神通...</div>
            </div>
            <div v-else class="empty-content">暂无先天神通</div>
          </div>
        </CollapsibleSection>

        <!-- 功法技能 -->
        <CollapsibleSection title="功法技能" :defaultOpen="false">
          <div class="skills-section">
            <div class="skill-row">
              <span class="skill-label">主修功法</span>
              <span class="skill-content">{{ characterData.mainSkill || '无' }}</span>
            </div>
            <div class="skill-row">
              <span class="skill-label">已学技能</span>
              <div class="skill-tags">
                <span v-for="skill in characterData.learnedSkills" :key="skill" class="skill-tag">{{ skill }}</span>
                <span v-if="!characterData.learnedSkills?.length" class="empty-content">暂无</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 随身物品 -->
        <CollapsibleSection title="随身物品" :defaultOpen="false">
          <div class="inventory-section">
            <div class="inventory-info">物品数量: {{ characterData.inventoryCount || 0 }}/{{ characterData.inventoryMax || 100 }}</div>
            <div class="item-slots">
              <div class="item-slot" v-for="i in 6" :key="i">
                <div class="slot-content">空</div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
      
      <!-- 收缩状态显示 -->
      <div class="collapsed-content" v-show="collapsed">
        <div class="collapsed-info">
          <div class="collapsed-avatar">{{ characterData.name.charAt(0) }}</div>
          <div class="collapsed-realm">{{ (characterData.realm?.名称 || '凡人').slice(0, 2) }}</div>
          <div class="collapsed-attrs">
            <div class="mini-attr health" :style="{ height: characterData.health.percent + '%' }"></div>
            <div class="mini-attr mana" :style="{ height: characterData.mana.percent + '%' }"></div>
            <div class="mini-attr spirit" :style="{ height: characterData.spirit.percent + '%' }"></div>
          </div>
        </div>
      </div>
    </template>
    
    <!-- 无角色数据时显示 -->
    <div v-else class="no-character">
      <div class="no-character-icon">☯</div>
      <div class="no-character-text">暂无角色数据</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import HexagonChart from '@/components/common/HexagonChart.vue';
import TalentDisplay, { type Talent } from '@/components/common/TalentDisplay.vue';
import CollapsibleSection from '@/components/common/CollapsibleSection.vue';

const props = defineProps<{
  collapsed?: boolean;
}>();

const emit = defineEmits<{
  'show-realm-details': [];
}>();

const store = useCharacterStore();

const characterData = computed(() => {
  const profile = store.activeCharacterProfile;
  const save = store.activeSaveSlot;

  if (!profile || !save?.存档数据) {
    return null;
  }

  const baseInfo = profile.角色基础信息;
  const status = save.存档数据.玩家角色状态;

  const formatValue = (v: { 当前: number; 最大: number } | undefined) => {
    if (!v || typeof v !== 'object' || v.当前 === undefined || v.最大 === undefined) {
      return { text: '0/0', percent: 0 };
    }
    return {
      text: `${v.当前}/${v.最大}`,
      percent: Math.min((v.当前 / v.最大) * 100, 100),
    };
  };

  const getReputationText = (rep: number) => {
    if (rep >= 10000) return `声名远扬 (${rep})`;
    if (rep >= 5000) return `小有名气 (${rep})`;
    if (rep >= 1000) return `略有声望 (${rep})`;
    if (rep >= 100) return `初露头角 (${rep})`;
    return `籍籍无名 (${rep || 0})`;
  };

  const attributesInEnglish = {
    root_bone: baseInfo?.先天六司.根骨 || 0,
    spirituality: baseInfo?.先天六司.灵性 || 0,
    comprehension: baseInfo?.先天六司.悟性 || 0,
    fortune: baseInfo?.先天六司.气运 || 0,
    charm: baseInfo?.先天六司.魅力 || 0,
    temperament: baseInfo?.先天六司.心性 || 0,
  };

  const talentsWithDetails: Talent[] = (baseInfo?.天赋 || []).map(name => ({
    name: name,
    description: '此乃天道所赐之神通，其玄妙之处需待有缘人自行探寻。',
    level: 1,
    progress: Math.floor(Math.random() * 80) + 10,
  }));

  return {
    name: baseInfo?.名字 || '未知',
    age: status?.寿命?.当前 || 18,
    realm: status?.境界 || {
      名称: '凡人',
      等级: 0,
      当前进度: 0,
      下一级所需: 100,
      突破描述: '尚未踏入修炼门径'
    },
    reputation: getReputationText(status?.声望),
    health: formatValue(status?.气血),
    mana: formatValue(status?.灵气),
    spirit: formatValue(status?.神识),
    lifespan: formatValue(status?.寿命),
    statusEffects: status?.状态效果 || [],
    innateAttributes: attributesInEnglish,
    talents: talentsWithDetails,
    mainSkill: save.存档数据.功法技能?.主修功法 || null,
    learnedSkills: save.存档数据.功法技能?.已学技能 || [],
    inventoryCount: 0,
    inventoryMax: 100,
  };
});

const handleRealmClick = () => {
  emit('show-realm-details');
};

const getEffectTypeText = (type: string) => {
  const typeMap = {
    'BUFF': '增益',
    'DEBUFF': '减益'
  };
  return typeMap[type as keyof typeof typeMap] || type;
};
</script>

<style scoped>
/* 修仙侧边栏 - 仙气飘渺浅色主题 */
.immortal-sidebar {
  width: 100%;
  height: 100%;
  background: inherit;
  padding: 12px;
  box-sizing: border-box;
  font-family: 'SimSun', 'NSimSun', 'STSong', '宋体', serif;
  transition: all 0.3s ease;
}

.immortal-sidebar.is-collapsed {
  width: 100%;
  overflow: hidden;
}

.sidebar-content {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(121, 134, 203, 0.3) transparent;
}

.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(121, 134, 203, 0.3);
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: rgba(121, 134, 203, 0.5);
}

/* 角色基础信息 - 浅色主题 */
.character-basic {
  padding: 8px 0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.info-label {
  font-size: 0.75rem;
  color: #7986cb;
  font-weight: 500;
}

.info-value {
  font-size: 0.85rem;
  color: #5c6bc0;
  font-weight: 600;
}

/* 境界信息 - 浅色主题 */
.realm-section {
  border-top: 1px solid rgba(121, 134, 203, 0.2);
  padding-top: 12px;
}

.realm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.realm-label {
  font-size: 0.8rem;
  color: #7986cb;
  font-weight: 500;
}

.realm-name {
  font-size: 1rem;
  color: #9c27b0;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 8px;
  border: 1px solid rgba(156, 39, 176, 0.3);
  background: rgba(156, 39, 176, 0.05);
  transition: all 0.2s ease;
}

.realm-name:hover {
  background: rgba(156, 39, 176, 0.1);
  border-color: rgba(156, 39, 176, 0.5);
}

.realm-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-track {
  height: 6px;
  background: rgba(121, 134, 203, 0.2);
  border: 1px solid rgba(121, 134, 203, 0.3);
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(to right, #9c27b0, #7986cb);
  transition: width 0.3s ease;
}

.progress-numbers {
  font-size: 0.7rem;
  color: #7986cb;
  text-align: center;
}

/* 修为属性 - 浅色主题 */
.cultivation-attrs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attr-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.attr-name {
  min-width: 32px;
  font-size: 0.8rem;
  color: #7986cb;
  font-weight: 600;
  text-align: center;
}

.attr-bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.attr-bar {
  flex: 1;
  height: 8px;
  background: rgba(121, 134, 203, 0.2);
  border: 1px solid rgba(121, 134, 203, 0.3);
  position: relative;
}

.attr-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.attr-fill.health {
  background: linear-gradient(to right, #e91e63, #c2185b);
}

.attr-fill.mana {
  background: linear-gradient(to right, #2196f3, #1976d2);
}

.attr-fill.spirit {
  background: linear-gradient(to right, #ffc107, #ff8f00);
}

.attr-value {
  font-size: 0.7rem;
  color: #7986cb;
  min-width: 40px;
  text-align: right;
}

/* 状态效果 - 浅色主题 */
.status-effects {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effect-item {
  border: 1px solid rgba(121, 134, 203, 0.2);
  padding: 6px 8px;
  background: rgba(243, 229, 245, 0.3);
}

.effect-item.effect-buff {
  border-color: rgba(76, 175, 80, 0.3);
  background: rgba(232, 245, 233, 0.3);
}

.effect-item.effect-debuff {
  border-color: rgba(244, 67, 54, 0.3);
  background: rgba(255, 235, 238, 0.3);
}

.effect-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.effect-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #7986cb;
}

.effect-buff .effect-name {
  color: #4caf50;
}

.effect-debuff .effect-name {
  color: #f44336;
}

.effect-type {
  font-size: 0.65rem;
  padding: 1px 3px;
  border: 1px solid rgba(121, 134, 203, 0.3);
  background: rgba(121, 134, 203, 0.1);
  color: #7986cb;
}

.effect-details {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 0.65rem;
  color: #5c6bc0;
  line-height: 1.2;
}

.effect-intensity {
  color: #7986cb;
  font-weight: 600;
}

/* 无状态效果 - 浅色主题 */
.no-effects {
  padding: 8px;
}

.no-effects-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  background: rgba(232, 245, 233, 0.3);
}

.no-effects-icon {
  font-size: 1.2rem;
  color: #4caf50;
}

.no-effects-text {
  flex: 1;
}

.no-effects-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #4caf50;
  margin-bottom: 1px;
}

.no-effects-desc {
  font-size: 0.65rem;
  color: #5c6bc0;
  line-height: 1.2;
}

/* 六维命格 - 浅色主题 */
.hexagon-wrapper {
  display: flex;
  justify-content: center;
  padding: 12px;
}

/* 天赋列表 - 浅色主题 */
.talent-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.more-talents {
  font-size: 0.7rem;
  color: #7986cb;
  text-align: center;
  padding: 4px;
  border: 1px dashed rgba(121, 134, 203, 0.3);
  background: rgba(243, 229, 245, 0.2);
  font-style: italic;
}

/* 技能部分 - 浅色主题 */
.skills-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.skill-label {
  font-size: 0.8rem;
  color: #7986cb;
  font-weight: 500;
  min-width: 60px;
}

.skill-content {
  font-size: 0.8rem;
  color: #5c6bc0;
  font-weight: 600;
  text-align: right;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.skill-tag {
  font-size: 0.7rem;
  padding: 2px 6px;
  border: 1px solid rgba(121, 134, 203, 0.3);
  background: rgba(121, 134, 203, 0.1);
  color: #7986cb;
}

/* 物品背包 - 浅色主题 */
.inventory-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inventory-info {
  font-size: 0.75rem;
  color: #7986cb;
  text-align: center;
}

.item-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.item-slot {
  aspect-ratio: 1;
  border: 1px solid rgba(121, 134, 203, 0.3);
  background: rgba(121, 134, 203, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot-content {
  font-size: 0.7rem;
  color: #7986cb;
}

/* 空内容 - 浅色主题 */
.empty-content {
  font-size: 0.75rem;
  color: #9e9e9e;
  font-style: italic;
  text-align: center;
  padding: 8px;
}

/* 无角色数据 - 浅色主题 */
.no-character {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}

.no-character-icon {
  font-size: 2.5rem;
  color: #7986cb;
  opacity: 0.6;
}

.no-character-text {
  font-size: 0.9rem;
  color: #9e9e9e;
  font-style: italic;
}

/* 收缩状态样式 */
.collapsed-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 16px 8px;
}

.collapsed-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.collapsed-avatar {
  width: 32px;
  height: 32px;
  border: 1px solid #8b7355;
  background: #fff;
  color: #8b7355;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1rem;
}

.collapsed-realm {
  font-size: 0.7rem;
  color: #8b7355;
  font-weight: 600;
  text-align: center;
}

.collapsed-attrs {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 40px;
}

.mini-attr {
  width: 6px;
  background: rgba(139, 115, 85, 0.2);
  border: 1px solid rgba(139, 115, 85, 0.3);
  transition: height 0.3s ease;
}

.mini-attr.health {
  background: linear-gradient(to top, #e91e63, #c2185b);
}

.mini-attr.mana {
  background: linear-gradient(to top, #2196f3, #1976d2);
}

.mini-attr.spirit {
  background: linear-gradient(to top, #ffc107, #ff8f00);
}

/* 暗色主题适配 - 夜空星辰 */
[data-theme="dark"] .immortal-sidebar {
  color: #e1e4e8;
}

[data-theme="dark"] .sidebar-content {
  scrollbar-color: rgba(100, 181, 246, 0.3) transparent;
}

[data-theme="dark"] .sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(100, 181, 246, 0.3);
}

[data-theme="dark"] .sidebar-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 181, 246, 0.5);
}

/* 角色基础信息 - 深色主题 */
[data-theme="dark"] .info-label,
[data-theme="dark"] .realm-label,
[data-theme="dark"] .attr-name,
[data-theme="dark"] .skill-label,
[data-theme="dark"] .inventory-info {
  color: #64b5f6;
}

[data-theme="dark"] .info-value,
[data-theme="dark"] .skill-content {
  color: #e1e4e8;
}

[data-theme="dark"] .realm-section {
  border-top-color: rgba(100, 181, 246, 0.2);
}

[data-theme="dark"] .realm-name {
  color: #ba68c8;
  border-color: rgba(186, 104, 200, 0.3);
  background: rgba(186, 104, 200, 0.05);
}

[data-theme="dark"] .realm-name:hover {
  background: rgba(186, 104, 200, 0.1);
  border-color: rgba(186, 104, 200, 0.5);
}

[data-theme="dark"] .progress-track,
[data-theme="dark"] .attr-bar {
  background: rgba(100, 181, 246, 0.2);
  border-color: rgba(100, 181, 246, 0.3);
}

[data-theme="dark"] .progress-fill {
  background: linear-gradient(to right, #ba68c8, #64b5f6);
}

[data-theme="dark"] .progress-numbers,
[data-theme="dark"] .attr-value {
  color: #64b5f6;
}

/* 状态效果 - 深色主题 */
[data-theme="dark"] .effect-item {
  border-color: rgba(100, 181, 246, 0.2);
  background: rgba(45, 27, 105, 0.3);
}

[data-theme="dark"] .effect-item.effect-buff {
  border-color: rgba(129, 199, 132, 0.3);
  background: rgba(30, 30, 63, 0.3);
}

[data-theme="dark"] .effect-item.effect-debuff {
  border-color: rgba(229, 115, 115, 0.3);
  background: rgba(45, 27, 105, 0.2);
}

[data-theme="dark"] .effect-name,
[data-theme="dark"] .effect-details {
  color: #e1e4e8;
}

[data-theme="dark"] .effect-buff .effect-name {
  color: #81c784;
}

[data-theme="dark"] .effect-debuff .effect-name {
  color: #e57373;
}

[data-theme="dark"] .effect-type {
  border-color: rgba(100, 181, 246, 0.3);
  background: rgba(100, 181, 246, 0.1);
  color: #64b5f6;
}

[data-theme="dark"] .no-effects-content {
  border-color: rgba(129, 199, 132, 0.3);
  background: rgba(30, 30, 63, 0.3);
}

[data-theme="dark"] .no-effects-icon {
  color: #81c784;
}

[data-theme="dark"] .no-effects-title {
  color: #81c784;
}

[data-theme="dark"] .skill-tag {
  border-color: rgba(100, 181, 246, 0.3);
  background: rgba(100, 181, 246, 0.1);
  color: #64b5f6;
}

[data-theme="dark"] .item-slot {
  border-color: rgba(100, 181, 246, 0.3);
  background: rgba(100, 181, 246, 0.05);
}

[data-theme="dark"] .slot-content {
  color: #64b5f6;
}

[data-theme="dark"] .empty-content {
  color: #757575;
}

[data-theme="dark"] .no-character-icon {
  color: #64b5f6;
}

[data-theme="dark"] .more-talents {
  color: #7d8590;
  border-color: rgba(125, 133, 144, 0.3);
  background: #21262d;
}

[data-theme="dark"] .skill-tag {
  border-color: rgba(125, 133, 144, 0.3);
  background: rgba(125, 133, 144, 0.1);
  color: #7d8590;
}

[data-theme="dark"] .item-slot {
  border-color: rgba(125, 133, 144, 0.3);
  background: #21262d;
}

[data-theme="dark"] .slot-content {
  color: #7d8590;
}

[data-theme="dark"] .empty-content {
  color: #656d76;
}

[data-theme="dark"] .no-character-icon {
  color: #7d8590;
}

[data-theme="dark"] .no-character-text {
  color: #656d76;
}

[data-theme="dark"] .collapsed-avatar {
  border-color: #7d8590;
  background: #21262d;
  color: #7d8590;
}

[data-theme="dark"] .collapsed-realm {
  color: #7d8590;
}

[data-theme="dark"] .mini-attr {
  background: rgba(125, 133, 144, 0.2);
  border-color: rgba(125, 133, 144, 0.3);
}
</style>