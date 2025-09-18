/**
 * 增强的世界生成器 - 集成数据校验和重试机制
 * 确保生成数据的质量和一致性
 */

import { getTavernHelper } from '../tavern';
import { 
  GameDataValidator, 
  AIRetryGenerator, 
  EnhancedPromptBuilder,
  WORLD_INFO_VALIDATION_RULES,
  type ValidationResult,
  type RetryConfig 
} from '../gameDataValidator';
import type { WorldInfo } from '@/types/game.d';

export interface EnhancedWorldGenConfig {
  worldName?: string;
  worldBackground?: string;
  worldEra?: string;
  factionCount: number;
  locationCount: number;
  secretRealmsCount: number;
  maxRetries: number;
  retryDelay: number;
  characterBackground?: string;
}

export class EnhancedWorldGenerator {
  private config: EnhancedWorldGenConfig;
  private previousErrors: string[] = [];
  
  constructor(config: EnhancedWorldGenConfig) {
    this.config = config;
  }
  
  /**
   * 生成验证过的世界数据
   */
  async generateValidatedWorld(): Promise<{ success: boolean; worldInfo?: WorldInfo; errors?: string[] }> {
    console.log('[增强世界生成器] 开始生成验证过的世界数据...');
    
    const retryConfig: RetryConfig = {
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      validationRules: WORLD_INFO_VALIDATION_RULES,
      promptTemplate: this.buildPrompt()
    };
    
    const result = await AIRetryGenerator.generateWithRetry(
      () => this.generateWorldData(),
      (data) => this.validateWorldData(data),
      retryConfig
    );
    
    if (result.success && result.data) {
      console.log('[增强世界生成器] 世界生成成功！');
      return { success: true, worldInfo: result.data };
    } else {
      console.error('[增强世界生成器] 世界生成失败', result.errors);
      return { success: false, errors: result.errors };
    }
  }
  
  /**
   * 生成世界数据
   */
  private async generateWorldData(): Promise<WorldInfo> {
    const tavern = getTavernHelper();
    if (!tavern) {
      throw new Error('酒馆系统不可用');
    }
    
    // 构建增强的提示词
    const prompt = EnhancedPromptBuilder.buildValidatedPrompt(
      this.buildPrompt(),
      WORLD_INFO_VALIDATION_RULES,
      this.previousErrors
    );
    
    console.log('[增强世界生成器] 发送AI请求...');
    console.log('[增强世界生成器] 提示词长度:', prompt.length);
    
    try {
      const response = await tavern.generateRaw({
        user_input: prompt,
        custom_api: {
          temperature: 0.7, // 降低随机性，提高一致性
          max_tokens: 4000,
          top_p: 0.9
        }
      });
      
      console.log('[增强世界生成器] AI响应长度:', String(response).length);
      
      // 解析AI响应
      const worldData = this.parseAIResponse(String(response));
      
      // 转换为标准格式
      return this.convertToWorldInfo(worldData);
      
    } catch (error: any) {
      console.error('[增强世界生成器] AI请求失败:', error);
      throw new Error(`AI生成失败: ${error.message}`);
    }
  }
  
