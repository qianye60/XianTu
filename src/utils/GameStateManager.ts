/**
 * 游戏状态管理系统
 * 负责跟踪和管理游戏中的所有状态信息
 * 
 * 管理的状态类型：
 * - 境界修炼系统
 * - 角色属性（气血、灵气、神识等）
 * - 位置和地图状态
 * - 状态效果（buff/debuff）
 * - 技能和天赋进度
 * - 人际关系状态
 */

import { getTavernHelper } from './tavern';
import { toast } from './toast';
import type { PlayerStatus, CharacterBaseInfo, StatusEffect } from '@/types/game';

// 境界定义
export interface RealmInfo {
  name: string;
  level: number;
  category: 'mortal' | 'qi_gathering' | 'foundation' | 'golden_core' | 'nascent_soul' | 'soul_transformation' | 'void_return' | 'mahayana' | 'immortal';
  currentProgress: number;
  maxProgress: number;
  description: string;
  requirements?: {
    cultivation_points: number;
    special_conditions?: string[];
  };
  benefits?: {
    hp_multiplier: number;
    mana_multiplier: number;
    spirit_multiplier: number;
  };
}

// 属性状态
export interface AttributeStatus {
  current: number;
  max: number;
  base_max: number; // 基础上限
  bonus_max: number; // 加成上限
  regeneration_rate: number; // 恢复速度
  last_updated: string;
}

// 位置状态
export interface LocationStatus {
  description: string;
  coordinates: { x: number; y: number };
  area: string;
  region: string;
  discovered_at: string;
  visits_count: number;
  safety_level: number; // 1-10，安全等级
  spiritual_energy: number; // 1-10，灵气浓度
}

// 修炼进度
export interface CultivationProgress {
  total_points: number;
  daily_gained: number;
  session_gained: number;
  efficiency_bonus: number; // 修炼效率加成
  main_technique: string;
  technique_proficiency: { [technique: string]: number };
  breakthrough_progress: number; // 突破进度 0-100
}

// 状态变更事件
export interface StateChangeEvent {
  timestamp: string;
  type: 'realm' | 'attribute' | 'location' | 'status_effect' | 'cultivation' | 'skill';
  oldValue: any;
  newValue: any;
  reason: string;
  metadata?: any;
}

class GameStateManagerClass {
  private currentState: {
    realm: RealmInfo | null;
    attributes: {
      hp: AttributeStatus;
      mana: AttributeStatus;
      spirit: AttributeStatus;
      cultivation: AttributeStatus;
    };
    location: LocationStatus | null;
    statusEffects: StatusEffect[];
    cultivation: CultivationProgress | null;
    lastUpdated: string;
  } = {
    realm: null,
    attributes: {
      hp: this.createDefaultAttribute(100),
      mana: this.createDefaultAttribute(100),
      spirit: this.createDefaultAttribute(100),
      cultivation: this.createDefaultAttribute(0),
    },
    location: null,
    statusEffects: [],
    cultivation: null,
    lastUpdated: new Date().toISOString(),
  };

  private changeHistory: StateChangeEvent[] = [];
  private tavernHelper: any = null;
  private updateCallbacks: Map<string, (event: StateChangeEvent) => void> = new Map();

  // 境界系统配置
  private realmSystem = {
    '凡人': { level: 0, category: 'mortal' as const, maxProgress: 100 },
    '练气一层': { level: 1, category: 'qi_gathering' as const, maxProgress: 200 },
    '练气二层': { level: 2, category: 'qi_gathering' as const, maxProgress: 300 },
    '练气三层': { level: 3, category: 'qi_gathering' as const, maxProgress: 400 },
    '筑基初期': { level: 10, category: 'foundation' as const, maxProgress: 1000 },
    '筑基中期': { level: 11, category: 'foundation' as const, maxProgress: 1500 },
    '筑基后期': { level: 12, category: 'foundation' as const, maxProgress: 2000 },
    '金丹初期': { level: 20, category: 'golden_core' as const, maxProgress: 5000 },
  };

  constructor() {
    this.initializeStateManager();
  }

