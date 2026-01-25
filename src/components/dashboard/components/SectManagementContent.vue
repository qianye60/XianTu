<template>
  <div class="sect-manage">
    <div class="header">
      <div class="kv">
        <span class="k">所属宗门</span>
        <span class="v">{{ playerSectName }}</span>
      </div>
      <div class="kv">
        <span class="k">职位</span>
        <span class="v">{{ playerPosition }}</span>
      </div>
      <div class="actions">
        <button class="btn" @click="initManagement" :disabled="isWorking || !canUse">
          <RefreshCw :size="14" :class="{ spin: isWorking }" />
          <span>{{ management ? '重置' : '初始化' }}</span>
        </button>
        <button class="btn primary" @click="settleTenDays" :disabled="isWorking || !canUse || !management">
          <Calendar :size="14" />
          <span>结算一旬</span>
        </button>
      </div>
    </div>

    <div v-if="!canUse" class="notice">
      <Info :size="14" />
      <span>需要加入宗门且担任宗主/掌门/副宗主/副掌门后，才能使用宗门经营面板。</span>
    </div>

    <div v-else-if="!management" class="empty">
      <Building2 :size="42" />
      <div class="empty-text">尚未初始化宗门经营数据</div>
      <div class="empty-hint">点击“初始化”生成府库、安定、训练度与设施等级。</div>
    </div>

    <div v-else class="content">
      <div class="grid">
        <div class="card">
          <div class="card-title">核心面板</div>
          <div class="row"><span class="k">战力</span><span class="v">{{ safeNum(management.战力) }}/100</span></div>
          <div class="row"><span class="k">安定</span><span class="v">{{ safeNum(management.安定) }}/100</span></div>
          <div class="row"><span class="k">外门训练度</span><span class="v">{{ safeNum(management.外门训练度) }}/100</span></div>
          <div class="row"><span class="k">最近结算</span><span class="v">{{ management.最近结算 || '未知' }}</span></div>
        </div>

        <div class="card">
          <div class="card-title">府库</div>
          <div class="row"><span class="k">灵石</span><span class="v">{{ safeNum(management.府库?.灵石) }}</span></div>
          <div class="row"><span class="k">灵材</span><span class="v">{{ safeNum(management.府库?.灵材) }}</span></div>
          <div class="row"><span class="k">丹药</span><span class="v">{{ safeNum(management.府库?.丹药) }}</span></div>
          <div class="row"><span class="k">阵材</span><span class="v">{{ safeNum(management.府库?.阵材) }}</span></div>
        </div>

        <div class="card">
          <div class="card-title">设施等级</div>
          <div class="row"><span class="k">练功房</span><span class="v">{{ safeNum(management.设施?.练功房) }}</span></div>
          <div class="row"><span class="k">藏经阁</span><span class="v">{{ safeNum(management.设施?.藏经阁) }}</span></div>
          <div class="row"><span class="k">炼丹房</span><span class="v">{{ safeNum(management.设施?.炼丹房) }}</span></div>
          <div class="row"><span class="k">护山大阵</span><span class="v">{{ safeNum(management.设施?.护山大阵) }}</span></div>
        </div>
      </div>

      <div class="card logs">
        <div class="card-title">月报（最近）</div>
        <div v-if="!management.月报?.length" class="muted">暂无月报</div>
        <div v-else class="log-list">
          <div v-for="(r, idx) in management.月报.slice(-8).reverse()" :key="`${r.时间}-${idx}`" class="log">
            <div class="log-top">
              <span class="badge">{{ r.时间 }}</span>
              <span class="muted" v-if="r.变化">变化：{{ formatDeltas(r.变化) }}</span>
            </div>
            <div class="log-text">{{ r.摘要 }}</div>
          </div>
        </div>
      </div>

      <div class="tip">
        <Info :size="14" />
        <span>该面板为轻度经营：一键结算即可，不推进游戏时间；宗门大战会读取这里的府库/训练度做修正。</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';
import { generateWithRawPrompt } from '@/utils/tavernCore';
import { parseJsonFromText } from '@/utils/jsonExtract';
import { AIBidirectionalSystem } from '@/utils/AIBidirectionalSystem';
import { rollD20 } from '@/utils/diceRoller';
import { detectPlayerSectLeadership, isLeaderPosition } from '@/utils/sectLeadershipUtils';
import type { GM_Response } from '@/types/AIGameMaster';
import type { WorldFaction, WorldInfo } from '@/types/game';
import { Building2, Calendar, Info, RefreshCw } from 'lucide-vue-next';

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();
const isWorking = ref(false);

// 获取玩家名字
const playerName = computed(() => gameStateStore.character?.名字 || '');

// 获取所有宗门列表
const allSects = computed(() => {
  const data = gameStateStore.getCurrentSaveData();
  const worldInfo = (data as any)?.世界?.信息 as WorldInfo | undefined;
  return (worldInfo?.势力信息 || []) as WorldFaction[];
});

