<template>
  <EmptyState v-if="!gs.isGameLoaded" glyph="数" title="存档尚未加载" desc="进入游戏后才能查看变量" />
  <EmptyState v-else-if="viewError" glyph="数" title="变量读不出来" :desc="viewError" />

  <div v-else class="vars-page">
    <div class="gm-toolbar">
      <div class="gm-seg" role="radiogroup" aria-label="编辑模式">
        <button v-for="m in MODES" :key="m.key" type="button" role="radio" :aria-checked="v.mode.value === m.key" :class="{ active: v.mode.value === m.key }" :title="m.desc" @click="v.mode.value = m.key">
          {{ m.label }}
        </button>
      </div>
      <span class="mode-desc">{{ MODES.find((m) => m.key === v.mode.value)?.desc }}</span>
      <span class="spacer"></span>
      <label class="gm-search">
        <Search :size="15" />
        <input v-model="query" class="cc-input" type="search" placeholder="搜索路径，如 气血" aria-label="搜索路径" />
      </label>
    </div>

    <div class="cols">
      <!-- 路径树 -->
      <nav class="tree" aria-label="路径">
        <template v-if="query.trim()">
          <p class="tree-hint">匹配 {{ searchRows.length }} 条<template v-if="searchRows.length >= 100">（仅显示前 100 条）</template></p>
          <button
            v-for="r in searchRows"
            :key="r.path"
            type="button"
            class="node"
            :class="{ active: selectedPath === r.path }"
            @click="select(r.path)"
          >
            <Lock v-if="r.locked" :size="12" class="lock" />
            <span class="node-path">{{ r.path }}</span>
            <span class="node-type">{{ TYPE_NAMES[r.type] }}</span>
          </button>
        </template>
        <template v-else>
          <template v-for="r in treeRows" :key="r.path">
            <p v-if="r.more" class="node more" :style="{ paddingLeft: `${r.depth * 14 + 26}px` }">…还有 {{ r.more }} 项（用搜索定位）</p>
            <button
              v-else
              type="button"
              class="node"
              :class="{ active: selectedPath === r.path, root: r.depth === 0 }"
              :style="{ paddingLeft: `${r.depth * 14 + 8}px` }"
              :title="r.locked || undefined"
              @click="onNode(r)"
            >
              <ChevronRight v-if="r.expandable" :size="13" class="caret" :class="{ open: expanded.has(r.path) }" />
              <span v-else class="caret-space"></span>
              <span class="node-key">{{ r.key }}</span>
              <Lock v-if="r.locked && !r.expandable" :size="11" class="lock" />
              <span class="node-preview">{{ r.preview }}</span>
            </button>
          </template>
          <div class="custom-head">
            <span>自定义变量</span>
            <button type="button" class="cc-icon-btn" title="新增自定义变量" aria-label="新增自定义变量" @click="addCustom"><Plus :size="14" /></button>
          </div>
          <button
            v-for="(val, k) in v.custom.value"
            :key="k"
            type="button"
            class="node"
            :class="{ active: selectedPath === `${CUSTOM_ROOT}.${k}` }"
            style="padding-left: 22px"
            @click="select(`${CUSTOM_ROOT}.${k}`)"
          >
            <span class="node-key">{{ k }}</span>
            <span class="node-preview">{{ preview(val) }}</span>
          </button>
          <p v-if="!Object.keys(v.custom.value).length" class="tree-hint">按存档保存在本机，可给自己做记号。</p>
        </template>
      </nav>

      <!-- 编辑区 -->
      <section class="editor">
        <template v-if="selectedPath">
          <header class="ed-head">
            <code class="ed-path">{{ selectedPath }}</code>
            <button type="button" class="cc-icon-btn" title="复制路径与值" aria-label="复制路径与值" @click="copy"><Copy :size="14" /></button>
          </header>
          <p class="ed-desc">{{ isCustom ? '自定义变量（仅本机）' : describeVariablePath(selectedPath) }} · {{ TYPE_NAMES[currentType] }}</p>

          <p v-if="lock" class="ed-lock"><Lock :size="14" />{{ lock }}</p>

          <template v-else>
            <label v-if="currentType === 'boolean'" class="bool">
              <span class="gm-switch"><input v-model="draftBool" type="checkbox" /><span></span></span>
              {{ draftBool ? 'true' : 'false' }}
            </label>
            <input v-else-if="currentType === 'number'" v-model="draftText" class="gm-field ed-num" type="number" step="any" aria-label="新值" />
            <textarea
              v-else
              v-model="draftText"
              class="gm-field ed-area"
              :class="{ invalid: !!draftError }"
              :rows="isJsonType ? 16 : 6"
              spellcheck="false"
              aria-label="新值"
            ></textarea>
            <p v-if="draftError" class="ed-error">{{ draftError }}</p>

            <div v-if="changed && !draftError" class="diff">
              <div class="diff-col before">
                <span>修改前</span>
                <pre>{{ pretty(currentValue) }}</pre>
              </div>
              <ArrowRight :size="16" class="diff-arrow" />
              <div class="diff-col after">
                <span>修改后</span>
                <pre>{{ pretty(draftValue) }}</pre>
              </div>
            </div>

            <div class="ed-actions">
              <button v-if="isCustom" type="button" class="cc-btn small danger" @click="removeCustom"><Trash2 :size="14" /><span>删除变量</span></button>
              <span class="spacer"></span>
              <button type="button" class="cc-btn small" :disabled="!changed" @click="resetDraft">取消</button>
              <button type="button" class="cc-btn small primary" :disabled="!changed || !!draftError || v.saving.value" @click="applyDraft">
                <Check :size="14" /><span>应用</span>
              </button>
            </div>
          </template>

          <details v-if="lock || !isEditableText" class="raw">
            <summary>当前值</summary>
            <pre>{{ pretty(currentValue) }}</pre>
          </details>
        </template>
        <EmptyState v-else glyph="数" title="选择一个字段" desc="从左侧路径树展开，或搜索路径" compact />
      </section>

      <!-- 信息栏 -->
      <aside class="info">
        <h4 class="gm-label">编辑规则</h4>
        <ul class="rules">
          <li>只能改 角色 / 社交 / 世界 / 系统 下已存在的字段</li>
          <li>元数据、系统.联机 / 存档 / 历史 受保护</li>
          <li>对象需高级及以上；数组、空值仅开发者</li>
          <li>新旧值类型必须一致，计数类字段不能为负</li>
        </ul>
        <h4 class="gm-label">修改记录</h4>
        <ol v-if="v.history.value.length" class="hist">
          <li v-for="(h, i) in v.history.value.slice(0, 10)" :key="i">
            <code>{{ h.path }}</code>
            <small>{{ h.time }} · {{ short(h.before) }} → {{ short(h.after) }}</small>
          </li>
        </ol>
        <p v-else class="gm-muted">本次还没有修改。</p>
      </aside>
    </div>

    <!-- 统计 / 格式说明 -->
    <SideDrawer :open="drawer === 'stats'" title="数据统计" @close="drawer = ''">
      <table class="stat-table">
        <thead><tr><th>领域</th><th>顶层字段</th><th>全部字段</th><th>体积</th></tr></thead>
        <tbody>
          <tr v-for="s in v.stats.value" :key="s.domain">
            <th>{{ s.domain }}</th><td>{{ s.keys }}</td><td>{{ s.fields }}</td><td>{{ (s.size / 1024).toFixed(1) }} KB</td>
          </tr>
        </tbody>
      </table>
      <p class="gm-muted">叙事历史在 系统.历史 下，通常是存档里最大的部分。</p>
    </SideDrawer>
    <SideDrawer :open="drawer === 'guide'" title="数据格式说明" :width="640" @close="drawer = ''">
      <template #head>
        <button type="button" class="cc-btn small" @click="copyGuide"><Copy :size="14" /><span>复制</span></button>
      </template>
      <pre class="guide">{{ guideText }}</pre>
    </SideDrawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowRight, BarChart3, BookOpen, Check, ChevronRight, Copy, Download, Lock, Plus, RefreshCw, Search, Trash2, Undo2 } from 'lucide-vue-next';
