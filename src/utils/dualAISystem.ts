/**
 * 双AI计算系统 - 复用现有的辅助API配置
 * 辅助AI：快速场景识别和基础计算
 * 主AI：酒馆生成最终内容
 */

import { MemoryManager } from './settings/memoryManager';
import { MemorySettings } from './settings/memorySettings';
import { getTavernHelper } from './tavernCore';
import { LuckLevel } from './calculationSystem';
import type { RealmStage } from '../types/game';

// 辅助AI请求类型
export interface AssistantAIRequest {
  type: 'scenario_recognition' | 'basic_calculation';
  userInput: string;
  gameContext?: {
    location?: string;
    recentActions?: string[];
    nearbyObjects?: string[];
    playerState?: string;
  };
  playerData?: {
    realm: number;
    stage: RealmStage;
    attributes: Record<string, number>;
    luck: LuckLevel;
  };
}

// 辅助AI响应
export interface AssistantAIResponse {
  scenario_type: string;
  confidence: number;
  basic_calculation?: {
    success_rate?: number;
    effect_value?: number;
    difficulty_assessment: string;
  };
  factors_to_consider: string[];
  recommended_processing: 'programmatic' | 'ai_heavy' | 'balanced';
  reasoning: string;
}

/**
 * 双AI系统管理器
 */
export class DualAISystem {
  private memoryManager: MemoryManager;
  
  constructor() {
    this.memoryManager = MemoryManager.getInstance();
  }
  
  /**
   * 第一步：使用辅助AI快速识别场景和基础计算
   */
  async assistantAIProcess(request: AssistantAIRequest): Promise<AssistantAIResponse | null> {
    
    // 检查是否配置了辅助API
    if (!this.isAssistantAIAvailable()) {
      console.log('🔄 辅助AI未配置，使用默认处理');
      return this.getDefaultProcessing(request);
    }
    
    try {
      console.log('🤖 使用辅助AI处理场景识别...');
      
      const prompt = this.buildAssistantPrompt(request);
      const response = await this.memoryManager.querySecondaryAPI(prompt);
      
      if (response) {
        console.log('✅ 辅助AI处理完成');
        return this.parseAssistantResponse(response);
      }
      
    } catch (error) {
      console.error('❌ 辅助AI调用失败:', error);
    }
    
    // 失败时使用默认处理
    return this.getDefaultProcessing(request);
  }
  
  /**
   * 第二步：使用主AI（酒馆）生成最终内容
   */
  async mainAIProcess(
    assistantResult: AssistantAIResponse,
    userInput: string,
    fullPlayerInfo: any
  ): Promise<string> {
    
    console.log('🎭 使用主AI（酒馆）生成最终内容...');
    
    try {
      const helper = getTavernHelper();
      const prompt = this.buildMainAIPrompt(assistantResult, userInput, fullPlayerInfo);
      
      const response = await helper.generateRaw({
        prompt,
        max_tokens: 2000,
        temperature: 0.8
      });
      
      // 处理酒馆响应
      let content = '';
      if (response?.choices?.[0]?.message?.content) {
        content = response.choices[0].message.content;
      } else if (typeof response === 'string') {
        content = response;
      }
      
      console.log('✅ 主AI内容生成完成');
      return content;
      
    } catch (error) {
      console.error('❌ 主AI生成失败:', error);
      return this.generateFallbackContent(assistantResult, userInput);
    }
  }
  
