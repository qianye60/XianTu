<template>
  <div class="inventory-panel game-panel">
    <!-- 头部统计 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">🎒</div>
        <div class="header-info">
          <h3 class="panel-title">储物袋</h3>
          <span class="panel-subtitle">{{ totalItems }}/{{ maxCapacity }} 件物品</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="sortItems" :disabled="loading">
          <span class="btn-icon">📋</span>
          <span class="btn-text">整理</span>
        </button>
        <button 
          class="action-btn" 
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
    <div class="panel-content">
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
  if (activeFilter.value === 'all') return '储物袋空空如也，踏上修仙路寻觅宝物吧';
  const filter = itemFilters.find(f => f.key === activeFilter.value);
  return `道友尚未获得${filter?.name}类物品，继续修行必有所得`;
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
/* 背包面板特定样式 - 基于统一主题 */
.inventory-panel {
  /* 使用统一的 game-panel 基础样式 */
}

/* 物品槽特定样式 */
.item-slot {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: var(--transition-fast);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-height: 120px;
}

.item-slot:hover {
  background: var(--color-surface-light);
  border-color: var(--color-border-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.1);
}

.item-slot.selected {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.item-slot.empty {
  background: var(--color-surface-light);
  border-style: dashed;
  opacity: 0.6;
}

/* 稀有度边框颜色 */
.item-slot.common { border-left: 3px solid var(--color-spiritual); }
.item-slot.uncommon { border-left: 3px solid var(--color-success); }
.item-slot.rare { border-left: 3px solid var(--color-info); }
.item-slot.epic { border-left: 3px solid var(--color-accent); }
.item-slot.legendary { 
  border-left: 3px solid var(--color-warning); 
  box-shadow: 0 0 10px rgba(var(--color-warning-rgb), 0.3);
}

.item-icon {
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.item-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  line-height: 1.2;
}

.item-count {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background: var(--color-primary);
  color: var(--color-background);
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 0.75rem;
  min-width: 1.25rem;
  text-align: center;
}

/* 稀有度标签样式 */
.item-rarity {
  position: absolute;
  bottom: 0.25rem;
  left: 0.25rem;
  font-size: 0.6rem;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-weight: 600;
}

.rarity-common {
  background: rgba(var(--color-spiritual), 0.2);
  color: var(--color-spiritual);
}

.rarity-uncommon {
  background: rgba(var(--color-success-rgb), 0.2);
  color: var(--color-success);
}

.rarity-rare {
  background: rgba(var(--color-info-rgb), 0.2);
  color: var(--color-info);
}

.rarity-epic {
  background: rgba(var(--color-accent-rgb), 0.2);
  color: var(--color-accent);
}

.rarity-legendary {
  background: rgba(var(--color-warning-rgb), 0.2);
  color: var(--color-warning);
}

/* 悬停提示样式 */
.item-hover-tooltip {
  position: absolute;
  z-index: 1000;
  min-width: 280px;
  max-width: 320px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  font-size: 0.875rem;
  pointer-events: none;
  backdrop-filter: blur(10px);
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.tooltip-title {
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.tooltip-type {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.tooltip-description {
  color: var(--color-text);
  line-height: 1.4;
  font-size: 0.8rem;
}

/* 移除所有深色主题硬编码，使用统一CSS变量 */
</style>
