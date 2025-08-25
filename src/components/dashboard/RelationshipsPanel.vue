<template>
  <div class="relationships-panel">
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

    <!-- 关系分类筛选 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <button 
          v-for="filter in relationshipFilters" 
          :key="filter.key"
          class="filter-tab"
          :class="{ active: activeFilter === filter.key }"
          @click="setActiveFilter(filter.key)"
        >
          <span class="tab-icon">{{ filter.icon }}</span>
          <span class="tab-name">{{ filter.name }}</span>
          <span class="tab-count">{{ getFilterCount(filter.key) }}</span>
        </button>
      </div>
    </div>

    <!-- 人物关系列表 -->
    <div class="relationships-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <div class="loading-text">正在读取人际网络...</div>
      </div>
      
      <div v-else-if="filteredRelationships.length === 0" class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-text">{{ getEmptyText() }}</div>
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
import { useCharacterStore } from '@/stores/characterStore';
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

const characterStore = useCharacterStore();

// 响应式数据
const loading = ref(false);
const activeFilter = ref('all');
const selectedPerson = ref<RelationshipPerson | null>(null);
const showSummary = ref(false);
const relationships = ref<RelationshipPerson[]>([]);

// 筛选器配置
const relationshipFilters = [
  { key: 'all', name: '全部', icon: '👥' },
  { key: '家族', name: '家族', icon: '🏠' },
  { key: '朋友', name: '朋友', icon: '😊' },
  { key: '师门', name: '师门', icon: '🎓' },
  { key: '仇人', name: '仇人', icon: '⚔️' },
  { key: '恋人', name: '恋人', icon: '💕' },
  { key: '同门', name: '同门', icon: '🤝' },
  { key: '其他', name: '其他', icon: '👤' },
];

// 计算属性
const totalRelationships = computed(() => relationships.value.length);

const filteredRelationships = computed(() => {
  if (activeFilter.value === 'all') return relationships.value;
  return relationships.value.filter(person => person.type === activeFilter.value);
});

const displayRelationships = computed(() => {
  return filteredRelationships.value.slice(0, 50); // 限制显示数量
});

const relationshipStats = computed(() => {
  const stats = relationshipFilters.filter(f => f.key !== 'all').map(filter => ({
    type: filter.key,
    name: filter.name,
    icon: filter.icon,
    count: relationships.value.filter(p => p.type === filter.key).length
  }));
  return stats.filter(s => s.count > 0);
});

// 获取筛选器数量
const getFilterCount = (filterKey: string): number => {
  if (filterKey === 'all') return relationships.value.length;
  return relationships.value.filter(person => person.type === filterKey).length;
};

// 获取空状态文本
const getEmptyText = (): string => {
  if (activeFilter.value === 'all') return '尚未建立任何人际关系';
  const filter = relationshipFilters.find(f => f.key === activeFilter.value);
  return `暂无${filter?.name || '此类'}关系`;
};

// 获取关系类型样式
const getRelationshipType = (type: string): string => {
  const typeMap: Record<string, string> = {
    '家族': 'family',
    '朋友': 'friend', 
    '师门': 'mentor',
    '仇人': 'enemy',
    '恋人': 'lover',
    '同门': 'peer',
    '其他': 'other'
  };
  return typeMap[type] || 'other';
};

