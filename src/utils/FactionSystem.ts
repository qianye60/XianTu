/**
 * 势力系统
 * 管理修仙世界的各大势力、领域划分和势力关系
 * 
 * 功能包括：
 * - 势力层级管理（宗门、家族、散修联盟等）
 * - 势力范围和领域控制
 * - 势力关系和冲突
 * - 势力影响力计算
 * - 势力事件和变迁
 */

import { MapSystem } from './MapSystem';
import { toast } from './toast';

// 势力类型枚举
export enum FactionType {
  SECT = '宗门',
  FAMILY = '家族',
  ALLIANCE = '联盟',
  EMPIRE = '帝国',
  KINGDOM = '王国',
  CITY_STATE = '城邦',
  MERCHANT_GUILD = '商会',
  ROGUE = '散修组织',
  DEMON_SECT = '魔道宗门',
  RIGHTEOUS = '正道宗门',
  NEUTRAL = '中立势力'
}

// 势力等级枚举
export enum FactionLevel {
  LEGENDARY = '传说级', // 传说中的超级势力
  SUPREME = '至尊级',   // 统治一方的顶级势力
  MAJOR = '一流',       // 大型势力
  MEDIUM = '二流',      // 中型势力
  MINOR = '三流',       // 小型势力
  WEAK = '不入流'       // 弱小势力
}

// 势力关系类型
export enum RelationType {
  ALLY = '盟友',
  NEUTRAL = '中立',
  HOSTILE = '敌对',
  VASSAL = '附庸',
  OVERLORD = '宗主',
  TRADE_PARTNER = '贸易伙伴',
  COMPETITOR = '竞争者'
}

// 势力信息接口
export interface FactionInfo {
  id: string;
  name: string;
  shortName: string; // 简称
  description: string;
  type: FactionType;
  level: FactionLevel;
  
  // 层级关系
  parentFaction?: string; // 上级势力ID
  subFactions: string[]; // 下级势力ID列表
  
  // 基础信息
  foundedDate: string;
  founder: string;
  currentLeader: string;
  capital?: string; // 总部位置ID
  
  // 势力属性
  strength: number; // 1-100，军事实力
  wealth: number; // 1-100，经济实力
  influence: number; // 1-100，影响力
  reputation: number; // -100到100，声望
  stability: number; // 1-100，内部稳定性
  
  // 控制区域
  controlledRegions: string[]; // 完全控制的区域
  influenceRegions: string[]; // 有影响力的区域
  
  // 势力特色
  specialties: string[]; // 特长：如炼丹、炼器、阵法等
  resources: string[]; // 主要资源
  techniques: string[]; // 独有功法
  
  // 势力关系
  relationships: Map<string, RelationType>;
  
  // 势力颜色（地图显示）
  primaryColor: string;
  secondaryColor: string;
}

// 势力控制区域接口
export interface FactionTerritory {
  factionId: string;
  regionId: string;
  controlLevel: 'complete' | 'major' | 'influence' | 'disputed';
  establishedDate: string;
  
  // 区域边界（Leaflet多边形坐标）
  boundaries: [number, number][][]; // 经纬度坐标数组
  
  // 控制强度
  militaryPresence: number; // 1-10，军事存在
  economicControl: number; // 1-10，经济控制
  culturalInfluence: number; // 1-10，文化影响
  
  // 特殊标记
  isCapital?: boolean; // 是否为势力中心
  isDisputed?: boolean; // 是否存在争议
  isSecret?: boolean; // 是否为秘密领域
}

// 势力事件接口
export interface FactionEvent {
  id: string;
  type: '成立' | '扩张' | '冲突' | '联盟' | '灭亡' | '分裂' | '合并';
  date: string;
  description: string;
  involvedFactions: string[];
  consequences?: {
    territoryChanges?: { region: string; from: string; to: string }[];
    relationshipChanges?: { faction1: string; faction2: string; newRelation: RelationType }[];
    strengthChanges?: { factionId: string; strengthDelta: number }[];
  };
}

class FactionSystemClass {
  private factions: Map<string, FactionInfo> = new Map();
  private territories: Map<string, FactionTerritory> = new Map();
  private factionEvents: FactionEvent[] = [];

  constructor() {
    this.initializeFactionSystem();
  }

  /**
   * 初始化势力系统
   */
  private async initializeFactionSystem() {
    try {
      await this.loadFactionData();
      this.initializeDefaultFactions();
      console.log('[势力系统] 初始化完成');
    } catch (error) {
      console.error('[势力系统] 初始化失败:', error);
    }
  }

