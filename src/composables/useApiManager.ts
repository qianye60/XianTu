/**
 * API 管理：生成方式设置（流式 / 分步 / 重试 / 成人内容）、连接测试、模型列表、增改删与同步默认 API。
 */
import { ref, watch } from 'vue';
import { useAPIManagementStore, type APIConfig, type APIUsageType } from '@/stores/apiManagementStore';
import { aiService, API_PROVIDER_PRESETS, type APIProvider } from '@/services/aiService';
import { useUIStore } from '@/stores/uiStore';
import { getNsfwSettingsFromStorage, type NsfwGenderFilter } from '@/utils/nsfw';
import { isTavernEnv } from '@/utils/tavern';
import { AUX_FUNCTIONS, FUNCTION_NAMES, JSON_CAPABLE, isEmbeddingProvider, isImageProvider } from '@/data/apiProviders';
import { narrativeRagService } from '@/services/narrativeRagService';
import { testEmbeddingConnection } from '@/services/embeddingService';
import { listImageModels, testImageConnection } from '@/services/imageGenerationService';
import { toast } from '@/utils/toast';

const readGameSettings = (): Record<string, unknown> => {
  try {
    const p = JSON.parse(localStorage.getItem('dad_game_settings') || '{}');
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
  } catch {
    return {};
  }
};
const saveGameSettings = (patch: Record<string, unknown>) =>
  localStorage.setItem('dad_game_settings', JSON.stringify({ ...readGameSettings(), ...patch }));

export const providerName = (p: APIProvider | undefined) => (p ? API_PROVIDER_PRESETS[p]?.name || p : '');
export const providerPreset = (p: APIProvider) => API_PROVIDER_PRESETS[p];

