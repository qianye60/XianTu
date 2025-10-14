/**
 * @fileoverview 数据修复和清洗工具
 * 当AI返回的数据有问题时，自动修复和清洗，防止前端崩溃
 */

import type { SaveData, Item, NpcProfile, GameTime, Realm } from '@/types/game';
import type { GradeType } from '@/data/itemQuality';
import { cloneDeep } from 'lodash';

/**
 * 修复并清洗存档数据，确保所有必需字段存在且格式正确
 */
export function repairSaveData(saveData: SaveData | null | undefined): SaveData {
  console.log('[数据修复] 开始修复存档数据');

  if (!saveData || typeof saveData !== 'object') {
    console.error('[数据修复] ❌ 存档数据为空或无效，创建默认存档');
    return createMinimalSaveData();
  }

  const repaired = cloneDeep(saveData);

  // 1. 修复角色基础信息
  if (!repaired.角色基础信息 || typeof repaired.角色基础信息 !== 'object') {
    console.warn('[数据修复] 角色基础信息缺失，创建默认值');
    repaired.角色基础信息 = {
      名字: '无名修士',
      性别: '男',
      世界: '朝天大陆',
      天资: '凡人',
      出生: '散修',
      灵根: '五行杂灵根',
      天赋: [],
      先天六司: { 根骨: 5, 灵性: 5, 悟性: 5, 气运: 5, 魅力: 5, 心性: 5 },
      后天六司: { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 }
    };
  } else {
    // 确保必需字段存在
    repaired.角色基础信息.名字 = repaired.角色基础信息.名字 || '无名修士';
    repaired.角色基础信息.性别 = repaired.角色基础信息.性别 || '男';
    repaired.角色基础信息.世界 = repaired.角色基础信息.世界 || '朝天大陆';

    // 修复先天六司
    if (!repaired.角色基础信息.先天六司 || typeof repaired.角色基础信息.先天六司 !== 'object') {
      repaired.角色基础信息.先天六司 = { 根骨: 5, 灵性: 5, 悟性: 5, 气运: 5, 魅力: 5, 心性: 5 };
    } else {
      const attrs = repaired.角色基础信息.先天六司;
      attrs.根骨 = validateNumber(attrs.根骨, 0, 10, 5);
      attrs.灵性 = validateNumber(attrs.灵性, 0, 10, 5);
      attrs.悟性 = validateNumber(attrs.悟性, 0, 10, 5);
      attrs.气运 = validateNumber(attrs.气运, 0, 10, 5);
      attrs.魅力 = validateNumber(attrs.魅力, 0, 10, 5);
      attrs.心性 = validateNumber(attrs.心性, 0, 10, 5);
    }

    // 修复后天六司
    if (!repaired.角色基础信息.后天六司 || typeof repaired.角色基础信息.后天六司 !== 'object') {
      repaired.角色基础信息.后天六司 = { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 };
    }
  }

  // 2. 修复玩家角色状态
  if (!repaired.玩家角色状态 || typeof repaired.玩家角色状态 !== 'object') {
    console.warn('[数据修复] 玩家角色状态缺失，创建默认值');
    repaired.玩家角色状态 = createDefaultPlayerStatus();
  } else {
    // 修复境界
    repaired.玩家角色状态.境界 = repairRealm(repaired.玩家角色状态.境界);

    // 修复属性
    repaired.玩家角色状态.气血 = repairValuePair(repaired.玩家角色状态.气血, 100, 100);
    repaired.玩家角色状态.灵气 = repairValuePair(repaired.玩家角色状态.灵气, 50, 50);
    repaired.玩家角色状态.神识 = repairValuePair(repaired.玩家角色状态.神识, 30, 30);
    repaired.玩家角色状态.寿命 = repairValuePair(repaired.玩家角色状态.寿命, 18, 80);

    // 修复位置
    if (!repaired.玩家角色状态.位置 || typeof repaired.玩家角色状态.位置 !== 'object') {
      repaired.玩家角色状态.位置 = { 描述: '朝天大陆·无名之地' };
    } else if (!repaired.玩家角色状态.位置.描述) {
      repaired.玩家角色状态.位置.描述 = '朝天大陆·无名之地';
    }

    // 修复状态效果
    if (!Array.isArray(repaired.玩家角色状态.状态效果)) {
      repaired.玩家角色状态.状态效果 = [];
    }

    // 修复声望
    repaired.玩家角色状态.声望 = validateNumber(repaired.玩家角色状态.声望, 0, 999999, 0);
  }

  // 3. 修复装备栏
  if (!repaired.装备栏 || typeof repaired.装备栏 !== 'object') {
    repaired.装备栏 = { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null };
  }

  // 4. 修复背包
  if (!repaired.背包 || typeof repaired.背包 !== 'object') {
    repaired.背包 = {
      灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
      物品: {}
    };
  } else {
    // 修复灵石
    if (!repaired.背包.灵石 || typeof repaired.背包.灵石 !== 'object') {
      repaired.背包.灵石 = { 下品: 0, 中品: 0, 上品: 0, 极品: 0 };
    } else {
      repaired.背包.灵石.下品 = validateNumber(repaired.背包.灵石.下品, 0, 999999999, 0);
      repaired.背包.灵石.中品 = validateNumber(repaired.背包.灵石.中品, 0, 999999999, 0);
      repaired.背包.灵石.上品 = validateNumber(repaired.背包.灵石.上品, 0, 999999999, 0);
      repaired.背包.灵石.极品 = validateNumber(repaired.背包.灵石.极品, 0, 999999999, 0);
    }

    // 修复物品
    if (!repaired.背包.物品 || typeof repaired.背包.物品 !== 'object') {
      repaired.背包.物品 = {};
    } else {
      // 清理无效物品
      const validItems: Record<string, Item> = {};
      for (const [id, item] of Object.entries(repaired.背包.物品)) {
        if (item && typeof item === 'object' && item.名称) {
          validItems[id] = repairItem(item as Item);
        }
      }
      repaired.背包.物品 = validItems;
    }
  }

  // 5. 修复人物关系
  if (!repaired.人物关系 || typeof repaired.人物关系 !== 'object') {
    repaired.人物关系 = {};
  } else {
    // 清理无效NPC
    const validNpcs: Record<string, NpcProfile> = {};
    for (const [name, npc] of Object.entries(repaired.人物关系)) {
      if (npc && typeof npc === 'object' && (npc as any).名字) {
        validNpcs[name] = repairNpc(npc as NpcProfile);
      }
    }
    repaired.人物关系 = validNpcs;
  }

  // 6. 修复记忆
  if (!repaired.记忆 || typeof repaired.记忆 !== 'object') {
    repaired.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
  } else {
    repaired.记忆.短期记忆 = Array.isArray(repaired.记忆.短期记忆) ? repaired.记忆.短期记忆 : [];
    repaired.记忆.中期记忆 = Array.isArray(repaired.记忆.中期记忆) ? repaired.记忆.中期记忆 : [];
    repaired.记忆.长期记忆 = Array.isArray(repaired.记忆.长期记忆) ? repaired.记忆.长期记忆 : [];
  }

  // 7. 修复游戏时间
  repaired.游戏时间 = repairGameTime(repaired.游戏时间);

  // 8. 修复三千大道
  if (!repaired.三千大道 || typeof repaired.三千大道 !== 'object' || !repaired.三千大道.大道列表) {
    repaired.三千大道 = { 大道列表: {} };
  }

  // 9. 修复修炼功法
  if (repaired.修炼功法 && typeof repaired.修炼功法 === 'object') {
    // 功法存在时，确保必需字段
    const technique = repaired.修炼功法 as any;
    if (!technique.名称 || !technique.物品ID) {
      console.warn('[数据修复] 修炼功法数据不完整，清空');
      repaired.修炼功法 = null;
    }
  }

  // 10. 修复掌握技能
  if (!Array.isArray(repaired.掌握技能)) {
    repaired.掌握技能 = [];
  }

  // 11. 修复宗门系统
  if (!repaired.宗门系统 || typeof repaired.宗门系统 !== 'object') {
    repaired.宗门系统 = {
      availableSects: [],
      sectRelationships: {},
      sectHistory: []
    };
  }

  console.log('[数据修复] ✅ 存档数据修复完成');
  return repaired;
}