import { get as lodashGet } from 'lodash';
import { useGameStateStore } from '@/stores/gameStateStore';
import { CUSTOM_ROOT, DOMAINS, typeOf, useGameVariables } from '@/composables/useGameVariables';
import { describeVariablePath, validateVariableEdit, type VariableEditMode } from '@/utils/gameVariableEditor';
import { getSaveDataStructureForEnv } from '@/utils/prompts/definitions/dataDefinitions';
import { isTavernEnv } from '@/utils/tavern';
import { downloadText, localDateStamp } from '@/utils/gameDisplay';
import { usePageActions } from '@/composables/usePageActions';
import { askText, confirmDialog } from '@/composables/useDialog';
import { toast } from '@/utils/toast';
import EmptyState from '@/components/game/EmptyState.vue';
import SideDrawer from '@/components/game/SideDrawer.vue';

defineOptions({ name: 'GameVariablesPage' });

const gs = useGameStateStore();
const v = useGameVariables();

const MODES: { key: VariableEditMode; label: string; desc: string }[] = [
  { key: 'normal', label: '普通', desc: '只改文字、数字、开关' },
  { key: 'advanced', label: '高级', desc: '可改整个对象' },
  { key: 'developer', label: '开发者', desc: '可改数组、空值，直接编辑 JSON' },
];
const TYPE_NAMES: Record<string, string> = {
  string: '文本', number: '数字', boolean: '开关', object: '对象', array: '数组', null: '空值', undefined: '未定义',
};

