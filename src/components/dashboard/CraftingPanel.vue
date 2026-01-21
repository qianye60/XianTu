<template>
  <div class="crafting-panel">
    <div class="toolbar">
      <div class="title">
        <span class="title-text">炼制工坊</span>
        <span class="meta">· {{ craftingType === '炼丹' ? '丹炉' : '器炉' }}</span>
      </div>

      <div class="toolbar-actions">
        <button class="mode-btn" :class="{ active: craftingType === '炼丹' }" @click="craftingType = '炼丹'">
          <Flame :size="14" />
          <span>炼丹</span>
        </button>
        <button class="mode-btn" :class="{ active: craftingType === '炼器' }" @click="craftingType = '炼器'">
          <Hammer :size="14" />
          <span>炼器</span>
        </button>
        <div class="simulation-toggle" title="开启后：点击开始炼制会先进行推演并弹窗确认">
          <span class="toggle-text">成功率推演</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="enableSimulation" @change="resetSimulation" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="crafting-area">
        <div class="craft-grid" aria-label="炼制槽位">
          <!-- 第一行：1 2 3 -->
          <button
            v-for="slot in slots.slice(0, 3)"
            :key="slot.slotId"
            class="slot"
            :class="{ active: selectedSlotId === slot.slotId, filled: !!slot.itemId }"
            @click="selectedSlotId = slot.slotId"
          >
            <template v-if="slot.itemId && inventoryItems[slot.itemId]">
              <div class="slot-item">
                <div class="slot-item-name" :class="getItemQualityClass(inventoryItems[slot.itemId])">
                  {{ inventoryItems[slot.itemId].名称 }}
                </div>
                <div class="slot-item-meta">
                  <span class="meta-pill">{{ inventoryItems[slot.itemId].类型 }}</span>
                  <span class="meta-pill">
                    {{ inventoryItems[slot.itemId].品质.quality }}·{{ getGradeText(inventoryItems[slot.itemId].品质.grade) }}
                    ({{ inventoryItems[slot.itemId].品质.grade }})
                  </span>
                </div>
              </div>
              <button class="slot-remove" title="移除" @click.stop="removeFromSlot(slot.slotId)">
                <X :size="14" />
              </button>
            </template>
            <template v-else>
              <div class="slot-empty">
                <div class="slot-index">{{ slot.slotId }}</div>
                <div class="slot-hint">放入材料</div>
              </div>
            </template>
          </button>

          <!-- 第二行：4 炉 5 -->
          <button
            v-for="slot in slots.slice(3, 4)"
            :key="slot.slotId"
            class="slot"
            :class="{ active: selectedSlotId === slot.slotId, filled: !!slot.itemId }"
            @click="selectedSlotId = slot.slotId"
          >
            <template v-if="slot.itemId && inventoryItems[slot.itemId]">
              <div class="slot-item">
                <div class="slot-item-name" :class="getItemQualityClass(inventoryItems[slot.itemId])">
                  {{ inventoryItems[slot.itemId].名称 }}
                </div>
                <div class="slot-item-meta">
                  <span class="meta-pill">{{ inventoryItems[slot.itemId].类型 }}</span>
                  <span class="meta-pill">
                    {{ inventoryItems[slot.itemId].品质.quality }}·{{ getGradeText(inventoryItems[slot.itemId].品质.grade) }}
                    ({{ inventoryItems[slot.itemId].品质.grade }})
                  </span>
                </div>
              </div>
              <button class="slot-remove" title="移除" @click.stop="removeFromSlot(slot.slotId)">
                <X :size="14" />
              </button>
            </template>
            <template v-else>
              <div class="slot-empty">
                <div class="slot-index">{{ slot.slotId }}</div>
                <div class="slot-hint">放入材料</div>
              </div>
            </template>
          </button>

          <div class="furnace-cell" aria-label="炼制炉">
            <div class="furnace-icon">
              <component :is="craftingType === '炼丹' ? Flame : Hammer" :size="24" />
            </div>
          </div>

          <button
            v-for="slot in slots.slice(4, 5)"
            :key="slot.slotId"
            class="slot"
            :class="{ active: selectedSlotId === slot.slotId, filled: !!slot.itemId }"
            @click="selectedSlotId = slot.slotId"
          >
            <template v-if="slot.itemId && inventoryItems[slot.itemId]">
              <div class="slot-item">
                <div class="slot-item-name" :class="getItemQualityClass(inventoryItems[slot.itemId])">
                  {{ inventoryItems[slot.itemId].名称 }}
                </div>
                <div class="slot-item-meta">
                  <span class="meta-pill">{{ inventoryItems[slot.itemId].类型 }}</span>
                  <span class="meta-pill">
                    {{ inventoryItems[slot.itemId].品质.quality }}·{{ getGradeText(inventoryItems[slot.itemId].品质.grade) }}
                    ({{ inventoryItems[slot.itemId].品质.grade }})
                  </span>
                </div>
              </div>
              <button class="slot-remove" title="移除" @click.stop="removeFromSlot(slot.slotId)">
                <X :size="14" />
              </button>
            </template>
            <template v-else>
              <div class="slot-empty">
                <div class="slot-index">{{ slot.slotId }}</div>
                <div class="slot-hint">放入材料</div>
              </div>
            </template>
          </button>
        </div>

        <div class="options">
          <div class="option">
            <div class="option-title">火候强度</div>
            <div class="range-row">
              <input v-model.number="firePowerPercent" type="range" min="1" max="100" step="1" class="range" />
              <div class="range-meta">
                <span class="range-val">{{ firePowerPercent }}%</span>
                <span class="range-hint">{{ firePowerLabel }}</span>
              </div>
            </div>
          </div>

          <div class="option">
            <div class="option-title">灵气投入</div>
            <div class="range-row">
              <input v-model.number="manaUsePercent" type="range" min="1" max="100" step="1" class="range" />
              <div class="range-meta">
                <span class="range-val">{{ manaUsePercent }}%</span>
                <span class="range-hint">消耗 {{ manaCostTotal }} / 当前 {{ manaCurrent }}</span>
              </div>
            </div>
          </div>

          <div class="option">
            <div class="option-title">神识投入</div>
            <div class="range-row">
              <input v-model.number="spiritUsePercent" type="range" min="1" max="100" step="1" class="range" />
              <div class="range-meta">
                <span class="range-val">{{ spiritUsePercent }}%</span>
                <span class="range-hint">消耗 {{ spiritCostTotal }} / 当前 {{ spiritCurrent }}</span>
              </div>
            </div>
          </div>

          <div class="option">
            <div class="option-title">阵法</div>
            <select v-model="formationId" class="select">
              <option v-for="f in formationOptions" :key="f.id" :value="f.id">
                {{ f.name }}（额外：灵气+{{ f.extraManaPercent }}% / 神识+{{ f.extraSpiritPercent }}%）
              </option>
            </select>
            <div class="select-hint">
              <span class="select-desc">{{ selectedFormation.desc }}</span>
            </div>
          </div>
        </div>


        <div class="actions">
          <button class="primary-btn" :disabled="!canCraft || isCrafting" @click="startCrafting">
            <span v-if="isCrafting">{{ enableSimulation && !hasConfirmedSimulation ? '推演中...' : '炼制中...' }}</span>
            <span v-else>开始{{ craftingType }}</span>
          </button>
          <button class="secondary-btn" :disabled="isCrafting" @click="clearSlots">清空材料</button>
        </div>
      </div>

      <div class="materials-area">
        <div class="materials-header">
          <div class="materials-title">可用材料</div>
          <div class="materials-tools">
            <Search :size="14" class="search-icon" />
            <input v-model="search" class="search" type="text" placeholder="搜索名称..." />
          </div>
        </div>

        <div v-if="totalMaterials === 0" class="materials-empty">
          <div class="empty-title">暂无可用材料</div>
          <div class="empty-hint">
            需要【材料】
          </div>
        </div>

        <div v-else class="materials-list">
          <button
            v-for="item in pagedMaterials"
            :key="item.物品ID"
            class="material"
            :class="getItemQualityClass(item)"
            @click="addToSlot(item)"
          >
            <div class="material-main">
              <div class="material-name">{{ item.名称 }}</div>
              <div class="material-meta">
                <span class="meta-pill">{{ item.类型 }}</span>
                <span class="meta-pill">
                  {{ item.品质.quality }}·{{ getGradeText(item.品质.grade) }}({{ item.品质.grade }})
                </span>
              </div>
            </div>
            <div class="material-right">
              <span class="count">×{{ item.数量 }}</span>
              <Plus :size="14" class="add-icon" />
            </div>
          </button>
        </div>

        <!-- 分页控件 -->
        <div v-if="totalPages > 1" class="pagination">
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="currentPage = 1"
            title="首页"
          >
            «
          </button>
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="currentPage--"
            title="上一页"
          >
            ‹
          </button>
          <span class="page-info">
            {{ currentPage }} / {{ totalPages }}
            <span class="total-count">(共{{ totalMaterials }}个)</span>
          </span>
          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
            title="下一页"
          >
            ›
          </button>
          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="currentPage = totalPages"
            title="末页"
          >
            »
          </button>
        </div>
      </div>
    </div>

    <div v-if="showResult" class="modal-overlay" @click.self="closeResult">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">
            {{ result?.success ? '炼制成功' : '炼制失败' }} · {{ result?.successRate }}%
          </div>
          <button class="icon-btn" @click="closeResult" title="关闭"><X :size="16" /></button>
        </div>

        <div class="modal-body">
          <div v-if="result" class="result-summary">
            <div class="summary-row">
              <span class="k">结果品质</span>
              <span class="v">
                {{ result.resultQuality.quality }}·{{ getGradeText(result.resultQuality.grade) }}({{ result.resultQuality.grade }})
              </span>
            </div>
            <div class="summary-row">
              <span class="k">产物</span>
              <span class="v">{{ resultItem?.名称 || '（无）' }}</span>
            </div>
            <div v-if="resultItem?.描述" class="summary-row">
              <span class="k">描述</span>
              <span class="v summary-desc">{{ resultItem.描述 }}</span>
            </div>
          </div>

          <div class="narrative">
            <div class="narrative-title">炼制过程</div>
            <div class="narrative-text">{{ processText }}</div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="primary-btn" @click="closeResult">确定</button>
        </div>
      </div>
    </div>

    <div v-if="showSimulationConfirm" class="modal-overlay" @click.self="cancelSimulation">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">推演完成 · 是否继续炼制？</div>
          <button class="icon-btn" @click="cancelSimulation" title="关闭"><X :size="16" /></button>
        </div>
        <div class="modal-body">
          <div class="result-summary">
            <div class="summary-row">
              <span class="k">成功率</span>
              <span class="v">{{ simulationResult?.successRate ?? '—' }}%</span>
            </div>
            <div class="summary-row" v-if="simulationResult?.predictedQuality">
              <span class="k">预期品质</span>
              <span class="v">
                {{ simulationResult.predictedQuality.quality }}·{{ getGradeText(simulationResult.predictedQuality.grade) }}({{ simulationResult.predictedQuality.grade }})
              </span>
            </div>
            <div class="summary-row" v-if="simulationResult?.analysis">
              <span class="k">推演</span>
              <span class="v summary-desc">{{ simulationResult.analysis }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer modal-footer-split">
          <button class="secondary-btn" @click="cancelSimulation">取消</button>
          <button class="primary-btn" @click="confirmSimulationAndCraft">继续炼制</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Flame, Hammer, Search, Plus, X } from 'lucide-vue-next';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore';