/**
 * 根据境界和阶段生成修仙小说风格的突破描述
 */
function getDefaultBreakthroughDescription(realmName?: string, stage?: string): string {
  const name = realmName || '凡人';
  const currentStage = stage || '';

  // 凡人境界
  if (name === '凡人') {
    return '引气入体，感悟天地灵气，踏上修仙第一步';
  }

  // 定义各境界的突破描述
  const realmDescriptions: Record<string, Record<string, string>> = {
    '练气': {
      '初期': '凝聚丹田灵气，打通任督二脉，冲击练气中期',
      '中期': '拓宽经脉，提升灵气容量，冲击练气后期',
      '后期': '凝实根基，感悟天地法则，冲击练气圆满',
      '圆满': '灵气贯通周天，凝练灵根本源，准备筑基',
      '': '搬运周天，凝聚灵气，夯实练气根基'
    },
    '筑基': {
      '初期': '凝聚道台，将灵气压缩凝实，冲击筑基中期',
      '中期': '稳固道基，扩充丹田容量，冲击筑基后期',
      '后期': '感悟天地法则，凝练金丹雏形，冲击筑基圆满',
      '圆满': '道基圆满，破而后立，将灵气凝聚成金丹',
      '': '夯实道基，压缩灵气，提升筑基境界'
    },
    '金丹': {
      '初期': '凝实金丹，刻画符文，冲击金丹中期',
      '中期': '淬炼金丹，领悟道韵，冲击金丹后期',
      '后期': '金丹大成，蕴养元神，冲击金丹圆满',
      '圆满': '破丹成婴，元神出窍，踏入元婴境界',
      '': '淬炼金丹本源，刻画天地符文，提升金丹品质'
    },
    '元婴': {
      '初期': '稳固元婴，凝练神魂，冲击元婴中期',
      '中期': '元婴壮大，感悟大道，冲击元婴后期',
      '后期': '元婴大成，凝练元神，冲击元婴圆满',
      '圆满': '元神蜕变，肉身成圣，准备化神',
      '': '壮大元婴，淬炼神魂，提升元婴境界'
    },
    '化神': {
      '初期': '神魂合一，领悟法则，冲击化神中期',
      '中期': '凝聚神格，参悟天道，冲击化神后期',
      '后期': '神格大成，融合法则，冲击化神圆满',
      '圆满': '炼虚合道，肉身不灭，准备突破炼虚',
      '': '感悟大道法则，凝练神格，提升化神境界'
    },
    '炼虚': {
      '初期': '炼虚化实，虚空凝形，冲击炼虚中期',
      '中期': '虚实合一，参悟空间法则，冲击炼虚后期',
      '后期': '撕裂虚空，掌控空间，冲击炼虚圆满',
      '圆满': '虚空大成，与天地合一，准备渡劫',
      '': '炼化虚空之力，感悟空间奥义，提升炼虚境界'
    },
    '合体': {
      '初期': '天人合一，与天地共鸣，冲击合体中期',
      '中期': '领悟天道，掌控天地之力，冲击合体后期',
      '后期': '天地认可，法则加身，冲击合体圆满',
      '圆满': '与道合真，天劫将至，准备渡劫飞升',
      '': '感悟天地大道，与天地共鸣，提升合体境界'
    },
    '大乘': {
      '初期': '大道圆满，法则入体，冲击大乘中期',
      '中期': '天道认可，参悟仙道，冲击大乘后期',
      '后期': '仙韵初现，准备渡劫，冲击大乘圆满',
      '圆满': '渡九九天劫，飞升仙界，超脱凡尘',
      '': '感悟仙道奥义，凝练仙体，准备飞升'
    }
  };

  // 获取对应境界的描述
  const stageDescriptions = realmDescriptions[name];
  if (stageDescriptions) {
    return stageDescriptions[currentStage] || stageDescriptions[''] || `感悟${name}境界奥义，提升修为境界`;
  }

  // 未知境界的通用描述
  const genericDescriptions: Record<string, string> = {
    '初期': `凝练${name}初期根基，冲击${name}中期`,
    '中期': `稳固${name}中期修为，冲击${name}后期`,
    '后期': `圆满${name}后期境界，冲击${name}圆满`,
    '圆满': `${name}圆满大成，准备突破下一境界`,
    '': `感悟${name}境界奥义，提升修为`
  };

  return genericDescriptions[currentStage] || `感悟${name}境界，提升修为`;
}

