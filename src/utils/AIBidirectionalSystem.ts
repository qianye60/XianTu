/**
 * AIBidirectionalSystem
 * 核心功能：
 * 1. 接收用户输入，构建Prompt，调用AI生成响应
 * 2. 解析AI响应，执行AI返回的指令
 * 3. 更新并返回游戏状态
 */
import { set, get, unset, cloneDeep } from 'lodash';
import { getTavernHelper, isTavernEnv } from '@/utils/tavern';
import { toast } from './toast';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useCharacterStore } from '@/stores/characterStore'; // 导入角色商店
import { useUIStore } from '@/stores/uiStore';
import type { GM_Response, TavernCommand } from '@/types/AIGameMaster';
import type { CharacterProfile, StateChangeLog, SaveData, GameTime, StateChange, StatusEffect, EventSystem, GameEvent } from '@/types/game';
import { updateMasteredSkills } from './masteredSkillsCalculator';
import {  assembleSystemPrompt } from './prompts/promptAssembler';
import { getPrompt } from '@/services/defaultPrompts';
import { normalizeGameTime } from './time';
import { updateStatusEffects } from './statusEffectManager';
import { sanitizeAITextForDisplay } from '@/utils/textSanitizer';
import { validateAndRepairNpcProfile } from '@/utils/dataValidation';
import { stripNsfwContent } from '@/utils/prompts/definitions/dataDefinitions';
import { isSaveDataV3, migrateSaveDataToLatest } from './saveMigration';
import { parseJsonSmart } from '@/utils/jsonExtract';
import type { APIUsageType } from '@/stores/apiManagementStore';
import { buildJudgementRound, formatJudgementBlock } from '@/utils/judgement';
import { ensureStoryImages, harvestStoryImages, parseStoryImagesFromObject } from '@/services/imagePlaceholders';
import { appendStoryImages, resolveImageApi, runPendingStoryImages } from '@/services/storyImageRunner';
import { calculateFinalAttributes } from '@/utils/attributeCalculation';
import type { InnateAttributes } from '@/types/game';

type PlainObject = Record<string, unknown>;

/** 注入消息（酒馆 injects 结构，自定义 API 端会按 depth 排序成 messages） */
type PromptInject = { content: string; role: 'system' | 'assistant' | 'user'; depth: number; position: 'in_chat' | 'none' };

/** 以 assistant 占位消息结尾：最后一条是 assistant 时，部分模型不会审核输入（防止输入截断） */
const INPUT_GUARD_INJECT: PromptInject = { content: '</input>', role: 'assistant', depth: 0, position: 'in_chat' };

const DEFAULT_ACTION_OPTIONS = ['继续当前活动', '观察周围环境', '与附近的人交谈', '查看自身状态', '稍作休息调整'];
const DEFAULT_INITIAL_ACTION_OPTIONS = ['四处走动熟悉环境', '查看自身状态', '与附近的人交谈', '寻找修炼之地', '打听周围消息'];

const emptyGmResponse = (): GM_Response => ({ text: '', mid_term_memory: '', tavern_commands: [], action_options: [] });

/** 记忆中心「自定义中期 / 长期记忆格式」（留空返回空字符串） */
function readMemoryFormatSetting(key: 'midTermFormat' | 'longTermFormat'): string {
  try {
    const value = JSON.parse(localStorage.getItem('memory-settings') || '{}')?.[key];
    return typeof value === 'string' ? value.trim() : '';
  } catch {
    return '';
  }
}

