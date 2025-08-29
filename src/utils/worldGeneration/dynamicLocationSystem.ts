/**
 * @fileoverview 动态位置生成系统
 * 用于在游戏对话中动态生成新的地点、势力和位置，并自动同步到地图显示
 */

import { getTavernHelper } from '../tavern';
import { toast } from '../toast';

/**
 * 动态地点接口
 */
export interface DynamicLocation {
  id: string;
  name: string;
  type: 'small_sect' | 'village' | 'cave' | 'ruin' | 'shrine' | 'market' | 'hideout';
  coordinates: { x: number; y: number };
  description: string;
  importance: number;      // 1-10重要性等级
  controlledBy?: string;   // 控制势力
  discoveredBy: string;    // 发现者
  discoveryContext: string; // 发现背景
  features: string[];      // 特色功能
  npcCount?: number;       // NPC数量
  dangerLevel?: number;    // 危险等级 1-10
  resources?: string[];    // 可用资源
  secrets?: string[];      // 隐藏秘密
  createdAt: string;       // 创建时间
  lastUpdated: string;     // 最后更新时间
}

/**
 * 动态势力接口
 */
export interface DynamicFaction {
  id: string;
  name: string;
  type: 'small_sect' | 'bandit_group' | 'merchant_family' | 'scholar_circle' | 'secret_society';
  strength: number;        // 实力等级 1-100
  territory: string;       // 势力范围描述
  description: string;     // 详细描述
  philosophy: string;      // 核心理念
  specialties: string[];   // 专长领域
  leaders: Array<{
    name: string;
    title: string;
    realm: string;
    personality: string[];
  }>;
  members: number;         // 成员数量
  relationships: { [factionId: string]: string }; // 与其他势力关系
  resources: {
    disciples: number;
    wealth: number;
    artifacts: string[];
    techniques: string[];
  };
  currentGoals: string[];  // 当前目标
  foundedBy: string;       // 创建者
  foundationStory: string; // 建立故事
  color: string;           // 地图显示颜色
  emblem: string;          // 势力标志
  createdAt: string;
  lastUpdated: string;
}

/**
 * AI指令模板 - 用于指导AI如何生成动态位置
 */
export const DYNAMIC_LOCATION_TEMPLATES = {
  small_sect: {
    namePatterns: ['${prefix}宗', '${prefix}派', '${prefix}堂', '${prefix}院'],
    descriptionTemplate: '一个新兴的小型修炼宗门，以${specialty}见长，虽然规模不大但${uniqueFeature}',
    typicalMembers: '10-50人',
    commonSpecialties: ['炼丹', '制符', '阵法', '剑术', '医道', '驯兽'],
    locationTypes: ['山洞', '古庙改建', '废弃庄园', '隐蔽山谷'],
    requiredFields: ['name', 'specialty', 'leader', 'foundationReason']
  },
  village: {
    namePatterns: ['${prefix}村', '${prefix}庄', '${prefix}镇', '${prefix}坞'],
    descriptionTemplate: '一个${size}的村落，居住着${population}，以${mainTrade}为生，${specialFeature}',
    typicalPopulation: '50-500人',
    commonTrades: ['农耕', '渔猎', '手工艺', '药材采集', '矿石开采'],
    locationTypes: ['山谷', '河畔', '林间', '平原'],
    requiredFields: ['name', 'population', 'mainTrade', 'specialFeature']
  },
  cave: {
    namePatterns: ['${prefix}洞', '${prefix}窟', '${prefix}穴'],
    descriptionTemplate: '一处${type}洞穴，${environment}，传说${legend}，${currentState}',
    commonTypes: ['天然', '人工', '古老', '神秘'],
    environments: ['阴暗潮湿', '灵气充沛', '机关重重', '宝光闪闪'],
    requiredFields: ['name', 'type', 'legend', 'currentState']
  }
};

/**
 * 动态位置生成系统
 */
export class DynamicLocationSystem {
  private static instance: DynamicLocationSystem;
  
  private constructor() {}
  
  static getInstance(): DynamicLocationSystem {
    if (!DynamicLocationSystem.instance) {
      DynamicLocationSystem.instance = new DynamicLocationSystem();
    }
    return DynamicLocationSystem.instance;
  }

