/**
 * @fileoverview 世界数据迁移工具
 * 将旧的酒馆变量中的世界数据迁移到新的character.saveData.世界信息中
 */

import { getTavernHelper } from './tavern';
import type { WorldInfo, WorldContinent, WorldFaction, WorldLocation, WorldGenerationInfo } from '@/types/game.d';

// 定义旧数据结构类型
type LegacyContinent = Partial<{
  name: string;
  名称: string;
  description: string;
  描述: string;
  geography: string[];
  地理特征: string[];
  cultivation_environment: string;
  修真环境: string;
}>;

type LegacyFaction = Partial<{
  name: string;
  名称: string;
  type: string;
  类型: string;
  level: string;
  等级: string;
  location: string;
  位置: string;
  territory: string[];
  势力范围: string[];
  description: string;
  描述: string;
  features: string;
  特色: string;
  power_assessment: string;
  实力评估: string;
  player_relationship: string;
  与玩家关系: string;
  reputation: number;
  声望值: number;
}>;

type LegacyLocation = Partial<{
  name: string;
  名称: string;
  type: string;
  类型: string;
  position: string;
  位置: string;
  description: string;
  描述: string;
  features: string;
  特色: string;
  safety_level: string;
  安全等级: string;
  status: string;
  开放状态: string;
  related_factions: string[];
  相关势力: string[];
  special_functions: string[];
  特殊功能: string[];
}>;

type LegacyGenerationInfo = Partial<{
  world_name: string;
  world_background: string;
  generation_time: string;
  world_era: string;
  main_conflicts: string[];
  special_settings: string[];
}>;

type SaveData = {
  世界信息?: WorldInfo;
  [key: string]: any;
};


/**
 * 世界数据迁移器
 */
export class WorldDataMigrator {
  /**
   * 检查是否需要迁移数据
   */
  static async needsMigration(): Promise<{ needed: boolean; hasLegacyData: boolean; hasNewData: boolean }> {
    const tavern = getTavernHelper();
    if (!tavern) {
      throw new Error('酒馆连接不可用');
    }

    const chatVars = await tavern.getVariables({ type: 'chat' });
    
    // 检查是否有旧数据
    const hasLegacyData = !!(
      chatVars['world_continents'] || 
      chatVars['world_factions'] || 
      chatVars['world_locations'] || 
      chatVars['world_generation_info']
    );

    // 检查是否有新数据
    const saveData = chatVars['character.saveData'] as SaveData | undefined;
    const hasNewData = !!(saveData?.世界信息);

    return {
      needed: hasLegacyData && !hasNewData,
      hasLegacyData,
      hasNewData
    };
  }

