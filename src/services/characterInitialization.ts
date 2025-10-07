/**
 * @fileoverview 角色初始化服务
 * 负责角色创建生成和完整初始化流程，包括AI动态生成。
 */

import { getTavernHelper } from '@/utils/tavern';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, SaveData, PlayerStatus, WorldInfo, Item } from '@/types/game';
import type { World } from '@/types';
import { generateInitialMessage, generateSimpleResponse } from '@/utils/tavernAI';
import { processGmResponse } from '@/utils/AIGameMaster';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { buildCharacterInitializationPrompt } from '@/utils/prompts/characterInitializationPrompts';
import { validateGameData } from '@/utils/dataValidation';
// 移除未使用的旧生成器导入，改用增强版生成器
// import { WorldGenerationConfig } from '@/utils/worldGeneration/gameWorldConfig';
import { EnhancedWorldGenerator } from '@/utils/worldGeneration/enhancedWorldGenerator';

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
    try {
      if (attempt > 1) {
        uiStore.updateLoadingText(`${progressMessage} (第 ${attempt - 1} 次重试)`);
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
      突破描述: "引气入体，开始修仙之路"
    },
    声望: 0, // 声望应该是数字类型
    位置: {
      描述: "位置生成失败" // 标记为错误状态而不是默认值
    },
    气血: { 当前: 初始气血, 上限: 初始气血 },
    灵气: { 当前: 初始灵气, 上限: 初始灵气 },
    神识: { 当前: 初始神识, 上限: 初始神识 },
    寿命: { 当前: age, 上限: 最大寿命 },
    状态效果: [] // 使用新的StatusEffect数组格式
  };
}

// =================================================================
// #region 角色初始化 - 辅助函数
// =================================================================

/**
 * 准备初始存档数据结构
 * @param baseInfo - 角色基础信息
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

  // 确保年龄信息存在
  if (!processedBaseInfo.年龄) {
    processedBaseInfo.年龄 = age;
  }

  // 设置出生日期（根据开局年龄和游戏时间推算）
  const 游戏时间 = { 年: 1000, 月: 1, 日: 1, 小时: Math.floor(Math.random() * 12) + 6, 分钟: Math.floor(Math.random() * 60) };
  if (!processedBaseInfo.出生日期) {
    processedBaseInfo.出生日期 = {
      年: 游戏时间.年 - age,
      月: 游戏时间.月,
      日: 游戏时间.日,
      小时: 0,
      分钟: 0
    };
    console.log(`[角色初始化] 设置出生日期: ${processedBaseInfo.出生日期.年}年${processedBaseInfo.出生日期.月}月${processedBaseInfo.出生日期.日}日 (当前${age}岁)`);
  }

  // 注意：不再在此处理随机灵根和随机出生，完全交给 AI 处理
  // AI 会根据提示词中的引导，创造性地生成独特的灵根和出生
  // 这样可以避免固定的套路，每次初始化都会有不同的结果

  if (isRandomSpiritRoot(processedBaseInfo.灵根)) {
    console.log('[灵根生成] 检测到随机灵根，将由 AI 创造性生成');
    // 保留"随机灵根"字符串，让 AI 处理
  }

  if (typeof processedBaseInfo.出生 === 'string' &&
      (processedBaseInfo.出生 === '随机出生' || processedBaseInfo.出生.includes('随机'))) {
    console.log('[出生生成] 检测到随机出生，将由 AI 创造性生成');
    // 保留"随机出生"字符串，让 AI 处理
  }

  // 计算初始属性
  const playerStatus = calculateInitialAttributes(processedBaseInfo, age);

  // 创建基础存档结构
  const saveData: SaveData = {
    角色基础信息: processedBaseInfo,
    玩家角色状态: playerStatus,
    装备栏: { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null },
    三千大道: createEmptyThousandDaoSystem(),
    背包: { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} },
    人物关系: {},
    宗门系统: { availableSects: [], sectRelationships: {}, sectHistory: [] },
    记忆: { 短期记忆: [], 中期记忆: [], 长期记忆: [] },
    游戏时间: { 年: 1000, 月: 1, 日: 1, 小时: Math.floor(Math.random() * 12) + 6, 分钟: Math.floor(Math.random() * 60) },
    修炼功法: null, // 初始无修炼功法，数据结构已改为：功法数据和进度合并为一个对象或null
    掌握技能: [], // 初始化为空数组
    系统: {
      规则: {
        属性上限: { 先天六司: { 每项上限: 10 } },
        // 装备系统
        装备系统: '装备栏存储引用{物品ID,名称}，完整数据在背包.物品中',
        品质控制: '严格遵守境界对应品质范围，仙品世界上几乎没有，每一个都是令世界动荡的存在，神品不存在'
      },
      提示: [
        '⚠️ 先创建后修改：修改数据前必须确保数据已存在',
        '装备栏字段：装备1-6'
      ]
    }
  };

  // 注入AI元数据提示
  (saveData.装备栏 as Record<string, any>)._AI重要提醒 = '⚠️ 引用的物品ID必须已经在背包.物品数组中存在，否则会被系统清除！';
  (saveData.人物关系 as Record<string, any>)._AI重要提醒 = '⚠️ 每次与NPC对话或者在周围存在互动必须添加人物记忆';

  return { saveData, processedBaseInfo };
}

/**
 * 生成世界数据
 * @param baseInfo - 角色基础信息
 * @param world - 基础世界信息
 * @returns 生成的世界信息
 */
