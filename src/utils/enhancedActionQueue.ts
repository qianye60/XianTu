/**
 * 增强版动作队列系统
 * 支持装备/使用物品的直接操作和撤回恢复功能
 */

import { useCharacterStore } from '@/stores/characterStore';
import { useActionQueueStore } from '@/stores/actionQueueStore';
import type { Item, SaveData, CultivationTechniqueData } from '@/types/game';
import { toast } from './toast';
import { getTavernHelper } from '@/utils/tavern';

export interface UndoAction {
  type: 'equip' | 'unequip' | 'use' | 'discard' | 'cultivate' | 'stop_cultivation';
  itemId: string;
  itemName: string;
  quantity?: number;
  // 撤回恢复数据
  restoreData?: {
    // 装备操作的恢复数据
    originalSlot?: string | null; // 原来在哪个装备槽位，null表示在背包
    replacedItem?: Item | null; // 被替换的装备
    // 使用/丢弃操作的恢复数据  
    originalQuantity?: number;
    // 功法修炼的恢复数据
    originalCultivationState?: {
      previousTechnique: CultivationTechniqueData | null;
      wasInInventory: boolean;
    };
  };
  itemData?: Item;
}

export class EnhancedActionQueueManager {
  private static instance: EnhancedActionQueueManager | null = null;
  private undoActions: UndoAction[] = [];
  private readonly storageKey = 'dao_undo_actions';

  constructor() {
    this.loadUndoHistoryFromStorage();
  }
  
  static getInstance(): EnhancedActionQueueManager {
    if (!this.instance) {
      this.instance = new EnhancedActionQueueManager();
    }
    return this.instance;
  }
  
  /**
   * 装备物品 - 直接修改装备栏并支持撤回
   */
  async equipItem(item: Item): Promise<boolean> {
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData) {
        toast.error('存档数据不存在，无法装备');
        return false;
      }
      
      if (!saveData.装备栏) {
        saveData.装备栏 = { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null };
      }
      
      // 检查是否已装备 - 物品是对象结构
      const inventoryItems = saveData.背包?.物品;
      if (!inventoryItems || typeof inventoryItems !== 'object') {
        toast.error('背包数据异常');
        return false;
      }

      const inventoryItem = inventoryItems[item.物品ID];
      if (inventoryItem && inventoryItem.已装备 === true) {
        toast.info(`《${item.名称}》已经装备在身上了`);
        return false;
      }
      
      // 检查互斥操作：如果队列中有同一物品的卸下操作，先移除它
      this.removeConflictingActions(item.物品ID, 'unequip');
      
      // 寻找空槽位或需要替换的槽位
      let targetSlot: string | null = null;
      let replacedItem: Item | null = null;
      
      for (let i = 1; i <= 6; i++) {
        const slotKey = `装备${i}` as keyof typeof saveData.装备栏;
        const slotItem = saveData.装备栏[slotKey];
        if (!slotItem || slotItem === null) {
          targetSlot = slotKey;
          break;
        }
      }
      
      if (!targetSlot) {
        // 装备栏已满，替换第一个槽位
        targetSlot = '装备1';
        const slotKey = targetSlot as keyof typeof saveData.装备栏;
        const existingSlotItem = saveData.装备栏[slotKey];
        if (existingSlotItem && typeof existingSlotItem === 'object' && '物品ID' in existingSlotItem) {
          // 获取被替换物品的完整信息
          const replacedItemId = existingSlotItem.物品ID;
          replacedItem = inventoryItems[replacedItemId] || null;
          // 清除被替换物品的已装备状态
          if (replacedItem) {
            replacedItem.已装备 = false;
          }
        }
      }
      
      // 执行装备操作 - 存储引用格式而不是完整对象
      saveData.装备栏[targetSlot as keyof typeof saveData.装备栏] = {
        物品ID: item.物品ID,
        名称: item.名称
      };

      // 设置物品的已装备标记 - 使用响应式替换
      if (inventoryItem) {
        inventoryItems[item.物品ID] = {
          ...inventoryItem,
          已装备: true
        };
      }

      console.log('装备操作完成:', {
        槽位: targetSlot,
        物品: item,
        装备栏状态: saveData.装备栏
      });

