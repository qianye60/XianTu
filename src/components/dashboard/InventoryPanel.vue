<template>
  <!-- 移除容器，让内容直接填充GameView提供的panel-content区域 -->
  <div class="inventory-content">
    <!-- 标签页导航 -->
    <div class="tabs-header">
      <div class="tabs-nav">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="16" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
      
      <!-- 搜索和筛选区域 -->
      <div class="tools-section" v-if="activeTab === 'items'">
        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input 
            type="text" 
            v-model="searchQuery" 
            :placeholder="isMobile ? '搜索...' : '搜索物品...'" 
          />
        </div>
        <div class="filter-buttons">
          <select v-model="selectedCategory" class="filter-select">
            <option value="all">全部</option>
            <option v-for="cat in itemCategories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <select v-model="sortBy" class="filter-select">
            <option value="default">默认</option>
            <option value="quality">品质</option>
            <option value="name">名称</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 标签内容 -->
    <div class="tab-content">
      <!-- 物品标签 -->
      <div v-if="activeTab === 'items'" class="items-tab">
        <!-- 移动端：模态框详情 -->
        <div v-if="showItemModal && isMobile" class="item-modal-overlay" @click="closeModal">
          <div class="item-modal" @click.stop>
            <div class="modal-header">
              <h3 :class="getItemQualityClass(selectedItem, 'text')">{{ selectedItem?.名称 }}</h3>
              <button class="modal-close-btn" @click="closeModal">
                <X :size="20" />
              </button>
            </div>
            <div class="modal-content">
              <div class="modal-icon" :class="getItemQualityClass(selectedItem)">
                <component :is="getItemIconComponent(selectedItem)" :size="48" />
              </div>
              <div class="modal-info">
                <div class="modal-meta">{{ selectedItem?.类型 }} / {{ selectedItem?.品质?.quality || '凡品' }}</div>
                <p class="modal-description">{{ selectedItem?.描述 }}</p>
                <div v-if="selectedItem?.装备增幅" class="modal-attributes">
                  <h4>装备增幅</h4>
                  <div class="attribute-list">
                    <div v-for="(value, key) in selectedItem.装备增幅" :key="key" class="attribute-item">
                      <span>{{ key }}</span>
                      <span>+{{ value }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="action-btn use-btn">使用</button>
              <button class="action-btn discard-btn">丢弃</button>
            </div>
          </div>
        </div>

        <div class="items-grid">
          <div v-if="loading" class="grid-placeholder">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>
          <div v-else-if="filteredItems.length === 0" class="grid-placeholder">
            <BoxSelect :size="48" />
            <p>空空如也</p>
          </div>
          <div
            v-else
            v-for="item in filteredItems"
            :key="item.物品ID"
            class="item-card"
            :class="[getItemQualityClass(item)]"
            @click="selectItem(item)"
          >
            <div class="item-icon-wrapper">
              <component :is="getItemIconComponent(item)" :size="isMobile ? 28 : 32" />
              <div class="item-quantity" v-if="item.数量 > 1">{{ item.数量 }}</div>
            </div>
            <div class="item-name">{{ item.名称 }}</div>
          </div>
        </div>

        <!-- 桌面端物品详情侧边栏 -->
        <div v-if="!isMobile" class="item-details-sidebar">
          <div v-if="selectedItem" class="details-content">
            <div class="details-header">
              <div class="details-icon-large" :class="getItemQualityClass(selectedItem)">
                <component :is="getItemIconComponent(selectedItem)" :size="40" />
              </div>
              <div class="details-title-area">
                <h3 :class="getItemQualityClass(selectedItem, 'text')">{{ selectedItem.名称 }}</h3>
                <div class="details-meta">{{ selectedItem.类型 }} / {{ selectedItem.品质?.quality || '凡品' }}</div>
              </div>
            </div>
            <div class="details-body">
              <p class="details-description">{{ selectedItem.描述 }}</p>
              <div v-if="selectedItem.装备增幅" class="details-attributes">
                <h4>装备增幅</h4>
                <div class="attribute-list">
                  <div v-for="(value, key) in selectedItem.装备增幅" :key="key" class="attribute-item">
                    <span>{{ key }}</span>
                    <span>+{{ value }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="details-actions">
              <button class="action-btn use-btn">使用</button>
              <button class="action-btn discard-btn">丢弃</button>
            </div>
          </div>
          <div v-else class="details-placeholder">
            <BoxSelect :size="48" />
            <p>选择物品查看详情</p>
          </div>
        </div>
      </div>

      <!-- 灵石标签 -->
      <div v-if="activeTab === 'currency'" class="currency-tab">
        <div class="currency-grid">
          <div 
            v-for="grade in spiritStoneGrades" 
            :key="grade.name"
            class="currency-card"
            :class="grade.colorClass"
          >
            <div class="currency-card-top">
              <div class="currency-icon">
                <Gem :size="isMobile ? 32 : 40" />
              </div>
              <div class="currency-info">
                <div class="currency-amount">{{ inventory.灵石[grade.name] || 0 }}</div>
                <div class="currency-label">{{ grade.name }}灵石</div>
              </div>
            </div>
            <div v-if="grade.canExchange || grade.canExchangeDown" class="currency-exchange">
              <button 
                v-if="grade.canExchange"
                class="exchange-btn"
                @click="handleExchange(grade.name, 'up')"
                :disabled="(inventory.灵石[grade.name] || 0) < 100"
                :title="`兑换为${grade.exchangeUp}灵石 (100:1)`"
              >
                ↑ 兑换
              </button>
              <button 
                v-if="grade.canExchangeDown"
                class="exchange-btn down"
                @click="handleExchange(grade.name, 'down')"
                :disabled="(inventory.灵石[grade.name] || 0) < 1"
                :title="`分解为${grade.exchangeDown}灵石 (1:100)`"
              >
                ↓ 分解
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, Component } from 'vue';
import { Search, Sword, Book, Pill, Shield, Box, BoxSelect, Gem, Package, X } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import type { Item, Inventory } from '@/types/game';

const characterStore = useCharacterStore();
const loading = ref(false);
const selectedItem = ref<Item | null>(null);
const searchQuery = ref('');
const selectedCategory = ref('all');
const sortBy = ref('default');
const activeTab = ref('items');
const showItemModal = ref(false);

// 响应式检测
const isMobile = computed(() => {
  return window.innerWidth <= 768;
});

// 标签配置
const tabs = computed(() => [
  { id: 'items', label: '物品', icon: Package },
  { id: 'currency', label: '灵石', icon: Gem }
]);

const inventory = computed<Inventory>(() => characterStore.activeSaveSlot?.存档数据?.背包 || { 
  灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 
  物品: {} 
});

const itemList = computed<Item[]>(() => Object.values(inventory.value.物品 || {}));

const itemCategories = computed(() => {
  const categories = new Set(itemList.value.map(item => item.类型));
  return Array.from(categories);
});

const qualityOrder: { [key: string]: number } = { '凡': 1, '人': 2, '地': 3, '天': 4, '仙': 5, '神': 6 };

const filteredItems = computed(() => {
  let items = [...itemList.value];

  if (searchQuery.value) {
    items = items.filter(item => item.名称.includes(searchQuery.value));
  }

  if (selectedCategory.value !== 'all') {
    items = items.filter(item => item.类型 === selectedCategory.value);
  }

  if (sortBy.value === 'quality') {
    items.sort((a, b) => (qualityOrder[b.品质?.quality || '凡'] || 0) - (qualityOrder[a.品质?.quality || '凡'] || 0));
  } else if (sortBy.value === 'name') {
    items.sort((a, b) => a.名称.localeCompare(b.名称));
  }
  
  return items;
});

const getItemIconComponent = (item: Item | null): Component => {
  if (!item) return Box;
  const typeMap: { [key: string]: Component } = { '法宝': Sword, '功法': Book, '丹药': Pill, '防具': Shield };
  return typeMap[item.类型] || Box;
};

const getItemQualityClass = (item: Item | null, type: 'border' | 'text' = 'border'): string => {
  if (!item) return '';
  const quality = item.品质?.quality || '凡';
  return `${type}-quality-${quality}`;
};

const spiritStoneGrades = [
  { 
    name: '极品', 
    colorClass: 'grade-legend',
    canExchange: false, // 最高级，不能向上兑换
    canExchangeDown: true,
    exchangeDown: '上品'
  },
  { 
    name: '上品', 
    colorClass: 'grade-epic',
    canExchange: true,
    canExchangeDown: true,
    exchangeUp: '极品',
    exchangeDown: '中品'
  },
  { 
    name: '中品', 
    colorClass: 'grade-rare',
    canExchange: true,
    canExchangeDown: true,
    exchangeUp: '上品',
    exchangeDown: '下品'
  },
  { 
    name: '下品', 
    colorClass: 'grade-common',
    canExchange: true,
    canExchangeDown: false, // 最低级，不能向下分解
    exchangeUp: '中品'
  },
] as const;

// 选择物品
const selectItem = (item: Item) => {
  selectedItem.value = item;
  if (isMobile.value) {
    showItemModal.value = true;
  }
};

// 关闭模态框
const closeModal = () => {
  showItemModal.value = false;
};

// 灵石兑换功能
const handleExchange = (currentGrade: string, direction: 'up' | 'down') => {
  const gradeInfo = spiritStoneGrades.find(g => g.name === currentGrade);
  if (!gradeInfo) return;

  if (direction === 'up' && gradeInfo.canExchange && gradeInfo.exchangeUp) {
    // 向上兑换：100个当前等级 → 1个高级
    const currentAmount = inventory.value.灵石[currentGrade] || 0;
    if (currentAmount >= 100) {
      // 更新存档数据
      if (characterStore.activeSaveSlot?.存档数据?.背包?.灵石) {
        characterStore.activeSaveSlot.存档数据.背包.灵石[currentGrade] = currentAmount - 100;
        const targetAmount = characterStore.activeSaveSlot.存档数据.背包.灵石[gradeInfo.exchangeUp] || 0;
        characterStore.activeSaveSlot.存档数据.背包.灵石[gradeInfo.exchangeUp] = targetAmount + 1;
        characterStore.commitToStorage();
      }
    }
  } else if (direction === 'down' && gradeInfo.canExchangeDown && gradeInfo.exchangeDown) {
    // 向下分解：1个当前等级 → 100个低级
    const currentAmount = inventory.value.灵石[currentGrade] || 0;
    if (currentAmount >= 1) {
      // 更新存档数据
      if (characterStore.activeSaveSlot?.存档数据?.背包?.灵石) {
        characterStore.activeSaveSlot.存档数据.背包.灵石[currentGrade] = currentAmount - 1;
        const targetAmount = characterStore.activeSaveSlot.存档数据.背包.灵石[gradeInfo.exchangeDown] || 0;
        characterStore.activeSaveSlot.存档数据.背包.灵石[gradeInfo.exchangeDown] = targetAmount + 100;
        characterStore.commitToStorage();
      }
    }
  }
};

onMounted(() => {
  if (!selectedItem.value && filteredItems.value.length > 0) {
    selectedItem.value = filteredItems.value[0];
  }
});
</script>

<style scoped>
.inventory-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  overflow: hidden;
}

