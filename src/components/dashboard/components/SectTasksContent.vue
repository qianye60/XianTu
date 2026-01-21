<template>
  <div class="sect-tasks">
    <div class="player-info-bar">
      <div class="info-item">
        <span class="info-label">职位</span>
        <span class="info-value position">{{ playerPosition }}</span>
      </div>
      <div class="info-item highlight">
        <span class="info-label">当前贡献点</span>
        <span class="info-value contribution">{{ playerContribution }}</span>
      </div>
      <div class="info-actions">
        <button class="gen-btn" @click="generateSectTasks" :disabled="isGenerating || !canGenerate">
          <RefreshCw :size="14" :class="{ spin: isGenerating }" />
          <span>{{ hasTasks ? '刷新任务' : '生成任务' }}</span>
        </button>
      </div>
    </div>

    <div class="task-filters">
      <button
        v-for="filter in taskFilters"
        :key="filter.key"
        class="filter-btn"
        :class="{ active: activeFilter === filter.key }"
        @click="activeFilter = filter.key"
      >
        <component :is="filter.icon" :size="14" />
        <span>{{ filter.label }}</span>
      </button>
    </div>

    <div class="task-list">
      <div v-if="filteredTasks.length === 0" class="empty-state">
        <ClipboardList :size="48" class="empty-icon" />
        <p class="empty-text">暂无宗门任务</p>
        <p class="empty-hint">任务将由AI根据宗门设定生成</p>
        <button v-if="canGenerate" class="ask-btn" @click="generateSectTasks" :disabled="isGenerating">
          <RefreshCw :size="14" :class="{ spin: isGenerating }" />
          <span>{{ isGenerating ? '生成中...' : '点击生成' }}</span>
        </button>
      </div>

      <div v-else class="task-grid">
        <div v-for="task in filteredTasks" :key="task.任务ID" class="task-card" :class="task.statusClass">
          <div class="task-header">
            <div class="task-title">
              <span class="task-name">{{ task.任务名称 }}</span>
              <span class="task-difficulty" :class="getDifficultyClass(task.难度)">{{ task.难度 }}</span>
            </div>
            <span class="task-status" :class="task.statusClass">{{ task.状态 }}</span>
          </div>

          <p class="task-desc">{{ task.任务描述 }}</p>

          <div class="task-meta">
            <span class="meta-item">类型：{{ task.任务类型 }}</span>
            <span class="meta-item">贡献奖励：{{ task.贡献奖励 }}</span>
            <span v-if="task.额外奖励" class="meta-item">额外奖励：{{ task.额外奖励 }}</span>
            <span v-if="task.期限" class="meta-item">期限：{{ task.期限 }}</span>
            <span v-if="task.发布人" class="meta-item">发布人：{{ task.发布人 }}</span>
            <span v-if="task.要求" class="meta-item">要求：{{ task.要求 }}</span>
          </div>

          <div class="task-actions">
            <button
              v-if="task.状态 === '可接取'"
              class="task-btn primary"
              @click="acceptTask(task.任务ID)"
            >
              接取
            </button>
            <button
              v-if="task.状态 === '进行中'"
              class="task-btn success"
              @click="completeTask(task.任务ID)"
            >
              完成
            </button>
            <button
              v-if="task.状态 === '进行中'"
              class="task-btn ghost"
              @click="abandonTask(task.任务ID)"
            >
              放弃
            </button>
            <span v-if="task.状态 === '已完成'" class="task-done">已完成</span>
          </div>
        </div>
      </div>
    </div>

    <div class="task-notice">
      <Info :size="14" />
      <span>任务列表可随剧情更新，完成后自动增加贡献点</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ClipboardList, RefreshCw, Info, List, Play, CheckCircle2 } from 'lucide-vue-next';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';
import { sendChat } from '@/utils/chatBus';
import { generateWithRawPrompt } from '@/utils/tavernCore';
import { parseJsonSmart } from '@/utils/jsonExtract';
import { aiService } from '@/services/aiService';

const gameStateStore = useGameStateStore();
const characterStore = useCharacterStore();
const activeFilter = ref<string>('all');
const isGenerating = ref(false);

const taskFilters = [
  { key: 'all', label: '全部', icon: List },
  { key: '可接取', label: '可接取', icon: Play },
  { key: '进行中', label: '进行中', icon: ClipboardList },
  { key: '已完成', label: '已完成', icon: CheckCircle2 },
];

const playerSectInfo = computed(() => gameStateStore.sectMemberInfo);
const playerPosition = computed(() => playerSectInfo.value?.职位 || '散修');
const playerContribution = computed(() => playerSectInfo.value?.贡献 || 0);
const canGenerate = computed(() => !!playerSectInfo.value?.宗门名称 && !!gameStateStore.sectSystem);

