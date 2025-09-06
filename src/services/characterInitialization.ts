/**
 * @fileoverview 角色初始化服务
 * 负责角色创建完成后的全套初始化流程，并集成AI动态生成。
 */

import { getTavernHelper } from '@/utils/tavern';
import { useUIStore } from '@/stores/uiStore';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, SaveData, PlayerStatus, TalentProgress } from '@/types/game';
import type { World } from '@/types';
import { get } from 'lodash';
import { generateInitialMessage, generateMapFromWorld } from '@/utils/tavernAI';
import { processGmResponse } from '@/utils/AIGameMaster';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { GAME_START_INITIALIZATION_PROMPT } from '@/utils/prompts/characterInitializationPrompts';
import { WorldGenerationConfig, BirthplaceGenerator } from '@/utils/worldGeneration/gameWorldConfig';
import { CultivationWorldGenerator } from '@/utils/worldGeneration/cultivationWorldGenerator';

/**
 * 创建一个可重试的AI调用包装器，包含用户确认功能
 * @param aiFunction 要调用的AI生成函数
 * @param validator 验证AI响应是否有效的函数
 * @param maxRetries 最大自动重试次数
 * @param progressMessage 重试时显示的toast消息
 * @returns AI函数的返回结果
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
      const response = await aiFunction();
      if (validator(response)) {
        return response;
      }
      throw new Error('AI响应格式无效');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[AI重试机制] 第 ${i} 次尝试失败:`, lastError.message);
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 递增延迟
      }
    }
  }
  
  // 自动重试耗尽后，询问用户是否继续
  const shouldRetry = await askUserForRetry(progressMessage, lastError?.message || '未知错误');
  if (shouldRetry) {
    // 用户选择继续，进行额外的重试
    return await retryableAICallWithUserChoice(aiFunction, validator, progressMessage);
  } else {
    // 用户选择不重试，抛出错误
    throw new Error(`${progressMessage}失败，用户选择不继续重试: ${lastError?.message}`);
  }
}

/**
 * 询问用户是否继续重试
 */
