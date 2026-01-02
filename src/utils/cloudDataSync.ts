/**
 * @fileoverview 云端数据同步功能
 * 允许单机模式下载云端创建数据，但避免重复
 */

import { request } from '../services/request';
import { toast } from '../utils/toast';
import type { World, TalentTier, Origin, SpiritRoot, Talent } from '../types';
import { buildBackendUrl, isBackendConfigured } from '../services/backendConfig';

// 本地存储键名
const SYNC_HISTORY_KEY = 'dad_cloud_data_sync_history';
const SYNCED_DATA_KEY = 'dad_synced_cloud_data';

// 同步记录接口
interface SyncRecord {
  dataType: string;
  dataId: number;
  dataName: string;
  syncedAt: string;
}

// 同步历史接口
interface SyncHistory {
  lastSyncTime: string | null;
  syncedItems: SyncRecord[];
}

// 已同步数据接口
interface SyncedCloudData {
  worlds: World[];
  talentTiers: TalentTier[];
  origins: Origin[];
  spiritRoots: SpiritRoot[];
  talents: Talent[];
}

/**
 * 云端数据同步管理器
 */
export class CloudDataSync {
  private static instance: CloudDataSync;
  
  private constructor() {}
  
  static getInstance(): CloudDataSync {
    if (!CloudDataSync.instance) {
      CloudDataSync.instance = new CloudDataSync();
    }
    return CloudDataSync.instance;
  }

  /**
   * 获取同步历史记录
   */
  private getSyncHistory(): SyncHistory {
    const stored = localStorage.getItem(SYNC_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      lastSyncTime: null,
      syncedItems: []
    };
  }

