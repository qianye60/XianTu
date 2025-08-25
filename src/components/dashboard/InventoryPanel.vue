<template>
  <div class="inventory-panel">
    <!-- 头部统计 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">🎲</div>
        <div class="header-info">
          <h3 class="panel-title">储物袋</h3>
          <span class="item-count">{{ totalItems }}/{{ maxCapacity }} 件物品</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn organize-btn" @click="sortItems" :disabled="loading">
          <span class="btn-icon">📋</span>
          <span class="btn-text">整理</span>
        </button>
        <button 
          class="action-btn tooltip-toggle-btn" 
          @click="showTooltip = !showTooltip"
          :class="{ active: showTooltip }"
          :title="showTooltip ? '点击关闭悬停显示物品详情' : '点击开启悬停显示物品详情'"
        >
          <span class="btn-icon">{{ showTooltip ? '👁️' : '🚫' }}</span>
          <span class="btn-text">{{ showTooltip ? '显示' : '关闭' }}</span>
        </button>
      </div>
    </div>

    <!-- 灵石财富 -->
    <div class="currency-section">
      <div class="currency-header">
        <span class="currency-title">💰 灵石财富</span>
      </div>
      <div class="currency-grid">
        <div 
          class="currency-item"
          :class="getCurrencyClass(type)"
          v-for="(amount, type) in inventory.灵石" 
          :key="type"
        >
          <div class="currency-icon">💎</div>
          <div class="currency-info">
            <div class="currency-name">{{ type }}灵石</div>
            <div class="currency-amount">{{ formatNumber(amount) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 物品分类筛选 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <button 
          v-for="filter in itemFilters" 
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

    <!-- 物品网格 -->
    <div class="items-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <div class="loading-text">正在加载物品...</div>
      </div>
      
      <div v-else-if="filteredItems.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-text">{{ getEmptyText() }}</div>
      </div>

      <div v-else class="items-grid">
        <div 
          v-for="item in displayItems" 
          :key="item.物品ID"
          class="item-slot"
          :class="[
            'quality-' + getQualityLevel(item.品质),
            { selected: selectedItem?.物品ID === item.物品ID }
          ]"
          @click="selectItem(item)"
          @contextmenu.prevent="showItemMenu(item, $event)"
          @mouseenter="showItemTooltip(item, $event)"
          @mouseleave="hideItemTooltip"
        >
          <div class="item-bg"></div>
          <div class="item-icon">{{ getItemIcon(item.类型) }}</div>
          <div class="item-quality-badge">{{ getQualityText(item.品质) }}</div>
          <div v-if="item.数量 > 1" class="item-quantity">{{ item.数量 }}</div>
          <div v-if="item.耐久度" class="item-durability">
            <div class="durability-bar">
              <div 
                class="durability-fill" 
                :style="{ width: getDurabilityPercent(item.耐久度) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 物品悬浮详情 -->
    <div 
      v-if="hoveredItem" 
      class="item-tooltip"
      :style="{ left: hoverPosition.x + 'px', top: hoverPosition.y + 'px' }"
    >
      <div class="tooltip-header">
        <div class="tooltip-name">{{ hoveredItem.名称 }}</div>
        <div class="tooltip-badges">
          <span class="tooltip-type">{{ hoveredItem.类型 }}</span>
          <span 
            class="tooltip-quality" 
            :class="'quality-' + getQualityLevel(hoveredItem.品质)"
          >
            {{ getQualityText(hoveredItem.品质) }}品
          </span>
        </div>
      </div>
      
      <div class="tooltip-content">
        <div v-if="hoveredItem.描述" class="tooltip-description">
          {{ hoveredItem.描述 }}
        </div>
        
        <div v-if="hoveredItem.装备增幅" class="tooltip-stats">
          <div class="tooltip-section-title">装备增幅</div>
          <div v-if="hoveredItem.装备增幅.气血上限" class="tooltip-stat">
            <span>气血上限</span>
            <span class="stat-value">+{{ hoveredItem.装备增幅.气血上限 }}</span>
          </div>
          <div v-if="hoveredItem.装备增幅.灵气上限" class="tooltip-stat">
            <span>灵气上限</span>
            <span class="stat-value">+{{ hoveredItem.装备增幅.灵气上限 }}</span>
          </div>
          <div v-if="hoveredItem.装备增幅.神识上限" class="tooltip-stat">
            <span>神识上限</span>
            <span class="stat-value">+{{ hoveredItem.装备增幅.神识上限 }}</span>
          </div>
        </div>

        <div v-if="hoveredItem.装备特效?.length" class="tooltip-effects">
          <div class="tooltip-section-title">装备特效</div>
          <div v-for="effect in hoveredItem.装备特效" :key="effect" class="tooltip-effect">
            {{ effect }}
          </div>
        </div>

        <div class="tooltip-info">
          <div class="tooltip-info-item">
            <span>数量：{{ hoveredItem.数量 }}</span>
          </div>
          <div v-if="hoveredItem.耐久度" class="tooltip-info-item">
            <span>耐久：{{ hoveredItem.耐久度.当前 }}/{{ hoveredItem.耐久度.最大 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 物品详情面板 -->
    <div v-if="selectedItem" class="item-detail-panel">
      <div class="detail-header">
        <div class="item-title">
          <h4 class="item-name">{{ selectedItem.名称 }}</h4>
          <div class="item-badges">
            <span class="type-badge">{{ selectedItem.类型 }}</span>
            <span 
              class="quality-badge" 
              :class="'quality-' + getQualityLevel(selectedItem.品质)"
            >
              {{ getQualityText(selectedItem.品质) }}品
            </span>
          </div>
        </div>
        <button class="close-btn" @click="selectedItem = null">✕</button>
      </div>

      <div class="detail-content">
        <div v-if="selectedItem.描述" class="item-description">
          <h5>物品描述</h5>
          <p>{{ selectedItem.描述 }}</p>
        </div>

        <div v-if="selectedItem.装备增幅" class="item-stats">
          <h5>装备增幅</h5>
          <div class="stats-grid">
            <div v-if="selectedItem.装备增幅.气血上限" class="stat-item">
              <span class="stat-name">气血上限</span>
              <span class="stat-value">+{{ selectedItem.装备增幅.气血上限 }}</span>
            </div>
            <div v-if="selectedItem.装备增幅.灵气上限" class="stat-item">
              <span class="stat-name">灵气上限</span>
              <span class="stat-value">+{{ selectedItem.装备增幅.灵气上限 }}</span>
            </div>
            <div v-if="selectedItem.装备增幅.神识上限" class="stat-item">
              <span class="stat-name">神识上限</span>
              <span class="stat-value">+{{ selectedItem.装备增幅.神识上限 }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedItem.装备特效?.length" class="item-effects">
          <h5>装备特效</h5>
          <div class="effects-list">
            <div v-for="effect in selectedItem.装备特效" :key="effect" class="effect-item">
              {{ effect }}
            </div>
          </div>
        </div>

        <div class="item-info-grid">
          <div class="info-item">
            <span class="info-label">数量</span>
            <span class="info-value">{{ selectedItem.数量 }}</span>
          </div>
          <div v-if="selectedItem.耐久度" class="info-item">
            <span class="info-label">耐久度</span>
            <span class="info-value">
              {{ selectedItem.耐久度.当前 }}/{{ selectedItem.耐久度.最大 }}
            </span>
          </div>
        </div>
      </div>

      <div class="detail-actions">
        <button 
          v-if="canUseItem(selectedItem)" 
          class="action-btn primary" 
          @click="useItem(selectedItem)"
        >
          使用物品
        </button>
        <button 
          v-if="canEquipItem(selectedItem)" 
          class="action-btn secondary" 
          @click="equipItem(selectedItem)"
        >
          装备物品
        </button>
        <button class="action-btn danger" @click="dropItem(selectedItem)">
          丢弃物品
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import type { Item, Inventory } from '@/types/game';

const characterStore = useCharacterStore();

// 响应式数据
const loading = ref(false);
const activeFilter = ref('all');
const selectedItem = ref<Item | null>(null);
const hoveredItem = ref<Item | null>(null);
const hoverPosition = ref({ x: 0, y: 0 });
const showTooltip = ref(true); // 控制是否显示悬停详情

// 默认背包数据
const inventory = ref<Inventory>({
  灵石: {
    下品: 0,
    中品: 0,
    上品: 0,
    极品: 0
  },
  物品: {}
});

// 物品筛选配置
const itemFilters = [
  { key: 'all', name: '全部', icon: '📦' },
  { key: '法宝', name: '法宝', icon: '⚔️' },
  { key: '功法', name: '功法', icon: '📜' },
  { key: '其他', name: '其他', icon: '📋' },
];

// 计算属性
const allItems = computed(() => Object.values(inventory.value.物品));

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return allItems.value;
  return allItems.value.filter(item => {
    // 将丹药和材料归类到其他
    if (activeFilter.value === '其他') {
      return item.类型 === '其他' || item.类型 === '丹药' || item.类型 === '材料';
    }
    return item.类型 === activeFilter.value;
  });
});

const displayItems = computed(() => {
  return filteredItems.value.slice(0, 50); // 限制显示数量防止性能问题
});

const totalItems = computed(() => {
  return allItems.value.reduce((total, item) => total + item.数量, 0);
});

const maxCapacity = computed(() => 100); // 可以根据实际逻辑调整

// 获取筛选数量
const getFilterCount = (filterKey: string): number => {
  if (filterKey === 'all') return allItems.value.length;
  if (filterKey === '其他') {
    return allItems.value.filter(item => 
      item.类型 === '其他' || item.类型 === '丹药' || item.类型 === '材料'
    ).length;
  }
  return allItems.value.filter(item => item.类型 === filterKey).length;
};

// 获取空状态文本
const getEmptyText = (): string => {
  if (activeFilter.value === 'all') return '储物袋空空如也';
  const filter = itemFilters.find(f => f.key === activeFilter.value);
  return `暂无${filter?.name}类物品`;
};

// 获取货币类名
const getCurrencyClass = (type: string): string => {
  const classMap: Record<string, string> = {
    '下品': 'currency-lower',
    '中品': 'currency-middle',
    '上品': 'currency-upper',
    '极品': 'currency-supreme'
  };
  return classMap[type] || 'currency-common';
};

// 获取货币图标
const getCurrencyIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    '下品': '💎',
    '中品': '💎', 
    '上品': '💎',
    '极品': '💎'
  };
  return iconMap[type] || '💰';
};

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toString();
};

