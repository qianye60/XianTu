/**
 * @fileoverview 角色初始化服务
 * 负责角色创建完成后的全套初始化流程，并集成AI动态生成。
 */

import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, SaveData, PlayerStatus } from '@/types/game';
import type { CharacterData, World } from '@/types';
import { generateInitialMessage, generateMapFromWorld } from '@/utils/tavernAI';
import { processGmResponse } from '@/utils/AIGameMaster';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { GAME_START_INITIALIZATION_PROMPT } from '@/utils/prompts/characterInitializationPrompts';
import { WorldGenerationConfig, BirthplaceGenerator } from '@/utils/worldGeneration/gameWorldConfig';

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
      描述: "新手村", // 改为更合适的默认位置
      坐标: { X: Math.floor(Math.random() * 1000), Y: Math.floor(Math.random() * 1000) }
    },
    气血: { 当前: 初始气血, 最大: 初始气血 },
    灵气: { 当前: 初始灵气, 最大: 初始灵气 }, // 开局灵气为满
    神识: { 当前: 初始神识, 最大: 初始神识 },
    寿命: { 当前: age, 最大: 最大寿命 }, // 当前寿命就是年龄
    修为: { 当前: 0, 最大: 10 }, // 凡人初始修为
    状态效果: [], // 使用新的StatusEffect数组格式
    当前活动: "初入修仙",
    心境状态: "好奇与忐忑"
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
  const helper = getTavernHelper();
  if (!helper) throw new Error('无法连接到酒馆助手');

  try {
    // 0. 清空酒馆chat变量，防止旧数据残留
    toast.info('天道清明：正在清除旧数据残留...');
    try {
      // 清空所有chat变量
      await helper.insertOrAssignVariables({}, { type: 'chat' });
      console.log('[角色初始化] 酒馆chat变量已清空');
      toast.success('旧数据清除完成！');
    } catch (err) {
      console.warn('[角色初始化] 清空酒馆变量失败:', err);
      toast.warning('清除旧数据失败，但不影响游戏进行');
    }

    // 1. 计算基础属性
    const playerStatus = calculateInitialAttributes(baseInfo, age);

    // 0.5. 生成修仙世界（新增）
    toast.info('天道造化：正在生成修仙世界...');
    try {
      // 创建世界生成配置，根据角色背景调整
      const worldConfig = new WorldGenerationConfig('classic_cultivation');
      if (baseInfo.出身) {
        worldConfig.adjustForCharacterBackground(baseInfo.出身);
      }

      // 创建世界生成器并生成世界
      const worldGenerator = new CultivationWorldGenerator(
        worldConfig.getSettings(),
        baseInfo.出身
      );

      await worldGenerator.generateWorld();
      
      // 等待世界生成完成
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success('修仙世界生成完成！');
      console.log('[角色初始化] 修仙世界已生成并保存到酒馆变量');
      
      // 0.6. 生成角色出生地（新增）
      toast.info('天道定位：正在确定出生地点...');
      try {
        const variables = await helper.getVariables({ type: 'chat' });
        const worldFactions = variables['world_factions'] || [];
        
        // 生成出生地
        const birthplace = BirthplaceGenerator.generateBirthplace(
          baseInfo.出身,
          worldConfig.getSettings()
        );
        
        // 保存出生地信息到酒馆变量
        await helper.insertOrAssignVariables({
          'character_birthplace': birthplace
        }, { type: 'chat' });
        
        // 更新玩家初始位置
        playerStatus.位置 = {
          描述: birthplace.name,
          坐标: birthplace.coordinates
        };
        
        toast.success(`出生地确定：${birthplace.name}`);
        console.log('[角色初始化] 角色出生地已生成:', birthplace);
        
      } catch (birthplaceError) {
        console.error('[角色初始化] 出生地生成失败:', birthplaceError);
        toast.warning('出生地生成失败，将使用默认位置');
      }
      
    } catch (worldGenError) {
      console.error('[角色初始化] 世界生成失败:', worldGenError);
      toast.warning('世界生成失败，将使用默认配置');
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
    toast.info('天道敕封：正在将世界背景载入天机...');
    try {
      const worldBookEntry = {
        name: `【世界】${world.name || '未知世界'}`,
        description: world.description || `这是【${baseInfo.名字}】所选择的修仙世界`,
        content: JSON.stringify(world, null, 2),
        order: 1,
        enabled: true
      };

      // 将世界信息添加到"大道朝天"世界书中
      await helper.insertOrAssignVariables({
        [`world.${world.name || '未知世界'}`]: worldBookEntry
      }, { type: 'chat' });

      console.log(`世界背景【${world.name}】已载入酒馆世界书`);
      toast.success('世界背景已载入天机！');
    } catch (err) {
      console.warn('载入世界背景失败:', err);
      toast.warning('世界背景载入失败，但不影响游戏进行');
    }

    // 4. AI生成：衍化世界舆图（只尝试1次）
    toast.info('天道推演：正在衍化世界舆图...');
    const mapResponse = await generateMapFromWorld(world);
    
    // 构造临时的CharacterData对象用于processGmResponse
    const tempCharacterData: CharacterData = {
      character_name: baseInfo.名字,
      id: Date.now(), // 使用时间戳作为临时ID
      world_id: 1, // 默认世界ID
      created_at: new Date().toISOString(),
      inventory: {
        items: [],
        capacity: 100,
        expansions: [],
        currency: { low: 0, mid: 0, high: 0, supreme: 0 }
      },
      talents: [],
      reputation: 0,
      // 添加其他必要的默认属性
      root_bone: baseInfo.先天六司?.根骨 || 0,
      spirituality: baseInfo.先天六司?.灵性 || 0,
      comprehension: baseInfo.先天六司?.悟性 || 0,
      fortune: baseInfo.先天六司?.气运 || 0,
      charm: baseInfo.先天六司?.魅力 || 0,
      temperament: baseInfo.先天六司?.心性 || 0,
      source: 'local' as const
    };
    
    await processGmResponse(mapResponse, tempCharacterData);
    const allVarsAfterMapGen = await helper.getVariables({ type: 'chat' }) || {};
    const worldMap = allVarsAfterMapGen['world.mapData'] || {};
    toast.success('世界舆图衍化完成！');

    // 5. AI生成：生成开局剧情与状态（只尝试1次）
    toast.info('天道赋格：正在生成命运轨迹...');

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
      saveData, // 包含计算出的初始状态
      world,
      creationDetails,
    };

    const initialMessageResponse = await generateInitialMessage(initialGameDataForAI, worldMap, GAME_START_INITIALIZATION_PROMPT);

    // 5.3 将完整的开局剧情信息存入记忆
    const openingStory = initialMessageResponse.text || "你睁开双眼，发现自己身处在一个古色古香的房间里。";
    const aroundDescription = initialMessageResponse.around || "";
    const storySummary = initialMessageResponse.mid_term_memory || (openingStory.substring(0, 70) + '...');

    // 构建完整的开局消息，包含环境描述
    let fullOpeningMessage = openingStory;
    if (aroundDescription) {
      fullOpeningMessage += `\n\n【周围环境】\n${aroundDescription}`;
    }

    // 保存到记忆系统
    saveData.记忆.短期记忆.push(fullOpeningMessage);
    saveData.记忆.中期记忆.push(storySummary);
    
    console.log('[角色初始化] 保存的完整开局消息:', fullOpeningMessage.substring(0, 200));

    // 5.4 调用 processGmResponse 来执行AI返回的其他指令（如设置物品等）
    // 使用我们之前构造的完整CharacterData对象
    await processGmResponse(initialMessageResponse, tempCharacterData);
    
    // 5.5 尝试从AI生成的内容中提取位置信息并更新
    await updateLocationFromAIResponse(initialMessageResponse, saveData, helper);
    
    toast.success('命运轨迹已定！');

    // 5.6 检查并更新AI生成的角色信息（不论是否选择随机）
    const postAIVars = await helper.getVariables({ type: 'chat' }) || {};
    
    // 更新AI生成的出身（优先AI生成的内容）
    if (postAIVars['character.qualities.origin.name']) {
      const generatedOrigin = String(postAIVars['character.qualities.origin.name']);
      console.log(`[角色初始化] 检测到AI生成的出身: ${generatedOrigin}`);
      baseInfo.出生 = generatedOrigin;
      toast.info(`出身已更新：${baseInfo.出生}`);
    } else if (baseInfo.出生 === '随机出身') {
      // AI未生成出身时的后备逻辑
      const fallbackOrigins = ['平民出身', '商贾之家', '农家子弟', '书香门第', '武者后代', '山村野民'];
      const randomOrigin = fallbackOrigins[Math.floor(Math.random() * fallbackOrigins.length)];
      console.log(`[角色初始化] AI未生成出身，使用后备方案: ${randomOrigin}`);
      baseInfo.出生 = randomOrigin;
      toast.info(`出身已确定：${baseInfo.出生}`);
    }
    
    // 更新AI生成的灵根（优先AI生成的内容）
    if (postAIVars['character.qualities.spiritRoot.name']) {
      const generatedSpiritRoot = String(postAIVars['character.qualities.spiritRoot.name']);
      console.log(`[角色初始化] 检测到AI生成的灵根: ${generatedSpiritRoot}`);
      baseInfo.灵根 = generatedSpiritRoot;
      toast.info(`灵根已更新：${baseInfo.灵根}`);
    } else if (baseInfo.灵根 === '随机灵根') {
      // AI未生成灵根时的后备逻辑
      const fallbackRoots = ['金灵根', '木灵根', '水灵根', '火灵根', '土灵根', '风灵根', '雷灵根', '冰灵根', '毒灵根'];
      const randomRoot = fallbackRoots[Math.floor(Math.random() * fallbackRoots.length)];
      console.log(`[角色初始化] AI未生成灵根，使用后备方案: ${randomRoot}`);
      baseInfo.灵根 = randomRoot;
      toast.info(`灵根已确定：${baseInfo.灵根}`);
    }

    // 同样更新其他可能被AI改变的信息
    if (postAIVars['character.identity.description']) {
      // 如果AI提供了新的角色描述，也更新它
      console.log('[角色初始化] 更新AI生成的角色描述');
    }

    // ================= 数据整合与持久化 =================

    // 6. 从酒馆变量中取回被AI修改后的最新数据
    const finalVars = await helper.getVariables({ type: 'chat' }) || {};
    const finalSaveData = finalVars.DAD_SaveData || saveData; // 获取可能被AI修改的存档
    const finalWorldMap = finalVars['world.mapData'] || worldMap;

    // 7. 按照正确的数据架构分别存储
    toast.info(`正在为【${baseInfo.名字}】铸造法身并同步天机...`);
    try {
      // 设置全局变量（基础信息，不变）
      const globalVars = {
        'character.name': baseInfo.名字,
        'character.gender': baseInfo.性别,
        'character.world': baseInfo.世界,
        'character.talent_tier': baseInfo.天资,
        'character.origin': baseInfo.出生,
        'character.spirit_root': baseInfo.灵根,
        'character.talents': baseInfo.天赋,
        'character.innate_attributes': {
          root_bone: baseInfo.先天六司?.根骨 || 10,
          spirituality: baseInfo.先天六司?.灵性 || 10,
          comprehension: baseInfo.先天六司?.悟性 || 10,
          fortune: baseInfo.先天六司?.气运 || 10,
          charm: baseInfo.先天六司?.魅力 || 10,
          temperament: baseInfo.先天六司?.心性 || 10
        },
        'world.name': world.name || '未知世界',
        'world.description': world.description || '',
        'character.creation_time': new Date().toISOString()
      };
      await helper.insertOrAssignVariables(globalVars, { type: 'global' });
      
      // 设置聊天变量（动态数据）
      const chatVars = {
        'character.saveData': finalSaveData,
        '三千大道': createEmptyThousandDaoSystem()
      };
      await helper.insertOrAssignVariables(chatVars, { type: 'chat' });
      
      console.log('角色基础信息已保存到全局变量，游戏数据已保存到聊天变量');
    } catch (err) {
      console.warn('保存游戏数据至酒馆失败，但不影响本地游戏开始:', err);
      toast.warning('同步天机失败，部分信息可能无法在AI交互中体现。');
    }

    toast.success(`【${baseInfo.名字}】的法身铸造完成，天机已定！`);
    return finalSaveData as SaveData;

  } catch (error) {
    console.error('角色初始化失败：', error);
    toast.error('法身铸造失败，请重试');
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

/**
 * 从AI响应中提取位置信息并更新存档数据
 */
async function updateLocationFromAIResponse(
  aiResponse: any, 
  saveData: SaveData, 
  helper: any
): Promise<void> {
  try {
    console.log('[位置更新] 开始从AI响应中提取位置信息...');
    
    // 1. 从酒馆变量中获取可能的位置信息
    const allVars = await helper.getVariables({ type: 'chat' }) || {};
    
    // 检查各种可能的位置变量
    let newLocation: string | null = null;
    
    // 尝试从不同的变量中获取位置信息
    if (allVars['character.location']) {
      newLocation = String(allVars['character.location']);
      console.log('[位置更新] 从 character.location 获取到位置:', newLocation);
    } else if (allVars['player.location']) {
      newLocation = String(allVars['player.location']);
      console.log('[位置更新] 从 player.location 获取到位置:', newLocation);
    } else if (allVars['world.currentLocation']) {
      newLocation = String(allVars['world.currentLocation']);
      console.log('[位置更新] 从 world.currentLocation 获取到位置:', newLocation);
    }
    
    // 2. 如果没有从变量中获取到，尝试从AI响应文本中解析
    if (!newLocation && aiResponse.text) {
      const locationPatterns = [
        /(?:你(?:发现)?(?:自己)?(?:身处|位于|来到)(?:在)?(?:一个|一座)?)([^。，,.\n]*(?:村|镇|城|山|谷|林|洞|府|宫|寺|庙|院|楼|阁|亭|台|殿|堂|室|屋|房|店|铺|坊|市|街|巷|路|桥|河|湖|海|岛|峰|岭|崖|洞天|福地|秘境|遗迹|古迹))/,
        /(?:这里是|此处乃是|眼前是)([^。，,.\n]*)/,
        /(?:周围|四周|附近)(?:是|为)([^。，,.\n]*)/
      ];
      
      for (const pattern of locationPatterns) {
        const match = aiResponse.text.match(pattern);
        if (match && match[1]) {
          newLocation = match[1].trim();
          console.log('[位置更新] 从AI文本中解析到位置:', newLocation);
          break;
        }
      }
    }
    
    // 3. 如果还是没有找到，根据世界背景生成一个合适的默认位置
    if (!newLocation) {
      // 从世界地图数据中获取一个起始位置
      const worldMapData = allVars['world.mapData'];
      if (worldMapData && typeof worldMapData === 'object') {
        // 尝试找到一个适合的起始位置
        const locations = Object.keys(worldMapData);
        const startingLocations = locations.filter(loc => 
          loc.includes('村') || loc.includes('镇') || loc.includes('新手') || loc.includes('起始')
        );
        
        if (startingLocations.length > 0) {
          newLocation = startingLocations[0];
          console.log('[位置更新] 从地图数据中选择起始位置:', newLocation);
        } else if (locations.length > 0) {
          newLocation = locations[0];
          console.log('[位置更新] 从地图数据中选择首个位置:', newLocation);
        }
      }
    }
    
    // 4. 最后的后备方案 - 总是生成一个修仙风格的位置
    if (!newLocation || newLocation === '新手村' || newLocation === '未知之地') {
      const fallbackLocations = ['青云山下', '碧水谷中', '翠竹林间', '紫霞峰顶', '仙雾洞天', '流云村', '灵泉镇', '天音坊', '望月楼', '听风阁'];
      newLocation = fallbackLocations[Math.floor(Math.random() * fallbackLocations.length)];
      console.log('[位置更新] 使用随机修仙位置:', newLocation);
    }
    
    // 5. 更新存档数据中的位置 - 总是更新到AI生成或随机位置
    if (newLocation && newLocation !== saveData.玩家角色状态.位置.描述) {
      console.log(`[位置更新] 将位置从 "${saveData.玩家角色状态.位置.描述}" 更新为 "${newLocation}"`);
      saveData.玩家角色状态.位置.描述 = newLocation;
      console.log('[位置更新] 位置信息已更新到存档数据');
    }
    
  } catch (error) {
    console.error('[位置更新] 更新位置时发生错误:', error);
    // 不抛出错误，避免影响整个初始化流程
  }
}
