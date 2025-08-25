/**
 * AI双向交互系统核心模块
 * 实现AI与游戏世界的状态感知交互
 * 
 * 核心功能：
 * 1. 监听AI回复
 * 2. 解析tavern_commands指令
 * 3. 执行状态变更操作
 * 4. 生成变更日志
 * 5. 注入上下文到下次对话
 */

import { getTavernHelper } from './tavern';
import { toast } from './toast';

// 指令类型定义
export interface TavernCommand {
  operation: 'set' | 'add' | 'delete' | 'push' | 'pull';
  variable: string;
  value?: any;
  path?: string;
  condition?: any;
}

// 执行结果接口
export interface ExecutionResult {
  success: boolean;
  command: TavernCommand;
  beforeValue?: any;
  afterValue?: any;
  error?: string;
}

// 状态变更日志
export interface StateChangeLog {
  timestamp: string;
  commands: ExecutionResult[];
  gameContext?: {
    position?: string;
    realm?: string;
    attributes?: Record<string, any>;
  };
}

class AIBidirectionalSystemClass {
  private changeHistory: StateChangeLog[] = [];
  private lastKnownState: Record<string, any> = {};
  private tavernHelper: any = null;

  constructor() {
    this.initializeTavernConnection();
  }

  /**
   * 初始化酒馆连接
   */
  private async initializeTavernConnection() {
    try {
      this.tavernHelper = getTavernHelper();
      if (this.tavernHelper) {
        console.log('[AI双向系统] 酒馆连接已建立');
        await this.updateLastKnownState();
      }
    } catch (error) {
      console.error('[AI双向系统] 初始化失败:', error);
    }
  }

  /**
   * 更新最后已知状态快照
   */
  private async updateLastKnownState() {
    try {
      if (!this.tavernHelper) return;
      
      const variables = await this.tavernHelper.getVariables({ type: 'chat' });
      this.lastKnownState = { ...variables };
    } catch (error) {
      console.error('[AI双向系统] 状态快照更新失败:', error);
    }
  }

  /**
   * 从AI回复中提取tavern_commands
   */
  public extractCommandsFromResponse(aiResponse: string): TavernCommand[] {
    const commands: TavernCommand[] = [];
    
    try {
      // 查找所有tavern_commands代码块
      const commandBlockRegex = /```tavern_commands\s*\n([\s\S]*?)\n```/g;
      let match;
      
      while ((match = commandBlockRegex.exec(aiResponse)) !== null) {
        const jsonText = match[1].trim();
        
        try {
          const parsed = JSON.parse(jsonText);
          
          if (Array.isArray(parsed)) {
            commands.push(...parsed);
          } else if (parsed.operation) {
            commands.push(parsed);
          }
        } catch (parseError) {
          console.warn('[AI双向系统] JSON解析失败:', parseError, '原文:', jsonText);
        }
      }

      // 兼容其他可能的命令格式
      const alternativeRegex = /"tavern_commands":\s*(\[[\s\S]*?\]|\{[\s\S]*?\})/g;
      while ((match = alternativeRegex.exec(aiResponse)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) {
            commands.push(...parsed);
          } else if (parsed.operation) {
            commands.push(parsed);
          }
        } catch (parseError) {
          console.warn('[AI双向系统] 备选格式解析失败:', parseError);
        }
      }

    } catch (error) {
      console.error('[AI双向系统] 指令提取失败:', error);
    }

