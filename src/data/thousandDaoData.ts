/**
 * @fileoverview 三千大道系统 - AI动态生成框架
 * 所有大道路径都由AI根据游戏情况动态生成和管理
 */

import type { DaoPath, DaoProgress, ThousandDaoSystem } from '../types/game';

/** 创建空的三千大道系统 */
export function createEmptyThousandDaoSystem(): ThousandDaoSystem {
  return {
    已解锁大道: [], // 开局无任何大道，完全由AI根据机缘解锁
    大道进度: {},
    大道路径定义: {},
  };
}

/** 
 * 为新解锁的大道创建初始进度
 * 所有大道都从"未门"阶段开始
 */
export function createNewDaoProgress(daoName: string): DaoProgress {
  return {
    道名: daoName,
    当前阶段: 0, // 0对应"未门"阶段
    当前经验: 0,
    总经验: 0,
    是否解锁: true,
  };
}