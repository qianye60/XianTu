/**
 * @fileoverview 修仙世界势力生成模板
 * 包含真实的修仙世界势力类型和生成逻辑
 */

import { getTavernHelper } from '../tavern';
import type { CultivationWorldSettings, BirthplaceGeneration } from './gameWorldConfig';
import { EnhancedWorldPromptBuilder, type WorldPromptConfig } from './enhancedWorldPrompts';

/**
 * 真实修仙世界势力生成器
 */
export class CultivationWorldGenerator {
  private worldSettings: CultivationWorldSettings;
  private characterBackground?: string;
  private userConfig?: any; // 用户自定义配置
  
  constructor(settings: CultivationWorldSettings, characterBackground?: string, userConfig?: any) {
    this.worldSettings = settings;
    this.characterBackground = characterBackground;
    this.userConfig = userConfig;
    
    console.log('[修仙世界生成器] 初始化配置:', {
      characterBackground,
      userConfig
    });
  }

  /**
   * 生成完整的修仙世界
   */
  async generateWorld(): Promise<any> {
    const tavern = getTavernHelper();
    if (!tavern) {
      throw new Error('酒馆系统不可用');
    }

    // 构建世界生成提示词
    const worldPrompt = this.buildWorldGenerationPrompt();
    
    // 添加完整提示词的日志输出
    console.log('[修仙世界生成器] 完整提示词长度:', worldPrompt.length);
    console.log('[修仙世界生成器] 完整提示词内容:');
    console.log('='.repeat(50));
    console.log(worldPrompt);
    console.log('='.repeat(50));

    try {
      // 调用AI生成世界
      const response = await tavern.generateRaw({
        user_input: worldPrompt,
        custom_api: {
          temperature: 0.8
        }
      });

      console.log('[修仙世界生成器] AI响应:', response);

      // 解析并保存世界数据
      await this.parseAndSaveWorldData(String(response));

      return {
        success: true,
        message: '修仙世界生成完成',
        settings: this.worldSettings
      };

    } catch (error: any) {
      console.error('[修仙世界生成器] 生成失败:', error);
      
      // 提供更详细的错误信息
      if (error?.message === 'Bad Request') {
        throw new Error('API请求格式错误，可能是提示词过长或包含无效字符');
      } else if (error?.message && error.message.includes('token')) {
        throw new Error('API token 无效或已过期');
      } else if (error?.message && error.message.includes('timeout')) {
        throw new Error('API请求超时，请稍后重试');
      } else {
        throw new Error(`世界生成失败: ${error?.message || '未知错误'}`);
      }
    }
  }

  private buildWorldGenerationPrompt(): string {
    // 构建配置对象
    const promptConfig: WorldPromptConfig = {
      factionCount: this.userConfig?.majorFactionsCount || 7,
      totalLocations: this.userConfig?.totalLocations || 25,
      secretRealms: this.userConfig?.secretRealmsCount || 8,
      characterBackground: this.characterBackground,
      worldBackground: this.userConfig?.worldBackground,
      worldEra: this.userConfig?.worldEra,
      worldName: this.userConfig?.worldName
    };
    
    // 使用增强提示词构建器
    return EnhancedWorldPromptBuilder.buildPrompt(promptConfig);
  }

  /**
   * 解析并保存世界数据
   */
  private async parseAndSaveWorldData(response: string): Promise<void> {
    const tavern = getTavernHelper();
    if (!tavern) {
      console.warn('[修仙世界生成器] 无法获取酒馆助手，跳过数据保存');
      return;
    }

    try {
      console.log('[修仙世界生成器] 开始解析AI响应:', response.substring(0, 500));
      
      // 尝试从响应中提取JSON数据
      let jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch) {
        // 尝试匹配没有代码块标记的JSON
        jsonMatch = response.match(/(\{[\s\S]*"locations"\s*:\s*\[[\s\S]*?\}\s*\][\s\S]*?\})/);
      }
      
      if (!jsonMatch) {
        throw new Error('无法从AI响应中提取JSON数据');
      }
      
      const worldData = JSON.parse(jsonMatch[1]);
      console.log('[修仙世界生成器] 解析的世界数据:', worldData);
      
      // 提取势力和地点数据
      const factions = worldData.factions || [];
      const locations = worldData.locations || [];
      
      // 保存到酒馆变量
      const chatVars = {
        'world_continents': worldData.continents || [],
        'world_factions': factions,
        'world_locations': locations,
        'world_generation_info': worldData.generation_info || {}
      };
      
      await tavern.insertOrAssignVariables(chatVars, { type: 'chat' });
      
      console.log('[修仙世界生成器] 世界数据已成功保存到酒馆变量:', {
        continents_count: (worldData.continents || []).length,
        factions_count: factions.length,
        locations_count: locations.length,
        generation_info: worldData.generation_info
      });
      
    } catch (error) {
      console.error('[修仙世界生成器] 解析或保存世界数据失败:', error);
      console.log('[修仙世界生成器] 原始响应内容:', response);
      throw new Error(`世界数据解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}