/**
 * @fileoverview 游戏AI交互服务
 * 负责处理与SillyTavern的AI交互，包括消息发送、接收和状态更新
 */

import { getTavernHelper } from '@/utils/tavern';
import { processGmResponse, buildGmRequest } from '@/utils/AIGameMaster';
import { generateComprehensiveAIPrompt, generateOptimizedPrompt, type MemorySystem, type LocationContext } from '@/utils/prompts/comprehensiveAISystem';
import { convertSaveDataToGameCharacter, convertSaveDataToMemorySystem, convertSaveDataToLocationContext, createGMRequest } from '@/utils/prompts/aiSystemConverter';
import { SettingsManager } from '@/utils/settings/settingsManager';
import { AIMemoryManager } from '@/utils/settings/memoryManager';
import { toast } from '@/utils/toast';
import type { GM_Response, GameCharacter } from '@/types/AIGameMaster';
import type { CharacterProfile, SaveData } from '@/types/game';

export interface GameMessage {
  type: 'system' | 'player' | 'game' | 'ai';
  content: string;
  time: string;
  metadata?: {
    commands?: any[];
    around?: string;
  };
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
   * 构建综合AI提示词
   */
  private buildComprehensivePrompt(userMessage: string, characterProfile: CharacterProfile): string {
    const saveData = this.getSaveData(characterProfile);
    if (!saveData) {
      console.warn('[AI服务] 存档数据为空，使用简化提示词');
      return this.buildSimplePrompt(userMessage, characterProfile);
    }

    try {
      // 转换存档数据为AI系统格式
      const character = convertSaveDataToGameCharacter(saveData);
      const memory = convertSaveDataToMemorySystem(saveData);
      const location = convertSaveDataToLocationContext(saveData);

      // 合并内存中的记忆系统
      this.mergeMemorySystems(memory, this.memorySystem);

      // 添加当前用户消息到短期记忆
      memory.short_term.unshift(`玩家行动: ${userMessage}`);
      if (memory.short_term.length > 3) {
        memory.short_term = memory.short_term.slice(0, 3);
      }

      return generateComprehensiveAIPrompt({
        character,
        memory,
        location,
        worldTime: saveData.游戏时间 || '未知时间',
        difficulty: this.currentDifficulty,
        isMultiplayer: characterProfile.模式 === '联机',
        includeAntiCheat: characterProfile.模式 === '联机'
      });
    } catch (error) {
      console.error('[AI服务] 构建综合提示词失败，回退到简化版本:', error);
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
    // 添加到中期记忆
    this.memorySystem.mid_term.unshift(midTermMemory);
    if (this.memorySystem.mid_term.length > 10) {
      // 最旧的中期记忆转入长期记忆
      const oldMemory = this.memorySystem.mid_term.pop();
      if (oldMemory && this.isImportantMemory(oldMemory)) {
        this.memorySystem.long_term.unshift(oldMemory);
        if (this.memorySystem.long_term.length > 20) {
          this.memorySystem.long_term = this.memorySystem.long_term.slice(0, 20);
        }
      }
    }

    // 更新短期记忆
    this.memorySystem.short_term.unshift(`用户: ${userMessage}`);
    if (this.memorySystem.short_term.length > 3) {
      this.memorySystem.short_term = this.memorySystem.short_term.slice(0, 3);
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
      if (response.character_updates) {
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
}