  /**
   * 为AI生成位置生成指南
   */
  generateLocationCreationGuide(): string {
    return `
# 🗺️ 动态位置生成指南

当玩家在对话中提到或发现新的地点时，你可以使用以下JSON格式来创建新的位置：

## 📍 小型宗门创建示例
\`\`\`json
{
  "tavern_commands": [
    {
      "action": "add_to_array",
      "scope": "chat", 
      "key": "dynamic_locations",
      "value": {
        "id": "sect_\${timestamp}",
        "name": "青莲小筑",
        "type": "small_sect",
        "coordinates": {"x": 450, "y": 350},
        "description": "一个新兴的炼丹宗门，专注于药理研究，虽然规模不大但丹药品质上乘",
        "importance": 4,
        "controlledBy": "青莲小筑",
        "discoveredBy": "玩家角色名",
        "discoveryContext": "在寻找灵药时意外发现",
        "features": ["炼丹房", "药园", "藏书阁"],
        "npcCount": 15,
        "dangerLevel": 2,
        "resources": ["灵药", "丹方", "炼丹师"],
        "createdAt": "当前时间"
      }
    },
    {
      "action": "add_to_array",
      "scope": "chat",
      "key": "dynamic_factions", 
      "value": {
        "id": "青莲小筑",
        "name": "青莲小筑",
        "type": "small_sect",
        "strength": 25,
        "territory": "青莲山一带",
        "description": "专注炼丹的小型宗门",
        "philosophy": "以药济世，炼丹修心",
        "specialties": ["炼丹术", "药理学", "医道"],
        "leaders": [{
          "name": "药王长老",
          "title": "筑主",
          "realm": "金丹期",
          "personality": ["谨慎", "博学", "慈祥"]
        }],
        "members": 15,
        "resources": {
          "disciples": 15,
          "wealth": 30,
          "artifacts": ["青莲丹炉"],
          "techniques": ["青莲丹经"]
        },
        "currentGoals": ["扩大药园", "招收弟子"],
        "foundedBy": "药王长老",
        "foundationStory": "为了研究失传的古代丹方而建立",
        "color": "#16A34A",
        "emblem": "莲",
        "createdAt": "当前时间"
      }
    }
  ]
}
\`\`\`

## 🏘️ 村落创建示例
\`\`\`json
{
  "tavern_commands": [
    {
      "action": "add_to_array",
      "scope": "chat",
      "key": "dynamic_locations", 
      "value": {
        "id": "village_\${timestamp}",
        "name": "桃花村",
        "type": "village",
        "coordinates": {"x": 300, "y": 400},
        "description": "一个安静的小村庄，村民以种植桃花和酿制桃花酒闻名",
        "importance": 3,
        "discoveredBy": "玩家角色名",
        "discoveryContext": "路过时被桃花香吸引",
        "features": ["桃花林", "酒坊", "客栈"],
        "npcCount": 80,
        "dangerLevel": 1,
        "resources": ["桃花酒", "新鲜桃子", "民间消息"],
        "createdAt": "当前时间"
      }
    }
  ]
}
\`\`\`

## 🏴‍☠️ 注意事项
1. 所有新位置都必须有合理的发现背景
2. 坐标范围：x(50-1150), y(50-750) 
3. 重要性等级：1(微不足道) - 10(极其重要)
4. 危险等级：1(安全) - 10(极度危险)
5. 新创建的势力需要与现有势力有合理的关系设定

## 🎯 使用时机
- 玩家探索时发现新地点
- 对话中提到某个之前不存在的地方
- 剧情需要时临时创建背景地点
- 玩家询问某个地方的具体信息时

记住：创建的位置要符合当前世界观，与现有势力格局协调！
`;
  }

  /**
   * 监听并处理动态生成的位置数据
   */
  async watchForDynamicLocations(callback: (locations: DynamicLocation[], factions: DynamicFaction[]) => void): Promise<void> {
    const tavern = getTavernHelper();
    if (!tavern) {
      console.error('[动态位置系统] 酒馆系统不可用');
      return;
    }

    try {
      // 获取动态位置数据
      const variables = await tavern.getVariables({ type: 'chat' });
      const dynamicLocations = variables['dynamic_locations'] || [];
      const dynamicFactions = variables['dynamic_factions'] || [];

      console.log(`[动态位置系统] 发现 ${dynamicLocations.length} 个动态位置，${dynamicFactions.length} 个动态势力`);
      
      // 处理和验证数据
      const validLocations = this.validateLocations(dynamicLocations);
      const validFactions = this.validateFactions(dynamicFactions);

      // 回调更新
      callback(validLocations, validFactions);

    } catch (error) {
      console.error('[动态位置系统] 监听失败:', error);
    }
  }

