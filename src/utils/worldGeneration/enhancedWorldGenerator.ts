/**
 * 增强的世界生成器 - 集成数据校验和重试机制
 * 确保生成数据的质量和一致性
 */

import { getTavernHelper } from '../tavern';
import { EnhancedWorldPromptBuilder, type WorldPromptConfig } from './enhancedWorldPrompts';
import type { WorldInfo } from '@/types/game.d';
import { calculateSectData, type SectCalculationData } from './sectDataCalculator';
import { WorldMapConfig } from '@/types/worldMap';

// 重新定义 ValidationResult 接口，解除对外部文件的依赖
interface ValidationError {
  path: string;
  message: string;
  expected?: any;
  received?: any;
}
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

 interface RawWorldData {
   continents?: Record<string, any>[];
  factions?: Record<string, any>[];
  locations?: Record<string, any>[];
  [key: string]: any;
}

export interface EnhancedWorldGenConfig {
  worldName?: string;
  worldBackground?: string;
  worldEra?: string;
  factionCount: number;
  locationCount: number;
  secretRealmsCount: number;
  continentCount: number; // 新增大陆数量配置
  maxRetries: number;
  retryDelay: number;
  characterBackground?: string;
  mapConfig?: WorldMapConfig;
}

export class EnhancedWorldGenerator {
  private config: EnhancedWorldGenConfig;
  private previousErrors: string[] = [];
  
  constructor(config: EnhancedWorldGenConfig) {
    this.config = config;
  }
  