async function generateWorld(baseInfo: CharacterBaseInfo, world: World): Promise<WorldInfo> {
  console.log('[初始化流程] 2. 生成世界数据');
  const uiStore = useUIStore();
  uiStore.updateLoadingText('🌍 世界生成: 准备配置...');

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

  const enhancedConfig = {
    worldName: selectedWorld?.name || world.name,
    worldBackground: selectedWorld?.description || world.description,
    worldEra: selectedWorld?.era || world.era,
    factionCount: userWorldConfig.majorFactionsCount || 7,
    locationCount: userWorldConfig.totalLocations || 25,
    secretRealmsCount: userWorldConfig.secretRealmsCount || 8,
    continentCount: userWorldConfig.continentCount || Math.floor(Math.random() * 5) + 3,
    maxRetries: 3,
    retryDelay: 2000,
    characterBackground: extractName(baseInfo.出生),
    mapConfig: userWorldConfig.mapConfig
  };

  console.log('[初始化流程] 开始调用世界生成器...');
  uiStore.updateLoadingText('🌍 世界生成: 调用AI生成世界架构...');
  const enhancedWorldGenerator = new EnhancedWorldGenerator(enhancedConfig);

  const startTime = Date.now();
  const worldGenerationResult = await enhancedWorldGenerator.generateValidatedWorld();
  const elapsed = Date.now() - startTime;
  console.log(`[初始化流程] 世界生成器返回,耗时: ${elapsed}ms`);

  if (worldGenerationResult.success && worldGenerationResult.worldInfo) {
    console.log('[初始化流程] 世界生成成功');
    uiStore.updateLoadingText('🌍 世界生成: 完成');
    return worldGenerationResult.worldInfo;
  } else {
    throw new Error(`世界生成失败：${worldGenerationResult.errors?.join(', ') || '未知错误'}`);
  }
}

/**
 * 生成开场剧情和初始状态
 * @param saveData - 当前存档数据
 * @param baseInfo - 角色基础信息
 * @param world - 世界信息
 * @param age - 开局年龄
 * @returns 包含开场剧情和AI指令的响应
 */