async function askUserForRetry(taskName: string, errorMessage: string): Promise<boolean> {
  return new Promise((resolve) => {
    const uiStore = useUIStore();
    
    // 显示错误和询问
    uiStore.showRetryDialog({
      title: `${taskName}失败`,
      message: `${taskName}多次尝试后仍然失败。\n\n错误信息：${errorMessage}\n\n是否继续重试？选择"否"将使用默认内容。`,
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
  
  // 用户确认后进行额外的重试
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
        await new Promise(resolve => setTimeout(resolve, 2000 * i)); // 更长的延迟
      }
    }
  }
  
  // 最终失败，再次询问用户
  const shouldContinueRetry = await askUserForRetry(progressMessage, '多次重试仍然失败');
  if (shouldContinueRetry) {
    // 递归继续重试
    return await retryableAICallWithUserChoice(aiFunction, validator, progressMessage);
  } else {
    // 用户最终放弃
    throw new Error(`${progressMessage}最终失败，用户选择放弃重试`);
  }
}

/**
 * 计算角色的初始属性值
 */
export function calculateInitialAttributes(baseInfo: CharacterBaseInfo, age: number): PlayerStatus {
  const { 先天六司 } = baseInfo;

  // 确保先天六司的属性都是有效数值，避免NaN
  const 根骨 = Number(先天六司?.根骨) || 10;
  const 灵性 = Number(先天六司?.灵性) || 10;
  const 悟性 = Number(先天六司?.悟性) || 10;

  // 基础计算公式
  const 初始气血 = 100 + 根骨 * 10;
  const 初始灵气 = 50 + 灵性 * 5;
  const 初始神识 = 30 + 悟性 * 3;

  // -- 修正寿命计算逻辑 --
  const 基础寿命 = 80; // 凡人基础寿命
  const 根骨寿命系数 = 5; // 每点根骨增加5年寿命
  const 最大寿命 = 基础寿命 + 根骨 * 根骨寿命系数;

  console.log(`[角色初始化] 计算结果: 气血=${初始气血}, 灵气=${初始灵气}, 神识=${初始神识}, 年龄=${age}/${最大寿命}`);
  console.log(`[角色初始化] 先天六司: 根骨=${根骨}, 灵性=${灵性}, 悟性=${悟性}`);

  return {
    境界: {
      等级: 0,
      名称: "凡人",
      当前进度: 0,
      下一级所需: 10,
      突破描述: "凡人阶段，无需突破，只需静待仙缘。",
    },
    声望: 0,
    位置: {
      描述: "", // 初始为空，由后续逻辑填充
      坐标: { X: Math.floor(Math.random() * 1000), Y: Math.floor(Math.random() * 1000) }
    },
    气血: { 当前: 初始气血, 最大: 初始气血 },
    灵气: { 当前: 初始灵气, 最大: 初始灵气 }, // 开局灵气为满
    神识: { 当前: 初始神识, 最大: 初始神识 },
    寿命: { 当前: age, 最大: 最大寿命 }, // 当前寿命就是年龄
    修为: { 当前: 0, 最大: 10 }, // 凡人初始修为
    状态效果: [] // 使用新的StatusEffect数组格式
  };
}

/**
 * 初始化天赋进度系统
 */
function initializeTalentProgress(talents: string[]): Record<string, TalentProgress> {
  const talentProgress: Record<string, TalentProgress> = {};

  // 为每个天赋初始化进度
  talents.forEach(talentName => {
    talentProgress[talentName] = {
      等级: 1,        // 初始等级为1
      当前经验: 0,    // 初始经验为0
      下级所需: 100,  // 下一级需要100经验
      总经验: 0       // 总共获得的经验
    };
  });

  console.log(`[天赋初始化] 已为${talents.length}个天赋初始化进度:`, talentProgress);
  return talentProgress;
}


/**
 * 完整的角色初始化流程 (AI驱动版)
 */
export async function initializeCharacter(
  charId: string,
  baseInfo: CharacterBaseInfo,
  world: World,
  age: number
): Promise<SaveData> {
  const uiStore = useUIStore();
  const helper = getTavernHelper();
  if (!helper) throw new Error('无法连接到酒馆助手');

  try {
    uiStore.updateLoadingText('天道清明：正在为您准备一方新天地...');

    // 1. 计算基础属性
    const playerStatus = calculateInitialAttributes(baseInfo, age);

    // 0.5. 生成修仙世界（新增）
    uiStore.updateLoadingText('天道造化：正在衍化世界法则...');
    try {
      // 创建世界生成配置，根据角色背景调整
      const worldConfig = new WorldGenerationConfig('classic_cultivation');
      if (baseInfo.出生) {
        worldConfig.adjustForCharacterBackground(baseInfo.出生);
      }

      // 创建世界生成器并生成世界
      const worldGenerator = new CultivationWorldGenerator(
        worldConfig.getSettings(),
        baseInfo.出生
      );

      try {
        await worldGenerator.generateWorld();
        // 等待世界生成完成
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('[角色初始化] 修仙世界已生成并保存到酒馆变量');
      } catch (worldGenError) {
        console.warn('[角色初始化] 世界生成API调用失败，使用默认配置:', worldGenError);
        uiStore.updateLoadingText('世界生成失败，将使用默认配置继续...');
        // 不抛出错误，继续使用默认配置
      }

      // 0.6. 生成角色出生地（新增）
      uiStore.updateLoadingText('天道定位：正在为您寻找降生之所...');
      try {
        const variables = await helper.getVariables({ type: 'chat' });
        const worldFactions = variables['world_factions'] || [];

        const birthplace = BirthplaceGenerator.generateBirthplace(
          baseInfo.出生,
          worldConfig.getSettings()
        );

        // 数据整合：将出生地信息直接写入playerStatus，而不是独立的酒馆变量

        playerStatus.位置 = {
          描述: birthplace.name,
          坐标: birthplace.coordinates
        };

        console.log('[角色初始化] 角色出生地已生成:', birthplace);

      } catch (birthplaceError) {
        console.error('[角色初始化] 出生地生成失败:', birthplaceError);
        uiStore.updateLoadingText('未能自动生成出生地，将使用默认位置继续...');
      }

    } catch (worldGenError) {
      console.error('[角色初始化] 世界生成失败:', worldGenError);
      uiStore.updateLoadingText('世界生成失败，将使用默认配置继续...');
    }

    // 2. 创建基础存档结构
    const saveData: SaveData = {
      玩家角色状态: playerStatus,
      装备栏: { 法宝1: null, 法宝2: null, 法宝3: null, 法宝4: null, 法宝5: null, 法宝6: null },
      三千大道: createEmptyThousandDaoSystem(),
      背包: { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} },
      人物关系: {},
      记忆: { 短期记忆: [], 中期记忆: [], 长期记忆: [] }
    };

    // ================= AI 动态生成部分 =================

    // 3. 添加世界背景到酒馆世界书
    try {
      const worldBookEntry = {
        name: `【世界】${world.name || '未知世界'}`,
        description: world.description || `这是【${baseInfo.名字}】所选择的修仙世界`,
        content: JSON.stringify(world, null, 2),
        order: 1,
        enabled: true
      };

      // 数据整合：世界背景信息将直接存入saveData，不再创建独立的世界书条目变量
      console.log(`世界背景【${world.name}】已准备就绪，将整合至存档。`);
    } catch (err) {
      console.warn('载入世界背景失败:', err);
    }

    // 4. AI生成：衍化世界舆图（带重试机制）
    uiStore.updateLoadingText('天道推演：正在为您绘制山川地理...');
    
    // 获取用户的世界生成配置
    const userWorldConfig = store.worldGenerationConfig;
    console.log('【角色初始化】使用用户世界生成配置:', userWorldConfig);
    
    // 构建角色背景信息
    const characterInfo = {
      origin: baseInfo.出生,
      age: age,
      birthplace: baseInfo.出生 // 出生地信息
    };
    console.log('【角色初始化】角色背景信息:', characterInfo);
    
    const mapResponse = await retryableAICall(
      () => generateMapFromWorld(world, userWorldConfig, characterInfo),
      (res) => res && typeof res === 'object', // 验证响应是否为非空对象
      2, // 最大重试次数
      '绘制山川地理'
    );

    // [核心改造] AI响应现在只修改内存中的saveData对象
    let currentSaveData = await processGmResponse(mapResponse, saveData);
    const worldMap = get(currentSaveData, '世界舆图', {}); // 从更新后的saveData中获取地图

    uiStore.updateLoadingText('天道赋格：正在为您谱写命运之初...');

    // 5.1 构建包含所有描述性名称的 creationDetails，供AI生成剧情
    const creationDetails = {
      age: age,
      originName: baseInfo.出生,
      spiritRootName: baseInfo.灵根,
      talentNames: baseInfo.天赋,
      talentTierName: baseInfo.天资
    };

    // 5.2 构建完整的初始游戏数据包给AI
    const initialGameDataForAI = {
      baseInfo,
      saveData: currentSaveData, // [核心修正] 使用更新了地图数据的saveData
      world,
      creationDetails,
    };

    // 5.2 生成初始消息（带自动fallback）
    const initialMessageResponse = await generateInitialMessage(initialGameDataForAI, worldMap, GAME_START_INITIALIZATION_PROMPT);

    // 5.3 使用AI返回的具体化设定更新baseInfo
    if (initialMessageResponse.processedOrigin && initialMessageResponse.processedOrigin !== baseInfo.出生) {
      baseInfo.出生 = initialMessageResponse.processedOrigin;
      console.log('[角色初始化] 更新出身为:', baseInfo.出生);
    }
    if (initialMessageResponse.processedSpiritRoot && initialMessageResponse.processedSpiritRoot !== baseInfo.灵根) {
      baseInfo.灵根 = initialMessageResponse.processedSpiritRoot;
      console.log('[角色初始化] 更新灵根为:', baseInfo.灵根);
    }

    // 5.4 将完整的开局剧情信息存入记忆
    const openingStory = initialMessageResponse.text || "你睁开双眼，发现自己身处在一个古色古香的房间里。";
    const aroundDescription = initialMessageResponse.around || "";
    const storySummary = initialMessageResponse.mid_term_memory || (openingStory.substring(0, 70) + '...');

    // 构建完整的开局消息，包含环境描述
    let fullOpeningMessage = openingStory;
    if (aroundDescription) {
      fullOpeningMessage += `\n\n【周围环境】\n${aroundDescription}`;
    }

    // 保存到记忆系统
    currentSaveData.记忆.短期记忆.push(fullOpeningMessage);
    currentSaveData.记忆.中期记忆.push(storySummary);

    console.log('[角色初始化] 保存的完整开局消息:', fullOpeningMessage.substring(0, 200));

    // 5.5 调用 processGmResponse 来执行AI返回的其他指令（如设置物品等）
    currentSaveData = await processGmResponse(initialMessageResponse, currentSaveData);
    
    // ================= 数据整合与持久化 =================
    
    // 6. 按照正确的数据架构分别存储
    uiStore.updateLoadingText(`天机同步：正在将【${baseInfo.名字}】的命格写入大道...`);
    try {
      // [核心重构] 设置全局变量，只保留最核心的、不变的标识符
      const globalVars = {
        'character.name': baseInfo.名字,
        'character.creation_time': new Date().toISOString()
      };
      await helper.insertOrAssignVariables(globalVars, { type: 'global' });

      // [核心重構] 將所有動態數據，包括世界信息和地圖，全部整合到唯一的 saveData 變量中
      // 在此阶段，currentSaveData 已经是最新、最完整的状态
      currentSaveData.角色基础信息 = baseInfo;
      currentSaveData.世界信息 = world;
      // 世界舆图已经在 processGmResponse 流程中被写入 currentSaveData

      const chatVars = {
        'character.saveData': currentSaveData,
      };
      await helper.insertOrAssignVariables(chatVars, { type: 'chat' });

      console.log('角色基础信息已保存到全局变量，游戏数据已保存到聊天变量');
    } catch (err) {
      console.warn('保存游戏数据至酒馆失败，但不影响本地游戏开始:', err);
      // 将警告信息整合到主loading toast中
      uiStore.updateLoadingText(`天机同步失败，但不影响游戏开始，请继续...`);
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
  // 复用初始化流程
  const saveData = await initializeCharacter(charId, baseInfo, world, age);

  // 这里可以添加一些存档槽位特定的逻辑
  toast.success(`新存档【${slotName}】创建成功！`);

  return saveData;
}