  /**
   * 生成验证过的世界数据 (重构后)
   */
  async generateValidatedWorld(): Promise<{ success: boolean; worldInfo?: WorldInfo; errors?: string[] }> {
    console.log('[增强世界生成器] 开始生成验证过的世界数据...');

    for (let i = 0; i <= this.config.maxRetries; i++) {
      try {
        if (i > 0) {
          console.log(`[增强世界生成器] 第 ${i} 次重试...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * i));

          // 重试时减少数量参数，降低token消耗和AI出错概率
          this.reduceCountsForRetry(i);
        }

        const worldData = await this.generateWorldData();
        const validationResult = this.validateWorldData(worldData);

        if (validationResult.isValid) {
          console.log('[增强世界生成器] 世界生成并验证成功！');
          return { success: true, worldInfo: worldData };
        } else {
          this.previousErrors = validationResult.errors.map(e => e.message);
          console.warn(`[增强世界生成器] 第 ${i} 次尝试验证失败:`, this.previousErrors);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[增强世界生成器] 第 ${i} 次尝试生成失败:`, message);
        this.previousErrors = [message];
      }
    }

    console.error('[增强世界生成器] 世界生成失败，已达最大重试次数。');
    return { success: false, errors: this.previousErrors };
  }

  /**
   * 重试时减少数量参数，降低token消耗
   * @param retryCount 当前重试次数
   */
  private reduceCountsForRetry(retryCount: number): void {
    // 每次重试减少约20%的数量
    const reductionFactor = 0.8;

    // 计算减少后的数量
    const factor = Math.pow(reductionFactor, retryCount);

    this.config.factionCount = Math.max(3, Math.floor(this.config.factionCount * factor));
    this.config.locationCount = Math.max(5, Math.floor(this.config.locationCount * factor));
    this.config.secretRealmsCount = Math.max(2, Math.floor(this.config.secretRealmsCount * factor));
    this.config.continentCount = Math.max(2, Math.floor(this.config.continentCount * factor));

    console.log(`[增强世界生成器] 重试 ${retryCount} 次后调整数量参数:`, {
      factionCount: this.config.factionCount,
      locationCount: this.config.locationCount,
      secretRealmsCount: this.config.secretRealmsCount,
      continentCount: this.config.continentCount
    });
  }
  
  /**
   * 生成世界数据 (重构后)
   */
  private async generateWorldData(): Promise<WorldInfo> {
    const tavern = getTavernHelper();
    if (!tavern) {
      throw new Error('酒馆系统不可用');
    }
    
    // 构建增强的提示词
    const prompt = this.buildPromptWithErrors();
    
    console.log('[增强世界生成器] 发送AI请求...');
    console.log('[增强世界生成器] 提示词长度:', prompt.length);

    try {
      // 使用 ordered_prompts 参数关闭世界书
      const orderedPrompts: Array<{ role: 'system' | 'user'; content: string }> = [
        {
          role: 'system',
          content: prompt
        }
      ];

      const response = await tavern.generateRaw({
        ordered_prompts: orderedPrompts,
        should_stream: false
      });
      
      console.log('[增强世界生成器] AI响应长度:', String(response).length);
      
      // 解析AI响应
      const worldData = this.parseAIResponse(String(response));
      
      // 转换为标准格式
      return this.convertToWorldInfo(worldData);
      
    } catch (error: unknown) {
      console.error('[增强世界生成器] AI请求失败:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`AI生成失败: ${message}`);
    }
  }

  /**
   * 构建带有错误修正信息的提示词
   */
  private buildPromptWithErrors(): string {
    const basePrompt = this.buildPrompt();
    if (this.previousErrors.length > 0) {
      const errorSection = `
---
请修正以下错误后重新生成:
${this.previousErrors.join('\n')}
---
`;
      return `${basePrompt}${errorSection}`;
    }
    return basePrompt;
  }
  
  /**
   * 构建基础提示词
   */
  private buildPrompt(): string {
      const { factionCount, locationCount, secretRealmsCount, continentCount, mapConfig } = this.config;
      
      const promptConfig: WorldPromptConfig = {
        factionCount,
        totalLocations: locationCount,
        secretRealms: secretRealmsCount,
        continentCount,
        characterBackground: this.config.characterBackground,
        worldBackground: this.config.worldBackground,
        worldEra: this.config.worldEra,
        worldName: this.config.worldName,
        mapConfig: mapConfig
      };
      
      return EnhancedWorldPromptBuilder.buildPrompt(promptConfig);
    }
  
  /**
   * 解析AI响应
   */
  private parseAIResponse(response: string): RawWorldData {
    console.log('[增强世界生成器] 开始解析AI响应...');
    console.log('[增强世界生成器] 响应前500字符:', response.substring(0, 500));
    
    try {
      // 多种JSON提取策略
      let jsonMatch = null;
      let jsonText = '';
      
      // 策略1: 寻找完整的JSON代码块
      jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
        console.log('[增强世界生成器] 使用策略1提取JSON');
      }
      
      // 策略2: 寻找包含factions和locations的JSON对象
      if (!jsonMatch) {
        jsonMatch = response.match(/(\{[\s\S]*?"factions"\s*:\s*\[[\s\S]*?"locations"\s*:\s*\[[\s\S]*?\})/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
          console.log('[增强世界生成器] 使用策略2提取JSON');
        }
      }
      
      // 策略3: 寻找任何JSON对象并检查是否包含必要字段
      if (!jsonMatch) {
        const jsonMatches = response.match(/\{[\s\S]*?\}/g);
        if (jsonMatches) {
          for (const match of jsonMatches) {
            try {
              const testParse = JSON.parse(match);
              if (testParse.factions || testParse.locations) {
                jsonText = match;
                console.log('[增强世界生成器] 使用策略3提取JSON');
                break;
              }
            } catch {
              continue;
            }
          }
        }
      }
      
      if (!jsonText) {
        console.error('[增强世界生成器] 无法从AI响应中提取JSON数据');
        console.error('[增强世界生成器] 完整响应:', response);
        throw new Error('无法解析AI响应中的JSON数据');
      }
      
      console.log('[增强世界生成器] 提取的JSON前200字符:', jsonText.substring(0, 200));
      
      const worldDataRaw = JSON.parse(jsonText);
      console.log('[增强世界生成器] JSON解析成功');
      console.log('[增强世界生成器] 解析出的数据结构:', {
        factions_count: worldDataRaw.factions?.length || 0,
        locations_count: worldDataRaw.locations?.length || 0,
        has_continents: !!worldDataRaw.continents
      });

      // 仅保留地图相关字段以节省Token与避免超限
      const worldData = {
        continents: Array.isArray(worldDataRaw.continents) ? worldDataRaw.continents : [],
        factions: Array.isArray(worldDataRaw.factions) ? worldDataRaw.factions : [],
        locations: Array.isArray(worldDataRaw.locations) ? worldDataRaw.locations : []
      };
      const droppedKeys = Object.keys(worldDataRaw).filter(k => !['continents','factions','locations'].includes(k));
      if (droppedKeys.length) {
        console.log('[增强世界生成器] 已丢弃非地图字段:', droppedKeys);
      }

      return worldData;
      
    } catch (error: unknown) {
      console.error('[增强世界生成器] JSON解析失败:', error);
      console.error('[增强世界生成器] 响应内容:', response);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`JSON解析失败: ${message}`);
    }
  }
  
  /**
   * 转换为标准WorldInfo格式
   */
  private convertToWorldInfo(rawData: RawWorldData): WorldInfo {
    return {
      世界名称: this.config.worldName || rawData.world_name || rawData.worldName || '修仙界',
      世界背景: rawData.world_background || rawData.worldBackground || this.config.worldBackground || '',
      大陆信息: (rawData.continents || []).map((continent: Record<string, any>) => ({
        名称: continent.名称 || continent.name || '未名大陆',
        描述: continent.描述 || continent.description || '一片神秘的修仙大陆，灵气充沛，势力林立',
        地理特征: continent.terrain_features || continent.地理特征 || [],
        修真环境: continent.cultivation_environment || continent.修真环境 || '灵气充沛，适宜修行',
        气候: continent.climate || continent.气候 || '四季分明，温和宜人',
        天然屏障: continent.natural_barriers || continent.天然屏障 || [],
        大洲边界: continent.continent_bounds || continent.大洲边界 || []
      })),
      势力信息: (rawData.factions || []).map((faction: Record<string, any>) => {
        // 计算声望与综合战力（若可）
        const calcInput: SectCalculationData = {
          名称: faction.name || faction.名称,
          类型: faction.type || faction.类型 || '修仙宗门',
          等级: faction.level || faction.等级 || '三流',
          宗主修为: faction.leadership?.宗主修为,
          最强修为: faction.leadership?.最强修为,
          长老数量: faction.memberCount?.byPosition?.长老 || 0,
          核心弟子数: faction.leadership?.核心弟子数,
          内门弟子数: faction.leadership?.内门弟子数,
          外门弟子数: faction.leadership?.外门弟子数
        };
        const calculated = calculateSectData(calcInput);

        return {
          名称: faction.name || faction.名称,
          类型: faction.type || faction.类型,
          等级: faction.level || faction.等级,
          位置: faction.location || faction.headquarters || faction.位置,
          势力范围: faction.territory || faction.territory_bounds || faction.势力范围 || [],
          描述: faction.description || faction.描述,
          特色: faction.specialties || faction.features || faction.特色 || [],
          与玩家关系: faction.player_relationship || faction.与玩家关系 || '中立',
          声望值: calculated.声望值,
          
          // 组织架构（如果AI返回了则映射并补充）
          leadership: faction.leadership ? {
            宗主: faction.leadership.宗主,
            宗主修为: faction.leadership.宗主修为,
            副宗主: faction.leadership.副宗主 ?? undefined,
            太上长老: faction.leadership.太上长老 ?? undefined,
            太上长老修为: faction.leadership.太上长老修为 ?? undefined,
            最强修为: faction.leadership.最强修为 || faction.leadership.宗主修为,
            综合战力: calculated.综合战力,
            核心弟子数: faction.leadership.核心弟子数,
            内门弟子数: faction.leadership.内门弟子数,
            外门弟子数: faction.leadership.外门弟子数
          } : undefined,
          
          // 成员统计（若存在则透传）
          memberCount: faction.memberCount ? {
            total: Number(faction.memberCount.total) || 0,
            byRealm: faction.memberCount.byRealm || {},
            byPosition: faction.memberCount.byPosition || {}
          } : undefined,

          // 势力范围详情（若存在）
          territoryInfo: faction.territoryInfo ? {
            controlledAreas: faction.territoryInfo.controlledAreas || [],
            influenceRange: faction.territoryInfo.influenceRange,
            strategicValue: faction.territoryInfo.strategicValue
          } : undefined,

          // 加入相关
          canJoin: faction.canJoin !== undefined ? !!faction.canJoin : true,
          joinRequirements: faction.joinRequirements || [],
          benefits: faction.benefits || []
        };
      }),
      地点信息: (rawData.locations || []).map((location: Record<string, any>) => ({
        名称: location.name || location.名称,
        类型: location.type || location.类型,
        位置: location.position || location.location || location.位置,
        coordinates: location.coordinates,
        描述: location.description || location.描述,
        特色: location.features || location.特色,
        安全等级: location.safety_level || location.danger_level || location.安全等级 || '较安全',
        开放状态: location.status || location.开放状态 || '开放',
        相关势力: location.related_factions || location.相关势力 || [],
        特殊功能: location.special_functions || location.特殊功能 || []
      })),
      // 扁平化生成信息
      生成时间: new Date().toISOString(),
      世界纪元: rawData.world_era || this.config.worldEra || '修仙纪元',
      特殊设定: rawData.special_settings || [],
      版本: '2.0-Enhanced'
    };
  }
  
  /**
   * 校验世界数据 (重构后)
   */
  private validateWorldData(worldInfo: WorldInfo): ValidationResult {
    console.log('[增强世界生成器] 开始校验世界数据...');
    
    const result: ValidationResult = { isValid: true, errors: [] };
    
    // 仅依赖自定义校验
    this.performCustomValidation(worldInfo, result);
    
    if (!result.isValid) {
      // 记录错误，用于下次重试时的提示词优化
      this.previousErrors = result.errors.map(e => e.message);
      console.warn('[增强世界生成器] 数据校验失败:', result.errors);
    } else {
      console.log('[增强世界生成器] 数据校验通过');
    }
    
    return result;
  }
  
  /**
   * 执行自定义校验
   */
  private performCustomValidation(worldInfo: WorldInfo, result: ValidationResult): void {
    // 检查势力数量
    if (worldInfo.势力信息.length !== this.config.factionCount) {
      result.errors.push({
        path: '势力信息',
        message: `势力数量不正确，期望${this.config.factionCount}个，实际${worldInfo.势力信息.length}个`,
        expected: this.config.factionCount,
        received: worldInfo.势力信息.length
      });
    }
    
    // 检查地点数量
    if (worldInfo.地点信息.length !== this.config.locationCount) {
      result.errors.push({
        path: '地点信息',
        message: `地点数量不正确，期望${this.config.locationCount}个，实际${worldInfo.地点信息.length}个`,
        expected: this.config.locationCount,
        received: worldInfo.地点信息.length
      });
    }
    
    // 检查势力等级分布
    const levelCounts = worldInfo.势力信息.reduce((counts: Record<string, number>, faction) => {
      const level = faction.等级;
      counts[level] = (counts[level] || 0) + 1;
      return counts;
    }, {});
    
    if (levelCounts['超级'] > 1) {
      result.errors.push({
        path: '势力信息.等级',
        message: '超级势力不能超过1个',
        expected: '1个超级势力',
        received: `${levelCounts['超级']}个超级势力`
      });
    }
    
    // 检查名称唯一性
    const factionNames = worldInfo.势力信息.map(f => f.名称);
    const uniqueFactionNames = new Set(factionNames);
    if (factionNames.length !== uniqueFactionNames.size) {
      result.errors.push({
        path: '势力信息.名称',
        message: '势力名称存在重复',
        expected: '所有名称唯一',
        received: '存在重复名称'
      });
    }
    
    const locationNames = worldInfo.地点信息.map(l => l.名称);
    const uniqueLocationNames = new Set(locationNames);
    if (locationNames.length !== uniqueLocationNames.size) {
      result.errors.push({
        path: '地点信息.名称',
        message: '地点名称存在重复',
        expected: '所有名称唯一',
        received: '存在重复名称'
      });
    }
    
    // 世界名称与用户选择一致性
    if (this.config.worldName && worldInfo.世界名称 !== this.config.worldName) {
      result.errors.push({
        path: '世界名称',
        message: '世界名称必须与玩家选择一致',
        expected: this.config.worldName,
        received: worldInfo.世界名称
      });
    }
    
    result.isValid = result.errors.length === 0;
  }
}