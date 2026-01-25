<template>
  <div class="sect-war">
    <div class="war-shell">
      <div class="war-header">
        <div class="left">
          <div class="title">宗门大战</div>
          <div class="subtitle" v-if="playerSectName">{{ playerSectName }} · {{ playerPosition }}</div>
          <div class="subtitle muted" v-else>未加入宗门</div>
        </div>
        <div class="right">
          <button class="btn" @click="reloadFromStore" :disabled="isBusy">
            <RefreshCw :size="14" :class="{ spin: isBusy }" />
            <span>刷新</span>
          </button>
        </div>
      </div>

      <div v-if="!canUse" class="notice">
        <AlertTriangle :size="16" />
        <div class="notice-body">
          <div>需要加入宗门且担任宗主/掌门/副宗主/副掌门，才能发起宗门大战。</div>
          <div class="fix-box">
            <div class="muted small">若你确实是宗门高层但系统未识别，可在此修复（单机存档生效）：</div>
            <div class="fix-row">
              <input class="input" v-model="fixSectName" list="my-sect-candidates" placeholder="你的宗门名称" />
              <datalist id="my-sect-candidates">
                <option v-for="s in sectNameCandidates" :key="s" :value="s" />
              </datalist>
              <select class="select" v-model="fixPosition">
                <option value="宗主">宗主</option>
                <option value="掌门">掌门</option>
                <option value="副宗主">副宗主</option>
                <option value="副掌门">副掌门</option>
              </select>
              <button class="btn" @click="applyMembershipFix" :disabled="isBusy || !canFix">修复并继续</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="war-body">
        <div v-if="!currentWar" class="start-panel">
          <div class="card">
            <div class="card-title">宣战准备</div>

            <div class="field">
              <div class="label">目标宗门</div>
              <input class="input" v-model="targetSect" list="sect-targets" placeholder="输入或选择目标宗门" />
              <datalist id="sect-targets">
                <option v-for="s in availableTargets" :key="s" :value="s" />
              </datalist>
              <div class="muted small" v-if="availableTargets.length === 0">
                当前世界未加载“势力宗门”列表：可直接手动输入目标宗门名称（不影响推演）。
              </div>
            </div>

            <div class="field">
              <div class="label">宣战理由（由你决定）</div>
              <textarea
                class="textarea"
                v-model="warReason"
                placeholder="例如：对方屡次截杀外门弟子，侵占灵脉，辱我宗名……（建议20-200字）"
              />
              <div class="hint-row">
                <span class="muted">该理由将写入宗门大战记录与短期记忆（不进入主对话正文）。</span>
                <span class="muted">{{ warReason.length }}/200</span>
              </div>
            </div>

            <div class="field">
              <div class="label">目标（可选）</div>
              <input class="input" v-model="warGoal" placeholder="例如：夺回灵脉/逼迫停战/惩戒首恶" />
            </div>

            <div class="actions">
              <button class="btn primary" @click="startWar" :disabled="isBusy || !canStart">
                <Swords :size="16" />
                <span>宣战并进入推演</span>
              </button>
              <div class="muted small" v-if="!canStart">{{ startBlockedReason }}</div>
              <div class="muted small">战力为本地可解释计算；AI仅用于生成“战报摘要”。</div>
            </div>
          </div>

          <div class="card slim">
            <div class="card-title">提示</div>
            <div class="tip-list">
              <div class="tip">- 推演分 5 个阶段：侦察 → 交锋 → 破阵 → 攻山 → 善后</div>
              <div class="tip">- 每一步都有可见日志与数值变化</div>
              <div class="tip">- 终局后可生成 AI 战报摘要（走 sect_generation）</div>
            </div>
          </div>
        </div>

        <div v-else class="war-panel">
          <div class="grid">
            <div class="card">
              <div class="card-title">战局概览</div>
              <div class="kv">
                <span class="k">状态</span>
                <span class="v" :class="statusClass(currentWar.状态)">{{ currentWar.状态 }}</span>
              </div>
              <div class="kv">
                <span class="k">发起方</span>
                <span class="v">{{ currentWar.发起方 }}</span>
              </div>
              <div class="kv">
                <span class="k">守方</span>
                <span class="v">{{ currentWar.守方 }}</span>
              </div>
              <div class="kv" v-if="currentWar.目标">
                <span class="k">目标</span>
                <span class="v">{{ currentWar.目标 }}</span>
              </div>
              <div class="kv">
                <span class="k">当前阶段</span>
                <span class="v">{{ currentWar.当前阶段 }}</span>
              </div>
            </div>

            <div class="card">
              <div class="card-title">我方</div>
              <div class="row">
                <div class="badge blue">{{ currentWar.我方.宗门名称 }}</div>
              </div>
              <div class="kv">
                <span class="k">战力</span>
                <span class="v">{{ currentWar.我方.战力 }}/100</span>
              </div>
              <div class="kv">
                <span class="k">士气</span>
                <span class="v">{{ currentWar.我方.士气 ?? 0 }}/100</span>
              </div>
              <div class="kv">
                <span class="k">兵力</span>
                <span class="v">外{{ currentWar.我方.外门 }} · 内{{ currentWar.我方.内门 }} · 核{{ currentWar.我方.核心 }}</span>
              </div>
            </div>

            <div class="card">
              <div class="card-title">敌方</div>
              <div class="row">
                <div class="badge red">{{ currentWar.敌方.宗门名称 }}</div>
              </div>
              <div class="kv">
                <span class="k">战力</span>
                <span class="v">{{ currentWar.敌方.战力 }}/100</span>
              </div>
              <div class="kv">
                <span class="k">士气</span>
                <span class="v">{{ currentWar.敌方.士气 ?? 0 }}/100</span>
              </div>
              <div class="kv">
                <span class="k">兵力</span>
                <span class="v">外{{ currentWar.敌方.外门 }} · 内{{ currentWar.敌方.内门 }} · 核{{ currentWar.敌方.核心 }}</span>
              </div>
            </div>
          </div>

          <details class="details" v-if="powerDetail">
            <summary class="summary">
              <ScrollText :size="14" />
              <span>战力计算（本地可解释）</span>
            </summary>
            <div class="detail-grid">
              <div class="detail-card">
                <div class="detail-title">我方：{{ powerDetail.our.side.宗门名称 }}</div>
                <div class="detail-line" v-for="(it, idx) in powerDetail.our.breakdown" :key="`o-${idx}`">
                  <span class="k">{{ it.label }}</span>
                  <span class="v">{{ it.value >= 0 ? '+' : '' }}{{ it.value }}</span>
                  <span class="note" v-if="it.note">({{ it.note }})</span>
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-title">敌方：{{ powerDetail.enemy.side.宗门名称 }}</div>
                <div class="detail-line" v-for="(it, idx) in powerDetail.enemy.breakdown" :key="`e-${idx}`">
                  <span class="k">{{ it.label }}</span>
                  <span class="v">{{ it.value >= 0 ? '+' : '' }}{{ it.value }}</span>
                  <span class="note" v-if="it.note">({{ it.note }})</span>
                </div>
              </div>
            </div>
          </details>

          <div class="card">
            <div class="card-title">推进与结算</div>
            <div class="stage-strip">
              <div
                v-for="(s, idx) in currentWar.阶段列表"
                :key="`${s}-${idx}`"
                class="stage-pill"
                :class="{ active: idx === currentWar.阶段索引, done: idx < currentWar.阶段索引 }"
              >
                <Shield :size="14" />
                <span>{{ s }}</span>
              </div>
            </div>

            <div class="actions">
              <button class="btn primary" @click="advance" :disabled="isBusy || !canAdvance">
                <Play :size="16" />
                <span>推进下一阶段</span>
              </button>
              <button class="btn" @click="autoResolve" :disabled="isBusy || !canAdvance">
                <FastForward :size="16" />
                <span>一键推演到终局</span>
              </button>
              <button class="btn danger" @click="ceasefire" :disabled="isBusy || !canCeasefire">
                <Square :size="16" />
                <span>停战</span>
              </button>
              <button class="btn" v-if="isFinished" @click="archiveCurrent" :disabled="isBusy">
                <span>归档</span>
              </button>
              <button class="btn" v-if="isFinished" @click="generateAiSummary" :disabled="isBusy || isGeneratingSummary">
                <ScrollText :size="16" :class="{ spin: isGeneratingSummary }" />
                <span>生成战报摘要（AI）</span>
              </button>
            </div>

            <div v-if="aiSummary" class="ai-summary">
              <div class="ai-title">AI 战报摘要</div>
              <div class="ai-text">{{ aiSummary }}</div>
            </div>
          </div>

          <div class="card logs">
            <div class="card-title">战报日志</div>
            <div v-if="!currentWar.战报?.length" class="muted">暂无记录</div>
            <div v-else class="log-list">
              <div v-for="(r, idx) in currentWar.战报" :key="`${r.时间}-${idx}`" class="log">
                <div class="log-top">
                  <span class="badge">{{ r.阶段 }}</span>
                  <span class="muted">{{ r.时间 }}</span>
                </div>
                <div class="log-text">{{ r.摘要 }}</div>
              </div>
            </div>
          </div>

          <div class="card history" v-if="warHistory.length">
            <div class="card-title">历史（最近）</div>
            <div class="history-list">
              <div v-for="w in warHistory.slice(-6).reverse()" :key="w.战争ID" class="history-item">
                <div class="history-top">
                  <span class="badge">{{ w.状态 }}</span>
                  <span class="name">{{ w.发起方 }} vs {{ w.守方 }}</span>
                  <span class="muted">{{ w.战争ID }}</span>
                </div>
                <div class="muted small" v-if="w.战报?.length">{{ w.战报[w.战报.length - 1].摘要 }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
 import { computed, ref, watch } from 'vue';
import { AlertTriangle, FastForward, Play, RefreshCw, ScrollText, Shield, Square, Swords } from 'lucide-vue-next';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';
import { detectPlayerSectLeadership, isLeaderPosition } from '@/utils/sectLeadershipUtils';
import type { SectWarState, WorldFaction, WorldInfo } from '@/types/game';
import { buildWarMemoryLine, computeSectWarSide, concludeWar, resolveWarStage, type SectWarComputedSide } from '@/utils/sectWarSimulation';
import { generateWithRawPrompt } from '@/utils/tavernCore';
import { parseJsonSmart } from '@/utils/jsonExtract';
import { aiService } from '@/services/aiService';

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();

const isBusy = ref(false);
const isGeneratingSummary = ref(false);

const warReason = ref('');
const warGoal = ref('');
const targetSect = ref('');
const fixSectName = ref('');
const fixPosition = ref<'宗主' | '掌门' | '副宗主' | '副掌门'>('宗主');

const playerName = computed(() => gameStateStore.character?.名字 || '');
const allSects = computed(() => {
  const data = gameStateStore.getCurrentSaveData();
  const worldInfo = (data as any)?.世界?.信息 as WorldInfo | undefined;
  return (worldInfo?.势力信息 || []) as WorldFaction[];
});

const sectNameCandidates = computed(() =>
  allSects.value
    .map((s) => String((s as any)?.名称 || '').trim())
    .filter(Boolean)
    .slice(0, 200)
);

const leaderInfo = computed(() => detectPlayerSectLeadership(playerName.value, allSects.value, gameStateStore.sectMemberInfo));

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

const playerSectName = computed(() => resolvedSectName.value || '');
const playerPosition = computed(() => {
  const fromLeader = String(leaderInfo.value.position || '').trim();
  if (fromLeader) return fromLeader;
  const fromMember = String(playerSectInfo.value?.职位 || '').trim();
  if (fromMember) return fromMember;
  return '';
});
const isLeader = computed(() => leaderInfo.value.isLeader || isLeaderPosition(playerPosition.value));
const canUse = computed(() => !!resolvedSectName.value && isLeader.value);

const canFix = computed(() => {
  const name = String(fixSectName.value || resolvedSectName.value || '').trim();
  return !!name && isLeaderPosition(fixPosition.value);
});

watch(
  resolvedSectName,
  (name) => {
    const normalized = String(name || '').trim();
    if (!fixSectName.value && normalized) fixSectName.value = normalized;
  },
  { immediate: true }
);

const sectWarSystem = computed(() => ((gameStateStore.sectSystem as any)?.宗门战争 ?? null) as any);
const currentWar = computed(() => (sectWarSystem.value?.当前 ?? null) as SectWarState | null);
const warHistory = computed(() => (Array.isArray(sectWarSystem.value?.历史) ? sectWarSystem.value.历史 : []) as SectWarState[]);

const availableTargets = computed(() => {
  const mine = playerSectName.value;
  return allSects.value
    .map((s) => String((s as any)?.名称 || '').trim())
    .filter(Boolean)
    .filter((name) => name !== mine)
    .slice(0, 200);
});

const canStart = computed(() => {
  const defender = targetSect.value.trim();
  if (!defender) return false;
  if (defender === playerSectName.value.trim()) return false;
  const reason = warReason.value.trim();
  // 允许更短的宣战理由，避免“按钮一直不可点”的体验问题（仍建议 20-200 字）
  if (reason.length < 2) return false;
  if (reason.length > 200) return false;
  return true;
});

const startBlockedReason = computed(() => {
  const defender = targetSect.value.trim();
  if (!defender) return '请先填写目标宗门';
  if (defender === playerSectName.value.trim()) return '不能对自己宣战';
  const reason = warReason.value.trim();
  if (reason.length < 2) return '宣战理由至少 2 字';
  if (reason.length > 200) return '宣战理由最多 200 字';
  return '';
});

const isFinished = computed(() => {
  const w = currentWar.value;
  if (!w) return false;
  return ['胜利', '失败', '停战'].includes(w.状态);
});

const canAdvance = computed(() => {
  const w = currentWar.value;
  if (!w) return false;
  if (w.状态 !== '进行中' && w.状态 !== '备战') return false;
  return w.阶段索引 < (w.阶段列表?.length ?? 0);
});

const canCeasefire = computed(() => {
  const w = currentWar.value;
  if (!w) return false;
  return w.状态 === '进行中' || w.状态 === '备战';
});

const aiSummary = computed(() => {
  const w = currentWar.value;
  if (!w) return '';
  const last = (w.战报 ?? []).slice().reverse().find((r) => String(r.阶段).includes('AI战报摘要'));
  return last?.摘要 ?? '';
});

const powerDetail = computed(() => {
  const w = currentWar.value;
  if (!w) return null;
  const meta = (w as any)?.上一次?.战力计算 ?? null;
  if (!meta || typeof meta !== 'object') return null;
  return meta as { our: SectWarComputedSide; enemy: SectWarComputedSide };
});

function statusClass(status: string): string {
  if (status === '胜利') return 'ok';
  if (status === '失败') return 'bad';
  if (status === '停战') return 'warn';
  return 'mid';
}

function reloadFromStore() {
  const saveData = gameStateStore.getCurrentSaveData();
  if (saveData) gameStateStore.loadFromSaveData(saveData as any);
}

async function applyMembershipFix() {
  if (isBusy.value) return;
  const sectName = String(fixSectName.value || resolvedSectName.value || '').trim();
  if (!sectName) {
    toast.error('请填写宗门名称');
    return;
  }

  isBusy.value = true;
  try {
    const nowIso = new Date().toISOString();
    const sectProfile = allSects.value.find((s) => String((s as any)?.名称 || '').trim() === sectName) ?? null;
    const existing = playerSectInfo.value && typeof playerSectInfo.value === 'object' ? playerSectInfo.value : null;

    const memberInfo = {
      宗门名称: sectName,
      宗门类型: (existing as any)?.宗门类型 || (sectProfile as any)?.类型 || '修仙宗门',
      职位: fixPosition.value,
      贡献: (existing as any)?.贡献 ?? 0,
      关系: (existing as any)?.关系 ?? '友好',
      声望: (existing as any)?.声望 ?? 0,
      加入日期: (existing as any)?.加入日期 || nowIso,
      描述: (existing as any)?.描述 || (sectProfile as any)?.描述 || '',
    };

    gameStateStore.updateState('sectMemberInfo', memberInfo);

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
    toast.success('已修复宗门身份');
  } catch (e) {
    console.error('[SectWar] applyMembershipFix failed', e);
    toast.error('修复失败');
  } finally {
    isBusy.value = false;
  }
}

async function ensureLeaderMembership() {
  if (playerSectInfo.value?.宗门名称) return;
  const sectName = String(leaderInfo.value.sectName || '').trim();
  if (!sectName) return;

  const nowIso = new Date().toISOString();
  const sectProfile = allSects.value.find((s) => String((s as any)?.名称 || '').trim() === sectName) ?? null;
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

async function persistWar(nextWar: SectWarState | null) {
  const saveData = gameStateStore.getCurrentSaveData();
  if (!saveData) throw new Error('存档未加载');

  const updated = typeof structuredClone === 'function' ? structuredClone(saveData) : JSON.parse(JSON.stringify(saveData));
  const socialRoot = ((updated as any).社交 ??= {});
  const sectRoot = (socialRoot.宗门 ??= {});
  const warRoot = (sectRoot.宗门战争 ??= {});
  warRoot.当前 = nextWar;
  if (!Array.isArray(warRoot.历史)) warRoot.历史 = [];

  gameStateStore.loadFromSaveData(updated as any);
  await characterStore.saveCurrentGame();
}

async function startWar() {
  if (!canUse.value || isBusy.value) return;
  if (!canStart.value) return;
  isBusy.value = true;
  try {
    await ensureLeaderMembership();
    const saveData = gameStateStore.getCurrentSaveData();
    if (!saveData) throw new Error('存档未加载');

    const attacker = playerSectName.value;
    const defender = targetSect.value.trim();
    const reason = warReason.value.trim();
    const goal = warGoal.value.trim();

    const our = computeSectWarSide(saveData, attacker);
    const enemy = computeSectWarSide(saveData, defender);

    const nowIso = new Date().toISOString();
    const warId = `war_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const war: SectWarState = {
      战争ID: warId,
      状态: '进行中',
      发起方: attacker,
      守方: defender,
      目标: goal || undefined,
      阶段列表: ['侦察', '交锋', '破阵', '攻山', '善后'],
      阶段索引: 0,
      当前阶段: '侦察',
      我方: our.side,
      敌方: enemy.side,
      累计伤亡: { 我方: { 外门: 0, 内门: 0, 核心: 0 }, 敌方: { 外门: 0, 内门: 0, 核心: 0 } },
      战报: [
        {
          时间: nowIso,
          阶段: '宣战',
          摘要: `宣战：${attacker} 向 ${defender} 发起宗门大战。理由：${reason}${goal ? `；目标：${goal}` : ''}`,
        },
      ],
      上一次: {
        宣战理由: reason,
        战力计算: { our, enemy },
      },
    };

    await persistWar(war);

    gameStateStore.addToShortTermMemory(`【宗门大战】${attacker} 向 ${defender} 宣战：${reason}${goal ? `（目标：${goal}）` : ''}`);
    await characterStore.saveCurrentGame();

    toast.success('已宣战，进入推演');
  } catch (e) {
    console.error('[SectWar] start failed', e);
    toast.error('宣战失败');
  } finally {
    isBusy.value = false;
  }
}

async function advance() {
  const w = currentWar.value;
  if (!w || !canAdvance.value || isBusy.value) return;
  isBusy.value = true;
  try {
    const nowIso = new Date().toISOString();
    const stage = (w.阶段列表?.[w.阶段索引] ?? w.当前阶段) as any;

    const { war: afterStage, report } = resolveWarStage({ war: w, stage, nowIso });
    const nextIndex = w.阶段索引 + 1;

    const next: SectWarState = {
      ...afterStage,
      阶段索引: nextIndex,
      当前阶段: nextIndex >= (w.阶段列表?.length ?? 0) ? '终局' : ((w.阶段列表?.[nextIndex] ?? afterStage.当前阶段) as any),
      战报: [...(afterStage.战报 ?? []), report],
    };

    if (nextIndex >= (w.阶段列表?.length ?? 0)) {
      const { war: concluded, report: endReport } = concludeWar({ war: next, nowIso });
      const finalized: SectWarState = {
        ...concluded,
        战报: [...(next.战报 ?? []), endReport],
        当前阶段: '终局',
      };
      await persistWar(finalized);
      gameStateStore.addToShortTermMemory(buildWarMemoryLine(finalized));
      await characterStore.saveCurrentGame();
      toast.success(`宗门大战已结束：${finalized.状态}`);
    } else {
      await persistWar(next);
      toast.success(`已推进：${stage}`);
    }
  } catch (e) {
    console.error('[SectWar] advance failed', e);
    toast.error('推进失败');
  } finally {
    isBusy.value = false;
  }
}

async function autoResolve() {
  const w0 = currentWar.value;
  if (!w0 || !canAdvance.value || isBusy.value) return;
  isBusy.value = true;
  try {
    let w = w0;
    while (w.阶段索引 < (w.阶段列表?.length ?? 0) && w.状态 === '进行中') {
      const nowIso = new Date().toISOString();
      const stage = (w.阶段列表?.[w.阶段索引] ?? w.当前阶段) as any;
      const { war: afterStage, report } = resolveWarStage({ war: w, stage, nowIso });
      const nextIndex = w.阶段索引 + 1;
      w = {
        ...afterStage,
        阶段索引: nextIndex,
        当前阶段: nextIndex >= (w.阶段列表?.length ?? 0) ? '终局' : ((w.阶段列表?.[nextIndex] ?? afterStage.当前阶段) as any),
        战报: [...(afterStage.战报 ?? []), report],
      };
    }

    const nowIso = new Date().toISOString();
    const { war: concluded, report: endReport } = concludeWar({ war: w, nowIso });
    const finalized: SectWarState = {
      ...concluded,
      战报: [...(w.战报 ?? []), endReport],
      当前阶段: '终局',
    };

    await persistWar(finalized);
    gameStateStore.addToShortTermMemory(buildWarMemoryLine(finalized));
    await characterStore.saveCurrentGame();
    toast.success(`已推演至终局：${finalized.状态}`);
  } catch (e) {
    console.error('[SectWar] autoResolve failed', e);
    toast.error('推演失败');
  } finally {
    isBusy.value = false;
  }
}

async function ceasefire() {
  const w = currentWar.value;
  if (!w || !canCeasefire.value || isBusy.value) return;
  isBusy.value = true;
  try {
    const nowIso = new Date().toISOString();
    const next: SectWarState = {
      ...w,
      状态: '停战',
      当前阶段: '停战',
      战报: [
        ...(w.战报 ?? []),
        { 时间: nowIso, 阶段: '停战', 摘要: `停战：双方收兵，暂止战火（由宗主面板操作）。` },
      ],
    };
    await persistWar(next);
    gameStateStore.addToShortTermMemory(buildWarMemoryLine(next));
    await characterStore.saveCurrentGame();
    toast.success('已停战');
  } catch (e) {
    console.error('[SectWar] ceasefire failed', e);
    toast.error('停战失败');
  } finally {
    isBusy.value = false;
  }
}

async function archiveCurrent() {
  const w = currentWar.value;
  if (!w || !isFinished.value || isBusy.value) return;
  isBusy.value = true;
  try {
    const saveData = gameStateStore.getCurrentSaveData();
    if (!saveData) throw new Error('存档未加载');
    const updated = typeof structuredClone === 'function' ? structuredClone(saveData) : JSON.parse(JSON.stringify(saveData));
    const socialRoot = ((updated as any).社交 ??= {});
    const sectRoot = (socialRoot.宗门 ??= {});
    const warRoot = (sectRoot.宗门战争 ??= {});
    if (!Array.isArray(warRoot.历史)) warRoot.历史 = [];
    warRoot.历史.push(w);
    warRoot.当前 = null;

    gameStateStore.loadFromSaveData(updated as any);
    await characterStore.saveCurrentGame();

    toast.success('已归档');
  } catch (e) {
    console.error('[SectWar] archive failed', e);
    toast.error('归档失败');
  } finally {
    isBusy.value = false;
  }
}

async function generateAiSummary() {
  const w = currentWar.value;
  if (!w || !isFinished.value || isBusy.value || isGeneratingSummary.value) return;
  isGeneratingSummary.value = true;
  try {
    const reason = String((w as any)?.上一次?.宣战理由 ?? '').trim();
    const stageReports = Array.isArray(w.战报) ? w.战报.slice(-12) : [];

    const prompt = `
# 任务：生成【宗门大战】战报摘要（仅摘要，不写入任何数据）

你将根据提供的结构化战报与胜负结果，写一段“战报摘要”，用于宗门系统面板展示与短期记忆记录。

## 输出格式（必须）
只输出 1 个 JSON 对象：
{"summary":"...（200-450字）","tldr":"...（不超过60字）"}

## 约束（必须）
- 禁止输出 tavern_commands / action_options / 任何额外字段
- 禁止输出代码块或额外文本
- 文风：修仙正剧风，客观凝练

## 基础信息
- 发起方：${w.发起方}
- 守方：${w.守方}
- 目标：${w.目标 || '（无）'}
- 宣战理由（玩家输入）：${reason || '（未提供）'}
- 最终结果：${w.状态}
- 累计伤亡：我方=${JSON.stringify(w.累计伤亡?.我方 ?? {})} 敌方=${JSON.stringify(w.累计伤亡?.敌方 ?? {})}

## 阶段战报（结构化）
${JSON.stringify(stageReports).slice(0, 3500)}
    `.trim();

    const raw = await generateWithRawPrompt('宗门大战-战报摘要', prompt, false, 'sect_generation');
    const parsed = parseJsonSmart(raw, aiService.isForceJsonEnabled('sect_generation')) as { summary?: unknown; tldr?: unknown };
    const summary = String(parsed?.summary ?? '').trim();
    const tldr = String(parsed?.tldr ?? '').trim();
    if (!summary) throw new Error('summary missing');

    const nowIso = new Date().toISOString();
    const next: SectWarState = {
      ...w,
      战报: [
        ...(w.战报 ?? []),
        {
          时间: nowIso,
          阶段: 'AI战报摘要',
          摘要: summary,
          我方变化: tldr ? { tldr } : undefined,
        },
      ],
    };

    await persistWar(next);

    const memoryLine = tldr ? `【宗门大战】战报：${tldr}` : `【宗门大战】战报已生成（详见宗门大战面板）`;
    gameStateStore.addToShortTermMemory(memoryLine);
    await characterStore.saveCurrentGame();

    toast.success('战报摘要已生成');
  } catch (e) {
    console.error('[SectWar] ai summary failed', e);
    toast.error('生成战报摘要失败');
  } finally {
    isGeneratingSummary.value = false;
  }
}
</script>

<style scoped>
.sect-war {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--color-background);
}

.war-shell {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  box-sizing: border-box;
}

.war-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
}

.title {
  font-weight: 900;
  letter-spacing: 0.02em;
  font-size: 1.05rem;
  color: var(--color-text);
  font-family: var(--font-family-serif);
}

.subtitle {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.muted {
  color: var(--color-text-secondary);
}

.small {
  font-size: 0.82rem;
}

.notice {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.08);
  color: #b45309;
}

.notice-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fix-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--color-text-secondary);
}

.fix-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.fix-row .input {
  flex: 1 1 220px;
}

.fix-row .select {
  flex: 0 0 120px;
}

.war-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.start-panel {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 10px;
  align-items: start;
}

.war-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.card {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
  padding: 12px;
}

.card.slim {
  padding: 12px;
}

.card-title {
  font-weight: 900;
  letter-spacing: 0.02em;
  color: var(--color-text);
  margin-bottom: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.label {
  font-weight: 700;
  color: var(--color-text);
  font-size: 0.9rem;
}

.input,
.select,
.textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background);
  color: var(--color-text);
  padding: 10px 12px;
  font-size: 0.9rem;
}

.textarea {
  min-height: 110px;
  resize: vertical;
  line-height: 1.6;
}

.hint-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.8rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.88rem;
}

.btn.primary {
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}

.btn.danger {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.10);
  color: #ef4444;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn:hover:not(:disabled) {
  border-color: rgba(var(--color-primary-rgb), 0.35);
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

.tip-list {
  display: grid;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.kv:last-child {
  border-bottom: none;
}

.kv .k {
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.kv .v {
  font-weight: 800;
  color: var(--color-text);
  font-size: 0.9rem;
}

.v.ok {
  color: #22c55e;
}

.v.bad {
  color: #ef4444;
}

.v.warn {
  color: #f59e0b;
}

.v.mid {
  color: var(--color-text);
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
  border: 1px solid var(--color-border);
  background: var(--color-background);
}

.badge.blue {
  color: rgba(59, 130, 246, 0.95);
  border-color: rgba(59, 130, 246, 0.30);
  background: rgba(59, 130, 246, 0.08);
}

.badge.red {
  color: rgba(239, 68, 68, 0.95);
  border-color: rgba(239, 68, 68, 0.30);
  background: rgba(239, 68, 68, 0.08);
}

.details {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  padding: 10px 12px;
}

.summary {
  cursor: pointer;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-weight: 800;
  color: var(--color-text);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.detail-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background);
  padding: 10px;
}

.detail-title {
  font-weight: 900;
  margin-bottom: 8px;
  color: var(--color-text);
}

.detail-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.88rem;
}

.detail-line:last-child {
  border-bottom: none;
}

.detail-line .k {
  color: var(--color-text-secondary);
}

.detail-line .v {
  font-weight: 900;
  color: var(--color-text);
  white-space: nowrap;
}

.detail-line .note {
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.stage-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-weight: 800;
  font-size: 0.82rem;
}

.stage-pill.active {
  color: rgba(59, 130, 246, 0.95);
  border-color: rgba(59, 130, 246, 0.30);
  background: rgba(59, 130, 246, 0.08);
}

.stage-pill.done {
  color: rgba(34, 197, 94, 0.95);
  border-color: rgba(34, 197, 94, 0.30);
  background: rgba(34, 197, 94, 0.08);
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background);
  padding: 10px;
}

.log-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.log-text {
  line-height: 1.7;
  color: var(--color-text);
}

.ai-summary {
  margin-top: 10px;
  border: 1px solid rgba(168, 85, 247, 0.25);
  background: rgba(168, 85, 247, 0.06);
  border-radius: 12px;
  padding: 10px;
}

.ai-title {
  font-weight: 900;
  margin-bottom: 8px;
  color: rgba(168, 85, 247, 0.95);
}

.ai-text {
  color: var(--color-text);
  line-height: 1.7;
  white-space: pre-wrap;
}

.history-list {
  display: grid;
  gap: 8px;
}

.history-item {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background);
  padding: 10px;
}

.history-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.history-top .name {
  font-weight: 900;
  color: var(--color-text);
}

@media (max-width: 920px) {
  .start-panel {
    grid-template-columns: 1fr;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
