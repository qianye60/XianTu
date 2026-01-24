/**
 * 增强的世界生成器 - 集成数据校验和重试机制
 * 确保生成数据的质量和一致性
 */

import { getTavernHelper, isTavernEnv } from '../tavern';
import { EnhancedWorldPromptBuilder, type WorldPromptConfig } from './enhancedWorldPrompts';
import type { WorldInfo } from '@/types/game.d';
import { calculateSectData, type SectCalculationData } from './sectDataCalculator';
import { WorldMapConfig } from '@/types/worldMap';
import { promptStorage } from '@/services/promptStorage';
import { parseJsonSmart } from '@/utils/jsonExtract';
import { aiService } from '@/services/aiService';

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
  onStreamChunk?: (chunk: string) => void; // 流式输出回调
  useStreaming?: boolean; // 是否使用流式传输（默认true）
  enableHehuanEasterEgg?: boolean; // 是否启用合欢宗彩蛋（仅在地图初始化时启用）
  existingFactions?: Array<{ 名称: string; 位置?: any; 势力范围?: any[] }>; // 现有势力（防止重叠）
  existingLocations?: Array<{ 名称: string; coordinates?: any }>; // 现有地点（防止重叠）
}

export class EnhancedWorldGenerator {
  private config: EnhancedWorldGenConfig;
  private previousErrors: string[] = [];
  // 保存原始配置，用于重试时的数量计算
  private originalConfig: {
    factionCount: number;
    locationCount: number;
    secretRealmsCount: number;
    continentCount: number;
  };

  constructor(config: EnhancedWorldGenConfig) {
    this.config = config;
    // 保存原始数量配置
    this.originalConfig = {
      factionCount: config.factionCount,
      locationCount: config.locationCount,
      secretRealmsCount: config.secretRealmsCount,
      continentCount: config.continentCount
    };
  }

