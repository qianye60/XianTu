/**
 * @fileoverview 角色初始化服务
 * 负责角色创建生成和完整初始化流程，包括AI动态生成。
 */

import { useUIStore } from '@/stores/uiStore';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, SaveData, PlayerStatus, WorldInfo, Continent } from '@/types/game';
import type { World, Origin, SpiritRoot } from '@/types';
import type { GM_Response, TavernCommand } from '@/types/AIGameMaster';
import { AIBidirectionalSystem } from '@/utils/AIBidirectionalSystem';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { buildCharacterInitializationPrompt, buildCharacterSelectionsSummary } from '@/utils/prompts/characterInitializationPrompts';
import { validateGameData } from '@/utils/dataValidation';
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
      突破描述: "引气入体，感悟天地灵气，踏上修仙第一步"
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

  // 创建基础存档结构
  const saveData: SaveData = {
    角色基础信息: processedBaseInfo,
    玩家角色状态: playerStatus,
    装备栏: { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null },
    三千大道: createEmptyThousandDaoSystem(),
    背包: { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} },
    人物关系: {},
    任务系统: {
      配置: {
        启用系统任务: false,
        系统任务类型: '修仙辅助系统',
        系统任务提示词: '',
        自动刷新: false,
        默认任务数量: 3
      },
      当前任务列表: [],
      已完成任务: [],
      任务统计: {
        完成总数: 0,
        主线完成: 0,
        支线完成: 0,
        系统任务完成: 0
      }
    },
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
      ],
      // 🔥 NSFW设置：角色初始化时强制默认开启
      nsfwMode: true,
      nsfwGenderFilter: (() => {
        try {
          const savedSettings = localStorage.getItem('dad_game_settings');
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            return parsed.nsfwGenderFilter || 'all';
          }
        } catch (e) {
          console.error('[初始化] 读取NSFW性别过滤设置失败:', e);
        }
        return 'all'; // 默认所有NPC
      })()
    }
  };

  // 注入AI元数据提示
  (saveData.装备栏 as unknown as Record<string, unknown>)._AI重要提醒 = '⚠️ 引用的物品ID必须已经在背包.物品数组中存在';
  (saveData.人物关系 as unknown as Record<string, unknown>)._AI重要提醒 = '⚠️ 每次与NPC对话或者在周围存在互动必须添加人物记忆';

  // 🔥 初始化玩家身体部位（NSFW模式）
  // 注意：这里只是初始化占位符，AI会在角色初始化响应中生成详细描述
  if (saveData.系统?.nsfwMode) {
    console.log('[角色初始化] NSFW模式已开启，将由AI生成身体部位详细描述');
    // 创建空对象，等待AI填充
    saveData.身体部位开发 = {};
  }

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

  // 🔥 现在baseInfo中的字段已经是完整对象了
  const userSelections = {
    name: baseInfo.名字,
    gender: baseInfo.性别,
    race: baseInfo.种族 || '人族',
    age: age,
    // 🔥 关键修复：传递完整的世界对象而不仅仅是名称
    world: baseInfo.世界 || world, // 优先使用 baseInfo 中的完整对象
    talentTier: baseInfo.天资, // 现在是完整对象
    origin: baseInfo.出生,     // 现在是完整对象或"随机出身"
    spiritRoot: baseInfo.灵根, // 现在是完整对象或"随机灵根"
    talents: baseInfo.天赋 || [], // 现在是完整对象数组
    attributes: (baseInfo.先天六司 || {}) as unknown as Record<string, number>
  };

  console.log('[初始化] 🔥 用户选择数据检查:');
  console.log('  - 天资:', userSelections.talentTier);
  console.log('  - 出身:', userSelections.origin);
  console.log('  - 灵根:', userSelections.spiritRoot);
  console.log('  - 天赋数量:', userSelections.talents?.length);

  // 🔥 准备世界上下文信息
  const worldContext = {
    worldInfo: saveData.世界信息,
    availableContinents: saveData.世界信息?.大陆信息?.map((continent: Continent) => ({
      名称: continent.名称,
      描述: continent.描述,
      大洲边界: continent.大洲边界
    })) || [],
    availableLocations: saveData.世界信息?.地点信息?.map((location: { name?: string; 名称?: string; type?: string; 类型?: string; description?: string; 描述?: string; faction?: string; 所属势力?: string; coordinates?: unknown }) => ({
      名称: location.name || location.名称,
      类型: location.type || location.类型,
      描述: location.description || location.描述,
      所属势力: location.faction || location.所属势力,
      coordinates: location.coordinates
    })) || [],
    mapConfig: saveData.世界信息?.地图配置,
    systemSettings: saveData.系统 || { nsfwMode: true, nsfwGenderFilter: 'all' }
  };

  console.log('[初始化] 🔥 世界信息检查:');
  console.log('  - 世界描述:', saveData.世界信息?.世界背景 || '未找到');
  console.log('  - 大陆数量:', worldContext.availableContinents.length);
  console.log('  - 地点数量:', worldContext.availableLocations.length);

  const systemPrompt = buildCharacterInitializationPrompt();
  const selectionsSummary = buildCharacterSelectionsSummary(userSelections, worldContext);

  const userPrompt = `我创建了角色"${baseInfo.名字}"，请根据我的选择生成开局故事和初始数据。

${selectionsSummary}

**重要提示**：
- 严格按照我的角色设定来生成内容
- 我选择的是什么样的出身、天赋、灵根，你就如实展现
- 不要强加任何预设的剧情方向或生活方式
- 这只是一个开始，我的人生我做主`;

  console.log(`[初始化] 准备生成开场剧情，角色: ${baseInfo.名字}`);
  console.log(`[初始化] 可用大陆列表:`, worldContext.availableContinents.map(c => c.名称));
  console.log(`[初始化] 可用地点数量:`, worldContext.availableLocations?.length || 0);

  const initialMessageResponse = await robustAICall(
async () => {
  console.log('[初始化] ===== 开始生成开场剧情 =====');
  const startTime = Date.now();
  try {
    // 🔥 [新架构] 使用 AIBidirectionalSystem 生成初始消息
    const aiSystem = AIBidirectionalSystem;
    const response = await aiSystem.generateInitialMessage(systemPrompt, userPrompt);

    const elapsed = Date.now() - startTime;
    console.log(`[初始化] ✅ AI生成完成,耗时: ${elapsed}ms`);

    // generateInitialMessage 内部已经解析，这里直接返回
    return response;
  } catch (error) {
    console.error(`[初始化] ❌ AI生成失败:`, error);
    throw error;
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

      // 5. 位置命令检查 - 必须使用完整路径
      const hasLocationCommand = response.tavern_commands.some((cmd: TavernCommand, index: number) => {
        const isValid = cmd &&
          cmd.action === 'set' &&
          cmd.key === '玩家角色状态.位置.描述'; // 仅接受完整路径

        if (!isValid) {
          console.log(`[AI验证-诊断] 命令${index}:`, {
            有效: !!cmd,
            action: cmd?.action,
            key: cmd?.key,
            value: typeof cmd?.value === 'string' ? cmd.value.substring(0, 50) : cmd?.value
          });
        }
        return isValid;
      });

      if (!hasLocationCommand) {
        console.warn('[AI验证] ❌ 缺少位置命令');
        console.warn('[AI验证] 现有命令keys:', response.tavern_commands.map((c: TavernCommand) => c?.key));
        return false;
      }

      // 6. 位置值验证 - 必须使用完整路径
      const locationCommand = response.tavern_commands.find((cmd: TavernCommand) =>
        cmd && cmd.action === 'set' && cmd.key === '玩家角色状态.位置.描述' // 仅接受完整路径
      );

      if (locationCommand) {
        const val = locationCommand.value;
        if (!val || typeof val !== 'string') {
          console.warn('[AI验证] ❌ 位置值格式错误，类型:', typeof val);
          console.warn('[AI验证] 位置值:', val);
          return false;
        }
        if (!val.includes('·')) {
          console.warn('[AI验证] ❌ 位置值缺少"·"分隔符');
          console.warn('[AI验证] 位置值:', val);
          return false;
        }
        if (val.includes('undefined') || val.includes('null') || val.includes('随机')) {
          console.warn('[AI验证] ❌ 位置值包含无效内容:', val);
          return false;
        }
        console.log('[AI验证] ✅ 位置命令有效:', val);
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

  // 🔥 [验证NPC生成] 打印AI返回的原始命令
  console.log('<<<<< AI Raw Commands for NPC Validation >>>>>');
  if (initialMessageResponse && Array.isArray(initialMessageResponse.tavern_commands)) {
    const npcCommands = initialMessageResponse.tavern_commands.filter((cmd: TavernCommand) => cmd.key && cmd.key.startsWith('人物关系.'));
    console.log(JSON.stringify(npcCommands, null, 2));
  }
  console.log('<<<<< End of AI Raw Commands >>>>>');

  const aiSystem = AIBidirectionalSystem;
  const { saveData: saveDataAfterCommands, stateChanges } = await aiSystem.processGmResponse(initialMessageResponse as GM_Response, saveData, true);

  const openingStory = String(initialMessageResponse.text || '');
  if (!openingStory.trim()) {
    throw new Error('AI生成的开场剧情为空');
  }

  // 🔥 诊断日志：检查 stateChanges 是否为空
  console.log('[初始化-诊断] 状态变更日志检查:', {
    有变更记录: !!stateChanges,
    变更数量: stateChanges?.changes?.length || 0,
    变更内容: stateChanges?.changes || []
  });

  if (!stateChanges || stateChanges.changes.length === 0) {
    console.warn('[初始化-警告] ⚠️ AI响应未包含任何状态变更命令，开局变量修改日志将为空');
    console.warn('[初始化-警告] 请检查AI提示词是否要求返回 tavern_commands');
  }

  // 🔥 将初始状态变更保存到叙事历史中，确保持久化
  if (!saveDataAfterCommands.叙事历史) {
    saveDataAfterCommands.叙事历史 = [];
  }

  const formatTime = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const currentTime = formatTime();

  // 保存到叙事历史（用于恢复状态）
  saveDataAfterCommands.叙事历史.push({
    type: 'gm',
    content: openingStory,
    time: currentTime,
    stateChanges: stateChanges // 保存初始状态变更
  });

  // 🔥 同时保存到短期记忆（完整历史记录）
  if (!saveDataAfterCommands.记忆) {
    saveDataAfterCommands.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
  }
  if (!saveDataAfterCommands.记忆.短期记忆) {
    saveDataAfterCommands.记忆.短期记忆 = [];
  }
  const initialMemoryText = `【${currentTime}】\n${openingStory}`;
  saveDataAfterCommands.记忆.短期记忆.unshift(initialMemoryText);

  // 🔥 保存到隐式中期记忆（角色重要记忆）
  if (!saveDataAfterCommands.记忆.隐式中期记忆) {
    saveDataAfterCommands.记忆.隐式中期记忆 = [];
  }
  saveDataAfterCommands.记忆.隐式中期记忆.push(initialMemoryText);

  console.log('[初始化] ✅ 已将开场剧情保存到:');
  console.log('  - 叙事历史（用于状态恢复）');
  console.log('  - 短期记忆（完整历史记录）');
  console.log('  - 隐式中期记忆（重要记忆）');
  console.log('[初始化] ✅ generateOpeningScene完成,返回数据');

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

  // 3. 出身 (Origin) - 可选，null表示随机
  const authoritativeOrigin = creationStore.selectedOrigin;
  if (authoritativeOrigin) {
    console.log(`[数据校准] ✅ 同步用户选择的出身: ${authoritativeOrigin.name}`);
    derivedInfo.出生 = authoritativeOrigin;
  } else if (creationStore.characterPayload.origin_id === null) {
    // 🔥 修复：安全检查，防止访问undefined对象的属性
    const 出生对象 = derivedInfo.出生;
    if (typeof 出生对象 !== 'object' || !出生对象 || !(出生对象 as Origin).name || (出生对象 as Origin).name.includes('随机')) {
        console.log('[数据校准] 🎲 用户选择随机出身，当前无有效值，标记为随机');
        derivedInfo.出生 = '随机出身';
    } else {
        console.log('[数据校准] ✅ 检测到AI已生成具体出身，保留AI结果:', (出生对象 as Origin).name);
    }
  } else {
    console.warn('[数据校准] 警告: 无法找到权威的出身数据。');
  }

  // 4. 灵根 (Spirit Root) - 可选，null表示随机
  const authoritativeSpiritRoot = creationStore.selectedSpiritRoot;
  if (authoritativeSpiritRoot) {
    console.log(`[数据校准] ✅ 同步用户选择的灵根: ${authoritativeSpiritRoot.name} (${authoritativeSpiritRoot.tier})`);
    derivedInfo.灵根 = authoritativeSpiritRoot;
  } else if (creationStore.characterPayload.spirit_root_id === null) {
    // 🔥 修复：安全检查，防止访问undefined对象的属性
    const 灵根对象 = derivedInfo.灵根;
    if (typeof 灵根对象 !== 'object' || !灵根对象 || !(灵根对象 as SpiritRoot).name || (灵根对象 as SpiritRoot).name.includes('随机')) {
        console.log('[数据校准] 🎲 用户选择随机灵根，当前无有效值，标记为随机');
        derivedInfo.灵根 = '随机灵根';
    } else{
        console.log('[数据校准] ✅ 检测到AI已生成具体灵根，保留AI结果:', (灵根对象 as SpiritRoot).name);
    }
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
 * @param baseInfo - 原始角色基础信息
 * @param world - 原始世界信息
 * @param age - 原始年龄
 * @returns 最终完成的存档数据
 */
async function finalizeAndSyncData(saveData: SaveData, baseInfo: CharacterBaseInfo, world: World, age: number): Promise<SaveData> {
  console.log('[初始化流程] 4. 合并、验证并同步最终数据');
  const uiStore = useUIStore();
  uiStore.updateLoadingText(`正在同步数据，即将进入${baseInfo.名字}的修仙世界...`);

  // 1. 合并AI生成的数据和用户选择的原始数据，并保护核心字段
  const mergedBaseInfo: CharacterBaseInfo = {
    ...saveData.角色基础信息, // AI可能添加了新字段
    ...baseInfo,              // 用户的原始选择（包含*详情）优先级更高
    // 强制保护核心不可变字段
    名字: baseInfo.名字,
    性别: baseInfo.性别,
    种族: baseInfo.种族,
    先天六司: baseInfo.先天六司,
    天赋: baseInfo.天赋, // 强制使用玩家选择的完整天赋列表
  };

  // 🔥 最终权威性覆盖：直接从创角仓库获取最原始的选择，覆盖AI可能产生的任何修改
  // 【重要】这确保了用户手动选择的信息永远不会被AI或代码修改
  // 只有用户选择"随机"时，才使用AI生成的数据
  const creationStore = useCharacterCreationStore();

  // 灵根权威覆盖
  const authoritativeSpiritRoot = creationStore.selectedSpiritRoot;
  if (authoritativeSpiritRoot) {
    // 用户手动选择了特定灵根，强制使用用户的选择，不使用AI生成
    console.log(`[数据最终化] ✅ 用户选择特定灵根，使用用户选择: ${authoritativeSpiritRoot.name}`);
    mergedBaseInfo.灵根 = authoritativeSpiritRoot;
  } else {
    // 用户选择了"随机灵根"，使用AI生成的数据
    console.log('[数据最终化] 🎲 用户选择随机灵根，使用AI生成的数据');
    const aiGeneratedSpiritRoot = saveData.角色基础信息?.灵根;
    console.log('[数据最终化] AI生成的灵根数据:', JSON.stringify(aiGeneratedSpiritRoot));
    mergedBaseInfo.灵根 = aiGeneratedSpiritRoot || '随机灵根';

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
  }

  // 出生权威覆盖
  const authoritativeOrigin = creationStore.selectedOrigin;
  if (authoritativeOrigin) {
    // 用户手动选择了特定出身，强制使用用户的选择，不使用AI生成
    console.log(`[数据最终化] ✅ 用户选择特定出身，使用用户选择: ${authoritativeOrigin.name}`);
    mergedBaseInfo.出生 = authoritativeOrigin;
  } else {
    // 用户选择了"随机出身"，使用AI生成的数据
    console.log('[数据最终化] 🎲 用户选择随机出身，使用AI生成的数据');
    const aiGeneratedOrigin = saveData.角色基础信息?.出生;
    console.log('[数据最终化] AI生成的出身数据:', JSON.stringify(aiGeneratedOrigin));
    mergedBaseInfo.出生 = aiGeneratedOrigin || '随机出身';

    // 验证AI是否正确替换了随机出身
    if (typeof mergedBaseInfo.出生 === 'string' && mergedBaseInfo.出生.includes('随机')) {
      console.warn('[数据最终化] ⚠️ 警告：AI未能正确替换随机出身，使用本地数据库生成');

      // 🔥 后备逻辑：使用本地数据库随机生成
      // 从本地数据库中随机选择一个出身
      const 随机出身 = LOCAL_ORIGINS[Math.floor(Math.random() * LOCAL_ORIGINS.length)];
      mergedBaseInfo.出生 = 随机出身;
      console.log(`[数据最终化] ✅ 已从本地数据库生成随机出身: ${随机出身.name}`);
    }
  }

  // 2. 从详情对象派生基础字段，确保数据一致性
  const finalBaseInfo = deriveBaseFieldsFromDetails(mergedBaseInfo);
  saveData.角色基础信息 = finalBaseInfo;

  // 3. 核心状态权威性校准
  // AI返回的数据可能会覆盖或损坏预先计算好的核心状态。
  // 此处，我们基于原始的角色选择（baseInfo）重新计算整个玩家状态，
  // 以确保其权威性和完整性，然后只保留AI对剧情至关重要的"位置"信息。
  console.log('[数据最终化] 重新计算并校准核心玩家状态...');
  const authoritativeStatus = calculateInitialAttributes(baseInfo, age);

  // 🔥 关键修复：位置数据应该在 saveData.玩家角色状态.位置
  const aiLocation = saveData.玩家角色状态?.位置;
  console.log('[数据最终化-诊断] AI设置的位置对象:', JSON.stringify(aiLocation));
  console.log('[数据最终化-诊断] saveData.玩家角色状态?.位置:', saveData.玩家角色状态?.位置);

  saveData.玩家角色状态 = authoritativeStatus; // 用权威数据完全覆盖

  // 🔥 位置信息应该已经通过验证器检查，这里只是保留AI生成的值
  if (aiLocation && typeof aiLocation.描述 === 'string' && aiLocation.描述.includes('·')) {
    saveData.玩家角色状态.位置 = aiLocation;
    console.log(`[数据最终化] ✅ 已保留AI生成的位置信息: "${aiLocation.描述}"`);
  } else {
    // 如果没有有效位置，记录详细的诊断信息
    console.error('[数据最终化] ❌ 位置信息无效或丢失');
    console.error('[数据最终化-诊断] aiLocation:', aiLocation);
    console.error('[数据最终化-诊断] aiLocation.描述:', aiLocation?.描述);
    console.error('[数据最终化-诊断] 完整saveData keys:', Object.keys(saveData));

    // 尝试从叙事历史中找到位置命令
    const narrativeHistory = saveData.叙事历史 || [];
    if (narrativeHistory.length > 0) {
      const lastEntry = narrativeHistory[narrativeHistory.length - 1];
      console.error('[数据最终化-诊断] 最后的叙事历史:', JSON.stringify(lastEntry).substring(0, 500));
    }

    throw new Error(`位置信息在处理过程中丢失，aiLocation=${JSON.stringify(aiLocation)}`);
  }
  console.log('[数据最终化] 核心玩家状态校准完成。');

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

  // 3. 最终位置信息确认日志
  // 位置已经在验证器中严格检查，这里只是最后确认
  const finalLocation = saveData.玩家角色状态?.位置?.描述;
  console.log(`[数据校准] ✅ 位置信息最终确认: "${finalLocation}"`);

  // 双重保险：如果位置格式仍然有问题（理论上不会发生）
  if (!finalLocation || !finalLocation.includes('·')) {
    console.error('[数据校准] ❌ 位置格式异常，这不应该发生（验证器应该已拦截）');
    throw new Error(`位置格式验证失败: "${finalLocation}"`);
  }

  // 4. 最终数据校验
  const finalValidation = validateGameData(saveData, { 角色基础信息: baseInfo, 模式: '单机' }, 'creation');
  if (!finalValidation.isValid) {
    throw new Error(`角色数据最终验证失败: ${finalValidation.errors.join(', ')}`);
  }

  // 5. 数据一致性强力校验：根除“幽灵功法”
  // 检查是否存在一个“正在修炼”的功法记录，但背包里却没有对应的、已装备的实体物品。
  // 这种情况通常是AI指令错误导致的，必须在此处修正。
  if (saveData.修炼功法) {
    const techniqueName = saveData.修炼功法.名称;
    const correspondingItemInInventory = Object.values(saveData.背包?.物品 || {}).find(
      item => item.类型 === '功法' && item.名称 === techniqueName && item.已装备
    );

    if (!correspondingItemInInventory) {
      console.warn(`[数据校准] 检测到无效的“幽灵功法”：修炼槽非空，但背包中无对应实体。正在清除无效修炼状态...`);
      saveData.修炼功法 = null; // 彻底清除无效的修炼记录
    } else {
      console.log(`[数据校准] 功法一致性校验通过: "${techniqueName}"`);
    }
  }

  // ❌ [已废弃] 功法技能描述校准 (Fallback)
  // saveData.修炼功法 现在只存储引用（物品ID+名称），功法技能存储在背包物品中
  /*
  if (saveData.修炼功法 && saveData.修炼功法.功法技能) {
    const skills = saveData.修炼功法.功法技能;
    Object.entries(skills).forEach(([skillName, skillInfo]) => {
      if (typeof skillInfo === 'object' && skillInfo !== null && !(skillInfo as Record<string, any>).技能描述) {
        console.warn(`[数据校准] 功法 "${saveData.修炼功法?.名称}" 的技能 "${skillName}" 缺少描述，已添加默认描述。`);
        (skillInfo as Record<string, any>).技能描述 = '此技能玄奥非凡，具体效果需在实战中领悟。';
      }
    });
  }
  */

  // 7. 🔥 [新架构] 跳过酒馆同步
  // 新架构不再使用酒馆变量存储游戏状态
  // 数据已经在 Pinia Store 中，会自动保存到 IndexedDB
  console.log('[初始化流程] ✅ 角色创建完成（新架构跳过酒馆同步）');
  uiStore.updateLoadingText('✅ 角色创建完成！');

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

    // 步骤 2.5: 🔥 [新架构] 跳过世界信息保存到酒馆
    // 世界信息已经在 saveData 中，AI会在prompt中接收到完整状态
    console.log('[初始化流程] 2.5 世界信息已包含在saveData中（新架构跳过酒馆同步）');
    console.log('[初始化流程] 世界包含', worldInfo.大陆信息?.length || 0, '个大陆');
    console.log('[初始化流程] 大陆列表:', worldInfo.大陆信息?.map((c: Continent) => c.名称 || c.name).join('、'));

    // 步骤 3: 生成开场剧情 (已包含独立的地点生成步骤)
    console.log('[初始化流程] 准备调用generateOpeningScene...');
    const { finalSaveData } = await generateOpeningScene(initialSaveData, processedBaseInfo, world, age);
    console.log('[初始化流程] generateOpeningScene已返回');

    // 步骤 3.5: 核心属性校准
    // AI在生成开场时可能会意外覆盖或删除我们预先计算好的核心属性。
    // 此处强制将我们计算的初始值重新应用到最终存档数据中，以确保数据一致性。
    // 这会保留AI对“位置”等字段的修改，同时保护“气血”、“寿命”等核心数据。
    console.log('[初始化流程] 核心属性校准：重新应用计算出的初始属性...');
    const authoritativeStatus = calculateInitialAttributes(baseInfo, age);
    const aiModifiedStatus = finalSaveData.玩家角色状态 || {};

    finalSaveData.玩家角色状态 = {
      ...authoritativeStatus, // 以计算值为基础，确保所有字段存在
      ...aiModifiedStatus,    // 应用AI的修改（如 `位置`）
      // 再次强制覆盖核心计算属性，防止被AI的（可能为空的）值覆盖
      寿命: authoritativeStatus.寿命,
      气血: authoritativeStatus.气血,
      灵气: authoritativeStatus.灵气,
      神识: authoritativeStatus.神识,
      境界: authoritativeStatus.境界,
    };
    console.log('[初始化流程] 核心属性校准完成。');

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
