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
import { calculateSectData, type SectCalculationData } from './sectDataCalculator';

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
      promptTemplate: this.buildPrompt(),
      fallbackData: this.createFallbackWorldData() // 添加fallback数据
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

   另外，必须补充以下结构，前端宗门页面直接依赖：
   - leadership 对象（宗门领导层，字段皆为必填）：
     {
       "宗主": "姓名",
       "宗主修为": "如：元婴后期/化神中期",
       "副宗主": "姓名或null",
       "长老数量": 数字,
       "最强修为": "如：化神圆满",
       "综合战力": 1-100 的数字,
       "核心弟子数": 数字,
       "内门弟子数": 数字,
       "外门弟子数": 数字
     }
   - memberCount 对象（成员统计，字段皆为必填）：
     {
       "total": 数字,
       "byRealm": {"练气": 数, "筑基": 数, "金丹": 数, "元婴": 数, "化神": 数, "炼虚": 数, "合体": 数, "渡劫": 数},
       "byPosition": {"散修":0, "外门弟子": 数, "内门弟子": 数, "核心弟子": 数, "传承弟子": 数, "执事": 数, "长老": 数, "副掌门": 数, "掌门": 1}
     }
   - 数据一致性：memberCount.total 必须等于 byPosition 合计；byRealm 合计必须等于 total。

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
        // 尝试查找任何JSON对象
        jsonMatch = response.match(/(\{[\s\S]*?\})/);
      }
      
      if (!jsonMatch) {
        console.error('[增强世界生成器] 无法从AI响应中提取JSON数据');
        // 返回空结构，让验证器捕获错误
        return {
          world_name: this.config.worldName || '修仙界',
          world_background: this.config.worldBackground || '',
          factions: [],
          locations: []
        };
      }
      
      const worldData = JSON.parse(jsonMatch[1]);
      console.log('[增强世界生成器] JSON解析成功');
      
      // 确保基本结构存在
      if (!worldData.factions) worldData.factions = [];
      if (!worldData.locations) worldData.locations = [];
      
      return worldData;
      
    } catch (error: any) {
      console.error('[增强世界生成器] JSON解析失败:', error);
      // 返回空结构而不是抛出错误，让验证器处理
      return {
        world_name: this.config.worldName || '修仙界',
        world_background: this.config.worldBackground || '',
        factions: [],
        locations: []
      };
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
      势力信息: (rawData.factions || []).map((faction: any) => {
        // 计算声望与综合战力（若可）
        const calcInput: SectCalculationData = {
          名称: faction.name || faction.名称,
          类型: faction.type || faction.类型 || '修仙宗门',
          等级: faction.level || faction.等级 || '三流',
          宗主修为: faction.leadership?.宗主修为,
          最强修为: faction.leadership?.最强修为,
          长老数量: faction.leadership?.长老数量,
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
            副宗主: faction.leadership.副宗主,
            长老数量: faction.leadership.长老数量 || 0,
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
    
    const buildFallbackStruct = (name: string, level: string) => {
      // 默认职位分布模板
      let byPosition: Record<string, number> = {};
      let byRealm: Record<string, number> = {};
      let leadership: any = {};
      let total = 0;

      const setTotals = (t: number) => { total = t; };

      switch (level) {
        case '超级': {
          // 总人数3000
          setTotals(3000);
          byRealm = { 练气: 1400, 筑基: 900, 金丹: 400, 元婴: 200, 化神: 70, 炼虚: 20, 合体: 8, 渡劫: 2 } as any;
          byPosition = { 散修: 0, 外门弟子: 1800, 内门弟子: 900, 核心弟子: 200, 传承弟子: 50, 执事: 30, 长老: 18, 副掌门: 1, 掌门: 1 } as any;
          leadership = { 宗主: '玄真子', 宗主修为: '化神圆满', 副宗主: '清虚上人', 长老数量: 18, 最强修为: '炼虚中期', 核心弟子数: 200, 内门弟子数: 900, 外门弟子数: 1800 };
          break;
        }
        case '一流': {
          // 总人数1500
          setTotals(1500);
          byRealm = { 练气: 700, 筑基: 450, 金丹: 200, 元婴: 100, 化神: 40, 炼虚: 8, 合体: 2, 渡劫: 0 } as any;
          byPosition = { 散修: 0, 外门弟子: 900, 内门弟子: 450, 核心弟子: 100, 传承弟子: 20, 执事: 15, 长老: 12, 副掌门: 2, 掌门: 1 } as any;
          leadership = { 宗主: '青云子', 宗主修为: '元婴后期', 副宗主: '明月仙子', 长老数量: 12, 最强修为: '化神初期', 核心弟子数: 100, 内门弟子数: 450, 外门弟子数: 900 };
          break;
        }
        case '二流': {
          // 总人数800
          setTotals(800);
          byRealm = { 练气: 400, 筑基: 250, 金丹: 100, 元婴: 35, 化神: 10, 炼虚: 3, 合体: 1, 渡劫: 1 } as any;
          byPosition = { 散修: 0, 外门弟子: 480, 内门弟子: 250, 核心弟子: 40, 传承弟子: 8, 执事: 10, 长老: 10, 副掌门: 1, 掌门: 1 } as any;
          leadership = { 宗主: '东方弘', 宗主修为: '金丹圆满', 副宗主: '东方凌', 长老数量: 10, 最强修为: '元婴初期', 核心弟子数: 40, 内门弟子数: 250, 外门弟子数: 480 };
          break;
        }
        default: { // 三流及其他
          // 总人数400
          setTotals(400);
          byRealm = { 练气: 220, 筑基: 120, 金丹: 45, 元婴: 10, 化神: 3, 炼虚: 1, 合体: 1, 渡劫: 0 } as any;
          byPosition = { 散修: 0, 外门弟子: 260, 内门弟子: 110, 核心弟子: 20, 传承弟子: 4, 执事: 2, 长老: 3, 副掌门: 0, 掌门: 1 } as any;
          leadership = { 宗主: '商和子', 宗主修为: '筑基圆满', 副宗主: null, 长老数量: 3, 最强修为: '金丹初期', 核心弟子数: 20, 内门弟子数: 110, 外门弟子数: 260 };
        }
      }

      // 计算声望与综合战力
      const calc = calculateSectData({
        名称: name,
        类型: '修仙宗门',
        等级: level as any,
        宗主修为: leadership.宗主修为,
        最强修为: leadership.最强修为,
        长老数量: leadership.长老数量,
        核心弟子数: leadership.核心弟子数,
        内门弟子数: leadership.内门弟子数,
        外门弟子数: leadership.外门弟子数
      });

      return { byPosition, byRealm, total, leadership, reputation: calc.声望值, power: calc.综合战力 };
    };

    return factionTemplates.slice(0, this.config.factionCount).map((template) => {
      const base = buildFallbackStruct(template.name, template.level);
      return {
        名称: template.name,
        类型: template.type,
        等级: template.level,
        位置: `${template.name}总部`,
        势力范围: [],
        描述: template.desc,
        特色: ['传承悠久', '实力强大'],
        与玩家关系: '中立' as const,
        声望值: base.reputation,
        specialties: ['传承悠久', '实力强大'],
        leadership: {
          ...base.leadership,
          综合战力: base.power
        },
        memberCount: {
          total: base.total,
          byRealm: base.byRealm as any,
          byPosition: base.byPosition as any
        },
        canJoin: true,
        joinRequirements: [],
        benefits: []
      };
    });
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
