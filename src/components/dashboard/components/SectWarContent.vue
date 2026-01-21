<template>
  <div class="sect-war">
    <div class="header">
      <div class="kv">
        <span class="k">所属宗门</span>
        <span class="v">{{ playerSectName }}</span>
      </div>
      <div class="kv">
        <span class="k">职位</span>
        <span class="v">{{ playerPosition }}</span>
      </div>
      <div class="kv" v-if="treasuryStone !== null">
        <span class="k">宗门灵石</span>
        <span class="v">{{ treasuryStone }}</span>
      </div>
      <button class="btn" @click="initManagement" :disabled="isWorking || !canUse">
        <RefreshCw :size="14" :class="{ spin: isWorking }" />
        <span>{{ hasManagement ? '重置经营数据' : '初始化经营数据' }}</span>
      </button>
    </div>

    <div v-if="!canUse" class="notice">
      <Info :size="14" />
      <span>需要加入宗门且担任宗主/掌门/副宗主/副掌门后，才能指挥宗门大战。</span>
    </div>

    <div class="content">
      <div class="col">
        <div class="card">
          <div class="card-title">
            <Swords :size="14" />
            <span>目标宗门</span>
          </div>
          <div class="search">
            <Search :size="14" />
            <input v-model="searchQuery" placeholder="搜索宗门..." />
          </div>
          <div class="list">
            <button
              v-for="sect in enemyFactions"
              :key="sect.名称"
              class="list-item"
              :class="{ active: selectedEnemy?.名称 === sect.名称 }"
              @click="selectedEnemy = sect"
            >
              <div class="name">{{ sect.名称 }}</div>
              <div class="meta">{{ sect.类型 }} / {{ sect.等级 }}</div>
              <div class="power">战力 {{ getFactionPower(sect) }}/100</div>
            </button>
            <div v-if="enemyFactions.length === 0" class="empty">暂无可选宗门（先生成势力信息）</div>
          </div>
        </div>
      </div>

      <div class="col">
        <div v-if="currentWar" class="card">
          <div class="card-title row">
            <div class="row">
              <Flag :size="14" />
              <span>宗门大战</span>
            </div>
            <span class="badge">{{ currentWar.状态 }}</span>
          </div>

          <div class="sides">
            <div class="side">
              <div class="side-name">{{ currentWar.我方?.宗门名称 || playerSectName }}</div>
              <div class="side-kv">战力：{{ safeNum(currentWar.我方?.战力) }}/100</div>
              <div class="side-kv">外/内/核：{{ safeNum(currentWar.我方?.外门) }}/{{ safeNum(currentWar.我方?.内门) }}/{{
                safeNum(currentWar.我方?.核心)
              }}</div>
            </div>
            <div class="vs">VS</div>
            <div class="side enemy">
              <div class="side-name">{{ currentWar.敌方?.宗门名称 || '敌宗' }}</div>
              <div class="side-kv">战力：{{ safeNum(currentWar.敌方?.战力) }}/100</div>
              <div class="side-kv">外/内/核：{{ safeNum(currentWar.敌方?.外门) }}/{{ safeNum(currentWar.敌方?.内门) }}/{{
                safeNum(currentWar.敌方?.核心)
              }}</div>
            </div>
          </div>

          <div class="stage">
            <div class="stage-title">当前阶段：{{ currentWar.当前阶段 || stageList[currentStageIndex] }}</div>
            <div class="stage-steps">
              <span
                v-for="(s, idx) in stageList"
                :key="s"
                class="step"
                :class="{ done: idx < currentStageIndex, active: idx === currentStageIndex }"
              >
                {{ s }}
              </span>
            </div>
          </div>

          <div class="actions">
            <button class="btn danger" :disabled="isWorking || !canAdvance" @click="advanceWar">
              <Swords :size="14" />
              <span>推进下一阶段</span>
            </button>
            <button class="btn" :disabled="isWorking || !canUse" @click="ceaseWar">
              <Shield :size="14" />
              <span>议和/停战</span>
            </button>
            <button class="btn" :disabled="isWorking || !canArchive" @click="archiveWar">
              <Archive :size="14" />
              <span>归档</span>
            </button>
          </div>

          <div class="reports">
            <div class="reports-title">战报</div>
            <div v-if="!currentWar.战报?.length" class="empty">暂无战报</div>
            <div v-else class="report-list">
              <div v-for="(r, idx) in currentWar.战报" :key="`${r.时间}-${idx}`" class="report">
                <div class="report-meta">
                  <span class="badge">{{ r.阶段 }}</span>
                  <span class="time">{{ r.时间 }}</span>
                </div>
                <div class="report-text">{{ r.摘要 }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="card">
          <div class="card-title row">
            <div class="row">
              <Sword :size="14" />
              <span>发起宗门大战</span>
            </div>
            <div class="row">
              <span class="k">目标</span>
              <select v-model="warGoal" class="select">
                <option value="夺矿">夺矿</option>
                <option value="逼降">逼降</option>
                <option value="灭门">灭门</option>
                <option value="扬名">扬名</option>
              </select>
            </div>
          </div>

          <div v-if="selectedEnemy" class="preview">
            <div class="kv"><span class="k">目标宗门</span><span class="v">{{ selectedEnemy.名称 }}</span></div>
            <div class="kv"><span class="k">类型/等级</span><span class="v">{{ selectedEnemy.类型 }} / {{ selectedEnemy.等级 }}</span></div>
            <div class="kv"><span class="k">战力</span><span class="v">{{ getFactionPower(selectedEnemy) }}/100</span></div>
            <div class="kv"><span class="k">大致人数</span><span class="v">{{ getFactionTotalMembers(selectedEnemy) }}</span></div>
          </div>
          <div v-else class="notice">
            <Info :size="14" />
            <span>先从左侧选择目标宗门。</span>
          </div>

          <button class="btn danger" :disabled="isWorking || !canStart" @click="startWar">
            <Flag :size="14" />
            <span>{{ isWorking ? '宣战中...' : '宣战（进入侦察阶段）' }}</span>
          </button>

          <div class="tip">
            <Info :size="14" />
            <span>通过 `sect_generation` 生成结构化战报并写入 `社交.宗门.宗门战争`。</span>
          </div>
        </div>
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
import type { GM_Response } from '@/types/AIGameMaster';
import type { WorldFaction } from '@/types/game';
import { Archive, Flag, Info, RefreshCw, Search, Shield, Sword, Swords } from 'lucide-vue-next';

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();

const searchQuery = ref('');
const selectedEnemy = ref<WorldFaction | null>(null);
const warGoal = ref<'夺矿' | '逼降' | '灭门' | '扬名'>('夺矿');
const isWorking = ref(false);

const stageList = ['侦察', '交锋', '破阵', '攻山', '善后'] as const;

const playerSectInfo = computed(() => gameStateStore.sectMemberInfo);
const playerSectName = computed(() => playerSectInfo.value?.宗门名称 || '未加入宗门');
const playerPosition = computed(() => playerSectInfo.value?.职位 || '散修');
const isLeader = computed(() => /掌门|宗主|副掌门|副宗主/.test(String(playerPosition.value || '')));
const canUse = computed(() => !!gameStateStore.sectSystem && !!playerSectInfo.value?.宗门名称 && isLeader.value);

const sectManagement = computed(() => {
  const sectName = String(playerSectInfo.value?.宗门名称 || '').trim();
  if (!sectName) return null;
  return ((gameStateStore.sectSystem as any)?.宗门经营?.[sectName] ?? null) as any;
});
const hasManagement = computed(() => !!sectManagement.value);
const treasuryStone = computed(() => {
  const v = sectManagement.value?.府库?.灵石;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
});

const currentWar = computed(() => ((gameStateStore.sectSystem as any)?.宗门战争?.当前 ?? null) as any);
const currentStageIndex = computed(() => {
  const idx = Number(currentWar.value?.阶段索引 ?? 0);
  return Number.isFinite(idx) ? Math.max(0, Math.min(stageList.length - 1, idx)) : 0;
});

const canStart = computed(() => canUse.value && !!selectedEnemy.value && !currentWar.value);
const canAdvance = computed(() => canUse.value && !!currentWar.value && String(currentWar.value?.状态) === '进行中');
const canArchive = computed(() => canUse.value && !!currentWar.value && String(currentWar.value?.状态) !== '进行中');

const allFactions = computed<WorldFaction[]>(() => {
  const worldList = gameStateStore.worldInfo?.势力信息;
  if (Array.isArray(worldList) && worldList.length) return worldList as any;

  const map = (gameStateStore.sectSystem as any)?.宗门档案;
  if (map && typeof map === 'object') return Object.values(map) as any;
  return [];
});

const enemyFactions = computed(() => {
  const q = searchQuery.value.trim();
  return allFactions.value
    .filter((f) => f?.名称 && f.名称 !== playerSectName.value)
    .filter((f) => !q || f.名称.includes(q))
    .sort((a, b) => getFactionPower(b) - getFactionPower(a))
    .slice(0, 200);
});

function safeNum(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function getFactionPower(faction: any): number {
  const n = Number(faction?.领导层?.综合战力 ?? faction?.领导层?.战力 ?? faction?.综合战力 ?? faction?.战力 ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function getFactionTotalMembers(faction: any): number {
  const v = faction?.成员数量?.总数 ?? faction?.成员数量?.total;
  const n = Number(v ?? 0);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);

  const core = Number(faction?.领导层?.核心弟子数 ?? 0);
  const inner = Number(faction?.领导层?.内门弟子数 ?? 0);
  const outer = Number(faction?.领导层?.外门弟子数 ?? 0);
  const sum = (Number.isFinite(core) ? core : 0) + (Number.isFinite(inner) ? inner : 0) + (Number.isFinite(outer) ? outer : 0);
  return sum > 0 ? Math.floor(sum) : 0;
}

function buildSideSnapshot(faction: any): { 外门: number; 内门: number; 核心: number; 战力: number } {
  const core = safeNum(faction?.领导层?.核心弟子数);
  const inner = safeNum(faction?.领导层?.内门弟子数);
  const outer = safeNum(faction?.领导层?.外门弟子数);
  const total = getFactionTotalMembers(faction);

  if (core + inner + outer > 0) return { 外门: outer, 内门: inner, 核心: core, 战力: getFactionPower(faction) };
  if (total > 0) {
    const outer2 = Math.max(0, Math.floor(total * 0.72));
    const inner2 = Math.max(0, Math.floor(total * 0.25));
    const core2 = Math.max(0, total - outer2 - inner2);
    return { 外门: outer2, 内门: inner2, 核心: core2, 战力: getFactionPower(faction) };
  }
  return { 外门: 0, 内门: 0, 核心: 0, 战力: getFactionPower(faction) };
}

async function applyGmResponse(rawText: string, saveData: any) {
  const parsed = parseJsonFromText(rawText) as Partial<GM_Response>;
  const { saveData: updated } = await AIBidirectionalSystem.processGmResponse(parsed as GM_Response, saveData, false);
  gameStateStore.loadFromSaveData(updated as any);
  await characterStore.saveCurrentGame();
}

async function initManagement() {
  if (!canUse.value || isWorking.value) return;
  isWorking.value = true;
  try {
    const sectName = String(playerSectInfo.value?.宗门名称 || '').trim();
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
    const side = buildSideSnapshot(sectProfile);
    const nowIso = new Date().toISOString();
    const prompt = `
# 任务：初始化【宗门经营】数据（单次功能请求）
为宗门「${sectName}」写入轻度经营数据，用于宗门大战结算。

## 输出格式（必须）
只输出 1 个 JSON 对象：
{"text":"...","mid_term_memory":"","tavern_commands":[...],"action_options":[]}

## 写入路径（必须）
- 社交.宗门.宗门经营.${sectName} : 完整覆盖

## 对象结构（必须）
{"宗门名称":"${sectName}","战力":number,"安定":number,"外门训练度":number,"府库":{"灵石":number,"灵材":number,"丹药":number,"阵材":number},"设施":{"练功房":number,"藏经阁":number,"炼丹房":number,"护山大阵":number},"最近结算":"${nowIso}","月报":[]}

## 数值约束（必须）
- 战力优先用宗门档案.领导层.综合战力（参考：${side.战力}）
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
    console.error('[SectWar] initManagement failed', e);
    toast.error('初始化失败');
  } finally {
    isWorking.value = false;
  }
}

async function startWar() {
  if (!canStart.value || isWorking.value) return;
  isWorking.value = true;
  try {
    const sectName = String(playerSectInfo.value?.宗门名称 || '').trim();
    const enemy = selectedEnemy.value;
    if (!sectName) {
      toast.warning('未加入宗门');
      return;
    }
    if (!enemy?.名称) {
      toast.warning('请选择敌对宗门');
      return;
    }
    const saveData = gameStateStore.getCurrentSaveData();
    if (!saveData) {
      toast.error('存档数据不完整或未加载，无法宣战');
      return;
    }

    const myProfile = (gameStateStore.sectSystem as any)?.宗门档案?.[sectName] ?? null;
    const mySide = buildSideSnapshot(myProfile);
    const enemySide = buildSideSnapshot(enemy);
    const d20 = rollD20();
    const nowIso = new Date().toISOString();
    const warId = `war_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    const prompt = `
# 任务：宗门大战【宣战并初始化】（多步推演-第1步）
玩家为宗门「${sectName}」的宗主/掌门，对「${enemy.名称}」发起宗门大战，目标「${warGoal.value}」。

## 随机因子（必须使用，不要自行重掷）
d20=${d20}

## 输出格式（必须）
只输出 1 个 JSON 对象：
{"text":"...","mid_term_memory":"","tavern_commands":[...],"action_options":[]}

## 写入路径（必须）
- 社交.宗门.宗门战争.当前 : 完整覆盖为 SectWarState
- 社交.宗门.宗门经营.${sectName} : 若不存在则初始化（可选但推荐）

## SectWarState（必须）
{"战争ID":"${warId}","状态":"进行中","发起方":"${sectName}","守方":"${enemy.名称}","目标":"${warGoal.value}","阶段列表":["侦察","交锋","破阵","攻山","善后"],"阶段索引":0,"当前阶段":"侦察","我方":{"宗门名称":"${sectName}","战力":${mySide.战力},"外门":${mySide.外门},"内门":${mySide.内门},"核心":${mySide.核心},"士气":number},"敌方":{"宗门名称":"${enemy.名称}","战力":${enemySide.战力},"外门":${enemySide.外门},"内门":${enemySide.内门},"核心":${enemySide.核心},"士气":number},"累计伤亡":{"我方":{"外门":0,"内门":0,"核心":0},"敌方":{"外门":0,"内门":0,"核心":0}},"战报":[{"时间":"${nowIso}","阶段":"侦察","摘要":"..."}],"上一次":{"action":"start","time":"${nowIso}","d20":${d20}}}

## 约束（必须）
- 初始化不产生伤亡
- 士气 40-80
- text 简短：〔宗门大战已开启：进入侦察阶段〕

## 档案参考
我方：${JSON.stringify(myProfile).slice(0, 900)}
敌方：${JSON.stringify(enemy).slice(0, 900)}
    `.trim();

    const raw = await generateWithRawPrompt('宗门大战-宣战', prompt, false, 'sect_generation');
    await applyGmResponse(raw, saveData);
    toast.success('已宣战');
  } catch (e) {
    console.error('[SectWar] startWar failed', e);
    toast.error('宣战失败');
  } finally {
    isWorking.value = false;
  }
}

async function advanceWar() {
  if (!canAdvance.value || isWorking.value) return;
  isWorking.value = true;
  try {
    const saveData = gameStateStore.getCurrentSaveData();
    if (!saveData) {
      toast.error('存档数据不完整或未加载，无法推进');
      return;
    }

    const war = currentWar.value;
    const sectName = String(playerSectInfo.value?.宗门名称 || '').trim();
    const enemyName = String(war?.敌方?.宗门名称 || war?.守方 || '').trim();
    if (!war || !sectName || !enemyName) return;

    const myProfile = (gameStateStore.sectSystem as any)?.宗门档案?.[sectName] ?? null;
    const enemyProfile = (gameStateStore.sectSystem as any)?.宗门档案?.[enemyName] ?? selectedEnemy.value ?? null;
    const management = (gameStateStore.sectSystem as any)?.宗门经营?.[sectName] ?? null;

    const d20 = rollD20();
    const nowIso = new Date().toISOString();
    const nextIdx = Math.min(stageList.length - 1, currentStageIndex.value + 1);
    const nextStage = stageList[nextIdx];

    const prompt = `
# 任务：宗门大战【推进下一阶段】（多步推演）
基于当前战争状态，结算一次推进：更新阶段、伤亡、战力变化与战报（可选含府库消耗/缴获）。

## 随机因子（必须使用）
d20=${d20}

## 输出格式（必须）
只输出 1 个 JSON 对象：
{"text":"...","mid_term_memory":"","tavern_commands":[...],"action_options":[]}

## 写入路径（必须）
- 社交.宗门.宗门战争.当前 : 建议 set 完整覆盖（或精准修改）
- （推荐同步）社交.宗门.宗门档案.${sectName} : 只更新 成员数量.总数 与 领导层.核心弟子数/内门弟子数/外门弟子数/综合战力（若存在）
- （推荐同步）社交.宗门.宗门档案.${enemyName} : 同上
- （可选）社交.宗门.宗门经营.${sectName}.府库 : 灵石/灵材等变化（不得为负）

## 约束（必须）
- 从阶段「${war?.当前阶段}」推进到「${nextStage}」（除非判定胜负直接结束）
- 单次推进伤亡一般不超过各自人数的 0.5%~6%（除非攻山/败亡）
- 战力变化幅度建议 -8~+6（保持 0-100）
- 必须写入 宗门战争.当前.上一次 = 结构化结果（含 time/d20/阶段/伤亡/资源变化）
- 战报必须追加一条：push 到 宗门战争.当前.战报

## 当前战争状态（必须以此为准）
${JSON.stringify(war).slice(0, 1400)}

## 我方档案参考
${JSON.stringify(myProfile).slice(0, 900)}

## 敌方档案参考
${JSON.stringify(enemyProfile).slice(0, 900)}

## 我方经营参考（可能为空）
${JSON.stringify(management).slice(0, 900)}
    `.trim();

    const raw = await generateWithRawPrompt('宗门大战-推进', prompt, false, 'sect_generation');
    await applyGmResponse(raw, saveData);
    toast.success('已推进');
  } catch (e) {
    console.error('[SectWar] advanceWar failed', e);
    toast.error('推进失败');
  } finally {
    isWorking.value = false;
  }
}

async function ceaseWar() {
  if (!canUse.value || !currentWar.value || isWorking.value) return;
  isWorking.value = true;
  try {
    const saveData = gameStateStore.getCurrentSaveData();
    if (!saveData) {
      toast.error('存档数据不完整或未加载，无法停战');
      return;
    }
    const war = currentWar.value;
    const nowIso = new Date().toISOString();
    const prompt = `
# 任务：宗门大战【停战/议和】（单次功能请求）
将当前战争状态改为“停战”，并追加一条战报（轻度即可）。

## 输出格式（必须）
只输出 1 个 JSON 对象：
{"text":"...","mid_term_memory":"","tavern_commands":[...],"action_options":[]}

## 写入路径（必须）
- 社交.宗门.宗门战争.当前.状态 : "停战"
- 社交.宗门.宗门战争.当前.战报 : push {"时间":"${nowIso}","阶段":"停战","摘要":"..."}
- 社交.宗门.宗门战争.当前.上一次 : set 结构化结果

## 当前战争状态（参考）
${JSON.stringify(war).slice(0, 1200)}
    `.trim();

    const raw = await generateWithRawPrompt('宗门大战-停战', prompt, false, 'sect_generation');
    await applyGmResponse(raw, saveData);
    toast.success('已停战');
  } catch (e) {
    console.error('[SectWar] ceaseWar failed', e);
    toast.error('停战失败');
  } finally {
    isWorking.value = false;
  }
}

async function archiveWar() {
  if (!canArchive.value) return;
  try {
    if (!gameStateStore.getCurrentSaveData()) return;

    const current = currentWar.value;
    const system = (gameStateStore.sectSystem as any) || {};
    const history = Array.isArray(system?.宗门战争?.历史) ? system.宗门战争.历史 : [];
    const nextHistory = [...history, current].slice(-30);
    const nextSectSystem = {
      ...(system || {}),
      宗门战争: {
        ...(system.宗门战争 || {}),
        当前: null,
        历史: nextHistory,
      },
    };

    gameStateStore.sectSystem = nextSectSystem as any;
    await characterStore.saveCurrentGame();
    toast.success('已归档');
  } catch (e) {
    console.error('[SectWar] archive failed', e);
    toast.error('归档失败');
  }
}
</script>

<style scoped>
.sect-war {
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

.btn {
  margin-left: auto;
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

.btn:hover:not(:disabled) {
  border-color: rgba(var(--color-primary-rgb), 0.35);
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn.danger {
  margin-left: 0;
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
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

.content {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

.col {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.card {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.card-title {
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
}

.search {
  display: flex;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 10px;
  padding: 8px 10px;
}

.search input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 0.85rem;
}

.list {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.list-item {
  text-align: left;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.list-item:hover {
  border-color: rgba(239, 68, 68, 0.35);
}

.list-item.active {
  border-color: rgba(239, 68, 68, 0.55);
  background: rgba(239, 68, 68, 0.07);
}

.name {
  font-weight: 800;
  color: var(--color-text);
}

.meta,
.power {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.power {
  color: #ef4444;
}

.sides {
  display: grid;
  grid-template-columns: 1fr 60px 1fr;
  gap: 8px;
  align-items: start;
}

.side {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 10px;
  padding: 10px;
}

.side.enemy {
  border-color: rgba(239, 68, 68, 0.25);
}

.side-name {
  font-weight: 800;
  margin-bottom: 6px;
}

.side-kv {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.vs {
  text-align: center;
  font-weight: 900;
  color: var(--color-text-secondary);
  padding-top: 18px;
}

.stage {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 10px;
  padding: 10px;
}

.stage-title {
  font-weight: 800;
  margin-bottom: 8px;
}

.stage-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.step {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.step.active {
  border-color: rgba(239, 68, 68, 0.45);
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.step.done {
  opacity: 0.75;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reports {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.reports-title {
  font-weight: 800;
}

.report-list {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.report {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 10px;
  padding: 10px;
}

.report-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.report-text {
  font-size: 0.88rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.preview {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 8px;
}

.select {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 8px;
  padding: 4px 8px;
  color: var(--color-text);
}

.tip {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.empty {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  padding: 6px 0;
}

@media (max-width: 1024px) {
  .content {
    grid-template-columns: 1fr;
  }
  .btn {
    margin-left: 0;
  }
}
</style>