const safeJson = (x: unknown, space?: number) => {
  try {
    const t = JSON.stringify(x, null, space);
    return t === undefined ? 'undefined' : t;
  } catch {
    return '（无法序列化）';
  }
};
const keysOf = (x: unknown): string[] => {
  try {
    if (!x || typeof x !== 'object') return [];
    return Object.keys(x as object);
  } catch {
    return [];
  }
};
const short = (x: unknown) => {
  const t = x === undefined ? '（无）' : typeof x === 'object' ? safeJson(x) : String(x);
  return t.length > 24 ? `${t.slice(0, 24)}…` : t;
};
const preview = (x: unknown) => {
  const t = typeOf(x);
  if (t === 'object') return `{${keysOf(x).length}}`;
  if (t === 'array') return `[${(x as unknown[]).length}]`;
  return short(x);
};
const pretty = (x: unknown) => {
  const t = x === undefined ? '（无）' : typeof x === 'string' ? x : safeJson(x, 2);
  return t.length > 4000 ? `${t.slice(0, 4000)}\n…（已截断）` : t;
};

const viewError = computed(() => {
  const err = (v.saveView.value as { __error?: string }).__error;
  return err || '';
});

// ─── 树 ───
const expanded = ref(new Set<string>(['角色']));
const toggle = (path: string) => {
  const s = new Set(expanded.value);
  if (s.has(path)) s.delete(path);
  else s.add(path);
  expanded.value = s;
};

interface Row { path: string; key: string; depth: number; type: string; expandable: boolean; preview: string; locked: string | null; more?: number }

const lockOf = (path: string, value: unknown) => {
  try {
    return validateVariableEdit(v.saveView.value, path, value, v.mode.value);
  } catch {
    return '该字段暂时无法检查';
  }
};

const treeRows = computed<Row[]>(() => {
  const rows: Row[] = [];
  try {
    const walk = (obj: any, base: string, depth: number) => {
      if (depth > 12) return;
      const keys = keysOf(obj);
      const shown = keys.slice(0, 200);
      for (const key of shown) {
        const path = base ? `${base}.${key}` : key;
        const val = obj[key];
        const t = typeOf(val);
        const expandable = (t === 'object' || t === 'array') && keysOf(val).length > 0;
        rows.push({ path, key, depth, type: t, expandable, preview: expandable && expanded.value.has(path) ? '' : preview(val), locked: depth === 0 ? null : lockOf(path, val) });
        if (expandable && expanded.value.has(path)) walk(val, path, depth + 1);
      }
      if (keys.length > shown.length) rows.push({ path: `${base}.__more`, key: '', depth, type: '', expandable: false, preview: '', locked: null, more: keys.length - shown.length });
    };
    walk(Object.fromEntries(DOMAINS.map((d) => [d, v.saveView.value[d]])), '', 0);
  } catch (e) {
    console.error('[游戏变量] 路径树生成失败', e);
    rows.push({ path: '__error', key: '读取失败', depth: 0, type: 'string', expandable: false, preview: (e as Error).message || '未知错误', locked: null });
  }
  return rows;
});