/* 移动端模态框 */
.item-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.item-modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modal-appear 0.3s ease-out;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-light);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-close-btn {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.modal-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.modal-icon {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  border: 3px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  background: var(--color-surface-hover);
}

.modal-info {
  width: 100%;
}

.modal-meta {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.modal-description {
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 16px;
}

.modal-attributes {
  background: var(--color-surface-light);
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
}

.modal-attributes h4 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.modal-actions {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
}

/* 主内容区域 */
.inventory-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 标签导航 */
.tabs-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 16px;
}

.tabs-nav {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.tab-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.tab-btn.active {
  background: var(--color-primary);
  color: white;
}

/* 工具栏 */
.tools-section {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  z-index: 1;
}

.search-box input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-box input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  font-size: 13px;
  min-width: 80px;
}

/* 标签内容 */
.tab-content {
  flex: 1;
  overflow: hidden;
}

/* 物品标签 */
.items-tab {
  display: flex;
  height: 100%;
}

.items-grid {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  align-content: start;
}

.grid-placeholder {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-secondary);
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.item-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  aspect-ratio: 1;
  position: relative;
}

.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: var(--color-primary);
}

.item-icon-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.item-quantity {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.item-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 桌面端详情侧边栏 */
.item-details-sidebar {
  width: 320px;
  border-left: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
}

.details-content {
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
  width: 60px;
  height: 60px;
  border-radius: 10px;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  flex-shrink: 0;
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

.details-attributes h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.details-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  text-align: center;
}

.details-actions {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 8px;
}

/* 灵石标签 */
.currency-tab {
  padding: 24px;
  overflow-y: auto;
}

.currency-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  width: 100%;
}