// 检测玩家宗门领导地位
const leaderInfo = computed(() => {
  return detectPlayerSectLeadership(
    playerName.value,
    allSects.value,
    gameStateStore.sectMemberInfo
  );
});

const playerSectInfo = computed(() => gameStateStore.sectMemberInfo);
const sectSystemCurrent = computed(() => String((gameStateStore.sectSystem as any)?.当前宗门 || '').trim());
const resolvedSectName = computed(() => {
  const fromMember = String(playerSectInfo.value?.宗门名称 || '').trim();
  if (fromMember) return fromMember;
  const fromLeader = String(leaderInfo.value.sectName || '').trim();
  if (fromLeader) return fromLeader;
  if (sectSystemCurrent.value) return sectSystemCurrent.value;
  const fromSystemMember = String(((gameStateStore.sectSystem as any)?.成员信息?.宗门名称 ?? '') || '').trim();
  return fromSystemMember;
});

const playerSectName = computed(() => resolvedSectName.value || '未加入宗门');
const playerPosition = computed(() => {
  const fromLeader = String(leaderInfo.value.position || '').trim();
  if (fromLeader) return fromLeader;
  const fromMember = String(playerSectInfo.value?.职位 || '').trim();
  if (fromMember) return fromMember;
  return '散修';
});
const isLeader = computed(() => leaderInfo.value.isLeader || isLeaderPosition(playerPosition.value));
const canUse = computed(() => !!resolvedSectName.value && isLeader.value);

const management = computed(() => {
  const sectName = String(resolvedSectName.value || '').trim();
  if (!sectName) return null;
  return ((gameStateStore.sectSystem as any)?.宗门经营?.[sectName] ?? null) as any;
});