/**
 * 修复境界数据
 */
function repairRealm(realm: any): Realm {
  if (!realm || typeof realm !== 'object') {
    return {
      名称: '凡人',
      阶段: '',
      当前进度: 0,
      下一级所需: 100,
      突破描述: '引气入体，感悟天地灵气，踏上修仙第一步'
    };
  }

  const name = realm.名称 || '凡人';
  const stage = realm.阶段 || '';

  return {
    名称: name,
    阶段: stage,
    当前进度: validateNumber(realm.当前进度, 0, 999999999, 0),
    下一级所需: validateNumber(realm.下一级所需, 1, 999999999, 100),
    突破描述: realm.突破描述 || getDefaultBreakthroughDescription(name, stage)
  };
}

/**
 * 修复ValuePair数据
 */
function repairValuePair(pair: any, defaultCurrent: number, defaultMax: number): { 当前: number; 上限: number } {
  if (!pair || typeof pair !== 'object') {
    return { 当前: defaultCurrent, 上限: defaultMax };
  }

  const current = validateNumber(pair.当前, 0, 999999999, defaultCurrent);
  const max = validateNumber(pair.上限, 1, 999999999, defaultMax);

  return {
    当前: Math.min(current, max), // 确保当前值不超过上限
    上限: max
  };
}

/**
 * 修复游戏时间
 */