  /**
   * 手动添加新位置（用于测试或GM工具）
   */
  async addLocationManually(location: Partial<DynamicLocation>): Promise<boolean> {
    const tavern = getTavernHelper();
    if (!tavern) {
      toast.error('酒馆系统不可用');
      return false;
    }

    try {
      // 补全必要字段
      const completeLocation: DynamicLocation = {
        id: location.id || `manual_${Date.now()}`,
        name: location.name || '未命名地点',
        type: location.type || 'village',
        coordinates: location.coordinates || this.generateRandomCoordinates(),
        description: location.description || '一个神秘的新地点',
        importance: location.importance || 3,
        discoveredBy: location.discoveredBy || '系统',
        discoveryContext: location.discoveryContext || '手动添加',
        features: location.features || [],
        npcCount: location.npcCount || 10,
        dangerLevel: location.dangerLevel || 1,
        resources: location.resources || [],
        secrets: location.secrets || [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // 获取现有位置列表
      const variables = await tavern.getVariables({ type: 'chat' });
      const existingLocations = variables['dynamic_locations'] || [];
      
      // 添加新位置
      existingLocations.push(completeLocation);
      
      // 保存回酒馆
      await tavern.insertOrAssignVariables({
        'dynamic_locations': existingLocations
      }, { type: 'chat' });

      toast.success(`新位置 "${completeLocation.name}" 已添加到世界`);
      console.log('[动态位置系统] 手动添加位置:', completeLocation);
      
      return true;

    } catch (error) {
      console.error('[动态位置系统] 添加位置失败:', error);
      toast.error('添加位置失败');
      return false;
    }
  }

  /**
   * 清理过期的动态位置
   */
  async cleanupExpiredLocations(): Promise<void> {
    const tavern = getTavernHelper();
    if (!tavern) return;

    try {
      const variables = await tavern.getVariables({ type: 'chat' });
      const locations = variables['dynamic_locations'] || [];
      const factions = variables['dynamic_factions'] || [];
      
      const now = new Date();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天

      // 过滤掉过期的位置（可以根据需要调整逻辑）
      const validLocations = locations.filter((loc: DynamicLocation) => {
        const created = new Date(loc.createdAt);
        return (now.getTime() - created.getTime()) < maxAge;
      });

      const validFactions = factions.filter((fac: DynamicFaction) => {
        const created = new Date(fac.createdAt);
        return (now.getTime() - created.getTime()) < maxAge;
      });

      // 更新数据
      await tavern.insertOrAssignVariables({
        'dynamic_locations': validLocations,
        'dynamic_factions': validFactions
      }, { type: 'chat' });

      console.log(`[动态位置系统] 清理完成：位置 ${locations.length} -> ${validLocations.length}，势力 ${factions.length} -> ${validFactions.length}`);

    } catch (error) {
      console.error('[动态位置系统] 清理失败:', error);
    }
  }

  /**
   * 验证位置数据
   */
  private validateLocations(locations: any[]): DynamicLocation[] {
    return locations.filter(loc => {
      return loc.name && loc.type && loc.coordinates && 
             typeof loc.coordinates.x === 'number' && 
             typeof loc.coordinates.y === 'number';
    }).map(loc => ({
      ...loc,
      coordinates: {
        x: Math.max(50, Math.min(1150, loc.coordinates.x)),
        y: Math.max(50, Math.min(750, loc.coordinates.y))
      }
    }));
  }

  /**
   * 验证势力数据
   */
  private validateFactions(factions: any[]): DynamicFaction[] {
    return factions.filter(fac => {
      return fac.name && fac.type && typeof fac.strength === 'number';
    });
  }

  /**
   * 生成随机坐标
   */
  private generateRandomCoordinates(): { x: number; y: number } {
    return {
      x: Math.floor(Math.random() * 1000) + 100,
      y: Math.floor(Math.random() * 600) + 100
    };
  }

  /**
   * 获取位置类型的显示信息
   */
  getLocationTypeInfo(type: string) {
    const typeInfo = {
      'small_sect': { icon: '🏛️', color: '#7C3AED', name: '小宗门' },
      'village': { icon: '🏘️', color: '#059669', name: '村落' },
      'cave': { icon: '🕳️', color: '#6B7280', name: '洞穴' },
      'ruin': { icon: '🏛️', color: '#9CA3AF', name: '遗迹' },
      'shrine': { icon: '⛩️', color: '#EC4899', name: '神祠' },
      'market': { icon: '🏪', color: '#F59E0B', name: '市集' },
      'hideout': { icon: '🏚️', color: '#DC2626', name: '据点' }
    };

    return typeInfo[type] || { icon: '📍', color: '#6B7280', name: '未知' };
  }

  /**
   * 导出世界数据（用于备份）
   */
  async exportWorldData(): Promise<string> {
    const tavern = getTavernHelper();
    if (!tavern) return '{}';

    try {
      const variables = await tavern.getVariables({ type: 'chat' });
      const worldData = {
        staticFactions: variables['world_factions'] || [],
        staticLocations: variables['world_locations'] || [],
        dynamicLocations: variables['dynamic_locations'] || [],
        dynamicFactions: variables['dynamic_factions'] || [],
        worldInfo: variables['world_generation_info'] || {},
        exportTime: new Date().toISOString()
      };

      return JSON.stringify(worldData, null, 2);
    } catch (error) {
      console.error('[动态位置系统] 导出失败:', error);
      return '{}';
    }
  }
}

// 全局实例
export const dynamicLocationSystem = DynamicLocationSystem.getInstance();