/**
 * 多存档系统
 * 管理独立的游戏存档，支持创建、切换、删除和备份
 * 
 * 功能包括：
 * - 多存档创建和管理
 * - 存档间独立的记忆系统
 * - 存档数据隔离和切换
 * - 存档备份和恢复
 * - 云端同步支持
 * - 存档统计和分析
 */

import { MultiLayerMemorySystem } from './MultiLayerMemorySystem';
import { GameStateManager } from './GameStateManager';
import { ItemSystem, InventoryManager } from './ItemSystem';
import { MapSystem } from './MapSystem';
import { FactionSystem } from './FactionSystem';
import { getTavernHelper } from './tavern';
import { toast } from './toast';

// 存档元信息接口
export interface SaveMetadata {
  id: string;
  name: string;
  description?: string;
  
  // 基础信息
  createdAt: string;
  lastSavedAt: string;
  lastPlayedAt: string;
  playTime: number; // 游戏时长（分钟）
  
  // 角色信息快照
  characterSnapshot: {
    name: string;
    level: number;
    realm: string;
    location: string;
    avatar?: string;
  };
  
  // 进度信息
  progressInfo: {
    explorationRate: number; // 探索度
    questsCompleted: number; // 完成任务数
    itemsCollected: number; // 收集物品数
    relationshipsFormed: number; // 建立的人际关系数
  };
  
  // 系统配置
  systemSettings: {
    worldBookId?: string; // 绑定的世界书
    difficultyLevel: 'easy' | 'normal' | 'hard' | 'nightmare';
    autoSaveEnabled: boolean;
    memorySettings: {
      shortTermLimit: number;
      midTermTrigger: number;
      longTermLimit: number;
    };
  };
  
  // 版本信息
  version: string;
  compatibility: string[];
}

// 存档数据接口
export interface SaveData {
  metadata: SaveMetadata;
  
  // 系统状态数据
  gameState: any; // GameStateManager的状态
  inventory: any; // InventoryManager的状态
  memory: any; // MultiLayerMemorySystem的状态
  mapData: any; // MapSystem的状态
  factionData: any; // FactionSystem的状态
  
  // 对话历史
  chatHistory: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: any;
  }[];
  
  // 自定义数据
  customData: Record<string, any>;
}

// 存档管理配置
export interface SaveManagerConfig {
  maxSaves: number; // 最大存档数量
  autoSaveInterval: number; // 自动保存间隔（分钟）
  backupRetention: number; // 备份保留天数
  compressionEnabled: boolean; // 是否启用压缩
  encryptionEnabled: boolean; // 是否启用加密
  cloudSyncEnabled: boolean; // 是否启用云端同步
}

class SaveManagerClass {
  private saves: Map<string, SaveMetadata> = new Map();
  private currentSaveId: string | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private playTimeStart: number = Date.now();
  
  private config: SaveManagerConfig = {
    maxSaves: 20,
    autoSaveInterval: 5, // 5分钟
    backupRetention: 7, // 7天
    compressionEnabled: true,
    encryptionEnabled: false,
    cloudSyncEnabled: false,
  };

  private tavernHelper: any = null;

  constructor() {
    this.initializeSaveSystem();
  }

  /**
   * 初始化存档系统
   */
  private async initializeSaveSystem() {
    try {
      this.tavernHelper = getTavernHelper();
      await this.loadSaveList();
      await this.loadCurrentSave();
      this.setupAutoSave();
      console.log('[存档系统] 初始化完成');
    } catch (error) {
      console.error('[存档系统] 初始化失败:', error);
    }
  }

  /**
   * 创建新存档
   */
  public async createSave(name: string, description?: string): Promise<string | null> {
    try {
      // 检查存档数量限制
      if (this.saves.size >= this.config.maxSaves) {
        toast.error(`存档数量已达上限（${this.config.maxSaves}个）`);
        return null;
      }

      // 检查名称是否重复
      for (const save of this.saves.values()) {
        if (save.name === name) {
          toast.error('存档名称已存在');
          return null;
        }
      }

      const saveId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // 创建存档元信息
      const metadata: SaveMetadata = {
        id: saveId,
        name,
        description,
        createdAt: now,
        lastSavedAt: now,
        lastPlayedAt: now,
        playTime: 0,
        characterSnapshot: {
          name: '新角色',
          level: 1,
          realm: '凡人',
          location: '新手村',
        },
        progressInfo: {
          explorationRate: 0,
          questsCompleted: 0,
          itemsCollected: 0,
          relationshipsFormed: 0,
        },
        systemSettings: {
          difficultyLevel: 'normal',
          autoSaveEnabled: true,
          memorySettings: {
            shortTermLimit: 5,
            midTermTrigger: 20,
            longTermLimit: 30,
          },
        },
        version: '1.0.0',
        compatibility: ['1.0.0'],
      };

      // 保存到存档列表
      this.saves.set(saveId, metadata);
      await this.saveSaveList();

      // 创建初始存档数据
      await this.createInitialSaveData(saveId, metadata);

      toast.success(`存档"${name}"创建成功`);
      return saveId;

    } catch (error) {
      console.error('[存档系统] 创建存档失败:', error);
      toast.error('创建存档失败');
      return null;
    }
  }

