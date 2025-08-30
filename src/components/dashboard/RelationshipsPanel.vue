<template>
  <div class="relationships-panel game-panel">
    <!-- 头部统计 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">🤝</div>
        <div class="header-info">
          <h3 class="panel-title">人物关系</h3>
          <span class="relationship-count">{{ totalRelationships }}位相识</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refreshRelationships" :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span class="btn-text">刷新</span>
        </button>
        <button class="action-btn" @click="showRelationshipSummary">
          <BarChart :size="16" />
          <span class="btn-text">统计</span>
        </button>
      </div>
    </div>

    <!-- 人物关系列表 -->
    <div class="panel-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <div class="loading-text">正在读取人际网络...</div>
      </div>
      
      <div v-else-if="relationships.length === 0" class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-text">独行修士一路孤寂，结识道友共话天道</div>
        <div class="empty-hint">在游戏中与NPC互动后，关系信息会显示在这里</div>
      </div>

      <div v-else class="relationships-list">
        <div 
          v-for="person in displayRelationships" 
          :key="person.id"
          class="relationship-card"
          :class="[
            'relationship-' + getRelationshipType(person.type),
            { selected: selectedPerson?.id === person.id }
          ]"
          @click="selectPerson(person)"
        >
          <div class="person-avatar">
            <div class="avatar-bg">{{ getPersonEmoji(person) }}</div>
            <div class="relationship-indicator" :class="getIntimacyClass(person.intimacy || 0)">
              {{ person.intimacy || 0 }}
            </div>
          </div>
          
          <div class="person-info">
            <div class="person-name">{{ person.name }}</div>
            <div class="person-meta">
              <span class="relationship-type">{{ person.type || '未知' }}</span>
              <span class="person-location" v-if="person.location">{{ person.location }}</span>
            </div>
            <div class="person-status" v-if="person.status">
              <span class="status-text">{{ person.status }}</span>
            </div>
          </div>
          
          <div class="interaction-info">
            <div class="last-interaction" v-if="person.lastInteraction">
              {{ formatLastInteraction(person.lastInteraction) }}
            </div>
            <div class="interaction-count" v-if="person.interactionCount">
              共{{ person.interactionCount }}次互动
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 人物详情面板 -->
    <div v-if="selectedPerson" class="person-detail-panel">
      <div class="detail-header">
        <div class="detail-avatar">
          <div class="avatar-bg">{{ getPersonEmoji(selectedPerson) }}</div>
        </div>
        <div class="detail-info">
          <h4 class="detail-name">{{ selectedPerson.name }}</h4>
          <div class="detail-badges">
            <span class="type-badge" :class="'type-' + getRelationshipType(selectedPerson.type)">
              {{ selectedPerson.type }}
            </span>
            <span class="intimacy-badge" :class="getIntimacyClass(selectedPerson.intimacy || 0)">
              亲密度 {{ selectedPerson.intimacy || 0 }}
            </span>
          </div>
        </div>
        <button class="close-btn" @click="selectedPerson = null">
          <X :size="20" />
        </button>
      </div>

      <div class="detail-content">
        <div v-if="selectedPerson.description" class="detail-section">
          <h5>人物描述</h5>
          <p>{{ selectedPerson.description }}</p>
        </div>

        <div v-if="selectedPerson.personality" class="detail-section">
          <h5>性格特点</h5>
          <div class="personality-tags">
            <span 
              v-for="trait in selectedPerson.personality" 
              :key="trait"
              class="personality-tag"
            >
              {{ trait }}
            </span>
          </div>
        </div>

        <div v-if="selectedPerson.background" class="detail-section">
          <h5>背景信息</h5>
          <p>{{ selectedPerson.background }}</p>
        </div>

        <div v-if="selectedPerson.memories?.length" class="detail-section">
          <h5>互动记忆</h5>
          <div class="memories-list">
            <div 
              v-for="(memory, index) in selectedPerson.memories.slice(0, 5)" 
              :key="index"
              class="memory-item"
            >
              <div class="memory-content">{{ memory.content || memory }}</div>
              <div class="memory-time" v-if="memory.time">{{ memory.time }}</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h5>关系统计</h5>
          <div class="relationship-stats">
            <div class="stat-item">
              <span class="stat-label">互动次数</span>
              <span class="stat-value">{{ selectedPerson.interactionCount || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">认识时长</span>
              <span class="stat-value">{{ getRelationshipDuration(selectedPerson) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">当前位置</span>
              <span class="stat-value">{{ selectedPerson.location || '未知' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-actions">
        <button class="action-btn primary" @click="interactWithPerson(selectedPerson)">
          <MessageCircle :size="16" />
          发起互动
        </button>
        <button class="action-btn secondary" @click="viewInteractionHistory(selectedPerson)">
          <Clock :size="16" />
          查看历史
        </button>
      </div>
    </div>

    <!-- 关系统计弹窗 -->
    <div v-if="showSummary" class="summary-modal" @click.self="showSummary = false">
      <div class="summary-content">
        <div class="summary-header">
          <h3>人际关系统计</h3>
          <button class="close-btn" @click="showSummary = false">
            <X :size="20" />
          </button>
        </div>
        <div class="summary-stats">
          <div class="stat-card" v-for="stat in relationshipStats" :key="stat.type">
            <div class="stat-icon">{{ stat.icon }}</div>
            <div class="stat-info">
              <div class="stat-number">{{ stat.count }}</div>
              <div class="stat-name">{{ stat.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RefreshCw, BarChart, MessageCircle, Clock, X } from 'lucide-vue-next';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';

// 人物关系数据接口
interface RelationshipPerson {
  id: string;
  name: string;
  type: string; // 关系类型：家族、朋友、师门、敌人等
  intimacy: number; // 亲密度/好感度
  description?: string;
  personality?: string[];
  background?: string;
  location?: string;
  status?: string;
  interactionCount?: number;
  lastInteraction?: string;
  memories?: Array<{
    content: string;
    time?: string;
  }>;
  firstMet?: string;
}

// 响应式数据
const loading = ref(false);
const selectedPerson = ref<RelationshipPerson | null>(null);
const showSummary = ref(false);
const relationships = ref<RelationshipPerson[]>([]);

// 计算属性
const totalRelationships = computed(() => relationships.value.length);

const displayRelationships = computed(() => {
  return relationships.value.slice(0, 50); // 限制显示数量
});

const relationshipStats = computed(() => {
  const typeCount: Record<string, number> = {};
  relationships.value.forEach(person => {
    const type = person.type || '其他';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  
  return Object.entries(typeCount).map(([type, count]) => ({
    type,
    name: type,
    icon: getTypeIcon(type),
    count
  }));
});

// 根据关系类型获取图标
const getTypeIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    '友好': '😊',
    '长辈': '🧙‍♂️',
    '同门': '🤝',
    '恋人': '💕',
    '仇人': '⚔️',
    '师父': '👨‍🏫',
    '弟子': '🎓',
    '敌对': '😡',
    '中立': '😐'
  };
  return iconMap[type] || '👤';
};

// 获取关系类型样式（动态适配）
const getRelationshipType = (type: string): string => {
  if (type.includes('友') || type.includes('好')) return 'friend';
  if (type.includes('长辈') || type.includes('师')) return 'elder';
  if (type.includes('恋') || type.includes('爱')) return 'lover';
  if (type.includes('仇') || type.includes('敌')) return 'enemy';
  if (type.includes('同门') || type.includes('师兄') || type.includes('师弟')) return 'peer';
  return 'other';
};

// 获取人物表情符号（动态适配）
const getPersonEmoji = (person: RelationshipPerson): string => {
  return getTypeIcon(person.type || '其他');
};

// 获取亲密度样式
const getIntimacyClass = (intimacy: number): string => {
  if (intimacy >= 80) return 'intimacy-high';
  if (intimacy >= 50) return 'intimacy-medium';
  if (intimacy >= 20) return 'intimacy-low';
  return 'intimacy-none';
};

// 格式化最后互动时间
const formatLastInteraction = (timeStr: string): string => {
  try {
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    return `${Math.floor(diffDays / 30)}个月前`;
  } catch {
    return timeStr;
  }
};

// 获取关系持续时间
const getRelationshipDuration = (person: RelationshipPerson): string => {
  if (!person.firstMet) return '未知';
  try {
    const meetDate = new Date(person.firstMet);
    const now = new Date();
    const diffMs = now.getTime() - meetDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) return `${diffDays}天`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月`;
    return `${Math.floor(diffDays / 365)}年`;
  } catch {
    return '未知';
  }
};

// 选择人物
const selectPerson = (person: RelationshipPerson) => {
  selectedPerson.value = selectedPerson.value?.id === person.id ? null : person;
};

// 与人物互动
const interactWithPerson = (person: RelationshipPerson) => {
  toast.info(`准备与${person.name}互动...`);
  // 这里可以触发游戏主界面的互动逻辑
  selectedPerson.value = null;
};

// 查看互动历史
const viewInteractionHistory = (person: RelationshipPerson) => {
  toast.info(`查看与${person.name}的互动历史`);
};

// 显示关系统计
const showRelationshipSummary = () => {
  showSummary.value = true;
};

// 刷新关系数据
const refreshRelationships = async () => {
  loading.value = true;
  try {
    await loadRelationshipData();
    toast.success('人际关系数据已刷新');
  } catch (error) {
    console.error('[人物关系] 刷新失败:', error);
    toast.error('刷新失败');
  } finally {
    loading.value = false;
  }
};

// 加载关系数据
const loadRelationshipData = async () => {
  try {
    // 直接从酒馆获取数据
    const helper = getTavernHelper();
    if (helper) {
      const chatVars = await helper.getVariables({ type: 'chat' });
      const gameData = chatVars?.DAD_GameData as any; // 临时使用 any 类型
      
      if (gameData?.saveData?.人物关系) {
        const relationshipData = gameData.saveData.人物关系;
        
        // 转换为RelationshipPerson格式
        const relationshipList: RelationshipPerson[] = Object.entries(relationshipData).map(([id, npcProfile]: [string, any]) => {
          return {
            id,
            name: npcProfile.角色基础信息?.名字 || id,
            type: npcProfile.人物关系 || '其他',
            intimacy: npcProfile.人物好感度 || 0,
            description: npcProfile.角色基础信息?.描述,
            location: npcProfile.角色存档信息?.位置?.描述,
            status: getPersonStatus(npcProfile),
            interactionCount: npcProfile.互动次数 || 0,
            lastInteraction: npcProfile.最后互动时间,
            memories: npcProfile.人物记忆 ? npcProfile.人物记忆.map((m: any) => ({ content: m })) : [],
            firstMet: npcProfile.首次相遇时间
          };
        });
        
        relationships.value = relationshipList;
      }
    }
    
    console.log('[人物关系] 加载完成，共', relationships.value.length, '个关系');
  } catch (error) {
    console.error('[人物关系] 加载数据失败:', error);
  }
};

// 获取人物状态
const getPersonStatus = (npcProfile: any): string => {
  if (npcProfile.角色存档信息?.状态效果?.length > 0) {
    const effects = npcProfile.角色存档信息.状态效果;
    return effects[0].状态名称 || '未知状态';
  }
  if (npcProfile.角色存档信息?.境界) {
    return npcProfile.角色存档信息.境界.名称 || '凡人';
  }
  return '正常';
};

onMounted(() => {
  loadRelationshipData();
});
</script>

<style scoped>
.relationships-panel {
  /* 使用统一的 game-panel 基础样式 */
}

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

.relationship-count {
  font-size: 0.875rem;
  color: var(--color-accent);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* 关系容器 */
.panel-content {
  flex: 1;
  margin: 0 1rem 1rem 1rem;
  overflow-y: auto;
  min-height: 0;
  
  /* 改进的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--color-primary-rgb), 0.3) rgba(var(--color-border-rgb), 0.5);
}

/* Webkit 滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 8px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(var(--color-border-rgb), 0.5);
  border-radius: 4px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(var(--color-primary-rgb), 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color-primary-rgb), 0.5);
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
  color: var(--color-primary);
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

/* 关系列表 */
.relationships-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.relationship-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: var(--transition-fast);
}

.relationship-card:hover {
  background: var(--color-surface-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.15);
}

.relationship-card.selected {
  background: var(--color-surface-light);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.person-avatar {
  position: relative;
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
}

.avatar-bg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  border: 2px solid var(--color-background);
}

.relationship-indicator {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 600;
  color: white;
  border: 2px solid white;
}

.relationship-indicator.intimacy-high { background: var(--color-success); }
.relationship-indicator.intimacy-medium { background: var(--color-warning); }
.relationship-indicator.intimacy-low { background: var(--color-error); }
.relationship-indicator.intimacy-none { background: var(--color-text-secondary); }

.person-info {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.person-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.relationship-type {
  font-size: 0.75rem;
  color: var(--color-accent);
  background: rgba(var(--color-accent-rgb), 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
}

.person-location {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.person-status {
  font-size: 0.75rem;
  color: var(--color-success);
}

.interaction-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  flex-shrink: 0;
}

.last-interaction,
.interaction-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* 详情面板 */
.person-detail-panel {
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
}

@media (max-width: 768px) {
  .person-detail-panel {
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
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.detail-avatar {
  width: 3rem;
  height: 3rem;
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
.intimacy-badge {
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

.close-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: var(--color-surface-light);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: var(--transition-fast);
}

.close-btn:hover {
  background: var(--color-border-hover);
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
  color: var(--color-text);
}

.detail-section p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.personality-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.personality-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  border-radius: 0.75rem;
  border: 1px solid rgba(var(--color-success-rgb), 0.3);
}

.memories-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 12rem;
  overflow-y: auto;
}

.memory-item {
  padding: 0.75rem;
  background: var(--color-surface-light);
  border-radius: 0.5rem;
  border-left: 3px solid var(--color-warning);
}

.memory-content {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.4;
  margin-bottom: 0.25rem;
}

.memory-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.relationship-stats {
  display: grid;
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
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
  background: #fef3e2;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.action-btn:hover:not(:disabled) {
  background: #fed7aa;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: #ea580c;
  color: white;
  border-color: #ea580c;
}

.action-btn.primary:hover:not(:disabled) {
  background: #dc2626;
}

.action-btn.secondary {
  background: white;
  color: #ea580c;
}

.action-btn.secondary:hover:not(:disabled) {
  background: #fef3e2;
}

@media (max-width: 768px) {
  .header-actions .btn-text {
    display: none;
  }
}

/* 统计弹窗 */
.summary-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.summary-content {
  background: var(--color-surface);
  border-radius: 1rem;
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.summary-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary);
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface-light);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-name {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 使用统一的CSS变量主题系统 */

/* 响应式设计 */
@media (max-width: 480px) {
  .relationships-panel {
    gap: 0.75rem;
  }
  
  .relationship-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .person-avatar {
    align-self: center;
  }
  
  .interaction-info {
    align-items: flex-start;
    width: 100%;
  }
}
</style>