/**
 * @fileoverview 游戏AI交互服务
 * 负责处理与SillyTavern的AI交互，包括消息发送、接收和状态更新
 */

import { getTavernHelper } from '@/utils/tavern';
import { processGmResponse } from '@/utils/AIGameMaster';
import { generateComprehensiveAIPrompt, generateOptimizedPrompt, type MemorySystem } from '@/utils/prompts/comprehensiveAISystem';
import { convertSaveDataToGameCharacter, convertSaveDataToMemorySystem, convertSaveDataToLocationContext } from '@/utils/prompts/aiSystemConverter';
import { PromptRouter, ActionAnalyzer, PromptQualityAssessor } from '@/utils/prompts/smartPromptRouter';
import { SettingsManager } from '@/utils/settings/settingsManager';
import { AIMemoryManager } from '@/utils/settings/memoryManager';
import { toast } from '@/utils/toast';
import type { GM_Response, GameCharacter } from '@/types/AIGameMaster';
import type { CharacterProfile, SaveData, GameMessage, GameTime } from '@/types/game';

/**
 * 将 GameTime 对象转换为字符串格式
 */
function formatGameTime(time: string | GameTime | undefined): string {
  if (!time) return '未知时间';
  if (typeof time === 'string') return time;
  return `${time.年}年${time.月}月${time.日}日 ${time.小时}:${String(time.分钟).padStart(2, '0')}`;
}

export class GameAIService {
  private static instance: GameAIService;
  private isProcessing = false;
  private settingsManager: SettingsManager;
  private memoryManager: AIMemoryManager | null = null;
  private currentDifficulty: 'normal' | 'medium' | 'hard' = 'normal';
  private memorySystem: MemorySystem = {
    short_term: [],
    mid_term: [],
    long_term: [],
    npc_interactions: {}
  };

  static getInstance(): GameAIService {
    if (!GameAIService.instance) {
      GameAIService.instance = new GameAIService();
    }
    return GameAIService.instance;
  }

  constructor() {
    this.settingsManager = SettingsManager.getInstance();
    this.initializeMemoryManager();
  }

  /**
   * 初始化记忆管理器
   */
  private initializeMemoryManager(): void {
    const settings = this.settingsManager.getSettings();
    this.memoryManager = new AIMemoryManager(settings);
    
    // 监听设置变化
    this.settingsManager.onSettingsChange('settings_updated', (newSettings) => {
      if (this.memoryManager) {
        this.memoryManager.updateSettings(newSettings);
      }
    });
  }

  /**
   * 发送用户消息给AI，处理响应并返回游戏消息
   */
  async sendMessageToAI(
    userMessage: string,
    characterProfile: CharacterProfile,
    onMessageUpdate?: (message: GameMessage) => void
  ): Promise<GameMessage[]> {
    if (this.isProcessing) {
      toast.warning('AI正在思考中，请稍等...');
      return [];
    }

    this.isProcessing = true;
    const messages: GameMessage[] = [];

    try {
      const helper = getTavernHelper();
      if (!helper) {
        throw new Error('无法连接到SillyTavern');
      }

      // 添加用户消息
      const playerMessage: GameMessage = {
        type: 'player',
        content: userMessage,
        time: this.formatGameTime()
      };
      messages.push(playerMessage);
      onMessageUpdate?.(playerMessage);

      // 显示AI思考状态
      const thinkingMessage: GameMessage = {
        type: 'system',
        content: '天道推演中...',
        time: this.formatGameTime()
      };
      onMessageUpdate?.(thinkingMessage);

      // 构建综合AI请求
      const systemPrompt = this.buildComprehensivePrompt(userMessage, characterProfile);
      
      console.log('[AI服务] 使用酒馆预设生成，系统提示词:', systemPrompt);

      // 使用酒馆的generateRaw函数和预设（按用户要求）
      const aiResponse = await helper.generateRaw(systemPrompt);

      console.log('[AI服务] 酒馆返回的原始响应:', aiResponse);

      // 解析AI响应
      const parsedResponse = this.parseAIResponse(aiResponse);
      console.log('[AI服务] AI响应解析结果:', parsedResponse);

      // 移除思考消息，添加AI回复
      const gameMessage: GameMessage = {
        type: 'ai',
        content: parsedResponse.text || aiResponse || '...',
        time: this.formatGameTime(),
        metadata: {
          commands: parsedResponse.tavern_commands || [],
          around: parsedResponse.around
        }
      };
      messages.push(gameMessage);

      // 处理AI指令和记忆更新
      if (parsedResponse.tavern_commands && parsedResponse.tavern_commands.length > 0) {
        await this.processAICommands(parsedResponse, characterProfile);
      }
      
      // 更新记忆系统
      if (parsedResponse.mid_term_memory) {
        this.updateMemorySystem(userMessage, parsedResponse.mid_term_memory);
      }

      // 如果有环境描述，添加系统消息
      if (parsedResponse.around) {
        const aroundMessage: GameMessage = {
          type: 'system',
          content: `[环境] ${parsedResponse.around}`,
          time: this.formatGameTime()
        };
        messages.push(aroundMessage);
      }

      toast.success('天道响应完成');
      
    } catch (error: any) {
      console.error('[AI服务] 处理AI消息失败:', error);
      toast.error(`AI交互失败: ${error.message}`);
      
      const errorMessage: GameMessage = {
        type: 'system',
        content: `[错误] ${error.message}`,
        time: this.formatGameTime()
      };
      messages.push(errorMessage);
    } finally {
      this.isProcessing = false;
    }

    return messages.filter(msg => msg.type !== 'system' || !msg.content.includes('天道推演中'));
  }