  /**
   * 生成验证过的世界数据 (重构后)
   */
  async generateValidatedWorld(): Promise<{ success: boolean; worldInfo?: WorldInfo; errors?: string[] }> {
    for (let i = 0; i <= this.config.maxRetries; i++) {
      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * i));
          this.reduceCountsForRetry(i);
        }

        const worldData = await this.generateWorldData();
        const validationResult = this.validateWorldData(worldData);

        if (validationResult.isValid) {
          return { success: true, worldInfo: worldData };
        } else {
          this.previousErrors = validationResult.errors.map(e => e.message);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.previousErrors = [message];
      }
    }

    return { success: false, errors: this.previousErrors };
  }

  /**
   * 重试时减少数量参数，降低token消耗
   * 注意："仅生成大陆"模式下只减少大陆数量
   * @param retryCount 当前重试次数
   */
  private reduceCountsForRetry(retryCount: number): void {
    const reductionFactor = 0.8;
    const factor = Math.pow(reductionFactor, retryCount);

    // "仅生成大陆"模式：只减少大陆数量
    if (this.originalConfig.factionCount === 0) {
      this.config.continentCount = Math.max(2, Math.floor(this.originalConfig.continentCount * factor));
      return;
    }

    // 完整世界生成模式：减少所有数量
    this.config.factionCount = Math.max(3, Math.floor(this.originalConfig.factionCount * factor));
    this.config.locationCount = Math.max(5, Math.floor(this.originalConfig.locationCount * factor));
    this.config.secretRealmsCount = Math.max(2, Math.floor(this.originalConfig.secretRealmsCount * factor));
    this.config.continentCount = Math.max(2, Math.floor(this.originalConfig.continentCount * factor));
  }

  /**
   * 生成世界数据 (重构后)
   */
  private async generateWorldData(): Promise<WorldInfo> {
    const tavern = getTavernHelper();
    if (!tavern) {
      throw new Error('AI服务未初始化，请在设置中配置AI服务');
    }

    const prompt = await this.buildPromptWithErrors();

    // 🔥 检查是否启用了强JSON模式
    const forceJsonMode = aiService.isForceJsonEnabled('world_generation');
    console.log('[世界生成] 强JSON模式:', forceJsonMode);

    try {
      const orderedPrompts: Array<{ role: 'system' | 'user'; content: string }> = [
        {
          role: 'user',
          content: prompt
        },
        {
          role: 'user',
          content: '请根据上述要求生成完整的世界数据JSON。'
        }
      ];

      const response = await tavern.generateRaw({
        ordered_prompts: orderedPrompts,
        should_stream: this.config.useStreaming !== false,
        usageType: 'world_generation',
        overrides: {
          world_info_before: '',
          world_info_after: ''
        },
        onStreamChunk: (chunk: string) => {
          if (this.config.onStreamChunk) {
            this.config.onStreamChunk(chunk);
          }
        }
      });

      // 处理返回值：可能是字符串或对象
      let responseText: string;
      if (response && typeof response === 'object' && 'text' in response) {
        responseText = (response as { text: string }).text;
      } else if (typeof response === 'string') {
        responseText = response;
      } else {
        responseText = String(response);
      }

      console.log('[世界生成] 响应长度:', responseText?.length || 0);

      const worldData = this.parseAIResponse(responseText, forceJsonMode);
      return this.convertToWorldInfo(worldData);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`AI生成失败: ${message}`);
    }
  }

  /**
   * 构建带有错误修正信息的提示词
   * 注意：重试时不添加错误信息，因为数量参数已调整
   */
  private async buildPromptWithErrors(): Promise<string> {
    return await this.buildPrompt();
  }

  /**
   * 构建基础提示词
   * 优先使用用户自定义的提示词，如果没有则使用默认生成的
   */
  private async buildPrompt(): Promise<string> {
      // 优先从 promptStorage 获取用户修改过的提示词
      const customPrompt = await promptStorage.get('worldGeneration');

      // 🔥 彩蛋：合欢宗生成由调用方决定（通过 enableHehuanEasterEgg 参数）
      const shouldGenerateHehuan = this.config.enableHehuanEasterEgg && isTavernEnv();
      if (shouldGenerateHehuan) {
        console.log('[世界生成] 🎲 彩蛋触发：将强制生成合欢宗');
      }

      // 获取默认提示词用于比较
      // 🔥 使用 originalConfig 确保重试时提示词和第一次一样
      const { factionCount, locationCount, secretRealmsCount, continentCount } = this.originalConfig;
      const promptConfig: WorldPromptConfig = {
        factionCount,
        totalLocations: locationCount,
        secretRealms: secretRealmsCount,
        continentCount,
        characterBackground: this.config.characterBackground,
        worldBackground: this.config.worldBackground,
        worldEra: this.config.worldEra,
        worldName: this.config.worldName,
        mapConfig: this.config.mapConfig
      };
      let defaultPrompt = EnhancedWorldPromptBuilder.buildPrompt(promptConfig);

      // 🔥 注入合欢宗要求
      if (shouldGenerateHehuan) {
        defaultPrompt += `

【特殊要求】
请务必在势力列表中包含一个名为"合欢宗"的宗门：
- 类型：魔道宗门 或 中立宗门
- 等级：二流 或 三流（必须明确填写，不能为空）
- 特色：以双修采补闻名，宗门风气开放
- 必须包含圣女职位（leadership.圣女字段）`;
      }

      // 🔥 注入现有地点和势力信息（防止重叠）
      if (this.config.existingFactions?.length || this.config.existingLocations?.length) {
        defaultPrompt += `

【已有地点势力（禁止重叠）】
新生成的地点和势力必须避开以下已有位置，坐标不能重叠：`;
        if (this.config.existingFactions?.length) {
          const factionList = this.config.existingFactions.map(f =>
            `- ${f.名称}${f.位置 ? `(位置:${JSON.stringify(f.位置)})` : ''}`
          ).join('\n');
          defaultPrompt += `\n已有势力：\n${factionList}`;
        }
        if (this.config.existingLocations?.length) {
          const locationList = this.config.existingLocations.map(l =>
            `- ${l.名称}${l.coordinates ? `(坐标:x=${l.coordinates.x},y=${l.coordinates.y})` : ''}`
          ).join('\n');
          defaultPrompt += `\n已有地点：\n${locationList}`;
        }
      }

      // 如果用户有自定义提示词且不为空，使用自定义的
      // 注意：promptStorage.get 在用户未修改时会返回默认值，所以需要检查是否真的被修改过
      if (customPrompt && customPrompt.trim()) {
        // 检查是否是用户修改过的（通过检查 modified 标记）
        const allPrompts = await promptStorage.loadAll();
        if (allPrompts['worldGeneration']?.modified) {
          return customPrompt;
        }
      }

      return defaultPrompt;
    }

  /**
   * 解析AI响应 - 智能处理强JSON模式和普通模式
   * @param response AI返回的原始文本
   * @param forceJsonMode 是否启用强JSON模式（API返回纯JSON）
   */
  private parseAIResponse(response: string, forceJsonMode: boolean = false): RawWorldData {
    try {
      // 1. 移除 <thinking> 标签（reasoner模型可能包含）
      let text = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
      text = text.replace(/<thinking>[\s\S]*/gi, ''); // 处理未闭合的情况

      console.log('[世界生成] 清理thinking后长度:', text?.length || 0);

      // 2. 使用智能JSON解析（根据forceJsonMode自动选择策略）
      const worldDataRaw = parseJsonSmart<RawWorldData>(text.trim(), forceJsonMode);

      // 3. 处理嵌套的 world_data
      const data = worldDataRaw.world_data && typeof worldDataRaw.world_data === 'object'
        ? worldDataRaw.world_data
        : worldDataRaw;

      return {
        continents: Array.isArray(data.continents) ? data.continents : [],
        factions: Array.isArray(data.factions) ? data.factions : [],
        locations: Array.isArray(data.locations) ? data.locations : []
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[世界生成] JSON解析失败:', message);
      console.error('[世界生成] 原始响应前1000字符:', response?.substring(0, 1000));
      throw new Error(`JSON解析失败: ${message}`);
    }
  }

  /**
   * 转换为标准WorldInfo格式
   */
  private convertToWorldInfo(rawData: RawWorldData): WorldInfo {
    return {
      世界名称: this.config.worldName || rawData.world_name || rawData.worldName || '修仙界',
      世界背景: this.config.worldBackground || rawData.world_background || rawData.worldBackground || '',
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
        const factionName = String(faction.name || faction.名称 || '');
        const isHehuan = factionName.includes('合欢');

        const leadership = faction.leadership
          ? {
              宗主: faction.leadership.宗主,
              宗主修为: faction.leadership.宗主修为,
              副宗主: faction.leadership.副宗主 ?? undefined,
              圣女: isHehuan ? (faction.leadership.圣女 ?? undefined) : undefined,
              圣子: isHehuan ? (faction.leadership.圣子 ?? undefined) : undefined,
              太上长老: faction.leadership.太上长老 ?? undefined,
              太上长老修为: faction.leadership.太上长老修为 ?? undefined,
              最强修为: faction.leadership.最强修为 || faction.leadership.宗主修为,
              综合战力: calculated.综合战力,
              核心弟子数: faction.leadership.核心弟子数,
              内门弟子数: faction.leadership.内门弟子数,
              外门弟子数: faction.leadership.外门弟子数
            }
          : undefined;

        const memberCount = faction.memberCount
          ? {
              total: Number(faction.memberCount.total) || 0,
              byRealm: faction.memberCount.byRealm || {},
              byPosition: faction.memberCount.byPosition || {}
            }
          : undefined;

        const territoryInfo = faction.territoryInfo
          ? {
              controlledAreas: faction.territoryInfo.controlledAreas || [],
              influenceRange: faction.territoryInfo.influenceRange,
              strategicValue: faction.territoryInfo.strategicValue
            }
          : undefined;

        return {
          名称: faction.name || faction.名称,
          类型: faction.type || faction.类型,
          等级: faction.level || faction.等级,
          位置: faction.location || faction.headquarters || faction.位置,
          势力范围: faction.territory || faction.territory_bounds || faction.势力范围 || [],
          描述: faction.description || faction.描述,
          特色: faction.specialties || faction.features || faction.特色 || [],
          与玩家关系: faction.与玩家关系 || '中立',
          声望值: calculated.声望值,

          // 同时提供中英字段，兼容旧UI/新生成器
          领导层: leadership,
          leadership,

          成员数量: memberCount
            ? {
                总数: memberCount.total,
                按境界: memberCount.byRealm,
                按职位: memberCount.byPosition,
                ...memberCount
              }
            : undefined,
          memberCount,

          势力范围详情: territoryInfo
            ? {
                控制区域: territoryInfo.controlledAreas,
                影响范围: territoryInfo.influenceRange,
                战略价值: territoryInfo.strategicValue
              }
            : undefined,
          territoryInfo,

          可否加入: faction.canJoin !== undefined ? !!faction.canJoin : true,
          canJoin: faction.canJoin !== undefined ? !!faction.canJoin : true,
          加入条件: faction.joinRequirements || [],
          joinRequirements: faction.joinRequirements || [],
          加入好处: faction.benefits || [],
          benefits: faction.benefits || []
        };
      }),
      地点信息: (rawData.locations || []).map((location: Record<string, any>) => ({
        名称: location.name || location.名称,
        类型: location.type || location.类型,
        位置: location.位置,
        coordinates: location.coordinates || location.坐标,
        描述: location.description || location.描述,
        特色: location.features || location.特色,
        安全等级: location.safety_level || location.danger_level || location.安全等级 || '较安全',
        开放状态: location.status || location.开放状态 || '开放',
        相关势力: location.related_factions || location.相关势力 || [],
        特殊功能: location.special_functions || location.特殊功能 || []
      })),
      地图配置: this.config.mapConfig || (rawData as any).地图配置 || (rawData as any).map_config || {
        width: 10000,
        height: 10000,
        minLng: 0,
        maxLng: 10000,
        minLat: 0,
        maxLat: 10000,
      },
      生成时间: new Date().toISOString(),
      世界纪元: this.config.worldEra || rawData.world_era || '修仙纪元',
      特殊设定: rawData.special_settings || [],
      版本: '2.0-Enhanced'
    };
  }

  /**
   * 校验世界数据 (重构后)
   */
  private validateWorldData(worldInfo: WorldInfo): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };
    this.performCustomValidation(worldInfo, result);

    if (!result.isValid) {
      this.previousErrors = result.errors.map(e => e.message);
    }

    return result;
  }

  /**
   * 执行自定义校验
   * 注意：不再检查数量，AI生成多少就是多少
   */
  private performCustomValidation(worldInfo: WorldInfo, result: ValidationResult): void {
    // 势力数量和地点数量不再检查，AI生成多少都接受
    // 超级宗门数量也不再限制，避免因数量问题导致生成失败

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