  /**
   * 初始化默认势力
   */
  private initializeDefaultFactions() {
    const defaultFactions: FactionInfo[] = [
      {
        id: 'tian_xuan_sect',
        name: '天玄宗',
        shortName: '天玄',
        description: '正道三大宗门之首，以剑道闻名于世，门下弟子万千。',
        type: FactionType.RIGHTEOUS,
        level: FactionLevel.SUPREME,
        foundedDate: '天历2156年',
        founder: '天玄道人',
        currentLeader: '玄天剑尊',
        capital: 'tian_xuan_mountain',
        strength: 95,
        wealth: 85,
        influence: 98,
        reputation: 90,
        stability: 88,
        controlledRegions: ['天玄山脉', '云雾峰'],
        influenceRegions: ['东域', '中州北部'],
        specialties: ['剑道', '阵法', '炼丹'],
        resources: ['上品灵石矿', '千年灵药', '玄铁'],
        techniques: ['天玄剑诀', '九霄神雷阵'],
        relationships: new Map(),
        primaryColor: '#4A90E2',
        secondaryColor: '#7BB3F0',
        parentFaction: undefined,
        subFactions: ['天玄外门', '天玄内门', '长老会']
      },
      {
        id: 'blood_demon_sect',
        name: '血魔宗',
        shortName: '血魔',
        description: '魔道第一大宗，以血魔功法著称，行事残暴，正魔势不两立。',
        type: FactionType.DEMON_SECT,
        level: FactionLevel.SUPREME,
        foundedDate: '天历1988年',
        founder: '血魔老祖',
        currentLeader: '血海魔君',
        capital: 'blood_abyss',
        strength: 92,
        wealth: 75,
        influence: 85,
        reputation: -85,
        stability: 70,
        controlledRegions: ['血海深渊', '魔窟山脉'],
        influenceRegions: ['西域', '北荒'],
        specialties: ['血魔功', '炼魂术', '傀儡术'],
        resources: ['魔血石', '怨灵草', '嗜血矿'],
        techniques: ['血海滔天', '万魂噬体诀'],
        relationships: new Map(),
        primaryColor: '#D32F2F',
        secondaryColor: '#F57C00',
        parentFaction: undefined,
        subFactions: ['血魔堂', '魂殿', '傀儡门']
      },
      {
        id: 'qin_empire',
        name: '大秦皇朝',
        shortName: '大秦',
        description: '凡人界最强大的世俗帝国，拥有庞大的军队和完善的管理体系。',
        type: FactionType.EMPIRE,
        level: FactionLevel.MAJOR,
        foundedDate: '天历2001年',
        founder: '秦始皇',
        currentLeader: '秦武帝',
        capital: 'qin_capital',
        strength: 78,
        wealth: 92,
        influence: 88,
        reputation: 65,
        stability: 85,
        controlledRegions: ['中州', '南域部分'],
        influenceRegions: ['东域部分', '西域边境'],
        specialties: ['军事', '商贸', '治理'],
        resources: ['黄金', '粮食', '人口'],
        techniques: ['皇家护国阵', '龙象神功'],
        relationships: new Map(),
        primaryColor: '#FFD700',
        secondaryColor: '#FFA000',
        parentFaction: undefined,
        subFactions: ['禁军', '六部', '各州府']
      },
      {
        id: 'merchant_union',
        name: '万宝商会',
        shortName: '万宝',
        description: '修仙界最大的商业联盟，控制着大部分贸易路线。',
        type: FactionType.MERCHANT_GUILD,
        level: FactionLevel.MAJOR,
        foundedDate: '天历2234年',
        founder: '金财神',
        currentLeader: '万宝真人',
        capital: 'golden_city',
        strength: 45,
        wealth: 98,
        influence: 85,
        reputation: 70,
        stability: 90,
        controlledRegions: ['黄金城'],
        influenceRegions: ['各大城市', '贸易路线'],
        specialties: ['商贸', '情报', '炼器'],
        resources: ['各种灵石', '稀有材料', '情报网络'],
        techniques: ['万宝神诀', '聚财大阵'],
        relationships: new Map(),
        primaryColor: '#4CAF50',
        secondaryColor: '#8BC34A',
        parentFaction: undefined,
        subFactions: ['各地分会', '护卫队', '情报部']
      }
    ];

    // 添加默认势力
    defaultFactions.forEach(faction => {
      if (!this.factions.has(faction.id)) {
        this.factions.set(faction.id, faction);
      }
    });

    // 设置默认关系
    this.setupDefaultRelationships();
    
    // 创建默认领域
    this.createDefaultTerritories();
  }

  /**
   * 设置默认势力关系
   */
  private setupDefaultRelationships() {
    // 天玄宗与血魔宗敌对
    this.setFactionRelationship('tian_xuan_sect', 'blood_demon_sect', RelationType.HOSTILE);
    
    // 天玄宗与大秦皇朝友好
    this.setFactionRelationship('tian_xuan_sect', 'qin_empire', RelationType.ALLY);
    
    // 万宝商会与各大势力保持贸易关系
    this.setFactionRelationship('merchant_union', 'tian_xuan_sect', RelationType.TRADE_PARTNER);
    this.setFactionRelationship('merchant_union', 'qin_empire', RelationType.TRADE_PARTNER);
    this.setFactionRelationship('merchant_union', 'blood_demon_sect', RelationType.NEUTRAL);
  }