.currency-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s ease;
  cursor: default;
}

.currency-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.currency-card-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.currency-icon {
  flex-shrink: 0;
}

.currency-info {
  flex: 1;
}

.currency-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}

.currency-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

/* 兑换功能 */
.currency-exchange {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.exchange-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.exchange-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.exchange-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.exchange-btn:hover:not(:disabled)::before {
  left: 100%;
}

.exchange-btn.down {
  border-color: var(--color-warning);
  color: var(--color-warning);
}

.exchange-btn.down:hover:not(:disabled) {
  background: var(--color-warning);
  color: white;
  box-shadow: 0 4px 12px rgba(var(--color-warning-rgb), 0.3);
}

.exchange-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.exchange-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

/* 按钮样式 */
.action-btn {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-hover);
  color: var(--color-text);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-surface-light);
  transform: translateY(-1px);
}

.use-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.use-btn:hover {
  background: var(--color-primary-hover);
}

.discard-btn {
  background: var(--color-error);
  border-color: var(--color-error);
  color: white;
}

.discard-btn:hover {
  background: var(--color-error-hover);
}

/* 通用属性列表 */
.attribute-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attribute-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-background);
  border-radius: 6px;
  font-size: 0.9rem;
}

.attribute-item span:first-child {
  color: var(--color-text-secondary);
}