// 获取物品图标
const getItemIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    '法宝': '⚔️',
    '功法': '📜',
    '丹药': '💊',
    '材料': '🔧',
    '其他': '📦'
  };
  return iconMap[type] || '📦';
};

// 获取品质等级
const getQualityLevel = (quality: any): string => {
  if (typeof quality === 'object') {
    return quality.quality || quality.阶位 || 'common';
  }
  return quality || 'common';
};

// 获取品质文本
const getQualityText = (quality: any): string => {
  if (typeof quality === 'object') {
    return quality.quality || quality.阶位 || '凡';
  }
  return quality || '凡';
};

// 获取耐久度百分比
const getDurabilityPercent = (durability: { 当前: number; 最大: number }): number => {
  return (durability.当前 / durability.最大) * 100;
};

// 设置活跃筛选器
const setActiveFilter = (filterKey: string) => {
  activeFilter.value = filterKey;
  selectedItem.value = null;
};

// 鼠标悬停显示详情
const showItemTooltip = (item: Item, event: MouseEvent) => {
  if (!showTooltip.value) return; // 如果关闭了悬停显示，直接返回
  hoveredItem.value = item;
  hoverPosition.value = { x: event.clientX, y: event.clientY };
};

const hideItemTooltip = () => {
  hoveredItem.value = null;
};

