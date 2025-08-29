/**
 * @fileoverview 三千大道系统酒馆变量管理器
 * 负责通过酒馆变量系统动态管理大道数据
 */

import { getTavernHelper } from './tavern';
import { toast } from './toast';
import type { ThousandDaoSystem, DaoPath, DaoProgress } from '@/types/game';
import { createEmptyThousandDaoSystem, createNewDaoProgress } from '@/data/thousandDaoData';

export class ThousandDaoManager {
  private static instance: ThousandDaoManager;
  
  private constructor() {}
  
  static getInstance(): ThousandDaoManager {
    if (!ThousandDaoManager.instance) {
      ThousandDaoManager.instance = new ThousandDaoManager();
    }
    return ThousandDaoManager.instance;
  }

  /**
   * 获取当前的三千大道系统数据
   */
  async getCurrentDaoSystem(): Promise<ThousandDaoSystem> {
    try {
      const helper = getTavernHelper();
      if (!helper) {
        throw new Error('无法连接到酒馆助手');
      }

      const chatVars = await helper.getVariables({ type: 'chat' });
      const daoSystem = chatVars['三千大道'];
      
      if (daoSystem) {
        return daoSystem as ThousandDaoSystem;
      } else {
        // 如果没有数据，返回空系统
        return createEmptyThousandDaoSystem();
      }
    } catch (error) {
      console.error('[三千大道管理器] 获取数据失败:', error);
      return createEmptyThousandDaoSystem();
    }
  }

  /**
   * 保存三千大道系统数据到酒馆变量
   */
  async saveDaoSystem(daoSystem: ThousandDaoSystem): Promise<boolean> {
    try {
      const helper = getTavernHelper();
      if (!helper) {
        throw new Error('无法连接到酒馆助手');
      }

      await helper.insertOrAssignVariables({
        '三千大道': daoSystem
      }, { type: 'chat' });
      
      console.log('[三千大道管理器] 数据已保存到酒馆变量');
      return true;
    } catch (error) {
      console.error('[三千大道管理器] 保存数据失败:', error);
      toast.error('保存大道数据失败');
      return false;
    }
  }

  /**
   * 解锁新的大道
   */
  async unlockNewDao(daoPath: DaoPath): Promise<boolean> {
    try {
      const currentSystem = await this.getCurrentDaoSystem();
      
      // 检查是否已经解锁
      if (currentSystem.已解锁大道.includes(daoPath.道名)) {
        toast.info(`${daoPath.道名}已经解锁`);
        return true;
      }

      // 添加到已解锁列表
      currentSystem.已解锁大道.push(daoPath.道名);
      
      // 添加大道路径定义
      currentSystem.大道路径定义[daoPath.道名] = daoPath;
      
      // 创建初始进度（未门阶段）
      currentSystem.大道进度[daoPath.道名] = createNewDaoProgress(daoPath.道名);
      
      // 保存到酒馆变量
      const success = await this.saveDaoSystem(currentSystem);
      
      if (success) {
        toast.success(`【道途开启】领悟了${daoPath.道名}的奥妙！`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[三千大道管理器] 解锁大道失败:', error);
      toast.error('解锁大道失败');
      return false;
    }
  }

  /**
   * 增加大道经验
   */
  async addDaoExperience(daoName: string, experience: number): Promise<boolean> {
    try {
      const currentSystem = await this.getCurrentDaoSystem();
      
      // 检查大道是否存在
      const daoProgress = currentSystem.大道进度[daoName];
      if (!daoProgress) {
        toast.warning(`${daoName}尚未解锁`);
        return false;
      }

      // 增加经验
      daoProgress.当前经验 += experience;
      daoProgress.总经验 += experience;
      
      // 检查是否可以突破
      const daoPath = currentSystem.大道路径定义[daoName];
      if (daoPath) {
        const currentStage = daoPath.阶段列表[daoProgress.当前阶段];
        if (currentStage && daoProgress.当前经验 >= currentStage.突破经验) {
          // 突破到下一阶段
          if (daoProgress.当前阶段 < daoPath.阶段列表.length - 1) {
            daoProgress.当前阶段++;
            daoProgress.当前经验 = 0; // 重置当前阶段经验
            
            const newStage = daoPath.阶段列表[daoProgress.当前阶段];
            toast.success(`【境界突破】${daoName}突破至${newStage.名称}！`);
          }
        }
      }
      
      // 保存到酒馆变量
      return await this.saveDaoSystem(currentSystem);
    } catch (error) {
      console.error('[三千大道管理器] 增加经验失败:', error);
      toast.error('增加经验失败');
      return false;
    }
  }

  /**
   * 直接设置大道阶段（用于特殊情况）
   */
  async setDaoStage(daoName: string, stageIndex: number): Promise<boolean> {
    try {
      const currentSystem = await this.getCurrentDaoSystem();
      
      const daoProgress = currentSystem.大道进度[daoName];
      if (!daoProgress) {
        toast.warning(`${daoName}尚未解锁`);
        return false;
      }

      const daoPath = currentSystem.大道路径定义[daoName];
      if (!daoPath || stageIndex >= daoPath.阶段列表.length || stageIndex < 0) {
        toast.error('无效的阶段索引');
        return false;
      }

      daoProgress.当前阶段 = stageIndex;
      daoProgress.当前经验 = 0; // 重置当前经验
      
      const stageName = daoPath.阶段列表[stageIndex].名称;
      toast.info(`【境界变更】${daoName}境界设为${stageName}`);
      
      return await this.saveDaoSystem(currentSystem);
    } catch (error) {
      console.error('[三千大道管理器] 设置阶段失败:', error);
      toast.error('设置阶段失败');
      return false;
    }
  }

  /**
   * 获取大道详细信息
   */
  async getDaoDetails(daoName: string): Promise<{
    path?: DaoPath;
    progress?: DaoProgress;
    isUnlocked: boolean;
  }> {
    try {
      const currentSystem = await this.getCurrentDaoSystem();
      
      return {
        path: currentSystem.大道路径定义[daoName],
        progress: currentSystem.大道进度[daoName],
        isUnlocked: currentSystem.已解锁大道.includes(daoName),
      };
    } catch (error) {
      console.error('[三千大道管理器] 获取大道详情失败:', error);
      return { isUnlocked: false };
    }
  }

  /**
   * 重置所有大道数据（调试用）
   */
  async resetAllDaoData(): Promise<boolean> {
    try {
      const emptySystem = createEmptyThousandDaoSystem();
      const success = await this.saveDaoSystem(emptySystem);
      
      if (success) {
        toast.info('三千大道系统已重置');
      }
      
      return success;
    } catch (error) {
      console.error('[三千大道管理器] 重置失败:', error);
      toast.error('重置失败');
      return false;
    }
  }
}

// 导出单例
export const thousandDaoManager = ThousandDaoManager.getInstance();