function repairGameTime(time: any): GameTime {
  if (!time || typeof time !== 'object') {
    return { 年: 1000, 月: 1, 日: 1, 小时: 8, 分钟: 0 };
  }

  return {
    年: validateNumber(time.年, 1, 999999, 1000),
    月: validateNumber(time.月, 1, 12, 1),
    日: validateNumber(time.日, 1, 30, 1),
    小时: validateNumber(time.小时, 0, 23, 8),
    分钟: validateNumber(time.分钟, 0, 59, 0)
  };
}

/**
 * 修复物品数据
 */
function repairItem(item: Item): Item {
  const repaired = { ...item };

  // 确保基础字段
  repaired.物品ID = repaired.物品ID || `item_${Date.now()}`;
  repaired.名称 = repaired.名称 || '未命名物品';
  repaired.数量 = validateNumber(repaired.数量, 1, 999999, 1);

  // 修复品质
  if (!repaired.品质 || typeof repaired.品质 !== 'object') {
    repaired.品质 = { quality: '凡', grade: 1 };
  } else {
    const validQualities = ['凡', '黄', '玄', '地', '天', '仙', '神'];
    if (!validQualities.includes(repaired.品质.quality)) {
      repaired.品质.quality = '凡';
    }
    repaired.品质.grade = validateNumber(repaired.品质.grade, 0, 10, 1) as GradeType;
  }

  // 确保类型有效
  const validTypes = ['装备', '功法', '其他'];
  if (!validTypes.includes(repaired.类型)) {
    repaired.类型 = '其他';
  }

  return repaired;
}

/**
 * 修复NPC数据
 */
function repairNpc(npc: NpcProfile): NpcProfile {
  const repaired = { ...npc };

  // 确保基础字段
  repaired.名字 = repaired.名字 || '无名';
  repaired.性别 = repaired.性别 || '男';
  repaired.年龄 = validateNumber(repaired.年龄, 1, 10000, 20);

  // 修复境界
  repaired.境界 = repairRealm(repaired.境界);

  // 修复先天六司
  if (!repaired.先天六司 || typeof repaired.先天六司 !== 'object') {
    repaired.先天六司 = { 根骨: 5, 灵性: 5, 悟性: 5, 气运: 5, 魅力: 5, 心性: 5 };
  }

  // 修复位置
  if (!repaired.当前位置 || typeof repaired.当前位置 !== 'object') {
    repaired.当前位置 = { 描述: '朝天大陆·无名之地' };
  } else if (!repaired.当前位置.描述) {
    repaired.当前位置.描述 = '朝天大陆·无名之地';
  }

  // 修复好感度
  repaired.好感度 = validateNumber(repaired.好感度, -100, 100, 0);

  // 修复记忆
  if (!Array.isArray(repaired.记忆)) {
    repaired.记忆 = [];
  }

  // 修复背包
  if (!repaired.背包 || typeof repaired.背包 !== 'object') {
    repaired.背包 = {
      灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
      物品: {}
    };
  }

  return repaired;
}

/**
 * 验证数字，确保在范围内
 */
function validateNumber(value: any, min: number, max: number, defaultValue: number): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return Math.max(min, Math.min(max, value));
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return Math.max(min, Math.min(max, parsed));
    }
  }
  return defaultValue;
}

/**
 * 创建默认玩家状态
 */
function createDefaultPlayerStatus() {
  return {
    境界: {
      名称: '凡人',
      阶段: '',
      当前进度: 0,
      下一级所需: 100,
      突破描述: '引气入体，感悟天地灵气，踏上修仙第一步'
    },
    声望: 0,
    位置: { 描述: '朝天大陆·无名之地' },
    气血: { 当前: 100, 上限: 100 },
    灵气: { 当前: 50, 上限: 50 },
    神识: { 当前: 30, 上限: 30 },
    寿命: { 当前: 18, 上限: 80 },
    状态效果: [],
    天道点: 0
  };
}

/**
 * 创建最小可用存档
 */
function createMinimalSaveData(): SaveData {
  return {
    角色基础信息: {
      名字: '无名修士',
      性别: '男',
      世界: '朝天大陆',
      天资: '凡人',
      出生: '散修',
      灵根: '五行杂灵根',
      天赋: [],
      先天六司: { 根骨: 5, 灵性: 5, 悟性: 5, 气运: 5, 魅力: 5, 心性: 5 },
      后天六司: { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 }
    },
    玩家角色状态: createDefaultPlayerStatus(),
    装备栏: { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null },
    三千大道: { 大道列表: {} },
    背包: {
      灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
      物品: {}
    },
    人物关系: {},
    宗门系统: {
      availableSects: [],
      sectRelationships: {},
      sectHistory: []
    },
    记忆: {
      短期记忆: [],
      中期记忆: [],
      长期记忆: []
    },
    游戏时间: { 年: 1000, 月: 1, 日: 1, 小时: 8, 分钟: 0 },
    修炼功法: null,
    掌握技能: []
  };
}
