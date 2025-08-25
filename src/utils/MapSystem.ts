/**
 * 地图系统
 * 管理游戏世界的地理位置、区域发现和地图事件
 * 
 * 功能包括：
 * - 动态地图生成和更新
 * - 位置追踪和坐标系统
 * - 区域发现和探索
 * - 地图事件管理
 * - 安全等级和灵气浓度
 * - 路径查找和导航
 */

import { GameStateManager } from './GameStateManager';
import { getTavernHelper } from './tavern';
import { toast } from './toast';

// 坐标接口
export interface Coordinates {
  x: number;
  y: number;
  z?: number; // 高度，可选
}

// 区域类型枚举
export enum AreaType {
  CITY = '城市',
  VILLAGE = '村庄',
  MOUNTAIN = '山脉',
  FOREST = '森林',
  LAKE = '湖泊',
  DESERT = '沙漠',
  CAVE = '洞穴',
  RUIN = '遗迹',
  SECT = '宗门',
  MARKET = '市场',
  DUNGEON = '秘境',
  BATTLEFIELD = '战场'
}

// 地点信息接口
export interface LocationInfo {
  id: string;
  name: string;
  description: string;
  type: AreaType;
  coordinates: Coordinates;
  region: string; // 所属地区
  subRegion?: string; // 子地区
  discoveredAt?: string; // 发现时间
  visitCount: number;
  lastVisitTime?: string;
  
  // 环境属性
  safetyLevel: number; // 1-10，安全等级
  spiritualEnergy: number; // 1-10，灵气浓度
  climate: '温和' | '炎热' | '寒冷' | '潮湿' | '干燥';
  terrain: '平原' | '丘陵' | '山地' | '森林' | '水域' | '沙漠' | '冰原';
  
  // 资源和特产
  resources?: string[]; // 特产资源
  npcs?: string[]; // NPC列表
  shops?: string[]; // 商店列表
  facilities?: string[]; // 设施列表
  
  // 限制条件
  accessRequirements?: {
    minRealm?: string; // 最低境界要求
    minLevel?: number; // 最低等级要求
    items?: string[]; // 需要特定物品
    tokens?: string[]; // 需要通行证
  };
  
  // 地图事件
  events?: LocationEvent[];
  
  // 连接的地点
  connections: {
    locationId: string;
    distance: number; // 距离（公里）
    travelTime: number; // 旅行时间（分钟）
    difficulty: number; // 1-10，路径难度
    description?: string;
  }[];
}

// 地图事件接口
export interface LocationEvent {
  id: string;
  name: string;
  description: string;
  type: '随机遇' | '定时' | '触发' | '任务';
  status: '未触发' | '进行中' | '已完成' | '冷却中';
  cooldownUntil?: string; // 冷却结束时间
  conditions?: {
    minRealm?: string;
    maxVisitCount?: number;
    timeRange?: [string, string]; // 时间范围
    probability?: number; // 触发概率
  };
  rewards?: {
    items?: string[];
    currency?: Record<string, number>;
    experience?: number;
    reputation?: number;
  };
}

// 地区定义接口
export interface Region {
  id: string;
  name: string;
  description: string;
  level: number; // 地区等级，影响怪物强度等
  parentRegion?: string; // 父级地区
  locations: string[]; // 包含的地点ID列表
  mainCity?: string; // 主城ID
  controllingFaction?: string; // 控制势力
}

// 旅行选项接口
export interface TravelOptions {
  method: '步行' | '飞行' | '传送' | '骑乘';
  fast: boolean; // 是否快速旅行
  safety: 'safe' | 'normal' | 'dangerous'; // 安全模式
}

// 地图状态接口
export interface MapState {
  currentLocation: string; // 当前位置ID
  visitedLocations: Set<string>; // 已访问位置
  discoveredLocations: Set<string>; // 已发现位置
  activeEvents: Map<string, LocationEvent>; // 激活的事件
  travelHistory: {
    from: string;
    to: string;
    timestamp: string;
    method: string;
  }[];
}