  /**
   * 构建智能优化的AI提示词
   */
  private buildComprehensivePrompt(userMessage: string, characterProfile: CharacterProfile): string {
    const saveData = this.getSaveData(characterProfile);
    if (!saveData) {
      console.warn('[AI服务] 存档数据为空，使用简化提示词');
      return this.buildSimplePrompt(userMessage, characterProfile);
    }

    try {
      // 转换存档数据为AI系统格式
      const character = convertSaveDataToGameCharacter(saveData, characterProfile);
      const memory = convertSaveDataToMemorySystem(saveData);
      const location = convertSaveDataToLocationContext(saveData);

      // 合并内存中的记忆系统
      this.mergeMemorySystems(memory, this.memorySystem);

      // 添加当前用户消息到短期记忆
      const settings = this.settingsManager.getSettings();
      memory.short_term.unshift(`玩家行动: ${userMessage}`);
      if (memory.short_term.length > settings.memory.shortTerm.maxLength) {
        memory.short_term = memory.short_term.slice(0, settings.memory.shortTerm.maxLength);
      }

      // 使用智能路由系统选择最佳提示词
      console.log('[AI服务] 使用智能提示词路由系统');
      
      // 分析用户行动
      const actionAnalysis = ActionAnalyzer.analyzeAction(userMessage);
      console.log('[AI服务] 行动分析结果:', actionAnalysis);

      // 选择最优提示词
      const optimizedPrompt = PromptRouter.selectOptimalPrompt({
        character,
        memory,
        location,
        userAction: userMessage,
        worldTime: formatGameTime(saveData.游戏时间),
        difficulty: this.currentDifficulty
      });

      // 评估提示词质量
      const qualityAssessment = PromptQualityAssessor.assessPromptQuality(optimizedPrompt, {
        actionType: actionAnalysis.primaryType,
        complexity: actionAnalysis.confidence,
        characterLevel: character.cultivation?.realm_progress || 1
      });

      console.log('[AI服务] 提示词质量评估:', qualityAssessment);

      // 如果质量评分较低，添加改进建议
      if (qualityAssessment.score < 60) {
        console.warn('[AI服务] 提示词质量偏低，建议:', qualityAssessment.suggestions);
      }

      return optimizedPrompt;

    } catch (error) {
      console.error('[AI服务] 智能提示词生成失败，回退到综合版本:', error);
      return this.buildComprehensivePromptFallback(userMessage, characterProfile, saveData);
    }
  }

  /**
   * 备用的综合提示词构建方法
   */
  private buildComprehensivePromptFallback(userMessage: string, characterProfile: CharacterProfile, saveData: SaveData): string {
    try {
      const character = convertSaveDataToGameCharacter(saveData, characterProfile);
      const memory = convertSaveDataToMemorySystem(saveData);
      const location = convertSaveDataToLocationContext(saveData);

      this.mergeMemorySystems(memory, this.memorySystem);

      const settings = this.settingsManager.getSettings();
      memory.short_term.unshift(`玩家行动: ${userMessage}`);
      if (memory.short_term.length > settings.memory.shortTerm.maxLength) {
        memory.short_term = memory.short_term.slice(0, settings.memory.shortTerm.maxLength);
      }

      return generateComprehensiveAIPrompt({
        character,
        memory,
        location,
        worldTime: formatGameTime(saveData.游戏时间),
        difficulty: this.currentDifficulty,
        isMultiplayer: characterProfile.模式 === '联机',
        includeAntiCheat: characterProfile.模式 === '联机'
      });
    } catch (error) {
      console.error('[AI服务] 备用提示词构建也失败，使用简化版本:', error);
      return this.buildSimplePrompt(userMessage, characterProfile);
    }
  }