const query = ref('');
const searchRows = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  const out: { path: string; type: string; locked: boolean }[] = [];
  try {
    const stack: Array<{ path: string; value: unknown; depth: number }> = DOMAINS.map((d) => ({ path: d, value: v.saveView.value[d], depth: 0 }));
    while (stack.length && out.length < 100) {
      const n = stack.pop()!;
      if (n.path.toLowerCase().includes(q)) out.push({ path: n.path, type: typeOf(n.value), locked: !!lockOf(n.path, n.value) });
      if (n.depth < 8 && n.value && typeof n.value === 'object') {
        for (const key of keysOf(n.value)) stack.push({ path: `${n.path}.${key}`, value: (n.value as any)[key], depth: n.depth + 1 });
      }
    }
  } catch (e) {
    console.error('[游戏变量] 搜索失败', e);
  }
  return out;
});

// ─── 选中 & 编辑 ───
const selectedPath = ref('');
const isCustom = computed(() => selectedPath.value.startsWith(`${CUSTOM_ROOT}.`));
const currentValue = computed(() =>
  isCustom.value ? v.custom.value[selectedPath.value.slice(CUSTOM_ROOT.length + 1)] : lodashGet(v.saveView.value, selectedPath.value),
);
const currentType = computed(() => typeOf(currentValue.value));
const isJsonType = computed(() => ['object', 'array', 'null', 'undefined'].includes(currentType.value));
const isEditableText = computed(() => ['string', 'number', 'boolean'].includes(currentType.value));
const lock = computed(() => (selectedPath.value && !isCustom.value ? lockOf(selectedPath.value, currentValue.value) : null));

const draftText = ref('');
const draftBool = ref(false);
const resetDraft = () => {
  const c = currentValue.value;
  draftBool.value = !!c;
  draftText.value = currentType.value === 'string' ? String(c ?? '') : currentType.value === 'number' ? String(c ?? '') : safeJson(c ?? null, 2);
};
watch([selectedPath, currentValue], resetDraft, { immediate: true });

const parsed = computed<{ value?: unknown; error?: string }>(() => {
  const t = currentType.value;
  if (t === 'boolean') return { value: draftBool.value };
  if (t === 'string') return { value: draftText.value };
  if (t === 'number') {
    // type="number" 的 v-model 会把输入转成 number，不能直接 .trim()
    const text = String(draftText.value ?? '').trim();
    const n = Number(text);
    return text === '' || !Number.isFinite(n) ? { error: '请输入有效数字' } : { value: n };
  }
  try {
    return { value: JSON.parse(draftText.value) };
  } catch (e) {
    return { error: `JSON 语法错误：${(e as Error).message}` };
  }
});
const draftValue = computed(() => parsed.value.value);
const changed = computed(() => !parsed.value.error && safeJson(draftValue.value) !== safeJson(currentValue.value));
const draftError = computed(() => parsed.value.error || (changed.value ? v.validate(selectedPath.value, draftValue.value) : null));

const select = (path: string) => {
  selectedPath.value = path;
};
const onNode = (r: Row) => {
  if (r.expandable) toggle(r.path);
  select(r.path);
};

const applyDraft = async () => {
  try {
    await v.apply(selectedPath.value, draftValue.value);
    toast.success(`已更新 ${selectedPath.value}`);
  } catch (e) {
    toast.error(`保存失败：${(e as Error).message}`);
  }
};

