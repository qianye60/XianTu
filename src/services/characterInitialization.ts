/**
 * @fileoverview 角色初始化服务
 * 负责角色创建生成和完整初始化流程，包括AI动态生成。
 */

import { getTavernHelper } from '@/utils/tavern';
import { syncToTavern } from '@/utils/judgement/heavenlyRules';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, SaveData, PlayerStatus, WorldInfo } from '@/types/game';
import type { World } from '@/types';
import { validateAndFixSaveData } from '@/utils/dataValidation';
import { generateInitialMessage } from '@/utils/tavernAI';
import { processGmResponse } from '@/utils/AIGameMaster';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { CHARACTER_INITIALIZATION_PROMPT } from '@/utils/prompts/characterInitializationPrompts';
// 移除未使用的旧生成器导入，改用增强版生成器
// import { WorldGenerationConfig } from '@/utils/worldGeneration/gameWorldConfig';
import { EnhancedWorldGenerator } from '@/utils/worldGeneration/enhancedWorldGenerator';
import { generateRandomSpiritRoot, isRandomSpiritRoot, formatSpiritRootObject } from '@/utils/spiritRootGenerator';

/**
 * 创建一个可重试的AI调用包装器，支持用户确认功能
 * @param aiFunction 要调用的AI生成函数
 * @param validator 验证AI响应是否有效的函数
 * @param maxRetries 最大自动重试次数
 * @param progressMessage 进行时显示的toast消息
 * @returns AI调用的返回结果
 */