export function useApiManager() {
  const store = useAPIManagementStore();
  const ui = useUIStore();

  const inTavern = ref(isTavernEnv());
  const streaming = ref(true);
  const split = ref(false);
  const retry = ref(1);
  const nsfw = ref(true);
  const nsfwGender = ref<NsfwGenderFilter>('female');

  const load = async () => {
    store.loadFromStorage();
    await store.syncBuiltinApi();
    inTavern.value = isTavernEnv();
    streaming.value = aiService.getConfig().streaming !== false;
    const gs = readGameSettings();
    split.value = gs.splitResponseGeneration === true;
    retry.value = typeof gs.retryCount === 'number' && gs.retryCount >= 0 && gs.retryCount <= 5 ? gs.retryCount : 1;
    const n = getNsfwSettingsFromStorage();
    nsfw.value = n.nsfwMode;
    nsfwGender.value = n.nsfwGenderFilter;
  };

  watch(streaming, (v) => {
    aiService.saveConfig({ streaming: v });
    ui.useStreaming = v;
  });
  const saveSplit = () => saveGameSettings({ splitResponseGeneration: split.value });
  const saveRetry = (n: number) => {
    if (!Number.isInteger(n) || n < 0 || n > 5) {
      toast.error('重试次数必须在 0–5 之间');
      return;
    }
    retry.value = n;
    saveGameSettings({ retryCount: n });
    aiService.saveConfig({ ...aiService.getConfig(), maxRetries: n });
  };
  const saveNsfw = () => saveGameSettings({ enableNsfwMode: nsfw.value, nsfwGenderFilter: nsfwGender.value });

  /** 酒馆模式下默认 API 显示为「酒馆 API」 */
  const displayName = (api: APIConfig) => (inTavern.value && api.id === 'default' ? '酒馆 API' : api.name);

  /** 可开关的功能关掉时不算「已分配」。叙事检索还要求指定独立 Embedding API，默认聊天模型不算。 */
  const isActive = (type: APIUsageType) => {
    if (type === 'instruction_generation') return split.value;
    if (type === 'text_optimization') return store.isFunctionEnabled('text_optimization');
    if (type === 'embedding') return store.isFunctionEnabled('embedding') && assignmentApiId(type) !== 'default';
    return true;
  };
  const assignmentApiId = (type: APIUsageType) => store.apiAssignments.find((a) => a.type === type)?.apiId ?? 'default';
  const assignedTo = (apiId: string) => store.apiAssignments.filter((a) => a.apiId === apiId && isActive(a.type)).map((a) => a.type);
  const assignmentOf = (type: APIUsageType) => assignmentApiId(type);

  /** 叙事检索默认关闭。开关同时写入功能启用状态和记忆档案里的检索配置。 */
  const setEmbeddingEnabled = (on: boolean) => {
    store.setFunctionEnabled('embedding', on);
    narrativeRagService.saveConfig({ enabled: on });
    toast.success(on ? '叙事检索已开启，请指定 Embedding 模型' : '叙事检索已关闭');
  };

  const assign = (type: APIUsageType, apiId: string) => {
    const target = store.apiConfigs.find((a) => a.id === apiId);
    if (type === 'embedding' && target?.builtin) {
      toast.error('公益 API 只提供对话，不能用作向量模型');
      return;
    }
    store.assignAPI(type, apiId);
    if (type === 'embedding' && apiId === 'default') {
      toast.success('已取消向量模型，叙事检索不会调用');
      return;
    }
    // 指令生成指定独立 API 时需要分步模式
    if (type === 'instruction_generation' && apiId !== 'default' && !split.value) {
      split.value = true;
      saveSplit();
      toast.success('已自动开启分步生成（指令生成需要分步模式）');
    }
    toast.success(`${FUNCTION_NAMES[type]} 已分配到 ${displayName(store.apiConfigs.find((a) => a.id === apiId) || ({ name: 'API' } as APIConfig))}`);
  };

  /** 把对话切到这个 API。沿用主流程的功能会跟着走；叙事检索仍用单独的向量模型。 */
  const useForChat = (api: APIConfig) => {
    if (isEmbeddingProvider(api.provider)) {
      toast.error('向量模型不能用作主流程');
      return;
    }
    if (isImageProvider(api.provider)) {
      toast.error('生图渠道不能用作主流程');
      return;
    }
    if (!api.enabled) store.toggleAPI(api.id);
    if (inTavern.value) {
      for (const type of AUX_FUNCTIONS) store.assignAPI(type, api.id);
      toast.success(`辅助功能已切换到 ${displayName(api)}。主流程仍走酒馆。`);
      return;
    }
    store.assignAPI('main', api.id);
    const loginHint = api.builtin && !localStorage.getItem('access_token') ? '调用前需要先登录云端账号。' : '';
    toast.success(`主流程已切换到 ${displayName(api)}。沿用主流程的功能会一起走它。${loginHint}`);
  };

  /** 默认 API 同步到 aiService（主流程读它） */
  const syncDefault = () => {
    const d = store.apiConfigs.find((a) => a.id === 'default');
    if (!d) return;
    aiService.saveConfig({
      mode: 'custom',
      customAPI: { provider: d.provider, url: d.url, apiKey: d.apiKey, model: d.model, temperature: d.temperature, maxTokens: d.maxTokens, forceJsonOutput: d.forceJsonOutput },
    });
  };

  // ─── 测试 ───
  const testing = ref('');
  const testResults = ref<Record<string, 'success' | 'fail'>>({});
  const test = async (api: APIConfig) => {
    if (testing.value) return;
    testing.value = api.id;
    const prompt = api.forceJsonOutput
      ? '你正在进行API连通性测试。请按照以下JSON格式输出测试结果：\n\n示例JSON格式：\n{"status": "ok", "message": "仙途本-连通测试-OK"}\n\n请严格按照上述JSON格式输出。'
      : '你正在进行API连通性测试。请仅输出：仙途本-连通测试-OK';
    try {
      // 向量渠道没有对话接口。聊天体（messages / temperature）打到 /v1/embeddings 会被拒成 400 code 20015。
      if (isEmbeddingProvider(api.provider)) {
        const dim = await testEmbeddingConnection({
          provider: api.provider,
          url: api.url,
          apiKey: api.apiKey,
          model: api.model,
        });
        testResults.value = { ...testResults.value, [api.id]: 'success' };
        toast.success(`${api.name} 连接成功（向量维度 ${dim}）`);
        return;
      }
      if (isImageProvider(api.provider)) {
        const models = await testImageConnection(api);
        testResults.value = { ...testResults.value, [api.id]: 'success' };
        toast.success(`${api.name} 连接成功（${models.length} 个生图模型，未触发生图）`);
        return;
      }
      const res = await aiService.testAPIDirectly(
        { provider: api.provider, url: api.url, apiKey: api.apiKey, model: api.model, temperature: api.temperature, maxTokens: 1000, forceJsonOutput: api.forceJsonOutput, builtin: api.builtin, builtinServerId: api.builtinServerId },
        prompt,
      );
      const text = String(res || '').toLowerCase();
      let ok = text.includes('仙途本') || text.includes('ok');
      if (api.forceJsonOutput) {
        try {
          const j = JSON.parse(res);
          ok = j.status === 'ok' || String(j.message || '').includes('仙途本') || ok;
        } catch {
          /* 退回文本匹配 */
        }
      }
      testResults.value = { ...testResults.value, [api.id]: ok ? 'success' : 'fail' };
      if (ok) toast.success(`${api.name} 连接成功`);
      else toast.warning(`${api.name} 响应异常`);
    } catch (e) {
      testResults.value = { ...testResults.value, [api.id]: 'fail' };
      toast.error(`${api.name} 连接失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      testing.value = '';
    }
  };

  /** 用编辑中的地址和密钥临时切换配置去拉模型列表，完成后恢复 */
  const fetchModels = async (draft: Partial<APIConfig>): Promise<string[]> => {
    if (!draft.url || !draft.apiKey) throw new Error('请先填写 API 地址和密钥');
    if (isImageProvider(draft.provider as APIProvider)) {
      return listImageModels({ provider: draft.provider as APIProvider, url: draft.url, apiKey: draft.apiKey });
    }
    const saved = aiService.getConfig();
    try {
      aiService.saveConfig({
        mode: 'custom',
        customAPI: {
          provider: draft.provider as APIProvider,
          url: draft.url,
          apiKey: draft.apiKey,
          model: draft.model || 'gpt-6-astra',
          temperature: draft.temperature || 0.7,
          maxTokens: draft.maxTokens || 16000,
        },
      });
      return await aiService.fetchModels();
    } finally {
      aiService.saveConfig(saved);
    }
  };

  const save = (id: string | null, draft: Partial<APIConfig>) => {
    if (id === 'builtin' || id?.startsWith('builtin:') || draft.builtin) throw new Error('公益 API 由服务器配置，不能在这里修改');
    if (!draft.name?.trim()) throw new Error('请填写配置名称');
    const p = (draft.provider || 'openai') as APIProvider;
    const forceJson = JSON_CAPABLE.includes(p) && !!draft.forceJsonOutput;
    if (id) store.updateAPI(id, { ...draft, forceJsonOutput: forceJson });
    else {
      store.addAPI({
        name: draft.name.trim(),
        provider: p,
        url: draft.url || API_PROVIDER_PRESETS[p]?.url || 'https://api.openai.com',
        apiKey: draft.apiKey || '',
        model: draft.model || API_PROVIDER_PRESETS[p]?.defaultModel || 'gpt-6-astra',
        temperature: draft.temperature ?? 0.7,
        maxTokens: draft.maxTokens || API_PROVIDER_PRESETS[p]?.defaultMaxTokens || 16000,
        enabled: true,
        forceJsonOutput: forceJson,
        imageWidth: draft.imageWidth,
        imageHeight: draft.imageHeight,
        imageSteps: draft.imageSteps,
        imageScale: draft.imageScale,
        negativePrompt: draft.negativePrompt,
      });
    }
    syncDefault();
  };

  const remove = (id: string) => {
    if (id === 'default') throw new Error('不能删除默认 API 配置');
    if (id === 'builtin' || id.startsWith('builtin:')) throw new Error('不能删除公益 API');
    store.deleteAPI(id);
  };

  return {
    store, inTavern, streaming, split, retry, nsfw, nsfwGender, load, saveSplit, saveRetry, saveNsfw,
    displayName, isActive, assignedTo, assignmentOf, assign, useForChat, setEmbeddingEnabled, syncDefault, testing, testResults, test, fetchModels, save, remove,
  };
}