const copy = async () => {
  try {
    await navigator.clipboard.writeText(`${selectedPath.value}: ${pretty(currentValue.value)}`);
    toast.success('已复制');
  } catch {
    toast.error('复制失败');
  }
};

const addCustom = async () => {
  const key = await askText({ title: '新增自定义变量', label: '变量名', placeholder: '例如：已拜访的洞府', confirmText: '下一步' });
  if (!key) return;
  const val = await askText({ title: `「${key}」的值`, label: '值（可写 JSON）', defaultValue: '', confirmText: '保存', validate: () => null });
  if (val === null) return;
  let value: unknown = val;
  try {
    value = JSON.parse(val);
  } catch {
    /* 当作文本 */
  }
  try {
    v.addCustom(key, value);
    select(`${CUSTOM_ROOT}.${key.trim()}`);
  } catch (e) {
    toast.error((e as Error).message);
  }
};
const removeCustom = async () => {
  const key = selectedPath.value.slice(CUSTOM_ROOT.length + 1);
  const ok = await confirmDialog({ title: '删除自定义变量', message: `删除「${key}」？`, confirmText: '删除', danger: true });
  if (!ok) return;
  v.removeCustom(key);
  selectedPath.value = '';
};

// ─── 页头 ───
const drawer = ref<'' | 'stats' | 'guide'>('');
const guideText = getSaveDataStructureForEnv(isTavernEnv());
const copyGuide = async () => {
  try {
    await navigator.clipboard.writeText(guideText);
    toast.success('已复制数据格式说明');
  } catch {
    toast.error('复制失败');
  }
};
const exportJson = () => {
  try {
    const full = gs.toSaveData();
    if (!full) {
      toast.error('存档读不出来，无法导出');
      return;
    }
    downloadText(`仙途-游戏变量-${localDateStamp()}.json`, JSON.stringify({ ...full, 自定义: v.custom.value }, null, 2));
    toast.success('已导出');
  } catch (e) {
    toast.error(`导出失败：${(e as Error).message}`);
  }
};
const refresh = () => {
  resetDraft();
  toast.success('已重新读取');
};
const undo = async () => {
  try {
    const p = await v.undo();
    if (p) toast.success(`已撤销 ${p}`);
  } catch (e) {
    toast.error(`撤销失败：${(e as Error).message}`);
  }
};

usePageActions(() => [
  { key: 'undo', title: '撤销上次修改', icon: Undo2, onClick: undo, hidden: !v.history.value.length, disabled: v.saving.value },
  { key: 'refresh', title: '刷新', icon: RefreshCw, onClick: refresh },
  { key: 'guide', title: '格式说明', icon: BookOpen, onClick: () => (drawer.value = 'guide') },
  { key: 'stats', title: '数据统计', icon: BarChart3, onClick: () => (drawer.value = 'stats') },
  { key: 'export', title: '导出JSON', icon: Download, onClick: exportJson },
]);
</script>

<style scoped>
.vars-page {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 0.9rem;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  padding-top: 1rem;
}

.mode-desc {
  font-size: 13px;
  color: var(--cc-text-3);
}

.cols {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 280px;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.tree,
.editor,
.info {
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--cc-border);
  border-radius: 8px;
  background: var(--gm-block);
}

.tree {
  padding: 0.4rem;
}

.tree-hint {
  margin: 0.3rem 0.5rem;
  font-size: 12px;
  color: var(--cc-text-3);
}

.node {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  min-height: 30px;
  padding: 0.2rem 0.5rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--cc-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.node:hover {
  background: var(--gm-block-hover);
}

.node.active {
  background: rgba(var(--cc-gold-rgb), 0.14);
  box-shadow: inset 2px 0 0 var(--cc-gold);
}

.node.root .node-key {
  font-weight: 600;
  letter-spacing: 0.15em;
  color: var(--cc-gold);
}

.node.more {
  font-size: 12px;
  color: var(--cc-text-3);
  cursor: default;
}

.caret {
  flex-shrink: 0;
  color: var(--cc-text-3);
  transition: transform 0.15s ease;
}

.caret.open {
  transform: rotate(90deg);
}

.caret-space {
  flex-shrink: 0;
  width: 13px;
}

.node-key,
.node-path {
  flex-shrink: 0;
  max-width: 60%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.node-path {
  flex: 1;
  max-width: none;
}

.node-preview,
.node-type {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--cc-text-3);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.node-type {
  flex: 0 0 auto;
}

.lock {
  flex-shrink: 0;
  color: var(--cc-text-3);
}

.custom-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0.8rem 0.3rem 0.2rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--gm-line);
  font-size: 12px;
  letter-spacing: 0.2em;
  color: var(--cc-gold);
}

