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
import { cacheSystemRulesToTavern } from '@/utils/tavernCore';
import { processGmResponse } from '@/utils/AIGameMaster';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { CHARACTER_INITIALIZATION_PROMPT } from '@/utils/prompts/characterInitializationPrompts';
import { validateGameData } from '@/utils/gameDataValidator';
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
    
    // [新增] 调试日志：验证传入的 baseInfo 是否包含详情字段
    console.log('[角色初始化] === 输入验证 ===');
    console.log('传入的 baseInfo:', JSON.stringify(baseInfo, null, 2));
    console.log('天资详情:', baseInfo.天资详情);
    console.log('出身详情:', baseInfo.出身详情);
    console.log('灵根详情:', baseInfo.灵根详情);
    console.log('天赋详情:', baseInfo.天赋详情);
    console.log('[角色初始化] === 输入验证完成 ===');

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

      // 0.6. 设置角色出生地位置基础信息
      uiStore.updateLoadingText('天道正在为你安排降生之地...');
      try {
        // 获取用户描述的出生地名称
        const userBirthDescription = extractName(baseInfo.出生);

        // 根据出生背景预设位置基础结构，AI将进一步具体化为层级地理位置
        let locationBase = '初始地';
        
        // 根据出生类型预设合适的位置基础
        if (userBirthDescription.includes('宗门') || userBirthDescription.includes('弟子')) {
          locationBase = '某大陆·某宗门';
        } else if (userBirthDescription.includes('世家') || userBirthDescription.includes('贵族')) {
          locationBase = '某大陆·某州·世家府邸';
        } else if (userBirthDescription.includes('平民') || userBirthDescription.includes('农家') || userBirthDescription.includes('商贾')) {
          locationBase = '某大陆·某州·某镇';
        } else if (userBirthDescription.includes('散修') || userBirthDescription.includes('孤儿')) {
          locationBase = '某大陆·某荒野';
        } else {
          locationBase = '某大陆·某地';
        }

        // 设置玩家位置信息，AI将根据角色背景生成具体的层级地理位置
        playerStatus.位置 = {
          描述: locationBase // AI将其具体化为"青云大陆·青云宗"等格式
        };

        console.log('[角色初始化] 出生地基础已设定:', {
          用户出生描述: userBirthDescription,
          位置基础: playerStatus.位置.描述,
          说明: 'AI将进一步具体化为层级地理位置格式'
        });

      } catch (birthplaceError) {
        console.error('[角色初始化] 出生地设置失败:', birthplaceError);
        // 如果出错，使用默认位置作为fallback
        playerStatus.位置 = {
          描述: '某大陆·某地' // 提供基础结构供AI具体化
        };
      }

    } catch (worldGenError) {
      console.error('[角色初始化] 世界生成失败:', worldGenError);
      const errorMessage = worldGenError instanceof Error ? worldGenError.message : String(worldGenError);
      throw new Error(`世界生成失败: ${errorMessage}`);
    }

    // 2. 创建基础存档结构（符合 SaveData 类型）
    // 确保灵根是对象格式，符合数据验证要求
    let formattedSpiritRoot = baseInfo.灵根;
    if (typeof formattedSpiritRoot === 'string') {
        // 如果灵根是字符串，转换为对象格式
        formattedSpiritRoot = {
            名称: formattedSpiritRoot,
            品级: '凡品', // 默认品级
            描述: '基础灵根'
        };
        console.log('[角色初始化] 已将字符串灵根转换为对象格式:', formattedSpiritRoot);
    } else if (!formattedSpiritRoot || typeof formattedSpiritRoot !== 'object') {
        // 如果灵根不存在或格式不正确，使用默认值
        formattedSpiritRoot = {
            名称: '五行灵根',
            品级: '凡品',
            描述: '五行齐全的均衡灵根，修炼各系功法都有不错效果'
        };
        console.log('[角色初始化] 已使用默认灵根对象:', formattedSpiritRoot);
    }

    // 更新baseInfo中的灵根格式
    baseInfo.灵根 = formattedSpiritRoot;

    const saveData: SaveData = {
        角色基础信息: baseInfo, // 初始时使用 baseInfo
        玩家角色状态: playerStatus,
        装备栏: {
            装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null,
        },
        三千大道: createEmptyThousandDaoSystem(),
        背包: {
            灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
            物品: [], // [REFACTORED] 物品现在是数组，确保初始化为空数组
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
        },
        系统: {
          规则: {
            属性上限: {
              先天六司: { 每项上限: 10 }
            }
          },
          提示: [
            '系统规则：先天六司每项上限为10（NPC同样适用），如超限需裁剪至上限。'
          ]
        }
      };

      // 注入各模块的 _AI 元数据提示，放在对应路径，避免反复在提示词里重复说明
      try {
        // 角色基础信息（静态、不可变）
        if (saveData.角色基础信息) {
          (saveData.角色基础信息 as any)._AI说明 = '角色基础信息为创建时的静态设定，严禁修改（名字/性别/世界/天资/出身/灵根/先天六司）。';
          (saveData.角色基础信息 as any)._AI重要提醒 = '先天六司每项上限10；任何超过上限的写入都必须裁剪为10。';
        }
        // 玩家角色状态（实时变更）
        (saveData.玩家角色状态 as any)._AI说明 = '玩家实时状态。位置仅更新“描述”；气血/灵气/神识/寿命/修为字段为{当前,最大}结构，任何数值变更必须通过 tavern_commands 实现。';
        (saveData.玩家角色状态 as any)._AI重要提醒 = '当气血≤0应设置已死亡/死亡时间/死亡原因。不要写入坐标。';
        // 背包
        (saveData.背包 as any)._AI说明 = '背包.物品为数组；物品必须包含 物品ID/名称/类型/品质({quality,grade})/数量/描述；灵石存放于 背包.灵石 下。';
        // 装备栏
        (saveData.装备栏 as any)._AI说明 = '装备栏包含装备1..6槽，值为 {物品ID, 名称} 或 null；装备状态需与 背包.物品[*].已装备 同步。';
        // 修炼功法
        (saveData.修炼功法 as any)._AI说明 = '修炼功法包含 功法/熟练度/已解锁技能[]/修炼时间/突破次数/正在修炼/修炼进度。变更需与剧情一致。';
        // 三千大道
        (saveData.三千大道 as any)._AI说明 = '三千大道系统：所有解锁、进度与路径定义应保持一致，写入大道进度时需确保加入 已解锁大道。';
        // 记忆（禁止手动操作）
        (saveData.记忆 as any)._AI说明 = '记忆模块由系统维护：短期/中期/长期；AI禁止直接修改，仅可通过叙事触发系统更新。';
        (saveData.记忆 as any)._AI重要提醒 = '严禁 push/删除 记忆数组。';
        // 游戏时间（每次推进必更新）
        (saveData.游戏时间 as any)._AI说明 = '每次回应必须推进游戏时间（年/月/日/小时/分钟）。';
        // 宗门系统（可选）
        (saveData.宗门系统 as any)._AI说明 = '宗门系统：记录可加入宗门与关系、历史，字段应为结构化文本，不要混入数值型“实力评估”。';
        // 系统（规则/提示）
        (saveData.系统 as any)._AI说明 = '系统.规则 为全局限制；系统.提示 为约束提示集合，AI在生成前应读取并遵守。';
      } catch {}

    // 额外验证确保必需字段存在
    if (!saveData.背包.物品 || !Array.isArray(saveData.背包.物品)) {
        saveData.背包.物品 = [];
        console.log('[角色初始化] 已强制初始化背包.物品为空数组');
    }

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

    // [核心修复] 在调用AI前，将生成的世界信息注入存档
    if (worldDataFromGenerator) {
      currentSaveData.世界信息 = worldDataFromGenerator;
      console.log('[角色初始化] 已将生成的世界信息注入到存档中，准备传递给AI');
    }

    // 位置信息已经在初始化信息生成，无需重新设置位置变量
    uiStore.updateLoadingText('天道正在为你书写命运之章...');

    // 5.1 [RESTRUCTURED] Pass full objects to the AI generator, not formatted strings.
    // The prompt builder will be responsible for formatting.

    // No formatting needed here. We pass the raw, rich objects.
    const creationDetails = {
      age: age,
      // Pass names for random generation logic, but the full object is in baseInfo
      originName: (baseInfo.出生 && typeof baseInfo.出生 === 'object') ? baseInfo.出生.名称 : String(baseInfo.出生),
      spiritRootName: (baseInfo.灵根 && typeof baseInfo.灵根 === 'object') ? baseInfo.灵根.名称 : String(baseInfo.灵根),
      talentNames: Array.isArray(baseInfo.天赋) ? baseInfo.天赋.map(t => (t && typeof t === 'object' ? t.名称 : String(t))) : [],
      talentTierName: (baseInfo.天资 && typeof baseInfo.天资 === 'object') ? (baseInfo.天资 as any).name : String(baseInfo.天资)
    };

    // 5.2 Build the data package for the AI with the original rich objects
    const sanitizedBaseInfo = {
      ...baseInfo, // [确认] 使用包含详情字段的完整 baseInfo
    };
    
    // [新增] 验证传递给AI的数据是否包含详情字段
    console.log('[角色初始化] === AI输入验证 ===');
    console.log('传递给AI的 sanitizedBaseInfo.天资详情:', sanitizedBaseInfo.天资详情);
    console.log('传递给AI的 sanitizedBaseInfo.出身详情:', sanitizedBaseInfo.出身详情);
    console.log('传递给AI的 sanitizedBaseInfo.天赋详情:', sanitizedBaseInfo.天赋详情);
    console.log('[角色初始化] === AI输入验证完成 ===');

    // Provide a comprehensive world description to the AI
    const sanitizedWorld = {
      ...world,
      description: `世界名: ${world.name}, 纪元: ${world.era}. 背景: ${world.description}`
    };

    const initialGameDataForAI = {
      baseInfo: sanitizedBaseInfo,
      saveData: currentSaveData,
      world: sanitizedWorld,
      creationDetails,
    };
    console.log('--- [AI DEBUG] 即将调用AI生成初始消息 ---');
    console.log('[AI DEBUG] 传递给AI的初始数据 (initialGameDataForAI):', JSON.parse(JSON.stringify(initialGameDataForAI)));


    // 5.2 生成初始信息（开场对话设计）
    // 注意：由于地图数据由CultivationWorldGenerator保存到酒馆变量，传递null即可
    // 但需要根据变量数据以便保证
    // 确保系统规则已嵌入酒馆存储（后续生成会自动附带）
    try {
      await cacheSystemRulesToTavern('chat');
    } catch {}

    const initialMessageResponse = await retryableAICall(
      () => generateInitialMessage(initialGameDataForAI as any, {}, CHARACTER_INITIALIZATION_PROMPT),
      (response) => {
        // 严格验证AI响应
        if (!response || !response.text || typeof response.text !== 'string') {
          return false;
        }
        const text = response.text.trim();
        // 检查文本长度，避免太短的无意义回复
        if (text.length < 200) {
          console.warn('[AI验证] 生成的文本太短:', text.length, '字符');
          return false;
        }
        // 检查是否包含无效的占位符
        if (text.includes('随机') || text.includes('placeholder') || text.includes('临时')) {
          console.warn('[AI验证] 生成的文本包含占位符:', text.substring(0, 100));
          return false;
        }
        return true;
      },
      3, // 增加重试次数到3次
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
      (creationDetails.originName.includes('随机') || creationDetails.originName === '随机')
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
      (creationDetails.spiritRootName.includes('随机') || creationDetails.spiritRootName === '随机')
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
    console.log('[角色初始化] 开场剧情信息总长度:', fullOpeningMessage.length);
    console.log('[角色初始化] 开场剧情信息是否为空:', !fullOpeningMessage.trim());

    // 写入短期记忆（来源于AI的开场text，中期记忆不直接写入）
    try {
      // 确保currentSaveData存在
      if (!currentSaveData) {
        console.error('[角色初始化] currentSaveData为空，无法写入记忆！');
        throw new Error('存档数据结构异常');
      }

      if (!currentSaveData.记忆) {
        currentSaveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
        console.log('[角色初始化] 已创建记忆结构');
      }
      if (!Array.isArray(currentSaveData.记忆.短期记忆)) {
        currentSaveData.记忆.短期记忆 = [];
        console.log('[角色初始化] 已初始化短期记忆数组');
      }
      if (!Array.isArray(currentSaveData.记忆.中期记忆)) currentSaveData.记忆.中期记忆 = [];
      
      if (fullOpeningMessage.trim()) {
        const shortEntry = fullOpeningMessage.length > 2000 ? `${fullOpeningMessage.substring(0, 2000)}...` : fullOpeningMessage;
        currentSaveData.记忆.短期记忆.push(shortEntry);
        console.log('[角色初始化] 已将开场剧情写入短期记忆，长度:', shortEntry.length);
        console.log('[角色初始化] 短期记忆数组当前长度:', currentSaveData.记忆.短期记忆.length);
        console.log('[角色初始化] 短期记忆内容预览:', shortEntry.substring(0, 100));
      } else {
        console.error('[角色初始化] 开场剧情信息为空，无法写入短期记忆！');
        console.error('[角色初始化] fullOpeningMessage 内容:', JSON.stringify(fullOpeningMessage));
        console.error('[角色初始化] initialMessageResponse.text 内容:', JSON.stringify(initialMessageResponse.text));
        console.error('[角色初始化] initialMessageResponse 完整内容:', JSON.stringify(initialMessageResponse));
        
        // 抛出错误强制重试，不使用备用文本
        throw new Error('AI生成的开场剧情为空，无法完成角色初始化');
      }
      // 中期记忆：不直接展示AI返回的 mid_term_memory，而是通过转换器
    } catch (e) {
      console.error('[角色初始化] 写入记忆失败:', e);
      console.error('[角色初始化] currentSaveData.记忆 状态:', currentSaveData.记忆);
      // 重新抛出错误，因为记忆写入失败是严重问题
      throw new Error(`记忆写入失败: ${e instanceof Error ? e.message : '未知错误'}`);
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

      // [数据重构] 合并角色基础信息，确保灵根格式正确
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
        // [修复] 确保灵根对象结构完整，优先保留用户选择
        灵根: bi.灵根 && typeof bi.灵根 === 'object' && 'name' in bi.灵根 && 'tier' in bi.灵根
          ? {
              名称: String(bi.灵根.name),
              品级: String(bi.灵根.tier),
              描述: String((bi.灵根 as any).description || '')
            } // 转换英文字段到中文字段
          : bi.灵根 && typeof bi.灵根 === 'object' && '品级' in bi.灵根
          ? bi.灵根 // 用户选择的灵根数据已经是中文格式，直接使用
          : (aiBase?.灵根 || bi.灵根), // 否则使用AI数据或原始数据
        世界详情: { ...bi.世界详情, ...aiBase.世界详情 } as World,
        // [修复] 优先保留用户选择的天赋，只有在用户未选择时才使用AI生成的
        天赋: Array.isArray(bi?.天赋) && bi.天赋.length > 0 
          ? bi.天赋 // 用户有选择天赋，优先使用用户选择
          : (Array.isArray(aiBase?.天赋) ? aiBase.天赋 : []), // 用户未选择时使用AI生成的
        天赋详情: Array.isArray(bi?.天赋详情) && bi.天赋详情.length > 0
          ? bi.天赋详情 // 用户有天赋详情，优先使用
          : (Array.isArray(aiBase?.天赋详情) ? aiBase.天赋详情 : []), // 否则使用AI生成的
        // [修复] 确保用户选择的详情对象被正确保留
        天资详情: bi.天资详情 || aiBase?.天资详情,
        出身详情: bi.出身详情 || aiBase?.出身详情,
        灵根详情: bi.灵根详情 || aiBase?.灵根详情,
      };
      currentSaveData.角色基础信息 = mergedBaseInfo;

      // [新增] 验证用户选择的关键数据是否被正确保留
      console.log('[角色初始化] 数据合并验证:');
      console.log(`- 用户选择灵根: ${JSON.stringify(bi.灵根)}`);
      console.log(`- 最终灵根数据: ${JSON.stringify(mergedBaseInfo.灵根)}`);
      console.log(`- 用户选择天赋数量: ${Array.isArray(bi.天赋) ? bi.天赋.length : 0}`);
      console.log(`- 最终天赋数量: ${Array.isArray(mergedBaseInfo.天赋) ? mergedBaseInfo.天赋.length : 0}`);
      console.log(`- 最终天赋列表: ${JSON.stringify(mergedBaseInfo.天赋)}`);
      console.log(`- 天资详情: ${JSON.stringify(mergedBaseInfo.天资详情)}`);
      console.log(`- 出身详情: ${JSON.stringify(mergedBaseInfo.出身详情)}`);
      console.log(`- 灵根详情: ${JSON.stringify(mergedBaseInfo.灵根详情)}`);
      console.log(`- 天赋详情: ${JSON.stringify(mergedBaseInfo.天赋详情)}`);
      
      // 强制验证关键字段的数据完整性
      if (bi.灵根 && typeof bi.灵根 === 'object') {
        // 检查是否是英文字段格式 (name, tier)
        if ('tier' in bi.灵根 && 'name' in bi.灵根) {
          const englishRoot = bi.灵根 as { name: string; tier: string; description?: string };
          const expectedGrade = englishRoot.tier;
          if (typeof mergedBaseInfo.灵根 === 'object' && mergedBaseInfo.灵根 && '品级' in mergedBaseInfo.灵根) {
            if (mergedBaseInfo.灵根.品级 !== expectedGrade) {
              console.error('[角色初始化] 灵根品级数据丢失，强制恢复');
              mergedBaseInfo.灵根 = {
                名称: englishRoot.name,
                品级: englishRoot.tier,
                描述: String(englishRoot.description || '')
              };
            }
          }
        }
        // 检查是否是中文字段格式 (名称, 品级)
        else if ('品级' in bi.灵根 && '名称' in bi.灵根) {
          const chineseRoot = bi.灵根 as { 名称: string; 品级: string; 描述?: string };
          if (typeof mergedBaseInfo.灵根 === 'object' && mergedBaseInfo.灵根 && '品级' in mergedBaseInfo.灵根) {
            if (mergedBaseInfo.灵根.品级 !== chineseRoot.品级) {
              console.error('[角色初始化] 灵根品级数据丢失，强制恢复');
              mergedBaseInfo.灵根 = {
                名称: chineseRoot.名称,
                品级: chineseRoot.品级,
                描述: String(chineseRoot.描述 || '')
              };
            }
          }
        }
      }
      
      if (Array.isArray(bi.天赋) && bi.天赋.length > 0) {
        if (!Array.isArray(mergedBaseInfo.天赋) || mergedBaseInfo.天赋.length === 0) {
          console.error('[角色初始化] 用户选择的天赋数据丢失，强制恢复');
          mergedBaseInfo.天赋 = bi.天赋;
          mergedBaseInfo.天赋详情 = bi.天赋详情 || [];
        }
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

      // [新增] 最终验证并确保用户选择的关键数据保存到酒馆
      console.log('[角色初始化] 最终验证存储到酒馆的角色基础信息:');
      console.log(`- 灵根数据: ${JSON.stringify(currentSaveData.角色基础信息?.灵根)}`);
      console.log(`- 天赋数据: ${JSON.stringify(currentSaveData.角色基础信息?.天赋)}`);
      
      // 强制确保用户选择的数据被正确写入
      if (currentSaveData.角色基础信息) {
        // 确保灵根数据正确
        if (mergedBaseInfo.灵根 && typeof mergedBaseInfo.灵根 === 'object' && '品级' in mergedBaseInfo.灵根) {
          currentSaveData.角色基础信息.灵根 = mergedBaseInfo.灵根;
          console.log('[角色初始化] 强制确保用户选择的灵根数据写入酒馆');
        }
        
        // 确保天赋数据正确
        if (Array.isArray(mergedBaseInfo.天赋) && mergedBaseInfo.天赋.length > 0) {
          currentSaveData.角色基础信息.天赋 = mergedBaseInfo.天赋;
          currentSaveData.角色基础信息.天赋详情 = mergedBaseInfo.天赋详情;
          console.log('[角色初始化] 强制确保用户选择的天赋数据写入酒馆');
        }
        
        // 确保其他关键字段 
        currentSaveData.角色基础信息.先天六司 = mergedBaseInfo.先天六司;
        currentSaveData.角色基础信息.出生 = mergedBaseInfo.出生;
        
        // [新增] 确保完整的详情对象也被保存
        if (mergedBaseInfo.世界详情) {
          currentSaveData.角色基础信息.世界详情 = mergedBaseInfo.世界详情;
        }
        if (mergedBaseInfo.天资详情) {
          currentSaveData.角色基础信息.天资详情 = mergedBaseInfo.天资详情;
        }
        if (mergedBaseInfo.出身详情) {
          currentSaveData.角色基础信息.出身详情 = mergedBaseInfo.出身详情;
        }
        if (mergedBaseInfo.灵根详情) {
          currentSaveData.角色基础信息.灵根详情 = mergedBaseInfo.灵根详情;
        }
      }

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

      // 最终强制检查位置描述，确保符合层级地理格式
      const currentLocation = currentSaveData.玩家角色状态?.位置?.描述;
      if (!currentLocation || 
          currentLocation.includes('随机') || 
          currentLocation === '初始地' || 
          currentLocation === '位置生成失败' ||
          currentLocation.includes('某大陆') ||
          currentLocation.includes('某地') ||
          currentLocation.includes('某宗门') ||
          currentLocation.includes('某州') ||
          currentLocation.includes('某镇') ||
          !currentLocation.includes('·')) {
        
        // 生成符合格式的默认位置
        const userBirthDescription = extractName(baseInfo.出生) || '';
        let fallbackLocation = '';
        
        if (userBirthDescription.includes('宗门') || userBirthDescription.includes('弟子')) {
          fallbackLocation = '青云大陆·青云宗';
        } else if (userBirthDescription.includes('世家') || userBirthDescription.includes('贵族')) {
          fallbackLocation = '天星大陆·天青州·世家府邸';
        } else if (userBirthDescription.includes('平民') || userBirthDescription.includes('农家') || userBirthDescription.includes('商贾')) {
          fallbackLocation = '天星大陆·天青州·安德镇';
        } else if (userBirthDescription.includes('散修') || userBirthDescription.includes('孤儿')) {
          fallbackLocation = '苍穹大陆·无量山脉';
        } else {
          fallbackLocation = '天星大陆·天青州·青石镇';
        }
        
        currentSaveData.玩家角色状态.位置.描述 = fallbackLocation;
        console.log(`[角色初始化] 位置格式不符合要求("${currentLocation}")，已设置为层级地理格式: ${fallbackLocation}`);
      } else {
        console.log(`[角色初始化] 位置格式验证通过: ${currentLocation}`);
      }

      // 最终保险检查：确保位置对象存在
      if (!currentSaveData.玩家角色状态.位置 || !currentSaveData.玩家角色状态.位置.描述) {
        console.warn('[角色初始化] 位置对象缺失，使用默认层级地理位置');
        currentSaveData.玩家角色状态.位置 = {
          描述: '天星大陆·天青州·青石镇' // 默认的层级地理位置
        };
        // 同步更新到酒馆变量
        await helper.insertOrAssignVariables({ 'character.saveData.玩家角色状态.位置': currentSaveData.玩家角色状态.位置 }, { type: 'chat' });
        console.log('[角色初始化] 已设置默认层级地理位置');
      }

      console.log('角色基础信息已保存到全局变量，游戏数据已保存到聊天变量');
      
      // [新增] 最终验证存储结果
      console.log('[角色初始化] === 数据存储验证报告 ===');
      console.log(`✓ 用户选择的灵根: ${JSON.stringify(mergedBaseInfo.灵根)}`);
      console.log(`✓ 存储到酒馆的灵根: ${JSON.stringify(currentSaveData.角色基础信息?.灵根)}`);
      console.log(`✓ 用户选择的天赋: ${JSON.stringify(mergedBaseInfo.天赋)}`);
      console.log(`✓ 存储到酒馆的天赋: ${JSON.stringify(currentSaveData.角色基础信息?.天赋)}`);
      console.log(`✓ 用户选择的先天六司: ${JSON.stringify(mergedBaseInfo.先天六司)}`);
      console.log(`✓ 存储到酒馆的先天六司: ${JSON.stringify(currentSaveData.角色基础信息?.先天六司)}`);
      // [新增] 验证详情对象
      console.log(`✓ 天资详情: ${JSON.stringify(currentSaveData.角色基础信息?.天资详情)}`);
      console.log(`✓ 出身详情: ${JSON.stringify(currentSaveData.角色基础信息?.出身详情)}`);
      console.log(`✓ 灵根详情: ${JSON.stringify(currentSaveData.角色基础信息?.灵根详情)}`);
      console.log(`✓ 天赋详情: ${JSON.stringify(currentSaveData.角色基础信息?.天赋详情)}`);
      console.log('[角色初始化] === 验证完成 ===');
    } catch (err) {
      console.warn('保存游戏数据到酒馆失败，不影响本地游戏开始:', err);
      // 显示错误信息但不阻塞loading toast
      uiStore.updateLoadingText(`数据同步失败，不影响游戏开始，继续...`);
    }

    // 7. [新增] 最终验证
    // 在返回最终数据前，进行一次严格的验证，确保AI没有生成不合规的数据
    const finalValidation = validateGameData(currentSaveData, { 角色基础信息: baseInfo, 模式: '单机' }, 'creation');
    if (!finalValidation.isValid) {
      console.error('[角色初始化] 最终数据验证失败:', finalValidation.errors);
      // 在创建阶段，任何验证失败都应被视为严重错误并中断流程
      throw new Error(`角色数据在生成后未能通过最终验证，请重试。错误: ${finalValidation.errors.join(', ')}`);
    }

    // 最终检查：确保短期记忆正确保存
    console.log('[角色初始化] 最终检查短期记忆状态:', {
      是否存在记忆结构: !!currentSaveData.记忆,
      短期记忆数组长度: currentSaveData.记忆?.短期记忆?.length || 0,
      短期记忆第一条预览: currentSaveData.记忆?.短期记忆?.[0]?.substring(0, 100) || '无'
    });

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
