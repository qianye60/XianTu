import { isTavernEnvironment } from './tavern'
import type { WorldState } from '@/core/rules/characterCreation'
import _ from 'lodash'

// --- 类型定义 ---

// 为 '酒馆' 环境的全局API提供更安全的类型
// 注意：这些函数和变量只在SillyTavern扩展环境中存在
declare function eventOn(event: string, callback: (...args: unknown[]) => void): void
declare const tavern_events: {
  MESSAGE_RECEIVED: string
  GENERATE_STARTED: string
}
declare function getChatMessages(messageId?: string): { role: string; message: string }[]
declare function getVariables(options: { type: string }): Record<string, unknown>
declare function insertOrAssignVariables(
  vars: Record<string, unknown>,
  options: { type: string },
): Promise<void>
declare function deleteVariable(key: string, options: { type: string }): Promise<void>
declare function triggerSlash(command: string): void

interface TavernCommand {
  action: 'set' | 'add' | 'delete' | 'push' | 'pull'
  scope?: 'global' | 'chat' | 'character' | 'message'
  key: string
  value?: unknown // 使用 unknown 替代 any
  options?: Record<string, unknown>
}

interface CommandExecutionResult {
  hasCommands: boolean
  commands: TavernCommand[]
  results: unknown[]
  errors: { success: false; command: TavernCommand; error: string }[]
  variableChanges: Record<string, unknown>
  summary: string
}

/**
 * AI双向指令系统 (TypeScript版)
 * 专为Vue 3和修仙国风UI打造
 * 稳定、简单、高效，并提供完整的类型支持
 */
class AIBidirectionalSystem {
  private static instance: AIBidirectionalSystem
  private isEnabled: boolean = true
  private lastExecutionResult: CommandExecutionResult | null = null

  private constructor() {
    if (isTavernEnvironment()) {
      this.initialize()
    } else {
      console.log('天机示警：身处凡间，核心交互阵法进入蛰伏状态。')
      this.isEnabled = false
    }
  }

  public static getInstance(): AIBidirectionalSystem {
    if (!AIBidirectionalSystem.instance) {
      AIBidirectionalSystem.instance = new AIBidirectionalSystem()
    }
    return AIBidirectionalSystem.instance
  }

  /**
   * 初始化系统，绑定事件监听器
   */
  private initialize(): void {
    eventOn(tavern_events.MESSAGE_RECEIVED, (messageId: unknown) => {
      if (typeof messageId === 'string') {
        this.handleAIResponse(messageId)
      }
    })

    eventOn(tavern_events.GENERATE_STARTED, () => {
      this.injectContextIntoPrompt()
    })

    console.log('道友，AI双向指令阵法已启动，可随时下达敕令。')
  }

  /**
   * 处理AI的回复，如同仙人解析天机
   */
  private async handleAIResponse(messageId: string): Promise<void> {
    if (!this.isEnabled) return

    try {
      const messages = getChatMessages(messageId)
      if (messages.length === 0 || messages[0].role !== 'assistant') return

      const message = messages[0]
      const executionResult = await this.processCommandsFromText(message.message)

      if (executionResult.hasCommands) {
        this.lastExecutionResult = executionResult
        console.log('天机已动，指令执行完毕，结果已记录在案。')
      }
    } catch (error) {
      console.error('解析天机时遭遇心魔入侵 (处理AI指令时发生错误):', error)
    }
  }

  /**
   * 从文本中解析并执行指令，犹如从符文中提炼法则
   */
  private async processCommandsFromText(text: string): Promise<CommandExecutionResult> {
    const result: CommandExecutionResult = {
      hasCommands: false,
      commands: [],
      results: [],
      errors: [],
      variableChanges: {},
      summary: '未找到敕令，天地无声。',
    }

    const commandData = this.extractCommands(text)
    if (!commandData || !commandData.tavern_commands) {
      return result
    }

    result.hasCommands = true
    result.commands = commandData.tavern_commands

    const beforeSnapshot = this.getFullVariableSnapshot()

    for (const command of commandData.tavern_commands) {
      try {
        const commandResult = await this.executeCommand(command)
        result.results.push({ success: true, ...commandResult })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        result.errors.push({ success: false, command, error: errorMessage })
      }
    }

    const afterSnapshot = this.getFullVariableSnapshot()
    result.variableChanges = this.calculateVariableChanges(beforeSnapshot, afterSnapshot)
    result.summary = this.generateExecutionSummary(result)

    return result
  }

  /**
   * 提取JSON指令，如同从玉简中读取秘法
   */
  private extractCommands(text: string): { tavern_commands: TavernCommand[] } | null {
    const jsonMatch = text.match(/```json\s*({[\s\S]*?"tavern_commands"[\s\S]*?})\s*```/)
    if (!jsonMatch) return null
    try {
      // 在解析之前，我们无法确定其内部结构，因此这里的 as 是必要的断言
      return JSON.parse(jsonMatch[1]) as { tavern_commands: TavernCommand[] }
    } catch (e) {
      console.error('玉简破损，秘法解析失败 (JSON parsing failed):', e)
      return null
    }
  }