      // 注意：不从背包中移除物品，装备和背包是独立的
      // 被替换的装备也不放回背包，而是丢失（符合游戏逻辑）
      
      // 保存数据到存储
      await characterStore.commitToStorage();
      
      // 同步到酒馆变量
      await this.syncEquipmentToTavern(saveData);
      
      // 创建撤回数据
      const undoAction: UndoAction = {
        type: 'equip',
        itemId: item.物品ID,
        itemName: item.名称,
        restoreData: {
          originalSlot: null, // 原来在背包
          replacedItem
        }
      };
      this.undoActions.push(undoAction);
      this.saveUndoHistoryToStorage();
      
      // 添加到动作队列显示
      actionQueue.addAction({
        type: 'equip',
        itemName: item.名称,
        itemType: item.类型,
        description: replacedItem
          ? `装备了《${item.名称}》，替换了《${replacedItem.名称}》`
          : `装备了《${item.名称}》`
      });
      
      // toast.success(`已装备《${item.名称}》`); // 弹窗逻辑已移至Store
      return true;
      
    } catch (error) {
      console.error('装备物品失败:', error);
      toast.error('装备失败');
      return false;
    }
  }
  
  /**
   * 卸下装备 - 直接修改装备栏并支持撤回
   */
  async unequipItem(item: Item): Promise<boolean> {
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData || !saveData.装备栏) {
        toast.error('装备栏数据不存在');
        return false;
      }
      
      // 检查物品是否已装备 - 物品是对象结构
      const inventoryItems = saveData.背包?.物品;
      if (!inventoryItems || typeof inventoryItems !== 'object') {
        toast.error('背包数据异常');
        return false;
      }

      const inventoryItem = inventoryItems[item.物品ID];
      if (!inventoryItem || inventoryItem.已装备 !== true) {
        toast.info(`《${item.名称}》未装备，无法卸下`);
        // 即使物品状态已经是"未装备"，也尝试同步一下装备栏，以防数据不一致
        let foundInSlots = false;
        for (let i = 1; i <= 6; i++) {
          const slotKey = `装备${i}` as keyof typeof saveData.装备栏;
          const slotItem = saveData.装备栏[slotKey];
          if (slotItem && typeof slotItem === 'object' && slotItem.物品ID === item.物品ID) {
            saveData.装备栏[slotKey] = null; // 清理掉残留的装备槽位
            foundInSlots = true;
          }
        }
        if (foundInSlots) {
          await characterStore.commitToStorage();
        }
        return false;
      }
      
      // 检查互斥操作：如果队列中有同一物品的装备操作，先移除它
      this.removeConflictingActions(item.物品ID, 'equip');
      
      // 找到物品在哪个槽位 - 只支持新的引用格式
      let sourceSlot: string | null = null;
      for (let i = 1; i <= 6; i++) {
        const slotKey = `装备${i}` as keyof typeof saveData.装备栏;
        const slotItem = saveData.装备栏[slotKey];
        if (slotItem && typeof slotItem === 'object' && '物品ID' in slotItem && slotItem.物品ID === item.物品ID) {
          sourceSlot = slotKey;
          break;
        }
      }
      
      if (!sourceSlot) {
        toast.error('装备栏中未找到该装备，数据可能不一致');
        // 即使装备栏中没找到，也要清除已装备标记
        if (saveData.背包?.物品?.[item.物品ID]) {
          saveData.背包.物品[item.物品ID].已装备 = false;
        }
        await characterStore.commitToStorage();
        return true;
      }
      
      // 执行卸下操作
      saveData.装备栏[sourceSlot as keyof typeof saveData.装备栏] = null;

      // 清除物品的已装备标记 - 使用响应式替换
      if (inventoryItem) {
        inventoryItems[item.物品ID] = {
          ...inventoryItem,
          已装备: false
        };
        console.log('卸下装备完成:', {
          物品: item.名称,
          物品ID: item.物品ID,
          清空槽位: sourceSlot,
          已装备状态: false
        });
      } else {
        console.warn('背包中未找到物品:', item.物品ID);
      }
      
      // 注意：不需要将装备放回背包，因为装备从未从背包中移除
      
      // 保存数据到存储
      await characterStore.commitToStorage();
      
      // 同步到酒馆变量
      await this.syncEquipmentToTavern(saveData);
      
      // 创建撤回数据
      const undoAction: UndoAction = {
        type: 'unequip',
        itemId: item.物品ID,
        itemName: item.名称,
        restoreData: {
          originalSlot: sourceSlot
        }
      };
      this.undoActions.push(undoAction);
      this.saveUndoHistoryToStorage();
      
      // 添加到动作队列显示
      actionQueue.addAction({
        type: 'unequip',
        itemName: item.名称,
        itemType: item.类型,
        description: `卸下了《${item.名称}》`
      });
      
      // toast.success(`已卸下《${item.名称}》`); // 弹窗逻辑已移至Store
      return true;
      
    } catch (error) {
      console.error('卸下装备失败:', error);
      toast.error('卸下失败');
      return false;
    }
  }
  
  /**
   * 使用物品 - 直接减少数量并支持撤回
   */
  async useItem(item: Item, quantity: number = 1): Promise<boolean> {
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData) {
        toast.error('存档数据不存在');
        return false;
      }
      
      const inventoryItem = saveData.背包?.物品?.[item.物品ID];
      if (!inventoryItem || inventoryItem.数量 < quantity) {
        toast.error('物品数量不足');
        return false;
      }
      
      const originalQuantity = inventoryItem.数量;
      const itemToStore = JSON.parse(JSON.stringify(inventoryItem)); // Deep copy before modification
      
      // 执行使用操作
      if (inventoryItem.数量 === quantity) {
        // 完全使用完，删除物品
        delete saveData.背包.物品[item.物品ID];
      } else {
        // 减少数量
        inventoryItem.数量 -= quantity;
      }
      
      // 创建撤回数据
      const undoAction: UndoAction = {
        type: 'use',
        itemId: item.物品ID,
        itemName: item.名称,
        quantity,
        restoreData: {
          originalQuantity
        },
        itemData: itemToStore
      };
      this.undoActions.push(undoAction);
      this.saveUndoHistoryToStorage();
      
      // 添加到动作队列显示
      actionQueue.addAction({
        type: 'use',
        itemName: item.名称,
        itemType: item.类型,
        description: `使用了 ${quantity} 个《${item.名称}》`
      });
      
      // toast.success(`使用了 ${quantity} 个《${item.名称}》`); // 弹窗逻辑已移至Store
      return true;
      
    } catch (error) {
      console.error('使用物品失败:', error);
      toast.error('使用失败');
      return false;
    }
  }
  
  /**
   * 修炼功法 - 直接修改修炼状态并支持撤回
   */
  async cultivateItem(item: Item): Promise<boolean> {
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData) {
        toast.error('存档数据不存在，无法修炼功法');
        return false;
      }
      
      if (item.类型 !== '功法') {
        toast.error('只能修炼功法类物品');
        return false;
      }
      
      // 获取背包物品对象
      const inventoryItems = saveData.背包?.物品;
      if (!inventoryItems || typeof inventoryItems !== 'object') {
        toast.error('背包数据异常');
        return false;
      }

      let previousTechnique: CultivationTechniqueData | null = null;

      // 检查是否已经在修炼其他功法
      const currentTechnique = saveData.修炼功法;
      if (currentTechnique && currentTechnique.物品ID !== item.物品ID) {
        // 保存完整的功法数据+进度
        previousTechnique = { ...currentTechnique };

        // 清除之前功法的已装备状态 - 使用响应式替换
        const previousId = currentTechnique.物品ID;
        const previousInventoryItem = inventoryItems[previousId];
        if (previousInventoryItem && previousInventoryItem.类型 === '功法') {
          inventoryItems[previousId] = {
            ...previousInventoryItem,
            已装备: false,
            修炼中: false
          };
        }
      }

      // 获取功法的完整数据作为基础
      const inventoryItem = inventoryItems[item.物品ID];
      if (!inventoryItem || inventoryItem.类型 !== '功法') {
        toast.error('物品不是功法类型');
        return false;
      }

      // 设置修炼功法 - 使用完整的功法数据结构，包含进度信息
      saveData.修炼功法 = {
        ...inventoryItem,
        // 保留旧的进度数据，如果有的话
        熟练度: currentTechnique?.熟练度 || 0,
        已解锁技能: currentTechnique?.已解锁技能 || [],
        修炼时间: currentTechnique?.修炼时间 || 0,
        突破次数: currentTechnique?.突破次数 || 0,
        正在修炼: true,
        修炼进度: currentTechnique?.修炼进度 || 0
      };

      // 设置功法的已装备和修炼中标记 - 使用响应式替换
      inventoryItems[item.物品ID] = {
        ...inventoryItem,
        已装备: true,
        修炼中: true
      };
      // 移除时间戳记录，简化逻辑

      // 注意：修炼功法不从背包移除，功法和背包是独立的

      // 保存到本地存储（关键！）
      await characterStore.commitToStorage();

      // 同步到酒馆变量
      await this.syncCultivationToTavern(saveData);
      
      // 创建撤回数据
      const undoAction: UndoAction = {
        type: 'cultivate',
        itemId: item.物品ID,
        itemName: item.名称,
        restoreData: {
          originalCultivationState: {
            previousTechnique,
            wasInInventory: true
          }
        }
      };
      this.undoActions.push(undoAction);
      this.saveUndoHistoryToStorage();
      
      // 添加到动作队列显示
      actionQueue.addAction({
        type: 'cultivate',
        itemName: item.名称,
        itemType: item.类型,
        description: previousTechnique 
          ? `开始修炼《${item.名称}》功法，停止修炼《${previousTechnique.名称}》`
          : `开始修炼《${item.名称}》功法`
      });
      
      // toast.success(`开始修炼《${item.名称}》`); // 弹窗逻辑已移至Store
      return true;
      
    } catch (error) {
      console.error('修炼功法失败:', error);
      toast.error('修炼功法失败');
      return false;
    }
  }
  
  /**
   * 停止修炼功法
   */
  async stopCultivation(item: Item): Promise<boolean> {
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData?.修炼功法 || !saveData.修炼功法.正在修炼) {
        toast.error('当前没有正在修炼的功法');
        return false;
      }

      const techniqueToStop = saveData.修炼功法;
      const techniqueId = techniqueToStop.物品ID;
      const techniqueName = techniqueToStop.名称;

      if (techniqueName !== item.名称) {
        toast.error('操作的功法与当前修炼的功法不符');
        return false;
      }

      // 获取背包物品对象
      const inventoryItems = saveData.背包?.物品;
      if (!inventoryItems || typeof inventoryItems !== 'object') {
        toast.error('背包数据异常');
        return false;
      }

      const inventoryItem = inventoryItems[techniqueId];

      // 清空修炼槽位，设置修炼状态为false（设置为null）
      saveData.修炼功法 = null;

      // 清除功法的已装备和修炼中标记 - 使用响应式替换
      if (inventoryItem && inventoryItem.类型 === '功法') {
        inventoryItems[techniqueId] = {
          ...inventoryItem,
          已装备: false,
          修炼中: false
        };
      }

      // 注意：停止修炼功法不放回背包，功法和背包是独立的

      // 保存到本地存储（关键！）
      await characterStore.commitToStorage();

      // 同步到酒馆变量
      await this.syncCultivationToTavern(saveData);
      
      // 创建撤回数据 - 保存完整的功法数据+进度
      const undoAction: UndoAction = {
        type: 'cultivate',
        itemId: item.物品ID,
        itemName: item.名称,
        restoreData: {
          originalCultivationState: {
            previousTechnique: techniqueToStop ? { ...techniqueToStop } : null,
            wasInInventory: false
          }
        }
      };
      this.undoActions.push(undoAction);
      this.saveUndoHistoryToStorage();
      
      // 添加到动作队列显示
      actionQueue.addAction({
        type: 'stop_cultivation',
        itemName: item.名称,
        itemType: item.类型,
        description: `停止修炼《${item.名称}》功法`
      });
      
      // toast.success(`已停止修炼《${item.名称}》`); // 弹窗逻辑已移至Store
      return true;
      
    } catch (error) {
      console.error('停止修炼失败:', error);
      toast.error('停止修炼失败');
      return false;
    }
  }
  
  /**
   * 撤回上一个动作
   */
  async undoLastAction(): Promise<boolean> {
    if (this.undoActions.length === 0) {
      toast.info('未找到可撤回的动作记录，可能已清空或刷新后丢失');
      return false;
    }

    const lastAction = this.undoActions.pop()!;
    this.saveUndoHistoryToStorage();
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData) {
        toast.error('存档数据不存在');
        return false;
      }
      
      switch (lastAction.type) {
        case 'equip':
          await this.undoEquip(lastAction, saveData);
          break;
        case 'unequip':
          await this.undoUnequip(lastAction);
          break;
        case 'use':
          await this.undoUse(lastAction, saveData);
          break;
        case 'cultivate':
          await this.undoCultivate(lastAction, saveData);
          break;
      }
      
      // 从动作队列中移除最后一个对应的动作
      const actions = actionQueue.pendingActions;
      for (let i = actions.length - 1; i >= 0; i--) {
        if (actions[i].itemName === lastAction.itemName && actions[i].type === lastAction.type) {
          actionQueue.removeAction(actions[i].id);
          break;
        }
      }
      
      // toast.success(`已撤回：${lastAction.itemName}`); // 弹窗逻辑已移至Store
      return true;
      
    } catch (error) {
      console.error('撤回动作失败:', error);
      toast.error('撤回失败');
      return false;
    }
  }

  /**
   * 按动作类型与物品名撤回（用于从动作队列点击撤回时）
   */
  async undoByItemName(type: UndoAction['type'], itemName: string): Promise<boolean> {
    if (this.undoActions.length === 0) {
      toast.info('未找到可撤回的动作记录，可能已清空或刷新后丢失');
      return false;
    }

    // 从后向前查找匹配的撤回记录
    let index = -1;
    for (let i = this.undoActions.length - 1; i >= 0; i--) {
      const a = this.undoActions[i];
      if (a.type === type && a.itemName === itemName) {
        index = i;
        break;
      }
    }

    if (index === -1) {
      toast.info('未找到该动作的撤回记录');
      return false;
    }

    const action = this.undoActions.splice(index, 1)[0];
    this.saveUndoHistoryToStorage();

    try {
      const characterStore = useCharacterStore();
      const saveData = characterStore.activeSaveSlot?.存档数据 as SaveData | undefined;
      if (!saveData) {
        toast.error('当前存档不存在，无法撤回');
        return false;
      }

      switch (action.type) {
        case 'equip':
          await this.undoEquip(action, saveData);
          break;
        case 'unequip':
          await this.undoUnequip(action);
          break;
        case 'use':
          await this.undoUse(action, saveData);
          break;
        case 'cultivate':
          await this.undoCultivate(action, saveData);
          break;
        default:
          break;
      }

      // NEW: Also remove from the UI action queue
      const actionQueue = useActionQueueStore();
      const uiActions = actionQueue.pendingActions;
      // Find the corresponding UI action and remove it
      for (let i = uiActions.length - 1; i >= 0; i--) {
          if (uiActions[i].itemName === itemName && uiActions[i].type === type) {
              actionQueue.removeAction(uiActions[i].id);
              break; // Remove only one, the last one
          }
      }

      // 保存更新
      await useCharacterStore().commitToStorage();
      // toast.success(`已撤回：${action.itemName}`); // 弹窗逻辑已移至Store
      return true;
    } catch (error) {
      console.error('按名称撤回失败:', error);
      toast.error('撤回失败');
      return false;
    }
  }
  
  private async undoEquip(action: UndoAction, saveData: SaveData): Promise<void> {
    // 找到装备的位置并卸下
    for (let i = 1; i <= 6; i++) {
      const slotKey = `装备${i}` as keyof typeof saveData.装备栏;
      const slotItem = saveData.装备栏[slotKey];
      if (slotItem && typeof slotItem === 'object' && '物品ID' in slotItem && slotItem.物品ID === action.itemId) {
        // 卸下装备
        saveData.装备栏[slotKey] = null;
        
        // 清除物品的已装备标记
        if (saveData.背包?.物品?.[action.itemId]) {
          const inventoryItem = saveData.背包.物品[action.itemId];
          saveData.背包.物品[action.itemId] = { ...inventoryItem, 已装备: false };
        }
        
        // 如果有被替换的装备，恢复它
        if (action.restoreData?.replacedItem) {
          saveData.装备栏[slotKey] = {
            物品ID: action.restoreData.replacedItem.物品ID,
            名称: action.restoreData.replacedItem.名称
          };
          // 设置被替换物品的已装备标记
          if (saveData.背包?.物品?.[action.restoreData.replacedItem.物品ID]) {
            const replacedInventoryItem = saveData.背包.物品[action.restoreData.replacedItem.物品ID];
            saveData.背包.物品[action.restoreData.replacedItem.物品ID] = { ...replacedInventoryItem, 已装备: true };
          }
        }
        
        // 同步到酒馆变量
        await this.syncEquipmentToTavern(saveData);
        break;
      }
    }
  }

  /**
   * 从撤回历史中移除一个动作记录
   */
  removeUndoAction(type: string, itemName: string): void {
    const index = this.undoActions.findIndex(
      a => a.type === type && a.itemName === itemName
    );
    if (index !== -1) {
      this.undoActions.splice(index, 1);
      this.saveUndoHistoryToStorage();
      console.log('[撤销历史] 移除了一个已抵消的动作:', { type, itemName });
    }
  }
  
  private async undoUnequip(action: UndoAction): Promise<void> {
    // 由于卸下装备不涉及背包操作，撤回时需要从装备栏历史数据恢复
    // 这里简化处理：如果有原始槽位信息，则重新装备
    if (!action.restoreData?.originalSlot) return;
    
    // 注意：由于我们不再在背包中存储卸下的装备，这里撤回操作有限制
    // 实际游戏中可能需要更复杂的历史记录机制
    toast.warning('装备撤回功能受限，卸下的装备无法完全恢复');
  }
  
  private async undoUse(action: UndoAction, saveData: SaveData): Promise<void> {
    if (action.itemData) {
        if (!saveData.背包) saveData.背包 = { 物品: {}, 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 } };
        if (!saveData.背包.物品) saveData.背包.物品 = {};
        
        // Restore the item to its state before it was used
        saveData.背包.物品[action.itemId] = JSON.parse(JSON.stringify(action.itemData));
    } else {
        toast.warning('物品已完全消失，且无备份数据，无法恢复');
    }
  }
  
  private async undoCultivate(action: UndoAction, saveData: SaveData): Promise<void> {
    const cultivationState = action.restoreData?.originalCultivationState;
    if (!cultivationState) return;

    // 获取背包物品对象
    const inventoryItems = saveData.背包?.物品;
    if (!inventoryItems || typeof inventoryItems !== 'object') {
      console.error('背包数据异常，无法撤回修炼');
      return;
    }

    // 由于修炼功法不再涉及背包操作，撤回时只需要恢复修炼状态
    if (cultivationState.previousTechnique) {
      // 恢复之前的修炼功法 - previousTechnique 现在已包含完整的数据+进度
      const previousId = cultivationState.previousTechnique.物品ID;
      saveData.修炼功法 = { ...cultivationState.previousTechnique };

      // 标记背包中的功法为已装备和修炼中
      const previousItem = inventoryItems[previousId];
      if (previousItem && previousItem.类型 === '功法') {
        inventoryItems[previousId] = {
          ...previousItem,
          已装备: true,
          修炼中: true
        };
      }
    } else {
      // 清空修炼槽位
      saveData.修炼功法 = null;
    }

    // 同步到酒馆变量
    await this.syncCultivationToTavern(saveData);
  }
  
  /**
   * 清空撤回历史
   */
  clearUndoHistory(): void {
    this.undoActions = [];
    this.saveUndoHistoryToStorage();
  }
  
  /**
   * 获取可撤回动作数量
   */
  getUndoActionsCount(): number {
    return this.undoActions.length;
  }
  
  /**
   * 移除冲突的动作（装备/卸下互斥）
   */
  private removeConflictingActions(itemId: string, conflictType: 'equip' | 'unequip'): void {
    const actionQueue = useActionQueueStore();
    
    // 从显示队列中移除冲突的动作
    const conflictingActions = actionQueue.pendingActions.filter(action => 
      action.itemName && action.type === conflictType && 
      // 这里需要通过名称匹配，因为action中没有itemId
      this.findItemByName(action.itemName)?.物品ID === itemId
    );
    
    conflictingActions.forEach(action => {
      actionQueue.removeAction(action.id);
    });
    
    // 从撤回历史中移除对应的记录
    this.undoActions = this.undoActions.filter(undoAction => 
      !(undoAction.itemId === itemId && undoAction.type === conflictType)
    );
    this.saveUndoHistoryToStorage();
    
    if (conflictingActions.length > 0) {
      toast.info('已移除冲突的操作');
    }
  }
  
  /**
   * 通过名称查找物品（辅助函数）
   */
  private findItemByName(itemName: string): Item | null {
    const characterStore = useCharacterStore();
    const saveData = characterStore.activeSaveSlot?.存档数据;
    if (!saveData) return null;
    
    // 在背包中查找
    if (saveData.背包?.物品) {
      for (const item of Object.values(saveData.背包.物品)) {
        if (item && typeof item === 'object' && item.名称 === itemName) {
          return item;
        }
      }
    }
    
    // 在装备栏中查找
    if (saveData.装备栏) {
      for (let i = 1; i <= 6; i++) {
        const slotKey = `装备${i}` as keyof typeof saveData.装备栏;
        const slotItem = saveData.装备栏[slotKey];
        if (slotItem && typeof slotItem === 'object' && '名称' in slotItem && slotItem.名称 === itemName) {
          // 需要从背包中获取完整的物品数据
          if (saveData.背包?.物品) {
            const fullItem = Object.values(saveData.背包.物品).find(item => item.名称 === itemName);
            if (fullItem) {
              return fullItem;
            }
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * 同步装备栏到酒馆变量
   */
  private async syncEquipmentToTavern(saveData: SaveData): Promise<void> {
    try {
      const helper = getTavernHelper();
      if (!helper) {
        console.warn('[装备同步] 酒馆助手不可用，跳过同步');
        return;
      }
      
      // 使用分片存储同步
      await helper.insertOrAssignVariables({
        '装备栏': saveData.装备栏
      }, { type: 'chat' });

      console.log('[装备同步] 装备栏已同步到酒馆变量');
    } catch (error) {
      console.warn('[装备同步] 同步装备栏到酒馆变量失败:', error);
    }
  }
  
  /**
   * 同步修炼功法到酒馆变量
   */
  private async syncCultivationToTavern(saveData: SaveData): Promise<void> {
    try {
      const helper = getTavernHelper();
      if (!helper) {
        console.warn('[修炼同步] 酒馆助手不可用，跳过同步');
        return;
      }

      // 新结构：修炼功法直接是完整的功法数据或null
      const cleanedCultivation = saveData.修炼功法 ? {
        // 保留所有功法数据和进度字段
        ...saveData.修炼功法,
        // 确保核心字段存在
        熟练度: saveData.修炼功法.熟练度 || 0,
        已解锁技能: saveData.修炼功法.已解锁技能 || [],
        修炼时间: saveData.修炼功法.修炼时间 || 0,
        突破次数: saveData.修炼功法.突破次数 || 0,
        正在修炼: saveData.修炼功法.正在修炼 || false,
        修炼进度: saveData.修炼功法.修炼进度 || 0
      } : null;

      // 使用分片存储同步修炼功法
      await helper.insertOrAssignVariables({
        '修炼功法': cleanedCultivation
      }, { type: 'chat' });

      console.log('[修炼同步] 修炼功法已同步到酒馆变量');
    } catch (error) {
      console.warn('[修炼同步] 同步修炼功法到酒馆变量失败:', error);
    }
  }

  /**
   * 撤回历史持久化
   */
  private saveUndoHistoryToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.undoActions));
    } catch (e) {
      console.warn('[撤回历史] 保存失败:', e);
    }
  }

  private loadUndoHistoryFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.undoActions = parsed as UndoAction[];
        }
      }
    } catch (e) {
      console.warn('[撤回历史] 加载失败:', e);
    }
  }
}