async function generateOpeningScene(saveData: SaveData, baseInfo: CharacterBaseInfo, world: World, age: number) {
  console.log('[初始化流程] 3. 生成开场剧情');
  const uiStore = useUIStore();
  uiStore.updateLoadingText('天道正在为你书写命运之章...');

  const userSelections = {
    name: baseInfo.名字,
    gender: baseInfo.性别,
    race: baseInfo.种族,
    age: age,
    world: world.name,
    talentTier: baseInfo.天资,
    origin: baseInfo.出生,
    spiritRoot: baseInfo.灵根,
    talents: baseInfo.天赋 || [],
    attributes: (baseInfo.先天六司 || {}) as unknown as Record<string, number>
  };

  const customInitPrompt = buildCharacterInitializationPrompt(userSelections);

  const getNameFrom = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      if (typeof obj.名称 === 'string') return obj.名称;
      if (typeof obj.name === 'string') return obj.name;
    }
    return String(val);
  };

  const initialGameDataForAI = {
    baseInfo: baseInfo,
    saveData: saveData,
    world: { ...world, description: `世界名: ${world.name}, 纪元: ${world.era}. 背景: ${world.description}` },
    creationDetails: {
      age: age,
      originName: getNameFrom(baseInfo.出生),
      spiritRootName: getNameFrom(baseInfo.灵根),
      talentTierName: getNameFrom(baseInfo.天资),
      talentNames: Array.isArray(baseInfo.天赋)
        ? (baseInfo.天赋 as Record<string, any>[]).map((t: Record<string, any>) => t?.name || t?.名称 || String(t)).filter(Boolean)
        : []
    },
    availableContinents: saveData.世界信息?.大陆信息?.map((continent: Record<string, any>) => ({
      名称: continent.名称 || continent.name,
      描述: continent.描述 || continent.description,
      大洲边界: continent.大洲边界 || continent.continent_bounds
    })) || [],
    availableLocations: saveData.世界信息?.地点信息?.map((location: Record<string, any>) => ({
      名称: location.名称 || location.name,
      类型: location.类型 || location.type,
      描述: location.描述 || location.description,
      所属势力: location.所属势力 || location.faction
    })) || [],
    mapConfig: saveData.世界信息?.地图配置
  };

  console.log(`[初始化] 准备生成开场剧情，角色: ${baseInfo.名字}`);
  console.log(`[初始化] 可用大陆列表:`, initialGameDataForAI.availableContinents.map(c => c.名称));
  console.log(`[初始化] 可用地点数量:`, initialGameDataForAI.availableLocations?.length || 0);

  const initialMessageResponse = await robustAICall(
    async () => {
      console.log('[初始化] ===== 开始生成开场剧情 =====');
      const startTime = Date.now();
      try {
        const response = await generateInitialMessage(initialGameDataForAI, {}, customInitPrompt);
        const elapsed = Date.now() - startTime;
        console.log(`[初始化] ✅ AI生成完成,耗时: ${elapsed}ms`);
        return response;
      } catch (error) {
        console.error(`[初始化] ❌ AI生成失败:`, error);
        throw error;
      }
    },
    (response) => {
      // 简化验证：只检查基本内容
      if (!response || !response.text || typeof response.text !== 'string' || response.text.trim().length < 200) {
        console.warn('[AI验证] 生成的文本太短或无效');
        return false;
      }
      if (response.text.includes('placeholder') || response.text.includes('TODO') || response.text.includes('待填充')) {
        console.warn('[AI验证] 生成的文本包含占位符');
        return false;
      }
      console.log('[AI验证] ✅ 验证通过');
      return true;
    },
    3,
    '天道正在书写命运之章'
  );

  // =================================================================
  // 步骤 3.4: 处理AI响应
  // =================================================================
  const { saveData: saveDataAfterCommands, stateChanges } = await processGmResponse(initialMessageResponse, saveData, true);

  const characterStore = useCharacterStore();
  characterStore.setInitialCreationStateChanges(stateChanges);

  const openingStory = String(initialMessageResponse.text || '');
  if (!openingStory.trim()) {
    throw new Error('AI生成的开场剧情为空');
  }

  console.log('[初始化] ✅ generateOpeningScene完成,返回数据');
  // 注意：不再返回 initialGameDataForAI，因为位置信息已直接处理
  return { finalSaveData: saveDataAfterCommands, aiResponse: initialMessageResponse };
}

/**
 * 从详情对象派生基础字段，确保数据一致性
 * @param baseInfo - 包含详情对象的基础信息
 * @param worldName - 世界名称
 * @returns 派生了基础字段的基础信息
 */
function deriveBaseFieldsFromDetails(baseInfo: CharacterBaseInfo, worldName: string): CharacterBaseInfo {
  const derivedInfo = { ...baseInfo };

  // 设置世界名称
  derivedInfo.世界 = worldName;

  // 处理灵根：确保是对象格式
  if (typeof derivedInfo.灵根 === 'string') {
    if (derivedInfo.灵根 === '随机灵根') {
      derivedInfo.灵根 = {
        名称: '随机灵根',
        品级: '凡品',
        描述: '大道五十，天衍四九，人遁其一'
      };
    } else {
      // 其他字符串类型的灵根
      derivedInfo.灵根 = {
        名称: derivedInfo.灵根,
        品级: '凡品',
        描述: '基础灵根'
      };
    }
  } else if (typeof derivedInfo.灵根 === 'object' && derivedInfo.灵根) {
    // 已经是对象格式，检查是否需要补充名称
    const rootObj = derivedInfo.灵根 as Record<string, any>;
    if (rootObj.名称 === '随机灵根' && rootObj.品级 && rootObj.品级 !== '凡品') {
      rootObj.名称 = `${rootObj.品级}灵根（待AI确定属性）`;
    }
  }

  return derivedInfo;
}


