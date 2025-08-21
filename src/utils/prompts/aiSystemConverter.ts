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
export function convertSaveDataToGameCharacter(saveData: SaveData): GameCharacter {
  const playerStatus = saveData.玩家角色状态;
  const baseInfo = (saveData as any).角色基础信息;
  const equipment = saveData.装备栏;
  const skills = saveData.功法技能;
  const bag = saveData.背包;

  return {
    identity: {
      name: baseInfo.名字,
      title: playerStatus.声望 > 100 ? `${baseInfo.名字}真人` : undefined,
      age: playerStatus.寿命.当前,
      apparent_age: playerStatus.寿命.当前,
      gender: '男', // 默认值，可以从基础信息扩展
      description: `来自${baseInfo.世界}的修士，出身${baseInfo.出生}`,
    },

    cultivation: {
      realm: (typeof playerStatus.境界 === 'number' ? 
        getRealmName(playerStatus.境界) : 
        playerStatus.境界) as string,
      realm_progress: 0, // 可以从修为进度计算
      lifespan_remaining: playerStatus.寿命.最大 - playerStatus.寿命.当前,
      breakthrough_bottleneck: undefined // 可以根据境界判断
    },

    attributes: {
      STR: baseInfo.先天六司.根骨,
      CON: baseInfo.先天六司.根骨,
      DEX: baseInfo.先天六司.根骨, // 身法可能需要单独定义
      INT: baseInfo.先天六司.悟性,
      SPI: baseInfo.先天六司.灵性,
      LUK: baseInfo.先天六司.福缘
    },

    resources: {
      qi: {
        current: playerStatus.气血.当前,
        max: playerStatus.气血.最大
      },
      ling: {
        current: playerStatus.灵气.当前,
        max: playerStatus.灵气.最大
      },
      shen: {
        current: playerStatus.神识.当前,
        max: playerStatus.神识.最大
      }
    },

    qualities: {
      origin: {
        name: baseInfo.出生,
        effects: [] // 可以根据出身类型添加效果
      },
      spiritRoot: {
        name: baseInfo.灵根,
        quality: getSpiritRootQuality(baseInfo.灵根),
        attributes: getSpiritRootAttributes(baseInfo.灵根)
      },
      physique: baseInfo.天资 ? {
        name: baseInfo.天资,
        effects: []
      } : undefined,
      talents: baseInfo.天赋?.map((talent: any) => ({
        name: talent,
        type: '天赋',
        effects: []
      })) || []
    },

    skills: convertSkillsData(skills),

    cultivation_arts: {
      main_technique: skills.主修功法 ? {
        name: skills.主修功法,
        rank: '未知',
        proficiency: 0,
        special_effects: []
      } : undefined,
      combat_techniques: [],
      auxiliary_techniques: skills.已学技能 || []
    },

    equipment: convertEquipmentData(equipment, bag),

    social: {
      faction: undefined,
      position: undefined,
      master: undefined,
      disciples: [],
      dao_companion: undefined,
      relationships: convertRelationshipsData(saveData.人物关系),
      reputation: { '默认': playerStatus.声望 }
    },

    hidden_state: {
      karma: {
        righteous: 0,
        demonic: 0,
        heavenly_favor: baseInfo.先天六司.福缘
      },
      dao_heart: {
        stability: baseInfo.先天六司.心性 * 10,
        demons: [],
        enlightenment: 0
      },
      special_marks: []
    },

    status: {
      conditions: (playerStatus.状态效果 || []).map((effect: any) => effect.名称 || String(effect)),
      location: playerStatus.位置.描述,
      activity: playerStatus.位置.描述.includes('修炼') ? '修炼' : '待机',
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
    }, {} as MemorySystem['npc_interactions'])
  };
}

/**
 * 将存档数据转换为位置上下文
 */