// 切换悬停详情显示
const toggleTooltip = () => {
  showTooltip.value = !showTooltip.value;
  if (!showTooltip.value) {
    hoveredItem.value = null; // 关闭时隐藏当前的tooltip
  }
};

// 选择物品
const selectItem = (item: Item) => {
  selectedItem.value = selectedItem.value?.物品ID === item.物品ID ? null : item;
};

// 物品操作方法
const canUseItem = (item: Item): boolean => {
  return (item.类型 === '丹药' || item.类型 === '其他') && (!!item.使用效果 || item.类型 === '丹药');
};

const canEquipItem = (item: Item): boolean => {
  return item.类型 === '法宝' && !!item.装备增幅;
};

const useItem = (item: Item) => {
  toast.info(`使用物品：${item.名称}`);
  selectedItem.value = null;
};

const equipItem = (item: Item) => {
  toast.info(`装备物品：${item.名称}`);
  selectedItem.value = null;
};

const dropItem = (item: Item) => {
  if (confirm(`确定要丢弃 ${item.名称} x${item.数量} 吗？`)) {
    toast.warning(`丢弃了物品：${item.名称}`);
    selectedItem.value = null;
  }
};

// 物品菜单
const showItemMenu = (item: Item, event: MouseEvent) => {
  // 这里可以实现右键菜单功能
  console.log('右键菜单:', item, event);
};