/* ---------- 编辑区 ---------- */
.editor {
  display: flex;
  flex-direction: column;
  padding: 1rem 1.1rem;
}

.ed-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ed-path {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 15px;
  color: var(--cc-gold);
}

.ed-desc {
  margin: 0.3rem 0 0.9rem;
  font-size: 13px;
  color: var(--cc-text-2);
}

.ed-lock {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.6rem 0.8rem;
  border: 1px dashed var(--cc-border-strong);
  border-radius: 6px;
  font-size: 14px;
  color: var(--cc-text-2);
}

.bool {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 14px;
}

.ed-num {
  width: 220px;
}

.ed-area {
  width: 100%;
  font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
}

.ed-error {
  margin: 0.4rem 0 0;
  font-size: 13px;
  color: var(--cc-danger);
}

.diff {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: start;
  gap: 0.6rem;
  margin-top: 0.9rem;
}

.diff-arrow {
  margin-top: 1.6rem;
  color: var(--cc-gold);
}

.diff-col span {
  font-size: 12px;
  letter-spacing: 0.2em;
  color: var(--cc-text-2);
}

.diff-col pre,
.raw pre,
.guide {
  max-height: 260px;
  margin: 0.3rem 0 0;
  padding: 0.6rem 0.7rem;
  overflow: auto;
  border-radius: 6px;
  background: var(--cc-inset);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-col.before pre {
  box-shadow: inset 2px 0 0 var(--cc-danger);
}

.diff-col.after pre {
  box-shadow: inset 2px 0 0 var(--cc-success);
}

.ed-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
}

.ed-actions .spacer {
  flex: 1;
}

.raw {
  margin-top: 1rem;
  font-size: 13px;
  color: var(--cc-text-2);
}

.raw summary {
  cursor: pointer;
}

/* ---------- 信息栏 ---------- */
.info {
  padding: 0.9rem 1rem;
}

.info .gm-label {
  margin: 0 0 0.5rem;
}

.rules {
  margin: 0 0 1.2rem;
  padding-left: 1.1rem;
  font-size: 13px;
  line-height: 1.75;
  color: var(--cc-text-2);
}

.hist {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hist li {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  font-size: 12px;
}

.hist code {
  overflow-wrap: anywhere;
  color: var(--cc-gold);
}

.hist small {
  color: var(--cc-text-3);
}

.stat-table {
  width: 100%;
  margin: 0.8rem 0;
  border-collapse: collapse;
  font-size: 14px;
}

.stat-table th,
.stat-table td {
  padding: 0.5rem;
  border-bottom: 1px solid var(--gm-line);
  text-align: left;
  font-variant-numeric: tabular-nums;
}

.stat-table thead th {
  font-size: 12px;
  font-weight: 400;
  color: var(--cc-text-3);
}

.guide {
  max-height: none;
}

@media (max-width: 1200px) {
  .cols {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .info {
    display: none;
  }
}

@media (max-width: 768px) {
  .vars-page {
    flex: 1 0 auto;
    height: auto;
    overflow: visible;
  }

  .cols {
    display: flex;
    flex-direction: column;
    flex: none;
    height: auto;
    min-height: min-content;
    overflow: visible;
  }

  .tree {
    flex: none;
    height: auto;
    max-height: 46vh;
    min-height: 220px;
    overflow-y: auto;
  }

  .editor {
    flex: none;
    min-height: 16rem;
    overflow: visible;
  }
}
</style>
