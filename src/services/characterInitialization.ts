/**
 * @fileoverview 角色初始化服务
 * 负责角色创建完成后的全套初始化流程，并集成AI动态生成。
 */

import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, SaveData, PlayerStatus, TalentProgress } from '@/types/game';
import type { CharacterData, World } from '@/types';
import { generateInitialMessage, generateMapFromWorld } from '@/utils/tavernAI';
import { processGmResponse } from '@/utils/AIGameMaster';

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
      描述: "未知之地",
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

    // 2. 创建基础存档结构
    const saveData: SaveData = {
      玩家角色状态: playerStatus,
      装备栏: { 法宝1: null, 法宝2: null, 法宝3: null, 法宝4: null, 法宝5: null, 法宝6: null },
      功法技能: {
        主修功法: null,
        已学技能: [],
        技能熟练度: {},
        天赋进度: initializeTalentProgress(baseInfo.天赋)
      },
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

    const initialMessageResponse = await generateInitialMessage(initialGameDataForAI, worldMap);

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
    toast.success('命运轨迹已定！');

    // 5.5 检查AI是否生成了具体的随机灵根和随机出身，并更新到baseInfo
    const postAIVars = await helper.getVariables({ type: 'chat' }) || {};
    
    // 更新随机生成的出身
    if (baseInfo.出生 === '随机出身' && postAIVars['character.origin.name']) {
      const generatedOrigin = String(postAIVars['character.origin.name']);
      console.log(`[角色初始化] 检测到AI生成的出身: ${generatedOrigin}`);
      baseInfo.出生 = generatedOrigin;
      toast.info(`出身已确定：${baseInfo.出生}`);
    }
    
    // 更新随机生成的灵根
    if (baseInfo.灵根 === '随机灵根' && postAIVars['character.spiritRoot.name']) {
      const generatedSpiritRoot = String(postAIVars['character.spiritRoot.name']);
      console.log(`[角色初始化] 检测到AI生成的灵根: ${generatedSpiritRoot}`);
      baseInfo.灵根 = generatedSpiritRoot;
      toast.info(`灵根已确定：${baseInfo.灵根}`);
    }

    // ================= 数据整合与持久化 =================

    // 6. 从酒馆变量中取回被AI修改后的最新数据
    const finalVars = await helper.getVariables({ type: 'chat' }) || {};
    const finalSaveData = finalVars.DAD_SaveData || saveData; // 获取可能被AI修改的存档
    const finalWorldMap = finalVars['world.mapData'] || worldMap;

    // 7. 优化数据结构并统一存储
    const DAD_GameData = {
      characterInfo: baseInfo, // 使用更新后的baseInfo（包含AI生成的具体出身和灵根）
      saveData: finalSaveData,
      worldMap: finalWorldMap,
      version: '1.0.0'
    };

    toast.info(`正在为【${baseInfo.名字}】铸造法身并同步天机...`);
    try {
      await helper.insertOrAssignVariables({
        'DAD_GameData': DAD_GameData,
        'character.name': baseInfo.名字,
        'world.name': world.name || '未知世界'
      }, { type: 'chat' });
      console.log('角色及游戏数据已通过统一结构保存到酒馆变量系统');
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
