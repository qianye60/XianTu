import type { CharacterBaseInfo, SaveData } from '@/types/game';
import type { World } from '@/types';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { calculateInitialAttributes } from './characterInitialization';

/**
 * 单机模式下的本地初始化（不依赖酒馆/AI）
 */
export async function initializeCharacterOffline(
  charId: string,
  baseInfo: CharacterBaseInfo,
  world: World,
  age: number
): Promise<SaveData> {
  const status = calculateInitialAttributes(baseInfo, age);
  // 简单出生地与坐标
  status.位置 = status.位置 || { 描述: '起点村落', 坐标: { X: Math.floor(Math.random() * 1000), Y: Math.floor(Math.random() * 1000) } } as any;
  (status as any).出生地 = (status as any).出生地 || baseInfo.出生;

  const saveData: SaveData = {
    玩家角色状态: status as any,
    装备栏: { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null } as any,
    三千大道: createEmptyThousandDaoSystem(),
    背包: { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} } as any,
    人物关系: {} as any,
    记忆: {
      短期记忆: [],
      中期记忆: [],
      长期记忆: []
    } as any,
    世界信息: {
      世界名称: world.name,
      世界背景: world.description,
      大陆信息: [],
      势力信息: [],
      地点信息: [],
      生成信息: {
        生成时间: new Date().toISOString(),
        世界背景: world.description,
        世界纪元: (world as any).era,
        特殊设定: [],
        版本: 'offline-1.0'
      }
    } as any,
    游戏时间: { 年: 1000, 月: 1, 日: 1, 小时: 0, 分钟: 0 } as any,
    // 角色基础信息放在最后以便覆盖
    角色基础信息: baseInfo as any
  } as any;

  return saveData;
}