const hasTasks = computed(() => getSectTasks().length > 0);

type SectTask = {
  任务ID: string;
  任务名称: string;
  任务描述: string;
  任务类型: string;
  难度: string;
  贡献奖励: number;
  额外奖励: string;
  状态: string;
  期限: string;
  发布人: string;
  要求: string;
};

function normalizeStatus(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '可接取';
  if (text.includes('可接取') || /available|open|accept/i.test(text)) return '可接取';
  if (text.includes('进行') || /in[- ]?progress|ongoing/i.test(text)) return '进行中';
  if (text.includes('完成') || /done|completed|finished/i.test(text)) return '已完成';
  return text;
}

function normalizeDifficulty(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '中';
  if (text.includes('低') || /low/i.test(text)) return '低';
  if (text.includes('中') || /mid|medium/i.test(text)) return '中';
  if (text.includes('高') || /high/i.test(text)) return '高';
  if (text.includes('极') || /extreme|legendary/i.test(text)) return '极';
  return text;
}

function normalizeTask(raw: any, index: number): SectTask {
  const reward = Number(raw?.贡献奖励 ?? raw?.reward_contribution ?? raw?.reward?.贡献 ?? raw?.reward ?? 0);
  const status = normalizeStatus(raw?.状态 ?? raw?.status);
  const difficulty = normalizeDifficulty(raw?.难度 ?? raw?.difficulty);
  return {
    任务ID: raw?.任务ID || raw?.id || `sect_task_${index}`,
    任务名称: raw?.任务名称 || raw?.name || '任务',
    任务描述: raw?.任务描述 || raw?.description || '',
    任务类型: raw?.任务类型 || raw?.type || '日常',
    难度: difficulty,
    贡献奖励: Number.isFinite(reward) ? reward : 0,
    额外奖励: raw?.额外奖励 || raw?.reward_extra || raw?.reward?.额外奖励 || '',
    状态: status,
    期限: raw?.期限 || raw?.deadline || '',
    发布人: raw?.发布人 || raw?.publisher || '',
    要求: raw?.要求 || raw?.requirements || '',
  };
}

function getSectTasks(): SectTask[] {
  const sectName = playerSectInfo.value?.宗门名称;
  if (!sectName) return [];
  const rawTasks = gameStateStore.sectSystem?.宗门任务?.[sectName];
  if (!Array.isArray(rawTasks)) return [];
  return rawTasks.map(normalizeTask);
}

const filteredTasks = computed(() => {
  const tasks = getSectTasks().map((task) => ({
    ...task,
    statusClass: task.状态 === '进行中'
      ? 'in-progress'
      : task.状态 === '已完成'
        ? 'completed'
        : 'available'
  }));
  if (activeFilter.value === 'all') return tasks;
  return tasks.filter((task) => task.状态 === activeFilter.value);
});

function getDifficultyClass(level: string): string {
  if (level.includes('低')) return 'diff-low';
  if (level.includes('中')) return 'diff-mid';
  if (level.includes('高')) return 'diff-high';
  if (level.includes('极')) return 'diff-extreme';
  return 'diff-mid';
}

async function updateTasks(mutator: (tasks: SectTask[]) => SectTask[]) {
  const sectName = String(playerSectInfo.value?.宗门名称 || '').trim();
  if (!sectName) return;
  const saveData = gameStateStore.getCurrentSaveData();
  if (!saveData) {
    toast.error('未找到当前存档');
    return;
  }

  const updated = typeof structuredClone === 'function'
    ? structuredClone(saveData)
    : JSON.parse(JSON.stringify(saveData));

  const socialRoot = ((updated as any).社交 ??= {});
  const sectRoot = (socialRoot.宗门 ??= {});
  const taskRoot = (sectRoot.宗门任务 ??= {});
  const currentTasks = Array.isArray(taskRoot[sectName]) ? taskRoot[sectName].map(normalizeTask) : [];
  taskRoot[sectName] = mutator(currentTasks);

  gameStateStore.loadFromSaveData(updated);
  await characterStore.saveCurrentGame();
}

async function acceptTask(taskId: string) {
  await updateTasks((tasks) => tasks.map((task) => {
    if (task.任务ID !== taskId) return task;
    if (task.状态 !== '可接取') return task;
    return { ...task, 状态: '进行中' };
  }));
  sendChat(`已接取宗门任务：${taskId}`);
  toast.success('已接取任务');
}