// 整理物品
const sortItems = () => {
  toast.info('物品已整理');
};

// 加载背包数据
const loadInventoryData = async () => {
  try {
    loading.value = true;
    
    const activeSave = characterStore.activeSaveSlot;
    if (activeSave?.存档数据?.背包) {
      inventory.value = activeSave.存档数据.背包;
    }

    // 尝试从酒馆变量获取数据
    const helper = getTavernHelper();
    if (helper) {
      const chatVars = await helper.getVariables({ type: 'chat' });
      const character = chatVars.character as any;
      
      if (character?.inventory) {
        inventory.value = character.inventory;
      }
    }

  } catch (error) {
    console.error('[背包系统] 加载数据失败:', error);
    toast.error('背包数据加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadInventoryData();
});
</script>

<style scoped>
.inventory-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  overflow: hidden;
  padding: 1rem;
  gap: 1rem;
  position: relative;
}

/* 响应式头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
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
  color: #1e293b;
}

.item-count {
  font-size: 0.875rem;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .header-actions .btn-text {
    display: none;
  }
  
  .header-info {
    display: none;
  }
}

/* 灵石财富 */
.currency-section {
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.currency-header {
  margin-bottom: 0.75rem;
}

.currency-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.currency-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.currency-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #f1f5f9;
  position: relative;
}

.currency-item:nth-child(1) {
  border-left: 3px solid #6b7280; /* 下品 - 灰色 */
}

.currency-item:nth-child(2) {
  border-left: 3px solid #10b981; /* 中品 - 绿色 */
}

.currency-item:nth-child(3) {
  border-left: 3px solid #3b82f6; /* 上品 - 蓝色 */
}

.currency-item:nth-child(4) {
  border-left: 3px solid #a855f7; /* 极品 - 紫色 */
}

.currency-lower {
  border-left: 4px solid #6b7280 !important;
}

.currency-middle {
  border-left: 4px solid #10b981 !important;
}

.currency-upper {
  border-left: 4px solid #3b82f6 !important;
}

.currency-supreme {
  border-left: 4px solid #a855f7 !important;
}

.currency-icon {
  font-size: 1.25rem;
}

.currency-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.currency-name {
  font-size: 0.75rem;
  color: #64748b;
}

.currency-amount {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

/* 筛选标签 */
.filter-section {
  padding: 0.75rem 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 1.5rem;
  background: white;
  color: #64748b;
  font-size: 0.875rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.filter-tab:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.filter-tab.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
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

/* 物品容器 - 修复滚动 */
.items-container {
  flex: 1;
  padding: 1rem;
  padding-bottom: 3rem;
  overflow-y: auto;
  min-height: 0;
  
  /* 改进的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.3) rgba(243, 244, 246, 0.5);
}

/* Webkit 滚动条样式 */
.items-container::-webkit-scrollbar {
  width: 8px;
}

.items-container::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 4px;
}

.items-container::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.items-container::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.5);
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
  color: #64748b;
  font-size: 0.875rem;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.5rem;
}

@media (max-width: 480px) {
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 0.375rem;
  }
}

.item-slot {
  position: relative;
  aspect-ratio: 1;
  border-radius: 0.5rem;
  border: 2px solid #e2e8f0;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.item-slot:hover {
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.item-slot.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.item-bg {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.item-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5rem;
  z-index: 2;
}

.item-quality-badge {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  font-size: 0.625rem;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-weight: 600;
  z-index: 3;
}

.item-quantity {
  position: absolute;
  bottom: 0.25rem;
  right: 0.25rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  min-width: 1rem;
  text-align: center;
  z-index: 3;
}

.item-durability {
  position: absolute;
  bottom: 0.25rem;
  left: 0.25rem;
  right: 0.25rem;
  z-index: 3;
}

.durability-bar {
  height: 0.125rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.0625rem;
  overflow: hidden;
}

.durability-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
  transition: width 0.3s ease;
}

