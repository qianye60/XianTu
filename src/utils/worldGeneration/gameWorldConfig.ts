/**
 * @fileoverview 游戏化世界生成配置系统
 * 提供可配置的修仙世界生成选项，支持角色创建时自定义世界参数
 */

import { getTavernHelper } from '../tavern';

/**
 * 世界规模枚举
 */
export enum WorldScale {
  SMALL = 'small',      // 小世界：3-5个大势力
  MEDIUM = 'medium',    // 中世界：6-9个大势力
  LARGE = 'large',      // 大世界：10-15个大势力
  EPIC = 'epic'         // 史诗世界：16-20个大势力
}

/**
 * 势力分布模式
 */
export enum PowerStructure {
  BALANCED = 'balanced',        // 均衡：势力实力相近
  HIERARCHICAL = 'hierarchical', // 等级：明显的强弱层次
  CHAOTIC = 'chaotic',          // 混沌：实力分布随机
  HEGEMONY = 'hegemony'         // 霸权：1-2个绝对强者
}

/**
 * 世界年代
 */
export enum WorldAge {
  ANCIENT = 'ancient',          // 上古时期：古老势力，神秘传承
  CLASSICAL = 'classical',      // 古典时期：成熟势力，稳定格局
  GOLDEN = 'golden',            // 黄金时期：繁荣昌盛，英雄辈出
  TURBULENT = 'turbulent',      // 乱世时期：群雄并起，变化剧烈
  DECLINE = 'decline'           // 末法时期：势力衰落，天地异变
}

/**
 * 冲突强度
 */
export enum ConflictLevel {
  PEACEFUL = 'peaceful',        // 和平：各派相安无事
  TENSE = 'tense',             // 紧张：暗流涌动，小冲突不断
  ACTIVE = 'active',           // 活跃：公开冲突，局部战争
  CHAOTIC = 'chaotic'          // 混乱：全面战争，天下大乱
}

/**
 * 修仙世界设定
 */
export interface CultivationWorldSettings {
  // 基础设定
  worldScale: WorldScale;
  powerStructure: PowerStructure;
  worldAge: WorldAge;
  conflictLevel: ConflictLevel;
  
  // 势力配置
  majorFactionsCount: number;      // 主要势力数量
  minorFactionsCount: number;      // 次要势力数量
  neutralZonesCount: number;       // 中立区域数量
  secretRealmsCount: number;       // 秘境数量
  
  // 地理配置
  continentCount: number;          // 大陆数量
  majorCitiesCount: number;        // 主要城市数量
  tradingHubsCount: number;        // 贸易枢纽数量
  
  // 特殊配置
  hasAncientSects: boolean;        // 是否包含上古宗门
  hasDemonicFactions: boolean;     // 是否包含魔道势力
  hasImmortalEmpires: boolean;     // 是否包含仙朝帝国
  hasNeutralAcademies: boolean;    // 是否包含中立学院
  
  // 随机种子
  randomSeed: string;              // 世界生成种子
}

/**
 * 角色出身对应的世界生成影响
 */
export interface BirthplaceGeneration {
  // 出身类型
  background: string;
  
  // 势力要求
  requiredFactionTypes: string[];  // 必须存在的势力类型
  preferredRegion: string;         // 偏好的地区类型
  
  // 出生地特征
  birthplaceType: string;          // 出生地类型
  birthplaceRank: string;          // 出生地等级
  initialConnections: string[];    // 初始人脉关系
  
  // 世界背景影响
  worldInfluence: {
    powerStructure?: PowerStructure;
    conflictLevel?: ConflictLevel;
    specialRequirements?: string[];
  };
}

/**
 * 预设的世界生成配置
 */