class MapSystemClass {
  private locations: Map<string, LocationInfo> = new Map();
  private regions: Map<string, Region> = new Map();
  private mapState: MapState = {
    currentLocation: '',
    visitedLocations: new Set(),
    discoveredLocations: new Set(),
    activeEvents: new Map(),
    travelHistory: [],
  };
  
  private tavernHelper: any = null;
  private autoSave = true;

  constructor() {
    this.initializeMapSystem();
  }

  /**
   * 初始化地图系统
   */
  private async initializeMapSystem() {
    try {
      this.tavernHelper = getTavernHelper();
      await this.loadMapData();
      this.initializeDefaultLocations();
      this.startEventSystem();
      console.log('[地图系统] 初始化完成');
    } catch (error) {
      console.error('[地图系统] 初始化失败:', error);
    }
  }

  /**
   * 初始化默认地点
   */
  private initializeDefaultLocations() {
    // 添加一些默认的起始地点
    const defaultLocations: LocationInfo[] = [
      {
        id: 'newbie_village',
        name: '新手村',
        description: '修仙者的起始之地，这里聚集着刚刚踏入修仙之路的年轻人。',
        type: AreaType.VILLAGE,
        coordinates: { x: 0, y: 0 },
        region: '凡人界',
        visitCount: 0,
        safetyLevel: 9,
        spiritualEnergy: 3,
        climate: '温和',
        terrain: '平原',
        resources: ['草药', '矿石'],
        npcs: ['村长', '药师', '武器商'],
        shops: ['杂货店', '药店'],
        facilities: ['客栈', '练功场'],
        connections: [
          {
            locationId: 'mystic_forest',
            distance: 5,
            travelTime: 30,
            difficulty: 3,
            description: '通往神秘森林的小径'
          },
          {
            locationId: 'riverside_town',
            distance: 10,
            travelTime: 60,
            difficulty: 2,
            description: '沿河而建的小镇'
          }
        ],
        events: []
      },
      {
        id: 'mystic_forest',
        name: '神秘森林',
        description: '充满灵气的古老森林，传说中有珍贵的草药和危险的妖兽。',
        type: AreaType.FOREST,
        coordinates: { x: 5, y: 3 },
        region: '凡人界',
        visitCount: 0,
        safetyLevel: 5,
        spiritualEnergy: 6,
        climate: '潮湿',
        terrain: '森林',
        resources: ['灵草', '妖兽材料'],
        connections: [
          {
            locationId: 'newbie_village',
            distance: 5,
            travelTime: 30,
            difficulty: 3,
            description: '返回新手村的路径'
          }
        ],
        events: [
          {
            id: 'herb_gathering',
            name: '草药采集',
            description: '在森林中寻找珍贵的草药',
            type: '随机遇',
            status: '未触发',
            conditions: { probability: 0.3 },
            rewards: { items: ['灵草'], experience: 10 }
          }
        ]
      },
      {
        id: 'riverside_town',
        name: '河边小镇',
        description: '依河而建的繁华小镇，商贾云集，是重要的贸易枢纽。',
        type: AreaType.CITY,
        coordinates: { x: -8, y: -5 },
        region: '凡人界',
        visitCount: 0,
        safetyLevel: 8,
        spiritualEnergy: 4,
        climate: '温和',
        terrain: '平原',
        resources: ['鱼类', '丝绸'],
        npcs: ['商会会长', '船夫', '渔夫'],
        shops: ['商会', '渔具店', '布店'],
        facilities: ['码头', '仓库', '拍卖行'],
        connections: [
          {
            locationId: 'newbie_village',
            distance: 10,
            travelTime: 60,
            difficulty: 2,
            description: '通向新手村的主路'
          }
        ],
        events: []
      }
    ];

    defaultLocations.forEach(location => {
      if (!this.locations.has(location.id)) {
        this.locations.set(location.id, location);
      }
    });

    // 设置默认起始位置
    if (!this.mapState.currentLocation) {
      this.mapState.currentLocation = 'newbie_village';
      this.mapState.discoveredLocations.add('newbie_village');
      this.mapState.visitedLocations.add('newbie_village');
    }
  }

