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
      <div class="info-actions">
        <button class="gen-btn" @click="generateShopContent" :disabled="isGenerating || !canGenerate">
          <RefreshCw :size="14" :class="{ spin: isGenerating }" />
          <span>{{ hasItems ? '换一批' : '生成商店' }}</span>
        </button>
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
        <button v-if="canGenerate" class="ask-btn" @click="generateShopContent" :disabled="isGenerating">
          <RefreshCw :size="14" :class="{ spin: isGenerating }" />
          <span>{{ isGenerating ? '生成中...' : '点击生成' }}</span>
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
  Coins, Package, ShoppingCart, Info, RefreshCw,
  Pill, Sword, BookOpen, Gem
} from 'lucide-vue-next';
import { toast } from '@/utils/toast';
import { sendChat } from '@/utils/chatBus';
import { useCharacterStore } from '@/stores/characterStore';
import { generateWithRawPrompt } from '@/utils/tavernCore';
import { parseJsonSmart } from '@/utils/jsonExtract';
import { aiService } from '@/services/aiService';

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();
const activeTab = ref<string>('all');
const isGenerating = ref(false);

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
const canGenerate = computed(() => !!playerSectInfo.value?.宗门名称 && !!gameStateStore.sectSystem);

// 可兑换物品列表（来自宗门系统）
type ExchangeItem = {
  id: string;
  name: string;
  icon: string;
  type: string;
  quality: string;
  description: string;
  cost: number;
  stock?: number;
};

const normalizeExchangeItem = (raw: any, index: number): ExchangeItem => ({
  id: raw?.id || raw?.物品ID || `sect_item_${index}`,
  name: raw?.name || raw?.名称 || '未知物品',
  icon: raw?.icon || 'O',
  type: raw?.type || raw?.类型 || '其他',
  quality: raw?.quality || raw?.品质 || '凡品',
  description: raw?.description || raw?.描述 || '',
  cost: Number(raw?.cost ?? raw?.价格 ?? 0),
  stock: raw?.stock ?? raw?.库存,
});

const exchangeItems = computed<ExchangeItem[]>(() => {
  const sectName = playerSectInfo.value?.宗门名称;
  if (!sectName) return [];

  const rawItems = gameStateStore.sectSystem?.宗门贡献商店?.[sectName];
  if (!Array.isArray(rawItems)) return [];

  return rawItems.map(normalizeExchangeItem);
});
const hasItems = computed(() => exchangeItems.value.length > 0);
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

