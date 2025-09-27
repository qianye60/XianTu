/**
 * @fileoverview AI系统数据转换器
 * 将现有的存档数据结构转换为AI系统所需的格式
 */

import type { SaveData, CharacterBaseInfo, Item, NpcProfile, StatusEffect, Realm } from '../../types/game';
import type { GameCharacter, GM_Request } from '../../types/AIGameMaster';

/**
 * 记忆系统接口
 */
export interface MemorySystem {
  short_term: string[];
  mid_term: string[];
  long_term: string[];
  npc_interactions: {
    [npcName: string]: {
      relationship: string;
      favor: number;
      memories: string[];
      last_interaction: string;
      interaction_count: number;
    };
  };
}

/**
 * 位置信息系统
 */
export interface LocationContext {
  current_location: {
    name: string;
    description: string;
    type: string;
    spirit_density: number;
    danger_level: number;
    special_effects?: string[];
  };
  nearby_npcs?: string[];
  available_actions?: string[];
  environmental_factors?: string[];
}

/**
 * 将存档数据转换为AI系统需要的角色数据
 */
export function convertSaveDataToGameCharacter(saveData: SaveData, characterProfile?: { 角色基础信息?: CharacterBaseInfo }): GameCharacter {
  const playerStatus = saveData.玩家角色状态;
  const baseInfo = characterProfile?.角色基础信息 || saveData.角色基础信息;
  const charAttributes = saveData.角色属性;

  if (!baseInfo || !playerStatus || !charAttributes) {
    console.error('[AI转换器] 缺少必要的角色数据:', { baseInfo, playerStatus, charAttributes });
    throw new Error('缺少必要的角色数据，无法转换为AI系统格式');
  }

  const equipment = saveData.装备栏;
  const cultivationArts = saveData.修炼功法;
  const bag = saveData.背包;

  const getRealmName = (realm: string | Realm): string => {
    return typeof realm === 'string' ? realm : realm.名称;
  };

  const getQi = (value: number | { 当前: number; 最大: number }): { current: number; max: number } => {
    if (typeof value === 'number') return { current: value, max: value };
    return { current: value.当前, max: value.最大 };
  };

  return {
    identity: {
      name: baseInfo.名字 || '无名道友',
      title: typeof playerStatus.声望 === 'number' && playerStatus.声望 > 100 ? `${baseInfo.名字 || '无名'}真人` : undefined,
      age: baseInfo.年龄,
      apparent_age: baseInfo.年龄,
      gender: baseInfo.性别,
      description: `来自${baseInfo.世界 || '未知之地'}的${baseInfo.种族}修士，出身${typeof baseInfo.出生 === 'string' ? baseInfo.出生 : baseInfo.出生.名称}`,
    },

    cultivation: {
      realm: getRealmName(charAttributes.境界),
      realm_progress: typeof charAttributes.修为 === 'number' ? charAttributes.修为 : charAttributes.修为.当前,
      lifespan_remaining: baseInfo.年龄, // 简化处理
      breakthrough_bottleneck: typeof charAttributes.境界 === 'object' ? charAttributes.境界.突破描述 : undefined,
    },
    attributes: {
      STR: charAttributes.基础属性.力量,
      CON: charAttributes.基础属性.体质,
      DEX: charAttributes.基础属性.敏捷,
      INT: charAttributes.基础属性.智力,
      SPI: charAttributes.扩展属性.神识,
      LUK: charAttributes.扩展属性.气运,
    },
    resources: {
      qi: getQi(playerStatus.生命值),
      ling: getQi(playerStatus.灵力值),
      shen: {
        current: playerStatus.神识?.当前 || 50,
        max: playerStatus.神识?.最大 || 50,
      },
    },

    qualities: {
      origin: {
        name: typeof baseInfo.出生 === 'string' ? baseInfo.出生 : baseInfo.出生.名称,
        effects: [],
      },
      spiritRoot: {
        name: typeof baseInfo.灵根 === 'string' ? baseInfo.灵根 : baseInfo.灵根.名称,
        quality: typeof baseInfo.灵根 === 'object' ? baseInfo.灵根.品质 : '凡品',
        attributes: [],
      },
      physique: undefined,
      talents: baseInfo.天赋.map((talent) => ({
        name: typeof talent === 'string' ? talent : talent.名称,
        type: '天赋',
        effects: typeof talent === 'string' ? [talent] : [talent.描述],
      })),
    },

    skills: cultivationArts?.已解锁技能?.reduce((acc: Record<string, any>, skillName: string) => {
      acc[skillName] = { level: 1, rank: '入门', experience: 0 };
      return acc;
    }, {}) || {},

    equipment: {
      weapon: equipment?.装备1 ? { name: equipment.装备1.名称, type: '武器', description: equipment.装备1.描述 } : undefined,
      armor: equipment?.装备2 ? { name: equipment.装备2.名称, type: '防具', description: equipment.装备2.描述 } : undefined,
      accessories: [equipment?.装备3, equipment?.装备4, equipment?.装备5, equipment?.装备6].filter((item): item is Item => !!item).map(item => ({
        name: item.名称,
        type: '饰品',
        description: item.描述,
      })),
      treasures: [],
      consumables: Object.values(bag.物品).filter(item => item.类型 === '消耗品').map(item => ({
        name: item.名称,
        type: item.类型,
        description: item.描述,
      })),
    },

    cultivation_arts: {
      main_technique: cultivationArts?.功法 ? {
        name: cultivationArts.功法.名称,
        rank: typeof cultivationArts.功法.品质 === 'string' ? cultivationArts.功法.品质 : cultivationArts.功法.品质.quality,
        proficiency: cultivationArts.熟练度,
        special_effects: cultivationArts.功法.装备特效 || [],
      } : undefined,
      combat_techniques: cultivationArts?.已解锁技能?.map((skillName: string) => ({
        name: skillName,
        type: '功法技能',
        cost: 10,
        cooldown: 0,
      })) || [],
      auxiliary_techniques: [],
    },

    social: {
      faction: undefined,
      position: undefined,
      master: undefined,
      disciples: [],
      dao_companion: undefined,
      relationships: convertRelationshipsData(saveData.人际关系),
      reputation: { '默认': typeof playerStatus.声望 === 'number' ? playerStatus.声望 : (playerStatus.声望.江湖声望 + playerStatus.声望.宗门声望) },
    },

    hidden_state: {
      karma: {
        righteous: 0,
        demonic: 0,
        heavenly_favor: charAttributes.扩展属性.气运,
      },
      dao_heart: {
        stability: (baseInfo.先天六司?.心性 || 10) * 10,
        demons: [],
        enlightenment: 0,
      },
      special_marks: [],
    },

    status: {
      conditions: (playerStatus.状态 || []).map((effect: StatusEffect | string) => typeof effect === 'string' ? effect : effect.名称),
      location: playerStatus.位置?.描述 || '未知位置',
      activity: (playerStatus.位置?.描述 || '').includes('修炼') ? '修炼' : '待机',
      mood: undefined,
    },
  };
}

