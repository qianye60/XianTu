/**
 * @fileoverview 角色初始化服务
 * 负责角色创建完成后的全套初始化流程，并集成AI动态生成。
 */

import { getTavernHelper } from '@/utils/tavern';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, SaveData, PlayerStatus, TalentProgress, WorldInfo, WorldLocation } from '@/types/game';
import type { World } from '@/types';
import { generateInitialMessage } from '@/utils/tavernAI';
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
      message: `${taskName}多次尝试后仍然失败。\n\n错误信息：${errorMessage}\n\n是否继续重试？\n选择"取消创建"将终止角色创建过程。`,
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
    // 用户最终放弃，抛出错误终止角色创建
    throw new Error(`${progressMessage}失败，用户选择终止角色创建`);
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
      描述: "安静的山村", // 初始描述，会被后续的世界生成覆盖
      坐标: { X: 120, Y: 30 } // 使用合理的默认坐标，会被后续的世界生成覆盖
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

  let worldDataFromGenerator: WorldInfo | null = null; // 声明在函数作用域

  try {
    uiStore.updateLoadingText('天道清明：正在为您准备一方新天地...');

    // 1. 计算基础属性
    const playerStatus = calculateInitialAttributes(baseInfo, age);

    // 获取用户的世界生成配置
    const characterCreationStore = useCharacterCreationStore();
    const userWorldConfig = characterCreationStore.worldGenerationConfig;
    console.log('【角色初始化】使用用户世界生成配置:', userWorldConfig);
    
    // 获取选择的世界信息
    const selectedWorld = characterCreationStore.selectedWorld;
    console.log('【角色初始化】选择的世界:', selectedWorld);
    
    // 构建包含详细信息的角色背景信息
    const characterInfo = {
      origin: baseInfo.出生,
      age: age,
      birthplace: baseInfo.出生, // 出生地信息
      worldBackground: selectedWorld?.description || world.description || '未知世界背景',
      worldEra: selectedWorld?.era || world.era || '未知时代',
      worldName: selectedWorld?.name || world.name || '未知世界'
    };
    console.log('【角色初始化】角色背景信息:', characterInfo);
    
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
        generateInitialPosition: true, // 标记需要生成角色初始位置
        characterOrigin: baseInfo.出生 // 根据角色出生生成合适的初始位置
      }
    };
    console.log('【角色初始化】增强的世界配置:', enhancedWorldConfig);

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
        baseInfo.出生,
        enhancedWorldConfig // 传递增强的世界配置
      );

      try {
        // 使用 retryableAICall 包装世界生成，确保有重试机制和用户确认功能
        console.log('[角色初始化] 开始调用CultivationWorldGenerator');
        
        const worldGenerationResult = await retryableAICall(
          async () => {
            console.log('[角色初始化] 执行worldGenerator.generateWorld()');
            const result = await worldGenerator.generateWorld();
            console.log('[角色初始化] 世界生成结果:', result);
            return result;
          },
          (result) => {
            console.log('[角色初始化] 验证世界生成结果:', result);
            return result && result.success;
          },
          2, // 最大重试次数  
          '天道造化：衍化世界法则'
        );
        
        console.log('[角色初始化] 世界生成完成:', worldGenerationResult);
        
        // 等待世界生成完成
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // [数据同步] 获取CultivationWorldGenerator保存的完整世界数据，并同步到当前SaveData
        try {
          const variables = await helper.getVariables({ type: 'chat' });
          const generatedSaveData = variables['character.saveData'] as SaveData;
          if (generatedSaveData && generatedSaveData.世界信息) {
            // 保存生成器创建的世界信息，以便后续使用
            worldDataFromGenerator = generatedSaveData.世界信息;
            console.log('[角色初始化] 已获取CultivationWorldGenerator生成的完整世界信息:', {
              世界名称: worldDataFromGenerator.世界名称,
              大陆数量: worldDataFromGenerator.大陆信息?.length || 0,
              势力数量: worldDataFromGenerator.势力信息?.length || 0,
              地点数量: worldDataFromGenerator.地点信息?.length || 0
            });
          } else {
            console.warn('[角色初始化] 未从CultivationWorldGenerator获取到完整世界信息');
          }
        } catch (syncError) {
          console.error('[角色初始化] 同步世界数据失败:', syncError);
        }
        
        console.log('[角色初始化] 修仙世界已生成并保存到酒馆变量');
      } catch (worldGenError) {
        console.error('[角色初始化] 世界生成API调用失败:', worldGenError);
        const errorMessage = worldGenError instanceof Error ? worldGenError.message : String(worldGenError);
        throw new Error(`世界生成失败: ${errorMessage}`);
      }

      // 0.6. 生成角色出生地（整合到世界生成中）
      uiStore.updateLoadingText('天道定位：正在为您寻找降生之所...');
      try {
        const birthplaceResult = await retryableAICall(
          async () => {
            // 获取已生成的世界数据以便更好地整合出生地
            const variables = await helper.getVariables({ type: 'chat' });
            const worldLocations = Array.isArray(variables['world_locations']) ? variables['world_locations'] : [];
            
            console.log('[角色初始化] 可用世界地点数:', worldLocations.length);
            console.log('[角色初始化] 角色出身:', baseInfo.出生);
            
            const birthplace = BirthplaceGenerator.generateBirthplace(
              baseInfo.出生,
              worldConfig.getSettings()
            );

            // 尝试将角色的出生地与已生成的世界地点关联
            let selectedLocation = null;
            
            // 如果有合适的地点类型，优先使用世界中生成的地点
            if (worldLocations.length > 0) {
              const suitableLocations = worldLocations.filter((loc: any) => {
                // 根据角色出身匹配合适的地点类型（带气运和随机数多样化）
                const origin = baseInfo.出生;
                const fortune = baseInfo.先天六司?.气运 || 50; // 获取气运值，默认50
                
                // 多重随机数生成，增加随机性
                const rand1 = Math.random();
                const rand2 = Math.random(); 
                const rand3 = Math.random();
                
                // 随机出生 - 基于气运属性和复合随机算法分配起点
                if (origin?.includes('随机')) {
                  const combinedRand = (rand1 + rand2 + rand3) / 3; // 平均值随机
                  
                  // 气运影响因子：气运越高，获得好起点的概率越高
                  const fortuneBonus = Math.max(0, (fortune - 50) / 100); // 气运高于50时提供加成
                  const adjustedRand = Math.max(0, combinedRand - fortuneBonus);
                  
                  // 基于调整后的随机值分配起点概率
                  if (adjustedRand < 0.15) return loc.type === 'sect_power';      // 15% 宗门势力（顶级起点）
                  if (adjustedRand < 0.35) return loc.type === 'blessed_land';    // 20% 洞天福地（高级起点）
                  if (adjustedRand < 0.5) return loc.type === 'treasure_land';    // 15% 奇珍异地（稀有起点）
                  if (adjustedRand < 0.75) return loc.type === 'city_town';       // 25% 城镇坊市（中等起点）
                  if (adjustedRand < 0.9) return loc.danger_level === '安全';      // 15% 安全地点（普通起点）
                  return loc.type === 'natural_landmark';                        // 10% 名山大川（自然起点）
                }
                
                // 非随机出生也考虑气运影响，但权重较小
                const fortuneInfluence = rand1 < (fortune / 200); // 气运影响概率
                
                // 世家子弟 - 气运高时有机会出生在更好的地方
                if (origin?.includes('世家') || origin?.includes('望族') || origin?.includes('大族')) {
                  if (fortuneInfluence && rand2 < 0.3) {
                    return loc.type === 'sect_power' || loc.type === 'blessed_land'; // 气运好时可能在宗门势力或洞天福地
                  }
                  return loc.type === 'sect_power' || loc.type === 'city_town';
                }
                
                // 宗门弟子 - 气运影响在宗门内的地位
                if (origin?.includes('宗门') || origin?.includes('门派') || origin?.includes('弟子')) {
                  if (fortuneInfluence && rand2 < 0.4) {
                    return loc.type === 'blessed_land'; // 气运好时更可能在洞天福地修炼
                  }
                  return loc.type === 'sect_power' || loc.type === 'blessed_land';
                }
                
                // 散修出身 - 气运高时可能遇到奇遇
                if (origin?.includes('散修') || origin?.includes('孤儿') || origin?.includes('平民')) {
                  if (fortuneInfluence && rand2 < 0.2) {
                    return loc.type === 'treasure_land' || loc.type === 'blessed_land'; // 气运好时可能发现宝地或秘境
                  }
                  return loc.type === 'city_town' || (loc.danger_level === '安全' && loc.type !== 'dangerous_area');
                }
                
                // 商贾之家 - 气运影响财富和商机
                if (origin?.includes('商贾') || origin?.includes('商家') || origin?.includes('商人')) {
                  if (fortuneInfluence && rand2 < 0.25) {
                    return loc.type === 'treasure_land'; // 气运好时可能发现商机宝地
                  }
                  return loc.type === 'city_town';
                }
                
                // 书香门第 - 气运影响学习机缘
                if (origin?.includes('书香') || origin?.includes('学者') || origin?.includes('文人')) {
                  if (fortuneInfluence && rand2 < 0.35) {
                    return loc.type === 'blessed_land'; // 气运好时更容易接触修仙传承
                  }
                  return loc.type === 'city_town' || loc.type === 'blessed_land';
                }
                
                // 默认：选择城镇坊市或安全地点，避免危险区域
                return loc.type === 'city_town' || (loc.danger_level === '安全' && loc.type !== 'dangerous_area');
              });

              if (suitableLocations.length > 0) {
                // 如果是随机出生，进一步按起点质量排序选择
                if (baseInfo.出生?.includes('随机')) {
                  // 按起点优势排序：宗门势力 > 洞天福地 > 奇珍异地 > 城镇坊市 > 其他
                  const priorityOrder = ['sect_power', 'blessed_land', 'treasure_land', 'city_town'];
                  suitableLocations.sort((a: any, b: any) => { // TODO: 需要匹配WorldLocation类型的属性名
                    const aPriority = priorityOrder.indexOf(a.type);
                    const bPriority = priorityOrder.indexOf(b.type);
                    return (aPriority >= 0 ? aPriority : 999) - (bPriority >= 0 ? bPriority : 999);
                  });
                }
                
                // 随机选择一个合适的地点
                selectedLocation = suitableLocations[Math.floor(Math.random() * suitableLocations.length)];
                console.log('[角色初始化] 选择世界地点作为出生地:', selectedLocation.name, '类型:', selectedLocation.type);
              } else {
                console.log('[角色初始化] 未找到适合的世界地点，将使用默认生成的出生地');
              }
            }

            // 如果找到了合适的世界地点，使用它；否则使用生成的出生地
            const finalBirthplace = selectedLocation ? {
              name: selectedLocation.name,
              coordinates: selectedLocation.coordinates,
              description: selectedLocation.description || birthplace.description,
              type: selectedLocation.type || birthplace.type
            } : birthplace;

            return finalBirthplace;
          },
          (birthplace) => birthplace && birthplace.name, // 验证是否有名称
          2, // 最大重试次数
          '寻找降生之所'
        );

        // 数据整合：将出生地信息直接写入playerStatus
        playerStatus.位置 = {
          描述: birthplaceResult.name,
          坐标: birthplaceResult.coordinates
        };
        
        // 添加出生地字段到角色状态
        playerStatus.出生地 = birthplaceResult.name;

        console.log('[角色初始化] 最终出生地已确定:', {
          name: birthplaceResult.name,
          coordinates: birthplaceResult.coordinates,
          isFromWorld: !!birthplaceResult.coordinates
        });

      } catch (birthplaceError) {
        console.error('[角色初始化] 出生地生成失败:', birthplaceError);
        const errorMessage = birthplaceError instanceof Error ? birthplaceError.message : String(birthplaceError);
        throw new Error(`出生地生成失败: ${errorMessage}`);
      }

    } catch (worldGenError) {
      console.error('[角色初始化] 世界生成失败:', worldGenError);
      const errorMessage = worldGenError instanceof Error ? worldGenError.message : String(worldGenError);
      throw new Error(`世界生成失败: ${errorMessage}`);
    }

    // 2. 创建基础存档结构
    const saveData: SaveData = {
      玩家角色状态: playerStatus,
      装备栏: { 法宝1: null, 法宝2: null, 法宝3: null, 法宝4: null, 法宝5: null, 法宝6: null },
      三千大道: createEmptyThousandDaoSystem(),
      背包: { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} },
      人物关系: {},
      宗门系统: {
        availableSects: [], // 保留为兼容性，实际数据将存储在世界信息中
        sectRelationships: {},
        sectHistory: []
      },
      记忆: { 短期记忆: [], 中期记忆: [], 长期记忆: [] },
      游戏时间: { 年: 1000, 月: 1, 日: 1, 小时: 0, 分钟: 0 },
      修炼功法: {
        功法: null,
        熟练度: 0,
        已解锁技能: [],
        修炼时间: 0,
        突破次数: 0
      }
    };

    // ================= AI 动态生成部分 =================

    // 3. 添加世界背景到酒馆世界书
    try {
      // 数据整合：世界背景信息将直接存入saveData，不再创建独立的世界书条目变量
      console.log(`世界背景【${world.name}】已准备就绪，将整合至存档。`);
    } catch (err) {
      console.warn('载入世界背景失败:', err);
    }

    // 4. 世界地图数据已在前面的CultivationWorldGenerator中生成完成
    // [核心改造] 新系统已经生成了完整的世界数据，无需重复调用旧的地图生成系统
    let currentSaveData = saveData; // saveData现在已经包含了同步的完整世界信息

    // 位置生成已经在初始化消息中完成，无需单独生成位置标点
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

    // 5.2 生成初始消息（带重试机制）
    // 注意：世界地图数据已由CultivationWorldGenerator保存到酒馆变量，传递null即可
    // 但需要传递保存的世界数据以便保护
    const initialMessageResponse = await retryableAICall(
      () => generateInitialMessage(initialGameDataForAI, null, GAME_START_INITIALIZATION_PROMPT),
      (response) => Boolean(response && response.text && Array.isArray(response.tavern_commands)), // 验证响应是否有效
      2, // 最大重试次数
      '天道赋格：谱写命运之初'
    );

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
    // 加入出生地信息
    try {
      const birthplaceName = (playerStatus as any)?.出生地 || (currentSaveData as any)?.世界信息?.玩家出生地?.出生地名称;
      if (birthplaceName) {
        fullOpeningMessage = `【出生地】你出生于${birthplaceName}。\n` + fullOpeningMessage;
      }
    } catch {}

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

      // [核心重构] 世界数据优先级处理和角色世界匹配验证
      // 1. 优先使用AI返回的缓存世界数据（最完整）
      // 2. 其次使用生成器直接获取的数据
      // 3. 最后使用基本备份数据
      currentSaveData.角色基础信息 = baseInfo;
      
      // 确保角色世界信息与用户选择一致
      if (baseInfo.世界 !== world.name) {
        console.warn('[角色初始化] 角色基础信息.世界与选择的world.name不一致，进行修正');
        console.warn(`[角色初始化] 角色世界: ${baseInfo.世界}, 选择世界: ${world.name}`);
        baseInfo.世界 = world.name; // 修正角色世界信息
      }
      
      if (initialMessageResponse.cachedWorldData) {
        console.log('[角色初始化] 使用AI缓存的世界信息（最优先级）');
        currentSaveData.世界信息 = initialMessageResponse.cachedWorldData;
        
        // 确保世界信息中的世界名称与用户选择一致
        if (currentSaveData.世界信息 && currentSaveData.世界信息.世界名称 !== world.name) {
          console.log('[角色初始化] 修正AI缓存世界信息中的世界名称');
          currentSaveData.世界信息.世界名称 = world.name;
        }
      } else if (worldDataFromGenerator) {
        console.log('[角色初始化] 使用CultivationWorldGenerator生成的世界信息');
        currentSaveData.世界信息 = worldDataFromGenerator;
        
        // 确保世界信息中的世界名称与用户选择一致
        if (currentSaveData.世界信息 && currentSaveData.世界信息.世界名称 !== world.name) {
          console.log('[角色初始化] 修正生成器世界信息中的世界名称');
          currentSaveData.世界信息.世界名称 = world.name;
        }
      } else if (!currentSaveData.世界信息) {
        // 只有在既没有缓存数据，也没有生成器数据，也没有现有世界信息时，才使用基本备份
        console.warn('[角色初始化] 未找到完整世界信息，使用基本世界数据作为备份');
        currentSaveData.世界信息 = {
          世界名称: world.name,
          世界背景: world.description,
          大陆信息: [],
          势力信息: [],
          地点信息: [],
          生成信息: {
            生成时间: new Date().toISOString(),
            世界背景: world.description,
            世界纪元: world.era,
            特殊设定: [],
            版本: '1.0'
          }
        };
      } else {
        console.log('[角色初始化] 保留现有的世界信息数据，但修正世界名称');
        // 确保现有世界信息的名称与选择一致
        if (currentSaveData.世界信息 && currentSaveData.世界信息.世界名称 !== world.name) {
          currentSaveData.世界信息.世界名称 = world.name;
        }
      }
      
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