async function generateShopContent() {
  if (!canGenerate.value) {
    toast.warning('未加入宗门或宗门数据未加载');
    return;
  }
  if (isGenerating.value) return;
  isGenerating.value = true;
  try {
    const sectName = String(playerSectInfo.value?.宗门名称 || '').trim();
    if (!sectName) {
      toast.warning('未加入宗门');
      return;
    }

    const saveData = gameStateStore.getCurrentSaveData();
    if (!saveData) {
      toast.error('未加载存档，无法生成');
      return;
    }

    const sectProfile = (gameStateStore.sectSystem as any)?.宗门档案?.[sectName] ?? null;
    const existing = (gameStateStore.sectSystem as any)?.宗门贡献商店?.[sectName] ?? [];
    const existingNames = Array.isArray(existing)
      ? existing
          .map((v: any) => String(v?.name || v?.名称 || '').trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    const nowIso = new Date().toISOString();
    const prompt = `
# 任务：生成【宗门贡献商店】可兑换物品（单次功能请求）
你将为宗门「${sectName}」生成“贡献点兑换商店”的物品条目，供前端展示与玩家点击兑换。

## 输出格式（必须）
只输出 1 个 JSON 对象（不要代码块/不要解释/不要额外文本/不要<thinking>）：
{"text":"...","items":[...],"evolve_count":1,"last_updated":"${nowIso}"}

## 顶层字段严格限制（强JSON）
- 顶层只允许：text / items / evolve_count / last_updated
- 禁止输出任何额外字段（例如：tavern_commands / action_options / 社交 / 宗门 / 系统 等）
- items 必须是数组
- 禁止输出多个 JSON 或 JSON 之外的任何字符

## 说明
- 程序会把 items 写入宗门贡献商店并更新内容状态
- evolve_count/last_updated 可省略，缺失时由程序自动补全

## 物品对象字段（每条必须包含）
{
  "id": "string（唯一，建议 sectshop_<随机>）",
  "name": "string（物品名）",
  "icon": "string（1-2字符，如：丹/剑/卷/玉/符/草/石）",
  "type": "丹药|功法|装备|材料|其他",
  "quality": "凡品|黄品|玄品|地品|天品|仙品|神品",
  "description": "string（20-80字，简介）",
  "cost": number（正整数，贡献点）
}
可选字段（如有就填，没必要可省略）："stock" "使用效果" "限购数量" "职位要求" "稀有度"

## 约束（必须遵守）
- 生成 12-24 件物品，type 至少覆盖 4 类
- cost 需拉开梯度，不能全都同价；高品阶更贵
- stock 可选：如提供必须是 0-999 的整数（0 表示售罄）
- 内容必须与宗门设定匹配；不要出现现代枪械、现实品牌等
- 不要输出 Markdown（不要#、不要列表符号作为行首），JSON 字符串内换行用 \\\\n
- text 字段写简短系统提示即可，例如：〔宗门贡献商店已更新〕（不要长篇叙事）

## 宗门信息（参考）
- 玩家职位：${playerPosition.value}
- 玩家可用贡献点：${playerContribution.value}
- 宗门档案（可能为空）：${JSON.stringify(sectProfile).slice(0, 1200)}
- 现有条目（仅供参考，可替换）：${existingNames.join('，') || '（无）'}
    `.trim();

    const raw = await generateWithRawPrompt('生成宗门贡献商店', prompt, false, 'sect_generation');
    const parsed = parseJsonSmart(raw, aiService.isForceJsonEnabled('sect_generation')) as {
      text?: string;
      items?: unknown;
      evolve_count?: number;
      last_updated?: string;
    };

    if (!Array.isArray(parsed.items)) {
      throw new Error('items 字段缺失或不是数组');
    }

    const updated = typeof structuredClone === 'function'
      ? structuredClone(saveData)
      : JSON.parse(JSON.stringify(saveData));

    const socialRoot = ((updated as any).社交 ??= {});
    const sectRoot = (socialRoot.宗门 ??= {});
    const shopRoot = (sectRoot.宗门贡献商店 ??= {});
    shopRoot[sectName] = parsed.items;

    const statusRoot = (sectRoot.内容状态 ??= {});
    const status = (statusRoot[sectName] ??= {});
    const prevCount = typeof status.演变次数 === 'number' ? status.演变次数 : 0;
    const evolveCount = typeof parsed.evolve_count === 'number' && Number.isFinite(parsed.evolve_count)
      ? parsed.evolve_count
      : prevCount + 1;
    const lastUpdated = typeof parsed.last_updated === 'string' && parsed.last_updated.trim()
      ? parsed.last_updated
      : nowIso;

    status.贡献商店已初始化 = true;
    status.最后更新时间 = lastUpdated;
    status.演变次数 = evolveCount;

    gameStateStore.loadFromSaveData(updated);
    await characterStore.saveCurrentGame();
    toast.success('宗门贡献商店已更新');
  } catch (e) {
    console.error('[SectShop] generate failed', e);
    toast.error('生成失败，请稍后重试');
  } finally {
    isGenerating.value = false;
  }
}
</script>

<style scoped>
.sect-contribution {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.player-info-bar {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(168, 85, 247, 0.05));
  border-radius: 8px;
  border: 1px solid rgba(147, 51, 234, 0.2);
}

.info-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.gen-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.25);
  background: rgba(245, 158, 11, 0.08);
  color: #f59e0b;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.gen-btn:hover:not(:disabled) {
  border-color: rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.12);
}

.gen-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  left: 4px;
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
  min-height: 0;
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

