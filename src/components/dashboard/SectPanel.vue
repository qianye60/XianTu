<template>
  <div class="sect-panel">
    <!-- 头部信息 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">🏛️</div>
        <div class="header-info">
          <h3 class="panel-title">宗门系统</h3>
          <span class="sect-status">{{ sectStatusText }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refreshSectData">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M3 21v-5h5"/>
          </svg>
          <span class="btn-text">刷新</span>
        </button>
      </div>
    </div>

    <!-- 宗门状态卡片 -->
    <div class="sect-status-card" v-if="currentSect">
      <div class="sect-banner" :style="{ background: getSectGradient(currentSect.type) }">
        <div class="sect-info">
          <h4 class="sect-name">{{ currentSect.name }}</h4>
          <span class="sect-type">{{ currentSect.type }}</span>
        </div>
        <div class="sect-emblem">{{ getSectEmblem(currentSect.type) }}</div>
      </div>
      
      <div class="sect-details">
        <div class="detail-row">
          <span class="label">职位：</span>
          <span class="value position" :class="currentSect.position">{{ currentSect.position }}</span>
        </div>
        <div class="detail-row">
          <span class="label">贡献：</span>
          <span class="value contribution">{{ currentSect.contribution }}</span>
          <span class="contribution-rank">({{ getContributionRank() }})</span>
        </div>
        <div class="detail-row">
          <span class="label">关系：</span>
          <span class="value relationship" :class="currentSect.relationship">{{ currentSect.relationship }}</span>
        </div>
        <div class="detail-row">
          <span class="label">声望：</span>
          <span class="value reputation">{{ currentSect.reputation || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 未加入宗门状态 -->
    <div v-else class="no-sect-card">
      <div class="no-sect-icon">🚪</div>
      <h4 class="no-sect-title">尚未加入宗门</h4>
      <p class="no-sect-desc">散修一人，孤独求道。可通过拜师、完成任务或声望达到要求后申请加入宗门。</p>
      <button class="discover-sect-btn" @click="discoverSects">
        探寻宗门
      </button>
    </div>

    <!-- 功能选项卡 -->
    <div class="sect-tabs" v-if="currentSect">
      <button 
        v-for="tab in sectTabs"
        :key="tab.key"
        class="sect-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="sect-content" v-if="currentSect">
      <!-- 兑换商店 -->
      <div v-if="activeTab === 'exchange'" class="exchange-content">
        <div class="exchange-header">
          <h5>宗门兑换</h5>
          <span class="my-contribution">可用贡献：{{ currentSect.contribution }}</span>
        </div>
        <div class="exchange-list">
          <div 
            v-for="item in availableExchanges"
            :key="item.id"
            class="exchange-item"
            :class="{ disabled: currentSect.contribution < item.cost }"
            @click="exchangeItem(item)"
          >
            <div class="item-info">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-desc">{{ item.description }}</span>
            </div>
            <div class="item-cost">
              <span class="cost-value">{{ item.cost }}</span>
              <span class="cost-label">贡献</span>
            </div>
          </div>
        </div>
        <div v-if="availableExchanges.length === 0" class="no-exchanges">
          <p>当前职位暂无可兑换物品</p>
          <p class="hint">提升职位可解锁更多物品</p>
        </div>
      </div>

      <!-- 任务面板 -->
      <div v-else-if="activeTab === 'missions'" class="missions-content">
        <div class="missions-header">
          <h5>宗门任务</h5>
          <span class="mission-hint">完成任务可获得贡献和声望</span>
        </div>
        <div class="mission-list">
          <div 
            v-for="mission in availableMissions"
            :key="mission.id"
            class="mission-item"
            @click="acceptMission(mission)"
          >
            <div class="mission-header">
              <span class="mission-name">{{ mission.name }}</span>
              <span class="mission-difficulty" :class="mission.difficulty">{{ mission.difficulty }}</span>
            </div>
            <p class="mission-desc">{{ mission.description }}</p>
            <div class="mission-rewards">
              <span class="reward-label">奖励：</span>
              <span class="reward-contribution">+{{ mission.contributionReward }} 贡献</span>
              <span class="reward-reputation">+{{ mission.reputationReward }} 声望</span>
            </div>
          </div>
        </div>
        <div v-if="availableMissions.length === 0" class="no-missions">
          <p>暂无适合的宗门任务</p>
          <p class="hint">提升实力可接取更多任务</p>
        </div>
      </div>

      <!-- 信息面板 -->
      <div v-else-if="activeTab === 'info'" class="info-content">
        <div class="sect-description">
          <h5>宗门介绍</h5>
          <p>{{ currentSect.description }}</p>
        </div>
        
        <div class="sect-hierarchy">
          <h5>门内职位</h5>
          <div class="position-list">
            <div v-for="pos in sectPositions" :key="pos.name" class="position-item" :class="{ current: pos.name === currentSect.position }">
              <span class="pos-name">{{ pos.name }}</span>
              <span class="pos-requirement">需要贡献：{{ pos.contributionRequired }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';

// 宗门数据类型
interface SectInfo {
  name: string;
  type: '正道宗门' | '魔道宗门' | '中立宗门' | '商会' | '家族';
  position: '外门弟子' | '内门弟子' | '核心弟子' | '长老' | '掌门';
  contribution: number;
  relationship: '恶劣' | '一般' | '良好' | '亲密';
  reputation: number;
  description: string;
}

interface ExchangeItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'technique' | 'pill' | 'artifact';
  minPosition: string;
}

interface SectMission {
  id: string;
  name: string;
  description: string;
  difficulty: '简单' | '普通' | '困难' | '极难';
  contributionReward: number;
  reputationReward: number;
  requirements: string[];
}

const characterStore = useCharacterStore();
const activeTab = ref('exchange');

// 获取当前宗门信息
const currentSect = computed(() => {
  try {
    const saveData = characterStore.activeSaveSlot?.存档数据;
    return saveData?.玩家角色状态?.宗门信息 || null;
  } catch (error) {
    console.warn('[宗门系统] 获取宗门信息失败:', error);
    return null;
  }
});

const sectStatusText = computed(() => {
  if (!currentSect.value) return '散修独行';
  return `${currentSect.value.name} · ${currentSect.value.position}`;
});

// 选项卡配置
const sectTabs = ref([
  { key: 'exchange', name: '兑换', icon: '🛒' },
  { key: 'missions', name: '任务', icon: '📋' },
  { key: 'info', name: '宗门', icon: 'ℹ️' }
]);

// 职位等级（用于权限判断）
const sectPositions = ref([
  { name: '外门弟子', contributionRequired: 0 },
  { name: '内门弟子', contributionRequired: 1000 },
  { name: '核心弟子', contributionRequired: 5000 },
  { name: '长老', contributionRequired: 20000 }
]);

// 可兑换物品（根据职位动态生成）
const availableExchanges = computed(() => {
  if (!currentSect.value) return [];
  
  const items: ExchangeItem[] = [
    // 外门弟子可兑换
    { id: 'basic_pill', name: '回气丹', description: '恢复少量灵气', cost: 50, type: 'pill', minPosition: '外门弟子' },
    { id: 'basic_technique', name: '基础功法', description: '宗门基础修炼功法', cost: 200, type: 'technique', minPosition: '外门弟子' },
    
    // 内门弟子可兑换
    { id: 'advanced_pill', name: '聚气丹', description: '大幅恢复灵气', cost: 300, type: 'pill', minPosition: '内门弟子' },
    { id: 'sect_artifact', name: '宗门法器', description: '宗门制式法器', cost: 800, type: 'artifact', minPosition: '内门弟子' },
    
    // 核心弟子可兑换
    { id: 'secret_technique', name: '秘传功法', description: '宗门不传之秘', cost: 2000, type: 'technique', minPosition: '核心弟子' },
    { id: 'precious_pill', name: '筑基丹', description: '助力筑基突破', cost: 3000, type: 'pill', minPosition: '核心弟子' }
  ];
  
  // 根据当前职位过滤
  const positionLevel = sectPositions.value.findIndex(p => p.name === currentSect.value?.position) || 0;
  return items.filter((item, index) => {
    const itemMinLevel = sectPositions.value.findIndex(p => p.name === item.minPosition);
    return positionLevel >= itemMinLevel;
  });
});

// 可用任务（根据职位动态生成）
const availableMissions = computed(() => {
  if (!currentSect.value) return [];
  
  const missions: SectMission[] = [
    {
      id: 'patrol', 
      name: '山门巡逻', 
      description: '巡视宗门周边，确保安全',
      difficulty: '简单',
      contributionReward: 20,
      reputationReward: 5,
      requirements: ['外门弟子及以上']
    },
    {
      id: 'herb_collect', 
      name: '采集灵草', 
      description: '为宗门收集修炼所需的灵草',
      difficulty: '普通',
      contributionReward: 50,
      reputationReward: 10,
      requirements: ['内门弟子及以上']
    },
    {
      id: 'demon_hunt', 
      name: '清剿妖兽', 
      description: '清理危害宗门的妖兽',
      difficulty: '困难',
      contributionReward: 150,
      reputationReward: 30,
      requirements: ['核心弟子及以上', '筑基期及以上']
    }
  ];
  
  return missions.filter(mission => {
    // 简单的职位匹配（实际应用中可以更复杂）
    return true;
  });
});

// 工具函数
const getSectGradient = (type: string) => {
  const gradients = {
    '正道宗门': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    '魔道宗门': 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    '中立宗门': 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    '商会': 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
    '家族': 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
  };
  return gradients[type as keyof typeof gradients] || gradients['中立宗门'];
};

const getSectEmblem = (type: string) => {
  const emblems = {
    '正道宗门': '⚔️',
    '魔道宗门': '🔥',
    '中立宗门': '⚖️', 
    '商会': '💰',
    '家族': '🏰'
  };
  return emblems[type as keyof typeof emblems] || '🏛️';
};

const getContributionRank = () => {
  if (!currentSect.value) return '';
  const contribution = currentSect.value.contribution;
  if (contribution < 100) return '新人';
  if (contribution < 500) return '普通';
  if (contribution < 2000) return '优秀';
  if (contribution < 5000) return '精英';
  return '传说';
};

// 功能函数（占位）
const refreshSectData = () => {
  toast.info('宗门数据已刷新');
};

const discoverSects = () => {
  toast.info('探寻宗门功能待实现');
};

const exchangeItem = (item: ExchangeItem) => {
  if (!currentSect.value) return;
  if (currentSect.value.contribution < item.cost) {
    toast.error('贡献点不足');
    return;
  }
  toast.info(`兑换"${item.name}"功能待实现`);
};

const acceptMission = (mission: SectMission) => {
  toast.info(`接取任务"${mission.name}"功能待实现`);
};

onMounted(() => {
  console.log('[宗门系统] 面板已挂载');
});
</script>

<style scoped>
.sect-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 2px solid rgba(59, 130, 246, 0.1);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(37, 99, 235, 0.05));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sect-status {
  font-size: 0.8rem;
  color: #6b7280;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 6px;
  color: #3b82f6;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

/* 宗门状态卡片 */
.sect-status-card {
  margin: 16px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sect-banner {
  padding: 16px 20px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sect-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sect-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.sect-type {
  font-size: 0.8rem;
  opacity: 0.9;
}

.sect-emblem {
  font-size: 2rem;
  opacity: 0.8;
}

.sect-details {
  padding: 16px 20px;
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.label {
  width: 50px;
  color: #6b7280;
  font-weight: 500;
}

.value {
  font-weight: 600;
  margin-right: 8px;
}

.position.外门弟子 { color: #6b7280; }
.position.内门弟子 { color: #3b82f6; }
.position.核心弟子 { color: #7c3aed; }
.position.长老 { color: #dc2626; }

.relationship.恶劣 { color: #dc2626; }
.relationship.一般 { color: #d97706; }
.relationship.良好 { color: #059669; }
.relationship.亲密 { color: #7c3aed; }

.contribution {
  color: #d97706;
}

.contribution-rank {
  font-size: 0.8rem;
  color: #9ca3af;
}

/* 未加入宗门状态 */
.no-sect-card {
  margin: 16px;
  padding: 32px 20px;
  background: white;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.no-sect-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.6;
}

.no-sect-title {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
}

.no-sect-desc {
  margin: 0 0 20px 0;
  color: #6b7280;
  line-height: 1.4;
}

.discover-sect-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.discover-sect-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* 选项卡 */
.sect-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.sect-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  color: #6b7280;
}

.sect-tab:hover {
  background: rgba(59, 130, 246, 0.05);
  color: #374151;
}

.sect-tab.active {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  font-weight: 600;
  border-bottom: 2px solid #3b82f6;
}

/* 内容区域 */
.sect-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 兑换商店 */
.exchange-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.exchange-header h5 {
  margin: 0;
  color: #374151;
  font-weight: 600;
}

.my-contribution {
  font-size: 0.85rem;
  color: #d97706;
  font-weight: 500;
}

.exchange-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.exchange-item:hover:not(.disabled) {
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.exchange-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.item-desc {
  font-size: 0.8rem;
  color: #6b7280;
}

.item-cost {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.cost-value {
  font-weight: 600;
  color: #d97706;
  font-size: 0.9rem;
}

.cost-label {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* 任务列表 */
.missions-header {
  margin-bottom: 16px;
}

.missions-header h5 {
  margin: 0 0 4px 0;
  color: #374151;
  font-weight: 600;
}

.mission-hint {
  font-size: 0.8rem;
  color: #6b7280;
}

.mission-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mission-item:hover {
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.mission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.mission-name {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.mission-difficulty {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.mission-difficulty.简单 { background: #dcfce7; color: #166534; }
.mission-difficulty.普通 { background: #dbeafe; color: #1e40af; }
.mission-difficulty.困难 { background: #fed7aa; color: #9a3412; }
.mission-difficulty.极难 { background: #fecaca; color: #991b1b; }

.mission-desc {
  margin: 0 0 8px 0;
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.4;
}

.mission-rewards {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
}

.reward-label {
  color: #9ca3af;
}

.reward-contribution {
  color: #d97706;
  font-weight: 500;
}

.reward-reputation {
  color: #059669;
  font-weight: 500;
}

/* 宗门信息 */
.info-content h5 {
  margin: 0 0 8px 0;
  color: #374151;
  font-weight: 600;
}

.sect-description {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sect-description p {
  margin: 0;
  color: #6b7280;
  line-height: 1.5;
  font-size: 0.9rem;
}

.sect-hierarchy {
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.position-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.position-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.position-item.current {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.pos-name {
  font-weight: 500;
  color: #374151;
}

.pos-requirement {
  font-size: 0.8rem;
  color: #6b7280;
}

/* 空状态 */
.no-exchanges,
.no-missions {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.no-exchanges .hint,
.no-missions .hint {
  font-size: 0.85rem;
  color: #9ca3af;
  margin-top: 4px;
}

/* 深色主题适配 */
[data-theme="dark"] .sect-panel {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

[data-theme="dark"] .panel-header {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
  border-bottom-color: rgba(59, 130, 246, 0.2);
}

[data-theme="dark"] .panel-title {
  color: #e2e8f0;
}

[data-theme="dark"] .sect-status {
  color: #94a3b8;
}

[data-theme="dark"] .sect-status-card,
[data-theme="dark"] .no-sect-card,
[data-theme="dark"] .sect-description,
[data-theme="dark"] .sect-hierarchy,
[data-theme="dark"] .exchange-item,
[data-theme="dark"] .mission-item {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .sect-details .label,
[data-theme="dark"] .no-sect-desc,
[data-theme="dark"] .sect-description p {
  color: #94a3b8;
}

[data-theme="dark"] .no-sect-title,
[data-theme="dark"] .sect-name,
[data-theme="dark"] .info-content h5,
[data-theme="dark"] .exchange-header h5,
[data-theme="dark"] .missions-header h5 {
  color: #e2e8f0;
}

[data-theme="dark"] .sect-tabs {
  background: rgba(0, 0, 0, 0.2);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .sect-tab {
  color: #94a3b8;
}

[data-theme="dark"] .sect-tab:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #e2e8f0;
}

[data-theme="dark"] .sect-tab.active {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}
</style>