export const WORLD_GENERATION_PRESETS: { [key: string]: Partial<CultivationWorldSettings> } = {
  // 新手友好
  'beginner_friendly': {
    worldScale: WorldScale.SMALL,
    powerStructure: PowerStructure.BALANCED,
    worldAge: WorldAge.CLASSICAL,
    conflictLevel: ConflictLevel.PEACEFUL,
    majorFactionsCount: 4,
    minorFactionsCount: 2,
    hasAncientSects: false,
    hasDemonicFactions: false
  },
  
  // 经典修仙
  'classic_cultivation': {
    worldScale: WorldScale.MEDIUM,
    powerStructure: PowerStructure.HIERARCHICAL,
    worldAge: WorldAge.CLASSICAL,
    conflictLevel: ConflictLevel.TENSE,
    majorFactionsCount: 7,
    minorFactionsCount: 5,
    hasAncientSects: true,
    hasDemonicFactions: true
  },
  
  // 群雄争霸
  'warring_states': {
    worldScale: WorldScale.LARGE,
    powerStructure: PowerStructure.CHAOTIC,
    worldAge: WorldAge.TURBULENT,
    conflictLevel: ConflictLevel.ACTIVE,
    majorFactionsCount: 12,
    minorFactionsCount: 8,
    hasAncientSects: true,
    hasDemonicFactions: true,
    hasImmortalEmpires: true
  },
  
  // 末法时代
  'dharma_ending': {
    worldScale: WorldScale.MEDIUM,
    powerStructure: PowerStructure.HIERARCHICAL,
    worldAge: WorldAge.DECLINE,
    conflictLevel: ConflictLevel.CHAOTIC,
    majorFactionsCount: 5,
    minorFactionsCount: 3,
    hasAncientSects: true,
    hasDemonicFactions: true,
    secretRealmsCount: 15
  },
  
  // 自定义配置
  'custom': {
    worldScale: WorldScale.MEDIUM,
    powerStructure: PowerStructure.BALANCED,
    worldAge: WorldAge.CLASSICAL,
    conflictLevel: ConflictLevel.TENSE
  }
};

/**
 * 角色出身与世界生成的映射关系
 */
export const BACKGROUND_WORLD_MAPPING: { [key: string]: BirthplaceGeneration } = {
  // 修仙世家
  '修仙世家': {
    background: '修仙世家',
    requiredFactionTypes: ['family_clan', 'ancient_family'],
    preferredRegion: '富饶平原',
    birthplaceType: '世家府邸',
    birthplaceRank: '中等世家',
    initialConnections: ['家族长老', '同辈族人', '世交好友'],
    worldInfluence: {
      powerStructure: PowerStructure.HIERARCHICAL,
      specialRequirements: ['至少3个修仙世家', '家族联盟系统']
    }
  },
  
  // 将门之后
  '将门之后': {
    background: '将门之后',
    requiredFactionTypes: ['immortal_empire', 'military_family'],
    preferredRegion: '帝都重镇',
    birthplaceType: '将军府',
    birthplaceRank: '镇国将军府',
    initialConnections: ['将军父亲', '军中袍泽', '朝堂权贵'],
    worldInfluence: {
      powerStructure: PowerStructure.HIERARCHICAL,
      specialRequirements: ['存在仙朝帝国', '军事势力体系']
    }
  },
  
  // 散修出身
  '散修出身': {
    background: '散修出身',
    requiredFactionTypes: ['rogue_cultivator_alliance', 'neutral_city'],
    preferredRegion: '边境城镇',
    birthplaceType: '普通城镇',
    birthplaceRank: '偏远小镇',
    initialConnections: ['散修前辈', '城镇居民', '商队朋友'],
    worldInfluence: {
      conflictLevel: ConflictLevel.TENSE,
      specialRequirements: ['散修联盟', '中立城市系统']
    }
  },
  
  // 宗门弟子
  '宗门弟子': {
    background: '宗门弟子',
    requiredFactionTypes: ['orthodox_sect', 'cultivation_sect'],
    preferredRegion: '名山大川',
    birthplaceType: '山村小镇',
    birthplaceRank: '宗门附庸村落',
    initialConnections: ['村中长者', '青梅竹马', '宗门外门管事'],
    worldInfluence: {
      powerStructure: PowerStructure.BALANCED,
      specialRequirements: ['正道宗门系统', '宗门附庸体系']
    }
  },
  
  // 商贾之家
  '商贾之家': {
    background: '商贾之家',
    requiredFactionTypes: ['merchant_guild', 'trading_city'],
    preferredRegion: '贸易重镇',
    birthplaceType: '商会总部',
    birthplaceRank: '大商家族',
    initialConnections: ['商会长老', '贸易伙伴', '护卫队长'],
    worldInfluence: {
      specialRequirements: ['商会势力', '贸易路线网络']
    }
  },
  
  // 妖族血脉
  '妖族血脉': {
    background: '妖族血脉',
    requiredFactionTypes: ['demon_tribe', 'mixed_blood_sanctuary'],
    preferredRegion: '深山老林',
    birthplaceType: '隐蔽村落',
    birthplaceRank: '混血聚居地',
    initialConnections: ['族中长辈', '同族伙伴', '人族朋友'],
    worldInfluence: {
      conflictLevel: ConflictLevel.TENSE,
      specialRequirements: ['妖族势力', '种族冲突背景']
    }
  },
  
  // 凡人出身
  '凡人出身': {
    background: '凡人出身',
    requiredFactionTypes: ['mortal_kingdom', 'neutral_territory'],
    preferredRegion: '凡人王国',
    birthplaceType: '普通村庄',
    birthplaceRank: '偏远乡村',
    initialConnections: ['村长', '儿时玩伴', '路过的修士'],
    worldInfluence: {
      specialRequirements: ['凡人王国', '修凡交界地区']
    }
  }
};

