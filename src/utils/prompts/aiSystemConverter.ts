/**
 * @fileoverview AI系统数据转换器
 * 将现有的存档数据结构转换为AI系统所需的格式
 */

import type { SaveData, CharacterBaseInfo, Item, NpcProfile, StatusEffect, Realm, EquipmentItem, ConsumableItem, TechniqueItem } from '../../types/game';
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

  if (!baseInfo || !playerStatus) {
    console.error('[AI转换器] 缺少必要的角色数据:', { baseInfo, playerStatus });
    throw new Error('缺少必要的角色数据，无法转换为AI系统格式');
  }

  const equipmentSlots = saveData.装备栏;
  const cultivationArts = saveData.修炼功法;
  const inventory = saveData.背包;

  const getRealmName = (realm: Realm): string => {
    return realm.名称;
  };

  const getQi = (value: { 当前: number; 最大: number }): { current: number; max: number } => {
    return { current: value.当前, max: value.最大 };
  };

  const findItemById = (itemId: string | null): Item | undefined => {
    if (!itemId) return undefined;
    return inventory.物品.find(i => i.物品ID === itemId);
  };

  const equippedItems = Object.values(equipmentSlots)
    .map(itemId => findItemById(itemId))
    .filter((item): item is Item => !!item);

  return {
    identity: {
      name: baseInfo.名字 || '无名道友',
      title: playerStatus.声望 > 100 ? `${baseInfo.名字 || '无名'}真人` : undefined,
      age: baseInfo.年龄 ?? 16,
      apparent_age: baseInfo.年龄 ?? 16,
      gender: baseInfo.性别,
      description: `来自${baseInfo.世界 || '未知之地'}的${baseInfo.种族 || '人族'}修士，出身${typeof baseInfo.出生 === 'string' ? baseInfo.出生 : baseInfo.出生.名称}`,
    },

    cultivation: {
      realm: getRealmName(playerStatus.境界),
      realm_progress: playerStatus.修为.当前,
      lifespan_remaining: playerStatus.寿命.最大 - playerStatus.寿命.当前,
      breakthrough_bottleneck: playerStatus.境界.突破描述,
    },
    attributes: {
      STR: baseInfo.先天六司.根骨,
      CON: baseInfo.先天六司.灵性,
      DEX: baseInfo.先天六司.悟性,
      INT: baseInfo.先天六司.心性,
      SPI: baseInfo.先天六司.魅力,
      LUK: baseInfo.先天六司.气运,
    },
    resources: {
      qi: getQi(playerStatus.气血),
      ling: getQi(playerStatus.灵气),
      shen: getQi(playerStatus.神识),
    },

    qualities: {
      origin: {
        name: typeof baseInfo.出生 === 'string' ? baseInfo.出生 : baseInfo.出生.名称,
        effects: typeof baseInfo.出生 === 'object' ? [baseInfo.出生.描述] : [],
      },
      spiritRoot: {
        name: typeof baseInfo.灵根 === 'string' ? baseInfo.灵根 : baseInfo.灵根.名称,
        quality: typeof baseInfo.灵根 === 'object' ? baseInfo.灵根.品级 : '凡品',
        attributes: typeof baseInfo.灵根 === 'object' ? baseInfo.灵根.special_effects || [] : [],
      },
      physique: undefined,
      talents: baseInfo.天赋.map((talent) => ({
        name: typeof talent === 'string' ? talent : talent.名称,
        type: '天赋',
        effects: typeof talent === 'string' ? [talent] : [talent.描述],
      })),
    },

    skills: cultivationArts?.已解锁技能?.reduce((acc: Record<string, { level: number; rank: string; experience: number }>, skillName: string) => {
      acc[skillName] = { level: 1, rank: '入门', experience: 0 };
      return acc;
    }, {}) || {},

    equipment: {
      weapon: equippedItems.find(i => i.类型 === '装备' && (i as EquipmentItem)) as unknown as undefined, // Simplified
      armor: equippedItems.find(i => i.类型 === '装备' && (i as EquipmentItem)) as unknown as undefined, // Simplified
      accessories: equippedItems.filter(i => i.类型 === '装备').map(item => ({
        name: item.名称,
        type: '饰品',
        description: item.描述,
      })),
      treasures: [],
      consumables: inventory.物品.filter((item): item is ConsumableItem => item.类型 === '其他').map(item => ({
        name: item.名称,
        type: item.类型,
        description: item.描述,
      })),
    },

    cultivation_arts: {
      main_technique: (() => {
        const techniqueId = typeof cultivationArts.功法 === 'string' ? cultivationArts.功法 : cultivationArts.功法?.物品ID;
        const technique = findItemById(techniqueId || null) as TechniqueItem | undefined;
        if (!technique) return undefined;
        return {
          name: technique.名称,
          rank: `${technique.品质.quality}${technique.品质.grade}品`,
          proficiency: cultivationArts.熟练度,
          special_effects: Object.values(technique.功法技能 || {}).map(s => s.技能描述),
        };
      })(),
      combat_techniques: cultivationArts?.已解锁技能?.map((skillName: string) => ({
        name: skillName,
        type: '功法技能',
        cost: 10,
        cooldown: 0,
      })) || [],
      auxiliary_techniques: [],
    },

    social: {
      faction: playerStatus.宗门信息?.sectName,
      position: playerStatus.宗门信息?.position,
      master: playerStatus.宗门信息?.师父,
      disciples: [],
      dao_companion: undefined,
      relationships: convertRelationshipsData(saveData.人物关系),
      reputation: { [playerStatus.宗门信息?.sectName || '江湖']: playerStatus.声望 },
    },

    hidden_state: {
      karma: {
        righteous: 0,
        demonic: 0,
        heavenly_favor: baseInfo.先天六司.气运,
      },
      dao_heart: {
        stability: (baseInfo.先天六司?.心性 || 10) * 10,
        demons: [],
        enlightenment: 0,
      },
      special_marks: [],
    },

    status: {
      conditions: (playerStatus.状态效果 || []).map((effect: StatusEffect) => effect.状态名称),
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
          relationship: npcData.人物关系,
          favor: npcData.人物好感度,
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
function convertRelationshipsData(relationshipsData: Record<string, NpcProfile> | undefined): Record<string, {
  value: number;
  type: string;
  description: string;
}> {
  if (!relationshipsData) {
    return {};
  }

  return Object.entries(relationshipsData).reduce<Record<string, { value: number; type: string; description: string }>>((acc, [npcName, npcData]) => {
    acc[npcName] = {
      value: npcData.人物好感度,
      type: npcData.人物关系,
      description: npcData.人物关系,
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