/**
 * 将存档数据转换为记忆系统格式
 */
export function convertSaveDataToMemorySystem(saveData: SaveData): MemorySystem {
  const relationships = saveData.人物关系 || {};

  return {
    short_term: saveData.记忆.短期记忆,
    mid_term: saveData.记忆.中期记忆,
    long_term: saveData.记忆.长期记忆,
    npc_interactions: Object.entries(relationships).reduce((acc, [npcName, npcData]) => {
      if (typeof npcData === 'object' && npcData !== null) {
        acc[npcName] = {
          relationship: npcData.关系,
          favor: npcData.好感度,
          memories: [], // 简化处理
          last_interaction: '',
          interaction_count: 0,
        };
      }
      return acc;
    }, {} as Record<string, {
      relationship: string;
      favor: number;
      memories: string[];
      last_interaction: string;
      interaction_count: number;
    }>),
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
      type: '普通区域',
      spirit_density: 50,
      danger_level: 0,
      special_effects: [],
    },
    nearby_npcs: [],
    available_actions: ['观察周围', '离开'],
    environmental_factors: ['晴朗天气'],
  };
}

/**
 * 辅助函数：转换人物关系数据
 */
function convertRelationshipsData(relationshipsData: Record<string, NPC> | undefined): Record<string, {
  value: number;
  type: string;
  description: string;
}> {
  if (!relationshipsData) {
    return {};
  }

  return Object.entries(relationshipsData).reduce<Record<string, { value: number; type: string; description: string }>>((acc, [npcName, npcData]) => {
    acc[npcName] = {
      value: npcData.好感度,
      type: npcData.关系,
      description: npcData.关系,
    };
    return acc;
  }, {});
}

/**
 * 将数据转换为GM请求格式
 */
export function createGMRequest(
  character: GameCharacter,
  memory: MemorySystem,
  location: LocationContext
): GM_Request {
  return {
    character: character,
    world: {
      lorebook: '修仙世界设定',
      mapInfo: location,
      time: '未知时间',
    },
    memory: {
      short_term: memory.short_term,
      mid_term: memory.mid_term,
      long_term: memory.long_term,
    },
  };
}