/**
 * 世界生成器配置类
 */
export class WorldGenerationConfig {
  private settings: CultivationWorldSettings;
  
  constructor(presetName?: string, customSettings?: Partial<CultivationWorldSettings>) {
    // 从预设开始
    const preset = presetName ? WORLD_GENERATION_PRESETS[presetName] : WORLD_GENERATION_PRESETS['classic_cultivation'];
    
    // 应用默认设置
    this.settings = {
      worldScale: WorldScale.MEDIUM,
      powerStructure: PowerStructure.BALANCED,
      worldAge: WorldAge.CLASSICAL,
      conflictLevel: ConflictLevel.TENSE,
      majorFactionsCount: 7,
      minorFactionsCount: 5,
      neutralZonesCount: 3,
      secretRealmsCount: 8,
      continentCount: 1,
      majorCitiesCount: 12,
      tradingHubsCount: 4,
      hasAncientSects: true,
      hasDemonicFactions: true,
      hasImmortalEmpires: false,
      hasNeutralAcademies: true,
      randomSeed: this.generateRandomSeed(),
      ...preset,
      ...customSettings
    };
    
    // 根据世界规模调整数值
    this.adjustByWorldScale();
  }
  
  /**
   * 根据角色出身调整世界设置
   */
  adjustForCharacterBackground(background: string): void {
    const backgroundConfig = BACKGROUND_WORLD_MAPPING[background];
    if (!backgroundConfig) return;
    
    // 应用出身相关的世界设置调整
    if (backgroundConfig.worldInfluence.powerStructure) {
      this.settings.powerStructure = backgroundConfig.worldInfluence.powerStructure;
    }
    
    if (backgroundConfig.worldInfluence.conflictLevel) {
      this.settings.conflictLevel = backgroundConfig.worldInfluence.conflictLevel;
    }
    
    // 确保必要的势力类型存在
    if (backgroundConfig.requiredFactionTypes.includes('immortal_empire')) {
      this.settings.hasImmortalEmpires = true;
    }
    
    if (backgroundConfig.requiredFactionTypes.some(type => type.includes('demon'))) {
      this.settings.hasDemonicFactions = true;
    }
  }
  
