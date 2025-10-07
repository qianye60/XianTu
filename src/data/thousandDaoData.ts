/**
 * @fileoverview 三千大道系统 - AI动态生成框架
 * 所有大道路径都由AI根据游戏情况动态生成和管理
 */

import type { DaoData, ThousandDaoSystem } from '../types/game';

/** 创建空的三千大道系统 */
export function createEmptyThousandDaoSystem(): ThousandDaoSystem {
  return {
    大道列表: {}, // 开局无任何大道，完全由AI根据机缘解锁
  };
}

/**
 * 为新解锁的大道创建初始数据（数据+进度合并）
 * 所有大道都从第0阶段开始
 */
export function createNewDaoData(daoName: string, description: string = '神秘的大道'): DaoData {
  return {
    道名: daoName,
    描述: description,
    阶段列表: [], // 由AI动态生成阶段
    是否解锁: true,
    当前阶段: 0,
    当前经验: 0,
    总经验: 0,
  };
}