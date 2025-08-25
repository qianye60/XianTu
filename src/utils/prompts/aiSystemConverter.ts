/**
 * @fileoverview AI系统数据转换器
 * 将现有的存档数据结构转换为综合AI系统所需的格式
 */

import type { SaveData } from '../../types/game';
import type { GameCharacter, GM_Request } from '../../types/AIGameMaster';
import type { MemorySystem, LocationContext } from './comprehensiveAISystem';

/**
 * 将存档数据转换为AI系统需要的角色数据
 */
export function convertSaveDataToGameCharacter(saveData: SaveData, characterProfile?: { 角色基础信息?: any }): GameCharacter {
  const playerStatus = saveData.玩家角色状态;
  
  // 从角色档案或存档数据中获取基础信息
  const baseInfo = characterProfile?.角色基础信息 || (saveData as any).角色基础信息;
  
  if (!baseInfo || !playerStatus) {
    console.error('[AI转换器] 缺少必要的角色数据:', { baseInfo, playerStatus });
    throw new Error('缺少必要的角色数据，无法转换为AI系统格式');
  }
  
  const equipment = saveData.装备栏;
  const skills = saveData.功法技能;
  const bag = saveData.背包;

  return {
    identity: {
      name: baseInfo.名字 || '无名道友',
      title: playerStatus.声望 && playerStatus.声望 > 100 ? `${baseInfo.名字 || '无名'}真人` : undefined,
      age: playerStatus.寿命?.当前 || 18,
      apparent_age: playerStatus.寿命?.当前 || 18,
      gender: baseInfo.性别 || '男',
      description: `来自${baseInfo.世界 || '未知之地'}的修士，出身${baseInfo.出生 || '平凡'}`,
    },

    cultivation: {
      realm: playerStatus.境界?.名称 || '凡人',
      realm_progress: playerStatus.境界?.当前进度 || 0,
      lifespan_remaining: playerStatus.寿命?.当前 || 100,
      breakthrough_bottleneck: playerStatus.境界?.突破描述
    },
    attributes: {
      STR: baseInfo.先天六司?.根骨 || 10,  // 力量（根骨）
      CON: baseInfo.先天六司?.根骨 || 10,  // 体质（根骨）
      DEX: baseInfo.先天六司?.灵性 || 10,  // 身法（灵性）
      INT: baseInfo.先天六司?.悟性 || 10,  // 悟性
      SPI: baseInfo.先天六司?.心性 || 10,  // 神魂（心性）
      LUK: baseInfo.先天六司?.气运 || 10   // 气运
    },
    resources: {
      qi: {
        current: playerStatus.气血?.当前 || 100,
        max: playerStatus.气血?.最大 || 100
      },
      ling: {
        current: playerStatus.灵气?.当前 || 100,
        max: playerStatus.灵气?.最大 || 100
      },
      shen: {
        current: playerStatus.神识?.当前 || 50,
        max: playerStatus.神识?.最大 || 50
      }
    },

    qualities: {
      origin: {
        name: baseInfo.出生 || '平凡',
        effects: []
      },
      spiritRoot: {
        name: baseInfo.灵根?.名称 || '五行灵根',
        quality: baseInfo.灵根?.品质 || '下品',
        attributes: baseInfo.灵根?.属性 || ['五行']
      },
      physique: baseInfo.体质 ? {
        name: baseInfo.体质,
        effects: []
      } : undefined,
      talents: baseInfo.天赋 ? Object.entries(baseInfo.天赋).map(([name, effect]: [string, any]) => ({
        name,
        type: '天赋',
        effects: Array.isArray(effect) ? effect : [String(effect)]
      })) : []
    },

    skills: skills?.技能熟练度 ? Object.entries(skills.技能熟练度).reduce((acc, [skillName, skillData]: [string, any]) => {
      acc[skillName] = {
        level: skillData?.等级 || 1,
        rank: '入门', // 技能熟练度中没有品阶信息，使用默认值
        experience: skillData?.经验 || 0
      };
      return acc;
    }, {} as Record<string, any>) : {},

    equipment: {
      weapon: equipment?.法宝1 ? { 
        name: equipment.法宝1, 
        type: '武器',
        description: '修仙者的武器法宝'
      } : undefined,
      armor: equipment?.法宝2 ? { 
        name: equipment.法宝2, 
        type: '防具',
        description: '修仙者的防护法宝'
      } : undefined,
      accessories: [equipment?.法宝3, equipment?.法宝4, equipment?.法宝5, equipment?.法宝6].filter(Boolean).map(name => ({ 
        name: name!, 
        type: '饰品',
        description: '修仙者的辅助法宝'
      })),
      treasures: [],
      consumables: bag?.物品 ? Object.values(bag.物品).filter(item => item.类型 === '消耗品').map(item => ({
        name: item.名称 || '未知物品',
        type: item.类型 || '消耗品',
        description: item.描述 || '修仙者的消耗品'
      })) : []
    },

    cultivation_arts: {
      main_technique: skills?.主修功法 ? {
        name: skills.主修功法,
        rank: '初级',
        proficiency: skills?.技能熟练度?.[skills.主修功法]?.经验 || 0,
        special_effects: []
      } : undefined,
      combat_techniques: skills?.已学技能?.map(skillId => ({
        name: skillId,
        type: '功法',
        cost: 10,
        cooldown: 0
      })) || [],
      auxiliary_techniques: []
    },

    social: {
      faction: baseInfo.门派 || undefined,
      position: undefined,
      master: undefined,
      disciples: [],
      dao_companion: undefined,
      relationships: convertRelationshipsData(saveData.人物关系),
      reputation: { '默认': playerStatus.声望 || 0 }
    },

    hidden_state: {
      karma: {
        righteous: 0,
        demonic: 0,
        heavenly_favor: baseInfo.先天六司?.福缘 || 10
      },
      dao_heart: {
        stability: (baseInfo.先天六司?.心性 || 10) * 10,
        demons: [],
        enlightenment: 0
      },
      special_marks: []
    },

    status: {
      conditions: (playerStatus.状态效果 || []).map((effect: any) => effect.名称 || String(effect)),
      location: playerStatus.位置?.描述 || '未知位置',
      activity: (playerStatus.位置?.描述 || '').includes('修炼') ? '修炼' : '待机',
      mood: undefined
    }
  };
}