import type { Item } from '@/types/game';
import { toast } from '@/utils/toast';
import { type CraftingType } from '@/utils/craftingSystem';
import { generateWithRawPrompt } from '@/utils/tavernCore';
import { computeCrafting, type FireLevel, type Formation } from '@/utils/craftingSystem';
import { buildCraftingNarrativePrompts, buildCraftingSimulationPrompts } from '@/utils/prompts/tasks/craftingPrompts';

type Slot = { slotId: number; itemId: string | null };

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();

const craftingType = ref<CraftingType>('炼丹');
const firePowerPercent = ref(50); // 1-100
const manaUsePercent = ref(16); // 1-100
const spiritUsePercent = ref(16); // 1-100
const search = ref('');

// 分页相关
const currentPage = ref(1);
const itemsPerPage = 6; // 每页显示材料数（固定，避免高度抖动）

const selectedSlotId = ref<number>(1);
const slots = ref<Slot[]>([
  { slotId: 1, itemId: null },
  { slotId: 2, itemId: null },
  { slotId: 3, itemId: null },
  { slotId: 4, itemId: null },
  { slotId: 5, itemId: null },
]);

const isCrafting = ref(false);
const showResult = ref(false);
type DisplayResult = {
  successRate: number;
  success: boolean;
  resultQuality: { quality: any; grade: any };
  materialQualityScore: number;
  daoBonusStage: number;
};
const result = ref<DisplayResult | null>(null);
const resultItem = ref<Item | null>(null);
const processText = ref('');