async function retryableAICall<T>(
  aiFunction: () => Promise<T>,
  validator: (response: T) => boolean,
  maxRetries: number,
  progressMessage: string
): Promise<T> {
  const uiStore = useUIStore();
  let lastError: Error | null = null;

  // 先进行自动重试
  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) {
        uiStore.updateLoadingText(`${progressMessage} (第 ${i} 次重试)`);
      }
      console.log(`[retryableAICall] 正在尝试: ${progressMessage}, 第 ${i + 1} 次`);
      const response = await aiFunction();
      console.log(`[retryableAICall] 收到响应 for ${progressMessage}:`, response);
      const isValid = validator(response);
      console.log(`[retryableAICall] 响应验证结果 for ${progressMessage}: ${isValid}`);
      if (isValid) {
        return response;
      }
      throw new Error(`AI响应格式无效或未通过验证`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[AI调用重试] 第 ${i} 次尝试失败:`, lastError.message);
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 递增延迟
      }
    }
  }

  // 自动重试后仍失败，询问用户是否继续
  const shouldRetry = await askUserForRetry(progressMessage, lastError?.message || '未知错误');
  if (shouldRetry) {
    // 用户选择继续，进入手动重试流程
    return await retryableAICallWithUserChoice(aiFunction, validator, progressMessage);
  } else {
    // 用户选择放弃，抛出错误
    throw new Error(`${progressMessage}失败，用户选择不继续重试: ${lastError?.message}`);
  }
}

/**
 * 询问用户是否继续重试
 */
async function askUserForRetry(taskName: string, errorMessage: string): Promise<boolean> {
  return new Promise((resolve) => {
    const uiStore = useUIStore();

    // 显示重试询问框
    uiStore.showRetryDialog({
      title: `${taskName}失败`,
      message: `${taskName}经过多次尝试后仍然失败。\n\n错误信息：${errorMessage}\n\n是否继续重试？\n选择"取消"将终止角色创建流程。`,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
}

/**
 * 用户确认后的重试逻辑
 */
async function retryableAICallWithUserChoice<T>(
  aiFunction: () => Promise<T>,
  validator: (response: T) => boolean,
  progressMessage: string
): Promise<T> {
  const uiStore = useUIStore();

  // 用户确认后进入手动重试流程
  for (let i = 1; i <= 3; i++) {
    try {
      uiStore.updateLoadingText(`${progressMessage} (用户确认第 ${i} 次重试)`);
      const response = await aiFunction();
      if (validator(response)) {
        return response;
      }
      throw new Error('AI响应格式无效');
    } catch (error) {
      console.warn(`[用户确认重试] 第 ${i} 次尝试失败:`, error);
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000 * i)); // 递增延迟
      }
    }
  }

  // 仍然失败，再次询问用户
  const shouldContinueRetry = await askUserForRetry(progressMessage, '多次重试仍然失败');
  if (shouldContinueRetry) {
    // 递归继续重试
    return await retryableAICallWithUserChoice(aiFunction, validator, progressMessage);
  } else {
    // 用户最终放弃，抛出错误并终止角色创建
    throw new Error(`${progressMessage}失败，用户选择终止角色创建`);
  }
}

/**
 * 计算角色的初始属性值
 */
export function calculateInitialAttributes(baseInfo: CharacterBaseInfo, age: number): PlayerStatus {
  const { 先天六司 } = baseInfo;

  // 确保先天六司都是有效的数值，避免NaN
  const 根骨 = Number(先天六司?.根骨) || 10;
  const 灵性 = Number(先天六司?.灵性) || 10;
  const 悟性 = Number(先天六司?.悟性) || 10;

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
      等级: 0,
      名称: "凡人",
      当前进度: 0,
      下一级所需: 100,
      突破描述: "引气入体，开始修仙之路"
    },
    声望: 0, // 声望应该是数字类型
    位置: {
      描述: "位置生成失败" // 标记为错误状态而不是默认值
    },
    气血: { 当前: 初始气血, 最大: 初始气血 },
    灵气: { 当前: 初始灵气, 最大: 初始灵气 }, // 凡人灵气为零
    神识: { 当前: 初始神识, 最大: 初始神识 },
    寿命: { 当前: age, 最大: 最大寿命 }, // 当前年龄和最大寿命
    修为: { 当前: 0, 最大: 100 }, // 修为应该是ValuePair类型
    状态效果: [] // 使用新的StatusEffect数组格式
  };
}

/**
 * 完整的角色初始化流程 (AI驱动)
 */
export async function initializeCharacter(
  charId: string,
  baseInfo: CharacterBaseInfo,
  world: World,
  age: number
): Promise<SaveData> {
  const uiStore = useUIStore();
  const helper = getTavernHelper();
  if (!helper) throw new Error('无法连接到酒馆服务');

  let worldDataFromGenerator: WorldInfo | null = null; // 存储从生成器获得的数据

  try {
    uiStore.updateLoadingText('天道正在为你准备一个崭新的世界...');

    // 0. 智能灵根生成 - 如果选择了随机灵根，根据天资等级生成完整的灵根信息
    if (isRandomSpiritRoot(baseInfo.灵根)) {
      console.log('[灵根生成] 检测到随机灵根，开始智能生成');
      try {
        const generatedSpiritRoot = generateRandomSpiritRoot(baseInfo.天资 || '中人之姿');
        const formattedSpiritRoot = formatSpiritRootObject(generatedSpiritRoot);

        // 更新角色基础信息中的灵根
        baseInfo.灵根 = formattedSpiritRoot;

        console.log('[灵根生成] 智能生成完成:', {
          名称: formattedSpiritRoot.名称,
          品级: formattedSpiritRoot.品级,
          修炼速度: generatedSpiritRoot.cultivation_speed,
          特殊效果数量: generatedSpiritRoot.special_effects.length
        });
      } catch (error) {
        console.warn('[灵根生成] 智能生成失败，使用默认灵根:', error);
        // 如果生成失败，使用默认的五行灵根
        baseInfo.灵根 = {
          名称: '五行灵根',
          品级: '凡品',
          描述: '五行齐全的均衡灵根，修炼各系功法都有不错效果'
        };
      }
    }

    // 1. 计算基础属性
    const playerStatus = calculateInitialAttributes(baseInfo, age);

    // 获取用户配置的世界生成设置
    const characterCreationStore = useCharacterCreationStore();
    const userWorldConfig = characterCreationStore.worldGenerationConfig;
    console.log('角色初始化：使用用户配置的世界生成设置:', userWorldConfig);

    // 获取选择的世界信息
    const selectedWorld = characterCreationStore.selectedWorld;
    console.log('角色初始化：选择的世界:', selectedWorld);

    // 构建包含世界详细信息的角色创建信息
    const characterInfo = {
      origin: baseInfo.出生,
      age: age,
      birthplace: baseInfo.出生, // 出生作为信息
      worldBackground: selectedWorld?.description || world.description || '未知世界背景',
      worldEra: selectedWorld?.era || world.era || '未知时代',
      worldName: selectedWorld?.name || world.name || '未知世界'
    };
    console.log('角色初始化：角色创建信息:', characterInfo);

    // 构建增强的世界配置，包含地图生成参数
    const enhancedWorldConfig = {
      ...userWorldConfig,
      // 添加选择的世界背景信息
      worldBackground: selectedWorld?.description || world.description,
      worldEra: selectedWorld?.era || world.era,
      worldName: selectedWorld?.name || world.name,
      // 添加地图生成的具体参数
      mapGenerationSettings: {
        totalFactions: userWorldConfig.majorFactionsCount || 7,
        totalLocations: userWorldConfig.totalLocations || 25,
        secretRealms: userWorldConfig.secretRealmsCount || 8,
        generateInitialPosition: true, // 需要生成角色初始位置
        characterOrigin: baseInfo.出生 // 根据角色出生生成合适的初始位置
      }
    };
    console.log('角色初始化：增强的世界配置:', enhancedWorldConfig);

    // 安全地从复杂对象中提取名称
    const extractName = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && '名称' in (value as Record<string, unknown>)) {
        const n = (value as Record<string, unknown>).名称;
        if (typeof n === 'string') return n;
      }
      return String(value ?? '');
    };


    // 0.5. 世界生成（使用增强世界生成器）
    uiStore.updateLoadingText('天道正在编织这个世界的命运...');
    try {
      // 构建增强世界生成器配置
        const enhancedConfig = {
          worldName: selectedWorld?.name || world.name,
          worldBackground: selectedWorld?.description || world.description,
          worldEra: selectedWorld?.era || world.era,
          factionCount: userWorldConfig.majorFactionsCount || 7,
          locationCount: userWorldConfig.totalLocations || 25,
          secretRealmsCount: userWorldConfig.secretRealmsCount || 8,
          continentCount: userWorldConfig.continentCount || Math.floor(Math.random() * 5) + 3, // 3-7个大陆
          maxRetries: 3,
          retryDelay: 2000,
          characterBackground: extractName(baseInfo.出生),
          mapConfig: userWorldConfig.mapConfig // 传递地图配置
        };

      console.log('[角色初始化] 使用增强世界生成器配置:', enhancedConfig);

      // 创建增强世界生成器
      const enhancedWorldGenerator = new EnhancedWorldGenerator(enhancedConfig);

      try {
        // 使用增强世界生成器生成，带错误处理和重试机制
        console.log('--- [AI DEBUG] 即将开始世界生成 ---');
        console.log('[角色初始化] 开始调用EnhancedWorldGenerator');

        const worldGenerationResult = await enhancedWorldGenerator.generateValidatedWorld();
        console.log('--- [AI DEBUG] 世界生成调用完成 ---');

        console.log('[角色初始化] 增强世界生成结果:', worldGenerationResult);

        if (worldGenerationResult.success && worldGenerationResult.worldInfo) {
          // 成功：增强世界生成器返回了世界信息
          worldDataFromGenerator = worldGenerationResult.worldInfo;
          console.log('[角色初始化] 已获取增强世界生成器返回的世界信息:', {
            世界名称: worldDataFromGenerator.世界名称,
            大陆数量: worldDataFromGenerator.大陆信息?.length || 0,
            势力数量: worldDataFromGenerator.势力信息?.length || 0,
            地点数量: worldDataFromGenerator.地点信息?.length || 0
          });

          // 将世界信息保存到酒馆变量
          await helper.insertOrAssignVariables({
            'character.saveData': { 世界信息: worldDataFromGenerator }
          }, { type: 'chat' });

          console.log('[角色初始化] 增强世界数据已保存到酒馆变量');
        } else {
          console.error('[角色初始化] 增强世界生成失败:', worldGenerationResult.errors);

          // 用户要求：生成失败就重新生成，不使用fallback数据
          throw new Error(`世界生成失败：${worldGenerationResult.errors?.join(', ') || '未知错误'}。请重新开始角色创建流程。`);
        }

        // 等待世界生成完成
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log('[角色初始化] 世界生成完成并保存到酒馆变量');
      } catch (worldGenError) {
        console.error('[角色初始化] 世界生成API调用失败:', worldGenError);
        const errorMessage = worldGenError instanceof Error ? worldGenError.message : String(worldGenError);
        throw new Error(`世界生成失败: ${errorMessage}`);
      }

      // 0.6. 使用预设坐标设置角色出生地（坐标已在世界生成时确定）
      uiStore.updateLoadingText('天道正在为你安排降生之地...');
      try {
        // 获取用户描述的出生地名称
        const userBirthDescription = extractName(baseInfo.出生);

        // 设置玩家位置信息，位置描述将由AI根据角色背景生成
        playerStatus.位置 = {
          描述: '初始地' // 临时占位符，AI将根据角色背景生成具体位置
        };

        console.log('[角色初始化] 出生地已确定:', {
          名称: userBirthDescription,
          描述: playerStatus.位置.描述
        });

      } catch (birthplaceError) {
        console.error('[角色初始化] 出生地设置失败:', birthplaceError);
        // 如果出错，使用默认位置作为fallback
        playerStatus.位置 = {
          描述: extractName(baseInfo.出生) || '初始地'
        };
      }

    } catch (worldGenError) {
      console.error('[角色初始化] 世界生成失败:', worldGenError);
      const errorMessage = worldGenError instanceof Error ? worldGenError.message : String(worldGenError);
      throw new Error(`世界生成失败: ${errorMessage}`);
    }

    // 2. 创建基础存档结构（符合 SaveData 类型）
    const saveData: SaveData = {
        角色基础信息: baseInfo, // 初始时使用 baseInfo
        玩家角色状态: playerStatus,
        装备栏: {
            装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null,
        },
        三千大道: createEmptyThousandDaoSystem(),
        背包: {
            灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
            物品: [], // [REFACTORED] 物品现在是数组
        },
        人物关系: {}, // 正确的字段名
        宗门系统: {
            availableSects: [], sectRelationships: {}, sectHistory: [],
        },
        记忆: {
            短期记忆: [], 中期记忆: [], 长期记忆: [],
        },
        游戏时间: {
            年: 1, 月: 1, 日: 1, 小时: Math.floor(Math.random() * 12) + 6, 分钟: Math.floor(Math.random() * 60),
        },
        修炼功法: {
            功法: null, 熟练度: 0, 已解锁技能: [], 修炼时间: 0, 突破次数: 0, 正在修炼: false, 修炼进度: 0,
        }
    };

    // ================= AI 动态生成部分 =================

    // 3. 设置世界背景到酒馆变量中
    try {
      // 如果有世界信息，世界背景信息已直接存在saveData中，不再重复设置（避免覆盖的问题）
      console.log(`世界背景《${world.name}》已准备完毕，正在初始化存档`);
    } catch (err) {
      console.warn('设置世界背景失败:', err);
    }

    // 4. 世界地图生成（之前由CultivationWorldGenerator处理，现在已完成）
    // [重构更新] 系统已经完成了世界生成和数据，不需要重复调用旧的地图生成系统
    let currentSaveData = saveData; // saveData变量已经包含同步的世界生成器信息

    // 位置信息已经在初始化信息生成，无需重新设置位置变量
    uiStore.updateLoadingText('天道正在为你书写命运之章...');

    // 5.1 构建传递给角色初始化AI的 creationDetails（AI生成剧情）
    const creationDetails = {
      age: age,
      originName: typeof baseInfo.出生 === 'string' ? baseInfo.出生 : baseInfo.出生.名称,
      spiritRootName: typeof baseInfo.灵根 === 'string' ? baseInfo.灵根 : baseInfo.灵根.名称,
      talentNames: baseInfo.天赋,
      talentTierName: baseInfo.天资
    };

    // 5.2 构建传递给初始游戏数据包给AI
    const normalizedBaseInfo = {
      ...baseInfo,
      天赋: Array.isArray(baseInfo.天赋)
        ? baseInfo.天赋.map(talent =>
            typeof talent === 'string' ? talent : talent.名称
          )
        : baseInfo.天赋
    };

    const initialGameDataForAI = {
      baseInfo: normalizedBaseInfo,
      saveData: currentSaveData, // [重构更新] 使用更新了地图数据的saveData
      world,
      creationDetails,
    };
    console.log('--- [AI DEBUG] 即将调用AI生成初始消息 ---');
    console.log('[AI DEBUG] 传递给AI的初始数据 (initialGameDataForAI):', JSON.parse(JSON.stringify(initialGameDataForAI)));


    // 5.2 生成初始信息（开场对话设计）
    // 注意：由于地图数据由CultivationWorldGenerator保存到酒馆变量，传递null即可
    // 但需要根据变量数据以便保证
    const initialMessageResponse = await retryableAICall(
      () => generateInitialMessage(initialGameDataForAI, {}, CHARACTER_INITIALIZATION_PROMPT),
      (response) => Boolean(response && response.text && Array.isArray(response.tavern_commands)), // 验证响应是否有效
      2, // 最大重试次数
      '天道正在书写命运之章'
    );

    console.log('--- [AI DEBUG] AI初始消息生成调用完成 ---');
    console.log('[AI DEBUG] AI返回的初始消息响应 (initialMessageResponse):', initialMessageResponse);

    // 5.3 严格保护用户选择的固定字段，避免被AI确认功能
    // 这些核心字段，除非用户确选择"随机"时才允许AI精细化
    console.log('[角色初始化] 开始验证用户选择的固定字段保护...');

    // 验证并保护用户的核心信息
    const protectedFields = {
      名字: baseInfo.名字,
      性别: baseInfo.性别,
      年龄: baseInfo.年龄,
      先天六司: { ...baseInfo.先天六司 }
    };
    console.log('[角色初始化] 受保护的核心字段:', protectedFields);

    // 只有当用户明确选择"随机"时才允许精细化响应处理
    if (
      initialMessageResponse.processedOrigin &&
      typeof baseInfo.出生 === 'string' &&
      (baseInfo.出生.includes('随机') || baseInfo.出生 === '随机')
    ) {
      baseInfo.出生 = initialMessageResponse.processedOrigin;
      console.log('[角色初始化] 出生已精细化为:', baseInfo.出生);

      // 位置描述应该是具体的地理位置，不是出生背景
      // 位置生成由后续的AI系统处理，这里不强制覆盖
      console.log('[角色初始化] 位置描述将由AI系统生成具体地理位置');
    } else {
      console.log('[角色初始化] 出生字段已固定，不允许修改:', baseInfo.出生);
    }

    if (
      initialMessageResponse.processedSpiritRoot &&
      typeof baseInfo.灵根 === 'string' &&
      (baseInfo.灵根.includes('随机') || baseInfo.灵根 === '随机')
    ) {
      baseInfo.灵根 = initialMessageResponse.processedSpiritRoot;
      console.log('[角色初始化] 灵根已精细化为:', baseInfo.灵根);
    } else {
      console.log('[角色初始化] 灵根字段已固定，不允许修改:', baseInfo.灵根);
    }

    // 强制验证核心字段未被意外修改
    if (baseInfo.名字 !== protectedFields.名字) {
      console.error('[角色初始化] 检测到名字被意外修改，强制恢复:', protectedFields.名字);
      baseInfo.名字 = protectedFields.名字;
    }
    if (baseInfo.性别 !== protectedFields.性别) {
      console.error('[角色初始化] 检测到性别被意外修改，强制恢复:', protectedFields.性别);
      baseInfo.性别 = protectedFields.性别;
    }
    if (baseInfo.年龄 !== protectedFields.年龄) {
      console.error('[角色初始化] 检测到年龄被意外修改，强制恢复:', protectedFields.年龄);
      baseInfo.年龄 = protectedFields.年龄;
    }

    // 验证先天六司未被修改
    const current先天六司 = baseInfo.先天六司;
    const protected先天六司 = protectedFields.先天六司;
    if (current先天六司 && protected先天六司) {
        for (const [key, value] of Object.entries(protected先天六司)) {
            if (current先天六司[key as keyof typeof current先天六司] !== value) {
                console.error(`[角色初始化] 检测到先天六司.${key}被意外修改，强制恢复:`, value);
                current先天六司[key as keyof typeof current先天六司] = value;
            }
        }
    }

    // 5.4 处理开场的开场信息和剧情（使用AI生成的数据，不重复）
    const openingStory = String(initialMessageResponse.text || '');

    // 构建完整的开场信息，添加强制注意事项前缀，避免被AI设定冲突
    const fullOpeningMessage = openingStory;
    // 注意：不直接写入/显示 mid_term_memory，而是通过转换器使用
    // (initialMessageResponse as any).mid_term_memory 可能存在内部处理相关的提示用的中期记忆

    console.log('[角色初始化] 生成的开场剧情信息:', fullOpeningMessage.substring(0, 200));

    // 写入短期记忆（来源于AI的开场text，中期记忆不直接写入）
    try {
      if (!currentSaveData.记忆) currentSaveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
      if (!Array.isArray(currentSaveData.记忆.短期记忆)) currentSaveData.记忆.短期记忆 = [];
      if (!Array.isArray(currentSaveData.记忆.中期记忆)) currentSaveData.记忆.中期记忆 = [];
      if (fullOpeningMessage.trim()) {
        const shortEntry = fullOpeningMessage.length > 2000 ? `${fullOpeningMessage.substring(0, 2000)}...` : fullOpeningMessage;
        currentSaveData.记忆.短期记忆.push(shortEntry);
      }
      // 中期记忆：不直接展示AI返回的 mid_term_memory，而是通过转换器
    } catch (e) {
      console.warn('[角色初始化] 写入记忆失败，可忽略:', e);
    }

    // 5.5 调用 processGmResponse 来执行AI返回的命令指令（物品、装备等）
    // 删除格式检查 - 现在只支持数组格式
    console.log('--- [AI DEBUG] 即将处理AI指令 ---');
    console.log('[AI DEBUG] 处理前存档数据:', JSON.parse(JSON.stringify(currentSaveData)));
    const { saveData: saveDataAfterCommands, stateChanges } = await processGmResponse(initialMessageResponse, currentSaveData);
    currentSaveData = saveDataAfterCommands;
    console.log('--- [AI DEBUG] AI指令处理完成 ---');
    console.log('[AI DEBUG] 处理后存档数据:', JSON.parse(JSON.stringify(currentSaveData)));

    // [新增] 将初始状态变更暂存到 characterStore
    const characterStore = useCharacterStore();
    characterStore.setInitialCreationStateChanges(stateChanges);
    console.log('[角色初始化] 初始状态变更已暂存:', stateChanges);

    // 5.6 统一校验和修复异常字段（角色物品/角色状态 等），清理装备栏/背包中的"null"字符串等
    try {
      currentSaveData = validateAndFixSaveData(currentSaveData as SaveData) as SaveData;
    } catch (e) {
      console.warn('[角色初始化] validateAndFixSaveData 处理失败，继续使用原数据', e);
    }

    // ================= 数据同步和存储用户 =================

    // 6. 将数据确保正确存储到酒馆变量中
    uiStore.updateLoadingText(`正在同步数据，即将进入${baseInfo.名字}的修仙世界...`);
    try {
      // [数据重构] 保存全局变量，只包含不变的"身份标识"
      const globalVars = {
        'character.name': baseInfo.名字,
        'character.creation_time': new Date().toISOString()
      };
      await helper.insertOrAssignVariables(globalVars, { type: 'global' });

      // [数据重构] 合并角色基础信息
      const aiBase: Partial<CharacterBaseInfo> = currentSaveData.角色基础信息 ?? {};
      const bi: CharacterBaseInfo = baseInfo;

      const mergedBaseInfo: CharacterBaseInfo = {
        ...bi,
        ...aiBase,
        名字: bi.名字,
        性别: bi.性别,
        年龄: bi.年龄,
        先天六司: bi.先天六司,
        出生: (typeof bi.出生 === 'string' && (bi.出生.includes('随机') || bi.出生 === '随机'))
          ? (aiBase?.出生 || bi.出生)
          : bi.出生,
        灵根: (typeof bi.灵根 === 'string' && (bi.灵根.includes('随机') || bi.灵根 === '随机'))
          ? (aiBase?.灵根 || bi.灵根)
          : bi.灵根,
        世界详情: { ...bi.世界详情, ...aiBase.世界详情 } as World,
        天赋: Array.isArray(aiBase?.天赋) ? aiBase.天赋 : (Array.isArray(bi?.天赋) ? bi.天赋 : []),
        天赋详情: Array.isArray(aiBase?.天赋详情) ? aiBase.天赋详情 : (Array.isArray(bi?.天赋详情) ? bi.天赋详情 : []),
      };
      currentSaveData.角色基础信息 = mergedBaseInfo;

      // 确保角色基础信息与用户选择一致
      if (baseInfo.世界 !== world.name) {
        console.warn('[角色初始化] 角色基础信息.世界与选择的world.name不一致，正在纠正');
        console.warn(`[角色初始化] 角色世界: ${baseInfo.世界}, 选择的世界: ${world.name}`);
        baseInfo.世界 = world.name; // 纠正角色基础信息
      }

      if (initialMessageResponse.cachedWorldData) {
        console.log('[角色初始化] 使用AI缓存的世界信息，优先级最高');
        currentSaveData.世界信息 = initialMessageResponse.cachedWorldData;

        // 确保世界信息中的世界名称与用户选择一致
        if (currentSaveData.世界信息 && currentSaveData.世界信息.世界名称 !== world.name) {
          console.log('[角色初始化] 纠正AI缓存世界信息中的世界名称');
          currentSaveData.世界信息.世界名称 = world.name;
        }
      } else if (worldDataFromGenerator) {
        console.log('[角色初始化] 使用CultivationWorldGenerator生成的世界信息');
        currentSaveData.世界信息 = worldDataFromGenerator;

        // 确保世界信息中的世界名称与用户选择一致
        if (currentSaveData.世界信息 && currentSaveData.世界信息.世界名称 !== world.name) {
          console.log('[角色初始化] 纠正生成器世界信息中的世界名称');
          currentSaveData.世界信息.世界名称 = world.name;
        }
      } else if (!currentSaveData.世界信息) {
        // 只有在既没有缓存数据，也没有生成器数据，也没有世界信息时才使用基础数据
        console.warn('[角色初始化] 未找到任何世界信息，使用基础世界数据作为兜底');
        currentSaveData.世界信息 = {
          世界名称: world.name,
          世界背景: world.description,
          大陆信息: [],
          势力信息: [],
          地点信息: [],
          生成信息: {
            生成时间: new Date().toISOString(),
            世界背景: world.description,
            世界纪元: world.era || '未知纪元',
            特殊设定: [],
            版本: '1.0'
          }
        };
      } else {
        console.log('[角色初始化] 保留现有的世界信息数据，不进行覆盖');
        // 确保现有世界信息的世界名称与选择一致
        if (currentSaveData.世界信息 && currentSaveData.世界信息.世界名称 !== world.name) {
          currentSaveData.世界信息.世界名称 = world.name;
        }
      }

      // 世界地图已经在 processGmResponse 中进行了保存到 currentSaveData

      const chatVars = {
        'character.saveData': currentSaveData,
      };
      await helper.insertOrAssignVariables(chatVars, { type: 'chat' });

      // 追加：计算并写入"天道规则 v5.0"预计算数据（直接判断直接调用）
      try {
        await syncToTavern(
          currentSaveData,
          currentSaveData.角色基础信息 || baseInfo
        );
        console.log('[角色初始化] 已写入天道规则预计算数据');
      } catch (e) {
        console.warn('[角色初始化] 天道规则预计算写入失败，不影响游戏进行', e);
      }

      // 最终强制检查位置描述，清理"随机"字样
      if (currentSaveData.玩家角色状态?.位置?.描述?.includes('随机')) {
        // 设置一个合理的临时位置，等待AI生成具体位置
        currentSaveData.玩家角色状态.位置.描述 = '初始地';
        console.log('[角色初始化] 清理位置描述中的"随机"字样，等待AI生成具体位置');
      }

      // 最终强制检查并设置玩家位置，防止AI遗漏
      if (!currentSaveData.玩家角色状态.位置 || currentSaveData.玩家角色状态.位置.描述 === "位置生成失败" || !currentSaveData.玩家角色状态.位置.描述) {
        console.warn('[角色初始化] AI未成功生成玩家位置，强制使用本地预设位置。');
        currentSaveData.玩家角色状态.位置 = playerStatus.位置;
        // 顺便也更新一下存档中的位置信息
        await helper.insertOrAssignVariables({ 'character.saveData.玩家角色状态.位置': playerStatus.位置 }, { type: 'chat' });
        console.log('[角色初始化] 已强制写入玩家初始位置。');
      }

      console.log('角色基础信息已保存到全局变量，游戏数据已保存到聊天变量');
    } catch (err) {
      console.warn('保存游戏数据到酒馆失败，不影响本地游戏开始:', err);
      // 显示错误信息但不阻塞loading toast
      uiStore.updateLoadingText(`数据同步失败，不影响游戏开始，继续...`);
    }

    // 成功信息由 App.vue 显示
    return currentSaveData as SaveData;

  } catch (error) {
    console.error('角色初始化失败：', error);
    // 错误由 App.vue 统一处理
    throw error;
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