  /**
   * 创建默认领域
   */
  private createDefaultTerritories() {
    const defaultTerritories: FactionTerritory[] = [
      {
        factionId: 'tian_xuan_sect',
        regionId: 'tian_xuan_range',
        controlLevel: 'complete',
        establishedDate: '天历2156年',
        boundaries: [[[116.2, 39.8], [117.2, 39.8], [117.2, 40.8], [116.2, 40.8]]], // 示例坐标
        militaryPresence: 10,
        economicControl: 9,
        culturalInfluence: 10,
        isCapital: true
      },
      {
        factionId: 'blood_demon_sect',
        regionId: 'blood_abyss_region',
        controlLevel: 'complete',
        establishedDate: '天历1988年',
        boundaries: [[[110.5, 35.2], [112.5, 35.2], [112.5, 37.2], [110.5, 37.2]]], // 示例坐标
        militaryPresence: 10,
        economicControl: 7,
        culturalInfluence: 8,
        isCapital: true
      },
      {
        factionId: 'qin_empire',
        regionId: 'central_plains',
        controlLevel: 'complete',
        establishedDate: '天历2001年',
        boundaries: [[[114.0, 36.0], [118.0, 36.0], [118.0, 40.0], [114.0, 40.0]]], // 示例坐标
        militaryPresence: 9,
        economicControl: 10,
        culturalInfluence: 9,
        isCapital: true
      }
    ];

    defaultTerritories.forEach(territory => {
      this.territories.set(territory.regionId, territory);
    });
  }

  /**
   * 设置势力关系
   */
  public setFactionRelationship(factionId1: string, factionId2: string, relation: RelationType) {
    const faction1 = this.factions.get(factionId1);
    const faction2 = this.factions.get(factionId2);
    
    if (faction1 && faction2) {
      faction1.relationships.set(factionId2, relation);
      faction2.relationships.set(factionId1, relation);
    }
  }

  /**
   * 获取势力信息
   */
  public getFaction(factionId: string): FactionInfo | null {
    return this.factions.get(factionId) || null;
  }

  /**
   * 获取所有势力
   */
  public getAllFactions(): FactionInfo[] {
    return Array.from(this.factions.values());
  }

  /**
   * 获取势力控制的领域
   */
  public getFactionTerritories(factionId: string): FactionTerritory[] {
    return Array.from(this.territories.values()).filter(
      territory => territory.factionId === factionId
    );
  }

  /**
   * 获取区域控制势力
   */
  public getRegionController(regionId: string): FactionInfo | null {
    const territory = this.territories.get(regionId);
    if (territory) {
      return this.factions.get(territory.factionId) || null;
    }
    return null;
  }

  /**
   * 获取势力关系
   */
  public getFactionRelation(factionId1: string, factionId2: string): RelationType {
    const faction1 = this.factions.get(factionId1);
    return faction1?.relationships.get(factionId2) || RelationType.NEUTRAL;
  }

  /**
   * 计算势力总实力
   */
  public calculateFactionPower(factionId: string): number {
    const faction = this.factions.get(factionId);
    if (!faction) return 0;

    // 综合实力计算
    const basePower = (faction.strength * 0.4 + faction.wealth * 0.3 + faction.influence * 0.3);
    
    // 稳定性加成
    const stabilityBonus = faction.stability * 0.01;
    
    // 声望影响（正面声望增加实力，负面声望可能降低实力但增加恐惧值）
    const reputationEffect = Math.abs(faction.reputation) * 0.005;
    
    return Math.floor(basePower * (1 + stabilityBonus + reputationEffect));
  }

  /**
   * 获取地图显示数据
   */
  public getMapDisplayData(): {
    factions: FactionInfo[];
    territories: FactionTerritory[];
    events: FactionEvent[];
  } {
    return {
      factions: this.getAllFactions(),
      territories: Array.from(this.territories.values()),
      events: this.factionEvents.slice(-50) // 最近50个事件
    };
  }

  /**
   * 保存势力数据
   */
  private saveFactionData() {
    try {
      const factionData = {
        factions: Array.from(this.factions.entries()).map(([id, faction]) => [
          id,
          {
            ...faction,
            relationships: Array.from(faction.relationships.entries())
          }
        ]),
        territories: Array.from(this.territories.entries()),
        events: this.factionEvents,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('game-faction-system', JSON.stringify(factionData));
    } catch (error) {
      console.error('[势力系统] 保存失败:', error);
    }
  }

  /**
   * 加载势力数据
   */
  private async loadFactionData() {
    try {
      const stored = localStorage.getItem('game-faction-system');
      if (stored) {
        const factionData = JSON.parse(stored);
        
        // 恢复势力数据
        if (factionData.factions) {
          this.factions = new Map(
            factionData.factions.map(([id, faction]: [string, any]) => [
              id,
              {
                ...faction,
                relationships: new Map(faction.relationships || [])
              }
            ])
          );
        }
        
        // 恢复领域数据
        if (factionData.territories) {
          this.territories = new Map(factionData.territories);
        }
        
        // 恢复事件数据
        if (factionData.events) {
          this.factionEvents = factionData.events;
        }

        console.log('[势力系统] 从本地存储加载完成');
      }
    } catch (error) {
      console.error('[势力系统] 加载失败:', error);
    }
  }
}

// 导出单例实例
export const FactionSystem = new FactionSystemClass();

export default FactionSystem;