async function completeTask(taskId: string) {
  const sectName = String(playerSectInfo.value?.宗门名称 || '').trim();
  const saveData = gameStateStore.getCurrentSaveData();
  if (!saveData || !sectName) {
    toast.error('未找到当前存档');
    return;
  }

  const updated = typeof structuredClone === 'function'
    ? structuredClone(saveData)
    : JSON.parse(JSON.stringify(saveData));

  const socialRoot = ((updated as any).社交 ??= {});
  const sectRoot = (socialRoot.宗门 ??= {});
  const taskRoot = (sectRoot.宗门任务 ??= {});
  const tasks = Array.isArray(taskRoot[sectName]) ? taskRoot[sectName].map(normalizeTask) : [];
  let reward = 0;
  const nextTasks = tasks.map((task) => {
    if (task.任务ID !== taskId) return task;
    if (task.状态 !== '进行中') return task;
    reward = task.贡献奖励 || 0;
    return { ...task, 状态: '已完成' };
  });
  taskRoot[sectName] = nextTasks;

  const memberInfo = (sectRoot.成员信息 ??= {});
  const currentContribution = Number(memberInfo.贡献 ?? 0);
  memberInfo.贡献 = currentContribution + reward;

  gameStateStore.loadFromSaveData(updated);
  await characterStore.saveCurrentGame();
  sendChat(`宗门任务完成：${taskId}, 贡献+${reward}`);
  toast.success('任务已完成');
}

async function abandonTask(taskId: string) {
  await updateTasks((tasks) => tasks.map((task) => {
    if (task.任务ID !== taskId) return task;
    if (task.状态 !== '进行中') return task;
    return { ...task, 状态: '可接取' };
  }));
  toast.info('已放弃任务');
}