  /**
   * 构建简化提示词（备用方案）
   */
  private buildSimplePrompt(userMessage: string, characterProfile: CharacterProfile): string {
    const saveData = this.getSaveData(characterProfile);
    const character = saveData ? convertSaveDataToGameCharacter(saveData) : null;
    
    return generateOptimizedPrompt({
      character: character || this.createFallbackCharacter(characterProfile),
      currentAction: userMessage,
      difficulty: this.currentDifficulty,
      recentMemory: this.memorySystem.short_term
    });
  }

  /**
   * 获取存档数据
   */
  private getSaveData(characterProfile: CharacterProfile): SaveData | null {
    if (characterProfile.模式 === '单机') {
      return characterProfile.存档列表?.['存档1']?.存档数据 || null;
    } else {
      return characterProfile.存档?.存档数据 || null;
    }
  }

  /**
   * 创建备用角色数据
   */
  private createFallbackCharacter(characterProfile: CharacterProfile): GameCharacter {
    const baseInfo = characterProfile.角色基础信息;
    return {
      identity: {
        name: baseInfo.名字,
        title: undefined,
        age: 18,
        apparent_age: 18,
        gender: '男',
        description: `来自${baseInfo.世界}的修士`
      },
      cultivation: {
        realm: '凡人',
        realm_progress: 0,
        lifespan_remaining: 82
      },
      attributes: {
        STR: baseInfo.先天六司?.根骨 || 5,
        CON: baseInfo.先天六司?.根骨 || 5,
        DEX: 5,
        INT: baseInfo.先天六司?.悟性 || 5,
        SPI: baseInfo.先天六司?.灵性 || 5,
        LUK: baseInfo.先天六司?.气运 || 5
      },
      resources: {
        qi: { current: 100, max: 100 },
        ling: { current: 0, max: 0 },
        shen: { current: 50, max: 50 }
      },
      qualities: {
        origin: { name: baseInfo.出生 || '普通', effects: [] },
        spiritRoot: { name: baseInfo.灵根 || '普通灵根', quality: '凡品', attributes: [] },
        talents: []
      },
      skills: {},
      cultivation_arts: {},
      equipment: {
        accessories: [],
        treasures: [],
        consumables: []
      },
      social: {
        relationships: {},
        reputation: {}
      },
      hidden_state: {
        karma: { righteous: 0, demonic: 0, heavenly_favor: 5 },
        dao_heart: { stability: 50, demons: [], enlightenment: 0 },
        special_marks: []
      },
      status: {
        conditions: [],
        location: '未知',
        activity: '待机'
      }
    };
  }

  /**
   * 合并记忆系统
   */
  private mergeMemorySystems(saveMemory: MemorySystem, inMemorySystem: MemorySystem): void {
    // 合并NPC交互记忆
    Object.assign(saveMemory.npc_interactions, inMemorySystem.npc_interactions);
    
    // 合并其他记忆（优先使用内存中的，因为它们可能更新）
    if (inMemorySystem.short_term.length > 0) {
      saveMemory.short_term = [...inMemorySystem.short_term, ...saveMemory.short_term];
    }
    if (inMemorySystem.mid_term.length > 0) {
      saveMemory.mid_term = [...inMemorySystem.mid_term, ...saveMemory.mid_term];
    }
    if (inMemorySystem.long_term.length > 0) {
      saveMemory.long_term = [...inMemorySystem.long_term, ...saveMemory.long_term];
    }
  }

  /**
   * 更新记忆系统
   */
  private updateMemorySystem(userMessage: string, midTermMemory: string): void {
    const settings = this.settingsManager.getSettings();
    
    // 添加到中期记忆
    if (settings.memory.midTerm.enabled) {
      this.memorySystem.mid_term.unshift(midTermMemory);
      
      // 检查是否需要转换为长期记忆
      if (this.memorySystem.mid_term.length > settings.memory.midTerm.maxLength) {
        // 转换最旧的中期记忆到长期记忆
        const oldMemory = this.memorySystem.mid_term.pop();
        if (oldMemory && this.isImportantMemory(oldMemory) && settings.memory.longTerm.enabled) {
          this.memorySystem.long_term.unshift(oldMemory);
          
          // 检查长期记忆限制
          if (!settings.memory.longTerm.unlimited && settings.memory.longTerm.maxLength) {
            if (this.memorySystem.long_term.length > settings.memory.longTerm.maxLength) {
              this.memorySystem.long_term = this.memorySystem.long_term.slice(0, settings.memory.longTerm.maxLength);
            }
          }
        }
      }
    }

    // 更新短期记忆
    if (settings.memory.shortTerm.enabled) {
      this.memorySystem.short_term.unshift(`用户: ${userMessage}`);
      if (this.memorySystem.short_term.length > settings.memory.shortTerm.maxLength) {
        this.memorySystem.short_term = this.memorySystem.short_term.slice(0, settings.memory.shortTerm.maxLength);
      }
    }
  }

