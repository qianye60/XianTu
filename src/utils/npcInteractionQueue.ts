/**
 * NPC交互指令队列系统
 * 用于管理玩家与NPC的交互操作，避免频繁发送请求
 */

export interface NPCInteractionCommand {
  type: 'give' | 'trade' | 'talk' | 'inspect' | 'steal' | 'attack';
  npcName: string;
  data?: {
    itemId?: string;
    quantity?: number;
    message?: string;
    tradeOffer?: {
      give: { itemId: string; quantity: number }[];
      want: { itemId: string; quantity: number }[];
    };
  };
  timestamp: number;
}

class NPCInteractionQueue {
  private queue: NPCInteractionCommand[] = [];
  private maxQueueSize = 5; // 最多缓存5个操作
  private autoSendDelay = 3000; // 3秒后自动发送
  private timer: NodeJS.Timeout | null = null;

  /**
   * 添加交互指令到队列
   */
  addCommand(command: Omit<NPCInteractionCommand, 'timestamp'>): boolean {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('交互队列已满，请先发送当前指令');
      return false;
    }

    this.queue.push({
      ...command,
      timestamp: Date.now()
    });

    // 重置自动发送计时器
    this.resetAutoSendTimer();
    return true;
  }

  /**
   * 获取当前队列中的所有指令
   */
  getQueue(): NPCInteractionCommand[] {
    return [...this.queue];
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * 获取并清空队列（用于发送）
   */
  flush(): NPCInteractionCommand[] {
    const commands = [...this.queue];
    this.clear();
    return commands;
  }

  /**
   * 移除特定指令
   */
  removeCommand(index: number): void {
    if (index >= 0 && index < this.queue.length) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * 重置自动发送计时器
   */
  private resetAutoSendTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      if (this.queue.length > 0) {
        // 触发自动发送事件
        window.dispatchEvent(new CustomEvent('npc-interaction-auto-send'));
      }
    }, this.autoSendDelay);
  }

  /**
   * 格式化指令为AI可理解的文本
   */
  formatCommandsForAI(commands: NPCInteractionCommand[]): string {
    return commands.map(cmd => {
      switch (cmd.type) {
        case 'give':
          return `赠送${cmd.data?.quantity || 1}个${cmd.data?.itemId}给${cmd.npcName}`;
        case 'trade':
          if (cmd.data?.tradeOffer) {
            const give = cmd.data.tradeOffer.give.map(i => `${i.quantity}个${i.itemId}`).join('、');
            const want = cmd.data.tradeOffer.want.map(i => `${i.quantity}个${i.itemId}`).join('、');
            return `与${cmd.npcName}交易：用${give}换${want}`;
          }
          return `与${cmd.npcName}交易`;
        case 'talk':
          return cmd.data?.message ? `对${cmd.npcName}说："${cmd.data.message}"` : `与${cmd.npcName}交谈`;
        case 'inspect':
          return `查看${cmd.npcName}的信息`;
        case 'steal':
          return `尝试偷窃${cmd.npcName}`;
        case 'attack':
          return `攻击${cmd.npcName}`;
        default:
          return `与${cmd.npcName}互动`;
      }
    }).join('；');
  }

  /**
   * 获取队列状态
   */
  getStatus(): {
    count: number;
    isFull: boolean;
    commands: string[];
  } {
    return {
      count: this.queue.length,
      isFull: this.queue.length >= this.maxQueueSize,
      commands: this.queue.map(cmd => this.formatCommandsForAI([cmd]))
    };
  }
}

// 导出单例
export const npcInteractionQueue = new NPCInteractionQueue();

// 导出辅助函数
export function addNPCInteraction(command: Omit<NPCInteractionCommand, 'timestamp'>): boolean {
  return npcInteractionQueue.addCommand(command);
}

export function getNPCInteractionStatus() {
  return npcInteractionQueue.getStatus();
}

export function sendNPCInteractions(): string {
  const commands = npcInteractionQueue.flush();
  if (commands.length === 0) return '';
  return npcInteractionQueue.formatCommandsForAI(commands);
}