/**
 * 合并、验证并同步最终数据
 * @param saveData - 经过AI处理的存档
 * @param baseInfo - 原始角色基础信息
 * @param world - 原始世界信息
 * @param age - 原始年龄
 * @returns 最终完成的存档数据
 */
async function finalizeAndSyncData(saveData: SaveData, baseInfo: CharacterBaseInfo, world: World, age: number): Promise<SaveData> {
  console.log('[初始化流程] 4. 合并、验证并同步最终数据');
  const uiStore = useUIStore();
  uiStore.updateLoadingText(`正在同步数据，即将进入${baseInfo.名字}的修仙世界...`);

  const helper = getTavernHelper();
  if (!helper) throw new Error('无法连接到酒馆服务');

  // 1. 合并AI生成的数据和用户选择的原始数据，并保护核心字段
  const mergedBaseInfo: CharacterBaseInfo = {
    ...saveData.角色基础信息, // AI可能添加了新字段
    ...baseInfo,              // 用户的原始选择（包含*详情）优先级更高
    // 强制保护核心不可变字段
    名字: baseInfo.名字,
    性别: baseInfo.性别,
    种族: baseInfo.种族,
    年龄: age,
    先天六司: baseInfo.先天六司,
  };

  // 🔥 特殊处理：对于"随机"选项，使用AI生成的数据而不是用户的原始选择
  if (typeof baseInfo.灵根 === 'string' && baseInfo.灵根.includes('随机')) {
    console.log('[数据合并] 检测到随机灵根，使用AI生成的灵根数据');
    mergedBaseInfo.灵根 = saveData.角色基础信息?.灵根 || baseInfo.灵根;
  }
  if (typeof baseInfo.出生 === 'string' && baseInfo.出生.includes('随机')) {
    console.log('[数据合并] 检测到随机出生，使用AI生成的出生数据');
    mergedBaseInfo.出生 = saveData.角色基础信息?.出生 || baseInfo.出生;
  }

  // 2. 从详情对象派生基础字段，确保数据一致性
  const finalBaseInfo = deriveBaseFieldsFromDetails(mergedBaseInfo, world.name);
  saveData.角色基础信息 = finalBaseInfo;

  // 3. 确保玩家角色状态的所有必需字段都存在（AI可能没有设置完整）
  console.log('[数据最终化] 检查先天六司:', baseInfo.先天六司);

  // 使用原始baseInfo的先天六司，而不是可能被AI修改的saveData
  const 根骨 = Number(baseInfo.先天六司?.根骨 ?? 0);
  const 灵性 = Number(baseInfo.先天六司?.灵性 ?? 0);
  const 悟性 = Number(baseInfo.先天六司?.悟性 ?? 0);

  if (!saveData.玩家角色状态) {
    console.error('[数据最终化] 玩家角色状态完��缺失，重新创建');
    saveData.玩家角色状态 = calculateInitialAttributes(baseInfo, age);
  } else {
    // 逐个检查并修复缺失的字段
    if (!saveData.玩家角色状态.寿命) {
      console.warn('[数据最终化] 寿命对象不存在，创建默认值');
      saveData.玩家角色状态.寿命 = { 当前: age, 上限: 80 + 根骨 * 5 };
    } else {
      saveData.玩家角色状态.寿命.当前 = age;
    }

    if (!saveData.玩家角色状态.气血) {
      console.warn('[数据最终化] 气血对象不存在，创建默认值');
      const 初始气血 = 100 + 根骨 * 10;
      saveData.玩家角色状态.气血 = { 当前: 初始气血, 上限: 初始气血 };
    }

    if (!saveData.玩家角色状态.灵气) {
      console.warn('[数据最终化] 灵气对象不存在，创建默认值');
      const 初始灵气 = 50 + 灵性 * 5;
      saveData.玩家角色状态.灵气 = { 当前: 初始灵气, 上限: 初始灵气 };
    }

    if (!saveData.玩家角色状态.神识) {
      console.warn('[数据最终化] 神识对象不存在，创建默认值');
      const 初始神识 = 30 + 悟性 * 3;
      saveData.玩家角色状态.神识 = { 当前: 初始神识, 上限: 初始神识 };
    }

    if (!saveData.玩家角色状态.境界) {
      console.warn('[数据最终化] 境界对象不存在，创建默认值');
      saveData.玩家角色状态.境界 = {
        名称: "凡人",
        阶段: "",
        当前进度: 0,
        下一级所需: 100,
        突破描述: "引气入体，开始修仙之路"
      };
    }

    if (!saveData.玩家角色状态.位置) {
      console.warn('[数据最终化] 位置对象不存在，创建默认值');
      saveData.玩家角色状态.位置 = { 描述: "未知位置" };
    }

    if (saveData.玩家角色状态.声望 === undefined) {
      saveData.玩家角色状态.声望 = 0;
    }

    if (!Array.isArray(saveData.玩家角色状态.状态效果)) {
      saveData.玩家角色状态.状态效果 = [];
    }
  }

  // 🔥 重新计算出生日期（基于AI生成的游戏时间）
  if (saveData.游戏时间) {
    const 正确的出生日期 = {
      年: saveData.游戏时间.年 - age,
      月: saveData.游戏时间.月,
      日: saveData.游戏时间.日,
      小时: 0,
      分钟: 0
    };
    saveData.角色基础信息.出生日期 = 正确的出生日期;
    console.log(`[数据最终化] 重新计算出生日期: ${正确的出生日期.年}年${正确的出生日期.月}月${正确的出生日期.日}日 (游戏时间${saveData.游戏时间.年}年 - 开局年龄${age}岁)`);
  }

  // 3. 最终位置信息校验 (v5 - 两步分离策略)
  // 在这个阶段，位置应该已经被AI通过tavern_commands正确设置了。
  // 我们只需要验证它是否存在且格式基本正确。
  const finalLocation = saveData.玩家角色状态?.位置?.描述;
  if (!finalLocation || typeof finalLocation !== 'string' || !finalLocation.includes('·') || finalLocation.includes('undefined')) {
    throw new Error(`最终数据校验失败：位置信息无效或缺失。获取到的位置: "${finalLocation}"`);
  }
  console.log(`[数据校准] 位置信息校验通过: "${finalLocation}"`);

  // 4. 最终数据校验
  const finalValidation = validateGameData(saveData, { 角色基础信息: baseInfo, 模式: '单机' }, 'creation');
  if (!finalValidation.isValid) {
    throw new Error(`角色数据最终验证失败: ${finalValidation.errors.join(', ')}`);
  }

  // 5. 数据一致性校准：确保装备的功法在背包中存在实体
  if (saveData.修炼功法 && saveData.修炼功法.物品ID) {
    const equippedTechnique = saveData.修炼功法;
    const techniqueName = equippedTechnique.名称;

    // 检查背包中是否存在该功法物品
    const itemExists = Object.values(saveData.背包.物品).some(item => item.名称 === techniqueName && item.类型 === '功法');

    if (!itemExists) {
      console.warn(`[数据校准] 检测到已装备功法 "${techniqueName}" 在背包中不存在，正在自动创建物品实体...`);

      // 创建一个新的功法物品
      const itemId = `tech_${Date.now()}`;
      const newTechniqueItem: Item = { // 使用 any 以便动态构建
        物品ID: itemId,
        名称: techniqueName,
        类型: '功法',
        品质: { quality: '神', grade: 1 }, // 默认给予一个高品质，因为通常初始功法都很重要
        数量: 1,
        已装备: true,
        描述: `初始功法：${techniqueName}。`,
        可叠加: false,
        功法效果: {
          修炼速度加成: 1.2, // 给予一个基础加成
        },
      };

      saveData.背包.物品[itemId] = newTechniqueItem as Item;
      console.log(`[数据校准] 已成功为 "${techniqueName}" 创建背包物品实体。`);
    } else {
      // 如果物品已存在，确保其"已装备"状态为 true
      const existingItemEntry = Object.entries(saveData.背包.物品).find(([, item]) => item.名称 === techniqueName && item.类型 === '功法');
      if (existingItemEntry) {
        const [, existingItem] = existingItemEntry;
        if (existingItem && !existingItem.已装备) {
          existingItem.已装备 = true;
          console.log(`[数据校准] 已将背包中存在的功法 "${techniqueName}" 标记为已装备。`);
        }
      }
    }
  }

  // 6. 功法技能描述校准 (Fallback)
  if (saveData.修炼功法 && saveData.修炼功法.功法技能) {
    const skills = saveData.修炼功法.功法技能;
    Object.entries(skills).forEach(([skillName, skillInfo]) => {
      if (typeof skillInfo === 'object' && skillInfo !== null && !(skillInfo as Record<string, any>).技能描述) {
        console.warn(`[数据校准] 功法 "${saveData.修炼功法?.名称}" 的技能 "${skillName}" 缺少描述，已添加默认描述。`);
        (skillInfo as Record<string, any>).技能描述 = '此技能玄奥非凡，具体效果需在实战中领悟。';
      }
    });
  }

  // 7. 同步到Tavern
  try {
    console.log('[初始化流程] 开始同步数据到酒馆...');
    uiStore.updateLoadingText('💾 正在保存角色数据...');

    // ⚠️ 使用分片存储直接覆盖（insertOrAssignVariables会自动覆盖旧值，无需先删除）
    const { shardSaveData, saveAllShards } = await import('@/utils/storageSharding');
    const shards = shardSaveData(saveData);

    console.log('[初始化流程] 准备保存', Object.keys(shards).length, '个分片');
    uiStore.updateLoadingText(`💾 保存 ${Object.keys(shards).length} 个数据分片到酒馆...`);

    const startTime = Date.now();
    await saveAllShards(shards, helper);
    const elapsed = Date.now() - startTime;
    console.log(`[初始化流程] ✅ 所有分片已保存，耗时: ${elapsed}ms`);

    // 设置全局角色名称
    uiStore.updateLoadingText('💾 设置全局角色名称...');
    await helper.insertOrAssignVariables({ 'character.name': baseInfo.名字 }, { type: 'global' });
    console.log('[初始化流程] ✅ 已设置全局角色名称');

    console.log('[初始化流程] ✅ 数据同步到Tavern成功');
    uiStore.updateLoadingText('✅ 角色创建完成！');
  } catch (err) {
    console.error('[初始化流程] ❌ 保存游戏数据到酒馆失败:', err);
    console.error('[初始化流程] 错误详情:', err instanceof Error ? err.stack : String(err));
    console.warn('[初始化流程] 不影响本地游戏开始，将继续');
  }

  console.log('[初始化流程] finalizeAndSyncData即将返回saveData');
  return saveData;
}

