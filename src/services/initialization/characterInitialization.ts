/**
 * @fileoverview 角色初始化服务
 * 负责角色创建生成和完整初始化流程，包括AI动态生成。
 */

import { createStreamRelay } from '@/utils/tavernStreamRelay';
import { applyHehuanSectEasterEgg } from './hehuanEasterEgg';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, SaveData, PlayerStatus, WorldInfo, Continent } from '@/types/game';
import type { World, Origin, SpiritRoot } from '@/types';
import type { GM_Response, TavernCommand } from '@/types/AIGameMaster';
import { AIBidirectionalSystem } from '@/utils/AIBidirectionalSystem';
import { isTavernEnv } from '@/utils/tavern';
import { getNsfwSettingsFromStorage, ensureSystemConfigHasNsfw } from '@/utils/nsfw';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { buildCharacterInitializationPrompt, buildCharacterSelectionsSummary } from '@/utils/prompts/tasks/characterInitializationPrompts';
import { validateGameData } from '@/utils/dataValidation';
import { repairSaveData } from '@/utils/dataRepair';
import { migrateSaveDataToLatest } from '@/utils/saveMigration';
// 移除未使用的旧生成器导入,改用增强版生成器
// import { WorldGenerationConfig } from '@/utils/worldGeneration/gameWorldConfig';
import { EnhancedWorldGenerator } from '@/utils/worldGeneration/enhancedWorldGenerator';
// 导入本地数据库用于随机生成
import { LOCAL_SPIRIT_ROOTS, LOCAL_ORIGINS } from '@/data/creationData';

/**
 * 判断是否为随机灵根（辅助函数）
 */
function isRandomSpiritRoot(spiritRoot: string | object): boolean {
  if (typeof spiritRoot === 'string') {
    return spiritRoot === '随机灵根' || spiritRoot.includes('随机');
  }
  return false;
}

/**
 * 询问用户是否继续重试的辅助函数
 * @param taskName 任务名称
 * @param errorMessage 错误信息
 * @returns 用户是否选择重试
 */
// #region 取消开局生成
/** App.vue 靠这句话识别「用户主动取消」，不要改动文案 */
export const CREATION_CANCELLED_MESSAGE = '用户选择终止角色创建';
let creationCancelled = false;

/** 用户在加载遮罩上点了取消：打断当前请求，并让后续重试全部停下 */
export function requestCreationCancel(): void {
  creationCancelled = true;
  void import('@/services/aiService').then(({ aiService }) => aiService.cancelAllRequests());
}

/** 每次开始（或整体重试）创建前调用 */
export function resetCreationCancel(): void {
  creationCancelled = false;
}

export const isCreationCancelled = (): boolean => creationCancelled;

function throwIfCreationCancelled(): void {
  if (creationCancelled) throw new Error(CREATION_CANCELLED_MESSAGE);
}
// #endregion