/**
 * 将存档数据转换为记忆系统格式
 */
export function convertSaveDataToMemorySystem(saveData: SaveData): MemorySystem {
  const relationships = saveData.人物关系 || {};

  return {
    short_term: [], // 短期记忆需要从对话历史获取
    mid_term: [], // 中期记忆需要从关键事件获取
    long_term: [], // 长期记忆需要从角色成长轨迹获取
    npc_interactions: Object.entries(relationships).reduce((acc, [npcName, npcData]) => {
      if (typeof npcData === 'object' && npcData !== null) {
        acc[npcName] = {
          relationship: (npcData as any)['人物关系'] || '普通',
          favor: (npcData as any)['人物好感度'] || 0,
          memories: (npcData as any)['人物记忆'] || [],
          last_interaction: (npcData as any)['最后互动时间'] || '',
          interaction_count: (npcData as any)['互动次数'] || 0
        };
      }
      return acc;
    }, {} as Record<string, any>)
  };
}

/**
 * 将存档数据转换为位置上下文格式
 */
export function convertSaveDataToLocationContext(saveData: SaveData): LocationContext {
  const playerStatus = saveData.玩家角色状态;
  const location = playerStatus?.位置;

  return {
    current_location: {
      name: location?.描述 || '未知位置',
      description: location?.描述 || '一个神秘的地方',
      coordinates: { 
        x: location?.坐标?.X || 0, 
        y: location?.坐标?.Y || 0 
      },
      type: '普通区域',
      spirit_density: 50,
      danger_level: 0,
      special_effects: []
    },
    nearby_npcs: [],
    available_actions: ['观察周围', '离开'],
    environmental_factors: ['晴朗天气']
  };
}

/**
 * 辅助函数：转换人物关系数据
 */
function convertRelationshipsData(relationshipsData: Record<string, any> | undefined): Record<string, {
  value: number;
  type: string;
  description: string;
}> {
  if (!relationshipsData || typeof relationshipsData !== 'object') {
    return {};
  }

  return Object.entries(relationshipsData).reduce((acc, [npcName, npcData]) => {
    if (typeof npcData === 'object' && npcData !== null) {
      acc[npcName] = {
        value: (npcData as any)['好感度'] || 0,
        type: (npcData as any)['关系类型'] || '普通',
        description: (npcData as any)['关系描述'] || ''
      };
    }
    return acc;
  }, {} as Record<string, { value: number; type: string; description: string }>);
}

/**
 * 将数据转换为GM请求格式
 */
export function createGMRequest(
  character: GameCharacter,
  memory: MemorySystem,
  location: LocationContext,
  userMessage: string
): GM_Request {
  return {
    character: character,
    world: {
      lorebook: '修仙世界设定',
      mapInfo: location,
      time: '未知时间'
    },
    memory: {
      short_term: memory.short_term || [],
      mid_term: memory.mid_term || [],
      long_term: memory.long_term || []
    }
  };
}