  /**
   * 保存同步历史记录
   */
  private saveSyncHistory(history: SyncHistory): void {
    localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(history));
  }

  /**
   * 获取已同步的云端数据
   */
  getSyncedCloudData(): SyncedCloudData {
    const stored = localStorage.getItem(SYNCED_DATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      worlds: [],
      talentTiers: [],
      origins: [],
      spiritRoots: [],
      talents: []
    };
  }

  /**
   * 保存同步的云端数据
   */
  private saveSyncedCloudData(data: SyncedCloudData): void {
    localStorage.setItem(SYNCED_DATA_KEY, JSON.stringify(data));
  }

  /**
   * 检查某个数据项是否已经同步过
   */
  private isItemSynced(dataType: string, dataId: number): boolean {
    const history = this.getSyncHistory();
    return history.syncedItems.some(item => 
      item.dataType === dataType && item.dataId === dataId
    );
  }

  /**
   * 添加同步记录
   */
  private addSyncRecord(dataType: string, dataId: number, dataName: string): void {
    const history = this.getSyncHistory();
    
    // 避免重复记录
    if (this.isItemSynced(dataType, dataId)) {
      return;
    }
    
    history.syncedItems.push({
      dataType,
      dataId,
      dataName,
      syncedAt: new Date().toISOString()
    });
    
    history.lastSyncTime = new Date().toISOString();
    this.saveSyncHistory(history);
  }

  /**
   * 同步云端数据到本地
   * @param forceSync 是否强制同步（忽略重复检查）
   * @returns 同步结果
   */
  async syncCloudData(forceSync = false): Promise<{
    success: boolean;
    newItems: {
      worlds: number;
      talentTiers: number;
      origins: number;
      spiritRoots: number;
      talents: number;
    };
    message: string;
  }> {
    try {
      if (!isBackendConfigured()) {
        const message = '未配置后端服务器，无法同步云端数据';
        toast.info(message);
        return {
          success: false,
          newItems: {
            worlds: 0,
            talentTiers: 0,
            origins: 0,
            spiritRoots: 0,
            talents: 0,
          },
          message,
        };
      }
      toast.info('正在连接云端获取数据...');
      
      // 获取所有云端数据
      const [cloudWorlds, cloudTalentTiers, cloudOrigins, cloudSpiritRoots, cloudTalents] = await Promise.all([
        request<World[]>('/api/v1/worlds'),
        request<TalentTier[]>('/api/v1/talent_tiers'),
        request<Origin[]>('/api/v1/origins'),
        request<SpiritRoot[]>('/api/v1/spirit_roots'),
        request<Talent[]>('/api/v1/talents')
      ]);

      // 获取现有的同步数据
      const existingSyncedData = this.getSyncedCloudData();
      const history = this.getSyncHistory();
      
      // 过滤出新的数据项
      const filterNewItems = <T extends { id: number; name: string }>(
        cloudItems: T[], 
        existingItems: T[], 
        dataType: string
      ): T[] => {
        if (forceSync) {
          return cloudItems;
        }
        
        return cloudItems.filter(cloudItem => {
          // 检查是否已经同步过
          const alreadySynced = this.isItemSynced(dataType, cloudItem.id);
          if (!alreadySynced) {
            // 添加同步记录
            this.addSyncRecord(dataType, cloudItem.id, cloudItem.name);
          }
          return !alreadySynced;
        });
      };

      // 获取新数据
      const newWorlds = filterNewItems(cloudWorlds, existingSyncedData.worlds, 'world');
      const newTalentTiers = filterNewItems(cloudTalentTiers, existingSyncedData.talentTiers, 'talentTier');
      const newOrigins = filterNewItems(cloudOrigins, existingSyncedData.origins, 'origin');
      const newSpiritRoots = filterNewItems(cloudSpiritRoots, existingSyncedData.spiritRoots, 'spiritRoot');
      const newTalents = filterNewItems(cloudTalents, existingSyncedData.talents, 'talent');

      // 合并数据
      const updatedSyncedData: SyncedCloudData = {
        worlds: [...existingSyncedData.worlds, ...newWorlds],
        talentTiers: [...existingSyncedData.talentTiers, ...newTalentTiers],
        origins: [...existingSyncedData.origins, ...newOrigins],
        spiritRoots: [...existingSyncedData.spiritRoots, ...newSpiritRoots],
        talents: [...existingSyncedData.talents, ...newTalents]
      };

      // 保存更新后的数据
      this.saveSyncedCloudData(updatedSyncedData);

      // 统计新增数据
      const newItemsCount = {
        worlds: newWorlds.length,
        talentTiers: newTalentTiers.length,
        origins: newOrigins.length,
        spiritRoots: newSpiritRoots.length,
        talents: newTalents.length
      };

      const totalNewItems = Object.values(newItemsCount).reduce((sum, count) => sum + count, 0);

      if (totalNewItems > 0) {
        toast.success(`成功获取 ${totalNewItems} 项新数据！`);
        return {
          success: true,
          newItems: newItemsCount,
          message: `成功同步 ${totalNewItems} 项新数据`
        };
      } else {
        toast.info('所有云端数据已是最新，无需重复获取');
        return {
          success: true,
          newItems: newItemsCount,
          message: '所有数据已是最新'
        };
      }

    } catch (error) {
      console.error('[云端数据同步] 同步失败:', error);
      toast.error('获取云端数据失败，请检查网络连接');
      return {
        success: false,
        newItems: {
          worlds: 0,
          talentTiers: 0,
          origins: 0,
          spiritRoots: 0,
          talents: 0
        },
        message: error instanceof Error ? error.message : '同步失败'
      };
    }
  }

  /**
   * 清除同步历史（用于调试）
   */
  clearSyncHistory(): void {
    localStorage.removeItem(SYNC_HISTORY_KEY);
    localStorage.removeItem(SYNCED_DATA_KEY);
    toast.info('同步历史已清除');
  }

  /**
   * 获取同步统计信息
   */
  getSyncStats(): {
    lastSyncTime: string | null;
    totalSyncedItems: number;
    syncedByType: { [key: string]: number };
  } {
    const history = this.getSyncHistory();
    const syncedByType: { [key: string]: number } = {};
    
    history.syncedItems.forEach(item => {
      syncedByType[item.dataType] = (syncedByType[item.dataType] || 0) + 1;
    });
    
    return {
      lastSyncTime: history.lastSyncTime,
      totalSyncedItems: history.syncedItems.length,
      syncedByType
    };
  }

  /**
   * 检查是否有可用的云端数据
   */
  async checkCloudDataAvailability(): Promise<boolean> {
    try {
      // 简单的健康检查
      if (!isBackendConfigured()) {
        return false;
      }
      const healthUrl = buildBackendUrl('/api/health');
      if (!healthUrl) return false;
      const response = await fetch(healthUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 导出单例
export const cloudDataSync = CloudDataSync.getInstance();
