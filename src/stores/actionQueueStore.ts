import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface GameAction {
  id: string;
  type?: 'cultivate' | 'equip' | 'use' | 'unequip' | 'discard' | 'npc_trade' | 'npc_request' | 'npc_steal' | 'custom' | 'npc_memory_summarize' | 'comprehend';
  itemName?: string;
  itemType?: string;
  description?: string;
  timestamp: number;
  [key: string]: unknown; // 使用 unknown 替代 any，更安全
}

/**
 * 操作行动暂存系统
 * 用于存储玩家的游戏操作（如修炼功法、装备法宝等），
 * 在下次发送AI消息时作为附加提示词发送
 */
export const useActionQueueStore = defineStore('actionQueue', () => {
  // 操作队列
  const pendingActions = ref<GameAction[]>([]);
  
  /**
   * 添加操作到队列
   */
  const addAction = (action: Omit<GameAction, 'id' | 'timestamp'>) => {
    const newAction: GameAction = {
      ...action,
      id: generateActionId(),
      timestamp: Date.now()
    };

    // --- 冲突解决逻辑 ---
    // 如果是装备操作，移除同一物品的卸下操作
    if (newAction.type === 'equip') {
      pendingActions.value = pendingActions.value.filter(
        a => !(a.type === 'unequip' && a.itemName === newAction.itemName)
      );
    }
    // 如果是卸下操作，移除同一物品的装备操作
    else if (newAction.type === 'unequip') {
      pendingActions.value = pendingActions.value.filter(
        a => !(a.type === 'equip' && a.itemName === newAction.itemName)
      );
    }

    // 确保任何时候只有一个修炼操作
    // 如果添加新的修炼操作，则移除所有旧的
    if (newAction.type === 'cultivate') {
      pendingActions.value = pendingActions.value.filter(a => a.type !== 'cultivate');
    }

    // 确保任何时候只有一个感悟大道操作
    // 如果添加新的感悟操作，则移除所有旧的
    if (newAction.type === 'comprehend') {
      pendingActions.value = pendingActions.value.filter(a => a.type !== 'comprehend');
    }
    // --- 冲突解决逻辑结束 ---

    // 检查是否已经有相同类型的操作，如果有则替换
    const existingIndex = pendingActions.value.findIndex(
      a => a.type === action.type && a.itemName === action.itemName
    );
    
    if (existingIndex !== -1) {
      // 如果存在，则替换它。这对于可以“更新”的操作很有用，
      // 例如再次点击同一物品的“修炼”。
      pendingActions.value[existingIndex] = newAction;
    } else {
      // 否则，添加新操作。
      pendingActions.value.push(newAction);
    }
    
    console.log('[操作队列] 添加操作:', newAction);
    saveToStorage();
  };
  
  /**
   * 移除特定操作
   */
  const removeAction = (actionId: string) => {
    const index = pendingActions.value.findIndex(a => a.id === actionId);
    if (index !== -1) {
      const removed = pendingActions.value.splice(index, 1)[0];
      console.log('[操作队列] 移除操作:', removed);
      saveToStorage();
      return removed;
    }
    return null;
  };
  
  /**
   * 清空所有操作
   */
  const clearActions = () => {
    console.log('[操作队列] 清空操作队列，共', pendingActions.value.length, '个操作');
    pendingActions.value = [];
    saveToStorage();
  };
  
  /**
   * 获取格式化的操作提示词
   */
  const getActionPrompt = (): string => {
    if (pendingActions.value.length === 0) {
      return '';
    }
    
    const actionTexts = pendingActions.value.map(action => {
      switch (action.type) {
        case 'cultivate':
          if (action.itemType === '大道') {
            return `感悟了《${action.itemName}》大道`;
          } else {
            return `修炼了《${action.itemName}》功法`;
          }
        case 'equip':
          return `装备了《${action.itemName}》${action.itemType || '法宝'}`;
        case 'use':
          // 使用物品需要包含详细描述（包含效果）
          return action.description || `使用了《${action.itemName}》`;
        case 'unequip':
          return `卸下了《${action.itemName}》装备`;
        case 'discard':
          return `丢弃了《${action.itemName}》`;
        case 'npc_trade':
          return `尝试与 ${action.npcName} 交易 ${action.itemName}`;
        case 'npc_request':
          return `向 ${action.npcName} 索要 ${action.itemName}`;
        case 'npc_steal':
          return `尝试从 ${action.npcName} 身上偷取 ${action.itemName}`;
        case 'npc_memory_summarize':
          return `你开始整理关于 ${action.npcName} 的记忆碎片，试图从最旧的 ${action.count || 10} 条记忆中总结出关键信息。`;
        case 'custom':
          return action.description;
        default:
          return action.description;
      }
    });

    return `\n\n【玩家最近操作】\n在本轮对话前，玩家进行了以下操作：\n${actionTexts.map(text => `• ${text}`).join('\n')}\n\n⚠️ **重要提醒**：请优先基于这些玩家操作来生成回应！先处理和反映这些具体动作的结果，然后再回应用户输入的文本内容。这些操作具有更高的优先级，应该在叙事中得到明确体现。`;
  };
  
  /**
   * 消费操作队列（获取提示词后清空）
   */
  const consumeActions = (): string => {
    const prompt = getActionPrompt();
    if (prompt) {
      clearActions();
    }
    return prompt;
  };
  
  /**
   * 生成操作ID
   */
  const generateActionId = (): string => {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  /**
   * 保存到localStorage
   */
  const saveToStorage = () => {
    try {
      localStorage.setItem('dao_action_queue', JSON.stringify(pendingActions.value));
    } catch (error) {
      console.warn('[操作队列] 保存到localStorage失败:', error);
    }
  };
  
  /**
   * 从localStorage加载
   */
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('dao_action_queue');
      if (stored) {
        const actions = JSON.parse(stored) as GameAction[];
        // 过滤掉过老的操作（超过1小时）
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        pendingActions.value = actions.filter(action => action.timestamp > oneHourAgo);
        console.log('[操作队列] 从存储加载', pendingActions.value.length, '个操作');
      }
    } catch (error) {
      console.warn('[操作队列] 从localStorage加载失败:', error);
    }
  };
  
  // 初始化时加载存储的数据
  loadFromStorage();
  
  return {
    pendingActions,
    addAction,
    removeAction,
    clearActions,
    getActionPrompt,
    consumeActions
  };
});