    console.log('[AI双向系统] 提取到指令:', commands);
    return commands;
  }

  /**
   * 执行单条指令
   */
  private async executeCommand(command: TavernCommand): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      success: false,
      command,
    };

    try {
      if (!this.tavernHelper) {
        throw new Error('酒馆连接未建立');
      }

      // 获取变更前的值
      result.beforeValue = await this.getVariableValue(command.variable);

      switch (command.operation) {
        case 'set':
          await this.tavernHelper.setVariable(command.variable, command.value);
          result.success = true;
          break;

        case 'add':
          if (typeof result.beforeValue === 'number' && typeof command.value === 'number') {
            const newValue = result.beforeValue + command.value;
            await this.tavernHelper.setVariable(command.variable, newValue);
            result.success = true;
          } else {
            throw new Error(`ADD操作要求数字类型，但得到: ${typeof result.beforeValue} + ${typeof command.value}`);
          }
          break;

        case 'push':
          if (Array.isArray(result.beforeValue)) {
            const newArray = [...result.beforeValue, command.value];
            await this.tavernHelper.setVariable(command.variable, newArray);
            result.success = true;
          } else {
            // 如果不是数组，创建新数组
            await this.tavernHelper.setVariable(command.variable, [command.value]);
            result.success = true;
          }
          break;

        case 'pull':
          if (Array.isArray(result.beforeValue)) {
            const newArray = result.beforeValue.filter(item => 
              JSON.stringify(item) !== JSON.stringify(command.value)
            );
            await this.tavernHelper.setVariable(command.variable, newArray);
            result.success = true;
          }
          break;

        case 'delete':
          await this.tavernHelper.deleteVariable(command.variable);
          result.success = true;
          break;

        default:
          throw new Error(`未知操作类型: ${command.operation}`);
      }

      // 获取变更后的值
      result.afterValue = await this.getVariableValue(command.variable);

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error('[AI双向系统] 指令执行失败:', command, error);
    }

    return result;
  }

  /**
   * 获取变量值
   */
  private async getVariableValue(variableName: string): Promise<any> {
    try {
      if (!this.tavernHelper) return undefined;
      
      const variables = await this.tavernHelper.getVariables({ type: 'chat' });
      return variables[variableName];
    } catch (error) {
      console.error('[AI双向系统] 获取变量值失败:', variableName, error);
      return undefined;
    }
  }

  /**
   * 批量执行指令
   */
  public async executeCommands(commands: TavernCommand[]): Promise<StateChangeLog> {
    const log: StateChangeLog = {
      timestamp: new Date().toISOString(),
      commands: [],
    };

    console.log('[AI双向系统] 开始执行指令批次:', commands);

    for (const command of commands) {
      const result = await this.executeCommand(command);
      log.commands.push(result);

      if (result.success) {
        toast.success(`执行成功: ${command.operation} ${command.variable}`);
      } else {
        toast.error(`执行失败: ${command.operation} ${command.variable} - ${result.error}`);
      }
    }

    // 记录游戏上下文
    await this.captureGameContext(log);

    // 保存到历史记录
    this.changeHistory.push(log);

    // 限制历史记录长度
    if (this.changeHistory.length > 50) {
      this.changeHistory = this.changeHistory.slice(-50);
    }

    // 更新状态快照
    await this.updateLastKnownState();

    console.log('[AI双向系统] 指令批次执行完成:', log);
    return log;
  }

  /**
   * 捕获游戏上下文信息
   */
  private async captureGameContext(log: StateChangeLog) {
    try {
      if (!this.tavernHelper) return;

      const variables = await this.tavernHelper.getVariables({ type: 'chat' });
      
      log.gameContext = {
        position: variables['character.position'] || variables['位置'],
        realm: variables['character.realm'] || variables['境界'],
        attributes: {
          hp: variables['character.hp'] || variables['气血'],
          mana: variables['character.mana'] || variables['灵气'],
          spirit: variables['character.spirit'] || variables['神识'],
        }
      };
    } catch (error) {
      console.error('[AI双向系统] 游戏上下文捕获失败:', error);
    }
  }

  /**
   * 生成上下文注入内容（用于下次AI对话）
   */
  public generateContextForNextChat(): string {
    const recentChanges = this.changeHistory.slice(-3); // 最近3次变更
    
    if (recentChanges.length === 0) {
      return '';
    }

    let context = '\n[系统状态更新]\n';
    
    recentChanges.forEach((log, index) => {
      const successfulChanges = log.commands.filter(cmd => cmd.success);
      
      if (successfulChanges.length > 0) {
        context += `变更${index + 1}: `;
        successfulChanges.forEach(result => {
          const { command, beforeValue, afterValue } = result;
          context += `${command.variable}: ${beforeValue} → ${afterValue}; `;
        });
        context += '\n';
      }
    });

    // 添加当前游戏状态
    const latestLog = recentChanges[recentChanges.length - 1];
    if (latestLog.gameContext) {
      context += '[当前状态] ';
      if (latestLog.gameContext.position) {
        context += `位置: ${latestLog.gameContext.position}; `;
      }
      if (latestLog.gameContext.realm) {
        context += `境界: ${latestLog.gameContext.realm}; `;
      }
      context += '\n';
    }

    context += '[/系统状态更新]\n';
    return context;
  }

  /**
   * 处理AI回复的完整流程
   */
  public async processAIResponse(aiResponse: string): Promise<StateChangeLog | null> {
    const commands = this.extractCommandsFromResponse(aiResponse);
    
    if (commands.length === 0) {
      return null;
    }

    return await this.executeCommands(commands);
  }

  /**
   * 获取变更历史
   */
  public getChangeHistory(): StateChangeLog[] {
    return [...this.changeHistory];
  }

  /**
   * 清空变更历史
   */
  public clearHistory() {
    this.changeHistory = [];
  }

  /**
   * 获取当前状态快照
   */
    public getLastKnownState(): Record<string, any> {
    return { ...this.lastKnownState };
  }
}

// 单例模式实现
class AIBidirectionalSystemSingleton {
  private static instance: AIBidirectionalSystemClass | null = null;

  public static getInstance(): AIBidirectionalSystemClass {
    if (!this.instance) {
      this.instance = new AIBidirectionalSystemClass();
    }
    return this.instance;
  }
}

// 导出单例访问器
export const AIBidirectionalSystem = {
  getInstance: () => AIBidirectionalSystemSingleton.getInstance()
};

export default AIBidirectionalSystem;