const enableSimulation = ref(true);
const showSimulationConfirm = ref(false);
const hasConfirmedSimulation = ref(false);
const simulationResult = ref<null | {
  successRate: number;
  predictedQuality?: { quality: any; grade: any };
  analysis?: string;
  warnings?: string[];
}>(null);

type FormationOption = {
  id: string;
  name: string;
  desc: string;
  extraManaPercent: number; // 额外消耗：占当前灵气的百分比
  extraSpiritPercent: number; // 额外消耗：占当前神识的百分比
};

const FORMATIONS: Record<CraftingType, FormationOption[]> = {
  炼丹: [
    { id: 'none', name: '无阵', desc: '不布阵，省力但更吃手感。', extraManaPercent: 0, extraSpiritPercent: 0 },
    { id: 'stable', name: '稳灵阵', desc: '稳住灵力流转，容错更高。', extraManaPercent: 4, extraSpiritPercent: 2 },
    { id: 'gather', name: '聚灵阵', desc: '聚拢灵气，适合药力凝聚。', extraManaPercent: 8, extraSpiritPercent: 3 },
    { id: 'focus', name: '凝神阵', desc: '凝神守一，适合控火与细节推衍。', extraManaPercent: 4, extraSpiritPercent: 8 },
    { id: 'condense', name: '凝丹阵', desc: '专注于成丹瞬间的凝结，风险也更集中。', extraManaPercent: 10, extraSpiritPercent: 10 },
    { id: 'purify', name: '净尘阵', desc: '祛杂去秽，降低杂质干扰。', extraManaPercent: 6, extraSpiritPercent: 4 },
    { id: 'seal', name: '封息阵', desc: '封住炉内药气，避免外泄与串味。', extraManaPercent: 7, extraSpiritPercent: 5 },
    { id: 'balance', name: '阴阳调和阵', desc: '调和阴阳，适合多性材料。', extraManaPercent: 9, extraSpiritPercent: 9 },
  ],
  炼器: [
    { id: 'none', name: '无阵', desc: '不布阵，靠锻打与心神掌控。', extraManaPercent: 0, extraSpiritPercent: 0 },
    { id: 'stable', name: '稳灵阵', desc: '稳住灵力灌注，减少走火与裂纹。', extraManaPercent: 4, extraSpiritPercent: 2 },
    { id: 'gather', name: '聚灵阵', desc: '提高灵力供给，利于材质融合。', extraManaPercent: 8, extraSpiritPercent: 3 },
    { id: 'focus', name: '凝神阵', desc: '加强神识操控，利于刻纹与成型。', extraManaPercent: 4, extraSpiritPercent: 8 },
    { id: 'temper', name: '淬器阵', desc: '专用于淬火定型，成器更锋，但更耗心神。', extraManaPercent: 10, extraSpiritPercent: 10 },
    { id: 'forge', name: '锻纹阵', desc: '加速刻纹与铭刻，适合复杂器胚。', extraManaPercent: 8, extraSpiritPercent: 12 },
    { id: 'bind', name: '缚形阵', desc: '束缚形态，减少成型偏差。', extraManaPercent: 9, extraSpiritPercent: 6 },
    { id: 'resonance', name: '共鸣阵', desc: '引导材质共鸣，利于高品质跃迁。', extraManaPercent: 12, extraSpiritPercent: 12 },
  ],
};