// #endregion

/**
 * 完整的角色初始化流程 (AI驱动) - 重构版
 */
export async function initializeCharacter(
  charId: string,
  baseInfo: CharacterBaseInfo,
  world: World,
  age: number
): Promise<SaveData> {
  console.log('[初始化流程] ===== initializeCharacter 入口 =====');
  console.log('[初始化流程] 接收到的 baseInfo.先天六司:', baseInfo.先天六司);
  try {
    // 步骤 1: 准备初始数据
    const { saveData: initialSaveData, processedBaseInfo } = prepareInitialData(baseInfo, age);

    // 步骤 2: 生成世界
    const worldInfo = await generateWorld(processedBaseInfo, world);
    initialSaveData.世界信息 = worldInfo;

    // 步骤 3: 生成开场剧情 (已包含独立的地点生成步骤)
    console.log('[初始化流程] 准备调用generateOpeningScene...');
    const { finalSaveData } = await generateOpeningScene(initialSaveData, processedBaseInfo, world, age);
    console.log('[初始化流程] generateOpeningScene已返回');

    // 步骤 4: 最终化并同步数据
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
  age: number
): Promise<SaveData> {
  // 调用初始化流程
  const saveData = await initializeCharacter(charId, baseInfo, world, age);

  // 添加一些新存档槽位特定的逻辑
  toast.success(`新存档《${slotName}》创建成功！`);

  return saveData;
}