function safeNum(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function formatDeltas(d: Record<string, number>): string {
  return Object.entries(d)
    .slice(0, 6)
    .map(([k, v]) => `${k}${v >= 0 ? '+' : ''}${v}`)
    .join('，');
}

async function applyGmResponse(rawText: string, saveData: any) {
  const parsed = parseJsonFromText(rawText) as Partial<GM_Response>;
  const { saveData: updated } = await AIBidirectionalSystem.processGmResponse(
    parsed as GM_Response,
    saveData,
    false,
    undefined,
    { appendNarrativeHistory: false }
  );
  gameStateStore.loadFromSaveData(updated as any);
  await characterStore.saveCurrentGame();
}

async function ensureLeaderMembership() {
  // 如果玩家是宗门高层（leaderInfo）但缺少成员信息，则自动补齐一份成员信息，避免各模块判定“未加入宗门”
  if (playerSectInfo.value?.宗门名称) return;
  const sectName = String(leaderInfo.value.sectName || '').trim();
  if (!sectName) return;

  const nowIso = new Date().toISOString();
  const sectProfile = allSects.value.find((s) => String(s.名称 || '').trim() === sectName) ?? null;

  const memberInfo = {
    宗门名称: sectName,
    宗门类型: (sectProfile as any)?.类型 || '修仙宗门',
    职位: leaderInfo.value.position || '宗主',
    贡献: 0,
    关系: '友好',
    声望: 0,
    加入日期: nowIso,
    描述: (sectProfile as any)?.描述 || '',
  };

  gameStateStore.updateState('sectMemberInfo', memberInfo);

  // 同时确保 sectSystem 里有当前宗门（避免其它模块只读 sectSystem.当前宗门 时为空）
  if (!gameStateStore.sectSystem) {
    gameStateStore.updateState('sectSystem', {
      版本: 2,
      当前宗门: sectName,
      宗门档案: sectProfile ? { [sectName]: sectProfile } : {},
      宗门成员: {},
      宗门藏经阁: {},
      宗门贡献商店: {},
      宗门任务: {},
      宗门任务状态: {},
    });
  } else if (!sectSystemCurrent.value) {
    gameStateStore.updateState('sectSystem.当前宗门', sectName);
  }

  await characterStore.saveCurrentGame();
}

async function initManagement() {
  if (!canUse.value || isWorking.value) return;
  isWorking.value = true;
  try {
    await ensureLeaderMembership();
    const sectName = String(resolvedSectName.value || '').trim();
    if (!sectName) {
      toast.warning('未加入宗门');
      return;
    }
    const saveData = gameStateStore.getCurrentSaveData();
    if (!saveData) {
      toast.error('存档数据不完整或未加载，无法生成');
      return;
    }

    const sectProfile = (gameStateStore.sectSystem as any)?.宗门档案?.[sectName] ?? null;
    const nowIso = new Date().toISOString();
    const prompt = `
# 任务：初始化【宗门经营】数据（单次功能请求）
为宗门「${sectName}」写入轻度经营数据，用于宗主面板与宗门大战结算。

## 输出格式（必须）
只输出 1 个 JSON 对象：
{"text":"...","mid_term_memory":"（50-100字：本次初始化的关键摘要）","tavern_commands":[...],"action_options":[]}

## 写入路径（必须）
- 社交.宗门.宗门经营.${sectName} : 完整覆盖

## 对象结构（必须）
{"宗门名称":"${sectName}","战力":number,"安定":number,"外门训练度":number,"府库":{"灵石":number,"灵材":number,"丹药":number,"阵材":number},"设施":{"练功房":number,"藏经阁":number,"炼丹房":number,"护山大阵":number},"最近结算":"${nowIso}","月报":[]}

## 数值约束（必须）
- 战力：优先用宗门档案.领导层.综合战力（若缺失则 30-80）
- 安定 55-85，外门训练度 35-75
- 灵石 20000-200000，灵材/丹药/阵材 0-5000，设施等级 0-5
- 所有数值不得为负

## 宗门档案（参考）
${JSON.stringify(sectProfile).slice(0, 1200)}
    `.trim();

    const raw = await generateWithRawPrompt('初始化宗门经营', prompt, false, 'sect_generation');
    await applyGmResponse(raw, saveData);
    toast.success('宗门经营数据已更新');
  } catch (e) {
    console.error('[SectManage] init failed', e);
    toast.error('初始化失败');
  } finally {
    isWorking.value = false;
  }
}

async function settleTenDays() {
  if (!canUse.value || !management.value || isWorking.value) return;
  isWorking.value = true;
  try {
    await ensureLeaderMembership();
    const sectName = String(resolvedSectName.value || '').trim();
    if (!sectName) {
      toast.warning('未加入宗门');
      return;
    }
    const saveData = gameStateStore.getCurrentSaveData();
    if (!saveData) {
      toast.error('存档数据不完整或未加载，无法结算');
      return;
    }

    const nowIso = new Date().toISOString();
    const d20 = rollD20();
    const prompt = `
# 任务：宗门经营【结算一旬】（单次功能请求）
为宗门「${sectName}」进行一次轻度结算（不推进元数据.时间），更新府库/安定/训练度/战力，并追加一条月报记录。

## 随机因子（必须使用，不要自行重掷）
d20=${d20}

## 输出格式（必须）
只输出 1 个 JSON 对象：
{"text":"...","mid_term_memory":"（50-100字：本次结算的关键摘要）","tavern_commands":[...],"action_options":[]}

## 写入路径（必须）
- 社交.宗门.宗门经营.${sectName} : 建议 set 完整覆盖（或精准修改）

## 约束（必须）
- 不允许修改：元数据.时间
- 所有数值不得为负
- 战力/安定/训练度 单次变化不超过 8 点
- 府库.灵石 单次变化建议在 -3000~+12000（根据d20与设施等级）
- 必须追加月报：push 到 社交.宗门.宗门经营.${sectName}.月报 一个对象：
  {"时间":"${nowIso}","摘要":"...","变化":{"灵石":+n,"安定":+n,"外门训练度":+n,"战力":+n}}
- 更新 最近结算 为 "${nowIso}"

## 当前经营数据（必须以此为准）
${JSON.stringify(management.value).slice(0, 1200)}
    `.trim();

    const raw = await generateWithRawPrompt('宗门经营-结算一旬', prompt, false, 'sect_generation');
    await applyGmResponse(raw, saveData);
    toast.success('已结算一旬');
  } catch (e) {
    console.error('[SectManage] settle failed', e);
    toast.error('结算失败');
  } finally {
    isWorking.value = false;
  }
}
</script>

<style scoped>
.sect-manage {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

.header {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  padding: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 10px;
}

.kv {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 0.85rem;
}

.kv .k {
  color: var(--color-text-secondary);
}

.kv .v {
  font-weight: 700;
  color: var(--color-text);
}

.actions {
  margin-left: auto;
  display: inline-flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.btn.primary {
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}

.btn:hover:not(:disabled) {
  border-color: rgba(var(--color-primary-rgb), 0.35);
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.notice {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(var(--color-warning-rgb), 0.35);
  background: rgba(var(--color-warning-rgb), 0.08);
  color: var(--color-text);
  font-size: 0.85rem;
}

.empty {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--color-text-secondary);
}

.empty-text {
  font-weight: 800;
  color: var(--color-text);
}

.content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.card {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.card-title {
  font-weight: 800;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.row .v {
  color: var(--color-text);
  font-weight: 700;
}

.logs {
  flex: 1;
  overflow: hidden;
}

.log-list {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.log {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 10px;
  padding: 10px;
}

.log-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.muted {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.log-text {
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 0.88rem;
  color: var(--color-text);
}

.tip {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

@media (max-width: 1024px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .actions {
    margin-left: 0;
  }
}
</style>