/** 未显式指定时，从游戏设置读取「分步生成」开关（默认关闭） */
function readSplitGenerationSetting(): boolean {
  try {
    const raw = localStorage.getItem('dad_game_settings');
    return raw ? JSON.parse(raw)?.splitResponseGeneration === true : false;
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is PlainObject {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function mergePlainObjectsReplacingArrays(base: PlainObject, patch: PlainObject): PlainObject {
  const merged = cloneDeep(base) as PlainObject;
  applyPlainObjectPatchReplacingArrays(merged, patch);
  return merged;
}

function applyPlainObjectPatchReplacingArrays(target: PlainObject, patch: PlainObject): void {
  for (const [key, patchValue] of Object.entries(patch)) {
    const targetValue = (target as any)[key];
    if (isPlainObject(targetValue) && isPlainObject(patchValue)) {
      applyPlainObjectPatchReplacingArrays(targetValue, patchValue);
      continue;
    }
    // NOTE: Unlike lodash.merge, arrays are replaced (not merged by index),
    // so `{a:[1,2]} + {a:[]}` correctly becomes `{a:[]}`.
    (target as any)[key] = cloneDeep(patchValue);
  }
}

export interface ProcessOptions {
  onStreamChunk?: (chunk: string) => void;
  onStreamComplete?: () => void;
  onProgressUpdate?: (progress: string) => void;
  /** 返回 true 时不再发起后续请求（开局生成被用户取消） */
  isCancelled?: () => boolean;
  onStateChange?: (newState: PlainObject) => void;
  useStreaming?: boolean;
  generateMode?: 'generate' | 'generateRaw'; // 生成模式：generate（标准）或 generateRaw（纯净）
  splitResponseGeneration?: boolean;
  shouldAbort?: () => boolean;
}

/**
 * 记忆总结选项
 */
export interface MemorySummaryOptions {
  /**
   * 是否使用Raw模式（默认true）
   *
   * **Raw模式 vs 标准模式：**
   * - ✅ Raw模式（推荐用于总结）：
   *   - 只发送总结提示词，不包含角色卡、世界观等预设
   *   - 不受其他提示词干扰，更符合真实内容
   *   - 适用场景：记忆总结、NPC总结、纯文本提取
   *
   * - ⚠️ 标准模式（容易污染）：
   *   - 包含完整的系统提示词（角色卡、世界观、规则等）
   *   - 容易受到预设提示词污染，可能偏离原始内容
   *   - 适用场景：正常游戏对话、需要遵守世界观的生成
   */
  useRawMode?: boolean;

  /**
   * 是否使用流式传输（默认false）
   *
   * **流式 vs 非流式：**
   * - ⚡ 流式传输（更快）：
   *   - 实时显示生成过程，用户体验更好
   *   - 响应更快，无需等待完整生成
   *   - 适用场景：长文本生成、需要实时反馈的场景
   *
   * - 🛡️ 非流式传输（更稳定，推荐用于总结）：
   *   - 一次性返回完整结果，更稳定可靠
   *   - 避免流式传输可能的中断问题
   *   - 适用场景：后台任务、自动总结、批量处理
   */
  useStreaming?: boolean;
}

class AIBidirectionalSystemClass {
  private static instance: AIBidirectionalSystemClass | null = null;
  private stateHistory: StateChangeLog[] = [];
  private isSummarizing = false; // 添加一个锁，防止并发总结

  private compareGameTime(a: GameTime, b: GameTime): number {
    const fields: Array<keyof GameTime> = ['年', '月', '日', '小时', '分钟'];
    for (const f of fields) {
      const av = Number(a?.[f] ?? 0);
      const bv = Number(b?.[f] ?? 0);
      if (av > bv) return 1;
      if (av < bv) return -1;
    }
    return 0;
  }

  private addYears(time: GameTime, years: number): GameTime {
    return { ...time, 年: Number(time.年 ?? 0) + years };
  }

  private randomIntInclusive(min: number, max: number): number {
    const a = Math.ceil(min);
    const b = Math.floor(max);
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  private getFocusedNpcNames(stateForAI: any): string[] {
    const relationships = stateForAI?.社交?.关系;
    if (!relationships || typeof relationships !== 'object') return [];
    return Object.entries(relationships)
      .filter(([, npc]) => {
        if (!npc || typeof npc !== 'object') return false;
        const flag = (npc as any).实时关注;
        return flag === true || flag === 1 || flag === 'true' || flag === 'True' || flag === 'TRUE' || flag === '是';
      })
      .map(([name]) => String(name))
      .filter((name) => name.trim().length > 0);
  }

  private buildFocusedNpcPrompt(stateForAI: any): string {
    const focusedNames = this.getFocusedNpcNames(stateForAI);
    const list = focusedNames.length > 0 ? focusedNames.map(name => `- ${name}`).join('\n') : '- （无）';
    return [
      '# 🔎 实时关注NPC（必须更新）',
      '以下NPC即使不在玩家身边，本回合也要按时间推移推演其动态并写入 tavern_commands：',
      list,
      '要求：',
      '- 名单为（无）时忽略本节',
      '- 每人至少 set 社交.关系.{NPC名}.当前内心想法（{NPC名}换成真实名字）',
      '- 位置 / 外貌状态 / 属性有变化时一并更新',
      '- 名单中每个人都要覆盖'
    ].join('\n');
  }

  private normalizeEventConfig(config: any): { enabled: boolean; minYears: number; maxYears: number; customPrompt: string } {
    const enabled = config?.启用随机事件 !== false;
    const minYears = Math.max(1, Number(config?.最小间隔年 ?? 1));
    const maxYears = Math.max(minYears, Number(config?.最大间隔年 ?? 10));
    const customPrompt = String(config?.事件提示词 ?? '').trim();
    return { enabled, minYears, maxYears, customPrompt };
  }

  private scheduleNextEventTime(now: GameTime, minYears: number, maxYears: number): GameTime {
    const years = this.randomIntInclusive(minYears, maxYears);
    return this.addYears(now, years);
  }

  private async maybeTriggerScheduledWorldEvent(args: {
    v3: any;
    stateForAI: any;
    shortTermMemoryForPrompt: string[];
  }): Promise<void> {
    const { v3, stateForAI, shortTermMemoryForPrompt } = args;

    const now: GameTime | null = v3?.元数据?.时间 ?? null;
    if (!now) return;

    const eventSystem = (v3?.社交?.事件 ?? null) as EventSystem | null;
    if (!eventSystem || typeof eventSystem !== 'object') return;

    const { enabled, minYears, maxYears, customPrompt } = this.normalizeEventConfig((eventSystem as any).配置);
    if (!enabled) return;

    const next = (eventSystem as any).下次事件时间 as GameTime | null;
    if (!next) {
      const scheduled = this.scheduleNextEventTime(now, minYears, maxYears);
      (eventSystem as any).下次事件时间 = scheduled;
      if (stateForAI?.社交?.事件) stateForAI.社交.事件.下次事件时间 = scheduled;
      const gameStateStore = useGameStateStore();
      if ((gameStateStore as any).eventSystem) {
        (gameStateStore as any).eventSystem.下次事件时间 = scheduled;
      }
      return;
    }

    if (this.compareGameTime(now, next) < 0) return;

    try {
      const { generateWorldEvent, generateSpecialNpcEvent } = await import('@/utils/generators/eventGenerators');
      const gameStateStore = useGameStateStore();

      // 酒馆端专属：随机触发“特殊NPC登场”事件（不会在网页端触发）
      let npcToAdd: any | null = null;
      let generated: { event: GameEvent; prompt_addition: string; npcProfile?: unknown } | null =
        isTavernEnv() && Math.random() < 0.2
          ? await generateSpecialNpcEvent({ saveData: v3 as SaveData, now, customPrompt })
          : null;

      if (generated && (generated as any).npcProfile) {
        npcToAdd = (generated as any).npcProfile;
      } else {
        generated = await generateWorldEvent({ saveData: v3 as SaveData, now, customPrompt });
      }
      const scheduled = this.scheduleNextEventTime(now, minYears, maxYears);

      if (!generated) {
        (eventSystem as any).下次事件时间 = scheduled;
        if (stateForAI?.社交?.事件) stateForAI.社交.事件.下次事件时间 = scheduled;
        if ((gameStateStore as any).eventSystem) {
          (gameStateStore as any).eventSystem.下次事件时间 = scheduled;
        }
        return;
      }

      // 若本次事件引入了特殊NPC，则写入人物关系（同时更新 stateForAI 与 store，保证提示词/存档同步）
      if (npcToAdd && npcToAdd.名字) {
        // v3 写入（用于后续提示词 stateForAI 继续携带）
        if (!v3.社交) v3.社交 = {};
        if (!v3.社交.关系 || typeof v3.社交.关系 !== 'object') v3.社交.关系 = {};
        if (!v3.社交.关系[npcToAdd.名字]) {
          v3.社交.关系[npcToAdd.名字] = npcToAdd;
        }

        if (stateForAI?.社交) {
          if (!stateForAI.社交.关系 || typeof stateForAI.社交.关系 !== 'object') stateForAI.社交.关系 = {};
          if (!stateForAI.社交.关系[npcToAdd.名字]) {
            stateForAI.社交.关系[npcToAdd.名字] = npcToAdd;
          }
        }

        const current = (gameStateStore.relationships && typeof gameStateStore.relationships === 'object')
          ? gameStateStore.relationships
          : {};
        if (!current[npcToAdd.名字]) {
          gameStateStore.updateState('relationships', { ...current, [npcToAdd.名字]: npcToAdd });
        }
      }

      const event: GameEvent = { ...generated.event, 发生时间: now, 事件来源: generated.event.事件来源 || '随机' };

      if (!Array.isArray((eventSystem as any).事件记录)) (eventSystem as any).事件记录 = [];
      (eventSystem as any).事件记录.push(event);
      (eventSystem as any).下次事件时间 = scheduled;

      if (stateForAI?.社交?.事件) {
        if (!Array.isArray(stateForAI.社交.事件.事件记录)) stateForAI.社交.事件.事件记录 = [];
        stateForAI.社交.事件.事件记录.push(event);
        stateForAI.社交.事件.下次事件时间 = scheduled;
      }

      if ((gameStateStore as any).eventSystem) {
        const storeEventSystem = (gameStateStore as any).eventSystem as any;
        if (!Array.isArray(storeEventSystem.事件记录)) storeEventSystem.事件记录 = [];
        storeEventSystem.事件记录.push(event);
        storeEventSystem.下次事件时间 = scheduled;
      }

      // 把事件文本写入“短期记忆”，并作为本回合注入文本，保证主游戏流程可承接“刚刚发生”的事件
      const memoryEntry = `${this._formatGameTime(now)}【世界事件】${generated.prompt_addition}`;
      shortTermMemoryForPrompt.push(memoryEntry);

      // 同步落盘：将事件快照写入存档短期记忆（否则下回合不会带上这段“刚刚发生”的承接文本）
      if (!v3.社交) v3.社交 = {};
      if (!v3.社交.记忆 || typeof v3.社交.记忆 !== 'object') v3.社交.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
      if (!Array.isArray(v3.社交.记忆.短期记忆)) v3.社交.记忆.短期记忆 = [];
      v3.社交.记忆.短期记忆.push(memoryEntry);

      if (gameStateStore.memory && typeof gameStateStore.memory === 'object') {
        const nextMemory = cloneDeep(gameStateStore.memory) as any;
        if (!Array.isArray(nextMemory.短期记忆)) nextMemory.短期记忆 = [];
        nextMemory.短期记忆.push(memoryEntry);
        gameStateStore.updateState('memory', nextMemory);
      }

      // 酒馆端：若触发了“特殊NPC登场”，立刻存档一次，确保人物关系与事件快照不丢失
      if (npcToAdd && npcToAdd.名字 && isTavernEnv()) {
        try {
          const characterStore = useCharacterStore();
          await characterStore.saveCurrentGame();
        } catch (e) {
          console.warn('[世界事件] 特殊NPC触发后自动存档失败:', e);
        }
      }
    } catch (e) {
      console.warn('[世界事件] 调度/生成失败:', e);
    }
  }

  private extractNarrativeText(raw: string): string {
    // 🔥 移除思维链标签（兜底保护）
    // 支持多种变体：<thinking>, <antThinking>, <ant-thinking>, <reasoning>, <thought> 等
    const cleaned = String(raw || '')
      .replace(/<(?:ant[-_]?)?thinking>[\s\S]*?<\/(?:ant[-_]?)?thinking>/gi, '')
      .replace(/<\/?(?:ant[-_]?)?thinking>/gi, '')
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
      .replace(/<\/?reasoning>/gi, '')
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
      .replace(/<\/?thought>/gi, '')
      .trim();

    if (!cleaned) return '';

    // 如果是JSON格式，提取text字段
    if (cleaned.startsWith('{') || cleaned.includes('```')) {
      try {
        const parsed = this.parseAIResponse(cleaned);
        return parsed?.text?.trim() || '';
      } catch {
        // JSON解析失败，尝试提取代码块
        const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (codeBlockMatch?.[1]) {
          try {
            const obj = JSON.parse(codeBlockMatch[1].trim()) as Record<string, unknown>;
            return String(obj.text || obj.叙事文本 || obj.narrative || '').trim();
          } catch {
            // 代码块内容本身就是文本
            return codeBlockMatch[1].trim();
          }
        }
      }
    }

    return cleaned;
  }

  private sanitizeActionOptionsForDisplay(options: unknown): string[] {
    if (!Array.isArray(options)) return [];
    return options
      .filter((opt) => typeof opt === 'string')
      .map((opt) => sanitizeAITextForDisplay(opt).trim())
      .filter((opt) => opt.length > 0);
  }

  private readBoolFlag(value: unknown, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (value && typeof value === 'object' && 'value' in (value as any)) {
      return (value as any).value === true;
    }
    return defaultValue;
  }

  private isActionOptionsEnabled(uiStore: unknown): boolean {
    // Pinia store fields are usually unwrapped, but keep a safe fallback for non-reactive access.
    const raw = (uiStore as any)?.enableActionOptions;
    return this.readBoolFlag(raw, true);
  }

  private getCommandProtectionMode(uiStore: unknown): 'strict' | 'skeleton' {
    const raw = (uiStore as any)?.commandProtectionMode;
    const value = typeof raw === 'string' ? raw : (raw && typeof raw === 'object' && 'value' in (raw as any) ? (raw as any).value : undefined);
    return value === 'skeleton' ? 'skeleton' : 'strict';
  }

  /**
   * 文本优化：调用AI对生成的文本进行润色
   * @param text 原始文本
   * @param onProgressUpdate 进度回调
   * @returns 优化后的文本，失败时返回原文本
   */
  private async optimizeText(
    text: string,
    onProgressUpdate?: (progress: string) => void
  ): Promise<string> {
    // 检查功能是否启用
    const { useAPIManagementStore } = await import('@/stores/apiManagementStore');
    const apiStore = useAPIManagementStore();

    if (!apiStore.isFunctionEnabled('text_optimization')) {
      return text;
    }

    // 检查是否有可用的API配置
    const apiConfig = apiStore.getAPIForType('text_optimization');
    if (!apiConfig) {
      console.warn('[文本优化] 未配置text_optimization API，跳过优化');
      return text;
    }

    onProgressUpdate?.('正在优化文本…');

    try {
      const { aiService } = await import('@/services/aiService');
      const [textOptPrompt, styleNarrativePrompt] = await Promise.all([
        getPrompt('textOptimization'),
        getPrompt('styleNarrative'),
      ]);
      const styleNarrative = styleNarrativePrompt.trim();
      const polishSystem = styleNarrative ? `${textOptPrompt}\n\n---\n\n${styleNarrative}` : textOptPrompt;

      const optimizedText = await aiService.generateRaw({
        ordered_prompts: [
          { role: 'system', content: polishSystem },
          { role: 'user', content: `请优化以下文本：\n\n${text}` }
        ],
        should_stream: false,
        generation_id: `text_optimization_${Date.now()}`,
        usageType: 'text_optimization',
      });

      const result = String(optimizedText).trim();
      if (result && result.length > 0) {
        console.log('[文本优化] 优化完成，原长度:', text.length, '新长度:', result.length);
        return result;
      }

      console.warn('[文本优化] 优化结果为空，使用原文本');
      return text;
    } catch (error) {
      console.error('[文本优化] 优化失败:', error);
      return text;
    }
  }

  private constructor() {}

  public static getInstance(): AIBidirectionalSystemClass {
    if (!this.instance) this.instance = new AIBidirectionalSystemClass();
    return this.instance;
  }

  /**
   * 处理玩家行动 - 简化版流程
   * 1. 调用AI生成响应
   * 2. 执行指令
   * 3. 返回结果
   */
  public async processPlayerAction(
    userMessage: string,
    character: CharacterProfile,
    options?: ProcessOptions & { generation_id?: string }
  ): Promise<GM_Response | null> {
    const gameStateStore = useGameStateStore();
    const uiStore = useUIStore();
    const actionOptionsEnabled = this.isActionOptionsEnabled(uiStore);
    const shouldAbort = () => options?.shouldAbort?.() ?? false;

    // 生成唯一的generation_id，如果未提供
    const generationId = options?.generation_id || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 1. 获取当前存档数据
    options?.onProgressUpdate?.('获取存档数据…');
    const saveData = gameStateStore.toSaveData();

    // 对话前记一档快照，回退只撤这一回合
    if (saveData) {
      const characterStore = useCharacterStore();
      const active = characterStore.rootState.当前激活存档;
      if (active) {
        const { createSnapshot } = await import('@/utils/snapshotManager');
        createSnapshot(active.角色ID, active.存档槽位, saveData);
      }
    }

    if (!saveData) throw new Error('无法获取存档数据，请确保角色已加载');

    // 2. 准备AI上下文
    options?.onProgressUpdate?.('构建提示词并请求AI生成…');
    let gmResponse: GM_Response = emptyGmResponse();
    const storyImages: Array<{ prompt: string; size: string }> = [];
    let response = '';
    try {
      const v3 = isSaveDataV3(saveData) ? (saveData as any) : migrateSaveDataToLatest(saveData).migrated;

      // 发送给 AI 的状态：严格使用 V3 五域结构（命令 key 也必须按此结构输出）
      const stateForAI = cloneDeep(v3);
      if (stateForAI.社交?.记忆) {
        // 移除短期和隐式中期记忆，以优化AI上下文（短期记忆单独发送）
        delete stateForAI.社交.记忆.短期记忆;
        delete stateForAI.社交.记忆.隐式中期记忆;
      }
      // 移除叙事历史，避免与短期记忆重复/爆token
      if (stateForAI.系统?.历史?.叙事) {
        delete stateForAI.系统.历史.叙事;
      }

      // 记忆增强 / 叙事检索：按本次输入检索历史 GM 叙事片段，增强长程剧情连续性
      let narrativeRagSection = '';
      try {
        const { narrativeRagService } = await import('@/services/narrativeRagService');
        const active = useCharacterStore().rootState.当前激活存档;
        if (active?.角色ID && active?.存档槽位) {
          await narrativeRagService.init(`${active.角色ID}_${active.存档槽位}`);
        }
        if (narrativeRagService.isEnabled()) {
          const recentShort = (v3?.社交?.记忆?.短期记忆 || []).slice(-2).join('\n');
          const ragQuery = [userMessage || '', recentShort, stateForAI.角色?.位置?.描述 || ''].filter(Boolean).join('\n');
          narrativeRagSection = await narrativeRagService.buildSectionForPrompt(ragQuery || '继续当前剧情', v3);
          if (narrativeRagSection) {
            const stats = await narrativeRagService.getStats();
            console.log(`[记忆增强/叙事检索] 已注入相关叙事片段（索引总数：${stats.total}）`);
          }
        }
      } catch (e) {
        console.warn('[记忆增强/叙事检索] 检索失败，跳过叙事增强:', e);
      }

      // 保存短期记忆用于单独发送
      const shortTermMemory = v3?.社交?.记忆?.短期记忆 || [];

      // --- 角色核心状态速览 ---
      const attributes = stateForAI.角色?.属性;
      const character = stateForAI.角色?.身份;
      const formatTalentsForPrompt = (talents: any): string => {
        if (!talents) return '无';
        if (typeof talents === 'string') return talents;
        if (Array.isArray(talents)) {
          return talents.map(t => {
            if (typeof t === 'string') return t;
            if (typeof t === 'object' && t !== null) {
              return t.name || t.名称 || '';
            }
            return '';
          }).filter(Boolean).join(', ') || '无';
        }
        return '未知格式';
      };

      let coreStatusSummary = '# 角色核心状态速览\n';
      if (attributes) {
        coreStatusSummary += `\n- 生命: 气血${attributes.气血?.当前}/${attributes.气血?.上限} 灵气${attributes.灵气?.当前}/${attributes.灵气?.上限} 神识${attributes.神识?.当前}/${attributes.神识?.上限} 寿元${attributes.寿命?.当前}/${attributes.寿命?.上限}`;

        if (attributes.境界) {
          const realm = attributes.境界;
          coreStatusSummary += `\n- 境界: ${realm.名称}-${realm.阶段} (${realm.当前进度}/${realm.下一级所需})`;
        }

        if (attributes.声望) {
          coreStatusSummary += `\n- 声望: ${attributes.声望}`;
        }

        const effects = (stateForAI.角色?.效果 ?? []) as StatusEffect[];
        if (Array.isArray(effects) && effects.length > 0) {
          coreStatusSummary += `\n- 效果: ${effects
            .filter((e: StatusEffect) => e && typeof e === 'object' && e.状态名称)
            .map((e: StatusEffect) => e.状态名称)
            .join(', ')}`;
        }
      }
      if (character?.天赋) {
        coreStatusSummary += `\n- 天赋: ${formatTalentsForPrompt(character.天赋)}`;
      }

      // 判定用最终后天六司（含装备/天赋/功法动态加成），不能只用存档基值，否则穿装备等于白穿
      let judgementAcquired: unknown = character?.后天六司;
      try {
        const innateForJudgement = (character?.先天六司 || {
          根骨: 5, 灵性: 5, 悟性: 5, 气运: 5, 魅力: 5, 心性: 5,
        }) as InnateAttributes;
        judgementAcquired = calculateFinalAttributes(innateForJudgement, stateForAI as SaveData).后天六司;
      } catch (error) {
        console.warn('[判定] 动态后天六司计算失败，回退存档基值', error);
      }

      const judgementRound = buildJudgementRound({
        先天六司: character?.先天六司,
        后天六司: judgementAcquired,
        属性: attributes,
        效果: stateForAI.角色?.效果,
        灵气浓度: stateForAI.角色?.位置?.灵气浓度,
      });
      coreStatusSummary += `\n\n${formatJudgementBlock(judgementRound)}`;
      // --- 结束 ---

      // 🔥 构建精简版存档数据（用于叙事判定，减少token消耗）
      // 无论单步还是分步模式，都使用精简版存档
      const buildNarrativeState = (): Record<string, unknown> => {
        return {
          元数据: { 时间: stateForAI.元数据?.时间 },
          角色: {
            身份: stateForAI.角色?.身份,
            属性: stateForAI.角色?.属性,
            位置: stateForAI.角色?.位置,
            效果: stateForAI.角色?.效果,
            身体: stateForAI.角色?.身体,
            背包: stateForAI.角色?.背包,
            装备: stateForAI.角色?.装备,
            功法: stateForAI.角色?.功法,
            修炼: stateForAI.角色?.修炼,
            大道: stateForAI.角色?.大道,
            技能: stateForAI.角色?.技能,
          },
          社交: {
            关系: stateForAI.社交?.关系,
            宗门: stateForAI.社交?.宗门,
            任务: stateForAI.社交?.任务,
            事件: stateForAI.社交?.事件,
            记忆: {
              中期记忆: stateForAI.社交?.记忆?.中期记忆,
              长期记忆: stateForAI.社交?.记忆?.长期记忆,
            },
          },
          世界: stateForAI.世界,
        };
      };

      const stateJsonString = JSON.stringify(buildNarrativeState());

      const activePrompts: string[] = [];
      if (actionOptionsEnabled) {
        activePrompts.push('actionOptions');
      }

      // 🔥 世界事件规则始终注入（用于“世界会变化”的叙事一致性）
      activePrompts.push('eventSystem');

      // 🔥 固定随机事件：若已到触发时间，则先生成"刚刚发生"的事件并注入短期记忆
      const shortTermMemoryForPrompt = Array.isArray(shortTermMemory) ? [...shortTermMemory] : [];
      await this.maybeTriggerScheduledWorldEvent({ v3, stateForAI, shortTermMemoryForPrompt });

      const assembledPrompt = await assembleSystemPrompt(activePrompts, uiStore.actionOptionsPrompt, stateForAI);

      const midTermFormat = readMemoryFormatSetting('midTermFormat');
      const focusedNpcPrompt = this.buildFocusedNpcPrompt(stateForAI)
        + (midTermFormat ? `

# 中期记忆格式要求（用户自定义，用于 mid_term_memory 字段）
${midTermFormat}` : '');

      const systemPrompt = `
${assembledPrompt}
${coreStatusSummary}
${narrativeRagSection ? `\n${narrativeRagSection}\n` : ''}
# 游戏状态
你是这个修仙世界的GM。以下是当前完整游戏存档(JSON)，所有叙事与判定以此为准:
${stateJsonString}
`.trim();

      const userActionForAI = (userMessage && userMessage.toString().trim()) || '继续当前活动';

      const recentEventsInject = this.buildRecentEventsInject(shortTermMemoryForPrompt);
      const judgementInject: PromptInject = {
        content: formatJudgementBlock(judgementRound),
        role: 'system',
        depth: 1,
        position: 'in_chat',
      };
      const injects: PromptInject[] = [
        { content: systemPrompt, role: 'system', depth: 4, position: 'in_chat' },
        { content: focusedNpcPrompt, role: 'system', depth: 3, position: 'in_chat' },
        ...(recentEventsInject ? [recentEventsInject] : []),
        judgementInject,
        INPUT_GUARD_INJECT,
      ];

      const settings = await this.resolveGenerationSettings(options);
      const { aiService, useStreaming } = settings;

      if (settings.splitEnabled) {
        const buildSplitSystemPrompt = async (step: 1 | 2): Promise<string> => {
          // 注意：getTavernHelper() 在网页版也不为空，环境必须用 isTavernEnv() 判断
          const tavernEnv = isTavernEnv();

          if (step === 1) {
            // 第1步：只输出正文纯文本，不需要JSON格式和指令相关的提示词
            const [stepRulesRaw, worldStandardsPrompt, textFormatsPrompt, styleNarrativePrompt, playerPersonalityPrompt] = await Promise.all([
              getPrompt('splitGenerationStep1'),
              getPrompt('worldStandards'),
              getPrompt('textFormatRules'),
              getPrompt('styleNarrative'),
              getPrompt('playerPersonality'),
            ]);
            const stepRules = stepRulesRaw.trim();
            const { IMAGE_PROMPT_RULES } = await import('@/services/imagePlaceholders');
            const { resolveImageApi } = await import('@/services/storyImageRunner');
            const imageRules = resolveImageApi() ? `\n\n${IMAGE_PROMPT_RULES}` : '';
            const styleBlock = [styleNarrativePrompt, playerPersonalityPrompt].map((s) => s.trim()).filter(Boolean).join('\n\n');
            // 🔥 添加精简版存档数据，用于叙事判定（知道玩家装备、状态、NPC关系等）
            const narrativeStateJson = stateJsonString;
            // 只给叙事相关的提示词，不给coreOutputRules/dataDefinitions等指令格式提示词
            return `
${stepRules}${imageRules}
${styleBlock ? `\n\n---\n\n${styleBlock}` : ''}

---

# 判定系统（战斗/修炼/探索等场景必须使用）
${textFormatsPrompt}

---

# 世界观设定
${worldStandardsPrompt}

---

${coreStatusSummary}
${narrativeRagSection ? `\n${narrativeRagSection}\n` : ''}
# 当前游戏状态（用于叙事判定，无需输出指令）
${narrativeStateJson}
`.trim();
          }

          // 第2步：COT + 指令生成（合并），需要结构与业务规则
          // 注意：不要注入 coreOutputRules（它会要求输出 text，和第2步“禁止text”冲突）
          const [businessRulesPrompt, extendedRulesPrompt, dataDefinitionsPrompt, textFormatsPrompt, worldStandardsPrompt] = await Promise.all([
            getPrompt('businessRules'),
            getPrompt('extendedBusinessRules'),
            getPrompt('dataDefinitions'),
            getPrompt('textFormatRules'),
            getPrompt('worldStandards')
          ]);

          const sanitizedDataDefinitionsPrompt = tavernEnv ? dataDefinitionsPrompt : stripNsfwContent(dataDefinitionsPrompt);

          // 第2步：指令生成（CoT 自检清单已合并到 splitGenerationStep2 提示词中）
          const stepRules = (await getPrompt('splitGenerationStep2')).trim();
          const sections: string[] = [stepRules];

          const sanitizedBusinessRulesPrompt = tavernEnv ? businessRulesPrompt : stripNsfwContent(businessRulesPrompt);
          const sanitizedExtendedRulesPrompt = tavernEnv ? extendedRulesPrompt : stripNsfwContent(extendedRulesPrompt);
          sections.push(sanitizedBusinessRulesPrompt, sanitizedExtendedRulesPrompt, sanitizedDataDefinitionsPrompt, textFormatsPrompt, worldStandardsPrompt);

          if (actionOptionsEnabled) {
            const actionOptionsPrompt = await getPrompt('actionOptions');
            const customPromptSection = uiStore.actionOptionsPrompt
              ? `**用户自定义要求**：${uiStore.actionOptionsPrompt}\n\n请严格按以上要求生成行动选项。`
              : '（无特殊要求，按默认规则生成）';
            sections.push(actionOptionsPrompt.replace('{{CUSTOM_ACTION_PROMPT}}', customPromptSection));
          }

          sections.push(await getPrompt('eventSystemRules'));

          const assembled = sections.map((section) => section.trim()).filter(Boolean).join('\n\n---\n\n');
          return `
${assembled}

${coreStatusSummary}
${focusedNpcPrompt ? `\n${focusedNpcPrompt}\n` : ''}

# 游戏状态（JSON）
${stateJsonString}
`.trim();
        };

        // ========== 第1步：正文生成（失败重试1次） ==========
        options?.onProgressUpdate?.('分步生成：第1步（正文）…');
        const injectsStep1: PromptInject[] = [
          { content: await buildSplitSystemPrompt(1), role: 'system', depth: 4, position: 'in_chat' },
          // 只在第1步注入最近事件，避免重复
          ...(recentEventsInject ? [recentEventsInject] : []),
          judgementInject,
          INPUT_GUARD_INJECT,
        ];
        let step1Text = '';
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            if (attempt > 1) options?.onProgressUpdate?.('分步生成：第1步重试…');
            const step1Raw = await aiService.generate({
              user_input: userActionForAI,
              should_stream: useStreaming,
              generation_id: `${generationId}_step1_${attempt}`,
              usageType: 'main',
              injects: injectsStep1,
              onStreamChunk: options?.onStreamChunk,
            });
            const step1RawText = String(step1Raw);
            step1Text = this.extractNarrativeText(step1RawText);
            const peeledStep1 = harvestStoryImages({ text: step1Text, raw: step1RawText });
            step1Text = peeledStep1.text;
            if (step1Text.trim().length > 0 || peeledStep1.images.length) {
              if (peeledStep1.images.length) storyImages.push(...peeledStep1.images);
              if (!step1Text.trim()) step1Text = '画面在这一刻定格。';
              break;
            }
            step1Text = '';
          } catch (e) {
            console.warn(`[分步生成] 第1步第${attempt}次失败:`, e);
          }
        }

        // ========== 第2步：指令生成（COT 已合并到提示词中） ==========
        options?.onProgressUpdate?.('分步生成：第2步（指令生成）…');
        const injectsStep2: PromptInject[] = [
          { content: await buildSplitSystemPrompt(2), role: 'system', depth: 4, position: 'in_chat' },
          INPUT_GUARD_INJECT,
        ];
        const step2UserInput = `
【用户本次操作】
${userActionForAI}

【第1步正文】
${step1Text}

请按"分步生成（第2步）"规则输出 JSON。
`.trim();

        const parsedStep2 = await this.generateSplitStep2({
          request: (attempt) => aiService.generate({
            user_input: step2UserInput,
            should_stream: settings.step2Streaming,
            generation_id: `${generationId}_step2_${attempt}`,
            usageType: settings.step2UsageType,
            injects: injectsStep2,
          }),
          forceJson: settings.step2ForceJson,
          actionOptionsEnabled,
          defaultActionOptions: DEFAULT_ACTION_OPTIONS,
          onProgressUpdate: options?.onProgressUpdate,
          logTag: '分步生成',
        });

        gmResponse = {
          text: step1Text,
          mid_term_memory: parsedStep2.mid_term_memory || '',
          tavern_commands: parsedStep2.tavern_commands || [],
          action_options: actionOptionsEnabled ? this.sanitizeActionOptionsForDisplay(parsedStep2.action_options || []) : []
        };
      } else {
        // 一次性生成：正文 + 指令 + 行动选项在同一个 JSON 响应里
        response = String(await aiService.generate({
          user_input: userActionForAI,
          should_stream: useStreaming,
          generation_id: generationId,
          usageType: 'main',
          injects,
          onStreamChunk: options?.onStreamChunk,
        }));
        gmResponse = this.parseAIResponseLenient(response, settings.mainForceJson, actionOptionsEnabled, DEFAULT_ACTION_OPTIONS);
      }

      const peeledReply = harvestStoryImages({
        text: gmResponse.text || '',
        raw: String(response || ''),
        obj: gmResponse,
      });
      gmResponse.text = peeledReply.text;
      if (peeledReply.images.length) storyImages.push(...peeledReply.images);
      if (resolveImageApi()) {
        const location = String((stateForAI as any)?.角色?.位置?.描述 || '');
        storyImages.splice(0, storyImages.length, ...ensureStoryImages(storyImages, gmResponse.text, location));
      }
      if (storyImages.length) gmResponse.storyImages = storyImages;
      if (!gmResponse.text.trim() && storyImages.length) {
        gmResponse.text = '画面在这一刻定格。';
      }

      // 🔥 文本优化：如果启用，对生成的文本进行润色
      if (shouldAbort()) {
        console.log('[AI System] Abort detected, skip text optimization and command execution');
        return gmResponse;
      }
      if (gmResponse && gmResponse.text) {
        gmResponse.text = await this.optimizeText(gmResponse.text, options?.onProgressUpdate);
      }

      if (shouldAbort()) {
        console.log('[AI System] Abort detected, skip command execution');
        return gmResponse;
      }
      if (!gmResponse || ((!gmResponse.text || gmResponse.text.trim() === '') && !gmResponse.storyImages?.length)) {
        console.error('[AI双向系统] AI响应为空，原始响应:', String(response).substring(0, 200));
        throw new Error('AI响应为空或格式错误');
      }

      // 流式传输完成后调用回调
      if (useStreaming && options?.onStreamComplete) {
        options.onStreamComplete();
      }
    } catch (error) {
      console.error('[AI双向系统] AI生成失败:', error);
      gmResponse = {
        text: '（AI生成失败）',
        mid_term_memory: '',
        tavern_commands: [],
        action_options: actionOptionsEnabled ? ['重试当前操作', '查看自身状态', '稍作休息'] : []
      };
    }

    // 3. 执行AI指令
    options?.onProgressUpdate?.('执行AI指令…');
    if (shouldAbort()) {
      console.log('[AI System] Abort detected, skip command execution');
      return gmResponse;
    }
    try {
      // 🔥 使用 v3 而不是原始 saveData，因为 maybeTriggerScheduledWorldEvent 可能已修改了 v3（如下次事件时间）
      const dataForProcessing = isSaveDataV3(saveData) ? saveData : migrateSaveDataToLatest(saveData).migrated;
      const { saveData: updatedSaveData } = await this.processGmResponse(
        gmResponse,
        dataForProcessing as SaveData,
        false,
        options?.shouldAbort
      );
      if (options?.onStateChange) {
        options.onStateChange(updatedSaveData as unknown as PlainObject);
      }

      return gmResponse;
    } catch (error) {
      console.error('[AI双向系统] 指令执行失败:', error);
      return gmResponse;
    }
  }

  public async generateInitialMessage(
    systemPrompt: string,
    userPrompt: string,
    options?: ProcessOptions
  ): Promise<GM_Response> {
    const uiStore = useUIStore();
    const actionOptionsEnabled = this.isActionOptionsEnabled(uiStore);

    options?.onProgressUpdate?.('构建提示词并请求AI生成…');
    try {
      const settings = await this.resolveGenerationSettings(options);
      const { aiService, useStreaming } = settings;
      const generateMode = options?.generateMode || 'generate';

      // 开局请求：generate 模式把系统提示词以 user 角色注入；generateRaw 模式直接给 system + user
      const request = (args: {
        system: string;
        user: string;
        generationId: string;
        stream: boolean;
        usageType: APIUsageType;
        onStreamChunk?: (chunk: string) => void;
      }): Promise<string> => generateMode === 'generateRaw'
        ? aiService.generateRaw({
            ordered_prompts: [
              { role: 'system', content: args.system },
              { role: 'user', content: args.user }
            ],
            should_stream: args.stream,
            generation_id: args.generationId,
            usageType: args.usageType,
            onStreamChunk: args.onStreamChunk,
          })
        : aiService.generate({
            user_input: args.user,
            should_stream: args.stream,
            generation_id: args.generationId,
            usageType: args.usageType,
            injects: [{ content: args.system, role: 'user', depth: 4, position: 'in_chat' }],
            onStreamChunk: args.onStreamChunk,
          });

      let gmResponse: GM_Response;
      let openingRawResponse = '';

      if (settings.splitEnabled) {
        const buildInitialSplitSystemPrompt = async (step: 1 | 2): Promise<string> => {
          if (step === 1) {
            // 第1步：只输出正文，不需要JSON格式和指令相关的提示词
            const stepRules = (await getPrompt('splitInitStep1')).trim();
            const worldStandardsPrompt = await getPrompt('worldStandards');
            const { IMAGE_PROMPT_RULES } = await import('@/services/imagePlaceholders');
            const { resolveImageApi } = await import('@/services/storyImageRunner');
            const imageRules = resolveImageApi() ? `\n\n${IMAGE_PROMPT_RULES}` : '';
            return `
${stepRules}${imageRules}

---

# 世界观设定
${worldStandardsPrompt}

---

# 角色设定
${userPrompt}
            `.trim();
          }

          // 第2步：指令生成（CoT 自检清单已合并到 splitInitStep2 提示词中）
          // 注意：getTavernHelper() 在网页版也不为空，环境必须用 isTavernEnv() 判断
          const tavernEnv = isTavernEnv();
          const stepRules = (await getPrompt('splitInitStep2')).trim();
          const [businessRulesPrompt, extendedRulesPrompt, dataDefinitionsPrompt, textFormatsPrompt, worldStandardsPrompt] = await Promise.all([
            getPrompt('businessRules'),
            getPrompt('extendedBusinessRules'),
            getPrompt('dataDefinitions'),
            getPrompt('textFormatRules'),
            getPrompt('worldStandards')
          ]);
          const sanitizedDataDefinitionsPrompt = tavernEnv ? dataDefinitionsPrompt : stripNsfwContent(dataDefinitionsPrompt);
          const sanitizedBusinessRulesPrompt = tavernEnv ? businessRulesPrompt : stripNsfwContent(businessRulesPrompt);

          const sections: string[] = [stepRules];

          // 🔥 酒馆端：注入身体数据生成要求
          if (tavernEnv) {
            sections.push(`## ⚠️ 酒馆端必须生成身体数据
□ 身体：set \`角色.身体\` {身高:num(cm),体重:num(kg),体脂率:num(%),三围:{胸围,腰围,臀围},肤色,发色,瞳色,纹身与印记:[],穿刺:[],敏感点:[],开发度:{},其它:{},仪容:{品题,评分,概述,眉眼,发型,面部,感官,气质:{清纯,妖媚,性感,端庄,冷艳,灵动},衣着:[],穿搭,身材体态}}
- 必须根据角色性别/年龄/种族填写合理的具体数值
- 男性身高165-185cm，女性155-170cm，儿童按年龄
- 仪容只写可见容貌、体态、衣着和气质，不写性行为；新NPC同时写入 社交.关系.{名}.仪容
- 严禁使用占位文本或照抄示例`);
          }

          const sanitizedExtendedRulesPrompt = tavernEnv ? extendedRulesPrompt : stripNsfwContent(extendedRulesPrompt);
          sections.push(sanitizedBusinessRulesPrompt, sanitizedExtendedRulesPrompt, sanitizedDataDefinitionsPrompt, textFormatsPrompt, worldStandardsPrompt);
          return sections.map(s => s.trim()).filter(Boolean).join('\n\n---\n\n').trim();
        };

        // ========== 第1步：开局正文 ==========
        options?.onProgressUpdate?.('分步生成：第1步（开局正文）…');
        const step1Raw = await request({
          system: await buildInitialSplitSystemPrompt(1),
          user: userPrompt,
          generationId: `initial_message_split_step1_${Date.now()}`,
          stream: useStreaming,
          usageType: 'main',
          onStreamChunk: options?.onStreamChunk,
        });
        openingRawResponse = String(step1Raw);
        const peeledOpeningStep = harvestStoryImages({
          text: this.extractNarrativeText(openingRawResponse),
          raw: openingRawResponse,
        });
        const step1Text = peeledOpeningStep.text || (peeledOpeningStep.images.length ? '画面在这一刻定格。' : '');
        if (useStreaming) options?.onStreamComplete?.();

        // ========== 第2步：COT + 指令生成（合并） ==========
        options?.onProgressUpdate?.('分步生成：第2步（思维链+指令生成）…');
        const step2UserPrompt = `
【开局用户提示】
${userPrompt}

【第1步正文】
${step1Text}

请按"分步生成（开局-第2步）"规则输出 JSON。
        `.trim();
        const step2System = await buildInitialSplitSystemPrompt(2);

        options?.onProgressUpdate?.('分步生成：第2步（指令生成）…');
        const parsedStep2 = await this.generateSplitStep2({
          request: () => request({
            system: step2System,
            user: step2UserPrompt,
            generationId: `initial_message_split_step2_${Date.now()}`,
            stream: settings.step2Streaming,
            usageType: settings.step2UsageType,
            // 开局第2步流式时也回传（开局遮罩据此实时展示剧情指令）
            onStreamChunk: settings.step2Streaming ? options?.onStreamChunk : undefined,
          }),
          forceJson: settings.step2ForceJson,
          actionOptionsEnabled,
          defaultActionOptions: DEFAULT_INITIAL_ACTION_OPTIONS,
          onProgressUpdate: options?.onProgressUpdate,
          isCancelled: options?.isCancelled,
          logTag: '分步生成-开局',
        });

        gmResponse = {
          text: step1Text,
          mid_term_memory: parsedStep2.mid_term_memory || '',
          tavern_commands: parsedStep2.tavern_commands || [],
          storyImages: peeledOpeningStep.images,
          action_options: actionOptionsEnabled
            ? this.sanitizeActionOptionsForDisplay(parsedStep2.action_options?.length ? parsedStep2.action_options : DEFAULT_INITIAL_ACTION_OPTIONS)
            : []
        };
      } else {
        // ========== 一次性生成 ==========
        openingRawResponse = String(await request({
          system: systemPrompt,
          user: userPrompt,
          generationId: `initial_message${generateMode === 'generateRaw' ? '_raw' : ''}_${Date.now()}`,
          stream: useStreaming,
          usageType: 'main',
          onStreamChunk: options?.onStreamChunk,
        }));
        if (!openingRawResponse.trim()) {
          throw new Error('AI返回了空响应。可能原因：1) 模型使用了reasoning_content字段而非content字段（如Gemini 3 Pro）；2) API配置错误；3) 网络问题。建议：关闭流式传输，或更换模型。');
        }
        if (useStreaming) options?.onStreamComplete?.();
        gmResponse = this.parseAIResponseLenient(openingRawResponse, settings.mainForceJson, actionOptionsEnabled, DEFAULT_INITIAL_ACTION_OPTIONS);
      }

      const peeledOpening = harvestStoryImages({
        text: gmResponse.text || '',
        raw: openingRawResponse,
        obj: gmResponse,
      });
      gmResponse.text = peeledOpening.text;
      let openingImages = [...(gmResponse.storyImages || []), ...peeledOpening.images];
      if (resolveImageApi()) {
        openingImages = ensureStoryImages(openingImages, gmResponse.text);
      }
      if (openingImages.length) {
        gmResponse.storyImages = openingImages.slice(0, 1);
      }

      if (!gmResponse.text && !gmResponse.storyImages?.length) {
        throw new Error('AI响应解析失败或为空');
      }
      gmResponse.text = await this.optimizeText(gmResponse.text, options?.onProgressUpdate);
      return gmResponse;
    } catch (error) {
      console.error('[AI双向系统] 初始消息生成失败:', error);
      throw new Error(`初始消息生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private _getMinutes(gameTime: GameTime): number {
    return gameTime.分钟 ?? 0;
  }
  private _formatGameTime(gameTime: GameTime | undefined): string {
    if (!gameTime) return '【仙历元年】';
    const minutes = this._getMinutes(gameTime);
    return `【仙道${gameTime.年}年${gameTime.月}月${gameTime.日}日 ${String(gameTime.小时).padStart(2, '0')}:${String(minutes).padStart(2, '0')}】`;
  }
  public async processGmResponse(
    response: GM_Response,
    currentSaveData: SaveData,
    isInitialization = false,
    shouldAbort?: () => boolean,
    options?: {
      /**
       * 是否写入系统.历史.叙事（用于主面板正文/主对话展示）
       * - 默认 true
       * - 宗门/后台面板类功能应设为 false，避免污染主对话
       */
      appendNarrativeHistory?: boolean;
      /**
       * 是否将 response.text 写入社交.记忆.短期记忆（用于AI上下文）
       * - 默认 true
       */
      appendShortTermMemoryFromText?: boolean;
      /**
       * 是否将 response.mid_term_memory 写入社交.记忆.隐式中期记忆
       * - 默认 true
       */
      appendImplicitMidMemoryFromMidTerm?: boolean;
      /**
       * 若 response.mid_term_memory 为空，是否为“短期记忆”补一个对应的“隐式中期记忆”
       * - 默认 true（用截断后的 text 兜底）
       */
      ensureImplicitMidForEachShortTerm?: boolean;
      /**
       * ensureImplicitMidForEachShortTerm 为 true 时，隐式中期的兜底内容最大长度
       * - 默认 80
       */
      implicitMidFallbackMaxLen?: number;
    }
  ): Promise<{ saveData: SaveData; stateChanges: StateChangeLog }> {
    const abortRequested = () => shouldAbort?.() ?? false;
    if (abortRequested()) {
      console.log('[AI System] Abort detected, skip command processing');
      return { saveData: currentSaveData, stateChanges: { changes: [], timestamp: new Date().toISOString() } };
    }
    // 🔥 先修复数据格式，确保所有字段正确
    const { repairSaveData } = await import('./dataRepair');
    const repairedData = repairSaveData(currentSaveData);
    let saveData = cloneDeep(repairedData);
    const changes: StateChange[] = [];

    const behavior = {
      appendNarrativeHistory: options?.appendNarrativeHistory !== false,
      appendShortTermMemoryFromText: options?.appendShortTermMemoryFromText !== false,
      appendImplicitMidMemoryFromMidTerm: options?.appendImplicitMidMemoryFromMidTerm !== false,
      ensureImplicitMidForEachShortTerm: options?.ensureImplicitMidForEachShortTerm !== false,
      implicitMidFallbackMaxLen:
        typeof options?.implicitMidFallbackMaxLen === 'number' && Number.isFinite(options.implicitMidFallbackMaxLen)
          ? Math.max(20, Math.min(200, Math.floor(options.implicitMidFallbackMaxLen)))
          : 80,
    };

    // 仅当需要写入叙事历史时才确保系统.历史.叙事存在
    if (behavior.appendNarrativeHistory) {
      if (!(saveData as any).系统) (saveData as any).系统 = {};
      if (!(saveData as any).系统.历史) (saveData as any).系统.历史 = { 叙事: [] };
      if (!Array.isArray((saveData as any).系统.历史.叙事)) (saveData as any).系统.历史.叙事 = [];
    }

    const timePrefix = this._formatGameTime((saveData as any).元数据?.时间);
    const peeledNarrative = harvestStoryImages({
      text: sanitizeAITextForDisplay(response.text || '').trim(),
    });
    let textContent = peeledNarrative.text;
    const storyImages = (response.storyImages && response.storyImages.length) ? response.storyImages : peeledNarrative.images;
    const midTermContent = sanitizeAITextForDisplay(response.mid_term_memory || '').trim();

    if (!textContent && storyImages.length && behavior.appendNarrativeHistory) {
      textContent = '画面在这一刻定格。';
    }

    // 处理 text：可选写入叙事历史；可选写入短期记忆
    if (textContent) {
      if (behavior.appendNarrativeHistory) {
        const newNarrative = {
          type: 'gm' as const,
          role: 'assistant' as const,
          content: `${timePrefix}${textContent}`,
          time: timePrefix,
          actionOptions: this.sanitizeActionOptionsForDisplay(response.action_options || [])
        };
        (saveData as any).系统.历史.叙事.push(newNarrative);
        changes.push({
          key: `系统.历史.叙事[${(saveData as any).系统.历史.叙事.length - 1}]`,
          action: 'push',
          oldValue: undefined,
          newValue: cloneDeep(newNarrative)
        });
        if (storyImages.length) {
          appendStoryImages(saveData as any, storyImages, (saveData as any).系统.历史.叙事.length - 1);
        }
      }

      if (behavior.appendShortTermMemoryFromText) {
        if (!(saveData as any).社交) (saveData as any).社交 = {};
        if (!(saveData as any).社交.记忆) (saveData as any).社交.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
        if (!Array.isArray((saveData as any).社交.记忆.短期记忆)) (saveData as any).社交.记忆.短期记忆 = [];
        (saveData as any).社交.记忆.短期记忆.push(`${timePrefix}${textContent}`);
      }
    }

    // 处理 mid_term_memory：写入隐式中期记忆（用于“短期->中期”过渡/总结）
    if (behavior.appendImplicitMidMemoryFromMidTerm && midTermContent) {
      if (!(saveData as any).社交) (saveData as any).社交 = {};
      if (!(saveData as any).社交.记忆) (saveData as any).社交.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
      if (!Array.isArray((saveData as any).社交.记忆.隐式中期记忆)) (saveData as any).社交.记忆.隐式中期记忆 = [];
      (saveData as any).社交.记忆.隐式中期记忆.push(`${timePrefix}${midTermContent}`);
    }

    // 兜底：若这次写入了短期记忆，但 mid_term_memory 为空，则补齐一条对应的隐式中期记忆，保持“短期-隐式中期”一一对应。
    if (
      behavior.appendShortTermMemoryFromText &&
      textContent &&
      behavior.ensureImplicitMidForEachShortTerm &&
      (!midTermContent || !behavior.appendImplicitMidMemoryFromMidTerm)
    ) {
      if (!(saveData as any).社交) (saveData as any).社交 = {};
      if (!(saveData as any).社交.记忆) (saveData as any).社交.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
      if (!Array.isArray((saveData as any).社交.记忆.隐式中期记忆)) (saveData as any).社交.记忆.隐式中期记忆 = [];
      const fallback = textContent.length > behavior.implicitMidFallbackMaxLen ? `${textContent.slice(0, behavior.implicitMidFallbackMaxLen)}…` : textContent;
      (saveData as any).社交.记忆.隐式中期记忆.push(`${timePrefix}${fallback}`);
    }

    // 🔥 检查短期记忆是否超限，超限则删除最旧的短期记忆，并将对应的隐式中期记忆转化为正式中期记忆
    // 从 localStorage 读取短期记忆上限配置
    let SHORT_TERM_LIMIT = 5; // 默认值
    try {
      const memorySettings = localStorage.getItem('memory-settings');
      if (memorySettings) {
        const settings = JSON.parse(memorySettings);
        const limit = typeof settings.shortTermLimit === 'number' && settings.shortTermLimit > 0
          ? settings.shortTermLimit
          : (typeof settings.maxShortTerm === 'number' && settings.maxShortTerm > 0 ? settings.maxShortTerm : null);
        if (limit) SHORT_TERM_LIMIT = limit;
      }
    } catch (error) {
      console.warn('[AI双向系统] 读取记忆配置失败，使用默认值:', error);
    }

    while ((saveData as any).社交?.记忆?.短期记忆 && (saveData as any).社交.记忆.短期记忆.length > SHORT_TERM_LIMIT) {
      // 删除最旧的短期记忆（第一个）
      (saveData as any).社交.记忆.短期记忆.shift();
      console.log(`[AI双向系统] 短期记忆超过上限（${SHORT_TERM_LIMIT}条），已删除最旧的短期记忆。当前短期记忆数量: ${(saveData as any).社交.记忆.短期记忆.length}`);

      // 将对应的隐式中期记忆转化为正式中期记忆
      if ((saveData as any).社交.记忆.隐式中期记忆 && (saveData as any).社交.记忆.隐式中期记忆.length > 0) {
        const implicitMidTerm = (saveData as any).社交.记忆.隐式中期记忆.shift();
        if (implicitMidTerm) {
          if (!Array.isArray((saveData as any).社交.记忆.中期记忆)) (saveData as any).社交.记忆.中期记忆 = [];
          (saveData as any).社交.记忆.中期记忆.push(implicitMidTerm);
          console.log(`[AI双向系统] 已将隐式中期记忆转化为正式中期记忆。当前中期记忆数量: ${(saveData as any).社交.记忆.中期记忆.length}`);
        }
      }
    }

    // 🔥 叙事历史存储在IndexedDB中，不限制条数
    // 叙事历史只用于UI显示和导出小说，不需要发送给AI（已在第122行移除）

    // 检查是否达到自动总结阈值，如果达到则“异步”触发，不阻塞当前游戏循环
    try {
      const memorySettings = JSON.parse(localStorage.getItem('memory-settings') || '{}');
      const midTermTrigger = memorySettings.midTermTrigger ?? 25; // 默认25
      if ((saveData as any).社交?.记忆?.中期记忆 && (saveData as any).社交.记忆.中期记忆.length >= midTermTrigger) {
        this.triggerMemorySummary().catch(error => {
          console.error('[AI双向系统] 自动记忆总结在后台失败:', error);
        });
      }
    } catch (error) {
      console.warn('[AI双向系统] 检查自动总结阈值时出错:', error);
    }


    if (!response.tavern_commands?.length) {
      return { saveData, stateChanges: { changes, timestamp: new Date().toISOString() } };
    }

    const uiStore = useUIStore();
    const protectionMode = this.getCommandProtectionMode(uiStore);

    // 🔥 新增：预处理指令以修复常见的AI错误
    const preprocessedCommands = this._preprocessCommands(response.tavern_commands);

    // 🔥 步骤1：指令格式校验（路径/字段/只读保护） + 指令值校验（结构完整性）
    // 重要：两者都通过的指令才允许执行，避免“只校验但仍执行”的漏网风险
    const validCommands: TavernCommand[] = [];
    const rejectedCommands: Array<{ command: any; errors: string[] }> = [];
    const validationWarnings: string[] = [];

    if (protectionMode === 'skeleton') {
      const allowedRoots = ['元数据', '角色', '社交', '世界', '系统'] as const;
      const isV3Path = (p: string) => allowedRoots.some((root) => p === root || p.startsWith(`${root}.`));
      const forbiddenPrefixes = ['社交.记忆', '系统.历史.叙事'];
      const validActions = new Set(['set', 'add', 'push', 'delete', 'pull']);

      preprocessedCommands.forEach((cmd, index) => {
        if (!cmd || typeof cmd !== 'object') {
          rejectedCommands.push({ command: cmd, errors: [`指令${index}: 不是对象`] });
          return;
        }
        const action = String((cmd as any).action || '').trim();
        const key = String((cmd as any).key || '').trim();
        if (!validActions.has(action)) {
          rejectedCommands.push({ command: cmd, errors: [`指令${index}: action 无效（${action}）`] });
          return;
        }
        if (!key) {
          rejectedCommands.push({ command: cmd, errors: [`指令${index}: key 为空`] });
          return;
        }
        if (!isV3Path(key)) {
          rejectedCommands.push({ command: cmd, errors: [`指令${index}: key 必须以 元数据/角色/社交/世界/系统 开头（当前: ${key}）`] });
          return;
        }
        if (forbiddenPrefixes.some((p) => key === p || key.startsWith(`${p}.`))) {
          rejectedCommands.push({ command: cmd, errors: [`指令${index}: 禁止AI直接操作系统自动字段（${key}）`] });
          return;
        }
        if (action === 'delete' && allowedRoots.includes(key as any)) {
          rejectedCommands.push({ command: cmd, errors: [`指令${index}: 禁止删除存档骨干根节点（${key}）`] });
          return;
        }
        validCommands.push({ action, key, value: (cmd as any).value } as TavernCommand);
      });
    } else {
      const { validateCommand, cleanCommands } = await import('./commandValidator');
      const { validateAndRepairCommandValue } = await import('./commandValueValidator');

      preprocessedCommands.forEach((cmd, index) => {
        const formatResult = validateCommand(cmd, index);
        validationWarnings.push(...formatResult.warnings);
        if (!formatResult.valid) {
          rejectedCommands.push({ command: cmd, errors: formatResult.errors });
          return;
        }

        // 仅在“看起来像指令对象”时做 value 校验；否则按格式错误处理
        try {
          const valueResult = validateAndRepairCommandValue(cmd as TavernCommand);
          if (!valueResult.valid) {
            rejectedCommands.push({
              command: cmd,
              errors: valueResult.errors.map((e) => `指令${index}: ${e}`),
            });
            return;
          }
        } catch (e) {
          rejectedCommands.push({
            command: cmd,
            errors: [`指令${index}: value 校验异常: ${e instanceof Error ? e.message : String(e)}`],
          });
          return;
        }

        validCommands.push(cmd as TavernCommand);
      });

      if (validationWarnings.length > 0) {
        validationWarnings.forEach((warn) => console.warn(`[AI双向系统] ${warn}`));
      }

      // 🔥 步骤2：清理指令，移除多余字段（只处理通过验证的指令）
      const cleanedCommands = cleanCommands(validCommands);
      validCommands.length = 0;
      cleanedCommands.forEach((c) => validCommands.push(c));
    }

    // 记录被拒绝的指令（格式/只读保护/value 完整性）
    if (rejectedCommands.length > 0) {
      console.error(`[AI双向系统] 共拒绝 ${rejectedCommands.length} 条无效指令（已拦截，不会执行）`);
      rejectedCommands.forEach(({ command, errors }) => {
        changes.unshift({
          key: '❌ 无效指令（已拒绝）',
          action: 'validation_error',
          oldValue: undefined,
          newValue: {
            command: JSON.stringify(command, null, 2),
            errors,
          },
        });
      });
    }

    // 🔥 步骤4：对指令排序，确保 set 上限的操作先于 set/add 当前值的操作
    // 这样突破时先改上限再改当前值，避免当前值被错误限制
    const sortedCommands = [...validCommands].sort((a, b) => {
      const isASetMax = a.action === 'set' && a.key.endsWith('.上限');
      const isBSetMax = b.action === 'set' && b.key.endsWith('.上限');
      if (isASetMax && !isBSetMax) return -1;
      if (!isASetMax && isBSetMax) return 1;
      return 0;
    });

    console.log(`[AI双向系统] 执行 ${sortedCommands.length} 条有效指令，拒绝 ${rejectedCommands.length} 条无效指令`);

    const saveDataSnapshotBeforeCommands = cloneDeep(saveData);
    const commandAppliedChanges: StateChange[] = [];
    const commandErrorChanges: StateChange[] = [];
    let hadExecutionError = false;

    for (const command of sortedCommands) {
      if (abortRequested()) {
        console.log('[AI System] Abort detected, stop command execution loop');
        break;
      }
      try {
        const oldValue = get(saveData, command.key);
        this.executeCommand(command, saveData, protectionMode);
        const newValue = get(saveData, command.key);
        commandAppliedChanges.push({
          key: command.key,
          action: command.action,
          oldValue: this._summarizeValueForChangeLog(command.key, oldValue, command.action),
          newValue: this._summarizeValueForChangeLog(command.key, newValue, command.action)
        });
      } catch (error) {
        console.error(`[AI双向系统] 指令执行失败:`, command, error);
        hadExecutionError = true;
        commandErrorChanges.unshift({
          key: '? 执行失败',
          action: 'execution_error',
          oldValue: undefined,
          newValue: {
            command: JSON.stringify(command, null, 2),
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }

    // 🔥 步骤5：执行后安全校验（仅在结构完全损坏时回滚，防止存档被破坏）
    const applyMode = (() => {
      try {
        const raw = localStorage.getItem('command-apply-mode');
        if (raw === 'atomic' || raw === 'atomic_on_invalid_state' || raw === 'best_effort') return raw;
      } catch { /* noop */ }
      return 'best_effort' as const;
    })();

    const { validateSaveDataV3 } = await import('@/utils/saveValidationV3');
    const postValidation = validateSaveDataV3(saveData as any);

    // best_effort 模式：只有致命错误（结构完全损坏）才回滚
    // atomic 模式：任何错误或执行失败都回滚
    const shouldRollback =
      postValidation.criticalErrors.length > 0 ||
      (applyMode === 'atomic' && (hadExecutionError || !postValidation.isValid));

    if (shouldRollback) {
      const reason =
        postValidation.criticalErrors.length > 0
          ? '存档结构严重损坏（已自动回滚）'
          : 'atomic 模式下出现执行错误（已自动回滚）';

      console.error('[AI双向系统] ❌ 指令集回滚:', reason, postValidation.criticalErrors);
      saveData = saveDataSnapshotBeforeCommands;

      if (commandErrorChanges.length > 0) {
        changes.unshift(...commandErrorChanges);
      }

      changes.unshift({
        key: '❌ 指令已回滚',
        action: 'rollback',
        oldValue: undefined,
        newValue: {
          mode: applyMode,
          reason,
          validationErrors: postValidation.criticalErrors,
        },
      });
    } else {
      if (commandErrorChanges.length > 0) {
        changes.unshift(...commandErrorChanges);
      }
      if (commandAppliedChanges.length > 0) {
        changes.push(...commandAppliedChanges);
      }
    }

    updateMasteredSkills(saveData);

    if ((saveData as any).元数据?.时间) {
      (saveData as any).元数据.时间 = normalizeGameTime((saveData as any).元数据.时间);
    }

    // 每次AI响应后，检查并移除过期的状态效果
    const { removedEffects } = updateStatusEffects(saveData);
    if (removedEffects.length > 0) {
      console.log(`[AI双向系统] Pinia状态更新前: 移除了 ${removedEffects.length} 个过期效果: ${removedEffects.join(', ')}`);
    }

    // 🔥 将状态变更添加到最新的叙事记录中
    const stateChangesLog: StateChangeLog = { changes, timestamp: new Date().toISOString() };
    if ((saveData as any).系统?.历史?.叙事 && (saveData as any).系统.历史.叙事.length > 0) {
      const latestNarrative = (saveData as any).系统.历史.叙事[(saveData as any).系统.历史.叙事.length - 1];
      (latestNarrative as any).stateChanges = stateChangesLog;
    }

    // 🔥 宗门兜底：若 AI 已生成“玩家创建/担任宗主”的宗门势力，但没初始化社交.宗门成员信息，
    // 则自动补全加入状态，让后续宗门系统（成员/藏经阁/任务等）可直接使用。
    try {
      if (!(saveData as any).系统?.联机 || (saveData as any).系统?.联机?.模式 !== '联机') {
        const currentSectName = String((saveData as any)?.社交?.宗门?.成员信息?.宗门名称 || '').trim();
        if (!currentSectName) {
          const playerName = String((saveData as any)?.角色?.身份?.名字 || '').trim();
          const factions = (saveData as any)?.世界?.信息?.势力信息;

          if (playerName && Array.isArray(factions)) {
            const matchLeader = (f: any): boolean => {
              const leader =
                (typeof f?.领导层?.宗主 === 'string' ? f.领导层.宗主 : '') ||
                (typeof f?.leadership?.宗主 === 'string' ? f.leadership.宗主 : '') ||
                (typeof f?.宗主 === 'string' ? f.宗主 : '');
              return typeof leader === 'string' && leader.trim() === playerName;
            };

            const ownedSect = factions.find(matchLeader);
            if (ownedSect && typeof ownedSect === 'object' && typeof ownedSect.名称 === 'string' && ownedSect.名称.trim()) {
              const { createJoinedSectState } = await import('@/utils/sectSystemFactory');
              const { sectSystem, memberInfo } = createJoinedSectState(ownedSect, { nowIso: new Date().toISOString() });

              // 玩家创建宗门：默认给最高职位（避免“创建了宗门但自己只是外门弟子”的违和感）
              memberInfo.职位 = '宗主';
              memberInfo.贡献 = Math.max(0, Number(memberInfo.贡献 || 0));

              if (!(saveData as any).社交) (saveData as any).社交 = {};
              (saveData as any).社交.宗门 = {
                ...(sectSystem as any),
                成员信息: memberInfo,
              };

              console.log(`[AI双向系统] 已自动初始化宗门系统：${ownedSect.名称}（玩家=宗主）`);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[AI双向系统] 自动初始化宗门系统失败（非致命）:', e);
    }

    if (!isInitialization) {
      const gameStateStore = useGameStateStore();
      gameStateStore.loadFromSaveData(saveData);
      void runPendingStoryImages();
    }

    return { saveData, stateChanges: stateChangesLog };
  }


  /**
   * 触发记忆总结（公开方法，带锁）
   * 无论是自动还是手动，都通过此方法执行，以防止竞态条件。
   *
   * @param options - 总结选项，详见 MemorySummaryOptions 接口说明
   *
   * @example
   * // 默认配置（推荐）：Raw模式 + 非流式
   * await AIBidirectionalSystem.triggerMemorySummary();
   *
   * @example
   * // 标准模式 + 流式传输
   * await AIBidirectionalSystem.triggerMemorySummary({
   *   useRawMode: false,
   *   useStreaming: true
   * });
   */
  public async triggerMemorySummary(options?: MemorySummaryOptions): Promise<void> {
    if (this.isSummarizing) {
      toast.warning('已有一个总结任务正在进行中，请稍候...');
      console.log('[AI双向系统] 检测到已有总结任务在运行，本次触发被跳过。');
      return;
    }

    this.isSummarizing = true;
    console.log('[AI双向系统] 开始记忆总结流程...');
    toast.loading('正在调用AI总结中期记忆...', { id: 'memory-summary' });

    try {
      const gameStateStore = useGameStateStore();
      const characterStore = useCharacterStore();
      const saveData = gameStateStore.toSaveData();

      if (!saveData || !(saveData as any).社交?.记忆) {
        throw new Error('无法获取存档数据或记忆模块');
      }

      // 1. 从 localStorage 读取最新配置（容错：防止 JSON 损坏导致整个流程失败）
      let settings: any = {};
      try {
        settings = JSON.parse(localStorage.getItem('memory-settings') || '{}');
      } catch {
        settings = {};
      }
      const midTermTrigger = settings.midTermTrigger ?? 25;
      const midTermKeep = settings.midTermKeep ?? 8;
      const longTermFormat = readMemoryFormatSetting('longTermFormat');

      // 2. 再次检查是否需要总结
      const midTermMemories = (saveData as any).社交.记忆.中期记忆 || [];

      // 检查中期记忆数量是否达到触发阈值
      if (midTermMemories.length < midTermTrigger) {
        console.log(`[AI双向系统] 中期记忆数量(${midTermMemories.length})未达到触发阈值(${midTermTrigger})，取消总结。`);
        toast.info(`中期记忆未达到触发阈值(${midTermTrigger}条)，已取消总结`, { id: 'memory-summary' });
        return;
      }

      // 3. 确定要总结和保留的记忆
      // 需要总结的数量 = 触发阈值 - 保留数量（例如：25 - 8 = 17条）
      const numToSummarize = midTermTrigger - midTermKeep;

      if (numToSummarize <= 0) {
        console.log('[AI双向系统] 计算出的总结数量 <= 0，配置错误，取消操作。');
        toast.error('记忆配置错误：触发阈值必须大于保留数量', { id: 'memory-summary' });
        return;
      }

      if (midTermMemories.length < numToSummarize) {
        console.log(`[AI双向系统] 中期记忆数量(${midTermMemories.length})不足以总结${numToSummarize}条，取消总结。`);
        toast.info(`中期记忆不足${numToSummarize}条，已取消总结`, { id: 'memory-summary' });
        return;
      }

      // 从最旧的记忆开始（数组前面），取出需要总结的数量
      const memoriesToSummarize = midTermMemories.slice(0, numToSummarize);
      // 保留剩余的记忆（从 numToSummarize 位置开始到末尾）
      const memoriesToKeep = midTermMemories.slice(numToSummarize);
      const memoriesText = memoriesToSummarize.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n');

      console.log(`[AI双向系统] 准备总结：从${midTermMemories.length}条中期记忆中，总结最旧的${numToSummarize}条，保留最新的${memoriesToKeep.length}条`);
      console.log(`[AI双向系统] 配置：触发阈值=${midTermTrigger}, 保留数量=${midTermKeep}, 总结数量=${numToSummarize}`);

      // 4. 使用用户自定义的记忆总结提示词
      const memorySummaryPrompt = await getPrompt('memorySummary');
      // 用户自定义的提示词可能没有 {{记忆内容}} 占位符，此时把待总结记忆追加到末尾，保证记忆一定会发给 AI
      const userPrompt = (memorySummaryPrompt.includes('{{记忆内容}}')
        ? memorySummaryPrompt.replace('{{记忆内容}}', memoriesText)
        : `${memorySummaryPrompt}\n\n【待总结记忆】\n${memoriesText}`)
        + (longTermFormat ? `

【长期记忆格式要求（用户自定义）】
${longTermFormat}` : '');

      // 5. 调用 AI
      // 从aiService读取通用配置（流式等）
      const { aiService } = await import('@/services/aiService');
      const aiConfig = aiService.getConfig();
      const useStreaming = options?.useStreaming ?? (aiConfig.streaming !== false);

      // 记忆总结模式：从 API管理 的“功能分配 -> 模式”读取（酒馆端有效）
      let useRawMode = typeof options?.useRawMode === 'boolean' ? options.useRawMode : true;
      if (typeof options?.useRawMode !== 'boolean') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { useAPIManagementStore } = require('@/stores/apiManagementStore');
          const apiStore = useAPIManagementStore();
          useRawMode = apiStore.getFunctionMode('memory_summary') === 'raw';
        } catch {
          // 兼容旧配置
          useRawMode = aiConfig.memorySummaryMode === 'raw';
        }
      }

      // 🔥 获取精简版游戏存档数据（只包含记忆总结需要的信息）
      const simplifiedSaveData = this._extractEssentialDataForSummary(saveData);
      const saveDataJson = JSON.stringify(simplifiedSaveData, null, 2);

      console.log(`[AI双向系统] 记忆总结模式: ${useRawMode ? 'Raw模式（纯净总结）' : '标准模式（带预设）'}, 传输方式: ${useStreaming ? '流式' : '非流式'}`);

      let response: string;
      if (useRawMode) {
        // Raw模式：只发总结提示词与存档，不带预设
        response = String(await aiService.generateRaw({
          ordered_prompts: [
            { role: 'system', content: `【游戏存档数据】（仅用于核对名称，不从中补充情节）：
${saveDataJson}` },
            { role: 'user', content: userPrompt },
            { role: 'user', content: ['Continue.', 'Proceed.', 'Next.', 'Go on.', 'Resume.'][Math.floor(Math.random() * 5)] },
            { role: 'assistant', content: '</input>' }
          ],
          should_stream: useStreaming,
          usageType: 'memory_summary'
        }));
      } else {
        // 标准模式：存档作为系统注入，总结要求与待总结记忆都在 user_input 里（不再重复发送一遍提示词）
        response = String(await aiService.generate({
          user_input: userPrompt,
          should_stream: useStreaming,
          generation_id: `memory_summary_${Date.now()}`,
          usageType: 'memory_summary',
          injects: [
            { content: `【游戏存档数据】（仅用于核对名称，不从中补充情节）：
${saveDataJson}`, role: 'system', depth: 4, position: 'in_chat' },
            INPUT_GUARD_INJECT,
          ]
        }));
      }

      // 解析响应（与NPC记忆总结相同的方式）
      let summaryText: string;
      const responseText = String(response).replace(/<\/input>/g, '').trim();

      const jsonBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonBlockMatch?.[1]) {
        const fenced = jsonBlockMatch[1].trim();
        try {
          summaryText = JSON.parse(fenced).text?.trim() || '';
        } catch {
          // 容错：模型可能在代码块里输出纯文本或非严格JSON（尾逗号/注释等）
          const textFieldMatch = fenced.match(/"text"\s*:\s*"([\s\S]*?)"\s*[},]/);
          if (textFieldMatch?.[1]) {
            try {
              summaryText = JSON.parse('"' + textFieldMatch[1].replace(/"/g, '\\"') + '"').trim();
            } catch {
              summaryText = textFieldMatch[1].trim();
            }
          } else {
            summaryText = fenced;
          }
        }
      } else {
        try {
          summaryText = JSON.parse(responseText).text?.trim() || '';
        } catch {
          summaryText = responseText.trim();
        }
      }

      if (!summaryText || summaryText.length === 0) {
        throw new Error('AI返回了空的总结结果');
      }

      console.log('[AI双向系统] 总结文本长度:', summaryText.length, '预览:', summaryText.substring(0, 100));

      // 6. 更新游戏状态
      // 长期记忆不需要时间前缀和【记忆总结】标签，直接存储总结内容
      const newLongTermMemory = summaryText;

      // 确保 memory 对象存在
      if (!gameStateStore.memory) {
        gameStateStore.memory = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
      }

      gameStateStore.memory.长期记忆.push(newLongTermMemory);
      gameStateStore.memory.中期记忆 = memoriesToKeep;

      // 7. 保存到存档
      await characterStore.saveCurrentGame();

      console.log(`[AI双向系统] ✅ 总结完成：${numToSummarize}条中期记忆 -> 1条长期记忆。保留 ${memoriesToKeep.length} 条。`);
      toast.success(`成功总结 ${numToSummarize} 条记忆！`, { id: 'memory-summary' });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      console.error('[AI双向系统] 记忆总结失败:', error);
      toast.error(`记忆总结失败: ${errorMsg}`, { id: 'memory-summary' });
    } finally {
      this.isSummarizing = false;
      console.log('[AI双向系统] 记忆总结流程结束，已释放锁。');
    }
  }

  private _preprocessCommands(commands: any[]): any[] {
    if (!Array.isArray(commands)) return [];

    const inventoryRootKeys = new Set(['角色.背包.物品', '背包.物品', '物品栏.物品']);
    const allowedRoots = ['元数据', '角色', '社交', '世界', '系统'] as const;

    const normalizeCommandKey = (key: unknown): unknown => {
      if (typeof key !== 'string') return key;
      const trimmed = key.trim();
      if (!trimmed) return key;

      // common "looks-valid" but wrong V3 paths -> correct paths
      if (trimmed === '角色.声望' || trimmed.startsWith('角色.声望.')) return trimmed.replace(/^角色\.声望/, '角色.属性.声望');
      if (trimmed === '角色.气血' || trimmed.startsWith('角色.气血.')) return trimmed.replace(/^角色\.气血/, '角色.属性.气血');
      if (trimmed === '角色.灵气' || trimmed.startsWith('角色.灵气.')) return trimmed.replace(/^角色\.灵气/, '角色.属性.灵气');
      if (trimmed === '角色.神识' || trimmed.startsWith('角色.神识.')) return trimmed.replace(/^角色\.神识/, '角色.属性.神识');
      if (trimmed === '角色.寿命' || trimmed.startsWith('角色.寿命.')) return trimmed.replace(/^角色\.寿命/, '角色.属性.寿命');
      if (trimmed === '角色.境界' || trimmed.startsWith('角色.境界.')) return trimmed.replace(/^角色\.境界/, '角色.属性.境界');
      if (trimmed === '角色.状态效果' || trimmed.startsWith('角色.状态效果')) return trimmed.replace(/^角色\.状态效果/, '角色.效果');

      // legacy time shortcuts -> V3
      if (trimmed === '游戏时间') return '元数据.时间';
      if (trimmed.startsWith('游戏时间.')) return `元数据.时间.${trimmed.slice('游戏时间.'.length)}`;
      if (trimmed === '时间') return '元数据.时间';
      if (trimmed.startsWith('时间.')) return `元数据.时间.${trimmed.slice('时间.'.length)}`;

      // legacy memory shortcuts -> V3
      if (trimmed === '记忆') return '社交.记忆';
      if (trimmed.startsWith('记忆.')) return `社交.记忆.${trimmed.slice('记忆.'.length)}`;

      // legacy relationship shortcuts -> V3 (see docs/save-schema-v3.md)
      if (trimmed === '人物关系' || trimmed === '关系') return '社交.关系';
      if (trimmed.startsWith('人物关系.')) return `社交.关系.${trimmed.slice('人物关系.'.length)}`;
      if (trimmed.startsWith('关系.')) return `社交.关系.${trimmed.slice('关系.'.length)}`;
      if (trimmed === '关系矩阵' || trimmed === '关系网') return '社交.关系矩阵';
      if (trimmed.startsWith('关系矩阵.')) return `社交.关系矩阵.${trimmed.slice('关系矩阵.'.length)}`;
      if (trimmed.startsWith('关系网.')) return `社交.关系矩阵.${trimmed.slice('关系网.'.length)}`;

      // other common legacy shortcuts -> V3 (align with V3 schema mapping table)
      if (trimmed === '宗门系统' || trimmed === '宗门') return '社交.宗门';
      if (trimmed.startsWith('宗门系统.')) return `社交.宗门.${trimmed.slice('宗门系统.'.length)}`;
      if (trimmed.startsWith('宗门.')) return `社交.宗门.${trimmed.slice('宗门.'.length)}`;
      if (trimmed === '世界信息' || trimmed === '世界') return '世界.信息';
      if (trimmed.startsWith('世界信息.')) return `世界.信息.${trimmed.slice('世界信息.'.length)}`;
      if (trimmed.startsWith('世界.')) return trimmed; // keep world root as-is if already V3-like
      if (trimmed === '叙事历史' || trimmed === '历史.叙事') return '系统.历史.叙事';
      if (trimmed.startsWith('叙事历史.')) return `系统.历史.叙事.${trimmed.slice('叙事历史.'.length)}`;
      if (trimmed === '系统配置') return '系统.配置';
      if (trimmed.startsWith('系统配置.')) return `系统.配置.${trimmed.slice('系统配置.'.length)}`;

      // legacy attribute shortcuts -> V3
      if (trimmed === '声望' || trimmed.startsWith('声望.')) return `角色.属性.${trimmed}`;
      if (trimmed === '气血' || trimmed.startsWith('气血.')) return `角色.属性.${trimmed}`;
      if (trimmed === '灵气' || trimmed.startsWith('灵气.')) return `角色.属性.${trimmed}`;
      if (trimmed === '神识' || trimmed.startsWith('神识.')) return `角色.属性.${trimmed}`;
      if (trimmed === '寿命' || trimmed.startsWith('寿命.')) return `角色.属性.${trimmed}`;
      if (trimmed === '境界' || trimmed.startsWith('境界.')) return `角色.属性.${trimmed}`;

      // already V3
      if (allowedRoots.some((r) => trimmed === r || trimmed.startsWith(`${r}.`))) return trimmed;

      // legacy shortcuts -> V3
      if (trimmed === '位置' || trimmed.startsWith('位置.')) return `角色.${trimmed}`;
      if (trimmed === '属性' || trimmed.startsWith('属性.')) return `角色.${trimmed}`;
      if (trimmed === '背包' || trimmed.startsWith('背包.')) return `角色.${trimmed}`;
      if (trimmed === '物品栏' || trimmed.startsWith('物品栏.')) return `角色.背包.${trimmed.slice('物品栏.'.length)}`;
      if (trimmed === '装备' || trimmed.startsWith('装备.')) return `角色.${trimmed}`;
      if (trimmed === '效果' || trimmed.startsWith('效果')) return `角色.${trimmed}`;
      if (trimmed === '大道' || trimmed.startsWith('大道.')) return `角色.${trimmed}`;
      if (trimmed === '修炼' || trimmed.startsWith('修炼.')) return `角色.${trimmed}`;
      if (trimmed === '技能' || trimmed.startsWith('技能.')) return `角色.${trimmed}`;

      return trimmed;
    };

    const expandLegacySetState = (cmd: any): any[] | null => {
      if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) return null;

      // Some models still output the old `{ set_state: { "路径": 值 } }` format.
      const payload = (cmd as any).set_state ?? (cmd as any).setState ?? null;
      if (!payload) return null;

      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

      const entries = Object.entries(payload as Record<string, any>);
      if (entries.length === 0) return [];

      console.warn(`[AI双向系统] 预处理: 发现旧指令格式 set_state，已转换为 ${entries.length} 条 set 指令。`);
      return entries.map(([k, v]) => ({
        action: 'set',
        key: normalizeCommandKey(k),
        value: v
      }));
    };

    // 防误伤：AI 常把“更新NPC字段”写成整体 set `社交.关系.某人 = { 好感度: ... }`，
    // 这会覆盖并丢失原有字段，导致“人物不新增/人物消失/数据结构异常”。
    // 这里统一把整体 set 拆成字段级 set，避免覆盖整对象。
    const expandNpcWholeSet = (cmd: any): any[] | null => {
      if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) return null;
      if ((cmd as any).action !== 'set') return null;
      if (typeof (cmd as any).key !== 'string') return null;
      const key = String((cmd as any).key);
      if (!/^社交\.关系\.[^\.]+$/.test(key)) return null;
      const value = (cmd as any).value;
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

      const npcNameFromKey = key.split('.')[2];
      const obj = value as Record<string, any>;
      const expanded: any[] = [];

      if (!Object.prototype.hasOwnProperty.call(obj, '名字') && npcNameFromKey) {
        expanded.push({ action: 'set', key: `${key}.名字`, value: npcNameFromKey });
      }

      for (const [k, v] of Object.entries(obj)) {
        expanded.push({ action: 'set', key: `${key}.${k}`, value: v });
      }

      if (expanded.length > 0) {
        console.warn(`[AI双向系统] 预处理: 将整体 set "${key}" 拆分为 ${expanded.length} 条字段 set，避免覆盖丢字段。`);
      }
      return expanded;
    };

    // 兼容：AI 把“新增NPC”写成 `set 社交.关系 = { 张三: {...}, 李四: {...} }`
    // 该写法会被指令保护拒绝（禁止整体 set 社交.关系），因此在这里拆分为逐个 NPC 的 set。
    const expandSocialRelationsWholeSet = (cmd: any): any[] | null => {
      if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) return null;
      if ((cmd as any).action !== 'set') return null;
      if (typeof (cmd as any).key !== 'string') return null;
      const key = String((cmd as any).key);
      if (key !== '社交.关系') return null;
      const value = (cmd as any).value;
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

      const expanded: any[] = [];
      for (const [npcName, npcValue] of Object.entries(value as Record<string, any>)) {
        if (!npcName || typeof npcName !== 'string') continue;
        if (!npcValue || typeof npcValue !== 'object') continue;
        // 直接拆成字段 set，避免完整覆盖导致缺字段/被校验拒绝
        const expandedNpc = expandNpcWholeSet({ action: 'set', key: `社交.关系.${npcName}`, value: npcValue });
        if (expandedNpc) expanded.push(...expandedNpc);
        else expanded.push({ action: 'set', key: `社交.关系.${npcName}`, value: npcValue });
      }

      if (expanded.length > 0) {
        console.warn(`[AI双向系统] 预处理: 将整体 set "社交.关系" 拆分为 ${expanded.length} 条 NPC set，避免被保护拒绝。`);
      }
      return expanded;
    };

    // 兼容：AI 把“新增NPC”写成 `push 社交.关系`（但社交.关系 是对象，不是数组，会导致执行时报错）
    const expandSocialRelationsPush = (cmd: any): any[] | null => {
      if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) return null;
      if ((cmd as any).action !== 'push') return null;
      if (typeof (cmd as any).key !== 'string') return null;
      const key = String((cmd as any).key);
      if (key !== '社交.关系') return null;
      const value = (cmd as any).value;
      if (!value) return null;

      // 情况1：push 一个 NPC 对象（包含名字/性别/出生日期之一）
      if (typeof value === 'object' && !Array.isArray(value)) {
        const maybeNpcName = (value as any).名字;
        if (typeof maybeNpcName === 'string' && maybeNpcName.trim()) {
          const expandedNpc = expandNpcWholeSet({ action: 'set', key: `社交.关系.${maybeNpcName.trim()}`, value });
          return expandedNpc || [{ action: 'set', key: `社交.关系.${maybeNpcName.trim()}`, value }];
        }
      }

      // 情况2：push 一个 { 张三: {...} } 的对象（当作关系字典）
      if (typeof value === 'object' && !Array.isArray(value)) {
        const expanded = expandSocialRelationsWholeSet({ action: 'set', key: '社交.关系', value });
        if (expanded) return expanded;
      }

      return null;
    };

    // 兼容：AI 把“NPC记忆/关系变更”等写成 `push 社交.关系.某人`（少了 .记忆 / .关系矩阵 等后缀）
    // - string -> 视为 NPC 记忆：push 到 `社交.关系.<NPC>.记忆`
    // - object -> 视为 NPC 部分/完整数据：转为 set 并继续走 NPC 拆分逻辑
    const expandNpcRootPush = (cmd: any): any[] | null => {
      if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) return null;
      if ((cmd as any).action !== 'push') return null;
      if (typeof (cmd as any).key !== 'string') return null;
      const key = String((cmd as any).key);
      if (!/^社交\.关系\.[^\.]+$/.test(key)) return null;

      const npcName = key.split('.')[2];
      const value = (cmd as any).value;

      if (typeof value === 'string') {
        return [{ action: 'push', key: `社交.关系.${npcName}.记忆`, value }];
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const toSet = { action: 'set', key: `社交.关系.${npcName}`, value };
        const expandedNpc = expandNpcWholeSet(toSet);
        return expandedNpc || [toSet];
      }

      return null;
    };

    // 兼容：AI 把“NPC好感变化”写成 `add 社交.关系.<NPC> 10`
    // 规则：当 add 目标是 NPC 根对象时，默认改写为 add 到 .好感度
    const expandNpcRootAdd = (cmd: any): any[] | null => {
      if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) return null;
      if ((cmd as any).action !== 'add') return null;
      if (typeof (cmd as any).key !== 'string') return null;
      const key = String((cmd as any).key);
      if (!/^社交\.关系\.[^\.]+$/.test(key)) return null;

      const npcName = key.split('.')[2];
      const value = (cmd as any).value;
      if (typeof value === 'number' && Number.isFinite(value)) {
        return [{ action: 'add', key: `社交.关系.${npcName}.好感度`, value }];
      }

      return null;
    };

    const out: any[] = [];

    // 使用队列逐条预处理，确保“展开出来的新指令”也会继续经过后续纠错与拆分
    const queue: any[] = [...commands];
    while (queue.length > 0) {
      const cmd = queue.shift();

      // Expand legacy format first (may turn 1 object into N commands).
      const expanded = expandLegacySetState(cmd);
      if (expanded) {
        queue.unshift(...expanded);
        continue;
      }

      if (!cmd || typeof cmd !== 'object') {
        out.push(cmd);
        continue;
      }

      if (typeof (cmd as any).key === 'string') {
        const normalized = normalizeCommandKey((cmd as any).key);
        if (typeof normalized === 'string' && normalized !== (cmd as any).key) {
          console.warn(`[AI双向系统] 预处理: key 纠正 "${(cmd as any).key}" -> "${normalized}"`);
          (cmd as any).key = normalized;
        }
      }

      const expandedRelations = expandSocialRelationsWholeSet(cmd);
      if (expandedRelations) {
        queue.unshift(...expandedRelations);
        continue;
      }

      const expandedRelationsPush = expandSocialRelationsPush(cmd);
      if (expandedRelationsPush) {
        queue.unshift(...expandedRelationsPush);
        continue;
      }

      const expandedNpcRootPush = expandNpcRootPush(cmd);
      if (expandedNpcRootPush) {
        queue.unshift(...expandedNpcRootPush);
        continue;
      }

      const expandedNpcRootAdd = expandNpcRootAdd(cmd);
      if (expandedNpcRootAdd) {
        queue.unshift(...expandedNpcRootAdd);
        continue;
      }

      // 先做 NPC 整体 set 拆分（避免后续校验把它当作“完整NPC覆盖”而拒绝/或导致覆盖丢字段）
      const expandedNpc = expandNpcWholeSet(cmd);
      if (expandedNpc) {
        queue.unshift(...expandedNpc);
        continue;
      }

      // 修复: set 元数据.时间 时缺少小时/分钟（补齐为 0，避免时间显示异常）
      if (cmd.action === 'set' && cmd.key === '元数据.时间' && cmd.value && typeof cmd.value === 'object' && !Array.isArray(cmd.value)) {
        const t = cmd.value as Record<string, any>;
        if (typeof t.小时 !== 'number') t.小时 = 0;
        if (typeof t.分钟 !== 'number') t.分钟 = 0;
      }

      // 修复: AI 把“新增一个物品”写成 set 角色.背包.物品 = {物品对象}
      if (
        cmd.action === 'set' &&
        cmd.key === '角色.背包.物品' &&
        cmd.value &&
        typeof cmd.value === 'object' &&
        !Array.isArray(cmd.value) &&
        (((cmd.value as any).物品ID && typeof (cmd.value as any).物品ID === 'string') ||
          (typeof (cmd.value as any).名称 === 'string' && (cmd.value as any).名称) ||
          (typeof (cmd.value as any).类型 === 'string' && (cmd.value as any).类型))
      ) {
        let itemValue: any = cmd.value;
        if (itemValue.类型 === '功法') itemValue = this._repairTechniqueItem(itemValue);
        const itemId =
          typeof itemValue.物品ID === 'string' && itemValue.物品ID.trim()
            ? itemValue.物品ID.trim()
            : `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        itemValue.物品ID = itemId;
        console.warn(`[AI双向系统] 预处理: 背包物品 set-root→set 角色.背包.物品.${itemId}`);
        out.push({ action: 'set', key: `角色.背包.物品.${itemId}`, value: itemValue });
        continue;
      }

      // 修复: AI 把背包物品当数组 push（实际是对象字典）
      if (cmd.action === 'push' && typeof cmd.key === 'string' && inventoryRootKeys.has(cmd.key)) {
        let itemValue: any = cmd.value ?? null;

        // 兼容：push 进来的是字符串（物品名）
        if (typeof itemValue === 'string') {
          const itemName = itemValue.trim();
          itemValue = {
            物品ID: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            名称: itemName || '未知物品',
            类型: '杂物',
            品质: { quality: '凡品', grade: 0 },
            数量: 1,
            描述: `一个普通的${itemName || '物品'}。`
          };
        }

        // 若是功法物品，补齐功法技能等字段，避免后续校验/显示异常
        if (itemValue && typeof itemValue === 'object' && itemValue.类型 === '功法') {
          itemValue = this._repairTechniqueItem(itemValue);
        }

        const itemId =
          itemValue && typeof itemValue === 'object' && typeof itemValue.物品ID === 'string' && itemValue.物品ID.trim()
            ? itemValue.物品ID.trim()
            : `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        if (itemValue && typeof itemValue === 'object') {
          itemValue.物品ID = itemId;
        }

        console.warn(`[AI双向系统] 预处理: 背包物品 push→set 角色.背包.物品.${itemId}`);
        out.push({
          action: 'set',
          key: `角色.背包.物品.${itemId}`,
          value: itemValue
        });
        continue;
      }

      // 修复: AI推送一个字符串而不是物品对象到物品栏
      if (cmd.action === 'push' && inventoryRootKeys.has(cmd.key) && typeof cmd.value === 'string') {
        console.warn(`[AI双向系统] 预处理: 将字符串物品 "${cmd.value}" 转换为对象。`);
        const itemName = cmd.value;
        out.push({
          ...cmd,
          value: {
            物品ID: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            名称: itemName,
            类型: '杂物',
            品质: { quality: '凡品', grade: 0 },
            数量: 1,
            描述: `一个普通的${itemName}。`
          }
        });
        continue;
      }

      // 修复: 新增功法但缺少功法技能数组，导致后续生成/校验报错
      const isInventoryItemCreation =
        (cmd.action === 'push' && inventoryRootKeys.has(cmd.key)) ||
        (cmd.action === 'set' &&
          typeof cmd.key === 'string' &&
          Array.from(inventoryRootKeys).some((root) => cmd.key.startsWith(root + '.')));

      if (isInventoryItemCreation && cmd.value && typeof cmd.value === 'object' && cmd.value.类型 === '功法') {
        out.push({ ...cmd, value: this._repairTechniqueItem(cmd.value) });
        continue;
      }

      out.push(cmd);
    }

    return out;
  }

  private _repairTechniqueItem(item: any): any {
    if (!item || typeof item !== 'object') return item;
    if (item.类型 !== '功法') return item;

    const repaired: any = { ...item };

    const techniqueName = typeof repaired.名称 === 'string' && repaired.名称.trim() ? repaired.名称.trim() : '未知功法';

    // 🔥 补齐功法物品基础字段（否则会在 commandValueValidator 中被拒绝，导致“背包没新增功法”）
    if (typeof repaired.物品ID !== 'string' || !repaired.物品ID.trim()) {
      repaired.物品ID = `gongfa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } else {
      repaired.物品ID = repaired.物品ID.trim();
    }

    repaired.类型 = '功法';

    if (!repaired.品质 || typeof repaired.品质 !== 'object') {
      repaired.品质 = { quality: '凡', grade: 0 };
    } else {
      if (typeof repaired.品质.quality !== 'string' || !repaired.品质.quality.trim()) repaired.品质.quality = '凡';
      if (typeof repaired.品质.grade !== 'number' || !Number.isFinite(repaired.品质.grade)) repaired.品质.grade = 0;
    }

    if (typeof repaired.数量 !== 'number' || !Number.isFinite(repaired.数量)) repaired.数量 = 1;
    if (repaired.描述 === undefined) repaired.描述 = `一部名为《${techniqueName}》的功法。`;

    const progress =
      typeof repaired.修炼进度 === 'number' && Number.isFinite(repaired.修炼进度) ? repaired.修炼进度 : 0;
    repaired.修炼进度 = Math.max(0, Math.min(100, progress));

    if (!Array.isArray(repaired.功法技能)) {
      repaired.功法技能 = [];
    }

    repaired.功法技能 = repaired.功法技能
      .filter((s: any) => s && typeof s === 'object')
      .map((s: any, idx: number) => {
        const skillName =
          typeof s.技能名称 === 'string' && s.技能名称.trim() ? s.技能名称.trim() : `${techniqueName}·招式${idx + 1}`;
        const skillDescription = typeof s.技能描述 === 'string' ? s.技能描述 : '';
        const unlockThreshold =
          typeof s.熟练度要求 === 'number' && Number.isFinite(s.熟练度要求) ? s.熟练度要求 : 0;
        const cost = typeof s.消耗 === 'string' ? s.消耗 : '';
        return { ...s, 技能名称: skillName, 技能描述: skillDescription, 熟练度要求: unlockThreshold, 消耗: cost };
      });

    if (repaired.功法技能.length === 0) {
      console.warn(`[AI双向系统] 预处理: 功法 "${techniqueName}" 缺少功法技能，已自动补齐基础技能以防报错。`);
      repaired.功法技能 = [
        {
          技能名称: `${techniqueName}·入门运功`,
          技能描述: `运转《${techniqueName}》的基础法门，凝聚灵气并稳固气机。`,
          熟练度要求: 0,
          消耗: '灵气10%'
        }
      ];
    }

    if (!Array.isArray(repaired.已解锁技能)) {
      repaired.已解锁技能 = [];
    }
    repaired.已解锁技能 = repaired.已解锁技能
      .filter((v: any) => typeof v === 'string' && v.trim().length > 0)
      .map((v: string) => v.trim());

    for (const s of repaired.功法技能) {
      const unlockThreshold = typeof s.熟练度要求 === 'number' ? s.熟练度要求 : 0;
      if (progress >= unlockThreshold && typeof s.技能名称 === 'string' && !repaired.已解锁技能.includes(s.技能名称)) {
        repaired.已解锁技能.push(s.技能名称);
      }
    }

    if (typeof repaired.已装备 !== 'boolean') {
      repaired.已装备 = false;
    }

    return repaired;
  }

  private executeCommand(
    command: { action: string; key: string; value?: unknown },
    saveData: SaveData,
    protectionMode: 'strict' | 'skeleton' = 'strict'
  ): void {
    const { action, key, value } = command;

    if (!action || !key) {
      throw new Error('指令格式错误：缺少 action 或 key');
    }

    const path = key.toString();
    const allowedRoots = ['元数据', '角色', '社交', '世界', '系统'] as const;
    const isV3Path = allowedRoots.some((root) => path === root || path.startsWith(`${root}.`));
    if (!isV3Path) {
      throw new Error(`指令key必须以 ${allowedRoots.join(' / ')} 开头（V3短路径），当前: ${path}`);
    }

    const playerName = typeof (saveData as any)?.角色?.身份?.名字 === 'string' ? (saveData as any).角色.身份.名字.trim() : '';
    if (playerName) {
      const segments = path.split('.');
      const npcKey = typeof segments[2] === 'string' ? segments[2].trim() : '';
      const isPlayerInRelations = segments[0] === '社交' && segments[1] === '关系' && npcKey === playerName;
      if (isPlayerInRelations && action !== 'delete') {
        console.warn(`[AI双向系统] 阻止将玩家本人写入社交.关系: ${path}`);
        return;
      }
    }

    // 🔥 保护NPC骨干结构：当 AI 直接写入社交.关系.<NPC名> 的子路径时，确保该NPC根对象存在且至少具备名字
    const segments = path.split('.');
    const isNpcSubPath = segments[0] === '社交' && segments[1] === '关系' && typeof segments[2] === 'string' && !!segments[2].trim();
    if (isNpcSubPath && action !== 'delete') {
      const npcName = segments[2].trim();
      if (!playerName || npcName !== playerName) {
        // 确保 社交.关系 是对象
        const relationsRoot = get(saveData, '社交.关系');
        if (!isPlainObject(relationsRoot)) {
          set(saveData, '社交.关系', {});
        }

        const npcRootPath = `社交.关系.${npcName}`;
        const existingNpc = get(saveData, npcRootPath);
        if (protectionMode === 'strict') {
          const gameTime = (saveData as any)?.元数据?.时间;
          // 仅在缺失/明显无效时才补齐，避免每条指令都重复修复造成额外开销
          if (!isPlainObject(existingNpc)) {
            const [ok, repaired] = validateAndRepairNpcProfile({ 名字: npcName }, gameTime);
            if (ok && repaired) set(saveData, npcRootPath, repaired);
          } else {
            const name = typeof (existingNpc as any).名字 === 'string' ? (existingNpc as any).名字.trim() : '';
            if (!name) {
              const [ok, repaired] = validateAndRepairNpcProfile({ ...(existingNpc as any), 名字: npcName }, gameTime);
              if (ok && repaired) set(saveData, npcRootPath, repaired);
            }
          }
        } else {
          // skeleton：只保证是对象 + 有名字，不做重度修复/覆盖
          if (!isPlainObject(existingNpc)) {
            set(saveData, npcRootPath, { 名字: npcName });
          } else {
            const name = typeof (existingNpc as any).名字 === 'string' ? (existingNpc as any).名字.trim() : '';
            if (!name) set(saveData, `${npcRootPath}.名字`, npcName);
          }
        }
      }
    }

    // 🔥 保护关键数组字段，防止被设为 null
    const arrayFields =
      protectionMode === 'strict'
        ? [
            '角色.效果',
            '社交.任务.当前任务列表',
            '社交.记忆.短期记忆',
            '社交.记忆.中期记忆',
            '社交.记忆.长期记忆',
            '社交.记忆.隐式中期记忆',
            '系统.历史.叙事',
          ]
        : ['角色.效果', '社交.记忆.短期记忆', '社交.记忆.中期记忆', '社交.记忆.长期记忆', '社交.记忆.隐式中期记忆', '系统.历史.叙事'];
    // 精确匹配：路径必须完全等于数组字段，或者是数组元素（如 状态效果[0]）但不是其子属性
    const isArrayField = arrayFields.some(field => {
      // 完全匹配
      if (path === field) return true;
      // 匹配数组元素，但不匹配数组元素的子属性
      // 例如：状态效果[0] ✓  状态效果[0].持续时间分钟 ✗
      if (path.startsWith(field + '[') && !path.includes('.', field.length)) return true;
      return false;
    });

    if (action === 'set' && isArrayField) {
      if (value === null || value === undefined) {
        console.warn(`[AI双向系统] 阻止将数组字段 ${path} 设为 null/undefined，改为空数组`);
        set(saveData, path, []);
        return;
      }
      if (!Array.isArray(value)) {
        console.warn(`[AI双向系统] 阻止将数组字段 ${path} 设为非数组值，保持原值`);
        return;
      }
    }

    if (action === 'set') {
      const segments = path.split('.');

      if (protectionMode === 'strict') {
        // 🔥 保护关键模块：使用合并而非覆盖，防止 AI 的 set 操作意外清空数据
        const protectedModulePaths = [
          '角色.背包',
          '角色.功法',
          '角色.技能',
          '角色.大道',
          '角色.修炼',
          '角色.属性',
          '角色.身份',
          '社交.记忆',
          '社交.宗门',
        ];
        if (protectedModulePaths.includes(path) && isPlainObject(value)) {
          const existing = get(saveData, path);
          if (isPlainObject(existing)) {
            const merged = mergePlainObjectsReplacingArrays(existing, value);
            console.log(`[AI双向系统] 保护模块 ${path}：使用合并而非覆盖`);
            set(saveData, path, merged);
            return;
          }
        }
      }

      const isNpcRoot = segments.length === 3 && segments[0] === '社交' && segments[1] === '关系';
      // 🔥 防止把 NPC 根对象写坏：根对象只能 set 为对象（字符串/数字会直接覆盖导致NPC消失）
      if (isNpcRoot && !isPlainObject(value)) {
        console.warn(`[AI双向系统] 阻止将 NPC 根对象 "${path}" set 为非对象值（${typeof value}），请改为设置具体字段。`);
        return;
      }
      if (isNpcRoot && isPlainObject(value)) {
        if (playerName && typeof (value as any).名字 === 'string' && (value as any).名字.trim() === playerName) {
          console.warn(`[AI双向系统] 阻止将玩家本人写入社交.关系: ${path}`);
          return;
        }
        if (protectionMode === 'strict') {
          const existingNpc = get(saveData, path);
          const baseNpc = isPlainObject(existingNpc) ? existingNpc : {};
          const mergedNpc = mergePlainObjectsReplacingArrays(baseNpc, value);
          if (typeof (mergedNpc as any).名字 !== 'string' || !(mergedNpc as any).名字) {
            (mergedNpc as any).名字 = segments[2];
          }
          const gameTime = (saveData as any)?.元数据?.时间;
          const [isValid, repairedNpc] = validateAndRepairNpcProfile(mergedNpc, gameTime);
          if (isValid && repairedNpc) {
            set(saveData, path, repairedNpc);
            return;
          }
        } else {
          // skeleton：不做重度修复，最多补齐名字，允许写入原始对象
          if (typeof (value as any).名字 !== 'string' || !(value as any).名字) {
            (value as any).名字 = segments[2];
          }
        }
      }
    }
    switch (action) {
      case 'set':
        set(saveData, path, value);
        break;

      case 'add': {
        const currentValue = get(saveData, path, 0);
        if (typeof currentValue !== 'number' || typeof value !== 'number') {
          throw new Error(`ADD操作要求数值类型，但得到: ${typeof currentValue}, ${typeof value}`);
        }
        const newValue = currentValue + value;

        // 🔥 防止灵石变成负数
        if (path.includes('灵石') && newValue < 0) {
          console.warn(`[AI双向系统] ${path} 执行add后会变成负数 (${currentValue} + ${value} = ${newValue})，已限制为0`);
          set(saveData, path, 0);
        } else {
          set(saveData, path, newValue);
        }

        // ?? 大道经验：add 当前经验 时同步累计总经验（仅正增量）
        const daoCurrentExpMatch = path.match(/^角色\.大道\.大道列表\.([^\.]+)\.当前经验$/);
        if (daoCurrentExpMatch && value > 0) {
          const daoName = daoCurrentExpMatch[1];
          const totalPath = `角色.大道.大道列表.${daoName}.总经验`;
          const totalValue = get(saveData, totalPath, 0);
          if (typeof totalValue === 'number') {
            set(saveData, totalPath, Math.max(0, totalValue + value));
          }
        }

        break;
      }

      case 'push': {
        const array = get(saveData, path, []) as unknown[];
        if (!Array.isArray(array)) {
          throw new Error(`PUSH操作要求数组类型，但 ${path} 是 ${typeof array}`);
        }
        let valueToPush: unknown = value ?? null;
        // 当向记忆数组推送时，自动添加时间戳（但跳过隐式中期记忆，因为已在processGmResponse中处理）
        const isMemoryPath =
          path.startsWith('社交.记忆.') || path.startsWith('记忆.');
        const isImplicitMid =
          path === '社交.记忆.隐式中期记忆' || path === '记忆.隐式中期记忆';
        if (typeof valueToPush === 'string' && isMemoryPath && !isImplicitMid) {
          if (!valueToPush.trim()) {
            break;
          }
          const timePrefix = this._formatGameTime((saveData as any).元数据?.时间);
          valueToPush = `${timePrefix}${valueToPush}`;
        }
        array.push(valueToPush);
        // 如果路径不存在，set会创建它
        set(saveData, path, array);
        break;
      }

      case 'delete':
        unset(saveData, path);
        break;

      case 'pull': {
        // 从数组中移除匹配的元素（用于任务系统、状态效果等）
        const array = get(saveData, path, []) as unknown[];
        if (!Array.isArray(array)) {
          throw new Error(`PULL操作要求数组类型，但 ${path} 是 ${typeof array}`);
        }

        // value 应该是一个对象，包含用于匹配的字段
        if (!value || typeof value !== 'object') {
          throw new Error(`PULL操作要求value是对象类型，用于匹配要移除的元素`);
        }

        const matchCriteria = value as Record<string, unknown>;
        const updatedArray = array.filter(item => {
          if (!item || typeof item !== 'object') return true;

          // 检查是否所有匹配条件都满足
          for (const [key, val] of Object.entries(matchCriteria)) {
            if ((item as Record<string, unknown>)[key] !== val) {
              return true; // 不匹配，保留
            }
          }
          return false; // 完全匹配，移除
        });

        set(saveData, path, updatedArray);
        console.log(`[AI双向系统] PULL操作: 从 ${path} 移除了 ${array.length - updatedArray.length} 个元素`);
        break;
      }

      default:
        throw new Error(`未知的操作类型: ${action}`);
    }

    // 🔥 功法进度镜像：UI/功法系统主要读取背包物品上的修炼进度/已解锁技能
    // AI 往往只更新 `角色.功法.功法进度.<功法ID>.*`，导致“变量更新了，但功法面板还不动”。
    // 仅在物品存在且类型为功法时同步，避免凭空创建背包物品。
    if (action === 'set' || action === 'add' || action === 'push') {
      const match = path.match(/^角色\.功法\.功法进度\.([^\.]+)\.(熟练度|已解锁技能)$/);
      if (match) {
        const itemId = match[1];
        const field = match[2];
        const itemPath = `角色.背包.物品.${itemId}`;
        const item = get(saveData, itemPath);
        if (isPlainObject(item) && (item as any).类型 === '功法') {
          if (field === '熟练度') {
            const updated = get(saveData, path);
            const num = typeof updated === 'number' && Number.isFinite(updated) ? updated : 0;
            const clamped = Math.max(0, Math.min(100, Math.round(num)));
            if (clamped !== num) {
              set(saveData, path, clamped);
            }
            set(saveData, `${itemPath}.修炼进度`, clamped);
          } else if (field === '已解锁技能') {
            const updated = get(saveData, path);
            const list = Array.isArray(updated) ? updated : [];
            const normalized = list
              .filter((s) => typeof s === 'string')
              .map((s) => sanitizeAITextForDisplay(s).trim())
              .filter((s) => s.length > 0);
            set(saveData, path, normalized);
            set(saveData, `${itemPath}.已解锁技能`, normalized);
          }
        }
      }
    }

    // 🔥 实时同步位置到 gameStateStore
    if (path === '角色.位置' || path.startsWith('角色.位置.')) {
      const gameStateStore = useGameStateStore();
      const newLocation = get(saveData, '角色.位置');
      if (newLocation) {
        gameStateStore.updateLocation(newLocation);
      }
    }
  }

  /**
   * 提取记忆总结所需的精简存档数据
   * 与正式游戏交互保持一致：移除叙事历史、短期记忆、隐式中期记忆
   */
  private _extractEssentialDataForSummary(saveData: SaveData): SaveData {
    const simplified = cloneDeep(saveData);

    // 🔥 修复：移除叙事历史（正确路径是 系统.历史.叙事）
    if ((simplified as any).系统?.历史?.叙事) {
      delete (simplified as any).系统.历史.叙事;
    }

    // 🔥 修复：移除短期和隐式中期记忆（正确路径是 社交.记忆）
    if ((simplified as any).社交?.记忆) {
      delete (simplified as any).社交.记忆.短期记忆;
      delete (simplified as any).社交.记忆.隐式中期记忆;
    }

    return simplified;
  }

  /**
   * 智能摘要值，避免在状态变更日志中存储大量重复数据
   * 对于大型数组和对象，只记录摘要信息
   */
  /**
   * 为变更日志优化的值摘要方法
   * 对于关键路径（NPC记忆、事件等），保留更多信息以便正确显示
   */
  private _summarizeValueForChangeLog(key: string, value: any, action: string): any {
    // null 或 undefined 直接返回
    if (value === null || value === undefined) {
      return value;
    }

    // 基本类型直接返回
    if (typeof value !== 'object') {
      return value;
    }

    // 🔥 关键路径：对于 push/pull 操作，保留完整的新增/删除值
    if (action === 'push' || action === 'pull') {
      // 对于单个值的 push/pull，完整保留
      return cloneDeep(value);
    }

    // 🔥 关键路径：NPC记忆相关（社交.关系.*.人物记忆）
    if (key.includes('社交.关系.') && key.includes('.人物记忆')) {
      // 对于记忆数组，保留最后一个元素（最新记忆）
      if (Array.isArray(value) && value.length > 0) {
        return {
          __type: 'Array',
          __length: value.length,
          __summary: `[${value.length}条记忆]`,
          __last: cloneDeep(value[value.length - 1])
        };
      }
    }

    // 🔥 关键路径：事件记录
    if (key.includes('社交.事件') || key.includes('系统.事件')) {
      if (Array.isArray(value) && value.length > 0) {
        return {
          __type: 'Array',
          __length: value.length,
          __summary: `[${value.length}个事件]`,
          __last: cloneDeep(value[value.length - 1])
        };
      }
    }

    // 🔥 关键路径：短期记忆、中期记忆
    if (key.includes('记忆.短期记忆') || key.includes('记忆.中期记忆') || key.includes('记忆.隐式中期记忆')) {
      if (Array.isArray(value) && value.length > 0) {
        return {
          __type: 'Array',
          __length: value.length,
          __summary: `[${value.length}条记忆]`,
          __last: cloneDeep(value[value.length - 1])
        };
      }
    }

    // 其他情况使用原有的摘要逻辑
    return this._summarizeValue(value);
  }

  private _summarizeValue(value: any): any {
    // null 或 undefined 直接返回
    if (value === null || value === undefined) {
      return value;
    }

    // 基本类型直接返回
    if (typeof value !== 'object') {
      return value;
    }

    // 数组类型：根据大小决定是否摘要
    if (Array.isArray(value)) {
      // 小数组（≤3个元素）：完整保留
      if (value.length <= 3) {
        return cloneDeep(value);
      }
      // 大数组：只记录摘要信息
      return {
        __type: 'Array',
        __length: value.length,
        __summary: `[数组: ${value.length}个元素]`,
        __first: value[0] ? this._summarizeValue(value[0]) : undefined,
        __last: value[value.length - 1] ? this._summarizeValue(value[value.length - 1]) : undefined
      };
    }

    // 对象类型：检查是否是大型对象
    const keys = Object.keys(value);

    // 小对象（≤5个属性）：完整保留
    if (keys.length <= 5) {
      return cloneDeep(value);
    }

    // 大对象：只记录摘要信息
    const summary: any = {
      __type: 'Object',
      __keys: keys.length,
      __summary: `[对象: ${keys.length}个属性]`
    };

    // 保留前3个属性作为预览
    keys.slice(0, 3).forEach(key => {
      summary[key] = this._summarizeValue(value[key]);
    });

    return summary;
  }

  /** 局内与开局共用的生成设置：是否流式、是否分步、第2步用哪个 API 等 */
  private async resolveGenerationSettings(options?: ProcessOptions) {
    const { aiService } = await import('@/services/aiService');
    const { useAPIManagementStore } = await import('@/stores/apiManagementStore');
    const apiStore = useAPIManagementStore();

    const useStreaming = options?.useStreaming ?? aiService.getConfig().streaming ?? true;
    const splitEnabled = typeof options?.splitResponseGeneration === 'boolean'
      ? options.splitResponseGeneration
      : readSplitGenerationSetting();

    // 第2步：分配了独立的「指令生成」API 就用它，否则用主 API
    const instructionApi = apiStore.getAPIForType('instruction_generation');
    const step2UsageType: APIUsageType = instructionApi && instructionApi.id !== 'default' ? 'instruction_generation' : 'main';

    return {
      aiService,
      useStreaming,
      splitEnabled,
      step2UsageType,
      // 第2步可单独关闭流式（部分 API 不支持）；总开关关闭时强制关闭
      step2Streaming: !!apiStore.aiGenerationSettings?.splitStep2Streaming && useStreaming,
      step2ForceJson: aiService.isForceJsonEnabled(step2UsageType),
      mainForceJson: aiService.isForceJsonEnabled('main'),
    };
  }

  /** 「最近事件」注入：把短期记忆作为 assistant 消息发送，保证剧情衔接 */
  private buildRecentEventsInject(shortTermMemory: string[]): PromptInject | null {
    if (!shortTermMemory.length) return null;
    return {
      content: `# 【最近事件】\n${shortTermMemory.join('\n')}\n\n以上是刚刚发生的剧情。下一段正文紧接其后：衔接流畅，不重复已写内容，不与之矛盾。`,
      role: 'assistant',
      depth: 2,
      position: 'in_chat',
    };
  }

  /**
   * 分步生成第2步：最多请求 2 次，拿到非空指令即返回；都失败时返回空结果（正文照常显示）
   */
  private async generateSplitStep2(args: {
    request: (attempt: number) => Promise<string>;
    forceJson: boolean;
    actionOptionsEnabled: boolean;
    defaultActionOptions: string[];
    onProgressUpdate?: (progress: string) => void;
    isCancelled?: () => boolean;
    logTag: string;
  }): Promise<GM_Response> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (args.isCancelled?.()) throw new Error('请求已被取消');
      try {
        if (attempt > 1) args.onProgressUpdate?.('分步生成：第2步重试…');
        const raw = await args.request(attempt);
        const parsed = this.parseAIResponse(String(raw), args.forceJson, args.actionOptionsEnabled, args.defaultActionOptions);
        if (parsed.tavern_commands?.length) return parsed;
      } catch (e) {
        console.warn(`[${args.logTag}] 第2步第${attempt}次失败:`, e);
      }
    }
    return emptyGmResponse();
  }

  /**
   * 解析 AI 响应；标准解析失败时退回宽松提取（代码块 → 整体 JSON → text 字段正则 → 花括号片段 → 整段文本）
   */
  private parseAIResponseLenient(
    rawResponse: string,
    forceJsonMode: boolean,
    enableActionOptions: boolean,
    defaultActionOptions: string[],
  ): GM_Response {
    try {
      return this.parseAIResponse(rawResponse, forceJsonMode, enableActionOptions, defaultActionOptions);
    } catch (parseError) {
      console.error('[AI双向系统] 响应解析失败，尝试容错处理:', parseError);
    }

    const responseText = String(rawResponse).trim();
    type LooseResponse = Record<string, any>;
    const tryParse = (text: string | undefined): LooseResponse | null => {
      if (!text) return null;
      try {
        const obj = JSON.parse(text.trim());
        return obj && typeof obj === 'object' ? obj : null;
      } catch {
        return null;
      }
    };

    // 1. JSON 代码块（结尾 ``` 可缺失，兼容被截断的响应） 2. 整段 JSON 3. 花括号包裹的片段
    const obj =
      tryParse(responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?(?:```|$)/)?.[1]) ??
      tryParse(responseText) ??
      tryParse(responseText.match(/\{[\s\S]*"text"[\s\S]*\}/)?.[0]);

    let text = '';
    let memory = '';
    let commands: TavernCommand[] = [];
    let actionOptions: string[] = [];

    if (obj) {
      text = obj.text || obj.叙事文本 || obj.narrative || '';
      memory = obj.mid_term_memory || obj.中期记忆 || '';
      commands = obj.tavern_commands || obj.指令 || [];
      actionOptions = obj.action_options || [];
    }
    if (!text) {
      // 4. 只抽 text 字段 5. 实在不行把整段当正文
      const textMatch = responseText.match(/"(?:text|叙事文本|narrative)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      text = textMatch?.[1] ? textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : responseText;
    }

    // 双引号插图标记会截断 text 字段正则：从原文再捞一次
    const recovered = harvestStoryImages({ text, raw: responseText, obj });
    text = recovered.text;

    if (!enableActionOptions) {
      actionOptions = [];
    } else if (!actionOptions.length) {
      console.warn('[AI双向系统] ⚠️ 容错模式：action_options为空，使用默认选项');
      actionOptions = defaultActionOptions;
    }

    console.warn('[AI双向系统] 使用容错模式提取内容 - 文本长度:', text.length, '记忆:', memory.length, '指令数:', commands.length, '行动选项:', actionOptions.length);
    return {
      text,
      mid_term_memory: memory,
      tavern_commands: commands,
      action_options: this.sanitizeActionOptionsForDisplay(actionOptions),
      storyImages: recovered.images,
    };
  }

  private parseAIResponse(
    rawResponse: string,
    forceJsonMode: boolean = false,
    enableActionOptions: boolean = true,
    defaultActionOptions: string[] = DEFAULT_ACTION_OPTIONS,
  ): GM_Response {
    if (!rawResponse || typeof rawResponse !== 'string') {
      throw new Error('AI响应为空或格式错误');
    }

    // 🔥 先移除 <thinking> 标签内容（某些模型会输出思考过程）
    let rawText = rawResponse.trim();
    rawText = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    rawText = rawText.replace(/<thinking>[\s\S]*/gi, ''); // 移除未闭合的标签
    rawText = rawText.trim();


    const standardize = (obj: Record<string, unknown>): GM_Response => {
      const commands = Array.isArray(obj.tavern_commands) ? obj.tavern_commands :
                      Array.isArray(obj.指令) ? obj.指令 :
                      Array.isArray(obj.commands) ? obj.commands : [];

      const tavernCommands = commands.map((cmd: any) => ({
        action: cmd.action || 'set',
        key: cmd.key || '',
        value: cmd.value
      }));

      let actionOptions: unknown[] = [];
      if (enableActionOptions) {
        actionOptions = Array.isArray(obj.action_options) ? obj.action_options :
                        Array.isArray(obj.行动选项) ? obj.行动选项 : [];
      }

      const filtered = (Array.isArray(actionOptions) ? actionOptions : []).filter((opt: unknown) => typeof opt === 'string' && opt.trim().length > 0);

      let normalized = filtered as string[];
      if (enableActionOptions && normalized.length === 0) {
        console.warn('[parseAIResponse] ⚠️ action_options为空，使用默认选项');
        normalized = defaultActionOptions;
      }

      return {
        text: String(obj.text || obj.叙事文本 || obj.narrative || ''),
        mid_term_memory: String(obj.mid_term_memory || obj.中期记忆 || obj.memory || ''),
        tavern_commands: tavernCommands,
        action_options: enableActionOptions ? this.sanitizeActionOptionsForDisplay(normalized) : [],
        storyImages: parseStoryImagesFromObject(obj),
      };
    };

    // 🔥 核心策略：使用统一的智能JSON解析（根据forceJsonMode自动选择策略）
    try {
      const parsedObj = parseJsonSmart<Record<string, unknown>>(rawText, forceJsonMode);
      return standardize(parsedObj);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`无法解析AI响应：${message}`);
    }
  }
}

export const AIBidirectionalSystem = AIBidirectionalSystemClass.getInstance();

// 导出 getTavernHelper 以供其他模块使用
export { getTavernHelper };