const formationOptions = computed(() => FORMATIONS[craftingType.value]);
const formationId = ref<string>('none');
const selectedFormation = computed<FormationOption>(() => {
  return formationOptions.value.find((f) => f.id === formationId.value) ?? formationOptions.value[0];
});

watch(craftingType, () => {
  const exists = formationOptions.value.some((f) => f.id === formationId.value);
  if (!exists) formationId.value = 'none';
});

const firePowerLabel = computed(() => {
  const v = Number(firePowerPercent.value);
  if (v <= 25) return '文火';
  if (v <= 50) return '中火';
  if (v <= 75) return '武火';
  return '暴火';
});

const manaCurrent = computed(() => Math.max(0, Number(gameStateStore.attributes?.灵气?.当前 ?? 0) || 0));
const spiritCurrent = computed(() => Math.max(0, Number(gameStateStore.attributes?.神识?.当前 ?? 0) || 0));

const clampPercent = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(100, Math.round(n)));
};

watch(firePowerPercent, (v) => (firePowerPercent.value = clampPercent(v)));
watch(manaUsePercent, (v) => (manaUsePercent.value = clampPercent(v)));
watch(spiritUsePercent, (v) => (spiritUsePercent.value = clampPercent(v)));

const costByPercent = (current: number, percent: number) => Math.max(0, Math.min(current, Math.floor((current * percent) / 100)));

const manaCostBase = computed(() => costByPercent(manaCurrent.value, manaUsePercent.value));
const spiritCostBase = computed(() => costByPercent(spiritCurrent.value, spiritUsePercent.value));
const manaCostExtra = computed(() => costByPercent(manaCurrent.value, selectedFormation.value.extraManaPercent));
const spiritCostExtra = computed(() => costByPercent(spiritCurrent.value, selectedFormation.value.extraSpiritPercent));
const manaCostTotal = computed(() => manaCostBase.value + manaCostExtra.value);
const spiritCostTotal = computed(() => spiritCostBase.value + spiritCostExtra.value);

const inventoryItems = computed<Record<string, Item>>(() => gameStateStore.inventory?.物品 || {});

const selectedMaterials = computed<Item[]>(() => {
  return slots.value
    .map(s => (s.itemId ? inventoryItems.value[s.itemId] : null))
    .filter((v): v is Item => !!v)
    .filter(v => isItemSuitable(v));
});

const isItemSuitable = (item: Item) => {
  if ((item as any).已装备) return false;
  return item.类型 === '材料';
};

const availableMaterials = computed<Item[]>(() => {
  const items = Object.values(inventoryItems.value);
  return items.filter(i => isItemSuitable(i) && i.数量 > 0);
});

const filteredAllMaterials = computed<Item[]>(() => {
  const q = search.value.trim();
  const base = availableMaterials.value;
  return !q ? base : base.filter(i => i.名称.includes(q));
});

// 总材料数和总页数
const totalMaterials = computed(() => {
  return filteredAllMaterials.value.length;
});

const totalPages = computed(() => Math.max(1, Math.ceil(totalMaterials.value / itemsPerPage)));

const pagedMaterials = computed<Item[]>(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredAllMaterials.value.slice(start, end);
});

// 监听搜索变化,重置到第一页
watch(search, () => {
  currentPage.value = 1;
});

// 防止页码越界导致“暂无可用材料”（但实际还有材料）
watch([totalMaterials, totalPages], () => {
  if (totalMaterials.value <= 0) {
    currentPage.value = 1;
    return;
  }
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
  if (currentPage.value < 1) currentPage.value = 1;
});

const canCraft = computed(() => selectedMaterials.value.length > 0);

const rateClass = computed(() => {
  const r = simulationResult.value?.successRate ?? 0;
  if (r >= 75) return 'high';
  if (r >= 45) return 'mid';
  return 'low';
});

const getGradeText = (grade: number | string): string => {
  if (typeof grade === 'string') return grade;
  if (grade === 0) return '残缺';
  if (grade >= 1 && grade <= 3) return '下品';
  if (grade >= 4 && grade <= 6) return '中品';
  if (grade >= 7 && grade <= 9) return '上品';
  if (grade === 10) return '极品';
  return '未知';
};

const getItemQualityClass = (item: Item | null): string => {
  const q = item?.品质?.quality ?? '凡';
  return `q-${q}`;
};

const getUsedCount = (itemId: string) => slots.value.filter(s => s.itemId === itemId).length;

const addToSlot = (item: Item) => {
  const used = getUsedCount(item.物品ID);
  if (used >= (item.数量 || 0)) {
    toast.error('该物品数量不足');
    return;
  }

  const targetId = selectedSlotId.value;
  const target = slots.value.find(s => s.slotId === targetId);
  if (target && !target.itemId) {
    target.itemId = item.物品ID;
    return;
  }

  const empty = slots.value.find(s => !s.itemId);
  if (!empty) {
    toast.error('材料槽已满');
    return;
  }
  empty.itemId = item.物品ID;
  selectedSlotId.value = empty.slotId;
};

const removeFromSlot = (slotId: number) => {
  const slot = slots.value.find(s => s.slotId === slotId);
  if (slot) slot.itemId = null;
};

const clearSlots = () => {
  slots.value = slots.value.map(s => ({ ...s, itemId: null }));
  selectedSlotId.value = 1;
  resetSimulation();
};

const closeResult = () => {
  showResult.value = false;
};

const resetSimulation = () => {
  simulationResult.value = null;
  showSimulationConfirm.value = false;
  hasConfirmedSimulation.value = false;
};

