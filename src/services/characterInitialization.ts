/**
 * @fileoverview 角色初始化服务
 * 负责角色创建生成和完整初始化流程，包括AI动态生成。
 */

import { getTavernHelper } from '@/utils/tavern';
import { syncHeavenlyPrecalcToTavern } from '@/utils/judgement/heavenlyRules';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, SaveData, PlayerStatus, WorldInfo, WorldLocation } from '@/types/game';
import { validateAndFixSaveData } from '@/utils/dataValidation';
import type { World } from '@/types';
import { generateInitialMessage } from '@/utils/tavernAI';
import { processGmResponse } from '@/utils/AIGameMaster';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { GAME_START_INITIALIZATION_PROMPT } from '@/utils/prompts/characterInitializationPrompts';
import { WorldGenerationConfig, BirthplaceGenerator } from '@/utils/worldGeneration/gameWorldConfig';
import { CultivationWorldGenerator } from '@/utils/worldGeneration/cultivationWorldGenerator';
import { EnhancedWorldGenerator } from '@/utils/worldGeneration/enhancedWorldGenerator';

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
      const response = await aiFunction();
      if (validator(response)) {
        return response;
      }
      throw new Error('AI响应格式无效');
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
      下一级所需: 0, // 凡人无修炼等级，只是占位
      突破描述: "凡人之身，尚未踏入修仙之道，需要寻找机缘踏上修炼之路。",
    },
    声望: 0,
    位置: {
      描述: "青云镇", // 统一默认位置
      坐标: { X: 120, Y: 30 } // 使用合理的默认坐标，将被世界生成器覆盖
    },
    气血: { 当前: 初始气血, 最大: 初始气血 },
    灵气: { 当前: 初始灵气, 最大: 初始灵气 }, // 凡人灵气为零
    神识: { 当前: 初始神识, 最大: 初始神识 },
    寿命: { 当前: age, 最大: 最大寿命 }, // 当前年龄和最大寿命
    修为: { 当前: 0, 最大: 10 }, // 凡人初始修为
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

    // 预先创建一个世界配置，用于获取出生地生成器设置（如果世界生成器未完成）
    const worldConfig = new WorldGenerationConfig('classic_cultivation');
    // 安全地从复杂对象中提取名称。原方法可能导致错误，使用 any
    const extractName = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && '名称' in (value as Record<string, unknown>)) {
        const n = (value as Record<string, unknown>).名称;
        if (typeof n === 'string') return n;
      }
      return String(value ?? '');
    };
    if (baseInfo.出生) {
      const originStr = extractName(baseInfo.出生);
      worldConfig.adjustForCharacterBackground(originStr);
    }
    // 从配置生成出生地设置（异步操作可能失败，为了避免阻塞主流程，先获取设置）
    const worldSettingsForBirthplace = worldConfig.getSettings();

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
          maxRetries: 3,
          retryDelay: 2000,
          characterBackground: extractName(baseInfo.出生)
        };

      console.log('[角色初始化] 使用增强世界生成器配置:', enhancedConfig);

      // 创建增强世界生成器
      const enhancedWorldGenerator = new EnhancedWorldGenerator(enhancedConfig);

      try {
        // 使用增强世界生成器生成，带错误处理和重试机制
        console.log('[角色初始化] 开始调用EnhancedWorldGenerator');

        const worldGenerationResult = await enhancedWorldGenerator.generateValidatedWorld();

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

          // 如果增强生成器失败，回退到原始生成器
          console.log('[角色初始化] 回退到原始CultivationWorldGenerator');

          // 创建并使用原始世界生成器
          const worldGenerator = new CultivationWorldGenerator(
            worldConfig.getSettings(),
            extractName(baseInfo.出生),
            enhancedWorldConfig // 传递增强配置参数
          );

          await retryableAICall(
            async () => {
              console.log('[角色初始化] 执行fallback worldGenerator.generateWorld()');
              const result = await worldGenerator.generateWorld();
              console.log('[角色初始化] fallback世界生成结果:', result);
              return result;
            },
            (result) => {
              console.log('[角色初始化] 验证fallback世界生成结果:', result);
              return result && result.success;
            },
            2, // 最大重试次数
            '天道正在编织这个世界的命运（回退方案）'
          );

          // 获取回退方案生成的世界数据
          try {
            const variables = await helper.getVariables({ type: 'chat' });
            const generatedSaveData = variables['character.saveData'] as SaveData;
            if (generatedSaveData && generatedSaveData.世界信息) {
              worldDataFromGenerator = generatedSaveData.世界信息;
              console.log('[角色初始化] 回退方案已获取世界信息');
            }
          } catch (syncError) {
            console.error('[角色初始化] 回退方案同步世界数据失败:', syncError);
          }
        }

        // 等待世界生成完成
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log('[角色初始化] 世界生成完成并保存到酒馆变量');
      } catch (worldGenError) {
        console.error('[角色初始化] 世界生成API调用失败:', worldGenError);
        const errorMessage = worldGenError instanceof Error ? worldGenError.message : String(worldGenError);
        throw new Error(`世界生成失败: ${errorMessage}`);
      }

      // 0.6. 生成角色出生地（基于生成的世界数据）
      uiStore.updateLoadingText('天道正在为你寻找降生之地...');
      try {
        const birthplaceResult = await retryableAICall(
          async () => {
            // 获取已生成的世界数据以便选择合适的出生地
            const variables = await helper.getVariables({ type: 'chat' });
            let worldLocations = Array.isArray(variables['world_locations']) ? variables['world_locations'] : [];

            // Fallback：如果未提供标准的 world_locations，从存档的 世界信息.地点信息 解析
            if (!worldLocations || worldLocations.length === 0) {
              const saveDataAny: any = variables['character.saveData'] || {};
              const worldInfoAny: any = saveDataAny?.世界信息 || {};
              const locs: any[] = Array.isArray(worldInfoAny?.地点信息) ? worldInfoAny.地点信息 : [];
              const mapLonLatToXY = (lon: number, lat: number) => {
                const X = Math.round((lon + 180) * 2);
                const Y = Math.round((lat + 90) * 2);
                return { X, Y };
              };
              worldLocations = locs.map((l: any) => {
                const name = l?.名称 || l?.name || '未知地点';
                const type = l?.类型 || l?.type || 'unknown';
                const coord: any = l?.坐标 || l?.coordinates || null;
                let XY: { X: number; Y: number } | null = null;
                if (coord && typeof coord.X === 'number' && typeof coord.Y === 'number') {
                  XY = { X: coord.X, Y: coord.Y };
                } else if (
                  (coord && typeof coord.longitude === 'number' && typeof coord.latitude === 'number') ||
                  (typeof l?.longitude === 'number' && typeof l?.latitude === 'number')
                ) {
                  const lon = coord?.longitude ?? l?.longitude ?? 0;
                  const lat = coord?.latitude ?? l?.latitude ?? 0;
                  XY = mapLonLatToXY(Number(lon), Number(lat));
                }
                return { 名称: name, 类型: type, coordinates: XY || { X: 0, Y: 0 } };
              });
            }

            console.log('[角色初始化] 可用世界地点:', worldLocations.length);
            console.log('[角色初始化] 角色出生:', baseInfo.出生);

            // 使用 AI 选择出生地，从世界地点列表中选择 JSON {name, coordinates:{X,Y}, description, type}
            const promptLines: string[] = [];
            promptLines.push('【任务】根据角色出生，从世界地点中选择一个适合的出生地。');
            promptLines.push('【要求】返回唯一 JSON：{"name":"","coordinates":{"X":0,"Y":0},"description":"","type":""}');
            promptLines.push('【约束】必须在已生成的世界范围内，地点含有经纬度或坐标为 UI 坐标；生成返回过程，不要字段解释');
            promptLines.push(`角色出生：${extractName(baseInfo.出生)}`);
            promptLines.push('可选地点【格式：name/名称/coordinates 表示可用坐标】：');
            const preview = worldLocations.slice(0, 40).map((l: any) => ({ 名称: l.名称, 类型: l.类型, 坐标: l.coordinates })).map(x=>JSON.stringify(x)).join('\n');
            promptLines.push(preview || '[]');
            const aiInput = promptLines.join('\n');

            const raw = await helper.generateRaw({ user_input: aiInput, custom_api: { temperature: 0.3 } });
            const text = String(raw || '');
            const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
            let aiBirth: any = null;
            try {
              aiBirth = jsonMatch ? JSON.parse(Array.isArray(jsonMatch) ? (jsonMatch[1] || jsonMatch[0]) : String(jsonMatch)) : null;
            } catch {}

            // 校验 AI 返回是否有效（有名称和坐标选择/生成）
            const validAI = aiBirth && aiBirth.name && aiBirth.coordinates && typeof aiBirth.coordinates.X === 'number' && typeof aiBirth.coordinates.Y === 'number';
            if (validAI) {
              return {
                name: String(aiBirth.name),
                coordinates: { X: Number(aiBirth.coordinates.X), Y: Number(aiBirth.coordinates.Y) },
                description: String(aiBirth.description || ''),
                type: String(aiBirth.type || 'unknown')
              };
            }

            // 回退：随机确保地点；避免危险地点
            let selectedLocation: any = null;
            if (worldLocations.length > 0) {
              const nonDanger = worldLocations.filter((loc: any) => loc.类型 !== 'dangerous_area' && (loc.安全等级 || '') !== '危险');
              const pool = nonDanger.length > 0 ? nonDanger : worldLocations;
              selectedLocation = pool[Math.floor(Math.random() * pool.length)];
            }
            if (selectedLocation) {
              return {
                name: selectedLocation.名称,
                coordinates: selectedLocation.coordinates,
                description: selectedLocation.描述 || '',
                type: selectedLocation.类型 || 'unknown'
              };
            }
            // 最后兜底，生成出生地生成器
            const birthplace = BirthplaceGenerator.generateBirthplace(
              extractName(baseInfo.出生),
              worldSettingsForBirthplace
            );
            return birthplace;
          },
          (birthplace) => birthplace && birthplace.name, // 验证是否有出生地
          2, // 最大重试次数
          '寻找降生之地'
        );

        // 更新玩家状态，将出生地信息直接写入playerStatus
        const locationName = (birthplaceResult as any).name || '青云镇';
        const locationDesc = (birthplaceResult as any).description || locationName;
        
        playerStatus.位置 = {
          描述: locationDesc,
          坐标: birthplaceResult.coordinates || { X: 120, Y: 30 }
        };

        console.log('[角色初始化] 出生地已确定:', {
          名称: locationName,
          描述: locationDesc,
          坐标: playerStatus.位置.坐标,
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

    // 2. 创建基础存档结构（符合 SaveData 类型）
    const saveData: SaveData = {
      玩家角色状态: { ...playerStatus },
      装备栏: { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null },
      三千大道: createEmptyThousandDaoSystem(),
      背包: { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} },
      人物关系: {}, // 将由AI在初始化流程中动态生成
      宗门系统: { availableSects: [], sectRelationships: {}, sectHistory: [] },
      记忆: { 短期记忆: [], 中期记忆: [], 长期记忆: [] },
      游戏时间: { 年: 1000, 月: 1, 日: 1, 小时: 0, 分钟: 0 },
      修炼功法: { 功法: null, 熟练度: 0, 已解锁技能: [], 修炼时间: 0, 突破次数: 0 }
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
      originName: baseInfo.出生,
      spiritRootName: baseInfo.灵根,
      talentNames: baseInfo.天赋,
      talentTierName: baseInfo.天资
    };

    // 5.2 构建传递给初始游戏数据包给AI
    const initialGameDataForAI = {
      baseInfo,
      saveData: currentSaveData, // [重构更新] 使用更新了地图数据的saveData
      world,
      creationDetails,
    };

    // 5.2 生成初始信息（开场对话设计）
    // 注意：由于地图数据由CultivationWorldGenerator保存到酒馆变量，传递null即可
    // 但需要根据变量数据以便保证
    const initialMessageResponse = await retryableAICall(
      () => generateInitialMessage(initialGameDataForAI, null, GAME_START_INITIALIZATION_PROMPT),
      (response) => Boolean(response && response.text && Array.isArray(response.tavern_commands)), // 验证响应是否有效
      2, // 最大重试次数
      '天道正在书写命运之章'
    );

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
    for (const [key, value] of Object.entries(protected先天六司)) {
      if (current先天六司[key as keyof typeof current先天六司] !== value) {
        console.error(`[角色初始化] 检测到先天六司.${key}被意外修改，强制恢复:`, value);
        current先天六司[key as keyof typeof current先天六司] = value;
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
    currentSaveData = await processGmResponse(initialMessageResponse, currentSaveData);

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

      // [数据重构] 合并数据等级，将角色基础信息和AI生成匹配验证
      // 1. 优先使用AI返回的基础数据，如果存在
      // 2. 其次使用世界生成器直接获取数据
      // 3. 最后使用用户输入数据
      // 合并角色基础信息（以AI生成的(currentSaveData.角色基础信息)为准，缺失再回退baseInfo
      type CharacterBaseInfoWithAI = CharacterBaseInfo & {
        _AI说明?: string;
        先天六司: CharacterBaseInfo['先天六司'] & {
          _AI重要提醒?: string;
          _AI修改规则?: string;
        };
      };
      try {

        const aiBase: Partial<CharacterBaseInfo> = currentSaveData.角色基础信息 ?? {};
        const bi: CharacterBaseInfo = baseInfo;

        const mergedBaseInfo: CharacterBaseInfoWithAI = {
          ...bi,
          ...aiBase,
          // 强制保护用户选择的核心字段，AI数据不能覆盖
          名字: bi.名字, // 强制使用用户选择的名字
          性别: bi.性别, // 强制使用用户选择的性别
          年龄: bi.年龄, // 强制使用用户选择的年龄
          先天六司: {
            // 强制使用用户的先天六司，AI数据不能修改
            ...bi.先天六司,
            _AI重要提醒: "玩家角色的先天六司不允许修改，这是角色创建时确定的固定数值",
            _AI修改规则: "严禁对玩家的先天六司进行任何 set/add/push/pull 操作",
          },
          // 只有当用户选择"随机"时才能使用AI的精细化结果
          出生: (typeof bi.出生 === 'string' && (bi.出生.includes('随机') || bi.出生 === '随机'))
            ? (aiBase?.出生 || bi.出生)
            : bi.出生,
          灵根: (typeof bi.灵根 === 'string' && (bi.灵根.includes('随机') || bi.灵根 === '随机'))
            ? (aiBase?.灵根 || bi.灵根)
            : bi.灵根,
          // 其他字段可以使用AI的增强数据
          世界详情: { ...(bi?.世界详情 ?? {}), ...(aiBase?.世界详情 ?? {}) },
          天赋: Array.isArray(aiBase?.天赋) ? aiBase.天赋 : (Array.isArray(bi?.天赋) ? bi.天赋 : []),
          天赋详情: Array.isArray(aiBase?.天赋详情) ? aiBase.天赋详情 : (Array.isArray(bi?.天赋详情) ? bi.天赋详情 : []),
          _AI说明: "角色创建时的基础信息，其中名字、性别、年龄、先天六司不允许修改，出生/灵根仅在用户选择随机时可精细化",
        };
        currentSaveData.角色基础信息 = mergedBaseInfo;
      } catch {
        const fallbackMerged: CharacterBaseInfoWithAI = {
          ...baseInfo,
          先天六司: {
            ...baseInfo.先天六司,
            _AI重要提醒: "玩家角色的先天六司不允许修改，这是角色创建时确定的固定数值",
            _AI修改规则: "严禁对玩家的先天六司进行任何 set/add/push/pull 操作",
          },
          _AI说明: "角色创建时的基础信息，名字/性别/年龄/先天六司仅在用户选择随机时可精细化",
        };
        currentSaveData.角色基础信息 = fallbackMerged;
      }

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
            世界纪元: world.era,
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

      // 追加：计算并写入"天道规则 v4.2"预计算数据（直接判断直接调用）
      try {
        await syncHeavenlyPrecalcToTavern(currentSaveData as any, currentSaveData.角色基础信息 as any);
        console.log('[角色初始化] 已写入天道规则预计算数据');
      } catch (e) {
        console.warn('[角色初始化] 天道规则预计算写入失败，不影响游戏进行', e);
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