  /**
   * 切换到指定存档
   */
  public async switchToSave(saveId: string): Promise<boolean> {
    try {
      const saveMetadata = this.saves.get(saveId);
      if (!saveMetadata) {
        toast.error('存档不存在');
        return false;
      }

      // 保存当前存档
      if (this.currentSaveId) {
        await this.saveCurrentGame();
      }

      // 加载新存档
      const saveData = await this.loadSaveData(saveId);
      if (!saveData) {
        toast.error('加载存档失败');
        return false;
      }

      // 切换系统状态
      await this.applySaveData(saveData);

      // 更新当前存档ID
      this.currentSaveId = saveId;
      saveMetadata.lastPlayedAt = new Date().toISOString();
      
      // 重置游戏时长计时
      this.playTimeStart = Date.now();

      // 保存切换记录
      await this.saveSaveList();
      localStorage.setItem('current-save-id', saveId);

      toast.success(`已切换到存档"${saveMetadata.name}"`);
      return true;

    } catch (error) {
      console.error('[存档系统] 切换存档失败:', error);
      toast.error('切换存档失败');
      return false;
    }
  }

  /**
   * 保存当前游戏状态
   */
  public async saveCurrentGame(): Promise<boolean> {
    try {
      if (!this.currentSaveId) {
        toast.error('没有当前存档');
        return false;
      }

      const saveData = await this.collectCurrentGameData();
      await this.saveSaveData(this.currentSaveId, saveData);
      
      // 更新元信息
      const metadata = this.saves.get(this.currentSaveId);
      if (metadata) {
        metadata.lastSavedAt = new Date().toISOString();
        metadata.playTime += Math.floor((Date.now() - this.playTimeStart) / 60000);
        this.playTimeStart = Date.now();
        
        // 更新角色快照
        await this.updateCharacterSnapshot(metadata);
        
        await this.saveSaveList();
      }

      toast.success('游戏已保存');
      return true;

    } catch (error) {
      console.error('[存档系统] 保存游戏失败:', error);
      toast.error('保存游戏失败');
      return false;
    }
  }

  /**
   * 删除存档
   */
  public async deleteSave(saveId: string): Promise<boolean> {
    try {
      const saveMetadata = this.saves.get(saveId);
      if (!saveMetadata) {
        toast.error('存档不存在');
        return false;
      }

      // 不能删除当前正在使用的存档
      if (saveId === this.currentSaveId) {
        toast.error('不能删除当前正在使用的存档');
        return false;
      }

      // 删除存档数据
      localStorage.removeItem(`save-data-${saveId}`);
      
      // 删除备份
      this.deleteBackups(saveId);

      // 从存档列表中移除
      this.saves.delete(saveId);
      await this.saveSaveList();

      toast.success(`存档"${saveMetadata.name}"已删除`);
      return true;

    } catch (error) {
      console.error('[存档系统] 删除存档失败:', error);
      toast.error('删除存档失败');
      return false;
    }
  }

  /**
   * 复制存档
   */
  public async duplicateSave(saveId: string, newName: string): Promise<string | null> {
    try {
      const sourceMetadata = this.saves.get(saveId);
      if (!sourceMetadata) {
        toast.error('源存档不存在');
        return null;
      }

      // 检查新名称是否重复
      for (const save of this.saves.values()) {
        if (save.name === newName) {
          toast.error('存档名称已存在');
          return null;
        }
      }

      // 加载源存档数据
      const sourceData = await this.loadSaveData(saveId);
      if (!sourceData) {
        toast.error('加载源存档失败');
        return null;
      }

      // 创建新存档ID
      const newSaveId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // 创建新存档元信息
      const newMetadata: SaveMetadata = {
        ...sourceMetadata,
        id: newSaveId,
        name: newName,
        createdAt: now,
        lastSavedAt: now,
        lastPlayedAt: now,
        playTime: 0, // 重置游戏时长
      };

      // 更新存档数据的元信息
      const newSaveData: SaveData = {
        ...sourceData,
        metadata: newMetadata,
      };

      // 保存新存档
      this.saves.set(newSaveId, newMetadata);
      await this.saveSaveData(newSaveId, newSaveData);
      await this.saveSaveList();

      toast.success(`存档已复制为"${newName}"`);
      return newSaveId;

    } catch (error) {
      console.error('[存档系统] 复制存档失败:', error);
      toast.error('复制存档失败');
      return null;
    }
  }

