<template>
  <div class="sect-contribution">
    <!-- 玩家信息栏 -->
    <div class="player-info-bar">
      <div class="info-item">
        <span class="info-label">职位</span>
        <span class="info-value position">{{ playerPosition }}</span>
      </div>
      <div class="info-item highlight">
        <span class="info-label">可用贡献点</span>
        <span class="info-value contribution">{{ playerContribution }}</span>
      </div>
    </div>

    <!-- 兑换分类 -->
    <div class="exchange-tabs">
      <button
        v-for="tab in exchangeTabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" :size="14" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- 兑换物品列表 -->
    <div class="exchange-list">
      <div v-if="filteredItems.length === 0" class="empty-state">
        <Package :size="48" class="empty-icon" />
        <p class="empty-text">暂无可兑换物品</p>
        <p class="empty-hint">可兑换物品由AI根据宗门设定生成</p>
        <button class="ask-btn" @click="sendPrompt('请告诉我宗门贡献可以兑换什么物品')">
          <MessageCircle :size="14" />
          <span>询问可兑换物品</span>
        </button>
      </div>

      <div v-else class="items-grid">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="item-card"
          :class="{ 'can-afford': playerContribution >= item.cost, 'out-of-stock': item.stock === 0 }"
        >
          <div class="item-header">
            <span class="item-icon">{{ item.icon }}</span>
            <div class="item-info">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-quality" :class="getQualityClass(item.quality)">{{ item.quality }}</span>
            </div>
          </div>

          <p class="item-desc">{{ item.description }}</p>

          <div class="item-footer">
            <div class="item-cost">
              <Coins :size="14" />
              <span>{{ item.cost }} 贡献</span>
            </div>
            <div class="item-stock" v-if="item.stock !== undefined">
              <Package :size="12" />
              <span>{{ item.stock > 0 ? `剩余 ${item.stock}` : '已售罄' }}</span>
            </div>
          </div>

          <button
            class="exchange-btn"
            :disabled="playerContribution < item.cost || item.stock === 0"
            @click="exchangeItem(item)"
          >
            <ShoppingCart :size="14" />
            <span>{{ getButtonText(item) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 贡献获取途径 -->
    <div class="contribution-tips">
      <h4 class="tips-title">
        <Lightbulb :size="14" />
        <span>贡献点获取途径</span>
      </h4>
      <div class="tips-list">
        <div class="tip-item">
          <Scroll :size="12" />
          <span>完成宗门任务</span>
        </div>
        <div class="tip-item">
          <Package :size="12" />
          <span>上交珍稀资源</span>
        </div>
        <div class="tip-item">
          <Swords :size="12" />
          <span>参与宗门战斗</span>
        </div>
        <div class="tip-item">
          <Users :size="12" />
          <span>指导低阶弟子</span>
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="exchange-notice">
      <Info :size="14" />
      <span>点击兑换将直接发送到对话（由AI判定并执行兑换）</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import {
  Coins, Package, MessageCircle, ShoppingCart, Info, Lightbulb,
  Scroll, Swords, Users, Pill, Sword, BookOpen, Gem
} from 'lucide-vue-next';
import { toast } from '@/utils/toast';
import { sendChat } from '@/utils/chatBus';

const gameStateStore = useGameStateStore();
const activeTab = ref<string>('all');

// 兑换分类
const exchangeTabs = [
  { key: 'all', label: '全部', icon: Package },
  { key: '丹药', label: '丹药', icon: Pill },
  { key: '功法', label: '功法', icon: BookOpen },
  { key: '装备', label: '装备', icon: Sword },
  { key: '材料', label: '材料', icon: Gem }
];

// 玩家宗门信息
const playerSectInfo = computed(() => gameStateStore.sectMemberInfo);
const playerPosition = computed(() => playerSectInfo.value?.职位 || '散修');
const playerContribution = computed(() => playerSectInfo.value?.贡献 || 0);

// 可兑换物品列表（示例数据，实际应从存档读取）
const exchangeItems = computed(() => {
  // 这里应该从世界信息中读取宗门可兑换物品
  // 暂时返回示例数据，实际应由AI生成
  return [
    {
      id: 'pill_001',
      name: '聚气丹',
      icon: '💊',
      type: '丹药',
      quality: '黄品下',
      description: '服用后可增加50点修为进度',
      cost: 100,
      stock: 10
    },
    {
      id: 'pill_002',
      name: '疗伤丹',
      icon: '💊',
      type: '丹药',
      quality: '黄品中',
      description: '服用后可恢复30%气血',
      cost: 150,
      stock: 5
    },
    {
      id: 'tech_001',
      name: '基础剑诀',
      icon: '📜',
      type: '功法',
      quality: '黄品下',
      description: '外门入门剑法，可解锁基础剑术',
      cost: 300,
      stock: undefined
    },
    {
      id: 'equip_001',
      name: '弟子剑',
      icon: '⚔️',
      type: '装备',
      quality: '凡品',
      description: '宗门制式佩剑，攻击+5',
      cost: 200,
      stock: 3
    },
    {
      id: 'mat_001',
      name: '灵草',
      icon: '🌿',
      type: '材料',
      quality: '凡品',
      description: '常见炼丹材料',
      cost: 50,
      stock: 20
    }
  ];
});

// 过滤后的物品
const filteredItems = computed(() => {
  if (activeTab.value === 'all') return exchangeItems.value;
  return exchangeItems.value.filter(item => item.type === activeTab.value);
});

// 品质样式
function getQualityClass(quality: string): string {
  if (quality.includes('凡')) return 'quality-common';
  if (quality.includes('黄')) return 'quality-yellow';
  if (quality.includes('玄')) return 'quality-xuan';
  if (quality.includes('地')) return 'quality-earth';
  if (quality.includes('天')) return 'quality-heaven';
  return 'quality-common';
}

// 按钮文字
function getButtonText(item: { cost: number; stock?: number }): string {
  if (item.stock === 0) return '已售罄';
  if (playerContribution.value < item.cost) return '贡献不足';
  return '兑换';
}

// 兑换物品
function exchangeItem(item: { name: string; cost: number }) {
  const prompt = `我想用${item.cost}贡献点兑换「${item.name}」`;
  sendPrompt(prompt);
}

function sendPrompt(text: string) {
  sendChat(text);
  toast.success('已发送到对话');
}
</script>

<style scoped>
.sect-contribution {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 60vh;
  overflow-y: auto;
}

.player-info-bar {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(168, 85, 247, 0.05));
  border-radius: 8px;
  border: 1px solid rgba(147, 51, 234, 0.2);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-item.highlight {
  padding: 0.25rem 0.75rem;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.info-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.info-value {
  font-weight: 600;
  font-size: 0.9rem;
}

.info-value.position { color: #9333ea; }
.info-value.contribution { color: #f59e0b; font-size: 1.1rem; }

.exchange-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: rgba(245, 158, 11, 0.3);
  color: var(--color-text);
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05));
  border-color: rgba(245, 158, 11, 0.4);
  color: #f59e0b;
}

.exchange-list {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 0.5rem;
}

.empty-text {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.empty-hint {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 1rem;
}

.ask-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ask-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.item-card {
  padding: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.item-card:hover {
  border-color: rgba(245, 158, 11, 0.3);
}

.item-card.can-afford {
  border-color: rgba(34, 197, 94, 0.3);
}

.item-card.out-of-stock {
  opacity: 0.5;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.item-icon {
  font-size: 1.5rem;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.item-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text);
}

.item-quality {
  font-size: 0.7rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-weight: 500;
  width: fit-content;
}

.quality-common { background: rgba(156, 163, 175, 0.2); color: #6b7280; }
.quality-yellow { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.quality-xuan { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.quality-earth { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.quality-heaven { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.item-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.item-cost {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #f59e0b;
}

.item-stock {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.exchange-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.exchange-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.exchange-btn:disabled {
  background: #6b7280;
  cursor: not-allowed;
}

.contribution-tips {
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.tips-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.tips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding: 0.25rem 0.5rem;
  background: var(--color-background);
  border-radius: 4px;
}

.exchange-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  font-size: 0.75rem;
  color: #3b82f6;
}
</style>