/* 品质颜色 */
.quality-凡 .item-quality-badge { background: #6b7280; color: white; }
.quality-黄 .item-quality-badge { background: #fbbf24; color: white; }
.quality-玄 .item-quality-badge { background: #8b5cf6; color: white; }
.quality-地 .item-quality-badge { background: #f59e0b; color: white; }
.quality-天 .item-quality-badge { background: #ef4444; color: white; }
.quality-仙 .item-quality-badge { background: #06b6d4; color: white; }
.quality-神 .item-quality-badge { background: #db2777; color: white; }

.quality-common .item-quality-badge { background: #6b7280; color: white; }

/* 物品详情面板 - 修复滚动 */
.item-detail-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background: white;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  z-index: 10;
  overflow: hidden;
}

@media (max-width: 768px) {
  .item-detail-panel {
    position: fixed;
    width: 100%;
    left: 0;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  }
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.item-title {
  flex: 1;
  min-width: 0;
}

.item-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  word-break: break-word;
}

.item-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.type-badge,
.quality-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
}

.type-badge {
  background: #f1f5f9;
  color: #64748b;
}

.close-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e2e8f0;
}

.detail-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  min-height: 0;
}

.detail-content h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.item-description p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #64748b;
}

.stats-grid {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.stat-name {
  color: #64748b;
}

.stat-value {
  font-weight: 600;
  color: #10b981;
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.effect-item {
  padding: 0.5rem;
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #92400e;
}

.item-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

/* 按钮美化样式 */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8fafc;
  color: #374151;
  border: 1px solid #e2e8f0;
  position: relative;
  overflow: hidden;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.organize-btn {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
}

.organize-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.4);
  transform: translateY(-1px);
}

.tooltip-toggle-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
  transition: all 0.3s ease;
}

.tooltip-toggle-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4);
  transform: translateY(-1px);
}

.tooltip-toggle-btn.active {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.tooltip-toggle-btn.active:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4);
  transform: translateY(-1px);
}

/* 物品悬浮详情样式 */
.item-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.95);
  color: white;
  border-radius: 8px;
  padding: 12px;
  min-width: 200px;
  max-width: 300px;
  z-index: 10000;
  font-size: 0.875rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  transform: translate(-50%, -100%);
  margin-top: -8px;
}

.tooltip-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.tooltip-name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.tooltip-badges {
  display: flex;
  gap: 6px;
}

.tooltip-type,
.tooltip-quality {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.tooltip-type {
  background: rgba(100, 116, 139, 0.8);
}

.tooltip-quality {
  background: rgba(59, 130, 246, 0.8);
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tooltip-description {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8125rem;
  line-height: 1.4;
}

.tooltip-section-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fbbf24;
  margin-bottom: 4px;
}

.tooltip-stat,
.tooltip-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8125rem;
}

.stat-value {
  color: #10b981;
  font-weight: 600;
}

.tooltip-effect {
  background: rgba(251, 191, 36, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8125rem;
  color: #fbbf24;
}

.tooltip-info {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 8px;
}

.tooltip-info-item {
  color: rgba(255, 255, 255, 0.8);
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.action-btn.primary:hover:not(:disabled) {
  background: #2563eb;
}

.action-btn.secondary {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.action-btn.secondary:hover:not(:disabled) {
  background: #059669;
}

.action-btn.danger {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.action-btn.danger:hover:not(:disabled) {
  background: #dc2626;
}

/* 深色主题适配 */
[data-theme="dark"] .inventory-panel {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

[data-theme="dark"] .panel-header,
[data-theme="dark"] .currency-section,
[data-theme="dark"] .filter-section {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .panel-title,
[data-theme="dark"] .currency-title,
[data-theme="dark"] .item-name {
  color: #f1f5f9;
}

[data-theme="dark"] .currency-item,
[data-theme="dark"] .item-slot,
[data-theme="dark"] .stat-item {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .item-detail-panel {
  background: #1e293b;
  border-color: #475569;
}

[data-theme="dark"] .filter-tab {
  background: #334155;
  border-color: #475569;
  color: #cbd5e1;
}

[data-theme="dark"] .filter-tab:hover {
  background: #475569;
}

[data-theme="dark"] .close-btn {
  background: #334155;
  color: #cbd5e1;
}

[data-theme="dark"] .close-btn:hover {
  background: #475569;
}
</style>