watch([craftingType, firePowerPercent, manaUsePercent, spiritUsePercent, formationId, slots], () => {
  if (enableSimulation.value) resetSimulation();
}, { deep: true });

const cancelSimulation = () => {
  showSimulationConfirm.value = false;
  hasConfirmedSimulation.value = false;
};

const confirmSimulationAndCraft = async () => {
  showSimulationConfirm.value = false;
  hasConfirmedSimulation.value = true;
  if (isCrafting.value) return;
  isCrafting.value = true;
  try {
    await finalizeCrafting();
  } finally {
    isCrafting.value = false;
  }
};

const startCrafting = async () => {
  if (isCrafting.value) return;
  if (!gameStateStore.character?.先天六司) {
    toast.error('角色数据未就绪，无法炼制');
    return;
  }
  if (!gameStateStore.attributes) {
    toast.error('角色属性未就绪，无法炼制');
    return;
  }
  if (!canCraft.value) {
    toast.error('请先放入材料');
    return;
  }

  isCrafting.value = true;
  try {
    // 1) 检查材料数量是否足够（支持同一物品多槽位）
    const needById = new Map<string, number>();
    for (const s of slots.value) {
      if (!s.itemId) continue;
      needById.set(s.itemId, (needById.get(s.itemId) ?? 0) + 1);
    }

    for (const [itemId, need] of needById.entries()) {
      const inv = inventoryItems.value[itemId];
      if (!inv) throw new Error(`背包中不存在物品: ${itemId}`);
      if ((inv as any).已装备) throw new Error(`物品已装备，无法作为材料: ${inv.名称}`);
      if (inv.类型 !== '材料') throw new Error(`不是材料，无法用于炼制：${inv.名称}`);
      if ((inv.数量 ?? 0) < need) throw new Error(`物品数量不足: ${inv.名称}`);
    }

    const materialSnapshots = selectedMaterials.value.map(m => ({
      名称: m.名称,
      类型: m.类型,
      品质: { quality: m.品质?.quality ?? '凡', grade: Number(m.品质?.grade ?? 0) },
      描述: m.描述,
    }));

    // 2) 可选：先推演，再确认是否继续
    if (enableSimulation.value && !hasConfirmedSimulation.value) {
      const { systemPrompt, userPrompt } = buildCraftingSimulationPrompts({
        type: craftingType.value,
        fire: { percent: firePowerPercent.value, label: firePowerLabel.value },
        formation: selectedFormation.value,
        resources: {
          灵气: {
            当前: manaCurrent.value,
            投入百分比: manaUsePercent.value,
            阵法额外百分比: selectedFormation.value.extraManaPercent,
            基础消耗: manaCostBase.value,
            额外消耗: manaCostExtra.value,
            总消耗: manaCostTotal.value,
          },
          神识: {
            当前: spiritCurrent.value,
            投入百分比: spiritUsePercent.value,
            阵法额外百分比: selectedFormation.value.extraSpiritPercent,
            基础消耗: spiritCostBase.value,
            额外消耗: spiritCostExtra.value,
            总消耗: spiritCostTotal.value,
          },
        },
        materials: materialSnapshots,
        characterSnapshot: buildCharacterSnapshot(),
      });
      try {
        const raw = await generateWithRawPrompt(userPrompt, systemPrompt, false, 'crafting');
        const parsed = parseFirstJsonObject(raw);
        const rate = Number(parsed?.successRate);
        if (!Number.isFinite(rate)) throw new Error('推演输出缺少 successRate');
        simulationResult.value = {
          successRate: Math.max(5, Math.min(95, Math.round(rate))),
          predictedQuality: parsed?.predictedQuality,
          analysis: typeof parsed?.analysis === 'string' ? parsed.analysis : '',
          warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.map(String) : [],
        };
        showSimulationConfirm.value = true;
        return;
      } catch (e) {
        console.warn('[Crafting] 推演失败，将直接进入炼制', e);
        resetSimulation();
      }
    }

    await finalizeCrafting(needById, materialSnapshots);
  } catch (e) {
    console.error(e);
    toast.error(e instanceof Error ? e.message : '炼制失败：发生异常');
  } finally {
    isCrafting.value = false;
  }
};