  /**
   * 根据世界规模调整数值
   */
  private adjustByWorldScale(): void {
    const scaleMultipliers = {
      [WorldScale.SMALL]: 0.6,
      [WorldScale.MEDIUM]: 1.0,
      [WorldScale.LARGE]: 1.5,
      [WorldScale.EPIC]: 2.0
    };
    
    const multiplier = scaleMultipliers[this.settings.worldScale];
    
    this.settings.majorFactionsCount = Math.floor(this.settings.majorFactionsCount * multiplier);
    this.settings.minorFactionsCount = Math.floor(this.settings.minorFactionsCount * multiplier);
    this.settings.majorCitiesCount = Math.floor(this.settings.majorCitiesCount * multiplier);
    this.settings.secretRealmsCount = Math.floor(this.settings.secretRealmsCount * multiplier);
  }
  
  /**
   * 生成随机种子
   */
  private generateRandomSeed(): string {
    return `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 获取完整的世界生成设置
   */
  getSettings(): CultivationWorldSettings {
    return { ...this.settings };
  }
  
  /**
   * 生成世界配置描述
   */
  getDescription(): string {
    const scaleDesc = {
      [WorldScale.SMALL]: '小型世界',
      [WorldScale.MEDIUM]: '中型世界',
      [WorldScale.LARGE]: '大型世界',
      [WorldScale.EPIC]: '史诗世界'
    };
    
    const structureDesc = {
      [PowerStructure.BALANCED]: '势力均衡',
      [PowerStructure.HIERARCHICAL]: '等级分明',
      [PowerStructure.CHAOTIC]: '群雄割据',
      [PowerStructure.HEGEMONY]: '一家独大'
    };
    
    const ageDesc = {
      [WorldAge.ANCIENT]: '上古时期',
      [WorldAge.CLASSICAL]: '古典时期',
      [WorldAge.GOLDEN]: '黄金时期',
      [WorldAge.TURBULENT]: '乱世时期',
      [WorldAge.DECLINE]: '末法时期'
    };
    
    const conflictDesc = {
      [ConflictLevel.PEACEFUL]: '天下太平',
      [ConflictLevel.TENSE]: '暗流涌动',
      [ConflictLevel.ACTIVE]: '争斗不断',
      [ConflictLevel.CHAOTIC]: '天下大乱'
    };
    
    return `${scaleDesc[this.settings.worldScale]}，${structureDesc[this.settings.powerStructure]}，${ageDesc[this.settings.worldAge]}，${conflictDesc[this.settings.conflictLevel]}`;
  }
}

/**
 * 出生地生成器
 */
export class BirthplaceGenerator {
  /**
   * 根据角色出身生成出生地信息
   */
  static generateBirthplace(background: string, worldSettings: CultivationWorldSettings): any {
    const backgroundConfig = BACKGROUND_WORLD_MAPPING[background];
    if (!backgroundConfig) {
      return this.generateDefaultBirthplace();
    }
    
    return {
      type: backgroundConfig.birthplaceType,
      rank: backgroundConfig.birthplaceRank,
      region: backgroundConfig.preferredRegion,
      name: this.generateLocationName(backgroundConfig),
      description: this.generateLocationDescription(backgroundConfig),
      coordinates: this.generateCoordinates(),
      connections: backgroundConfig.initialConnections,
      specialFeatures: this.generateSpecialFeatures(backgroundConfig, worldSettings)
    };
  }
  
  /**
   * 生成默认出生地 - 现在也是动态随机的
   */
  private static generateDefaultBirthplace(): any {
    // 默认出生地配置
    const defaultConfig = {
      background: '凡人出身',
      requiredFactionTypes: ['neutral_territory'],
      preferredRegion: '边境地区',
      birthplaceType: '普通村庄',
      birthplaceRank: '偏远小村',
      initialConnections: ['村长', '村民', '邻里乡亲'],
      worldInfluence: {}
    };

    // 使用动态生成名称和坐标，而不是硬编码
    const dynamicName = this.generateLocationName(defaultConfig);
    const dynamicCoords = this.generateCoordinates();
    const dynamicDescription = this.generateLocationDescription(defaultConfig);

    console.log('[出生地生成器] 动态生成默认出生地:', dynamicName, dynamicCoords);

    return {
      type: defaultConfig.birthplaceType,
      rank: defaultConfig.birthplaceRank,
      region: defaultConfig.preferredRegion,
      name: dynamicName,
      description: dynamicDescription,
      coordinates: dynamicCoords,
      connections: defaultConfig.initialConnections,
      specialFeatures: ['民风淳朴', '远离是非']
    };
  }
  
  /**
   * 生成地点名称
   */
  private static generateLocationName(config: BirthplaceGeneration): string {
    const prefixes: Record<string, string[]> = {
      '世家府邸': ['青云', '玄天', '紫霄', '碧海'],
      '将军府': ['镇国', '护国', '定远', '威武'],
      '普通城镇': ['青石', '白云', '流水', '明月'],
      '山村小镇': ['桃花', '竹林', '溪水', '山泉'],
      '商会总部': ['万宝', '聚财', '通天', '九州'],
      '隐蔽村落': ['幽谷', '深林', '隐雾', '秘境'],
      '普通村庄': ['青石', '白水', '草木', '安宁']
    };
    
    const suffixes: Record<string, string[]> = {
      '世家府邸': ['世家', '府', '庄园'],
      '将军府': ['将军府', '侯府', '公府'],
      '普通城镇': ['镇', '城', '市'],
      '山村小镇': ['村', '镇', '坞'],
      '商会总部': ['商会', '行', '楼'],
      '隐蔽村落': ['村', '寨', '谷'],
      '普通村庄': ['村', '庄', '坞']
    };
    
    const typeKey = config.birthplaceType;
    const prefixList = prefixes[typeKey] || ['无名'];
    const suffixList = suffixes[typeKey] || ['地'];
    
    const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];
    const suffix = suffixList[Math.floor(Math.random() * suffixList.length)];
    
    return prefix + suffix;
  }
  
  /**
   * 生成地点描述
   */
  private static generateLocationDescription(config: BirthplaceGeneration): string {
    const descriptions: Record<string, string> = {
      '世家府邸': '传承数百年的修仙世家府邸，青砖黛瓦，院落深深，处处透着书香门第的风雅',
      '将军府': '威严的将军府邸，红墙绿瓦，旌旗猎猎，彰显着军门世家的赫赫威名',
      '普通城镇': '热闹的边境小镇，商贾云集，人来人往，是连接修仙界与凡俗的重要枢纽',
      '山村小镇': '群山环抱的宁静小镇，民风淳朴，依山傍水，偶有修士路过歇脚',
      '商会总部': '富丽堂皇的商会总部，车马辐辏，货物山积，财富流转于此',
      '隐蔽村落': '隐藏在深山中的神秘村落，外人难寻，居民皆有特殊血脉',
      '普通村庄': '平凡的小村庄，田园阡陌，鸡犬相闻，是最普通的凡人聚居地'
    };
    
    return descriptions[config.birthplaceType] || '一个普通的地方';
  }
  
  /**
   * 生成坐标
   */
  private static generateCoordinates(): { x: number, y: number } {
    return {
      x: Math.floor(Math.random() * 800) + 200,
      y: Math.floor(Math.random() * 600) + 100
    };
  }
  
  /**
   * 生成特殊特征
   */
  private static generateSpecialFeatures(config: BirthplaceGeneration, worldSettings: CultivationWorldSettings): string[] {
    const features: string[] = [];
    
    // 根据出身类型添加特征
    switch (config.background) {
      case '修仙世家':
        features.push('家族藏书楼', '祖传功法', '世代传承');
        break;
      case '将门之后':
        features.push('军械库', '练武场', '忠义门风');
        break;
      case '散修出身':
        features.push('消息灵通', '人脉广泛', '自由自在');
        break;
      case '妖族血脉':
        features.push('血脉觉醒', '天赋异禀', '身份隐秘');
        break;
    }
    
    // 根据世界设定添加特征
    if (worldSettings.worldAge === WorldAge.ANCIENT) {
      features.push('古老遗迹', '上古传说');
    }
    
    if (worldSettings.conflictLevel === ConflictLevel.CHAOTIC) {
      features.push('战乱频繁', '民不聊生');
    }
    
    return features;
  }
}