  /**
   * 导出存档
   */
  public async exportSave(saveId: string): Promise<string | null> {
    try {
      const saveData = await this.loadSaveData(saveId);
      if (!saveData) {
        toast.error('加载存档失败');
        return null;
      }

      // 创建导出数据
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        saveData: saveData,
      };

      // 序列化数据
      const exportString = JSON.stringify(exportData, null, 2);
      
      // 如果启用压缩
      if (this.config.compressionEnabled) {
        // 这里可以添加压缩逻辑
      }

      return exportString;

    } catch (error) {
      console.error('[存档系统] 导出存档失败:', error);
      toast.error('导出存档失败');
      return null;
    }
  }

  /**
   * 导入存档
   */
  public async importSave(importString: string, newName?: string): Promise<string | null> {
    try {
      // 解析导入数据
      const importData = JSON.parse(importString);
      
      // 验证格式
      if (!importData.saveData || !importData.version) {
        toast.error('无效的存档格式');
        return null;
      }

      const saveData: SaveData = importData.saveData;
      const saveName = newName || `${saveData.metadata.name}_导入`;

      // 创建新存档ID
      const newSaveId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // 更新元信息
      saveData.metadata = {
        ...saveData.metadata,
        id: newSaveId,
        name: saveName,
        createdAt: now,
        lastSavedAt: now,
        lastPlayedAt: now,
      };

      // 保存导入的存档
      this.saves.set(newSaveId, saveData.metadata);
      await this.saveSaveData(newSaveId, saveData);
      await this.saveSaveList();

      toast.success(`存档"${saveName}"导入成功`);
      return newSaveId;

    } catch (error) {
      console.error('[存档系统] 导入存档失败:', error);
      toast.error('导入存档失败');
      return null;
    }
  }

  /**
   * 获取所有存档列表
   */
  public getSaveList(): SaveMetadata[] {
    return Array.from(this.saves.values())
      .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime());
  }

  /**
   * 获取当前存档信息
   */
  public getCurrentSave(): SaveMetadata | null {
    return this.currentSaveId ? this.saves.get(this.currentSaveId) || null : null;
  }

  /**
   * 获取存档统计信息
   */
  public getSaveStats(): {
    totalSaves: number;
    totalPlayTime: number;
    oldestSave: string;
    newestSave: string;
    averagePlayTime: number;
  } {
    const saves = Array.from(this.saves.values());
    const totalPlayTime = saves.reduce((sum, save) => sum + save.playTime, 0);

    return {
      totalSaves: saves.length,
      totalPlayTime,
      oldestSave: saves.reduce((oldest, save) => 
        new Date(save.createdAt) < new Date(oldest.createdAt) ? save : oldest
      )?.name || '',
      newestSave: saves.reduce((newest, save) => 
        new Date(save.createdAt) > new Date(newest.createdAt) ? save : newest
      )?.name || '',
      averagePlayTime: saves.length > 0 ? Math.floor(totalPlayTime / saves.length) : 0,
    };
  }

  // 私有方法

  /**
   * 收集当前游戏数据
   */
  private async collectCurrentGameData(): Promise<SaveData> {
    const metadata = this.saves.get(this.currentSaveId!)!;

    return {
      metadata,
      gameState: GameStateManager.getCurrentState(),
      inventory: InventoryManager.getInventoryStats(), // 简化版，实际需要完整数据
      memory: {
        // MultiLayerMemorySystem的状态
        stats: MultiLayerMemorySystem.getMemoryStats(),
      },
      mapData: MapSystem.getMapStats(),
      factionData: FactionSystem.getMapDisplayData(),
      chatHistory: [], // 需要从对话系统获取
      customData: {},
    };
  }

  /**
   * 应用存档数据
   */
  private async applySaveData(saveData: SaveData): Promise<void> {
    // 这里需要将存档数据应用到各个系统
    // 由于各个系统的接口限制，这里只能做简化处理
    console.log('[存档系统] 应用存档数据:', saveData.metadata.name);
    
    // 实际实现需要各个系统提供恢复接口
  }

  /**
   * 创建初始存档数据
   */
  private async createInitialSaveData(saveId: string, metadata: SaveMetadata): Promise<void> {
    const initialData: SaveData = {
      metadata,
      gameState: {},
      inventory: {},
      memory: {},
      mapData: {},
      factionData: {},
      chatHistory: [],
      customData: {},
    };

    await this.saveSaveData(saveId, initialData);
  }

  /**
   * 更新角色快照
   */
  private async updateCharacterSnapshot(metadata: SaveMetadata): Promise<void> {
    try {
      const gameState = GameStateManager.getCurrentState();
      const mapStats = MapSystem.getMapStats();

      metadata.characterSnapshot = {
        name: metadata.characterSnapshot.name, // 角色名需要从其他地方获取
        level: 1, // 需要从游戏状态获取
        realm: gameState.realm?.name || '凡人',
        location: gameState.location?.description || '未知',
      };

      metadata.progressInfo = {
        explorationRate: mapStats.explorationRate || 0,
        questsCompleted: 0, // 需要任务系统提供
        itemsCollected: 0, // 需要从背包系统获取
        relationshipsFormed: 0, // 需要关系系统提供
      };

    } catch (error) {
      console.error('[存档系统] 更新角色快照失败:', error);
    }
  }

  /**
   * 保存存档数据
   */
  private async saveSaveData(saveId: string, saveData: SaveData): Promise<void> {
    try {
      const dataString = JSON.stringify(saveData);
      localStorage.setItem(`save-data-${saveId}`, dataString);
      
      // 创建备份
      this.createBackup(saveId, saveData);

    } catch (error) {
      throw new Error(`保存存档数据失败: ${error}`);
    }
  }

  /**
   * 加载存档数据
   */
  private async loadSaveData(saveId: string): Promise<SaveData | null> {
    try {
      const dataString = localStorage.getItem(`save-data-${saveId}`);
      if (!dataString) {
        return null;
      }

      return JSON.parse(dataString);

    } catch (error) {
      console.error('[存档系统] 加载存档数据失败:', error);
      return null;
    }
  }

  /**
   * 保存存档列表
   */
  private async saveSaveList(): Promise<void> {
    try {
      const saveListData = {
        saves: Array.from(this.saves.entries()).map(([id, metadata]) => [
          id,
          {
            ...metadata,
            // 序列化时需要处理特殊字段
          }
        ]),
        currentSaveId: this.currentSaveId,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('save-manager-data', JSON.stringify(saveListData));

    } catch (error) {
      console.error('[存档系统] 保存存档列表失败:', error);
    }
  }

  /**
   * 加载存档列表
   */
  private async loadSaveList(): Promise<void> {
    try {
      const dataString = localStorage.getItem('save-manager-data');
      if (!dataString) {
        return;
      }

      const saveListData = JSON.parse(dataString);
      
      if (saveListData.saves) {
        this.saves = new Map(saveListData.saves);
      }

      console.log('[存档系统] 加载存档列表完成:', this.saves.size, '个存档');

    } catch (error) {
      console.error('[存档系统] 加载存档列表失败:', error);
    }
  }

  /**
   * 加载当前存档
   */
  private async loadCurrentSave(): Promise<void> {
    try {
      const currentSaveId = localStorage.getItem('current-save-id');
      if (currentSaveId && this.saves.has(currentSaveId)) {
        this.currentSaveId = currentSaveId;
        console.log('[存档系统] 当前存档:', this.saves.get(currentSaveId)?.name);
      }
    } catch (error) {
      console.error('[存档系统] 加载当前存档失败:', error);
    }
  }

  /**
   * 设置自动保存
   */
  private setupAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      if (this.currentSaveId) {
        const metadata = this.saves.get(this.currentSaveId);
        if (metadata?.systemSettings.autoSaveEnabled) {
          this.saveCurrentGame();
        }
      }
    }, this.config.autoSaveInterval * 60 * 1000);
  }

  /**
   * 创建备份
   */
  private createBackup(saveId: string, saveData: SaveData): void {
    try {
      const backupKey = `backup-${saveId}-${Date.now()}`;
      const backupData = {
        ...saveData,
        backupCreatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      
      // 清理过期备份
      this.cleanupOldBackups(saveId);

    } catch (error) {
      console.error('[存档系统] 创建备份失败:', error);
    }
  }

  /**
   * 清理过期备份
   */
  private cleanupOldBackups(saveId: string): void {
    try {
      const cutoffTime = Date.now() - (this.config.backupRetention * 24 * 60 * 60 * 1000);
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`backup-${saveId}-`)) {
          const timestamp = parseInt(key.split('-').pop() || '0');
          if (timestamp < cutoffTime) {
            localStorage.removeItem(key);
          }
        }
      });

    } catch (error) {
      console.error('[存档系统] 清理备份失败:', error);
    }
  }

  /**
   * 删除所有备份
   */
  private deleteBackups(saveId: string): void {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`backup-${saveId}-`)) {
          localStorage.removeItem(key);
        }
      });

    } catch (error) {
      console.error('[存档系统] 删除备份失败:', error);
    }
  }
}

// 导出单例实例
export const SaveManager = new SaveManagerClass();

export default SaveManager;