const finalizeCrafting = async (needById?: Map<string, number>, materialSnapshotsArg?: any[]) => {
  const materialSnapshots = materialSnapshotsArg ?? selectedMaterials.value.map(m => ({
    名称: m.名称,
    类型: m.类型,
    品质: { quality: m.品质?.quality ?? '凡', grade: Number(m.品质?.grade ?? 0) },
    描述: m.描述,
  }));

  const fireLabel = firePowerLabel.value as FireLevel;
  const formationName = selectedFormation.value.name as Formation;
  const overrideRate = hasConfirmedSimulation.value ? Number(simulationResult.value?.successRate) : undefined;

  const computation = computeCrafting({
    materials: selectedMaterials.value,
    innate: (gameStateStore.character as any)?.先天六司 ?? {},
    post: (gameStateStore.character as any)?.后天六司 ?? {},
    thousandDao: gameStateStore.thousandDao as any,
    options: {
      type: craftingType.value,
      fire: fireLabel,
      formation: formationName,
      firePowerPercent: firePowerPercent.value,
      manaUsePercent: manaUsePercent.value,
      spiritUsePercent: spiritUsePercent.value,
      overrideSuccessRate: Number.isFinite(overrideRate as number) ? (overrideRate as number) : undefined,
    },
  });

  const success = computation.success;
  const successRate = computation.successRate;
  const resultQuality = computation.resultQuality;

  const resourcePlan = {
    灵气: {
      当前: manaCurrent.value,
      投入百分比: manaUsePercent.value,
      阵法额外百分比: selectedFormation.value.extraManaPercent,
      基础消耗: manaCostBase.value,
      额外消耗: manaCostExtra.value,
      总消耗: manaCostTotal.value,
    },
    神识: {
      当前: spiritCurrent.value,
      投入百分比: spiritUsePercent.value,
      阵法额外百分比: selectedFormation.value.extraSpiritPercent,
      基础消耗: spiritCostBase.value,
      额外消耗: spiritCostExtra.value,
      总消耗: spiritCostTotal.value,
    },
  };

  const { systemPrompt, userPrompt } = buildCraftingNarrativePrompts({
    type: craftingType.value,
    fire: { percent: firePowerPercent.value, label: firePowerLabel.value },
    formation: selectedFormation.value,
    resources: resourcePlan,
    successRate,
    success,
    resultQuality,
    materials: materialSnapshots,
  });

  const raw = await generateWithRawPrompt(userPrompt, systemPrompt, false, 'crafting');
  const parsed = parseFirstJsonObject(raw);

  const now = gameStateStore.gameTime ?? { 年: 0, 月: 0, 日: 0, 小时: 0, 分钟: 0 };
  const process = String(parsed?.processText ?? parsed?.process ?? '').trim() || '炉火翻卷，灵材于鼎中沉浮，气机收束，尘埃落定。';
  const eventDesc = String(parsed?.eventDesc ?? '').trim();

  const newItemId = `craft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const finalType: Item['类型'] = success ? (craftingType.value === '炼丹' ? '丹药' : '装备') : '其他';
  const quality = resultQuality.quality;
  const grade = Number(resultQuality.grade);

  const name =
    String(parsed?.itemName ?? '').trim() ||
    (success ? (craftingType.value === '炼丹' ? '灵丹' : '法宝') : (craftingType.value === '炼丹' ? '废丹' : '炉渣'));
  const desc =
    String(parsed?.itemDesc ?? '').trim() ||
    `品质：${quality}·${getGradeText(grade)}(${grade})`;

  const finalItem: Item = {
    物品ID: newItemId,
    名称: name,
    类型: finalType,
    品质: { quality: quality as any, grade: grade as any },
    数量: 1,
    描述: desc,
    可叠加: finalType !== '装备',
  } as Item;

  const invItems = gameStateStore.inventory?.物品;
  if (!invItems) throw new Error('背包数据未加载');

  const need = needById ?? (() => {
    const map = new Map<string, number>();
    for (const s of slots.value) {
      if (!s.itemId) continue;
      map.set(s.itemId, (map.get(s.itemId) ?? 0) + 1);
    }
    return map;
  })();

  for (const [itemId, cnt] of need.entries()) {
    const inv = invItems[itemId];
    if (!inv) throw new Error(`背包中不存在物品: ${itemId}`);
    if (inv.类型 !== '材料') throw new Error(`不是材料，无法用于炼制：${inv.名称}`);
    if ((inv.数量 ?? 0) < cnt) throw new Error(`材料数量不足：${inv.名称}`);
  }

  for (const [itemId, cnt] of need.entries()) {
    const inv = invItems[itemId];
    const nextQty = (inv.数量 ?? 0) - cnt;
    if (nextQty <= 0) delete invItems[itemId];
    else invItems[itemId] = { ...inv, 数量: nextQty };
  }

  invItems[newItemId] = finalItem;

  // 扣除灵气/神识（按当前值的百分比；阵法会额外扣除）
  if (gameStateStore.attributes) {
    const manaNow = Math.max(0, Number(gameStateStore.attributes.灵气?.当前 ?? 0) || 0);
    const spiritNow = Math.max(0, Number(gameStateStore.attributes.神识?.当前 ?? 0) || 0);
    const manaSpend =
      costByPercent(manaNow, manaUsePercent.value) + costByPercent(manaNow, selectedFormation.value.extraManaPercent);
    const spiritSpend =
      costByPercent(spiritNow, spiritUsePercent.value) + costByPercent(spiritNow, selectedFormation.value.extraSpiritPercent);
    gameStateStore.updateState('attributes.灵气.当前', Math.max(0, manaNow - manaSpend));
    gameStateStore.updateState('attributes.神识.当前', Math.max(0, spiritNow - spiritSpend));
  }

  const materialNames = materialSnapshots.map((m: any) => m.名称).join('、') || '（无）';
  const fallbackEventDesc = [
    `材料：${materialNames}`,
    `火候强度：${firePowerPercent.value}%（${firePowerLabel.value}）；阵法：${selectedFormation.value.name}`,
    `灵气投入：${manaUsePercent.value}%（基础-${manaCostBase.value}，阵法额外-${manaCostExtra.value}，合计-${manaCostTotal.value}）`,
    `神识投入：${spiritUsePercent.value}%（基础-${spiritCostBase.value}，阵法额外-${spiritCostExtra.value}，合计-${spiritCostTotal.value}）`,
    `成功率：${successRate}%；结果：${success ? '成功' : '失败'}；品质：${quality}·${getGradeText(grade)}(${grade})`,
    '',
    process,
  ].join('\n');

  const nextEvents = [
    ...(gameStateStore.eventSystem?.事件记录 || []),
    {
      事件ID: `event_craft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      事件名称: `${craftingType.value}：${name}`,
      事件类型: craftingType.value,
      事件描述: eventDesc || fallbackEventDesc,
      事件来源: '系统',
      发生时间: now,
      影响等级: '轻微',
    },
  ];
  gameStateStore.updateState('eventSystem.事件记录', nextEvents);

  await characterStore.saveCurrentGame();

  result.value = {
    successRate,
    success,
    resultQuality: { quality: quality as any, grade: grade as any },
    materialQualityScore: 0,
    daoBonusStage: 0,
  } as any;
  processText.value = process;
  resultItem.value = finalItem;
  showResult.value = true;

  resetSimulation();
  clearSlots();
};