  /**
   * 移动到指定位置
   */
  public async travelTo(locationId: string, options: Partial<TravelOptions> = {}): Promise<boolean> {
    try {
      const targetLocation = this.locations.get(locationId);
      if (!targetLocation) {
        toast.error('目标地点不存在');
        return false;
      }

      const currentLocation = this.locations.get(this.mapState.currentLocation);
      if (!currentLocation) {
        toast.error('当前位置信息丢失');
        return false;
      }

      // 检查是否可以到达
      if (!this.canTravelTo(currentLocation, targetLocation)) {
        toast.error('无法到达该地点');
        return false;
      }

      // 检查访问权限
      if (!this.checkAccessRequirements(targetLocation)) {
        return false;
      }

      // 执行旅行
      const success = await this.executeTravelAction(currentLocation, targetLocation, options);
      
      if (success) {
        // 更新位置状态
        this.updateLocationState(locationId);
        
        // 触发位置事件
        this.triggerLocationEvents(targetLocation);
        
        toast.success(`已到达 ${targetLocation.name}`);
      }

      return success;

    } catch (error) {
      console.error('[地图系统] 旅行失败:', error);
      toast.error('旅行过程中发生错误');
      return false;
    }
  }

  /**
   * 发现新地点
   */
  public discoverLocation(locationId: string, autoAdd: boolean = false): boolean {
    try {
      let location = this.locations.get(locationId);
      
      if (!location && autoAdd) {
        // 自动生成新地点
        location = this.generateRandomLocation(locationId);
        this.locations.set(locationId, location);
      }

      if (!location) {
        return false;
      }

      if (!this.mapState.discoveredLocations.has(locationId)) {
        this.mapState.discoveredLocations.add(locationId);
        location.discoveredAt = new Date().toISOString();
        
        toast.success(`发现新地点: ${location.name}`);
        this.saveMapData();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[地图系统] 发现地点失败:', error);
      return false;
    }
  }

  /**
   * 获取当前位置信息
   */
  public getCurrentLocation(): LocationInfo | null {
    return this.locations.get(this.mapState.currentLocation) || null;
  }

  /**
   * 获取可到达的地点列表
   */
  public getReachableLocations(): LocationInfo[] {
    const currentLocation = this.getCurrentLocation();
    if (!currentLocation) return [];

    const reachable: LocationInfo[] = [];
    
    currentLocation.connections.forEach(conn => {
      const location = this.locations.get(conn.locationId);
      if (location && this.mapState.discoveredLocations.has(conn.locationId)) {
        reachable.push(location);
      }
    });

    return reachable;
  }

  /**
   * 搜索地点
   */
  public searchLocations(query: string): LocationInfo[] {
    const results: LocationInfo[] = [];
    const lowerQuery = query.toLowerCase();

    for (const location of this.locations.values()) {
      if (this.mapState.discoveredLocations.has(location.id)) {
        if (location.name.toLowerCase().includes(lowerQuery) ||
            location.description.toLowerCase().includes(lowerQuery) ||
            location.region.toLowerCase().includes(lowerQuery)) {
          results.push(location);
        }
      }
    }

    return results;
  }

  /**
   * 获取地图统计信息
   */
  public getMapStats(): {
    totalLocations: number;
    discoveredLocations: number;
    visitedLocations: number;
    currentRegion: string;
    explorationRate: number;
  } {
    const currentLocation = this.getCurrentLocation();
    
    return {
      totalLocations: this.locations.size,
      discoveredLocations: this.mapState.discoveredLocations.size,
      visitedLocations: this.mapState.visitedLocations.size,
      currentRegion: currentLocation?.region || '未知',
      explorationRate: this.mapState.discoveredLocations.size / this.locations.size,
    };
  }

  /**
   * 启动事件系统
   */
  private startEventSystem() {
    // 每分钟检查一次事件
    setInterval(() => {
      this.processLocationEvents();
    }, 60000);
  }

  /**
   * 处理位置事件
   */
  private processLocationEvents() {
    const currentLocation = this.getCurrentLocation();
    if (!currentLocation) return;

    currentLocation.events?.forEach(event => {
      if (event.status === '未触发' && this.shouldTriggerEvent(event)) {
        this.triggerEvent(event);
      } else if (event.status === '冷却中' && this.isEventCooldownOver(event)) {
        event.status = '未触发';
      }
    });
  }

  /**
   * 判断是否应该触发事件
   */
  private shouldTriggerEvent(event: LocationEvent): boolean {
    if (!event.conditions) return true;

    const { probability = 1, maxVisitCount } = event.conditions;
    const currentLocation = this.getCurrentLocation();

    // 检查访问次数限制
    if (maxVisitCount && currentLocation && currentLocation.visitCount > maxVisitCount) {
      return false;
    }

    // 检查概率
    return Math.random() < probability;
  }

  /**
   * 触发事件
   */
  private triggerEvent(event: LocationEvent) {
    event.status = '进行中';
    this.mapState.activeEvents.set(event.id, event);
    
    toast.info(`触发事件: ${event.name}`);
    console.log('[地图事件]', event.description);
  }

  /**
   * 检查事件冷却是否结束
   */
  private isEventCooldownOver(event: LocationEvent): boolean {
    if (!event.cooldownUntil) return true;
    return new Date() > new Date(event.cooldownUntil);
  }

  /**
   * 触发位置事件
   */
  private triggerLocationEvents(location: LocationInfo) {
    // 到达新地点时触发的事件处理
    location.events?.forEach(event => {
      if (event.type === '触发' && event.status === '未触发') {
        this.triggerEvent(event);
      }
    });
  }

  /**
   * 更新位置状态
   */
  private updateLocationState(locationId: string) {
    const prevLocationId = this.mapState.currentLocation;
    
    // 更新当前位置
    this.mapState.currentLocation = locationId;
    this.mapState.visitedLocations.add(locationId);
    this.mapState.discoveredLocations.add(locationId);

    // 更新位置访问信息
    const location = this.locations.get(locationId);
    if (location) {
      location.visitCount++;
      location.lastVisitTime = new Date().toISOString();
    }

    // 记录旅行历史
    if (prevLocationId && prevLocationId !== locationId) {
      this.mapState.travelHistory.push({
        from: prevLocationId,
        to: locationId,
        timestamp: new Date().toISOString(),
        method: '步行' // 默认方法
      });

      // 限制历史记录数量
      if (this.mapState.travelHistory.length > 100) {
        this.mapState.travelHistory = this.mapState.travelHistory.slice(-100);
      }
    }

    // 同步到游戏状态管理器
    if (location) {
      GameStateManager.updateLocation({
        description: location.name,
        coordinates: location.coordinates,
        area: location.region,
        region: location.subRegion || location.region,
        safety_level: location.safetyLevel,
        spiritual_energy: location.spiritualEnergy,
      });
    }

    // 自动保存
    if (this.autoSave) {
      this.saveMapData();
    }
  }

  /**
   * 检查是否可以旅行到目标地点
   */
  private canTravelTo(from: LocationInfo, to: LocationInfo): boolean {
    // 检查是否有直接连接
    const hasConnection = from.connections.some(conn => conn.locationId === to.id);
    if (hasConnection) return true;

    // 检查是否已发现目标地点
    if (!this.mapState.discoveredLocations.has(to.id)) {
      return false;
    }

    // 检查距离是否合理（简单的距离检查）
    const distance = this.calculateDistance(from.coordinates, to.coordinates);
    return distance <= 100; // 最大直接移动距离
  }

  /**
   * 检查访问权限
   */
  private checkAccessRequirements(location: LocationInfo): boolean {
    if (!location.accessRequirements) return true;

    const { minRealm, minLevel, items, tokens } = location.accessRequirements;

    // 这里需要与游戏状态管理器集成检查具体条件
    // 简化实现
    if (minRealm || minLevel || items || tokens) {
      console.log('检查访问权限:', location.accessRequirements);
      // 暂时都返回true，实际需要根据玩家状态判断
    }

    return true;
  }

  /**
   * 执行旅行动作
   */
  private async executeTravelAction(
    from: LocationInfo, 
    to: LocationInfo, 
    options: Partial<TravelOptions>
  ): Promise<boolean> {
    const connection = from.connections.find(conn => conn.locationId === to.id);
    const travelTime = connection?.travelTime || this.calculateTravelTime(from, to);
    
    // 如果不是快速旅行，显示旅行过程
    if (!options.fast) {
      toast.info(`正在前往 ${to.name}，预计需要 ${travelTime} 分钟...`);
      
      // 模拟旅行时间（实际可以做成真实的时间等待）
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return true;
  }

  /**
   * 生成随机地点
   */
  private generateRandomLocation(locationId: string): LocationInfo {
    const types = Object.values(AreaType);
    const climates = ['温和', '炎热', '寒冷', '潮湿', '干燥'] as const;
    const terrains = ['平原', '丘陵', '山地', '森林', '水域', '沙漠'] as const;

    return {
      id: locationId,
      name: `未知地点${locationId.slice(-4)}`,
      description: '一个神秘的地方，等待探索。',
      type: types[Math.floor(Math.random() * types.length)],
      coordinates: {
        x: Math.floor(Math.random() * 200) - 100,
        y: Math.floor(Math.random() * 200) - 100,
      },
      region: '未知区域',
      visitCount: 0,
      safetyLevel: Math.floor(Math.random() * 10) + 1,
      spiritualEnergy: Math.floor(Math.random() * 10) + 1,
      climate: climates[Math.floor(Math.random() * climates.length)],
      terrain: terrains[Math.floor(Math.random() * terrains.length)],
      connections: [],
      events: [],
    };
  }

  /**
   * 计算两点间距离
   */
  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const dx = coord1.x - coord2.x;
    const dy = coord1.y - coord2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算旅行时间
   */
  private calculateTravelTime(from: LocationInfo, to: LocationInfo): number {
    const distance = this.calculateDistance(from.coordinates, to.coordinates);
    return Math.max(5, Math.floor(distance * 5)); // 最少5分钟
  }

  /**
   * 保存地图数据
   */
  private saveMapData() {
    try {
      const mapData = {
        locations: Array.from(this.locations.entries()),
        regions: Array.from(this.regions.entries()),
        mapState: {
          ...this.mapState,
          visitedLocations: Array.from(this.mapState.visitedLocations),
          discoveredLocations: Array.from(this.mapState.discoveredLocations),
          activeEvents: Array.from(this.mapState.activeEvents.entries()),
        },
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('game-map-system', JSON.stringify(mapData));
    } catch (error) {
      console.error('[地图系统] 保存失败:', error);
    }
  }

  /**
   * 加载地图数据
   */
  private async loadMapData() {
    try {
      const stored = localStorage.getItem('game-map-system');
      if (stored) {
        const mapData = JSON.parse(stored);
        
        // 恢复locations
        if (mapData.locations) {
          this.locations = new Map(mapData.locations);
        }
        
        // 恢复regions
        if (mapData.regions) {
          this.regions = new Map(mapData.regions);
        }
        
        // 恢复mapState
        if (mapData.mapState) {
          this.mapState = {
            ...mapData.mapState,
            visitedLocations: new Set(mapData.mapState.visitedLocations || []),
            discoveredLocations: new Set(mapData.mapState.discoveredLocations || []),
            activeEvents: new Map(mapData.mapState.activeEvents || []),
          };
        }

        console.log('[地图系统] 从本地存储加载完成');
      }
    } catch (error) {
      console.error('[地图系统] 加载失败:', error);
    }
  }

  /**
   * 重置地图系统
   */
  public resetMapSystem() {
    this.locations.clear();
    this.regions.clear();
    this.mapState = {
      currentLocation: '',
      visitedLocations: new Set(),
      discoveredLocations: new Set(),
      activeEvents: new Map(),
      travelHistory: [],
    };
    
    localStorage.removeItem('game-map-system');
    this.initializeDefaultLocations();
    toast.success('地图系统已重置');
  }
}

// 导出单例实例
export const MapSystem = new MapSystemClass();

export default MapSystem;