.attribute-item span:last-child {
  color: var(--color-primary);
  font-weight: 600;
}

/* 品质样式 */
.border-quality-神, .grade-legend { border-color: #ef4444 !important; color: #ef4444; }
.border-quality-仙, .grade-epic { border-color: #f59e0b !important; color: #f59e0b; }
.border-quality-天, .grade-rare { border-color: #8b5cf6 !important; color: #8b5cf6; }
.border-quality-地, .grade-uncommon { border-color: #3b82f6 !important; color: #3b82f6; }
.border-quality-人, .grade-common { border-color: #10b981 !important; color: #10b981; }
.border-quality-凡 { border-color: var(--color-border) !important; }

.text-quality-神 { color: #ef4444 !important; }
.text-quality-仙 { color: #f59e0b !important; }
.text-quality-天 { color: #8b5cf6 !important; }
.text-quality-地 { color: #3b82f6 !important; }
.text-quality-人 { color: #10b981 !important; }
.text-quality-凡 { color: var(--color-text) !important; }

/* 移动端适配 */
@media (max-width: 768px) {
  .tabs-header {
    padding: 12px;
  }
  
  .tools-section {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .filter-buttons {
    justify-content: space-between;
  }
  
  .filter-select {
    flex: 1;
  }
  
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    padding: 12px;
    gap: 10px;
  }
  
  .item-card {
    padding: 10px;
    aspect-ratio: 0.85;
  }
  
  .item-name {
    font-size: 11px;
  }
  
  .currency-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
  
  .currency-card {
    padding: 16px;
  }
  
  .currency-amount {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .tabs-nav {
    justify-content: center;
  }
  
  .tab-btn {
    flex: 1;
    justify-content: center;
  }
  
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  }
  
  .currency-grid {
    grid-template-columns: 1fr;
  }
  
  .currency-card {
    padding: 14px;
  }
}

@media (min-width: 1200px) {
  .currency-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
  }
}
</style>