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
      // 用户要求：让AI生成稳定，不需要fallback数据
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
      
    } catch (error: unknown) {
      console.error('[增强世界生成器] AI请求失败:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`AI生成失败: ${message}`);
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
- 世界名称: ${this.config.worldName || '修仙界'}（仅作为参考，不要在JSON中输出世界名称/背景/纪元）
- 重要约束：世界名称和世界背景等元数据已由玩家选择固定，严禁在输出JSON中生成或覆盖这些字段。
- 输出JSON必须仅包含以下顶级字段：continents, factions, locations。
- 势力数量: ${factionCount}个
- 地点数量: ${locationCount}个
- 特殊地点: ${secretRealmsCount}个

##  continents (大陆信息) 生成要求
1.  **必须生成多个大陆** - 建议生成3-5个大陆，构建完整的世界格局。
2.  **坐标范围约束**：所有坐标必须在以下范围内
    - 经度范围：100.0 ~ 130.0 度 (使用更紧密的核心区域)
    - 纬度范围：25.0 ~ 45.0 度 (使用更紧密的核心区域)
3.  **大陆分布和连接原则**：
    - **相互连接**：大陆之间应该相邻或通过狭窄海峡连接，避免孤立岛屿
    - **紧密布局**：大陆边界之间距离1-3度，形成连续的陆地群
    - **集中分布**：所有大陆应在核心区域（经度110-125度，纬度30-40度）形成连续陆块
    - **无大片海域**：避免大陆间出现超过5度的空旷海域
4.  每个大陆对象必须包含以下字段：
    *   \`name\` (名称) - 字符串。
    *   \`description\` (描述) - 字符串，至少50字，描述大陆的地理特征和文化特色。
    *   \`terrain_features\` (地理特征) - **字符串数组，必须包含至少2个特征**。
    *   \`natural_barriers\` (天然屏障) - **字符串数组，必须包含至少2个屏障**。
    *   \`continent_bounds\` (大洲边界) - **坐标点对象数组，必须包含至少4个点来定义一个闭合区域**。例如: \`[{"longitude": 115.0, "latitude": 35.0}, ...]\`。
    *   **重要**：单个大陆建议经纬度跨度4-8度，确保大陆间能够连接。

## 势力生成要求
1. **等级分布必须合理**：
   - 超级势力: 1个 (世界级统治势力)
   - 一流势力: 2-3个 (各大陆的强势力)
   - 二流势力: 3-4个 (区域性势力)
   - 三流势力: 其余 (新兴或小型势力)

2. **势力分布和领土原则**：
   - **严禁非附属势力的领土重叠**：同级别或非附属关系的势力领土绝对不能重叠
   - **附属关系处理**：如果存在附属关系，必须在势力描述中明确说明，如"XX宗门，隶属于YY帝国"
   - **地理分离**：不同大陆的势力应相对独立，避免跨大陆的复杂重叠
   - **缓冲区域**：势力领土之间应有合理的中立区域或无人区

3. **势力领土大小限制**：
   - **小于大洲**：任何单个势力的领土范围都必须明显小于其所在大洲
   - **超级势力**：领土跨度最大不超过大洲面积的40%，约2-3度范围
   - **一流势力**：领土跨度不超过大洲面积的25%，约1.5-2度范围  
   - **二三流势力**：领土跨度不超过大洲面积的15%，约0.8-1.2度范围
   - **势力总部**：必须在其势力范围的中心区域

4. **势力领土生成规则**：
   - 每个势力的territory（势力范围）必须是独立的、不与其他势力重叠的区域
   - 势力总部位置必须在其势力范围内
   - 超级势力可以跨越多个区域，但不应完全包围其他独立势力
   - 一流势力通常占据一个大陆的核心区域的一部分
   - 二三流势力分布在边缘地带或次要区域的小块领土

5. **势力关系说明**：
   - 如果势力A的领土包含势力B，则必须在描述中说明B是A的附属/分支/世家等
   - 独立势力之间应保持明确的领土边界
   - 同盟关系不等于领土重叠，应在描述中体现政治关系而非地理重叠

6. **势力类型多样化**：
   - 修仙宗门 (主要势力)
   - 修仙世家 (血脉传承)
   - 魔道势力 (对立阵营)
   - 商会组织 (经济势力)
   - 散修联盟 (松散组织)

3. **🚨严格禁止重复名称**：
   - 每个势力名称必须独特且不重复
   - 必须创造性地生成全新的势力名称
   - 避免使用常见的修仙小说模板名称
   - 结合世界背景特色创造富有想象力的名称

4. **名称生成多样性要求**：
   - 宗门类：融合地理特征、修炼理念、创始人特色等元素
   - 世家类：体现家族历史、血脉特色、传承特点
   - 魔道类：展现邪异气质，但避免俗套命名
   - 商会类：体现商业特色和经营范围
   - 联盟类：反映组织松散和成员特点

5. **每个势力必须包含**：
   - 名称 (独特且符合修仙背景，严禁重复)
   - 类型 (上述类型之一)
   - 等级 (超级/一流/二流/三流)
   - 位置 (详细地理位置)
   - **territory** (势力范围) - **坐标点对象数组，必须包含至少4个点来定义一个闭合区域**。
   - 描述 (至少50字的背景描述)
   - 特色 (数组格式，至少2个特色)

   另外，必须补充以下结构，前端宗门页面直接依赖：
   - leadership 对象（宗门领导层，字段皆为必填）：
     {
       "宗主": "姓名",
       "宗主修为": "如：元婴后期/化神中期",
       "副宗主": "姓名或null",
       "太上长老": "姓名或null（可选，德高望重的退隐长老）",
       "太上长老修为": "境界或null（如有太上长老则必填）",
       "长老数量": 数字,
       "最强修为": "如：化神圆满（可能是太上长老或宗主的修为）",
       "综合战力": 1-100 的数字,
       "核心弟子数": 数字,
       "内门弟子数": 数字,
       "外门弟子数": 数字
     }
   - memberCount 对象（成员统计，字段皆为必填）：
     {
       "total": 数字,
       "byRealm": {"练气": 数, "筑基": 数, "金丹": 数, "元婴": 数, "化神": 数, "炼虚": 数, "合体": 数, "渡劫": 数},
       "byPosition": {"散修":0, "外门弟子": 数, "内门弟子": 数, "核心弟子": 数, "传承弟子": 数, "执事": 数, "长老": 数, "太上长老": 数, "副掌门": 数, "掌门": 1}
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
   - 位置 (地理坐标，必须在经度100.0~130.0度，纬度25.0~45.0度范围内)
   - 描述 (至少30字)
   - 安全等级 (安全/较安全/危险/极危险)
   - 开放状态 (开放/限制/封闭)

3. **坐标生成要求**：
   - 所有势力和地点的坐标都必须在对应大陆边界范围内
   - 坐标格式：{"longitude": 数值, "latitude": 数值}
   - **集中布局**：重点使用核心区域坐标（经度110-125度，纬度30-40度）
   - **紧密分布**：避免过度分散的坐标，保持合理的地理集中度
   - 避免生成过于密集或分散的坐标分布

## 数据完整性要求
- 仅输出地图相关数据：大陆、势力范围、地点坐标与类型（可含名称与描述），不得输出 world_name/world_background/world_era 等元数据。
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
        名称: continent.name || continent.名称 || '未名大陆',
        描述: continent.description || continent.描述 || '一片神秘的修仙大陆，灵气充沛，势力林立',
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
            副宗主: faction.leadership.副宗主 ?? undefined,
            太上长老: faction.leadership.太上长老 ?? undefined,
            太上长老修为: faction.leadership.太上长老修为 ?? undefined,
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
      生成信息: {
        生成时间: new Date().toISOString(),
        世界背景: rawData.world_background || this.config.worldBackground || '修仙世界',
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
  
  /**
   * 创建fallback世界数据，确保系统稳定运行
   */
  private createFallbackWorldData(): WorldInfo {
    console.log('[增强世界生成器] 创建fallback世界数据');
    
    return {
      世界名称: this.config.worldName || '修仙界',
      世界背景: this.config.worldBackground || '一个充满修仙者的奇幻世界',
      大陆信息: [
        {
          名称: '东胜洲',
          描述: '大陆悬于虚空，形如古贝。中央为不周山脉，龙脉之祖，灵气自此分流八方。',
          地理特征: [
            '连绵山脉横贯大陆',
            '灵脉纵横交错',
            '古木参天的原始森林',
            '水网密布的平原地带'
          ],
          修真环境: '灵气充沛，适宜修行',
          气候: '四季分明，温和宜人',
          天然屏障: [
            '东临无垠归墟',
            '西接万妖死泽',
            '南有赤地熔岩',
            '北为永寂冰原'
          ],
          大洲边界: [
            { longitude: 105.0, latitude: 30.0 },
            { longitude: 115.0, latitude: 30.0 },
            { longitude: 115.0, latitude: 40.0 },
            { longitude: 105.0, latitude: 40.0 },
            { longitude: 105.0, latitude: 30.0 }
          ]
        }
      ],
      势力信息: [
        {
          名称: '观天阁',
          类型: '修仙宗门',
          等级: '超级',
          位置: { longitude: 110.0, latitude: 35.0 },
          势力范围: [
            { longitude: 108.0, latitude: 33.0 },
            { longitude: 112.0, latitude: 33.0 },
            { longitude: 112.0, latitude: 37.0 },
            { longitude: 108.0, latitude: 37.0 },
            { longitude: 108.0, latitude: 33.0 }
          ],
          描述: '自上古传承至今的宗门，不问世事，只观天道。门人稀少，然个个皆是惊才绝艳之辈。',
          特色: ['推演天机', '星辰剑道'],
          与玩家关系: '中立',
          声望值: 9500,
          leadership: {
            宗主: '云中子',
            宗主修为: '化神后期',
            副宗主: undefined,
            太上长老: '太乙真人',
            太上长老修为: '炼虚初期',
            长老数量: 12,
            最强修为: '炼虚初期',
            综合战力: 95,
            核心弟子数: 8,
            内门弟子数: 32,
            外门弟子数: 120
          },
          memberCount: {
            total: 173,
            byRealm: {
              "练气": 80,
              "筑基": 45,
              "金丹": 30,
              "元婴": 12,
              "化神": 5,
              "炼虚": 1,
              "合体": 0,
              "渡劫": 0
            },
            byPosition: {
              "散修": 0,
              "外门弟子": 120,
              "内门弟子": 32,
              "核心弟子": 8,
              "传承弟子": 3,
              "执事": 6,
              "长老": 12,
              "太上长老": 1,
              "副掌门": 0,
              "掌门": 1
            }
          }
        }
      ],
      地点信息: [
        {
          名称: '青云镇',
          类型: 'city_town',
          位置: '东胜洲中部平原',
          coordinates: { longitude: 110.5, latitude: 34.5 },
          描述: '一座繁华的修仙坊市，各种修炼资源应有尽有',
          特色: '丹药坊市, 法器交易',
          安全等级: '较安全',
          开放状态: '开放',
          相关势力: ['观天阁'],
          特殊功能: ['贸易中心', '信息交流']
        }
      ],
      生成信息: {
        生成时间: new Date().toISOString(),
        世界背景: this.config.worldBackground || '一个充满修仙者的奇幻世界',
        世界纪元: this.config.worldEra || '修仙纪元',
        特殊设定: ['AI生成失败时的fallback数据'],
        版本: '2.0-Enhanced-Fallback'
      }
    };
  }

  // Fallback数据已移除 - 用户要求生成失败就不要开局
}