  /**
   * 构建基础提示词
   */
  private buildPrompt(): string {
    const { factionCount, locationCount, secretRealmsCount } = this.config;
    
    return `
# 修仙世界完整生成任务

## 基本要求
- 世界名称: ${this.config.worldName || '修仙界'}
- 世界背景: ${this.config.worldBackground || '经典修仙世界'}
- 世界纪元: ${this.config.worldEra || '修仙盛世'}
- 势力数量: ${factionCount}个
- 地点数量: ${locationCount}个
- 特殊地点: ${secretRealmsCount}个

## 势力生成要求
1. **等级分布必须合理**：
   - 超级势力: 1个 (统治级别)
   - 一流势力: 2个 (强大势力)
   - 二流势力: 2-3个 (中等势力)
   - 三流势力: 其余 (新兴或弱小势力)

2. **势力类型多样化**：
   - 修仙宗门 (主要势力)
   - 修仙世家 (血脉传承)
   - 魔道势力 (对立阵营)
   - 商会组织 (经济势力)
   - 散修联盟 (松散组织)

3. **每个势力必须包含**：
   - 名称 (独特且符合修仙背景)
   - 类型 (上述类型之一)
   - 等级 (超级/一流/二流/三流)
   - 位置 (详细地理位置)
   - 描述 (至少50字的背景描述)
   - 特色 (数组格式，至少2个特色)

## 地点生成要求
1. **地点类型分布**：
   - 势力总部: ${factionCount}个 (对应各势力)
   - 城镇坊市: ${Math.floor(locationCount * 0.3)}个
   - 修炼圣地: ${Math.floor(locationCount * 0.2)}个
   - 资源宝地: ${Math.floor(locationCount * 0.2)}个
   - 危险区域: ${Math.floor(locationCount * 0.15)}个
   - 特殊地点: ${locationCount - Math.floor(locationCount * 0.85)}个

2. **每个地点必须包含**：
   - 名称 (独特地名)
   - 类型 (上述类型之一)
   - 位置 (地理坐标或描述)
   - 描述 (至少30字)
   - 安全等级 (安全/较安全/危险/极危险)
   - 开放状态 (开放/限制/封闭)

## 数据完整性要求
- 所有必需字段都必须有值，不能为空
- 数组字段必须是真正的数组格式
- 数值字段必须是数字类型
- 所有名称必须唯一，不能重复

请严格按照以上要求生成完整的修仙世界数据。
`;
  }
  
  /**
   * 解析AI响应
   */
  private parseAIResponse(response: string): any {
    console.log('[增强世界生成器] 开始解析AI响应...');
    
    try {
      // 提取JSON
      let jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch) {
        jsonMatch = response.match(/(\{[\s\S]*"locations"\s*:\s*\[[\s\S]*?\}\s*\][\s\S]*?\})/);
      }
      
      if (!jsonMatch) {
        throw new Error('无法从AI响应中提取JSON数据');
      }
      
      const worldData = JSON.parse(jsonMatch[1]);
      console.log('[增强世界生成器] JSON解析成功');
      
