/**
 * @fileoverview 游戏AI交互服务
 * 负责处理与SillyTavern的AI交互，包括消息发送、接收和状态更新
 */

import { getTavernHelper } from '@/utils/tavern';
import { processGmResponse } from '@/utils/AIGameMaster';
import { generateInGameResponse } from '@/utils/generators/gameMasterGenerators';
import { convertSaveDataToGameCharacter, convertSaveDataToMemorySystem, convertSaveDataToLocationContext } from '@/utils/prompts/aiSystemConverter';
import { ActionAnalyzer } from '@/utils/prompts/smartPromptRouter';
import { SettingsManager } from '@/utils/settings/settingsManager';
import { AIMemoryManager } from '@/utils/settings/memoryManager';
import { MultiLayerMemorySystem } from '@/utils/MultiLayerMemorySystem';
import { toast } from '@/utils/toast';
import type { GM_Response, GameCharacter } from '@/types/AIGameMaster';
import type { CharacterProfile, SaveData, GameMessage, GameTime } from '@/types/game';

// MemorySystem 类型定义
type MemorySystem = {
  short_term: string[];
  mid_term: string[];
  long_term: string[];
  npc_interactions: Record<string, any>;
};

// AI的原始响应类型
interface TavernResponseChoice {
  text?: string;
  message?: {
    content?: string;
  };
}