const buildCharacterSnapshot = () => {
  const char = gameStateStore.character as any;
  const attrs = gameStateStore.attributes as any;
  const dao = gameStateStore.thousandDao as any;

  const daoList: string[] = [];
  if (dao?.大道列表 && typeof dao.大道列表 === 'object') {
    for (const [name, data] of Object.entries(dao.大道列表)) {
      if (!data || typeof data !== 'object') continue;
      if ((data as any).是否解锁 === false) continue;
      const stage = Number((data as any).当前阶段 ?? 0);
      daoList.push(`${name}·阶段${Number.isFinite(stage) ? stage : 0}`);
    }
  }

  return {
    先天六司: char?.先天六司 ?? {},
    后天六司: char?.后天六司 ?? {},
    大道摘要: daoList.slice(0, 20),
    境界: attrs?.境界?.名称 ? `${attrs.境界.名称}${attrs.境界.阶段 ? '·' + attrs.境界.阶段 : ''}` : '',
  };
};

function parseFirstJsonObject(raw: string): any | null {
  if (!raw || typeof raw !== 'string') return null;
  const text = raw.trim();

  const direct = tryParseJson(text);
  if (direct) return direct;

  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (codeBlock?.[1]) {
    const parsed = tryParseJson(codeBlock[1].trim());
    if (parsed) return parsed;
  }

  const extracted = extractFirstJson(text);
  if (extracted) return tryParseJson(extracted);
  return null;
}

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractFirstJson(text: string): string | null {
  const startIndex = text.indexOf('{');
  if (startIndex === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (char === '\\') { escapeNext = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return text.substring(startIndex, i + 1);
    }
  }
  return null;
}
</script>

<style scoped>
.crafting-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--color-background);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-surface);
}

.title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.title-text {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
}

.meta {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.9rem;
}

.mode-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.mode-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: white;
}

.simulation-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.toggle-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-border);
  transition: all 0.2s ease;
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 4px;
  bottom: 4px;
  background: white;
  transition: all 0.2s ease;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

.content {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  padding: 20px;
}

.crafting-area,
.materials-area {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.crafting-area {
  padding: 0;
  gap: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.craft-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: minmax(100px, auto);
  gap: 12px;
  padding: 20px;
  background: var(--color-surface-light);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.slot {
  position: relative;
  width: 100%;
  min-height: 100px;
  border: 2px dashed var(--color-border);
  background: var(--color-surface);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.slot:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.slot.active {
  border-style: solid;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

.slot.filled {
  border-style: solid;
  border-color: var(--color-border);
  background: var(--color-surface-light);
}

.slot-empty {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.slot-index {
  font-weight: 800;
  color: var(--color-text);
}

.slot-hint {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.slot-item-name {
  font-weight: 700;
  color: var(--color-text);
  font-size: 0.82rem;
  line-height: 1.25;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.slot-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.slot-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.slot-remove:hover {
  background: rgba(239, 68, 68, 0.08);
  color: var(--color-error);
}

.furnace-cell {
  border: 2px solid var(--color-primary);
  background: var(--color-surface);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 100px;
}

.furnace-cell .furnace-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  flex-shrink: 0;
}

.furnace-cell .furnace-title {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--color-text);
}

.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: var(--color-surface);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.option {
  padding: 14px;
  background: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.option-title {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.option-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.range-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.range {
  width: 100%;
  accent-color: var(--color-primary);
  height: 5px;
}

.range-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.range-val {
  font-weight: 900;
  color: var(--color-primary);
  font-size: 0.9rem;
}

.range-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.select {
  width: 100%;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  outline: none;
  font-size: 0.88rem;
}

.select-hint {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  line-height: 1.35;
}

.select-desc {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.pill-btn {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.pill-btn:hover {
  background: var(--color-surface-hover);
  transform: translateY(-1px);
}

.pill-btn.active {
  border-color: rgba(var(--color-primary-rgb), 0.55);
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}


.rate-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}

.rate-label {
  font-weight: 700;
  color: var(--color-text);
}

.rate-value {
  font-weight: 900;
}

.rate-value.low {
  color: var(--color-error);
}

.rate-value.mid {
  color: var(--color-warning);
}

.rate-value.high {
  color: var(--color-success);
}

.rate-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(var(--color-primary-rgb), 0.08);
  overflow: hidden;
}

.rate-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.35), rgba(var(--color-primary-rgb), 0.95));
}

.rate-hint {
  margin-top: 8px;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  gap: 12px;
  padding: 20px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.primary-btn,
.secondary-btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.95rem;
}

.primary-btn {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.primary-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.secondary-btn {
  background: var(--color-surface);
  color: var(--color-text);
}

.secondary-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.materials-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  background: var(--color-surface);
}

.materials-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
}

.materials-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  flex: 1;
  max-width: 240px;
}

.materials-tools:focus-within {
  border-color: var(--color-primary);
}

.search-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.search {
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  width: 100%;
}

.materials-empty {
  flex: 1;
  min-height: 0;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  color: var(--color-text-secondary);
}

.empty-title {
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 6px;
}

.materials-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--color-surface);
}