      return worldData;
      
    } catch (error: any) {
      console.error('[增强世界生成器] JSON解析失败:', error);
      throw new Error(`JSON解析失败: ${error.message}`);
    }
  }
  
  /**
   * 转换为标准WorldInfo格式
   */
  private convertToWorldInfo(rawData: any): WorldInfo {
    return {
      世界名称: rawData.world_name || rawData.worldName || this.config.worldName || '修仙界',
      世界背景: rawData.world_background || rawData.worldBackground || this.config.worldBackground || '',
      大陆信息: (rawData.continents || []).map((continent: any) => ({
        名称: continent.name || continent.名称,
        描述: continent.description || continent.描述,
        地理特征: continent.terrain_features || continent.地理特征 || [],
        修真环境: continent.cultivation_environment || continent.修真环境,
        气候: continent.climate || continent.气候,
        天然屏障: continent.natural_barriers || continent.天然屏障 || [],
        大洲边界: continent.continent_bounds || continent.大洲边界 || []
      })),
      势力信息: (rawData.factions || []).map((faction: any) => ({
        名称: faction.name || faction.名称,
        类型: faction.type || faction.类型,
        等级: faction.level || faction.等级,
        位置: faction.location || faction.位置,
        势力范围: faction.territory || faction.势力范围 || [],
        描述: faction.description || faction.描述,
        特色: faction.specialties || faction.features || faction.特色 || [],
        与玩家关系: '中立',
        声望值: Math.floor(Math.random() * 20) + 5, // 5-25随机值
        canJoin: true,
        joinRequirements: [],
        benefits: []
      })),
      地点信息: (rawData.locations || []).map((location: any) => ({
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
      生成信息: {
        生成时间: new Date().toISOString(),
        世界纪元: rawData.world_era || this.config.worldEra || '修仙纪元',
        特殊设定: rawData.special_settings || [],
        版本: '2.0-Enhanced'
      }
    };
  }
  
  /**
   * 校验世界数据
   */
  private validateWorldData(worldInfo: WorldInfo): ValidationResult {
    console.log('[增强世界生成器] 开始校验世界数据...');
    
    const result = GameDataValidator.validate(worldInfo, WORLD_INFO_VALIDATION_RULES);
    
    // 额外的自定义校验
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
    
    result.isValid = result.errors.length === 0;
  }
  
  /**
   * 创建fallback世界数据
   */
  private createFallbackWorldData(): WorldInfo {
    console.log('[增强世界生成器] 创建fallback世界数据');
    
    return {
      世界名称: this.config.worldName || '修仙界',
      世界背景: this.config.worldBackground || '一个充满仙气的修真世界',
      大陆信息: [
        {
          名称: '玄天大陆',
          描述: '修仙界的主要大陆，灵气充沛，宗门林立',
          地理特征: ['高山峻岭', '灵脉纵横', '仙境秘地'],
          修真环境: '灵气浓郁，适合修炼',
          气候: '四季分明，气候宜人',
          天然屏障: ['玄天山脉', '天堑深渊'],
          大洲边界: []
        }
      ],
      势力信息: this.createFallbackFactions(),
      地点信息: this.createFallbackLocations(),
      生成信息: {
        生成时间: new Date().toISOString(),
        世界纪元: this.config.worldEra || '修仙纪元',
        特殊设定: ['使用fallback数据'],
        版本: '2.0-Fallback'
      }
    };
  }
  
  /**
   * 创建fallback势力数据
   */
  private createFallbackFactions() {
    const factionTemplates = [
      { name: '太玄宗', type: '修仙宗门', level: '超级', desc: '修仙界第一大宗门，传承万年，实力深不可测' },
      { name: '青云门', type: '修仙宗门', level: '一流', desc: '正道领袖之一，以剑法著称于世' },
      { name: '万剑宗', type: '修仙宗门', level: '一流', desc: '剑修圣地，门下弟子个个剑法超群' },
      { name: '东方世家', type: '修仙世家', level: '二流', desc: '修仙世家中的翘楚，血脉传承悠久' },
      { name: '魔道宗', type: '魔道势力', level: '二流', desc: '魔道中的强大势力，与正道分庭抗礼' },
      { name: '千宝阁', type: '商会组织', level: '三流', desc: '修仙界最大的商会，财力雄厚' },
      { name: '散修联盟', type: '散修联盟', level: '三流', desc: '散修抱团取暖的组织，成员众多' }
    ];
    
    return factionTemplates.slice(0, this.config.factionCount).map((template, index) => ({
      名称: template.name,
      类型: template.type,
      等级: template.level,
      位置: `${template.name}总部`,
      势力范围: [],
      描述: template.desc,
      特色: ['传承悠久', '实力强大'],
      与玩家关系: '中立' as const,
      声望值: Math.floor(Math.random() * 20) + 5,
      canJoin: true,
      joinRequirements: [],
      benefits: []
    }));
  }
  
  /**
   * 创建fallback地点数据
   */
  private createFallbackLocations() {
    const locationTemplates = [
      { name: '玄天城', type: '城镇', desc: '修仙界最大的城市，繁华无比' },
      { name: '灵石矿', type: '资源宝地', desc: '盛产上品灵石的宝地' },
      { name: '修炼洞府', type: '修炼圣地', desc: '灵气浓郁的修炼场所' },
      { name: '魔兽森林', type: '危险区域', desc: '危险的魔兽栖息地' },
      { name: '传送阵', type: '特殊地点', desc: '连接各地的传送法阵' }
    ];
    
    const locations = [];
    for (let i = 0; i < this.config.locationCount; i++) {
      const template = locationTemplates[i % locationTemplates.length];
      locations.push({
        名称: `${template.name}${i > 4 ? i - 4 : ''}`,
        类型: template.type,
        位置: `坐标(${100 + i}, ${200 + i})`,
        描述: template.desc,
        特色: '风景秀丽',
        安全等级: '较安全' as const,
        开放状态: '开放' as const,
        相关势力: [],
        特殊功能: []
      });
    }
    
    return locations;
  }
}
