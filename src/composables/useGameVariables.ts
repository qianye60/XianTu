/**
 * 游戏变量：完整 V3 存档（元数据 / 角色 / 社交 / 世界 / 系统）的只读视图 + 按路径安全修改。
 * 规则来自 utils/gameVariableEditor（validateVariableEdit / describeVariablePath）。
 */
import { computed, ref, watch } from 'vue';
import { get as lodashGet, set as lodashSet } from 'lodash';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore';
import { isSaveDataV3, migrateSaveDataToLatest } from '@/utils/saveMigration';
import { validateVariableEdit, type VariableEditMode } from '@/utils/gameVariableEditor';

export interface VariableChange {
  path: string;
  before: unknown;
  after: unknown;
  time: string;
}

export const DOMAINS = ['元数据', '角色', '社交', '世界', '系统'] as const;
export const CUSTOM_ROOT = '自定义';

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

export function useGameVariables() {
  const gs = useGameStateStore();
  const cs = useCharacterStore();

  const mode = ref<VariableEditMode>('normal');
  const history = ref<VariableChange[]>([]);
  const saving = ref(false);

  const activeKey = computed(() => {
    const a = cs.rootState.当前激活存档;
    return a ? `${a.角色ID}::${a.存档槽位}` : '';
  });
  watch(activeKey, () => {
    history.value = [];
  });

  const currentV3 = () => {
    const raw = gs.toSaveData() as any;
    if (!raw) return null;
    return isSaveDataV3(raw) ? raw : migrateSaveDataToLatest(raw).migrated;
  };

  /** 只展示 V3 五域；元数据补上槽位信息（只读）。读失败时给出原因，避免整页渲染中断。 */
  const saveView = computed<Record<string, any>>(() => {
    if (!gs.isGameLoaded) return {};
    let v3: any;
    try {
      const raw = gs.toSaveData({ omitNarrative: true }) as any;
      if (!raw) return { __error: '存档数据不完整，暂时读不出来' };
      v3 = isSaveDataV3(raw) ? raw : migrateSaveDataToLatest(raw).migrated;
    } catch (e) {
      console.error('[游戏变量] 读取存档失败', e);
      return { __error: (e as Error).message || '存档读不出来' };
    }
    const slot = cs.activeSaveSlot;
    const profile = cs.activeCharacterProfile;
    const view: Record<string, any> = {
      元数据: {
        ...(v3.元数据 && typeof v3.元数据 === 'object' ? v3.元数据 : {}),
        存档ID: slot?.id ?? slot?.存档名 ?? undefined,
        角色ID: cs.rootState.当前激活存档?.角色ID,
        模式: profile?.模式,
        创建时间: slot?.保存时间 ?? undefined,
        更新时间: slot?.最后保存时间 ?? slot?.保存时间 ?? undefined,
      },
      角色: v3.角色,
      社交: v3.社交,
      世界: v3.世界,
      系统: v3.系统,
    };
    return view;
  });

  // ─── 自定义变量（按存档存在 localStorage） ───
  const custom = ref<Record<string, unknown>>({});
  const customKey = computed(() => (activeKey.value ? `xiantu.custom-variables.${activeKey.value}` : ''));
  const loadCustom = () => {
    custom.value = {};
    if (!customKey.value) return;
    try {
      const parsed = JSON.parse(localStorage.getItem(customKey.value) || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) custom.value = parsed;
    } catch {
      custom.value = {};
    }
  };
  watch(customKey, loadCustom, { immediate: true });
  const persistCustom = () => {
    if (customKey.value) localStorage.setItem(customKey.value, JSON.stringify(custom.value));
  };

  const record = (path: string, before: unknown, after: unknown) => {
    history.value = [{ path, before: clone(before), after: clone(after), time: new Date().toLocaleTimeString('zh-CN') }, ...history.value].slice(0, 30);
  };

  /** 不可编辑的原因；可编辑返回 null（用当前值自检：结构 / 保护 / 模式） */
  const lockReason = (path: string): string | null => {
    if (path.startsWith(`${CUSTOM_ROOT}.`)) return null;
    const v3 = currentV3();
    if (!v3) return '存档未加载';
    return validateVariableEdit(v3, path, lodashGet(v3, path), mode.value);
  };

  const validate = (path: string, value: unknown): string | null => {
    if (path.startsWith(`${CUSTOM_ROOT}.`)) return null;
    const v3 = currentV3();
    if (!v3) return '存档未加载';
    return validateVariableEdit(v3, path, value, mode.value);
  };

  /** 按路径写入：打补丁 → loadFromSaveData → 存档；存档失败回滚 */
  const apply = async (path: string, value: unknown) => {
    if (path.startsWith(`${CUSTOM_ROOT}.`)) {
      const key = path.slice(CUSTOM_ROOT.length + 1);
      const before = custom.value[key];
      custom.value = { ...custom.value, [key]: value };
      persistCustom();
      record(path, before, value);
      return;
    }
    const v3 = currentV3();
    if (!v3) throw new Error('未获取到存档数据');
    const err = validateVariableEdit(v3, path, value, mode.value);
    if (err) throw new Error(err);
    const before = lodashGet(v3, path);
    const next = clone(v3);
    lodashSet(next, path, value);
    saving.value = true;
    try {
      gs.loadFromSaveData(next as any);
      try {
        await gs.saveGame();
      } catch (e) {
        gs.loadFromSaveData(v3 as any);
        throw e;
      }
      record(path, before, value);
    } finally {
      saving.value = false;
    }
  };

  const addCustom = (key: string, value: unknown) => {
    const k = key.trim();
    if (!k || k.length > 80 || /[.[\]{}]/.test(k)) throw new Error('变量名不能为空，且不能包含 . [ ] { }');
    if (k in custom.value) throw new Error('已有同名变量');
    custom.value = { ...custom.value, [k]: value };
    persistCustom();
    record(`${CUSTOM_ROOT}.${k}`, undefined, value);
  };

  const removeCustom = (key: string) => {
    const before = custom.value[key];
    const next = { ...custom.value };
    delete next[key];
    custom.value = next;
    persistCustom();
    record(`${CUSTOM_ROOT}.${key}`, before, undefined);
  };

  const undo = async () => {
    const last = history.value[0];
    if (!last || saving.value) return null;
    if (last.path.startsWith(`${CUSTOM_ROOT}.`)) {
      const key = last.path.slice(CUSTOM_ROOT.length + 1);
      const next = { ...custom.value };
      if (last.before === undefined) delete next[key];
      else next[key] = last.before;
      custom.value = next;
      persistCustom();
      history.value = history.value.slice(1);
      return last.path;
    }
    const cur = gs.toSaveData();
    if (!cur) return null;
    saving.value = true;
    try {
      const next = clone(cur) as any;
      lodashSet(next, last.path, last.before);
      gs.loadFromSaveData(next);
      await gs.saveGame();
      history.value = history.value.slice(1);
      return last.path;
    } catch (e) {
      gs.loadFromSaveData(cur as any);
      throw e;
    } finally {
      saving.value = false;
    }
  };

  /** 每个域的字段数与体积，供「数据统计」 */
  const stats = computed(() =>
    DOMAINS.map((d) => {
      const v = saveView.value[d];
      let count = 0;
      const walk = (x: unknown, depth: number) => {
        if (depth > 12 || !x || typeof x !== 'object') return;
        for (const c of Object.values(x as object)) {
          count++;
          walk(c, depth + 1);
        }
      };
      walk(v, 0);
      let size = 0;
      try {
        size = v ? new Blob([JSON.stringify(v)]).size : 0;
      } catch {
        size = 0;
      }
      return { domain: d, keys: v && typeof v === 'object' ? Object.keys(v).length : 0, fields: count, size };
    }),
  );

  return { mode, history, saving, saveView, custom, lockReason, validate, apply, addCustom, removeCustom, undo, stats };
}