.material {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 72px;
}

.material:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.material-name {
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.material-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.material-right {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-secondary);
}

.count {
  font-weight: 700;
}

.add-icon {
  color: var(--color-primary);
}

.meta-pill {
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
}

/* 分页控件样式 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-light);
  flex-shrink: 0;
}

.page-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
}

.page-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  padding: 0 8px;
  white-space: nowrap;
}

.total-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-left: 4px;
}

/* 品质色（轻量） */
.q-凡 {
  border-color: rgba(128, 128, 128, 0.35);
}
.q-黄 {
  border-color: rgba(218, 165, 32, 0.45);
}
.q-玄 {
  border-color: rgba(147, 112, 219, 0.5);
}
.q-地 {
  border-color: rgba(0, 206, 209, 0.5);
}
.q-天 {
  border-color: rgba(255, 105, 180, 0.5);
}
.q-仙 {
  border-color: rgba(255, 215, 0, 0.6);
}
.q-神 {
  border-color: rgba(153, 50, 204, 0.6);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  width: 100%;
  max-width: 720px;
  max-height: 80vh;
  overflow: hidden;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: linear-gradient(135deg, var(--color-surface), var(--color-surface-light));
}

.modal-title {
  font-weight: 900;
  font-size: 1.15rem;
  color: var(--color-text);
  background: linear-gradient(135deg, var(--color-primary), rgba(var(--color-primary-rgb), 0.7));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.icon-btn {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 10px;
  padding: 8px;
  transition: all 0.3s ease;
}

.icon-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  transform: scale(1.1);
}

.modal-body {
  padding: 20px;
  overflow: auto;
  min-height: 0;
}

.result-summary {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border: 2px solid var(--color-border);
  border-radius: 16px;
  background: linear-gradient(135deg, var(--color-surface-light), var(--color-surface));
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.summary-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 12px;
  align-items: baseline;
}

.summary-row .k {
  color: var(--color-text-secondary);
  font-weight: 800;
  font-size: 0.9rem;
}

.summary-row .v {
  color: var(--color-text);
  font-weight: 700;
}

.summary-desc {
  white-space: pre-wrap;
  line-height: 1.6;
  font-weight: 600;
}

.narrative {
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.05), rgba(var(--color-primary-rgb), 0.02));
  border: 1px solid rgba(var(--color-primary-rgb), 0.15);
}

.narrative-title {
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--color-text);
  margin-bottom: 10px;
}

.narrative-text {
  white-space: pre-wrap;
  line-height: 1.7;
  color: var(--color-text);
  font-size: 0.95rem;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 2px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  background: linear-gradient(135deg, var(--color-surface-light), var(--color-surface));
}

.modal-footer.modal-footer-split {
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 980px) {
  .content {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .crafting-area {
    max-height: none;
  }

  .craft-grid {
    gap: 10px;
    padding: 10px;
  }

  .materials-header {
    flex-direction: column;
    align-items: stretch;
  }

  .materials-tools {
    max-width: 100%;
  }
}

@media (max-width: 520px) {
  .toolbar {
    flex-wrap: wrap;
    padding: 10px 12px;
  }

  .toolbar-actions {
    flex-wrap: wrap;
    width: 100%;
  }

  .toolbar-actions span {
    display: none;
  }

  .simulation-toggle {
    flex: 1;
    min-width: 0;
  }

  .content {
    padding: 10px;
    gap: 12px;
  }

  .crafting-area {
    flex-shrink: 0;
  }

  .craft-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: minmax(60px, auto);
    gap: 8px;
    padding: 10px;
  }

  .slot {
    min-height: 60px;
    padding: 8px;
  }

  .slot-index {
    font-size: 0.9rem;
  }

  .slot-hint {
    font-size: 0.7rem;
  }

  .slot-item-name {
    font-size: 0.75rem;
  }

  .slot-item-meta {
    margin-top: 4px;
    gap: 4px;
  }

  .slot-item-meta .meta-pill {
    font-size: 0.65rem;
    padding: 2px 4px;
  }

  .furnace-cell {
    min-height: 60px;
    padding: 8px;
  }

  .furnace-cell .furnace-icon {
    width: 36px;
    height: 36px;
  }

  .options {
    padding: 12px;
    gap: 10px;
  }

  .option {
    padding: 10px;
  }

  .option-title {
    font-size: 0.85rem;
    margin-bottom: 6px;
  }

  .range-row {
    gap: 4px;
  }

  .range-meta {
    align-items: flex-start;
    min-width: 0;
  }

  .range-hint {
    white-space: normal;
    font-size: 0.7rem;
  }

  .actions {
    padding: 12px;
    gap: 8px;
  }

  .primary-btn,
  .secondary-btn {
    padding: 10px 12px;
    font-size: 0.85rem;
  }

  .summary-row {
    grid-template-columns: 80px 1fr;
  }

  .materials-header {
    padding: 8px;
  }

  .materials-title {
    font-size: 0.9rem;
  }

  .materials-list {
    padding: 10px;
    gap: 8px;
  }

  .material {
    padding: 8px 10px;
    min-height: 56px;
  }

  .material-right {
    gap: 8px;
  }

  .page-info {
    font-size: 0.75rem;
  }

  .total-count {
    display: none;
  }
}
</style>