  /**
   * 判断是否为重要记忆
   */
  private isImportantMemory(memory: string): boolean {
    const importantKeywords = ['突破', '境界', '死亡', '重伤', '结识', '敌对', '获得', '法宝', '功法', '师父', '弟子'];
    return importantKeywords.some(keyword => memory.includes(keyword));
  }

  /**
   * 设置难度等级
   */
  setDifficulty(difficulty: 'normal' | 'medium' | 'hard'): void {
    this.currentDifficulty = difficulty;
    console.log(`[AI服务] 难度设置为: ${difficulty}`);
  }

  /**
   * 获取当前记忆系统状态
   */
  getMemorySystem(): MemorySystem {
    return { ...this.memorySystem };
  }

  /**
   * 重置记忆系统
   */
  resetMemorySystem(): void {
    this.memorySystem = {
      short_term: [],
      mid_term: [],
      long_term: [],
      npc_interactions: {}
    };
    console.log('[AI服务] 记忆系统已重置');
  }


  /**
   * 解析AI响应
   */
  private parseAIResponse(rawResponse: any): GM_Response {
    let text = '';
    
    // 处理不同格式的响应
    if (rawResponse && typeof rawResponse === 'object' && rawResponse.choices) {
      text = rawResponse.choices[0]?.message?.content || rawResponse.choices[0]?.text || '';
    } else if (typeof rawResponse === 'string') {
      text = rawResponse;
    } else {
      text = String(rawResponse || '');
    }

    if (!text.trim()) {
      throw new Error('AI返回了空响应');
    }

    // 尝试提取JSON
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (error) {
        console.warn('[AI服务] JSON解析失败，返回纯文本响应');
      }
    }

    // 如果无法解析JSON，返回基础响应
    return {
      text: text,
      tavern_commands: []
    };
  }

  /**
   * 处理AI指令
   */
  private async processAICommands(response: GM_Response, characterProfile: CharacterProfile) {
    try {
      // 构建角色数据用于指令处理
      const characterData = {
        character_name: characterProfile.角色基础信息.名字
      };

      await processGmResponse(response, characterData as any);
      
      // 如果AI响应包含角色数据更新，应用到角色商店
      // 注意：character_updates 目前不在 GM_Response 接口中定义
      if ('character_updates' in response && response.character_updates) {
        const { useCharacterStore } = await import('@/stores/characterStore');
        const characterStore = useCharacterStore();
        characterStore.updateCharacterData(response.character_updates);
      }
      
    } catch (error: any) {
      console.error('[AI服务] 处理AI指令失败:', error);
      toast.warning(`部分指令执行失败: ${error.message}`);
    }
  }

  /**
   * 格式化游戏时间
   */
  private formatGameTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * 检查是否正在处理中
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * 获取记忆设置
   */
  getMemorySettings() {
    return this.settingsManager.getSettings().memory;
  }

  /**
   * 生成初始游戏消息
   */
  async generateInitialGameMessage(characterProfile: CharacterProfile, saveSlot: any): Promise<{ message: string }> {
    try {
      console.log('[AI服务] 开始生成初始游戏消息');
      
      const helper = getTavernHelper();
      if (!helper) {
        throw new Error('SillyTavern助手未可用');
      }

      // 构建初始消息的提示词
      const baseInfo = characterProfile.角色基础信息;
      const playerStatus = saveSlot?.存档数据?.玩家角色状态;
      
      const initialPrompt = `【天道初言生成】
请为一位刚刚踏入修仙世界的角色生成开场故事。

角色信息：
- 道号：${baseInfo.名字}
- 性别：${baseInfo.性别}
- 世界：${baseInfo.世界}
- 天资：${baseInfo.天资}
- 出身：${baseInfo.出生}
- 灵根：${baseInfo.灵根}
- 天赋：${baseInfo.天赋?.join('、') || '无'}
- 当前境界：${playerStatus?.境界?.名称 || '凡人'}

要求：
1. 生成一段200-400字的开场描述
2. 要体现角色的出身背景和世界观
3. 要有代入感和沉浸感
4. 要符合修仙题材的氛围
5. 结尾要引导玩家进行第一个选择

请直接输出开场故事，不要包含其他格式。`;

      // 发送给AI
      const response = await helper.generateRaw(initialPrompt);
      
      if (!response || typeof response !== 'string') {
        throw new Error('AI返回了无效的响应');
      }

      const cleanedMessage = response.trim().replace(/^【[^】]*】\s*/, '');
      
      console.log('[AI服务] 初始消息生成成功');
      return { message: cleanedMessage };
      
    } catch (error) {
      console.error('[AI服务] 生成初始游戏消息失败:', error);
      throw error;
    }
  }
}