  /**
   * 执行单个指令，驱动天地法则
   */
  private async executeCommand(command: TavernCommand): Promise<Record<string, unknown>> {
    const { action, scope = 'chat', key, value, options = {} } = command
    const variableOptions = { type: scope, ...options }

    switch (action) {
      case 'set':
        await insertOrAssignVariables({ [key]: value }, variableOptions)
        return { action, key, value }
      case 'add': {
        const current = getVariables(variableOptions)
        const oldValue = _.get(current, key, 0)
        const newValue = (Number(oldValue) || 0) + Number(value)
        await insertOrAssignVariables({ [key]: newValue }, variableOptions)
        return { action, key, change: value, newValue }
      }
      case 'delete':
        await deleteVariable(key, variableOptions)
        return { action, key }
      case 'push': {
        const current = getVariables(variableOptions)
        const arr = _.get(current, key, [])
        if (!Array.isArray(arr)) throw new Error(`此非宝匣，无法纳物 ('${key}' is not an array).`)
        arr.push(value)
        await insertOrAssignVariables({ [key]: arr }, variableOptions)
        return { action, key, value }
      }
      case 'pull': {
        const current = getVariables(variableOptions)
        const currentArr = _.get(current, key, [])
        if (!Array.isArray(currentArr))
          throw new Error(`此非宝匣，无法取物 ('${key}' is not an array).`)
        const newArr = currentArr.filter((item) => !_.isEqual(item, value))
        await insertOrAssignVariables({ [key]: newArr }, variableOptions)
        return { action, key, value }
      }
      default: {
        // 利用 never 类型检查确保所有 case 都被处理
        const exhaustiveCheck: never = action
        throw new Error(`未知敕令: ${exhaustiveCheck}`)
      }
    }
  }

  /**
   * 获取所有变量的快照，一览众山小
   */
  private getFullVariableSnapshot(): Record<string, Record<string, unknown>> {
    return {
      global: getVariables({ type: 'global' }),
      chat: getVariables({ type: 'chat' }),
      character: getVariables({ type: 'character' }),
    }
  }

  /**
   * 对比前后快照，洞察天机变化
   */
  private calculateVariableChanges(
    before: Record<string, Record<string, unknown>>,
    after: Record<string, Record<string, unknown>>,
  ): Record<string, unknown> {
    const changes: Record<string, unknown[]> = {}
    for (const scope of ['global', 'chat', 'character']) {
      const diff = _.reduce(
        after[scope],
        (
          result: { scope: string; key: string; before: unknown; after: unknown }[],
          value: unknown,
          key: string,
        ) => {
          if (!_.isEqual(value, before[scope][key])) {
            result.push({ scope, key, before: before[scope][key], after: value })
          }
          return result
        },
        [],
      )
      if (diff.length > 0) {
        changes[scope] = diff
      }
    }
    return changes
  }

  /**
   * 生成执行摘要
   */
  private generateExecutionSummary(result: CommandExecutionResult): string {
    return `敕令已下达 ${result.commands.length} 条，${result.results.length} 功成，${result.errors.length} 失手。`
  }

  /**
   * 将上下文注入到提示词，让AI知晓前尘后果
   */
  private injectContextIntoPrompt(): void {
    if (!this.isEnabled) return

    const worldData = getVariables({ type: 'chat' }).world as WorldState | undefined
    if (!worldData) return

    const contextLines = ['[天道法镜: 当前世界状态总览]']
    contextLines.push('```json')
    contextLines.push(JSON.stringify(worldData, null, 2))
    contextLines.push('```')

    if (this.lastExecutionResult) {
      contextLines.push('\n[天机阁回禀: 上一轮敕令执行回溯]')
      contextLines.push(`**概要**: ${this.lastExecutionResult.summary}`)

      if (Object.keys(this.lastExecutionResult.variableChanges).length > 0) {
        contextLines.push('**变量变更详情**:')
        for (const scope in this.lastExecutionResult.variableChanges) {
          const changes = this.lastExecutionResult.variableChanges[scope] as {
            key: string
            before: unknown
            after: unknown
          }[]
          changes.forEach((change) => {
            contextLines.push(
              `- **${scope}.${change.key}**: 从 ${JSON.stringify(change.before)} 变为 ${JSON.stringify(change.after)}`,
            )
          })
        }
      }
      contextLines.push('[天机阁回禀完毕]')
    }

    const contextString = contextLines.join('\n')
    triggerSlash(
      `/inject id="world_state_snapshot" position=before depth=100 role=system ${contextString}`,
    )

    this.lastExecutionResult = null
  }
}

// 导出单例
export default AIBidirectionalSystem.getInstance()