export function convertSaveDataToLocationContext(saveData: SaveData): LocationContext {
  const playerStatus = saveData.玩家角色状态;
  const worldMap = (saveData as any).世界地图 || {};

  return {
    current_location: {
      name: playerStatus.位置.描述,
      description: playerStatus.位置.描述,
      coordinates: playerStatus.位置.坐标 ? { x: playerStatus.位置.坐标.X || 0, y: playerStatus.位置.坐标.Y || 0 } : { x: 0, y: 0 },
      type: inferLocationType(playerStatus.位置.描述),
      spirit_density: inferSpiritDensity(playerStatus.位置.描述),
      danger_level: inferDangerLevel(playerStatus.位置.描述),
      special_effects: []
    },
    nearby_npcs: getNearbyNPCs(saveData, playerStatus.位置),
    available_actions: getAvailableActions(playerStatus.位置.描述),
    environmental_factors: getEnvironmentalFactors(playerStatus.位置.描述)
  };
}

/**
 * 创建完整的GM请求对象
 */
export function createGMRequest(
  saveData: SaveData, 
  userMessage: string,
  additionalMemory?: {
    short_term?: string[];
    mid_term?: string[];
    long_term?: string[];
  }
): GM_Request {
  const character = convertSaveDataToGameCharacter(saveData);
  const memory = convertSaveDataToMemorySystem(saveData);
  
  // 合并额外的记忆
  if (additionalMemory) {
    if (additionalMemory.short_term) {
      memory.short_term.push(...additionalMemory.short_term);
    }
    if (additionalMemory.mid_term) {
      memory.mid_term.push(...additionalMemory.mid_term);
    }
    if (additionalMemory.long_term) {
      memory.long_term.push(...additionalMemory.long_term);
    }
  }

  return {
    character,
    world: {
      lorebook: '修仙世界', // 可以从世界数据获取
      mapInfo: (saveData as any).世界地图 || {},
      time: typeof saveData.游戏时间 === 'string' ? saveData.游戏时间 : (saveData.游戏时间 ? String(saveData.游戏时间) : '未知时间')
    },
    memory
  };
}

// =======================================================================
//                           辅助函数
// =======================================================================

function getRealmName(realmLevel: number): string {
  const realms = ['凡人', '炼气', '筑基', '结丹', '元婴', '化神', '合体', '大乘', '渡劫'];
  return realms[realmLevel] || '未知境界';
}

function getSpiritRootQuality(spiritRoot: string): string {
  if (spiritRoot.includes('天品')) return '天品';
  if (spiritRoot.includes('地品')) return '地品';
  if (spiritRoot.includes('人品')) return '人品';
  return '凡品';
}

function getSpiritRootAttributes(spiritRoot: string): string[] {
  const attributes = [];
  if (spiritRoot.includes('金')) attributes.push('金');
  if (spiritRoot.includes('木')) attributes.push('木');
  if (spiritRoot.includes('水')) attributes.push('水');
  if (spiritRoot.includes('火')) attributes.push('火');
  if (spiritRoot.includes('土')) attributes.push('土');
  if (spiritRoot.includes('风')) attributes.push('风');
  if (spiritRoot.includes('雷')) attributes.push('雷');
  if (spiritRoot.includes('冰')) attributes.push('冰');
  return attributes;
}

function convertSkillsData(skills: any): { [key: string]: { level: number; rank: string; [key: string]: any } } {
  if (!skills || !skills.技能熟练度) return {};
  
  return Object.entries(skills.技能熟练度).reduce((acc, [skillId, skillData]) => {
    if (typeof skillData === 'object' && skillData !== null) {
      acc[skillId] = {
        level: (skillData as any)['等级'] || 1,
        rank: getRankFromLevel((skillData as any)['等级'] || 1),
        experience: (skillData as any)['经验'] || 0
      };
    }
    return acc;
  }, {} as any);
}

function getRankFromLevel(level: number): string {
  if (level >= 10) return '宗师';
  if (level >= 8) return '大师';
  if (level >= 6) return '专家';
  if (level >= 4) return '熟练';
  if (level >= 2) return '入门';
  return '初学';
}