async function generateSectTasks() {
  if (!canGenerate.value) {
    toast.warning('未加入宗门或宗门数据未加载');
    return;
  }
  if (isGenerating.value) return;
  isGenerating.value = true;
  try {
    const sectName = String(playerSectInfo.value?.宗门名称 || '').trim();
    if (!sectName) {
      toast.warning('无法识别宗门名称');
      return;
    }

    const saveData = gameStateStore.getCurrentSaveData();
    if (!saveData) {
      toast.error('未找到当前存档');
      return;
    }

    const sectProfile = (gameStateStore.sectSystem as any)?.宗门档案?.[sectName] ?? null;
    const existing = (gameStateStore.sectSystem as any)?.宗门任务?.[sectName] ?? [];
    const existingNames = Array.isArray(existing)
      ? existing
          .map((v: any) => String(v?.任务名称 || v?.name || '').trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    const nowIso = new Date().toISOString();
    const prompt = `
# Sect Task Generation (JSON only)
You generate tasks for sect "${sectName}".

Output JSON:
{"text":"...","tasks":[...],"evolve_count":1,"last_updated":"${nowIso}"}

Rules:
- Only fields: text, tasks, evolve_count, last_updated.
- No extra fields (e.g., tavern_commands, action_options, 社交, 宗门, 系统).
- tasks must be an array.
- Output pure JSON only. No code fences, no extra text.
- Do not output Markdown; use \n for newlines inside JSON strings.

Task item schema:
{
  "任务ID": "string, unique id",
  "任务名称": "string",
  "任务描述": "string (20-100 chars)",
  "任务类型": "巡逻|采集|护送|除魔|求援|侦查|炼丹|炼器|内门事务|秘境",
  "难度": "低|中|高|极",
  "贡献奖励": number,
  "额外奖励": "string or empty",
  "状态": "可接取"
}
Optional: "期限", "发布人", "要求"

Requirements:
- 6-12 tasks, at least 4 available.
- Reward scales: low(10-80) mid(80-200) high(200-400) extreme(400-800).
- Match sect theme and player position.
- text should be short (e.g. "宗门任务已更新").

Context:
- Player position: ${playerPosition.value}
- Current contribution: ${playerContribution.value}
- Sect profile: ${JSON.stringify(sectProfile).slice(0, 1200)}
- Existing tasks: ${existingNames.join(', ') || 'none'}
    `.trim();

    const raw = await generateWithRawPrompt('Generate Sect Tasks', prompt, false, 'sect_generation');
    const parsed = parseJsonSmart(raw, aiService.isForceJsonEnabled('sect_generation')) as {
      text?: string;
      tasks?: unknown;
      evolve_count?: number;
      last_updated?: string;
    };

    if (!Array.isArray(parsed.tasks)) {
      throw new Error('tasks field missing or invalid');
    }

    const normalizedTasks = parsed.tasks.map((task: any, index: number) => normalizeTask(task, index));

    const updated = typeof structuredClone === 'function'
      ? structuredClone(saveData)
      : JSON.parse(JSON.stringify(saveData));

    const socialRoot = ((updated as any).社交 ??= {});
    const sectRoot = (socialRoot.宗门 ??= {});
    const taskRoot = (sectRoot.宗门任务 ??= {});
    taskRoot[sectName] = normalizedTasks;

    const statusRoot = (sectRoot.宗门任务状态 ??= {});
    const status = (statusRoot[sectName] ??= {});
    const prevCount = typeof status.演变次数 === 'number' ? status.演变次数 : 0;
    const evolveCount = typeof parsed.evolve_count === 'number' && Number.isFinite(parsed.evolve_count)
      ? parsed.evolve_count
      : prevCount + 1;
    const lastUpdated = typeof parsed.last_updated === 'string' && parsed.last_updated.trim()
      ? parsed.last_updated
      : nowIso;

    status.已初始化 = true;
    status.最后更新时间 = lastUpdated;
    status.演变次数 = evolveCount;

    gameStateStore.loadFromSaveData(updated);
    await characterStore.saveCurrentGame();
    toast.success('宗门任务已更新');
  } catch (error) {
    console.error('[SectTasks] generate failed', error);
    toast.error('生成宗门任务失败');
  } finally {
    isGenerating.value = false;
  }
}
</script>

<style scoped>
.sect-tasks {
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
  background: linear-gradient(135deg, rgba(14, 116, 144, 0.1), rgba(14, 116, 144, 0.05));
  border-radius: 8px;
  border: 1px solid rgba(14, 116, 144, 0.2);
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
  border: 1px solid rgba(14, 116, 144, 0.25);
  background: rgba(14, 116, 144, 0.08);
  color: #0e7490;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.gen-btn:hover:not(:disabled) {
  border-color: rgba(14, 116, 144, 0.45);
  background: rgba(14, 116, 144, 0.12);
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
  background: rgba(14, 116, 144, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(14, 116, 144, 0.2);
}

.info-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.info-value {
  font-weight: 600;
  font-size: 0.9rem;
}

.info-value.position { color: #0f766e; }
.info-value.contribution { color: #0e7490; font-size: 1.1rem; }

.task-filters {
  left: 4px;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
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

.filter-btn:hover {
  border-color: rgba(14, 116, 144, 0.3);
  color: var(--color-text);
}

.filter-btn.active {
  background: linear-gradient(135deg, rgba(14, 116, 144, 0.12), rgba(14, 116, 144, 0.05));
  border-color: rgba(14, 116, 144, 0.4);
  color: #0e7490;
}

.task-list {
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
  background: linear-gradient(135deg, #0e7490, #0891b2);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ask-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(14, 116, 144, 0.3);
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.75rem;
}

.task-card {
  padding: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.task-card.available { border-color: rgba(14, 116, 144, 0.25); }
.task-card.in-progress { border-color: rgba(234, 179, 8, 0.35); }
.task-card.completed { border-color: rgba(34, 197, 94, 0.35); opacity: 0.75; }

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.task-title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.task-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.task-difficulty {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  width: fit-content;
  font-weight: 500;
}

.diff-low { background: rgba(34, 197, 94, 0.18); color: #16a34a; }
.diff-mid { background: rgba(14, 116, 144, 0.18); color: #0e7490; }
.diff-high { background: rgba(249, 115, 22, 0.18); color: #ea580c; }
.diff-extreme { background: rgba(239, 68, 68, 0.18); color: #dc2626; }

.task-status {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  border: 1px solid transparent;
}

.task-status.available { color: #0e7490; border-color: rgba(14, 116, 144, 0.3); }
.task-status.in-progress { color: #d97706; border-color: rgba(217, 119, 6, 0.4); }
.task-status.completed { color: #16a34a; border-color: rgba(22, 163, 74, 0.4); }

.task-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.meta-item {
  word-break: break-word;
  overflow-wrap: anywhere;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.task-btn {
  border: none;
  border-radius: 6px;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.task-btn.primary { background: rgba(14, 116, 144, 0.12); color: #0e7490; border: 1px solid rgba(14, 116, 144, 0.3); }
.task-btn.primary:hover { background: rgba(14, 116, 144, 0.2); }
.task-btn.success { background: rgba(22, 163, 74, 0.12); color: #16a34a; border: 1px solid rgba(22, 163, 74, 0.3); }
.task-btn.success:hover { background: rgba(22, 163, 74, 0.2); }
.task-btn.ghost { background: transparent; color: var(--color-text-secondary); border: 1px dashed rgba(148, 163, 184, 0.6); }

.task-done {
  font-size: 0.75rem;
  color: #16a34a;
  font-weight: 600;
}

.task-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(14, 116, 144, 0.08);
  border-radius: 6px;
  font-size: 0.75rem;
  color: #0e7490;
}
</style>