  /**
   * 执行数据迁移
   */
  static async migrateData(): Promise<{ success: boolean; message: string; worldInfo?: WorldInfo }> {
    try {
      const tavern = getTavernHelper();
      if (!tavern) {
        throw new Error('酒馆连接不可用');
      }

      console.log('[世界数据迁移] 开始执行数据迁移...');
      
      const chatVars = await tavern.getVariables({ type: 'chat' });
      
      // 检查当前状态
      const migrationStatus = await this.needsMigration();
      if (!migrationStatus.needed) {
        return {
          success: false,
          message: migrationStatus.hasNewData ? '新数据已存在，无需迁移' : '未找到旧数据，无需迁移'
        };
      }

      // 提取旧格式数据
      const legacyContinents: LegacyContinent[] = (chatVars['world_continents'] as LegacyContinent[]) || [];
      const legacyFactions: LegacyFaction[] = (chatVars['world_factions'] as LegacyFaction[]) || [];
      const legacyLocations: LegacyLocation[] = (chatVars['world_locations'] as LegacyLocation[]) || [];
      const legacyGenerationInfo: LegacyGenerationInfo = (chatVars['world_generation_info'] as LegacyGenerationInfo) || {};

      console.log('[世界数据迁移] 找到旧数据:', {
        continents: legacyContinents.length,
        factions: legacyFactions.length,
        locations: legacyLocations.length,
        generationInfo: Object.keys(legacyGenerationInfo).length > 0
      });

      // 转换为新格式
      const worldInfo: WorldInfo = {
        世界名称: legacyGenerationInfo.world_name || '修仙界',
        世界背景: legacyGenerationInfo.world_background || '',
        大陆信息: legacyContinents.map((continent): WorldContinent => ({
          名称: continent.name || continent.名称 || '未命名大陆',
          描述: continent.description || continent.描述 || '',
          地理特征: continent.geography || continent.地理特征 || [],
          修真环境: continent.cultivation_environment || continent.修真环境 || ''
        })),
        势力信息: legacyFactions.map((faction): WorldFaction => ({
          名称: faction.name || faction.名称 || '未命名势力',
          类型: faction.type || faction.类型 || '中立宗门',
          等级: faction.level || faction.等级 || '三流',
          位置: faction.location || faction.位置 || '未知',
          势力范围: faction.territory || faction.势力范围 || [],
          描述: faction.description || faction.描述 || '',
          特色: faction.features || faction.特色 || '',
          实力评估: faction.power_assessment || faction.实力评估 || '',
          与玩家关系: faction.player_relationship || faction.与玩家关系 || '中立',
          声望值: faction.reputation || faction.声望值 || 0
        })),
        地点信息: legacyLocations.map((location): WorldLocation => ({
          名称: location.name || location.名称 || '未命名地点',
          类型: location.type || location.类型 || '其他',
          位置: location.position || location.位置 || '未知',
          描述: location.description || location.描述 || '',
          特色: location.features || location.特色 || '',
          安全等级: location.safety_level || location.安全等级 || '较安全',
          开放状态: location.status || location.开放状态 || '开放',
          相关势力: location.related_factions || location.相关势力 || [],
          特殊功能: location.special_functions || location.特殊功能 || []
        })),
        生成信息: {
          生成时间: legacyGenerationInfo.generation_time || new Date().toISOString(),
          世界背景: legacyGenerationInfo.world_background || '',
          世界纪元: legacyGenerationInfo.world_era || '修仙纪元',
          特殊设定: legacyGenerationInfo.special_settings || [],
          版本: '1.0-migrated'
        }
      };

      // 获取当前的存档数据
      const saveData = chatVars['character.saveData'] as SaveData | undefined;
      if (!saveData) {
        return {
          success: false,
          message: '未找到character.saveData，无法执行迁移。请先创建或加载角色存档。'
        };
      }

      // 更新存档数据
      saveData.世界信息 = worldInfo;
      
      // 保存更新后的数据
      await tavern.insertOrAssignVariables({
        'character.saveData': saveData
      }, { type: 'chat' });

      console.log('[世界数据迁移] 数据迁移完成，新的世界信息:', worldInfo);

      return {
        success: true,
        message: `数据迁移成功！已将 ${legacyContinents.length} 个大陆、${legacyFactions.length} 个势力、${legacyLocations.length} 个地点迁移到新架构。`,
        worldInfo
      };

    } catch (error) {
      console.error('[世界数据迁移] 迁移过程出错:', error);
      return {
        success: false,
        message: `迁移失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 清理旧的数据（在确认迁移成功后调用）
   */
  static async cleanupLegacyData(): Promise<{ success: boolean; message: string }> {
    try {
      const tavern = getTavernHelper();
      if (!tavern) {
        throw new Error('酒馆连接不可用');
      }

      console.log('[世界数据迁移] 开始清理旧数据...');

      // 删除旧的变量
      const chatVars = await tavern.getVariables({ type: 'chat' });
      
      // 创建一个没有旧世界数据的副本
      const cleanedVars = { ...chatVars };
      delete cleanedVars['world_continents'];
      delete cleanedVars['world_factions'];  
      delete cleanedVars['world_locations'];
      delete cleanedVars['world_generation_info'];

      // 重新设置所有变量（这将删除不存在的变量）
      await tavern.insertOrAssignVariables(cleanedVars, { type: 'chat' });

      console.log('[世界数据迁移] 旧数据清理完成');

      return {
        success: true,
        message: '旧数据清理完成'
      };

    } catch (error) {
      console.error('[世界数据迁移] 清理旧数据时出错:', error);
      return {
        success: false,
        message: `清理失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 一键迁移（包含迁移和清理）
   */
  static async performFullMigration(): Promise<{ success: boolean; message: string; worldInfo?: WorldInfo }> {
    // 先执行迁移
    const migrationResult = await this.migrateData();
    
    if (!migrationResult.success) {
      return migrationResult;
    }

    // 迁移成功后，清理旧数据
    const cleanupResult = await this.cleanupLegacyData();
    
    return {
      success: true,
      message: `${migrationResult.message}\n${cleanupResult.message}`,
      worldInfo: migrationResult.worldInfo
    };
  }
}

/**
 * 便捷的迁移检查和执行函数
 */
export async function checkAndMigrateWorldData(autoMigrate = false): Promise<{
  needed: boolean;
  migrated: boolean;
  message: string;
  worldInfo?: WorldInfo;
}> {
  try {
    const status = await WorldDataMigrator.needsMigration();
    
    if (!status.needed) {
      return {
        needed: false,
        migrated: false,
        message: status.hasNewData ? '世界数据已使用新架构' : '未找到需要迁移的数据'
      };
    }

    if (!autoMigrate) {
      return {
        needed: true,
        migrated: false,
        message: '检测到旧格式的世界数据，建议执行迁移'
      };
    }

    // 自动执行迁移
    const result = await WorldDataMigrator.performFullMigration();
    
    return {
      needed: true,
      migrated: result.success,
      message: result.message,
      worldInfo: result.worldInfo
    };

  } catch (error) {
    return {
      needed: false,
      migrated: false,
      message: `检查迁移状态失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}