async function askUserForRetry(taskName: string, errorMessage: string): Promise<boolean> {
  return new Promise((resolve) => {
    const uiStore = useUIStore();
    uiStore.showRetryDialog({
      title: `${taskName}失败`,
      message: `${taskName}经过多次尝试后仍然失败。\n\n错误信息：${errorMessage}\n\n是否继续重试？\n选择"取消"将终止角色创建流程。`,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
}

/**
 * 创建一个健壮的、可重试的AI调用包装器，集成了自动重试和用户确认功能
 * @param aiFunction 要调用的AI生成函数
 * @param validator 验证AI响应是否有效的函数
 * @param maxRetries 最大自动重试次数
 * @param progressMessage 进行时显示的toast消息
 * @returns AI调用的返回结果
 */
async function robustAICall<T>(
  aiFunction: () => Promise<T>,
  validator: (response: T) => boolean,
  maxRetries: number,
  progressMessage: string
): Promise<T> {
  const uiStore = useUIStore();
  let lastError: Error | null = null;
  let attempt = 0;

  while (true) {
    attempt++;
    throwIfCreationCancelled();
    try {
      if (attempt > 1) {
        uiStore.resetLoadingStream();
        uiStore.setLoadingStageDetail(`响应未通过校验，第 ${attempt - 1} 次重试`);
      }
      console.log(`[robustAICall] 正在尝试: ${progressMessage}, 第 ${attempt} 次`);
      const response = await aiFunction();
      console.log(`[robustAICall] 收到响应 for ${progressMessage}:`, response);

      if (validator(response)) {
        console.log(`[robustAICall] 响应验证成功 for ${progressMessage}`);
        return response;
      }
      throw new Error(`AI响应格式无效或未通过验证`);

    } catch (error) {
      throwIfCreationCancelled();
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[AI调用重试] 第 ${attempt} 次尝试失败:`, lastError.message);

      if (attempt > maxRetries) {
        const userWantsToRetry = await askUserForRetry(progressMessage, lastError.message);
        if (userWantsToRetry) {
          attempt = 0; // 重置计数器，开始新一轮的用户确认重试
          continue;
        } else {
          throw new Error(`${progressMessage}失败，用户选择不继续重试: ${lastError.message}`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 递增延迟
    }
  }
}

/**
 * 计算角色的初始属性值
 */
export function calculateInitialAttributes(baseInfo: CharacterBaseInfo, age: number): PlayerStatus {
  const { 先天六司 } = baseInfo;

  // 确保先天六司都是有效的数值，避免NaN
  // ⚠️ 使用 ?? 而不是 ||，因为 || 会将 0 视为 falsy 值
  const 根骨 = Number(先天六司?.根骨 ?? 0);
  const 灵性 = Number(先天六司?.灵性 ?? 0);
  const 悟性 = Number(先天六司?.悟性 ?? 0);

  // 基础属性计算公式
  const 初始气血 = 100 + 根骨 * 10;
  const 初始灵气 = 50 + 灵性 * 5;
  const 初始神识 = 30 + 悟性 * 3;

  // -- 寿命计算逻辑 --
  const 基础寿命 = 80; // 凡人基础寿命
  const 根骨寿命系数 = 5; // 每点根骨增加5年寿命
  const 最大寿命 = 基础寿命 + 根骨 * 根骨寿命系数;

  console.log(`[角色初始化] 属性计算: 气血=${初始气血}, 灵气=${初始灵气}, 神识=${初始神识}, 年龄=${age}/${最大寿命}`);
  console.log(`[角色初始化] 先天六司: 根骨=${根骨}, 灵性=${灵性}, 悟性=${悟性}`);

  return {
    境界: {
      名称: "凡人",
      阶段: "",
      当前进度: 0,
      下一级所需: 100,
      突破描述: "引气入体，感悟天地灵气，踏上修仙第一步"
    },
    声望: 0, // 声望应该是数字类型
    位置: {
      描述: "位置生成失败" // 标记为错误状态而不是默认值
    },
    气血: { 当前: 初始气血, 上限: 初始气血 },
    灵气: { 当前: 初始灵气, 上限: 初始灵气 },
    神识: { 当前: 初始神识, 上限: 初始神识 },
    寿命: { 当前: age, 上限: 最大寿命 }
  };
}

// =================================================================
// #region 角色初始化 - 辅助函数
// =================================================================

/**
 * 准备初始存档数据结构
 * @param baseInfo - 角色
 * @param age - 角色年龄
 * @returns 初始化后的存档数据和经过处理的baseInfo
 */
function prepareInitialData(baseInfo: CharacterBaseInfo, age: number): { saveData: SaveData; processedBaseInfo: CharacterBaseInfo } {
  console.log('[初始化流程] 1. 准备初始存档数据');
  console.log('[初始化流程] prepareInitialData 接收到的 baseInfo.先天六司:', baseInfo.先天六司);

  // 深度克隆以移除响应式代理
  // 直接使用 JSON 方式，因为 baseInfo 可能包含 Vue 响应式对象
  let processedBaseInfo: CharacterBaseInfo;
  try {
    // 使用 JSON 序列化来移除响应式代理和不可序列化的属性
    processedBaseInfo = JSON.parse(JSON.stringify(baseInfo));
    console.log('[初始化流程] JSON 序列化后的 processedBaseInfo.先天六司:', processedBaseInfo.先天六司);
  } catch (jsonError) {
    console.error('[角色初始化] JSON 序列化失败，使用原始对象', jsonError);
    processedBaseInfo = baseInfo;
  }


  // 🔥 修复：时间使用age作为初始年份，确保出生日期为0年
  // AI会在初始化响应中通过tavern_commands设置正确的时间（如果需要）
  const 临时时间 = { 年: age, 月: 1, 日: 1, 小时: Math.floor(Math.random() * 12) + 6, 分钟: Math.floor(Math.random() * 60) };

  // 计算出生日期：时间 - 开局年龄 = 出生年份
  // 例如：开局年龄18岁，时间18年，则出生日期为0年
  if (!processedBaseInfo.出生日期) {
    processedBaseInfo.出生日期 = {
      年: 临时时间.年 - age,
      月: 临时时间.月,
      日: 临时时间.日,
      小时: 0,
      分钟: 0
    };
    console.log(`[角色初始化] 临时出生日期(AI可能会重新计算): ${processedBaseInfo.出生日期.年}年${processedBaseInfo.出生日期.月}月${processedBaseInfo.出生日期.日}日 (当前${age}岁)`);
  }

  // 注意：不再在此处理随机灵根和随机出生，完全交给 AI 处理
  // AI 会根据提示词中的引导，创造性地生成独特的灵根和出生
  // 这样可以避免固定的套路，每次初始化都会有不同的结果

  // 确保后天六司存在，开局默认全为0
  if (!processedBaseInfo.后天六司) {
    processedBaseInfo.后天六司 = {
      根骨: 0,
      灵性: 0,
      悟性: 0,
      气运: 0,
      魅力: 0,
      心性: 0
    };
    console.log('[角色初始化] 初始化后天六司为全0');
  }

  if (isRandomSpiritRoot(processedBaseInfo.灵根)) {
    console.log('[灵根生成] 检测到随机灵根，将由 AI 创造性生成');
    // 保留"随机灵根"字符串，让 AI 处理
  } else {
    console.log('[灵根生成] 检测到玩家已选择特定灵根，将直接使用该灵根，不进行随机化处理。');
  }

  if (typeof processedBaseInfo.出生 === 'string' &&
      (processedBaseInfo.出生 === '随机出生' || processedBaseInfo.出生.includes('随机'))) {
    console.log('[出生生成] 检测到随机出生，将由 AI 创造性生成');
    // 保留"随机出生"字符串，让 AI 处理
  }

  // 计算初始属性
  const playerStatus = calculateInitialAttributes(processedBaseInfo, age);
  const attributes = {
    境界: playerStatus.境界,
    声望: playerStatus.声望,
    气血: playerStatus.气血,
    灵气: playerStatus.灵气,
    神识: playerStatus.神识,
    寿命: playerStatus.寿命,
  };
  const location = playerStatus.位置;

  // 创建基础存档结构
  const tavernEnv = isTavernEnv();
  const legacySaveData: SaveData = {
    角色: processedBaseInfo,
    属性: attributes as any,
    位置: location as any,
    效果: [],
    // 🔥 时间：使用age作为初始年份，AI可以通过tavern_commands修改
    时间: { 年: age, 月: 1, 日: 1, 小时: Math.floor(Math.random() * 12) + 6, 分钟: Math.floor(Math.random() * 60) },
    背包: { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} },
    装备: { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null },
    功法: {
      当前功法ID: null,
      功法进度: {},
      功法套装: { 主修: null, 辅修: [] },
    },
    修炼: {
      修炼功法: null,
    },
    大道: createEmptyThousandDaoSystem(),
    技能: { 掌握技能: [], 装备栏: [], 冷却: {} },
    宗门: undefined,
    事件: {
      配置: {
        启用随机事件: true,
        最小间隔年: 1,
        最大间隔年: 10,
        事件提示词: '',
      },
      下次事件时间: null,
      事件记录: [],
    },
    记忆: { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] },
    关系: {},
    历史: { 叙事: [] },
    系统: {
      规则: {
        属性上限: { 先天六司: { 每项上限: 10 } },
        // 装备系统
        装备系统: '装备存储引用{物品ID,名称}，完整数据在背包.物品中',
        品质控制: '严格遵守境界对应品质范围，仙品世界上几乎没有，每一个都是令世界动荡的存在，神品不存在'
      },
      提示: [
        '⚠️ 先创建后修改：修改数据前必须确保数据已存在',
        '装备字段：装备1-6'
      ],
      ...(tavernEnv ? {
        // 🔥 NSFW设置：从localStorage读取用户设置
        ...getNsfwSettingsFromStorage()
      } : {})
    }
  };

  // 🔥 初始化玩家身体详细数据（酒馆模式）
  // 酒馆端：无论 NSFW 开关，都初始化身体骨架（用于法身面板展示基础体格）
  // AI 会根据提示词在初始化时填充基础体格数据（身高/体重/三围等）
  // 敏感字段（胸部描述/私处描述等）仅在 nsfwMode=true 时由 AI 生成
  if (tavernEnv) {
    console.log('[角色初始化] 酒馆端检测：初始化角色.身体骨架（等待AI生成法身数据）');
    legacySaveData.身体 = { 部位开发: {}, 部位: {} } as any;
  }

  // 开局阶段统一返回 V3 五域结构，保证后续提示词/指令使用短路径生效
  const { migrated } = migrateSaveDataToLatest(legacySaveData as any);
  return { saveData: migrated as any, processedBaseInfo };
}

/**
 * 生成世界数据
 * @param baseInfo - 角色
 * @param world - 基础世界
 * @returns 生成的世界
 */
async function generateWorld(baseInfo: CharacterBaseInfo, world: World): Promise<WorldInfo> {
  console.log('[初始化流程] 2. 生成世界数据');
  const uiStore = useUIStore();
  uiStore.enterLoadingStage('world', '准备世界参数');
  uiStore.setLoadingStreamKind('world');
  // 独立 API 走回调、酒馆默认 API 走事件：两路都接，锁定先到的一路
  const worldRelay = createStreamRelay((chunk) => uiStore.appendLoadingStream(chunk, 'world'));

  const characterCreationStore = useCharacterCreationStore();
  const userWorldConfig = characterCreationStore.worldGenerationConfig;
  const selectedWorld = characterCreationStore.selectedWorld;

  const extractName = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && '名称' in (value as Record<string, unknown>)) {
      const n = (value as Record<string, unknown>).名称;
      if (typeof n === 'string') return n;
    }
    return String(value ?? '');
  };

  // 🔥 使用用户配置的世界规模参数，这些参数会直接影响AI生成的世界内容
  console.log('[世界生成] 用户配置的世界规模:', {
    主要势力: userWorldConfig.majorFactionsCount,
    地点总数: userWorldConfig.totalLocations,
    秘境数量: userWorldConfig.secretRealmsCount,
    大陆数量: userWorldConfig.continentCount,
    仅生成大陆: userWorldConfig.generateOnlyContinents
  });

  // 🔥 根据"仅生成大陆"配置决定是否生成势力和地点
  const shouldGenerateFactions = !userWorldConfig.generateOnlyContinents;
  const factionCount = shouldGenerateFactions ? (userWorldConfig.majorFactionsCount || 5) : 0;
  const locationCount = shouldGenerateFactions ? (userWorldConfig.totalLocations || 12) : 0;
  const secretRealmsCount = shouldGenerateFactions ? (userWorldConfig.secretRealmsCount || 5) : 0;
  uiStore.setWorldGenTargets({
    continents: userWorldConfig.continentCount || 4,
    factions: factionCount,
    locations: locationCount,
  });

  if (userWorldConfig.generateOnlyContinents) {
    console.log('[世界生成] ✅ 开启"仅生成大陆"模式，势力、地点和秘境将在局内动态生成');
  } else {
    console.log('[世界生成] 📋 完整世界生成模式，将生成势力、地点和秘境');
  }

  const enhancedConfig = {
    worldName: selectedWorld?.name || world.name,
    worldBackground: (selectedWorld?.description ?? world.description) ?? undefined,
    worldEra: (selectedWorld?.era ?? world.era) ?? undefined,
    factionCount: factionCount,
    locationCount: locationCount,
    secretRealmsCount: secretRealmsCount,
    continentCount: userWorldConfig.continentCount || 4,        // 默认4片大陆
    maxRetries: 3,
    retryDelay: 2000,
    characterBackground: extractName(baseInfo.出生),
    mapConfig: (userWorldConfig as any).mapConfig,
    useStreaming: characterCreationStore.useStreamingStart,
    // 遮罩实时预览：从流式 JSON 中抽取已生成的大陆 / 势力 / 地点
    onStreamChunk: worldRelay.direct,
    shouldAbort: isCreationCancelled,
    onRetry: (attempt: number, reason: string) => {
      worldRelay.resetSource();
      uiStore.resetLoadingStream();
      const shortReason = reason.length > 40 ? `${reason.slice(0, 40)}…` : reason;
      uiStore.setLoadingStageDetail(`第 ${attempt} 次重试${shortReason ? `（${shortReason}）` : ''}`);
    }
  };

  console.log('[初始化流程] 开始调用世界生成器...');
  uiStore.setLoadingStageDetail(userWorldConfig.generateOnlyContinents ? 'AI 正在勾勒大陆格局' : 'AI 正在构筑大陆、势力与地点');
  const enhancedWorldGenerator = new EnhancedWorldGenerator(enhancedConfig);

  const startTime = Date.now();
  let worldGenerationResult: Awaited<ReturnType<typeof enhancedWorldGenerator.generateValidatedWorld>>;
  try {
    worldGenerationResult = await enhancedWorldGenerator.generateValidatedWorld();
  } finally {
    worldRelay.dispose();
  }
  throwIfCreationCancelled();
  const elapsed = Date.now() - startTime;
  console.log(`[初始化流程] 世界生成器返回,耗时: ${elapsed}ms`);

  if (worldGenerationResult.success && worldGenerationResult.worldInfo) {
    console.log('[初始化流程] 世界生成成功');
    const info = worldGenerationResult.worldInfo;
    const summary = [
      `${info.大陆信息?.length ?? 0} 片大陆`,
      shouldGenerateFactions ? `${info.势力信息?.length ?? 0} 个势力` : '',
      shouldGenerateFactions ? `${info.地点信息?.length ?? 0} 处地点` : '',
    ].filter(Boolean).join(' · ');
    uiStore.setLoadingStageDetail(summary);
    return worldGenerationResult.worldInfo;
  } else {
    throw new Error(`世界生成失败：${worldGenerationResult.errors?.join(', ') || '未知错误'}`);
  }
}

/**
 * 生成开场剧情和初始状态
 * @param saveData - 当前存档数据
 * @param baseInfo - 角色
 * @param world - 世界
 * @param age - 开局年龄
 * @param useStreaming - 是否使用流式传输（默认true）
 * @param generateMode - 生成模式：generate（标准）或 generateRaw（纯净）
 * @param splitResponseGeneration - 是否使用分步生成（默认false，一次性生成）
 * @returns 包含开场剧情和AI指令的响应
 */
async function generateOpeningScene(saveData: SaveData, baseInfo: CharacterBaseInfo, world: World, age: number, useStreaming: boolean = true, generateMode: 'generate' | 'generateRaw' = 'generate', splitResponseGeneration: boolean = false) {
  console.log('[初始化流程] 3. 生成开场剧情');
  const uiStore = useUIStore();
  const tavernEnv = isTavernEnv();
  const nsfwEnabled = tavernEnv && Boolean((saveData as any).系统?.配置?.nsfwMode);
  uiStore.enterLoadingStage('story', nsfwEnabled ? '整理设定（含法身数据）' : '整理角色设定');
  uiStore.setLoadingStreamKind('story'); // 清掉上一步（世界）的预览

  // 🔥 现在baseInfo中的字段已经是完整对象了
  const characterCreationStore = useCharacterCreationStore();
  const userSelections = {
    name: baseInfo.名字,
    gender: baseInfo.性别,
    race: baseInfo.种族 ?? '人族', // 使用 ?? 而不是 ||，避免空字符串被当作 falsy
    age: age,
    // 🔥 关键修复：传递完整的世界对象而不仅仅是名称
    world: baseInfo.世界 || world, // 优先使用 baseInfo 中的完整对象
    talentTier: baseInfo.天资, // 现在是完整对象
    origin: baseInfo.出生,     // 现在是完整对象或"随机出身"
    spiritRoot: baseInfo.灵根, // 现在是完整对象或"随机灵根"
    talents: baseInfo.天赋 || [], // 现在是完整对象数组
    attributes: (baseInfo.先天六司 || {}) as unknown as Record<string, number>,
    difficultyPrompt: characterCreationStore.currentDifficultyPrompt // 🔥 添加难度提示词
  };

  console.log('[初始化] 🔥 用户选择数据检查:');
  console.log('  - 种族:', baseInfo.种族, '->', userSelections.race);
  console.log('  - 天资:', userSelections.talentTier);
  console.log('  - 出身:', userSelections.origin);
  console.log('  - 灵根:', userSelections.spiritRoot);
  console.log('  - 天赋数量:', userSelections.talents?.length);
  console.log('  - 难度:', characterCreationStore.gameDifficulty);

  // 🔥 准备世界上下文信息
  const worldContext = {
    worldInfo: (saveData as any).世界?.信息,
    availableContinents: (saveData as any).世界?.信息?.大陆信息?.map((continent: Continent) => ({
      名称: continent.名称,
      描述: continent.描述,
      大洲边界: continent.大洲边界
    })) || [],
    availableLocations: (saveData as any).世界?.信息?.地点信息?.map((location: { name?: string; 名称?: string; type?: string; 类型?: string; description?: string; 描述?: string; faction?: string; 所属势力?: string; coordinates?: unknown }) => ({
      名称: location.name || location.名称,
      类型: location.type || location.类型,
      描述: location.description || location.描述,
      所属势力: location.faction || location.所属势力,
      coordinates: location.coordinates
    })) || [],
    mapConfig: (saveData as any).世界?.信息?.地图配置,
    systemSettings: {
      ...(tavernEnv
        ? (ensureSystemConfigHasNsfw((saveData as any).系统?.配置 ?? {}) as any)
        : ((saveData as any).系统?.配置 || {})),
      // 🔥 明确标识当前是否为酒馆环境，用于提示词判断是否需要生成法身数据
      isTavernEnv: tavernEnv
    }
  };

  console.log('[初始化] 🔥 世界检查:');
  console.log('  - 世界描述:', (saveData as any).世界?.信息?.世界背景 || '未找到');
  console.log('  - 大陆数量:', worldContext.availableContinents.length);
  console.log('  - 地点数量:', worldContext.availableLocations.length);

  const systemPrompt = await buildCharacterInitializationPrompt();
  const selectionsSummary = buildCharacterSelectionsSummary(userSelections, worldContext);

  const userPrompt = `我创建了角色"${baseInfo.名字}"，请根据我的选择生成开局故事和初始数据。

${selectionsSummary}

**重要提示**：
- 严格按照我的角色设定来生成内容
- 我选择的是什么样的出身、天赋、灵根，你就如实展现
- 不要强加任何预设的剧情方向或生活方式
- 这只是一个开始，我的人生我做主`;

  console.log(`[初始化] 准备生成开场剧情，角色: ${baseInfo.名字}`);
  console.log(`[初始化] 可用大陆列表:`, worldContext.availableContinents.map((c: any) => c.名称));
  console.log(`[初始化] 可用地点数量:`, worldContext.availableLocations?.length || 0);

  // 分步生成：第 1 步正文归「书写开篇」，第 2 步指令归独立的「推演指令」步骤（App.vue 仅在分步时加入该步骤）
  let streamPhase: 'story' | 'commands' = 'story';
  let storyChars = 0;
  let oneShotCommandsStarted = false;
  const activeStageKey = () => uiStore.loadingStages.find((stage) => stage.status === 'active')?.key;

  // AI 进度文案 → 遮罩上的步骤细节
  const describeProgress = (status: string): string => {
    if (status.includes('第1步')) return '撰写开局正文';
    if (status.includes('第2步') && status.includes('重试')) return '上次输出无效，重新生成';
    if (status.includes('思维链')) return '梳理剧情并生成指令';
    if (status.includes('第2步')) return '生成状态、物品、位置等指令';
    if (status.includes('优化') || status.includes('润色')) return '润色正文';
    if (status.includes('请求AI')) return '请求 AI 撰写开局';
    return status.replace(/[….]+$/, '');
  };

  const handleOpeningChunk = (chunk: string) => {
    if (streamPhase === 'story') storyChars += chunk.length;
    uiStore.appendLoadingStream(chunk, streamPhase);
    // 新一轮流式（如整体重试后）从头开始
    if (uiStore.loadingStream.length <= chunk.length) oneShotCommandsStarted = false;
    // 一次性生成：JSON 写到指令部分时更新步骤说明（遮罩预览会同时切到指令列表）
    if (!splitResponseGeneration && !oneShotCommandsStarted && uiStore.loadingStream.includes('"tavern_commands"')) {
      oneShotCommandsStarted = true;
      uiStore.setLoadingStageDetail('正文已写完，正在生成指令');
    }
  };

  const initialMessageResponse = await robustAICall(
async () => {
  console.log('[初始化] ===== 开始生成开场剧情 =====');
  const startTime = Date.now();
  // 独立 API 走 onStreamChunk、酒馆默认 API 走流式事件：两路都接，锁定先到的一路
  const openingRelay = createStreamRelay(handleOpeningChunk);
  try {
    // 🔥 [新架构] 使用 AIBidirectionalSystem 生成初始消息
    const aiSystem = AIBidirectionalSystem;
    const response = await aiSystem.generateInitialMessage(systemPrompt, userPrompt, {
      useStreaming,
      generateMode,
      splitResponseGeneration,
      isCancelled: isCreationCancelled,
      onStreamChunk: openingRelay.direct,
      onProgressUpdate: (status: string) => {
        // 每个进度节点都是一次新请求的开始，重新判定流式来源
        openingRelay.resetSource();
        if (status.includes('第2步')) {
          // 进入第 2 步（或其重试）：切到「推演指令」步骤，预览换成指令视图
          if (streamPhase !== 'commands') {
            if (storyChars > 0) uiStore.setLoadingStageDetail(`正文约 ${storyChars.toLocaleString()} 字`, 'story');
            uiStore.enterLoadingStage('commands');
          }
          streamPhase = 'commands';
          uiStore.setLoadingStreamKind('commands');
        } else if (status.includes('第1步')) {
          // 首次进入或整体重试：回到「书写开篇」
          streamPhase = 'story';
          storyChars = 0;
          oneShotCommandsStarted = false;
          if (activeStageKey() !== 'story') uiStore.enterLoadingStage('story');
        }
        uiStore.setLoadingStageDetail(describeProgress(status));
      }
    });

    const elapsed = Date.now() - startTime;
    console.log(`[初始化] ✅ AI生成完成,耗时: ${elapsed}ms, 流式模式: ${useStreaming}, 生成模式: ${generateMode}, 分步生成: ${splitResponseGeneration}`);

    // generateInitialMessage 内部已经解析，这里直接返回
    return response;
  } catch (error) {
    console.error(`[初始化] ❌ AI生成失败:`, error);
    throw error;
  } finally {
    openingRelay.dispose();
  }
},
    (response: GM_Response) => {
      // 🔥 增强版验证器：提供详细的诊断信息
      console.log('[AI验证-诊断] ===== 开始验证AI响应 =====');
      console.log('[AI验证-诊断] 响应类型:', typeof response);
      console.log('[AI验证-诊断] 响应内容(前500字):', JSON.stringify(response).substring(0, 500));

      // 1. 基本结构检查
      if (!response || typeof response !== 'object') {
        console.warn('[AI验证] ❌ 响应不是对象，实际类型:', typeof response);
        console.warn('[AI验证] 响应内容:', response);
        return false;
      }

      // 2. 文本内容检查
      if (!response.text || typeof response.text !== 'string') {
        console.warn('[AI验证] ❌ text字段无效');
        console.warn('[AI验证] text值:', response.text);
        return false;
      }

      if (response.text.trim().length < 200) {
        console.warn('[AI验证] ❌ 文本太短 (长度:', response.text.length, ')');
        return false;
      }

      // 3. 占位符检查
      if (response.text.includes('placeholder') || response.text.includes('TODO') || response.text.includes('待填充')) {
        console.warn('[AI验证] ❌ 文本包含占位符');
        return false;
      }

      // 4. 🔥 tavern_commands检查（更详细）
      if (!Array.isArray(response.tavern_commands)) {
        console.warn('[AI验证] ❌ tavern_commands不是数组，实际类型:', typeof response.tavern_commands);
        console.warn('[AI验证] tavern_commands值:', response.tavern_commands);
        return false;
      }

      if (response.tavern_commands.length === 0) {
        console.warn('[AI验证] ❌ tavern_commands是空数组');
        return false;
      }

      console.log('[AI验证-诊断] tavern_commands数量:', response.tavern_commands.length);

      // 5. 位置命令检查 - 兼容旧路径/新路径；缺失则交给后续兜底
      const locationCommand = response.tavern_commands.find((cmd: TavernCommand) => {
        if (!cmd || cmd.action !== 'set') return false;
        return cmd.key === '角色.位置' || cmd.key === '位置';
      });

      if (!locationCommand) {
        console.warn('[AI验证] ⚠️ 未提供位置命令（将继续流程，后续由默认值/最终校验兜底）');
      } else {
        // 6. 位置对象验证
        const locationValue = locationCommand.value;
        if (!locationValue || typeof locationValue !== 'object') {
          console.warn('[AI验证] ❌ 位置值不是对象，类型:', typeof locationValue);
          console.warn('[AI验证] 位置值:', locationValue);
          return false;
        }

        const locationObj = locationValue as { 描述?: string; x?: number; y?: number };

        // 验证描述字段
        if (!locationObj.描述 || typeof locationObj.描述 !== 'string' || locationObj.描述.trim().length === 0) {
          console.warn('[AI验证] ❌ 位置描述无效');
          console.warn('[AI验证] 描述值:', locationObj.描述);
          return false;
        }

        if (locationObj.描述.includes('undefined') || locationObj.描述.includes('null')) {
          console.warn('[AI验证] ❌ 位置描述包含无效内容:', locationObj.描述);
          return false;
        }

        // 验证坐标字段
        if (typeof locationObj.x !== 'number' || typeof locationObj.y !== 'number') {
          console.warn('[AI验证] ❌ 位置坐标无效');
          console.warn('[AI验证] x:', locationObj.x, 'y:', locationObj.y);
          return false;
        }

        console.log('[AI验证] ✅ 位置命令有效:', locationObj.描述, `(${locationObj.x}, ${locationObj.y})`);
      }

      // 7. 🔥 action_options检查
      if (!Array.isArray(response.action_options)) {
        console.warn('[AI验证] ⚠️ action_options不是数组，将使用默认选项');
        // 不返回false，因为解析层会补充默认选项
      } else if (response.action_options.length === 0) {
        console.warn('[AI验证] ⚠️ action_options是空数组，将使用默认选项');
        // 不返回false，因为解析层会补充默认选项
      } else {
        console.log('[AI验证] ✅ action_options有效，数量:', response.action_options.length);
      }

      console.log('[AI验证] ✅ 所有验证通过');
      return true;
    },
    3,
    '天道正在书写命运之章'
  );

  // =================================================================
  // 步骤 3.4: 处理AI响应
  // =================================================================


  throwIfCreationCancelled();
  const openingCommands = (initialMessageResponse as GM_Response).tavern_commands ?? [];
  const openingTextLength = (initialMessageResponse as GM_Response).text?.length ?? 0;
  if (uiStore.loadingStages.some((stage) => stage.key === 'commands')) {
    uiStore.setLoadingStageDetail(`正文 ${openingTextLength.toLocaleString()} 字`, 'story');
    uiStore.setLoadingStageDetail(`${openingCommands.length} 条指令`, 'commands');
  } else {
    uiStore.setLoadingStageDetail(`正文 ${openingTextLength.toLocaleString()} 字 · 指令 ${openingCommands.length} 条`, 'story');
  }
  uiStore.enterLoadingStage('apply', `执行 ${openingCommands.length} 条剧情指令`);
  // 遮罩预览：列出本次开局要执行的全部指令（替换掉流式时的半截内容），一直保留到进入游戏
  uiStore.setLoadingStreamKind('commands');
  uiStore.appendLoadingStream(JSON.stringify({ tavern_commands: openingCommands }), 'commands');
  const aiSystem = AIBidirectionalSystem;
  const { saveData: saveDataAfterCommands, stateChanges } = await aiSystem.processGmResponse(initialMessageResponse as GM_Response, saveData, true);

  // 🔥 [关键修复] 用AI生成的具体内容替换"随机"选项
  const creationStore = useCharacterCreationStore();

  // 如果用户选择了随机灵根，用AI生成的具体灵根替换
  if (creationStore.selectedSpiritRoot?.name === '随机灵根' && (saveDataAfterCommands as any).角色?.身份?.灵根) {
    const aiSpiritRoot = (saveDataAfterCommands as any).角色.身份.灵根;
    if (typeof aiSpiritRoot === 'object') {
      creationStore.setAIGeneratedSpiritRoot(aiSpiritRoot as SpiritRoot);
    }
  }

  // 如果用户选择了随机出生，用AI生成的具体出生替换
  if (creationStore.selectedOrigin?.name === '随机出身' && (saveDataAfterCommands as any).角色?.身份?.出生) {
    const aiOrigin = (saveDataAfterCommands as any).角色.身份.出生;
    if (typeof aiOrigin === 'object') {
      creationStore.setAIGeneratedOrigin(aiOrigin as Origin);
    }
  }

  // 应用到Pinia Store
  const gameStateStore = useGameStateStore();
  gameStateStore.loadFromSaveData(saveDataAfterCommands);
  void import('@/services/storyImageRunner').then((mod) => mod.runPendingStoryImages());

  if (nsfwEnabled) {
    const hasBodyCommands = Array.isArray((initialMessageResponse as any).tavern_commands)
      ? ((initialMessageResponse as any).tavern_commands as TavernCommand[]).some((cmd) => {
          if (!cmd || cmd.action !== 'set') return false;
          const key = (cmd as any).key;
          return typeof key === 'string' && (key.startsWith('角色.身体') || key.startsWith('身体.'));
        })
      : false;
    if (hasBodyCommands) toast.success('已生成法身数据（酒馆）');
  }

  const openingStory = String(initialMessageResponse.text || '');
  if (!openingStory.trim()) {
    throw new Error('AI生成的开场剧情为空');
  }


  // 将 stateChanges 添加到最后一条叙事记录中
  if ((saveDataAfterCommands as any).系统?.历史?.叙事 && (saveDataAfterCommands as any).系统.历史.叙事.length > 0) {
    (saveDataAfterCommands as any).系统.历史.叙事[(saveDataAfterCommands as any).系统.历史.叙事.length - 1].stateChanges =
      stateChanges;
  }




  return { finalSaveData: saveDataAfterCommands, aiResponse: initialMessageResponse };
}

/**
 * 从详情对象派生基础字段，确保数据一致性
 * @param baseInfo - 包含详情对象的基础信息
 * @param worldName - 世界名称
 * @returns 派生了基础字段的基础信息
 */
function deriveBaseFieldsFromDetails(baseInfo: CharacterBaseInfo): CharacterBaseInfo {
  const derivedInfo = { ...baseInfo };
  const creationStore = useCharacterCreationStore();

  console.log('[数据校准] 开始从创角仓库同步所有权威数据...');
  console.log('[数据校准] 【重要】所有用户手动选择的数据都将被保护，不被AI或代码修改');

  // 1. 世界 - 已经由 baseInfo 传入，这里不再覆盖
  // derivedInfo.世界 = worldName; // worldName is just a string, baseInfo.世界 is a World object

  // 2. 天资 (Talent Tier) - 用户必选
  const authoritativeTalentTier = creationStore.selectedTalentTier;
  if (authoritativeTalentTier) {
    console.log(`[数据校准] ✅ 同步用户选择的天资: ${authoritativeTalentTier.name}`);
    derivedInfo.天资 = authoritativeTalentTier;
  } else {
    console.warn('[数据校准] 警告: 无法找到权威的天资数据。');
  }

  // 3. 出身 (Origin) - 如果AI已生成具体出身，则保留AI生成的
  const authoritativeOrigin = creationStore.selectedOrigin;
  const hasAIGeneratedOrigin = derivedInfo.出生 && typeof derivedInfo.出生 === 'object' && (derivedInfo.出生 as any).名称 !== '随机出身';

  if (authoritativeOrigin && !hasAIGeneratedOrigin) {
    console.log(`[数据校准] ✅ 同步用户选择的出身: ${authoritativeOrigin.name}`);
    derivedInfo.出生 = authoritativeOrigin;
  } else if (hasAIGeneratedOrigin) {
    // 如果用户选择随机，并且一个具体的对象已经存在（由AI或后备逻辑生成），则直接信任和保留它。
    console.log('[数据校准] ✅ 保留已生成的具体出身:', (derivedInfo.出生 as Origin).name);
  } else if (creationStore.characterPayload.origin_id === null) {
    // 仅当没有生成任何具体出身时，才可能需要标记回随机（作为最后的保险措施）
    console.log('[数据校准] 🎲 用户选择随机出身，但无有效生成值，标记为随机');
    derivedInfo.出生 = '随机出身';
  } else {
    console.warn('[数据校准] 警告: 无法找到权威的出身数据。');
  }

  // 4. 灵根 (Spirit Root) - 如果AI已生成具体灵根，则保留AI生成的
  const authoritativeSpiritRoot = creationStore.selectedSpiritRoot;
  const hasAIGeneratedSpiritRoot = derivedInfo.灵根 && typeof derivedInfo.灵根 === 'object' && (derivedInfo.灵根 as any).名称 !== '随机灵根';

  if (authoritativeSpiritRoot && !hasAIGeneratedSpiritRoot) {
    console.log(`[数据校准] ✅ 同步用户选择的灵根: ${authoritativeSpiritRoot.name} (${authoritativeSpiritRoot.tier})`);
    derivedInfo.灵根 = authoritativeSpiritRoot;
  } else if (hasAIGeneratedSpiritRoot) {
    // 如果用户选择随机，并且一个具体的对象已经存在（由AI或后备逻辑生成），则直接信任和保留它。
    console.log('[数据校准] ✅ 保留已生成的具体灵根:', (derivedInfo.灵根 as SpiritRoot).name);
  } else if (creationStore.characterPayload.spirit_root_id === null) {
    // 仅当没有生成任何具体灵根时，才可能需要标记回随机（作为最后的保险措施）
    console.log('[数据校准] 🎲 用户选择随机灵根，但无有效生成值，标记为随机');
    derivedInfo.灵根 = '随机灵根';
  } else {
    console.warn('[数据校准] 警告: 无法找到权威的灵根数据。');
  }

  // 5. 天赋 (Talents) - 用户选择的天赋，强制使用不允许修改
  const authoritativeTalents = creationStore.selectedTalents;
  if (authoritativeTalents && authoritativeTalents.length > 0) {
    console.log(`[数据校准] ✅ 同步用户选择的天赋，共 ${authoritativeTalents.length} 个`);
    derivedInfo.天赋 = authoritativeTalents;
  } else {
    console.log('[数据校准] 用户未选择任何天赋，天赋字段设置为空数组。');
    derivedInfo.天赋 = [];
  }

  // 6. 先天六司 (Attributes) - 用户分配的属性，强制使用不允许修改
  const authoritativeAttributes = creationStore.attributes;
  if (authoritativeAttributes) {
    console.log('[数据校准] ✅ 同步用户分配的先天六司:', authoritativeAttributes);
    derivedInfo.先天六司 = {
      根骨: authoritativeAttributes.root_bone,
      灵性: authoritativeAttributes.spirituality,
      悟性: authoritativeAttributes.comprehension,
      气运: authoritativeAttributes.fortune,
      魅力: authoritativeAttributes.charm,
      心性: authoritativeAttributes.temperament,
    };
  }

  console.log('[数据校准] 权威数据同步完成。');
  return derivedInfo;
}


/**
 * 合并、验证并同步最终数据
 * @param saveData - 经过AI处理的存档
 * @param baseInfo - 原始角色
 * @param world - 原始世界
 * @param age - 原始年龄
 * @returns 最终完成的存档数据
 */
async function finalizeAndSyncData(saveData: SaveData, baseInfo: CharacterBaseInfo, world: World, age: number): Promise<SaveData> {
  console.log('[初始化流程] 4. 合并、验证并同步最终数据');
  const uiStore = useUIStore();
  uiStore.enterLoadingStage('save', '合并数据并校验存档');

  // 1. 合并AI生成的数据和用户选择的原始数据，并保护核心字段
  const mergedBaseInfo: CharacterBaseInfo = {
    ...((saveData as any).角色?.身份 ?? {}), // AI可能添加了新字段
    ...baseInfo,              // 用户的原始选择（包含*详情）优先级更高
    // 强制保护核心不可变字段
    名字: baseInfo.名字,
    性别: baseInfo.性别,
    种族: baseInfo.种族,
    先天六司: baseInfo.先天六司,
    天赋: baseInfo.天赋, // 强制使用玩家选择的完整天赋列表
  };


  // 灵根权威覆盖
  const userChoseRandomSpiritRoot = (typeof baseInfo.灵根 === 'object' && (baseInfo.灵根 as SpiritRoot)?.name?.includes('随机')) ||
                                (typeof baseInfo.灵根 === 'string' && baseInfo.灵根.includes('随机'));

  if (userChoseRandomSpiritRoot) {
    console.log('[数据最终化] 🎲 用户选择随机灵根，使用AI生成的数据');
    const aiGeneratedSpiritRoot = (saveData as any).角色?.身份?.灵根;
    mergedBaseInfo.灵根 = aiGeneratedSpiritRoot || '随机灵根'; // Fallback to string

    // 验证AI是否正确替换了随机灵根
    if (typeof mergedBaseInfo.灵根 === 'string' && mergedBaseInfo.灵根.includes('随机')) {
      console.warn('[数据最终化] ⚠️ 警告：AI未能正确替换随机灵根，使用本地数据库生成');

      // 🔥 后备逻辑：使用本地数据库随机生成
      const 天资 = baseInfo.天资;
      let 灵根池 = LOCAL_SPIRIT_ROOTS.filter(root => {
        // 根据天资筛选合适的灵根，排除特殊灵根(神品、仙品等)
        // 神品灵根应该是极其罕见的,不应该作为随机结果
        if (天资.name === '废柴' || 天资.name === '凡人') {
          return root.tier === '凡品' || root.tier === '下品';
        } else if (天资.name === '俊杰') {
          return root.tier === '中品' || root.tier === '上品';
        } else if (天资.name === '天骄') {
          return root.tier === '上品' || root.tier === '极品';
        } else if (天资.name === '妖孽') {
          // 妖孽也只能随机到极品,神品太过罕见
          return root.tier === '极品';
        } else {
          return root.tier === '凡品' || root.tier === '下品'; // 默认
        }
      });

      if (灵根池.length === 0) {
        // 如果过滤结果为空，使用所有灵根
        灵根池 = LOCAL_SPIRIT_ROOTS;
      }

      const 随机灵根 = 灵根池[Math.floor(Math.random() * 灵根池.length)];
      mergedBaseInfo.灵根 = 随机灵根;
      console.log(`[数据最终化] ✅ 已从本地数据库生成随机灵根: ${随机灵根.name} (${随机灵根.tier})`);
    }
  } else {
    console.log(`[数据最终化] ✅ 用户选择特定灵根，强制使用用户选择: ${(baseInfo.灵根 as SpiritRoot)?.name}`);
    mergedBaseInfo.灵根 = baseInfo.灵根;
  }

  // 出生权威覆盖
  const userChoseRandomOrigin = (typeof baseInfo.出生 === 'object' && (baseInfo.出生 as Origin)?.name?.includes('随机')) ||
                              (typeof baseInfo.出生 === 'string' && baseInfo.出生.includes('随机'));

  if (userChoseRandomOrigin) {
    console.log('[数据最终化] 🎲 用户选择随机出身，使用AI生成的数据');
    const aiGeneratedOrigin = (saveData as any).角色?.身份?.出生;
    mergedBaseInfo.出生 = aiGeneratedOrigin || '随机出身'; // Fallback to string

    // 验证AI是否正确替换了随机出身
    if (typeof mergedBaseInfo.出生 === 'string' && mergedBaseInfo.出生.includes('随机')) {
      console.warn('[数据最终化] ⚠️ 警告：AI未能正确替换随机出身，使用本地数据库生成');

      // 🔥 后备逻辑：使用本地数据库随机生成
      // 从本地数据库中随机选择一个出身
      const 随机出身 = LOCAL_ORIGINS[Math.floor(Math.random() * LOCAL_ORIGINS.length)];
      mergedBaseInfo.出生 = 随机出身;
      console.log(`[数据最终化] ✅ 已从本地数据库生成随机出身: ${随机出身.name}`);
    }
  } else {
    console.log(`[数据最终化] ✅ 用户选择特定出身，强制使用用户选择: ${(baseInfo.出生 as Origin)?.name}`);
    mergedBaseInfo.出生 = baseInfo.出生;
  }

  // 2. 从详情对象派生基础字段，确保数据一致性
  const finalBaseInfo = deriveBaseFieldsFromDetails(mergedBaseInfo);
  if (!(saveData as any).角色) (saveData as any).角色 = {};
  (saveData as any).角色.身份 = finalBaseInfo;

  // 3. 核心状态权威性校准
  // AI返回的数据可能会覆盖或损坏预先计算好的核心状态。
  // 此处，我们基于原始的角色选择（baseInfo）重新计算整个玩家状态，
  // 以确保其权威性和完整性，然后只保留AI对剧情至关重要的"位置"信息。
  console.log('[数据最终化] 重新计算并校准核心玩家状态...');
  const authoritativeStatus = calculateInitialAttributes(baseInfo, age);
  const aiModifiedAttributes = (saveData as any).角色?.属性 ?? (saveData as any).属性 ?? {};
  // 🔥 V3格式：位置在 角色.位置 下
  const aiLocationCandidate = (saveData as any).角色?.位置 ?? (saveData as any).位置;

  // 🔥 关键修复：合并状态，而不是完全覆盖。
  // 以权威计算值为基础，然后应用AI的所有修改（包括境界、位置、属性上限等）。
  // 🔥 境界字段特殊处理：优先使用AI设置的境界，只在缺失字段时才用初始值补充
  const mergedRealm = aiModifiedAttributes.境界 && typeof aiModifiedAttributes.境界 === 'object'
    ? {
        名称: aiModifiedAttributes.境界.名称 || authoritativeStatus.境界.名称,
        阶段: aiModifiedAttributes.境界.阶段 !== undefined ? aiModifiedAttributes.境界.阶段 : authoritativeStatus.境界.阶段,
        当前进度: aiModifiedAttributes.境界.当前进度 !== undefined ? aiModifiedAttributes.境界.当前进度 : authoritativeStatus.境界.当前进度,
        下一级所需: aiModifiedAttributes.境界.下一级所需 !== undefined ? aiModifiedAttributes.境界.下一级所需 : authoritativeStatus.境界.下一级所需,
        突破描述: aiModifiedAttributes.境界.突破描述 || authoritativeStatus.境界.突破描述
      }
    : authoritativeStatus.境界;

  // 🔥 新架构：不再写入 saveData.状态，改为短路径拆分：属性 + 位置
  (saveData as any).属性 = {
    境界: mergedRealm,
    声望: typeof aiModifiedAttributes.声望 === 'number' ? aiModifiedAttributes.声望 : authoritativeStatus.声望,
    气血: aiModifiedAttributes.气血 ?? authoritativeStatus.气血,
    灵气: aiModifiedAttributes.灵气 ?? authoritativeStatus.灵气,
    神识: aiModifiedAttributes.神识 ?? authoritativeStatus.神识,
    寿命: aiModifiedAttributes.寿命 ?? authoritativeStatus.寿命,
  };

  console.log('[数据最终化] 境界合并结果:', mergedRealm);

  const aiLocation = aiLocationCandidate; // 从V3路径 角色.位置 提取

  const isValidLocation = (loc: any): loc is { 描述: string; x?: number; y?: number } => {
    if (!loc || typeof loc !== 'object') return false;
    if (typeof loc.描述 !== 'string' || !loc.描述.trim()) return false;
    if (loc.描述.includes('位置生成失败')) return false;
    return true;
  };

  const ensureDotSeparatedDescription = (desc: string): string => {
    if (desc.includes('·')) return desc;
    const continents = (saveData as any).世界?.信息?.大陆信息;
    const firstContinentName =
      (Array.isArray(continents) && continents[0] && (continents[0].名称 || continents[0].name)) || '朝天大陆';
    return `${firstContinentName}·${desc}`;
  };

  const pickFallbackLocation = (): { 描述: string; x: number; y: number } => {
    const locList = (saveData as any).世界?.信息?.地点信息;
    if (Array.isArray(locList) && locList.length > 0) {
      const picked = locList[Math.floor(Math.random() * locList.length)];
      const rawName = picked?.名称 || picked?.name || picked?.描述 || picked?.description;
      const desc = ensureDotSeparatedDescription(String(rawName || '无名之地'));

      const coords = picked?.coordinates;
      const xCandidate =
        (coords && typeof coords === 'object' && (coords.x ?? coords.lng ?? coords.lon ?? coords.longitude)) ?? undefined;
      const yCandidate =
        (coords && typeof coords === 'object' && (coords.y ?? coords.lat ?? coords.latitude)) ?? undefined;

      const x = typeof xCandidate === 'number' && Number.isFinite(xCandidate) ? xCandidate : Math.floor(Math.random() * 10001);
      const y = typeof yCandidate === 'number' && Number.isFinite(yCandidate) ? yCandidate : Math.floor(Math.random() * 10001);
      return { 描述: desc, x, y };
    }

    return { 描述: '朝天大陆·无名之地', x: 5000, y: 5000 };
  };

  // 🔥 位置信息优先使用 AI 生成；若缺失/无效则兜底一个可用位置（避免创角直接失败）
  if (!(saveData as any).角色) (saveData as any).角色 = {};
  if (isValidLocation(aiLocation)) {
    const desc = ensureDotSeparatedDescription(aiLocation.描述);
    const x = typeof aiLocation.x === 'number' && Number.isFinite(aiLocation.x) ? aiLocation.x : Math.floor(Math.random() * 10001);
    const y = typeof aiLocation.y === 'number' && Number.isFinite(aiLocation.y) ? aiLocation.y : Math.floor(Math.random() * 10001);
    (saveData as any).角色.位置 = { ...(aiLocation as any), 描述: desc, x, y };
    console.log(`[数据最终化] ✅ 已保留/修复AI生成的位置信息: "${desc}" (${x}, ${y})`);
  } else {
    console.warn('[数据最终化] ⚠️ AI未提供有效位置信息，将使用兜底位置继续创角');
    console.error('[数据最终化-诊断] aiLocation:', aiLocation);
    const fallback = pickFallbackLocation();
    (saveData as any).角色.位置 = fallback as any;
    console.log(`[数据最终化] ✅ 已使用兜底位置信息: "${fallback.描述}" (${fallback.x}, ${fallback.y})`);
  }
  console.log('[数据最终化] 核心玩家状态校准完成。');

  // 兼容清理：不允许旧字段遗留
  delete (saveData as any).状态;

  // 🔥 重新计算出生日期（基于AI生成的时间）
  // V3格式：时间在 元数据.时间 下
  const gameTime = (saveData as any).元数据?.时间 ?? saveData.时间;
  if (gameTime) {
    const 正确的出生日期 = {
      年: gameTime.年 - age,
      月: gameTime.月,
      日: gameTime.日,
      小时: 0,
      分钟: 0
    };
    if (!(saveData as any).角色) (saveData as any).角色 = {};
    (saveData as any).角色.身份 = (saveData as any).角色.身份 || {};
    (saveData as any).角色.身份.出生日期 = 正确的出生日期;
    console.log(`[数据最终化] 重新计算出生日期: ${正确的出生日期.年}年${正确的出生日期.月}月${正确的出生日期.日}日 (时间${gameTime.年}年 - 开局年龄${age}岁)`);

    // 🔥 验证所有NPC的出生日期是否合理（调试日志）
    // V3格式：关系在 社交.关系 下
    const relationships = (saveData as any).社交?.关系 ?? saveData.关系;
    if (relationships && Object.keys(relationships).length > 0) {
      console.log('[数据最终化] 验证NPC出生日期:');
      Object.entries(relationships).forEach(([npcName, npcData]) => {
        const npc = npcData as { 出生日期?: { 年: number }; 年龄?: number };
        if (npc.出生日期 && npc.年龄) {
          const 计算年龄 = gameTime.年 - npc.出生日期.年;
          console.log(`  - ${npcName}: 出生${npc.出生日期.年}年, 声称年龄${npc.年龄}岁, 实际年龄${计算年龄}岁 ${计算年龄 === npc.年龄 ? '✅' : '❌不匹配'}`);
        }
      });
    }
  }

  // 3. 最终位置信息确认日志
  // 位置已经在验证器中严格检查，这里只是最后确认
  // V3格式：位置在 角色.位置 下
  const finalLocation = (saveData as any).角色?.位置?.描述;
  console.log(`[数据校准] ✅ 位置信息最终确认: "${finalLocation}"`);

  // 双重保险：如果位置格式仍然有问题（理论上不会发生）
  if (!finalLocation || !finalLocation.includes('·')) {
    console.warn('[数据校准] ⚠️ 位置格式异常，将使用兜底位置继续创角（避免失败）');
    console.warn('[数据校准-诊断] saveData.角色.位置:', (saveData as any).角色?.位置);
    const fallback = pickFallbackLocation();
    (saveData as any).角色 = (saveData as any).角色 || {};
    (saveData as any).角色.位置 = fallback as any;
    console.log(`[数据校准] ✅ 已修复为兜底位置: "${fallback.描述}" (${fallback.x}, ${fallback.y})`);
  }

  // 4. 迁移到 V3 并最终数据校验（落盘只允许 V3）
  const { migrated, report } = migrateSaveDataToLatest(saveData);
  if (report.legacyKeysFound.length > 0) {
    console.log('[数据最终化] 迁移报告 legacyKeysFound:', report.legacyKeysFound);
  }

  // 兜底修复：AI/迁移可能遗漏字段，使用统一修复器补齐结构，避免创角因缺字段失败
  const repairedMigrated = repairSaveData(migrated as any) as any;
  // 确保核心身份字段与用户选择一致（repairSaveData 在极端情况下可能回退到最小模板）
  repairedMigrated.角色 = repairedMigrated.角色 || {};
  repairedMigrated.角色.身份 = repairedMigrated.角色.身份 || {};
  if (baseInfo?.名字) repairedMigrated.角色.身份.名字 = baseInfo.名字;
  if (baseInfo?.性别) repairedMigrated.角色.身份.性别 = baseInfo.性别;
  if (baseInfo?.种族) repairedMigrated.角色.身份.种族 = baseInfo.种族;

  const finalValidation = validateGameData(repairedMigrated as any, { 角色: baseInfo, 模式: '单机' }, 'creation');
  if (!finalValidation.isValid) {
    console.warn(`[数据最终化] ⚠️ 角色数据最终验证未完全通过，将继续并依赖运行期修复兜底: ${finalValidation.errors.join(', ')}`);
  }

  // 5. 数据一致性强力校验：根除“幽灵功法”
  // 检查是否存在一个“正在修炼”的功法引用，但背包里却没有对应的实体物品。
  // 这种情况通常是AI指令错误导致的，必须在此处修正。
  const cultivating = repairedMigrated?.角色?.修炼?.修炼功法;
  const items = (repairedMigrated?.角色?.背包?.物品 ?? {}) as Record<string, any>;
  if (cultivating?.物品ID && typeof cultivating.名称 === 'string') {
    const corresponding = items[cultivating.物品ID];
    const ok =
      corresponding &&
      corresponding.类型 === '功法' &&
      (corresponding.名称 === cultivating.名称 || corresponding.名称) &&
      (corresponding.修炼中 === true || corresponding.已装备 === true);

    if (!ok) {
      console.warn(`[数据校准] 检测到无效的“幽灵功法”：角色.修炼.修炼功法 非空，但角色.背包.物品中无对应实体。正在清除无效修炼状态...`);
      if (repairedMigrated.角色?.修炼) repairedMigrated.角色.修炼.修炼功法 = null;
    } else {
      console.log(`[数据校准] 功法一致性校验通过: "${cultivating.名称}"`);
    }
  }

  // 7. 🔥 [新架构] 跳过酒馆同步
  // 新架构不再使用酒馆变量存储游戏状态
  // 数据已经在 Pinia Store 中，会自动保存到 IndexedDB
  console.log('[初始化流程] ✅ 角色创建完成（新架构跳过酒馆同步）');
  uiStore.setLoadingStageDetail('存档校验通过');

  console.log('[初始化流程] finalizeAndSyncData即将返回 V3 saveData');
  return repairedMigrated as any;
}

// #endregion

/**
 * 完整的角色初始化流程 (AI驱动) - 重构版
 */
export async function initializeCharacter(
  charId: string,
  baseInfo: CharacterBaseInfo,
  world: World,
  age: number,
  useStreaming: boolean = true,
  generateMode: 'generate' | 'generateRaw' = 'generate',
  splitResponseGeneration: boolean = false
): Promise<SaveData> {
  console.log('[初始化流程] ===== initializeCharacter 入口 =====');
  console.log('[初始化流程] 分步生成模式:', splitResponseGeneration);

  // 兼容：创角 store 中的种族字段未同步到 baseInfo 时补上
  const creationStore = useCharacterCreationStore();
  if (!baseInfo.种族 && creationStore.characterPayload.race) {
    console.log(`[初始化流程] 补丁：从 store 同步种族信息: ${creationStore.characterPayload.race}`);
    (baseInfo as any).种族 = creationStore.characterPayload.race;
  }

  console.log('[初始化流程] 接收到的 baseInfo.先天六司:', baseInfo.先天六司);
  try {
    throwIfCreationCancelled();
    // 步骤 1: 准备初始数据
    const { saveData: initialSaveData, processedBaseInfo } = prepareInitialData(baseInfo, age);

    // 步骤 2: 生成世界
    const worldInfo = await generateWorld(processedBaseInfo, world);
    if (!(initialSaveData as any).世界) (initialSaveData as any).世界 = { 信息: {}, 状态: {} };
    (initialSaveData as any).世界.信息 = worldInfo;

    // 彩蛋：合欢宗补齐圣女职位（酒馆端额外注入灰夫人 NPC），见 hehuanEasterEgg.ts
    applyHehuanSectEasterEgg(worldInfo, initialSaveData);

    // 步骤 2.5: 🔥 [新架构] 跳过世界保存到酒馆
    // 世界已经在 saveData 中，AI会在prompt中接收到完整状态
    console.log('[初始化流程] 2.5 世界已包含在saveData中（新架构跳过酒馆同步）');
    console.log('[初始化流程] 世界包含', worldInfo.大陆信息?.length || 0, '个大陆');
    console.log('[初始化流程] 大陆列表:', worldInfo.大陆信息?.map((c: Continent) => c.名称 || c.name).join('、'));

    // 步骤 3: 生成开场剧情 (已包含独立的地点生成步骤)
    console.log('[初始化流程] 准备调用generateOpeningScene...');
    console.log('[初始化流程] 使用流式模式:', useStreaming);
    console.log('[初始化流程] 使用生成模式:', generateMode);
    console.log('[初始化流程] 使用分步生成:', splitResponseGeneration);
    const { finalSaveData } = await generateOpeningScene(initialSaveData, processedBaseInfo, world, age, useStreaming, generateMode, splitResponseGeneration);
    console.log('[初始化流程] generateOpeningScene已返回');

    // 步骤 3.5: 核心属性校准
    // AI在生成开场时可能会意外覆盖或删除我们预先计算好的核心属性。
    // 此处强制将我们计算的初始值重新应用到最终存档数据中，以确保数据一致性。
    // 这会保留AI对"位置"等字段的修改，同时保护"气血"、"寿命"等核心数据。
    console.log('[初始化流程] 核心属性校准：合并AI修改与初始属性...');
    const authoritativeStatus = calculateInitialAttributes(baseInfo, age);
    const aiModifiedStatus = finalSaveData.状态 || {};

    // 合并状态：以权威计算值为基础，然后应用AI的所有修改。
    // 这会保留AI对"境界"、"位置"等剧情相关字段的修改，
    // 同时确保"气血"、"寿命"等核心计算字段有一个有效的初始值。
    // 🔥 境界字段特殊处理：优先使用AI设置的境界，只在缺失字段时才用初始值补充
    const mergedRealmStep3 = aiModifiedStatus.境界 && typeof aiModifiedStatus.境界 === 'object'
      ? {
          名称: aiModifiedStatus.境界.名称 || authoritativeStatus.境界.名称,
          阶段: aiModifiedStatus.境界.阶段 !== undefined ? aiModifiedStatus.境界.阶段 : authoritativeStatus.境界.阶段,
          当前进度: aiModifiedStatus.境界.当前进度 !== undefined ? aiModifiedStatus.境界.当前进度 : authoritativeStatus.境界.当前进度,
          下一级所需: aiModifiedStatus.境界.下一级所需 !== undefined ? aiModifiedStatus.境界.下一级所需 : authoritativeStatus.境界.下一级所需,
          突破描述: aiModifiedStatus.境界.突破描述 || authoritativeStatus.境界.突破描述
        }
      : authoritativeStatus.境界;

    finalSaveData.状态 = {
      ...authoritativeStatus,
      ...aiModifiedStatus,
      境界: mergedRealmStep3, // 强制使用合并后的完整境界对象（优先AI的值）
    };
    console.log('[初始化流程] 核心属性校准完成，境界:', mergedRealmStep3);

    // 步骤 4: 最终化并同步数据（此后开始写入，不再响应取消）
    throwIfCreationCancelled();
    console.log('[初始化流程] 准备最终化并同步数据...');
    const completedSaveData = await finalizeAndSyncData(finalSaveData, baseInfo, world, age);
    console.log('[初始化流程] 最终化完成');

    console.log('[初始化流程] ✅ 角色创建成功！准备返回completedSaveData');
    console.log('[初始化流程] completedSaveData类型:', typeof completedSaveData);
    console.log('[初始化流程] completedSaveData有效:', !!completedSaveData);
    return completedSaveData;

  } catch (error) {
    console.error('[初始化流程] ❌ 角色初始化失败：', error);
    console.error('[初始化流程] 错误堆栈:', error instanceof Error ? error.stack : 'N/A');
    // 错误由上层统一处理
    throw error;
  } finally {
    console.log('[初始化流程] initializeCharacter函数执行完毕');
  }
}

/**
 * 为现有角色创建新存档槽位
 */
export async function createNewSaveSlot(
  charId: string,
  slotName: string,
  baseInfo: CharacterBaseInfo,
  world: World,
  age: number,
  useStreaming: boolean = true
): Promise<SaveData> {
  // 调用初始化流程
  const saveData = await initializeCharacter(charId, baseInfo, world, age, useStreaming);

  // 添加一些新存档槽位特定的逻辑
  toast.success(`新存档《${slotName}》创建成功！`);

  return saveData;
}