// 获取人物表情符号
const getPersonEmoji = (person: RelationshipPerson): string => {
  const typeEmojis: Record<string, string> = {
    '家族': '👨‍👩‍👧‍👦',
    '朋友': '😊',
    '师门': '👨‍🏫', 
    '仇人': '😡',
    '恋人': '💖',
    '同门': '👫',
    '其他': '👤'
  };
  return typeEmojis[person.type] || '👤';
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

// 设置筛选器
const setActiveFilter = (filterKey: string) => {
  activeFilter.value = filterKey;
  selectedPerson.value = null;
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
    // 首先从角色存档中加载
    const activeSave = characterStore.activeSaveSlot;
    if (activeSave?.存档数据?.人物关系) {
      const relationshipData = activeSave.存档数据.人物关系;
      
      // 转换存档中的关系数据格式
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

    // 尝试从酒馆变量获取更新的数据
    const helper = getTavernHelper();
    if (helper) {
      const chatVars = await helper.getVariables({ type: 'chat' });
      
      // 检查是否有酒馆中的关系数据
      if (chatVars['character.social.relationships']) {
        const tavernRelationships = chatVars['character.social.relationships'];
        
        // 合并或更新关系数据
        if (Array.isArray(tavernRelationships)) {
          const updatedRelationships = tavernRelationships.map((rel: any) => ({
            id: rel.id || rel.name || `rel_${Date.now()}`,
            name: rel.name || '未知',
            type: rel.type || rel.关系类型 || '其他',
            intimacy: rel.intimacy || rel.好感度 || rel.亲密度 || 0,
            description: rel.description || rel.描述,
            personality: rel.personality || rel.性格,
            background: rel.background || rel.背景,
            location: rel.location || rel.位置,
            status: rel.status || rel.状态,
            interactionCount: rel.interactionCount || rel.互动次数 || 0,
            lastInteraction: rel.lastInteraction || rel.最后互动时间,
            memories: rel.memories || rel.记忆 || [],
            firstMet: rel.firstMet || rel.首次相遇
          }));
          
          // 合并数据，优先使用酒馆中的最新数据
          const existingIds = new Set(relationships.value.map(r => r.id));
          updatedRelationships.forEach((rel: RelationshipPerson) => {
            const existingIndex = relationships.value.findIndex(r => r.id === rel.id || r.name === rel.name);
            if (existingIndex >= 0) {
              // 更新现有关系
              relationships.value[existingIndex] = { ...relationships.value[existingIndex], ...rel };
            } else {
              // 添加新关系
              relationships.value.push(rel);
            }
          });
        }
      }
      
      // 检查是否有其他格式的关系数据
      const relationshipKeys = Object.keys(chatVars).filter(key => 
        key.startsWith('character.social.relationships.') || 
        key.includes('relationship') || 
        key.includes('npc') ||
        key.includes('人物关系')
      );
      
      relationshipKeys.forEach(key => {
        const value = chatVars[key];
        if (value && typeof value === 'object') {
          // 处理单个关系数据
          const relationshipId = key.split('.').pop() || `rel_${Date.now()}`;
          const existingIndex = relationships.value.findIndex(r => r.id === relationshipId);
          
          const relationshipData: RelationshipPerson = {
            id: relationshipId,
            name: value.name || value.名字 || relationshipId,
            type: value.type || value.关系类型 || '其他',
            intimacy: value.intimacy || value.好感度 || 0,
            description: value.description || value.描述,
            location: value.location || value.位置,
            interactionCount: value.interactionCount || value.互动次数 || 0,
            lastInteraction: value.lastInteraction || value.最后互动时间,
            memories: value.memories || []
          };
          
          if (existingIndex >= 0) {
            relationships.value[existingIndex] = { ...relationships.value[existingIndex], ...relationshipData };
          } else {
            relationships.value.push(relationshipData);
          }
        }
      });
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  background: linear-gradient(135deg, #fff8f0 0%, #fef3e2 100%);
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
  border: 1px solid #fed7aa;
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
  color: #c2410c;
}

.relationship-count {
  font-size: 0.875rem;
  color: #ea580c;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* 筛选器 */
.filter-section {
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #fed7aa;
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
  border: 1px solid #fed7aa;
  border-radius: 1.5rem;
  background: white;
  color: #ea580c;
  font-size: 0.875rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.filter-tab:hover {
  background: #fef3e2;
}

.filter-tab.active {
  background: #ea580c;
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

/* 关系容器 */
.relationships-container {
  flex: 1;
  padding: 0 1rem 1rem 1rem;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 3rem;
  
  /* 改进的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(234, 88, 12, 0.3) rgba(243, 244, 246, 0.5);
}

/* Webkit 滚动条样式 */
.relationships-container::-webkit-scrollbar {
  width: 8px;
}

.relationships-container::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.relationships-container::-webkit-scrollbar-thumb {
  background: rgba(234, 88, 12, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.relationships-container::-webkit-scrollbar-thumb:hover {
  background: rgba(234, 88, 12, 0.5);
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
  color: #c2410c;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: #9ca3af;
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
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #fed7aa;
  cursor: pointer;
  transition: all 0.2s ease;
}

.relationship-card:hover {
  background: #fef3e2;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.15);
}

.relationship-card.selected {
  background: #fef3e2;
  border-color: #ea580c;
  box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.2);
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
  background: linear-gradient(135deg, #fed7aa, #fdba74);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  border: 2px solid white;
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

.relationship-indicator.intimacy-high { background: #22c55e; }
.relationship-indicator.intimacy-medium { background: #f59e0b; }
.relationship-indicator.intimacy-low { background: #ef4444; }
.relationship-indicator.intimacy-none { background: #6b7280; }

.person-info {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.person-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.relationship-type {
  font-size: 0.75rem;
  color: #ea580c;
  background: #fef3e2;
  padding: 0.125rem 0.5rem;
  border-radius: 0.75rem;
}

.person-location {
  font-size: 0.75rem;
  color: #6b7280;
}

.person-status {
  font-size: 0.75rem;
  color: #059669;
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
  color: #6b7280;
}

/* 详情面板 */
.person-detail-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background: white;
  border-left: 1px solid #fed7aa;
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
  border-bottom: 1px solid #fed7aa;
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
  color: #c2410c;
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
  background: #fef3e2;
  color: #ea580c;
}

.close-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: #fed7aa;
  color: #c2410c;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #fdba74;
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
  color: #c2410c;
}

.detail-section p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #6b7280;
}

.personality-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.personality-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #f0fdf4;
  color: #166534;
  border-radius: 0.75rem;
  border: 1px solid #bbf7d0;
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
  background: #fffbeb;
  border-radius: 0.5rem;
  border-left: 3px solid #f59e0b;
}

.memory-content {
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.4;
  margin-bottom: 0.25rem;
}

.memory-time {
  font-size: 0.75rem;
  color: #9ca3af;
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
  background: #fef3e2;
  border-radius: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #c2410c;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #fed7aa;
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
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
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
  color: #c2410c;
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
  background: #fef3e2;
  border-radius: 0.75rem;
  border: 1px solid #fed7aa;
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
  color: #ea580c;
}

.stat-name {
  font-size: 0.75rem;
  color: #6b7280;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 深色主题适配 */
[data-theme="dark"] .relationships-panel {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

[data-theme="dark"] .panel-header,
[data-theme="dark"] .filter-section,
[data-theme="dark"] .relationship-card,
[data-theme="dark"] .person-detail-panel,
[data-theme="dark"] .summary-content {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .panel-title,
[data-theme="dark"] .detail-name,
[data-theme="dark"] .summary-header h3 {
  color: #f1f5f9;
}

[data-theme="dark"] .relationship-card:hover {
  background: #334155;
}

[data-theme="dark"] .avatar-bg {
  background: linear-gradient(135deg, #475569, #64748b);
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
  background: #ea580c;
  color: white;
}

[data-theme="dark"] .filter-tab {
  background: #334155;
  border-color: #475569;
  color: #cbd5e1;
}

[data-theme="dark"] .filter-tab:hover {
  background: #475569;
}

[data-theme="dark"] .stat-item,
[data-theme="dark"] .memory-item,
[data-theme="dark"] .stat-card {
  background: #334155;
  border-color: #475569;
}

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