  /**
   * 初始化状态管理器
   */
  private async initializeStateManager() {
    try {
      this.tavernHelper = getTavernHelper();
      await this.loadStateFromTavern();
      this.startPeriodicUpdate();
      console.log('[状态管理] 初始化完成');
    } catch (error) {
      console.error('[状态管理] 初始化失败:', error);
    }
  }

  /**
   * 创建默认属性状态
   */
  private createDefaultAttribute(baseMax: number): AttributeStatus {
    return {
      current: baseMax,
      max: baseMax,
      base_max: baseMax,
      bonus_max: 0,
      regeneration_rate: baseMax * 0.01, // 每秒恢复1%
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * 从酒馆加载状态
   */
  public async loadStateFromTavern(): Promise<void> {
    try {
      if (!this.tavernHelper) return;

      const variables = await this.tavernHelper.getVariables({ type: 'chat' });
      
      // 加载境界信息
      if (variables['character.realm'] || variables['境界']) {
        const realmData = variables['character.realm'] || variables['境界'];
        this.currentState.realm = this.parseRealmData(realmData);
      }

      // 加载属性信息
      this.loadAttributesFromVariables(variables);

      // 加载位置信息
      if (variables['character.location'] || variables['位置']) {
        const locationData = variables['character.location'] || variables['位置'];
        this.currentState.location = this.parseLocationData(locationData);
      }

      // 加载状态效果
      if (variables['character.status_effects'] || variables['状态效果']) {
        const effectsData = variables['character.status_effects'] || variables['状态效果'];
        this.currentState.statusEffects = Array.isArray(effectsData) ? effectsData : [];
      }

      // 加载修炼进度
      if (variables['character.cultivation'] || variables['修炼进度']) {
        const cultData = variables['character.cultivation'] || variables['修炼进度'];
        this.currentState.cultivation = this.parseCultivationData(cultData);
      }

      this.currentState.lastUpdated = new Date().toISOString();
      console.log('[状态管理] 状态加载完成');

    } catch (error) {
      console.error('[状态管理] 状态加载失败:', error);
    }
  }

  /**
   * 解析境界数据
   */
  private parseRealmData(realmData: any): RealmInfo {
    if (typeof realmData === 'string') {
      const realmConfig = this.realmSystem[realmData] || this.realmSystem['凡人'];
      return {
        name: realmData,
        level: realmConfig.level,
        category: realmConfig.category,
        currentProgress: 0,
        maxProgress: realmConfig.maxProgress,
        description: `${realmData}境界`,
        benefits: {
          hp_multiplier: 1 + realmConfig.level * 0.1,
          mana_multiplier: 1 + realmConfig.level * 0.15,
          spirit_multiplier: 1 + realmConfig.level * 0.12,
        },
      };
    } else if (realmData && typeof realmData === 'object') {
      const realmConfig = this.realmSystem[realmData.name] || this.realmSystem['凡人'];
      return {
        name: realmData.name || '凡人',
        level: realmData.level || realmConfig.level,
        category: realmConfig.category,
        currentProgress: realmData.currentProgress || realmData.当前进度 || 0,
        maxProgress: realmData.maxProgress || realmData.下一级所需 || realmConfig.maxProgress,
        description: realmData.description || realmData.描述 || `${realmData.name}境界`,
        benefits: {
          hp_multiplier: 1 + (realmData.level || realmConfig.level) * 0.1,
          mana_multiplier: 1 + (realmData.level || realmConfig.level) * 0.15,
          spirit_multiplier: 1 + (realmData.level || realmConfig.level) * 0.12,
        },
      };
    }

    return {
      name: '凡人',
      level: 0,
      category: 'mortal',
      currentProgress: 0,
      maxProgress: 100,
      description: '凡人境界',
      benefits: { hp_multiplier: 1, mana_multiplier: 1, spirit_multiplier: 1 },
    };
  }

  /**
   * 从变量加载属性
   */
  private loadAttributesFromVariables(variables: any): void {
    const attributeMap = {
      hp: ['character.hp', '气血', 'hp'],
      mana: ['character.mana', '灵气', 'mana'],
      spirit: ['character.spirit', '神识', 'spirit'],
      cultivation: ['character.cultivation_points', '修为', 'cultivation'],
    };

    Object.entries(attributeMap).forEach(([attr, keys]) => {
      for (const key of keys) {
        if (variables[key]) {
          const data = variables[key];
          if (typeof data === 'object' && data.current !== undefined) {
            this.currentState.attributes[attr as keyof typeof this.currentState.attributes] = {
              current: data.current || data.当前 || 0,
              max: data.max || data.最大 || 100,
              base_max: data.base_max || data.基础最大 || data.max || data.最大 || 100,
              bonus_max: data.bonus_max || data.加成最大 || 0,
              regeneration_rate: data.regeneration_rate || 1,
              last_updated: new Date().toISOString(),
            };
          } else if (typeof data === 'number') {
            this.currentState.attributes[attr as keyof typeof this.currentState.attributes].current = data;
          }
          break;
        }
      }
    });
  }

  /**
   * 解析位置数据
   */
  private parseLocationData(locationData: any): LocationStatus {
    if (typeof locationData === 'string') {
      return {
        description: locationData,
        coordinates: { x: 0, y: 0 },
        area: '未知区域',
        region: '未知地区',
        discovered_at: new Date().toISOString(),
        visits_count: 1,
        safety_level: 5,
        spiritual_energy: 3,
      };
    } else if (locationData && typeof locationData === 'object') {
      return {
        description: locationData.description || locationData.描述 || '未知位置',
        coordinates: locationData.coordinates || locationData.坐标 || { x: 0, y: 0 },
        area: locationData.area || locationData.区域 || '未知区域',
        region: locationData.region || locationData.地区 || '未知地区',
        discovered_at: locationData.discovered_at || new Date().toISOString(),
        visits_count: locationData.visits_count || 1,
        safety_level: locationData.safety_level || 5,
        spiritual_energy: locationData.spiritual_energy || 3,
      };
    }

    return {
      description: '未知位置',
      coordinates: { x: 0, y: 0 },
      area: '未知区域',
      region: '未知地区',
      discovered_at: new Date().toISOString(),
      visits_count: 1,
      safety_level: 5,
      spiritual_energy: 3,
    };
  }

  /**
   * 解析修炼数据
   */
  private parseCultivationData(cultData: any): CultivationProgress {
    return {
      total_points: cultData.total_points || cultData.总修为 || 0,
      daily_gained: cultData.daily_gained || cultData.今日所得 || 0,
      session_gained: cultData.session_gained || cultData.本次所得 || 0,
      efficiency_bonus: cultData.efficiency_bonus || cultData.效率加成 || 1,
      main_technique: cultData.main_technique || cultData.主修功法 || '',
      technique_proficiency: cultData.technique_proficiency || cultData.功法熟练度 || {},
      breakthrough_progress: cultData.breakthrough_progress || cultData.突破进度 || 0,
    };
  }

  /**
   * 更新境界状态
   */
  public updateRealm(newRealm: Partial<RealmInfo>): void {
    const oldRealm = this.currentState.realm;
    
    if (newRealm.name && this.realmSystem[newRealm.name]) {
      const realmConfig = this.realmSystem[newRealm.name];
      this.currentState.realm = {
        name: newRealm.name,
        level: newRealm.level || realmConfig.level,
        category: realmConfig.category,
        currentProgress: newRealm.currentProgress || 0,
        maxProgress: newRealm.maxProgress || realmConfig.maxProgress,
        description: newRealm.description || `${newRealm.name}境界`,
        benefits: {
          hp_multiplier: 1 + (newRealm.level || realmConfig.level) * 0.1,
          mana_multiplier: 1 + (newRealm.level || realmConfig.level) * 0.15,
          spirit_multiplier: 1 + (newRealm.level || realmConfig.level) * 0.12,
        },
      };

      // 境界提升时自动调整属性上限
      if (oldRealm && this.currentState.realm.level > oldRealm.level) {
        this.applyRealmBenefits();
        toast.success(`境界突破！现在是${this.currentState.realm.name}`);
      }
    } else if (this.currentState.realm) {
      // 更新现有境界的其他属性
      Object.assign(this.currentState.realm, newRealm);
    }

    this.recordStateChange('realm', oldRealm, this.currentState.realm, 'Realm update');
    this.syncToTavern();
  }

  /**
   * 应用境界加成
   */
  private applyRealmBenefits(): void {
    if (!this.currentState.realm?.benefits) return;

    const { hp_multiplier, mana_multiplier, spirit_multiplier } = this.currentState.realm.benefits;

    // 更新属性上限
    this.currentState.attributes.hp.max = Math.floor(this.currentState.attributes.hp.base_max * hp_multiplier);
    this.currentState.attributes.mana.max = Math.floor(this.currentState.attributes.mana.base_max * mana_multiplier);
    this.currentState.attributes.spirit.max = Math.floor(this.currentState.attributes.spirit.base_max * spirit_multiplier);

    // 完全恢复当前值（突破奖励）
    this.currentState.attributes.hp.current = this.currentState.attributes.hp.max;
    this.currentState.attributes.mana.current = this.currentState.attributes.mana.max;
    this.currentState.attributes.spirit.current = this.currentState.attributes.spirit.max;
  }

  /**
   * 更新属性状态
   */
  public updateAttribute(
    attribute: 'hp' | 'mana' | 'spirit' | 'cultivation', 
    changes: Partial<AttributeStatus>
  ): void {
    const oldValue = { ...this.currentState.attributes[attribute] };
    
    Object.assign(this.currentState.attributes[attribute], changes);
    this.currentState.attributes[attribute].last_updated = new Date().toISOString();

    // 确保current不超过max
    this.currentState.attributes[attribute].current = Math.min(
      this.currentState.attributes[attribute].current,
      this.currentState.attributes[attribute].max
    );

    this.recordStateChange('attribute', oldValue, this.currentState.attributes[attribute], `${attribute} update`);
    this.syncToTavern();
  }

  /**
   * 更新位置状态
   */
  public updateLocation(newLocation: Partial<LocationStatus>): void {
    const oldLocation = this.currentState.location;
    
    if (this.currentState.location) {
      Object.assign(this.currentState.location, newLocation);
    } else {
      this.currentState.location = {
        description: '未知位置',
        coordinates: { x: 0, y: 0 },
        area: '未知区域',
        region: '未知地区',
        discovered_at: new Date().toISOString(),
        visits_count: 1,
        safety_level: 5,
        spiritual_energy: 3,
        ...newLocation,
      };
    }

    // 增加访问次数
    if (newLocation.description && newLocation.description !== oldLocation?.description) {
      this.currentState.location.visits_count = (this.currentState.location.visits_count || 0) + 1;
    }

    this.recordStateChange('location', oldLocation, this.currentState.location, 'Location update');
    this.syncToTavern();
  }

  /**
   * 添加状态效果
   */
  public addStatusEffect(effect: StatusEffect): void {
    // 检查是否已存在同名效果
    const existingIndex = this.currentState.statusEffects.findIndex(e => e.状态名称 === effect.状态名称);
    
    if (existingIndex >= 0) {
      // 更新现有效果
      this.currentState.statusEffects[existingIndex] = effect;
    } else {
      // 添加新效果
      this.currentState.statusEffects.push(effect);
    }

    this.recordStateChange('status_effect', null, effect, 'Status effect added');
    this.syncToTavern();
  }

  /**
   * 移除状态效果
   */
  public removeStatusEffect(effectName: string): void {
    const effectIndex = this.currentState.statusEffects.findIndex(e => e.状态名称 === effectName);
    
    if (effectIndex >= 0) {
      const removedEffect = this.currentState.statusEffects.splice(effectIndex, 1)[0];
      this.recordStateChange('status_effect', removedEffect, null, 'Status effect removed');
      this.syncToTavern();
    }
  }

  /**
   * 更新修炼进度
   */
  public updateCultivation(changes: Partial<CultivationProgress>): void {
    const oldCultivation = this.currentState.cultivation;
    
    if (!this.currentState.cultivation) {
      this.currentState.cultivation = {
        total_points: 0,
        daily_gained: 0,
        session_gained: 0,
        efficiency_bonus: 1,
        main_technique: '',
        technique_proficiency: {},
        breakthrough_progress: 0,
      };
    }

    Object.assign(this.currentState.cultivation, changes);

    this.recordStateChange('cultivation', oldCultivation, this.currentState.cultivation, 'Cultivation update');
    this.syncToTavern();
  }

  /**
   * 记录状态变更
   */
  private recordStateChange(
    type: StateChangeEvent['type'], 
    oldValue: any, 
    newValue: any, 
    reason: string,
    metadata?: any
  ): void {
    const event: StateChangeEvent = {
      timestamp: new Date().toISOString(),
      type,
      oldValue,
      newValue,
      reason,
      metadata,
    };

    this.changeHistory.push(event);

    // 限制历史记录长度
    if (this.changeHistory.length > 100) {
      this.changeHistory = this.changeHistory.slice(-100);
    }

    // 通知订阅者
    this.updateCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[状态管理] 回调执行失败:', error);
      }
    });
  }

  /**
   * 同步状态到酒馆
   */
  private async syncToTavern(): Promise<void> {
    try {
      if (!this.tavernHelper) return;

      const stateData = {
        realm: this.currentState.realm,
        attributes: this.currentState.attributes,
        location: this.currentState.location,
        statusEffects: this.currentState.statusEffects,
        cultivation: this.currentState.cultivation,
        lastUpdated: new Date().toISOString(),
      };

      await this.tavernHelper.setVariable('character.game_state', stateData);

    } catch (error) {
      console.error('[状态管理] 同步到酒馆失败:', error);
    }
  }

  /**
   * 开始周期性更新
   */
  private startPeriodicUpdate(): void {
    setInterval(() => {
      this.processAttributeRegeneration();
      this.processStatusEffects();
    }, 1000); // 每秒更新
  }

  /**
   * 处理属性恢复
   */
  private processAttributeRegeneration(): void {
    ['hp', 'mana', 'spirit'].forEach(attr => {
      const attribute = this.currentState.attributes[attr as keyof typeof this.currentState.attributes];
      
      if (attribute.current < attribute.max) {
        const regen = Math.min(
          attribute.regeneration_rate,
          attribute.max - attribute.current
        );
        
        if (regen > 0) {
          this.updateAttribute(attr as any, { 
            current: attribute.current + regen 
          });
        }
      }
    });
  }

  /**
   * 处理状态效果
   */
  private processStatusEffects(): void {
    const now = new Date();
    const expiredEffects: string[] = [];

    this.currentState.statusEffects.forEach(effect => {
      if (effect.时间 && typeof effect.时间 === 'string') {
        const endTime = new Date(effect.时间);
        if (now > endTime) {
          expiredEffects.push(effect.状态名称);
        }
      }
    });

    expiredEffects.forEach(effectName => {
      this.removeStatusEffect(effectName);
    });
  }

  /**
   * 订阅状态变更
   */
  public subscribe(id: string, callback: (event: StateChangeEvent) => void): void {
    this.updateCallbacks.set(id, callback);
  }

  /**
   * 取消订阅
   */
  public unsubscribe(id: string): void {
    this.updateCallbacks.delete(id);
  }

  /**
   * 获取当前状态
   */
  public getCurrentState(): typeof this.currentState {
    return { ...this.currentState };
  }

  /**
   * 获取状态变更历史
   */
  public getChangeHistory(): StateChangeEvent[] {
    return [...this.changeHistory];
  }

  /**
   * 获取状态摘要
   */
  public getStateSummary(): string {
    const state = this.currentState;
    let summary = '';

    if (state.realm) {
      summary += `境界: ${state.realm.name} (${state.realm.currentProgress}/${state.realm.maxProgress})\n`;
    }

    summary += `气血: ${state.attributes.hp.current}/${state.attributes.hp.max}\n`;
    summary += `灵气: ${state.attributes.mana.current}/${state.attributes.mana.max}\n`;
    summary += `神识: ${state.attributes.spirit.current}/${state.attributes.spirit.max}\n`;

    if (state.location) {
      summary += `位置: ${state.location.description}\n`;
    }

    if (state.statusEffects.length > 0) {
      summary += `状态效果: ${state.statusEffects.map(e => e.状态名称).join(', ')}\n`;
    }

    return summary;
  }
}

// 单例模式实现
class GameStateManagerSingleton {
  private static instance: GameStateManagerClass | null = null;

  public static getInstance(): GameStateManagerClass {
    if (!this.instance) {
      this.instance = new GameStateManagerClass();
    }
    return this.instance;
  }
}

// 导出单例访问器
export const GameStateManager = {
  getInstance: () => GameStateManagerSingleton.getInstance()
};

export default GameStateManager;