interface TavernResponse {
  choices: TavernResponseChoice[];
}

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
      // 在构建提示词前，若达到中期记忆阈值，先进行一次摘要
      try {
        const summarized = await MultiLayerMemorySystem.getInstance().ensureMidTermSummaryIfNeeded?.();
        if (summarized) {
          console.log('[AI服务] 已在发送前完成一次中期记忆摘要');
        }
      } catch (e) {
        console.warn('[AI服务] 发送前整理记忆失败（不阻塞请求）:', e);
      }
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

      // 构建并发送AI请求（使用标准的GM生成器）
      const gmResponse = await this.generateAIResponseUsingStandardGenerator(userMessage, characterProfile);
      
      console.log('[AI服务] GM响应结果:', gmResponse);

      // 解析AI响应 - GM生成器已返回标准格式，直接使用
      const aiText = gmResponse.text || '...';
      
      // 移除思考消息，添加AI回复
      const gameMessage: GameMessage = {
        type: 'ai',
        content: aiText,
        time: this.formatGameTime(),
        metadata: {
          commands: gmResponse.tavern_commands || []
        }
      };
      messages.push(gameMessage);

      // 处理AI指令和记忆更新
      if (gmResponse.tavern_commands && gmResponse.tavern_commands.length > 0) {
        await this.processAICommands(gmResponse, characterProfile);
      }
      
      // 更新记忆系统 - 按照AI指令集方案处理记忆
      this.processAIMemoryUpdates(gmResponse, userMessage);


      toast.success('天道响应完成');
      
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      console.error('[AI服务] 处理AI消息失败:', error);
      toast.error(`AI交互失败: ${errorText}`);
      
      const gameErrorMessage: GameMessage = {
        type: 'system',
        content: `[错误] ${errorText}`,
        time: this.formatGameTime()
      };
      messages.push(gameErrorMessage);
    } finally {
      this.isProcessing = false;
    }

    return messages.filter(msg => msg.type !== 'system' || !msg.content.includes('天道推演中'));
  }

  /**
   * 使用标准GM生成器生成AI响应
   */
  private async generateAIResponseUsingStandardGenerator(userMessage: string, characterProfile: CharacterProfile): Promise<GM_Response> {
    const saveData = this.getSaveData(characterProfile);
    if (!saveData) {
      throw new Error('存档数据为空，无法生成AI响应');
    }

    try {
      // 构建当前游戏状态数据
      const currentGameData = {
        character: convertSaveDataToGameCharacter(saveData, characterProfile),
        memory: convertSaveDataToMemorySystem(saveData),
        location: convertSaveDataToLocationContext(saveData),
        playerAction: userMessage,
        worldTime: formatGameTime(saveData.游戏时间),
        difficulty: this.currentDifficulty,
        saveData: saveData // 提供完整的存档数据作为参考
      };

      // 合并内存中的记忆系统
      this.mergeMemorySystems(currentGameData.memory, this.memorySystem);

      // 添加当前用户消息到短期记忆
      const settings = this.settingsManager.getSettings();
      currentGameData.memory.short_term.unshift(`玩家行动: ${userMessage}`);
      if (currentGameData.memory.short_term.length > settings.memory.shortTerm.maxLength) {
        currentGameData.memory.short_term = currentGameData.memory.short_term.slice(0, settings.memory.shortTerm.maxLength);
      }

      // 分析用户行动类型以选择合适的场景
      const actionAnalysis = ActionAnalyzer.analyzeAction(userMessage);
      console.log('[AI服务] 行动分析结果:', actionAnalysis);

      // 根据行动类型选择场景
      let sceneType: '战斗' | '修炼' | '社交' | '探索' | '传承' | undefined;
      if (actionAnalysis.primaryType === 'combat') sceneType = '战斗';
      else if (actionAnalysis.primaryType === 'cultivation') sceneType = '修炼';
      else if (actionAnalysis.primaryType === 'interaction') sceneType = '社交';
      else if (actionAnalysis.primaryType === 'exploration') sceneType = '探索';
      // 暂时没有对应的传承类型，使用general类型时不设置特定场景

      // 使用标准的GM生成器
      console.log('[AI服务] 使用标准GM生成器，场景类型:', sceneType || '通用');
      const gmResponse = await generateInGameResponse(currentGameData, userMessage, sceneType);
      
      return gmResponse;

    } catch (error) {
      console.error('[AI服务] 标准GM生成器失败:', error);
      throw error;
    }
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
   * 处理AI记忆更新 - 按照AI指令集方案
   * 实现：消息接收之后短期正文要存入text，中期等短期达标范围了就转化
   */
  private processAIMemoryUpdates(gmResponse: GM_Response, userMessage: string): void {
    const settings = this.settingsManager.getSettings();
    
    // 1. 处理AI的text字段作为短期记忆 - 这是主要的记忆内容
    if (gmResponse.text && gmResponse.text.trim()) {
      console.log('[记忆系统] 将AI响应text存入短期记忆:', gmResponse.text.substring(0, 100) + '...');
      this.addToShortTermMemory(`AI回应: ${gmResponse.text}`);
    }
    
    // 2. 同时处理用户消息作为短期记忆的一部分
    if (userMessage && userMessage.trim()) {
      this.addToShortTermMemory(`玩家行动: ${userMessage}`);
    }
    
    // 3. 将当前交互通过MultiLayerMemorySystem处理
    try {
      const memorySystem = MultiLayerMemorySystem.getInstance();
      
      // 创建聊天消息记录
      const chatMessages = [];
      
      if (userMessage) {
        chatMessages.push({
          id: `msg_${Date.now()}_user`,
          role: 'user' as const,
          content: userMessage,
          timestamp: new Date().toISOString()
        });
      }
      
      if (gmResponse.text) {
        chatMessages.push({
          id: `msg_${Date.now()}_ai`,
          role: 'assistant' as const,
          content: gmResponse.text,
          timestamp: new Date().toISOString()
        });
      }
      
      // 添加到多层记忆系统
      chatMessages.forEach(msg => memorySystem.addMessage(msg));
      
      console.log('[记忆系统] 已将交互记录添加到多层记忆系统');
    } catch (error) {
      console.error('[记忆系统] 多层记忆系统处理失败:', error);
    }
    
    // 4. 检查记忆转化（超出限制时自动转化）
    this.checkAndConvertMemories();
  }
  
  /**
   * 添加到短期记忆
   * 实现将text内容存储到短期记忆，并在达标时触发中期记忆转化
   */
  private addToShortTermMemory(content: string): void {
    const settings = this.settingsManager.getSettings();
    if (!settings.memory.shortTerm.enabled) return;
    
    // 清理和格式化内容
    const cleanContent = this.cleanMemoryContent(content);
    
    // 添加到短期记忆
    this.memorySystem.short_term.unshift(cleanContent);
    
    console.log(`[记忆系统] 添加到短期记忆: ${cleanContent.substring(0, 50)}...`);
    console.log(`[记忆系统] 当前短期记忆数量: ${this.memorySystem.short_term.length}/${settings.memory.shortTerm.maxLength}`);
    
    // 检查是否需要转化到中期记忆
    this.checkMidTermConversionThreshold();
  }
  
  /**
   * 检查中期记忆转化阈值
   * 当短期记忆达到设定阈值时，自动触发转化
   */
  private checkMidTermConversionThreshold(): void {
    const settings = this.settingsManager.getSettings();
    const currentShortTermCount = this.memorySystem.short_term.length;
    
    // 设定转化阈值为短期记忆限制的80%
    const conversionThreshold = Math.floor(settings.memory.shortTerm.maxLength * 0.8);
    
    if (currentShortTermCount >= conversionThreshold) {
      console.log(`[记忆系统] 短期记忆达到转化阈值 ${currentShortTermCount}/${conversionThreshold}，开始中期记忆转化`);
      this.triggerMidTermConversion();
    }
  }
  
  /**
   * 触发中期记忆转化
   * 将短期记忆的前半部分转化为中期记忆摘要
   */
  private triggerMidTermConversion(): void {
    const settings = this.settingsManager.getSettings();
    
    try {
      // 取前一半的短期记忆进行转化
      const conversionCount = Math.floor(this.memorySystem.short_term.length / 2);
      const memoriesToConvert = this.memorySystem.short_term.splice(-conversionCount, conversionCount);
      
      if (memoriesToConvert.length > 0) {
        // 生成中期记忆摘要
        const summary = this.generateMidTermSummary(memoriesToConvert);
        
        // 添加到中期记忆
        this.addToMidTermMemory(summary);
        
        console.log(`[记忆系统] 成功转化 ${memoriesToConvert.length} 条短期记忆为中期记忆`);
        console.log(`[记忆系统] 当前记忆状态 - 短期: ${this.memorySystem.short_term.length}, 中期: ${this.memorySystem.mid_term.length}, 长期: ${this.memorySystem.long_term.length}`);
      }
    } catch (error) {
      console.error('[记忆系统] 中期记忆转化失败:', error);
    }
  }
  
  /**
   * 生成中期记忆摘要
   * 将多条短期记忆压缩成一条摘要
   */
  private generateMidTermSummary(memories: string[]): string {
    const timestamp = new Date().toLocaleString('zh-CN');
    
    // 提取关键信息
    const keyEvents = [];
    const characters = new Set<string>();
    const locations = new Set<string>();
    
    for (const memory of memories) {
      // 简单的关键词提取
      if (memory.includes('突破') || memory.includes('修炼')) {
        keyEvents.push('修炼进展');
      }
      if (memory.includes('获得') || memory.includes('发现')) {
        keyEvents.push('物品收获');
      }
      if (memory.includes('遇到') || memory.includes('见到')) {
        keyEvents.push('人物交互');
      }
      if (memory.includes('到达') || memory.includes('前往')) {
        keyEvents.push('位置变化');
      }
      
      // 提取可能的角色名和地点名（简化处理）
      const charMatch = memory.match(/([^\s]{2,4}(?:道人|真人|师兄|师姐|长老|宗主))/g);
      if (charMatch) charMatch.forEach(char => characters.add(char));
      
      const locMatch = memory.match(/([^\s]{2,6}(?:峰|山|城|镇|宗|门|洞|府))/g);
      if (locMatch) locMatch.forEach(loc => locations.add(loc));
    }
    
    // 构建摘要
    let summary = `[${timestamp}] `;
    
    if (keyEvents.length > 0) {
      summary += `主要事件: ${keyEvents.join('、')}。`;
    }
    
    if (characters.size > 0) {
      summary += ` 涉及人物: ${Array.from(characters).slice(0, 3).join('、')}。`;
    }
    
    if (locations.size > 0) {
      summary += ` 相关地点: ${Array.from(locations).slice(0, 2).join('、')}。`;
    }
    
    // 如果摘要太短，添加原始记忆的简化版本
    if (summary.length < 50) {
      const firstMemory = memories[0];
      summary += ` 详情: ${firstMemory.substring(0, 80)}${firstMemory.length > 80 ? '...' : ''}`;
    }
    
    return summary;
  }
  
  /**
   * 添加到中期记忆
   */
  private addToMidTermMemory(content: string): void {
    const settings = this.settingsManager.getSettings();
    if (!settings.memory.midTerm.enabled) return;
    
    this.memorySystem.mid_term.unshift(content);
    
    // 检查是否超出中期记忆限制
    if (this.memorySystem.mid_term.length > settings.memory.midTerm.maxLength) {
      // 将超出的记忆转移到长期记忆（只转移重要的）
      const overflow = this.memorySystem.mid_term.splice(settings.memory.midTerm.maxLength);
      overflow.forEach(memory => {
        if (this.isImportantMemory(memory) && settings.memory.longTerm.enabled) {
          this.addToLongTermMemory(this.summarizeForLongTerm(memory));
        }
      });
      
      console.log(`[AI服务] 中期记忆超限，转移${overflow.length}条到长期记忆`);
    }
  }
  
  /**
   * 添加到长期记忆
   */
  private addToLongTermMemory(content: string): void {
    const settings = this.settingsManager.getSettings();
    if (!settings.memory.longTerm.enabled) return;
    
    this.memorySystem.long_term.unshift(content);
    
    // 检查长期记忆限制
    if (!settings.memory.longTerm.unlimited && settings.memory.longTerm.maxLength) {
      if (this.memorySystem.long_term.length > settings.memory.longTerm.maxLength) {
        this.memorySystem.long_term = this.memorySystem.long_term.slice(0, settings.memory.longTerm.maxLength);
      }
    }
  }
  
  /**
   * 检查并执行记忆转化
   */
  private checkAndConvertMemories(): void {
    // 这个方法现在在各个添加方法中已经处理了转化逻辑
    // 保留用于手动触发转化检查
  }
  
  /**
   * 将内容总结为中期记忆格式
   */
  private summarizeForMidTerm(content: string): string {
    if (content.length <= 200) return content;
    
    // 提取关键信息：人物、事件、结果
    const lines = content.split('\n').filter(line => line.trim());
    const firstLine = lines[0] || '';
    const keyElements = [];
    
    // 简单的关键词提取
    const eventMatch = content.match(/(修炼|战斗|探索|遇见|获得|学会|突破)([^，。！？]{2,30})/g);
    if (eventMatch) {
      keyElements.push(...eventMatch.slice(0, 3));
    }
    
    if (keyElements.length === 0) {
      return firstLine.substring(0, 150) + (firstLine.length > 150 ? '...' : '');
    }
    
    return keyElements.join(' | ');
  }
  
  /**
   * 将内容总结为长期记忆格式
   */
  private summarizeForLongTerm(content: string): string {
    // 长期记忆需要更加精炼
    if (content.length <= 100) return content;
    
    // 提取最关键的信息
    const keywordMatches = content.match(/(突破|境界|死亡|重伤|师父|弟子|法宝|仇敌|朋友)/g);
    if (keywordMatches) {
      return `关键事件：${keywordMatches.join('、')} - ${content.substring(0, 50)}...`;
    }
    
    return content.substring(0, 80) + (content.length > 80 ? '...' : '');
  }

  /**
   * 判断是否为重要记忆
   */
  private isImportantMemory(memory: string): boolean {
    const importantKeywords = ['突破', '境界', '死亡', '重伤', '结识', '敌对', '获得', '法宝', '功法', '师父', '弟子'];
    return importantKeywords.some(keyword => memory.includes(keyword));
  }

  /**
   * 清理和格式化记忆内容
   * 确保存储到短期记忆的text内容格式一致
   */
  private cleanMemoryContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    // 移除多余的空白字符
    let cleaned = content.trim().replace(/\s+/g, ' ');
    
    // 移除常见的格式标记
    cleaned = cleaned.replace(/```[a-z]*\n?/gi, '');
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
    
    // 限制长度，避免过长的记忆条目
    if (cleaned.length > 200) {
      cleaned = cleaned.substring(0, 200) + '...';
    }
    
    return cleaned;
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
  private parseAIResponse(rawResponse: unknown): GM_Response {
    let text = '';
    
    // 类型守卫，确保rawResponse是期望的结构
    const isTavernResponse = (res: unknown): res is TavernResponse => {
      return (
        typeof res === 'object' &&
        res !== null &&
        'choices' in res &&
        Array.isArray((res as TavernResponse).choices)
      );
    };

    // 处理不同格式的响应
    if (isTavernResponse(rawResponse)) {
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
      } catch {
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
      const { useCharacterStore } = await import('@/stores/characterStore');
      const characterStore = useCharacterStore();

      // 兼容新格式：若存在 update 且缺少 tavern_commands，则桥接为 tavern_commands
      if (!(response as any).tavern_commands && Array.isArray((response as any).update)) {
        (response as any).tavern_commands = (response as any).update;
      }

      // processGmResponse 会返回一个更新后的新对象
      const updatedProfile = await processGmResponse(response, characterProfile);

      // 使用更新后的对象来更新 store
      characterStore.updateCharacterData(updatedProfile);

      // 原始的 character_updates 逻辑可以保留作为补充，或者在未来合并
      if ('character_updates' in response && response.character_updates) {
        // 注意：这里的更新可能会覆盖上面的更新，需要根据业务逻辑确定优先级
        characterStore.updateCharacterData(response.character_updates);
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      console.error('[AI服务] 处理AI指令失败:', error);
      toast.warning(`部分指令执行失败: ${errorText}`);
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
  async generateInitialGameMessage(characterProfile: CharacterProfile, saveSlot: { 存档数据?: SaveData }): Promise<{ message: string }> {
    try {
      console.log('[AI服务] 开始生成初始游戏消息');
      
      // 使用标准的初始化生成器
      const { generateInitialMessage } = await import('@/utils/generators/gameMasterGenerators');
      
      // 构建初始游戏数据
      const baseInfo = characterProfile.角色基础信息;
      const playerStatus = saveSlot?.存档数据?.玩家角色状态;
      
      const initialGameData = {
        baseInfo,
        creationDetails: {
          age: baseInfo.年龄 || 18,
          originName: baseInfo.出生 || '普通出身',  
          spiritRootName: baseInfo.灵根 || '普通灵根'
        }
      };
      
      // 使用一个简单的地图数据结构
      const mapData = {
        type: 'FeatureCollection',
        features: []
      };
      
      // 调用标准初始化生成器
      const gmResponse = await generateInitialMessage(initialGameData, mapData);
      
      if (!gmResponse || !gmResponse.text) {
        throw new Error('初始化生成器返回了无效的响应');
      }
      
      console.log('[AI服务] 初始消息生成成功，使用标准生成器');
      return { message: gmResponse.text };
      
    } catch (error) {
      console.error('[AI服务] 生成初始游戏消息失败:', error);
      
      // 提供一个基本的回退消息
      const baseInfo = characterProfile.角色基础信息;
      const fallbackMessage = `【世界初开】

你是${baseInfo.名字}，一位来自${baseInfo.世界}的${baseInfo.性别}修士。

你的天资为${baseInfo.天资}，出身于${baseInfo.出生}，拥有${baseInfo.灵根}。你的先天六司为：根骨${baseInfo.先天六司?.根骨}、灵性${baseInfo.先天六司?.灵性}、悟性${baseInfo.先天六司?.悟性}、气运${baseInfo.先天六司?.气运}、魅力${baseInfo.先天六司?.魅力}、心性${baseInfo.先天六司?.心性}。

${baseInfo.天赋?.length > 0 ? `你拥有特殊天赋：${baseInfo.天赋.join('、')}。` : ''}

现在，你站在修仙道路的起点，准备踏上这条充满机遇与挑战的大道。前方的路虽然未卜，但你的心中已经燃起了对仙道的渴望。

你准备做些什么？`;
      
      return { message: fallbackMessage };
    }
  }
}