  /**
   * 完整的双AI处理流程
   */
  async processComplete(
    userInput: string,
    gameContext?: any,
    playerData?: any
  ): Promise<{
    assistantResult: AssistantAIResponse;
    finalContent: string;
    processingStats: {
      assistantTime: number;
      mainAITime: number;
      totalTime: number;
    };
  }> {
    
    const startTime = Date.now();
    console.log(`🚀 开始双AI处理: "${userInput}"`);
    
    // 第一步：辅助AI处理
    const assistantStart = Date.now();
    const assistantResult = await this.assistantAIProcess({
      type: 'scenario_recognition',
      userInput,
      gameContext,
      playerData
    });
    const assistantTime = Date.now() - assistantStart;
    
    if (!assistantResult) {
      throw new Error('辅助AI处理失败');
    }
    
    // 第二步：主AI处理
    const mainStart = Date.now();
    const finalContent = await this.mainAIProcess(assistantResult, userInput, playerData);
    const mainAITime = Date.now() - mainStart;
    
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ 双AI处理完成，总耗时: ${totalTime}ms`);
    
    return {
      assistantResult,
      finalContent,
      processingStats: {
        assistantTime,
        mainAITime,
        totalTime
      }
    };
  }
  
  /**
   * 检查辅助AI是否可用
   */
  private isAssistantAIAvailable(): boolean {
    const settings = this.memoryManager.getMemorySettings();
    return settings.api.secondaryAPI.enabled && 
           settings.api.secondaryAPI.type !== 'tavern_secondary' &&
           !!settings.api.secondaryAPI.apiKey;
  }
  
  /**
   * 构建辅助AI提示词
   */
  private buildAssistantPrompt(request: AssistantAIRequest): string {
    return `你是一个修仙游戏的场景识别AI助手。请分析用户输入并返回JSON格式的结果。

用户输入: "${request.userInput}"
${request.gameContext ? `游戏上下文: ${JSON.stringify(request.gameContext)}` : ''}
${request.playerData ? `玩家数据: 境界${request.playerData.realm}级${request.playerData.stage}` : ''}

请返回JSON格式的分析结果：
{
  "scenario_type": "combat|cultivation|breakthrough|alchemy|social|exploration|其他",
  "confidence": 0.95,
  "basic_calculation": {
    "success_rate": 75,
    "effect_value": 120,
    "difficulty_assessment": "中等"
  },
  "factors_to_consider": ["天赋影响", "环境因素", "心境状态"],
  "recommended_processing": "balanced",
  "reasoning": "识别理由"
}

只返回JSON，不要其他文字。`;
  }
  
  /**
   * 构建主AI提示词
   */
  private buildMainAIPrompt(
    assistantResult: AssistantAIResponse,
    userInput: string,
    playerInfo: any
  ): string {
    
    let prompt = `【修仙游戏AI】请为以下场景生成游戏内容：

用户行动: ${userInput}
场景类型: ${assistantResult.scenario_type}
处理方式: ${assistantResult.recommended_processing}

`;
    
    // 根据处理方式调整提示词
    if (assistantResult.recommended_processing === 'programmatic') {
      prompt += `程序计算结果:
- 成功率: ${assistantResult.basic_calculation?.success_rate || 50}%
- 效果值: ${assistantResult.basic_calculation?.effect_value || 100}
- 难度: ${assistantResult.basic_calculation?.difficulty_assessment || '普通'}

请根据这些数值生成详细的过程描述，不要修改数值。`;
      
    } else if (assistantResult.recommended_processing === 'ai_heavy') {
      prompt += `这是一个需要AI完全判断的场景。
参考因素: ${assistantResult.factors_to_consider.join('、')}
请根据修仙小说的逻辑，生动地描述这个场景的发展过程和结果。`;
      
    } else {
      prompt += `混合处理场景：
基础评估: ${assistantResult.basic_calculation?.difficulty_assessment || '普通'}难度
关键因素: ${assistantResult.factors_to_consider.join('、')}

请结合数值参考和文字描述，生成有趣的游戏内容。`;
    }
    
    if (playerInfo) {
      prompt += `\n\n玩家信息: ${JSON.stringify(playerInfo, null, 2)}`;
    }
    
    return prompt;
  }
  
  /**
   * 解析辅助AI响应
   */
  private parseAssistantResponse(response: string): AssistantAIResponse | null {
    try {
      // 尝试提取JSON
      let jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        jsonMatch = response.match(/\{[\s\S]*\}/);
      }
      
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
      return JSON.parse(jsonStr.trim());
      
    } catch (error) {
      console.error('解析辅助AI响应失败:', error);
      return null;
    }
  }
  
  /**
   * 默认处理（当辅助AI不可用时）
   */
  private getDefaultProcessing(request: AssistantAIRequest): AssistantAIResponse {
    // 简单的关键词匹配
    const input = request.userInput.toLowerCase();
    
    let scenario_type = 'exploration';
    let confidence = 0.3;
    
    if (input.includes('攻击') || input.includes('战斗') || input.includes('打')) {
      scenario_type = 'combat';
      confidence = 0.8;
    } else if (input.includes('修炼') || input.includes('练功')) {
      scenario_type = 'cultivation';
      confidence = 0.8;
    } else if (input.includes('突破')) {
      scenario_type = 'breakthrough';
      confidence = 0.9;
    } else if (input.includes('炼丹') || input.includes('炼药')) {
      scenario_type = 'alchemy';
      confidence = 0.9;
    } else if (input.includes('表白') || input.includes('聊天') || input.includes('说话')) {
      scenario_type = 'social';
      confidence = 0.7;
    }
    
    return {
      scenario_type,
      confidence,
      basic_calculation: {
        success_rate: 50 + Math.random() * 40,
        effect_value: 80 + Math.random() * 40,
        difficulty_assessment: '普通'
      },
      factors_to_consider: ['玩家境界', '当前状态', '环境影响'],
      recommended_processing: confidence > 0.7 ? 'balanced' : 'ai_heavy',
      reasoning: '基于关键词的默认识别'
    };
  }
  
  /**
   * 生成备用内容（当主AI失败时）
   */
  private generateFallbackContent(result: AssistantAIResponse, userInput: string): string {
    return `你尝试${userInput}。

基于当前评估（${result.scenario_type}场景，${result.confidence > 0.7 ? '高' : '中等'}置信度），
这个行动的难度为${result.basic_calculation?.difficulty_assessment || '未知'}。

${result.basic_calculation?.success_rate ? 
  `成功概率约为${result.basic_calculation.success_rate.toFixed(0)}%。` : ''}

需要考虑的因素包括：${result.factors_to_consider.join('、')}。

（注：这是备用响应，主AI系统暂时不可用）`;
  }
}

/**
 * 便捷使用函数
 */
export async function processUserInputDualAI(
  userInput: string,
  gameContext?: any,
  playerData?: any
): Promise<string> {
  
  const dualAI = new DualAISystem();
  
  try {
    const result = await dualAI.processComplete(userInput, gameContext, playerData);
    
    console.log(`📊 处理统计:
- 辅助AI: ${result.processingStats.assistantTime}ms
- 主AI: ${result.processingStats.mainAITime}ms  
- 总计: ${result.processingStats.totalTime}ms`);
    
    return result.finalContent;
    
  } catch (error) {
    console.error('双AI系统处理失败:', error);
    return `处理"${userInput}"时发生错误，请稍后重试。`;
  }
}

/**
 * 系统配置检查
 */
export function checkDualAIConfiguration(): {
  assistantAI: boolean;
  mainAI: boolean;
  recommendation: string;
} {
  
  const dualAI = new DualAISystem();
  const assistantAvailable = dualAI['isAssistantAIAvailable']();
  
  let mainAIAvailable = false;
  try {
    getTavernHelper();
    mainAIAvailable = true;
  } catch {
    // 主AI不可用
  }
  
  let recommendation = '';
  if (!assistantAvailable && !mainAIAvailable) {
    recommendation = '请配置至少一个AI接口';
  } else if (!assistantAvailable) {
    recommendation = '建议配置辅助AI以获得更好的场景识别效果';
  } else if (!mainAIAvailable) {
    recommendation = '请在SillyTavern环境中运行以获得完整功能';
  } else {
    recommendation = '双AI系统配置完整，可获得最佳体验';
  }
  
  return {
    assistantAI: assistantAvailable,
    mainAI: mainAIAvailable,
    recommendation
  };
}

export { DualAISystem };