function convertEquipmentData(equipment: any, bag: any): any {
  const result = {
    weapon: null,
    armor: null,
    accessories: [],
    treasures: [],
    consumables: []
  };

  if (!equipment || !bag) return result;

  // 转换装备栏物品
  Object.entries(equipment as any).forEach(([slot, itemId]) => {
    if (itemId && bag.物品 && (bag.物品 as any)[itemId]) {
      const item = (bag.物品 as any)[itemId];
      if ((item as any).类型 === '法宝' && slot === '武器') {
        result.weapon = item;
      } else if ((item as any).类型 === '防具') {
        result.armor = item;
      }
    }
  });

  // 添加消耗品
  if (bag.物品) {
    Object.values(bag.物品).forEach((item: any) => {
      if ((item as any).类型 === '丹药' || (item as any).类型 === '消耗品') {
        (result.consumables as any[]).push(item);
      }
    });
  }

  return result;
}

function convertRelationshipsData(relationships: any): Record<string, { value: number; type: string }> {
  if (!relationships) return {};
  
  return Object.entries(relationships).reduce((acc, [npcName, npcData]) => {
    if (typeof npcData === 'object' && npcData !== null) {
      acc[npcName] = {
        value: (npcData as any)['人物好感度'] || 0,
        type: (npcData as any)['人物关系'] || '普通'
      };
    }
    return acc;
  }, {} as any);
}

function inferLocationType(locationDesc: string): string {
  if (locationDesc.includes('宗门') || locationDesc.includes('门派')) return '宗门';
  if (locationDesc.includes('城') || locationDesc.includes('镇')) return '城镇';
  if (locationDesc.includes('山') || locationDesc.includes('林')) return '野外';
  if (locationDesc.includes('洞府') || locationDesc.includes('洞穴')) return '洞府';
  return '未知';
}

function inferSpiritDensity(locationDesc: string): number {
  if (locationDesc.includes('圣地') || locationDesc.includes('仙境')) return 9;
  if (locationDesc.includes('宗门') || locationDesc.includes('灵地')) return 7;
  if (locationDesc.includes('山脉') || locationDesc.includes('森林')) return 5;
  if (locationDesc.includes('城镇') || locationDesc.includes('集市')) return 3;
  return 2;
}

function inferDangerLevel(locationDesc: string): number {
  if (locationDesc.includes('魔域') || locationDesc.includes('禁地')) return 9;
  if (locationDesc.includes('深山') || locationDesc.includes('古迹')) return 6;
  if (locationDesc.includes('野外') || locationDesc.includes('荒郊')) return 4;
  if (locationDesc.includes('城镇') || locationDesc.includes('宗门')) return 2;
  return 1;
}

function getNearbyNPCs(saveData: SaveData, location: any): string[] {
  const relationships = saveData.人物关系 || {};
  const currentLocation = location.描述;
  
  return Object.entries(relationships)
    .filter(([_, npcData]: [string, any]) => {
      return npcData?.角色存档信息?.位置?.描述?.includes(currentLocation.split(' ')[0]);
    })
    .map(([npcName, _]) => npcName);
}

function getAvailableActions(locationDesc: string): string[] {
  const actions = ['观察周围', '休息'];
  
  if (locationDesc.includes('宗门')) {
    actions.push('拜访长辈', '修炼功法', '查看任务');
  }
  if (locationDesc.includes('城镇')) {
    actions.push('逛街购物', '打听消息', '寻找客栈');
  }
  if (locationDesc.includes('野外')) {
    actions.push('探索', '采集', '寻找机缘');
  }
  if (locationDesc.includes('洞府')) {
    actions.push('深入探索', '寻找宝物', '修炼');
  }
  
  return actions;
}

function getEnvironmentalFactors(locationDesc: string): string[] {
  const factors = [];
  
  if (locationDesc.includes('夜晚')) factors.push('视线受限');
  if (locationDesc.includes('雨')) factors.push('道路泥泞');
  if (locationDesc.includes('雾')) factors.push('能见度低');
  if (locationDesc.includes('寒冷')) factors.push('消耗体力');
  if (locationDesc.includes('炎热')) factors.push('口渴加剧');
  
  return factors;
}