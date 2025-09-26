/* eslint-disable @typescript-eslint/no-unused-vars */
// src/utils/worldGeneration/gameWorldConfig.ts

import type { WorldMapConfig } from '@/types/worldMap';

// 枚举和接口定义
export enum WorldScale {
  SMALL = 'small',
  MEDIUM = 'medium', 
  LARGE = 'large',
  EPIC = 'epic'
}

export enum PowerStructure {
  BALANCED = 'balanced',       // 势力均衡
  HIERARCHICAL = 'hierarchical', // 等级分明
  CHAOTIC = 'chaotic',         // 群雄割据
  DECENTRALIZED = 'decentralized' // 分散统治
}

export enum WorldAge {
  ANCIENT = 'ancient',   // 上古时期
  CLASSICAL = 'classical', // 古典时期
  GOLDEN = 'golden',     // 黄金时期
  DECLINING = 'declining'  // 衰落时期
}

export enum ConflictLevel {
  PEACEFUL = 'peaceful',  // 天下太平
  TENSE = 'tense',       // 暗流涌动
  ACTIVE = 'active',     // 争斗不断
  CHAOTIC = 'chaotic'    // 血雨腥风
}

// 核心配置接口
export interface CultivationWorldSettings {
  // 基础设置
  worldScale: WorldScale;
  powerStructure: PowerStructure;
  worldAge: WorldAge;
  conflictLevel: ConflictLevel;
  
  // 数量控制
  majorFactionsCount: number;    // 主要势力数量
  minorFactionsCount: number;    // 次要势力数量
  neutralZonesCount: number;     // 中立区域数量
  secretRealmsCount: number;     // 秘境数量
  continentCount: number;        // 大陆数量
  locationsPerContinent?: number; // 每个大陆的地点数量（可选）
  majorCitiesCount: number;      // 主要城市数量
  tradingHubsCount: number;      // 贸易中心数量
  
  // 特殊设置
  hasAncientSects: boolean;      // 是否有上古宗门
  hasDemonicFactions: boolean;   // 是否有魔道势力
  hasImmortalEmpires: boolean;   // 是否有仙朝帝国
  hasNeutralAcademies: boolean;  // 是否有中立学院
  
  // 随机种子
  randomSeed: string;              // 世界生成种子
  
  // 地图配置
  mapConfig?: WorldMapConfig;      // 地图生成配置
}

/**
 * 预设的世界生成配置
 */
export const WORLD_GENERATION_PRESETS: { [key: string]: Partial<CultivationWorldSettings> } = {
  // 新手友好
  'beginner_friendly': {
    worldScale: WorldScale.SMALL,
    powerStructure: PowerStructure.BALANCED,
    conflictLevel: ConflictLevel.PEACEFUL,
    hasAncientSects: false,
    hasDemonicFactions: false,
    hasImmortalEmpires: false
  },
  
  // 经典修仙
  'classic_cultivation': {
    worldScale: WorldScale.MEDIUM,
    powerStructure: PowerStructure.HIERARCHICAL,
    worldAge: WorldAge.CLASSICAL,
    conflictLevel: ConflictLevel.TENSE,
    hasAncientSects: true,
    hasDemonicFactions: true,
    hasImmortalEmpires: false
  },
  
  // 上古传说
  'ancient_legend': {
    worldScale: WorldScale.LARGE,
    powerStructure: PowerStructure.CHAOTIC,
    worldAge: WorldAge.ANCIENT,
    conflictLevel: ConflictLevel.ACTIVE,
    hasAncientSects: true,
    hasDemonicFactions: true,
    hasImmortalEmpires: true
  },
  
  // 群雄争霸
  'chaotic_era': {
    worldScale: WorldScale.LARGE,
    powerStructure: PowerStructure.CHAOTIC,
    worldAge: WorldAge.DECLINING,
    conflictLevel: ConflictLevel.CHAOTIC
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
    // 根据世界规模设置基础数量
    const worldScale = customSettings?.worldScale || preset?.worldScale || WorldScale.MEDIUM;
    const baseConfig = this.getBaseConfigByScale(worldScale);
    
    this.settings = {
      worldScale: WorldScale.MEDIUM,
      powerStructure: PowerStructure.BALANCED,
      worldAge: WorldAge.CLASSICAL,
      conflictLevel: ConflictLevel.TENSE,
      ...baseConfig, // 使用基于规模的基础配置
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
   * 根据世界规模获取基础配置
   */
  private getBaseConfigByScale(scale: WorldScale): Partial<CultivationWorldSettings> {
    switch (scale) {
      case WorldScale.SMALL:
        return {
          majorFactionsCount: Math.floor(Math.random() * 3) + 3, // 3-5
          minorFactionsCount: Math.floor(Math.random() * 3) + 2, // 2-4
          neutralZonesCount: Math.floor(Math.random() * 3) + 1, // 1-3
          secretRealmsCount: Math.floor(Math.random() * 4) + 3, // 3-6
          continentCount: Math.floor(Math.random() * 2) + 3, // 3-4个大陆
          majorCitiesCount: Math.floor(Math.random() * 4) + 5, // 5-8
          tradingHubsCount: Math.floor(Math.random() * 2) + 2, // 2-3
        };
      
      case WorldScale.MEDIUM:
        return {
          majorFactionsCount: Math.floor(Math.random() * 4) + 5, // 5-8
          minorFactionsCount: Math.floor(Math.random() * 4) + 3, // 3-6
          neutralZonesCount: Math.floor(Math.random() * 3) + 2, // 2-4
          secretRealmsCount: Math.floor(Math.random() * 5) + 5, // 5-9
          continentCount: Math.floor(Math.random() * 3) + 4, // 4-6个大陆
          majorCitiesCount: Math.floor(Math.random() * 6) + 8, // 8-13
          tradingHubsCount: Math.floor(Math.random() * 3) + 3, // 3-5
        };
      
      case WorldScale.LARGE:
        return {
          majorFactionsCount: Math.floor(Math.random() * 5) + 7, // 7-11
          minorFactionsCount: Math.floor(Math.random() * 5) + 5, // 5-9
          neutralZonesCount: Math.floor(Math.random() * 4) + 3, // 3-6
          secretRealmsCount: Math.floor(Math.random() * 8) + 8, // 8-15
          continentCount: Math.floor(Math.random() * 3) + 5, // 5-7个大陆
          majorCitiesCount: Math.floor(Math.random() * 8) + 12, // 12-19
          tradingHubsCount: Math.floor(Math.random() * 3) + 4, // 4-6
        };
      
      case WorldScale.EPIC:
        return {
          majorFactionsCount: Math.floor(Math.random() * 6) + 10, // 10-15
          minorFactionsCount: Math.floor(Math.random() * 6) + 6, // 6-11
          neutralZonesCount: Math.floor(Math.random() * 5) + 4, // 4-8
          secretRealmsCount: Math.floor(Math.random() * 10) + 12, // 12-21
          continentCount: Math.floor(Math.random() * 3) + 5, // 5-7个大陆
          majorCitiesCount: Math.floor(Math.random() * 10) + 18, // 18-27
          tradingHubsCount: Math.floor(Math.random() * 4) + 6, // 6-9
        };
      
      default:
        return {
          majorFactionsCount: Math.floor(Math.random() * 4) + 5, // 5-8
          minorFactionsCount: Math.floor(Math.random() * 4) + 3, // 3-6
          neutralZonesCount: Math.floor(Math.random() * 3) + 2, // 2-4
          secretRealmsCount: Math.floor(Math.random() * 5) + 5, // 5-9
          continentCount: Math.floor(Math.random() * 3) + 4, // 4-6个大陆
          majorCitiesCount: Math.floor(Math.random() * 6) + 8, // 8-13
          tradingHubsCount: Math.floor(Math.random() * 3) + 3, // 3-5
        };
    }
  }

  /**
   * 根据世界规模调整数值（预留方法，现在由getBaseConfigByScale直接设置）
   */
  private adjustByWorldScale(): void {
    // 现在数量直接由 getBaseConfigByScale 根据规模设置
    // 这个方法保留用于未来可能的微调需求
    const scale = this.settings.worldScale;
    
    // 可以在这里添加一些额外的调整逻辑
    // 比如根据其他因素进行细微调整
    
    // 确保最小值
    this.settings.majorFactionsCount = Math.max(3, this.settings.majorFactionsCount);
    this.settings.minorFactionsCount = Math.max(2, this.settings.minorFactionsCount);
    this.settings.continentCount = Math.max(2, this.settings.continentCount);
    this.settings.majorCitiesCount = Math.max(4, this.settings.majorCitiesCount);
    this.settings.secretRealmsCount = Math.max(2, this.settings.secretRealmsCount);
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
      [PowerStructure.DECENTRALIZED]: '分散统治'
    };
    
    const ageDesc = {
      [WorldAge.ANCIENT]: '上古时期',
      [WorldAge.CLASSICAL]: '古典时期',
      [WorldAge.GOLDEN]: '黄金时期',
      [WorldAge.DECLINING]: '衰落时期'
    };
    
    const conflictDesc = {
      [ConflictLevel.PEACEFUL]: '天下太平',
      [ConflictLevel.TENSE]: '暗流涌动',
      [ConflictLevel.ACTIVE]: '争斗不断',
      [ConflictLevel.CHAOTIC]: '血雨腥风'
    };
    
    return `${scaleDesc[this.settings.worldScale]}，${structureDesc[this.settings.powerStructure]}，${ageDesc[this.settings.worldAge]}，${conflictDesc[this.settings.conflictLevel]}`;
  }
  
  /**
   * 根据角色背景调整世界生成设置
   * @param origin 角色出身
   */
  adjustForCharacterBackground(origin: string): void {
    if (origin.includes('世家') || origin.includes('望族')) {
      this.settings.majorCitiesCount = Math.max(this.settings.majorCitiesCount, 15);
      this.settings.powerStructure = PowerStructure.HIERARCHICAL;
    } else if (origin.includes('宗门') || origin.includes('门派')) {
      this.settings.majorFactionsCount = Math.max(this.settings.majorFactionsCount, 10);
      this.settings.hasAncientSects = true;
    } else if (origin.includes('散修') || origin.includes('孤儿')) {
      this.settings.secretRealmsCount = Math.max(this.settings.secretRealmsCount, 12);
      this.settings.conflictLevel = ConflictLevel.ACTIVE;
    }
  }
}

/**
 * 出生地生成器
 */
export class BirthplaceGenerator {
  /**
   * 根据角色出身和世界设定，生成一个合适的出生地
   * @param origin 角色出身
   * @param worldSettings 世界设定
   * @returns 返回一个包含出生地信息的对象
   */
  static generateBirthplace(origin: string, worldSettings: CultivationWorldSettings) {
    const villageNames = ['溪水村','松风镇','柳湾村','石桥村','清泉镇','安乐村','竹影镇'];
    const townNames = ['望月镇','云水镇','落霞镇','山石镇'];
    const cityNames = ['天枢城','阳明城','灵泉城','玉京城'];
    let name = villageNames[Math.floor(Math.random()*villageNames.length)];
    let type = 'village';
    let description = '一个平凡而宁静的小村庄，炊烟袅袅，偶有修士路过。';

    // 简化选择：按概率随机地点类型
    const roll = Math.random();
    if (roll < 0.5) {
      name = villageNames[Math.floor(Math.random()*villageNames.length)];
      type = 'village';
      description = '一个平凡而宁静的小村庄，炊烟袅袅，偶有修士路过。';
    } else if (roll < 0.85) {
      name = townNames[Math.floor(Math.random()*townNames.length)];
      type = 'town';
      description = '一处小镇或坊市，行旅商贾云集，偶见修士踪迹。';
    } else {
      name = '某个修仙宗门的山门';
      type = 'sect_gate';
      description = '坐落在灵脉之上的修仙宗门，山门宏伟，气象万千。';
    }

    return {
      name,
      type,
      description,
      // 注意：此处的坐标是示意性的，实际坐标应由后续逻辑与世界地图关联后生成
      coordinates: { X: Math.floor(Math.random() * 200), Y: Math.floor(Math.random() * 100) }
    };
  }
}

/**
 * 角色背景与世界生成的映射关系
 */
export const BACKGROUND_WORLD_MAPPING: Record<string, {
  birthplaceType: string;
  requiredFactionTypes: string[];
  initialConnections: string[];
}> = {
  '山野遗孤': {
    birthplaceType: '山野村落',
    requiredFactionTypes: ['散修组织', '小型宗门'],
    initialConnections: ['村民关系']
  },
  '书香门第': {
    birthplaceType: '文明城镇',
    requiredFactionTypes: ['学院', '官府', '文人社团'],
    initialConnections: ['世家关系', '学者网络']
  },
  '商贾之子': {
    birthplaceType: '商业城池',
    requiredFactionTypes: ['商会', '贸易组织'],
    initialConnections: ['商业网络', '财富资源']
  },
  '将门之后': {
    birthplaceType: '军事重镇',
    requiredFactionTypes: ['军事势力', '武者组织'],
    initialConnections: ['军方关系', '武者网络']
  },
  '宗门弟子': {
    birthplaceType: '宗门山门',
    requiredFactionTypes: ['修仙宗门', '道统传承'],
    initialConnections: ['同门关系', '师长人脉']
  },
  '世家子弟': {
    birthplaceType: '世家府邸',
    requiredFactionTypes: ['修仙世家', '贵族势力'],
    initialConnections: ['家族势力', '贵族圈子']
  },
  '散修': {
    birthplaceType: '隐秘修炼地',
    requiredFactionTypes: ['散修联盟', '独立势力'],
    initialConnections: ['同道好友', '资源网络']
  },
  '皇室血脉': {
    birthplaceType: '皇城宫殿',
    requiredFactionTypes: ['皇室势力', '朝廷机构'],
    initialConnections: ['皇室关系', '朝堂人脉']
  }
};
