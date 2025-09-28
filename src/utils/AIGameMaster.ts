/**
 * @fileoverview AI Game Master 核心模块
 * 负责构建GM请求、处理GM响应和执行酒馆命令
 */

import { getTavernHelper } from './tavern';
import { set, get, unset, cloneDeep } from 'lodash';
import type { GameCharacter, GM_Request, GM_Response } from '../types/AIGameMaster';
import type { StateChangeLog } from '@/types/game';

/**
 * 构建发送给AI Game Master的请求对象
 * @param baseInfo 角色基础信息
 * @param creationDetails 创建详情
 * @param mapData 地图数据
 * @returns GM_Request对象
 */
export function buildGmRequest(
  baseInfo: any,
  creationDetails: any,
  mapData?: any
): GM_Request {
  // 构建GameCharacter对象
  const character: GameCharacter = {
    identity: {
      name: baseInfo.名字 || '无名',
      title: undefined,
      age: creationDetails.age || 16,
      apparent_age: creationDetails.age || 16,
      gender: baseInfo.性别 || '男',
      description: `${baseInfo.出生 || '平民出身'}，${baseInfo.灵根 || '五行灵根'}，年龄${creationDetails.age || 16}岁`
    },
    cultivation: {
      realm: '凡人',
      realm_progress: 0,
      lifespan_remaining: 80,
      breakthrough_bottleneck: undefined
    },
    attributes: {
      STR: baseInfo.先天六司?.根骨 || 5,
      CON: baseInfo.先天六司?.根骨 || 5,
      DEX: baseInfo.先天六司?.魅力 || 5,
      INT: baseInfo.先天六司?.悟性 || 5,
      SPI: baseInfo.先天六司?.灵性 || 5,
      LUK: baseInfo.先天六司?.气运 || 5
    },
    resources: {
      qi: { current: 100, max: 100 },
      ling: { current: 0, max: 50 },
      shen: { current: 30, max: 30 }
    },
    qualities: {
      origin: {
        name: baseInfo.出生 || '平民出身',
        effects: []
      },
      spiritRoot: {
        name: baseInfo.灵根 || '五行灵根',
        quality: '普通',
        attributes: []
      },
      talents: Array.isArray(baseInfo.天赋) ? baseInfo.天赋.map((t: any) => ({
        name: typeof t === 'string' ? t : t.名称 || '未知天赋',
        type: '特殊',
        effects: []
      })) : []
    },
    skills: {},
    cultivation_arts: {},
    equipment: {
      accessories: [],
      treasures: [],
      consumables: []
    },
    social: {
      relationships: {},
      reputation: {}
    },
    hidden_state: {
      karma: {
        righteous: 0,
        demonic: 0,
        heavenly_favor: 0
      },
      dao_heart: {
        stability: 100,
        demons: [],
        enlightenment: 0
      },
      special_marks: []
    },
    status: {
      conditions: [],
      location: '未知',
      activity: '刚刚降生'
    }
  };

  // 构建世界状态
  const world = {
    lorebook: baseInfo.世界 || '修仙世界',
    mapInfo: mapData || null,
    time: '修仙历1000年'
  };

  // 构建记忆模块
  const memory = {
    short_term: [],
    mid_term: [],
    long_term: []
  };

  return {
    character,
    world,
    memory
  };
}

/**
 * [新] 批量执行酒馆命令并记录状态变更
 * @param commands 命令数组
 * @param saveData 初始存档数据
 * @returns 包含更新后存档和变更日志的对象
 */
export async function executeCommands(
  commands: any[],
  saveData: any
): Promise<{ saveData: any; stateChanges: StateChangeLog }> {
  let updatedSaveData = cloneDeep(saveData);
  const changes: StateChangeLog['changes'] = [];

  for (const command of commands) {
    if (!command || !command.action || !command.key) continue;

    const { action, key, value } = command;
    
    // 规范化路径
    let path = key;
    if (path.startsWith('character.saveData.')) {
      path = path.substring('character.saveData.'.length);
    }

    const oldValue = cloneDeep(get(updatedSaveData, path));
    
    // 执行命令
    updatedSaveData = await executeCommand(command, updatedSaveData);
    
    const newValue = cloneDeep(get(updatedSaveData, path));

    // 简单比较来决定是否记录变更
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        key: path,
        action,
        oldValue,
        newValue,
      });
    }
  }

  return {
    saveData: updatedSaveData,
    stateChanges: { changes },
  };
}


/**
 * 处理AI Game Master的响应，执行其中的酒馆命令
 * @param response GM响应对象
 * @param currentSaveData 当前存档数据
 * @returns 包含更新后存档和变更日志的对象
 */
export async function processGmResponse(
  response: GM_Response,
  currentSaveData: any
): Promise<{ saveData: any; stateChanges: StateChangeLog }> {
  console.log('[processGmResponse] 开始处理GM响应');
  
  const emptyChanges: StateChangeLog = { changes: [] };

  if (!response) {
    console.warn('[processGmResponse] 响应为空，返回原始数据');
    return { saveData: currentSaveData, stateChanges: emptyChanges };
  }

  let updatedSaveData = cloneDeep(currentSaveData);
  let stateChanges: StateChangeLog = emptyChanges;

  // 处理tavern_commands
  if (Array.isArray(response.tavern_commands) && response.tavern_commands.length > 0) {
    console.log(`[processGmResponse] 处理 ${response.tavern_commands.length} 个酒馆命令`);
    const result = await executeCommands(response.tavern_commands, updatedSaveData);
    updatedSaveData = result.saveData;
    stateChanges = result.stateChanges;
  }

  // 处理mid_term_memory
  if (response.mid_term_memory && typeof response.mid_term_memory === 'string') {
    console.log('[processGmResponse] 添加中期记忆');
    if (!updatedSaveData.记忆) {
      updatedSaveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
    }
    if (!Array.isArray(updatedSaveData.记忆.中期记忆)) {
      updatedSaveData.记忆.中期记忆 = [];
    }
    updatedSaveData.记忆.中期记忆.push(response.mid_term_memory);
  }

  console.log('[processGmResponse] GM响应处理完成');
  return { saveData: updatedSaveData, stateChanges };
}

/**
 * 执行单个酒馆命令
 * @param command 酒馆命令
 * @param saveData 存档数据
 * @returns 更新后的存档数据
 */
async function executeCommand(command: any, saveData: any): Promise<any> {
  if (!command || !command.action || !command.key) {
    console.warn('[executeCommand] 无效命令:', command);
    return saveData;
  }

  const { action, key, value } = command;

  // 规范化：当AI写入物品(尤其功法)时，自动校正品质与品级
  const normalizeItemIfNeeded = (val: any) => {
    try {
      if (!val || typeof val !== 'object') return val;
      const type = (val.类型 || '').trim();
      if (!['装备', '功法', '其他'].includes(type)) return val;
      
      // 品质规范化
      const qualityMap: Record<string, string> = {
        '凡品': '凡', '凡阶': '凡', '凡': '凡',
        '黄品': '黄', '黄阶': '黄', '黄': '黄',
        '玄品': '玄', '玄阶': '玄', '玄': '玄',
        '地品': '地', '地阶': '地', '地': '地',
        '天品': '天', '天阶': '天', '天': '天',
        '仙品': '仙', '仙阶': '仙', '仙': '仙',
        '神品': '神', '神阶': '神', '神': '神'
      };
      const gradeTextToNumber: Record<string, number> = {
        '残缺': 0, '下品': 2, '中品': 5, '上品': 8, '极品': 10
      };
      const q = val.品质 || {};
      const rawQ = String(q.quality ?? q.品质 ?? '').trim();
      const normQuality = qualityMap[rawQ] || '凡';
      const rawG: any = (q.grade ?? q.品级 ?? q.等级);
      let normGrade = 1;
      if (typeof rawG === 'number' && !Number.isNaN(rawG)) {
        normGrade = Math.min(10, Math.max(0, Math.round(rawG)));
      } else if (typeof rawG === 'string' && rawG.trim()) {
        normGrade = gradeTextToNumber[rawG.trim()] ?? 1;
      }
      val.品质 = { quality: normQuality, grade: normGrade };
      
      // 确保装备类物品有已装备字段
      if (type === '装备' || type === '功法') {
        if (val.已装备 === undefined) {
          val.已装备 = false;
        }
        
        // 清理重复的装备状态字段，只保留"已装备"字段
        if (val.是否装备 !== undefined) {
          console.warn('[物品规范化] 发现重复的装备状态字段"是否装备"，已清理');
          delete val.是否装备;
        }
      }
      
      // 确保有物品ID字段
      if (!val.物品ID) {
        val.物品ID = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      return val;
    } catch {
      return val;
    }
  };
  
  // 处理路径，移除 character.saveData. 前缀（如果存在）
  let path = key;
  if (path.startsWith('character.saveData.')) {
    path = path.substring('character.saveData.'.length);
  }

  console.log(`[executeCommand] 执行命令: ${action} ${path}`, value);

  try {
    switch (action) {
      case 'set':
        // 若写入物品或功法，先做一次品质规范化
        if (String(path).includes('背包.物品') || String(path).includes('修炼功法.功法')) {
          set(saveData, path, normalizeItemIfNeeded(value));
        } else {
          set(saveData, path, value);
        }

        // [特例修复] 当设置大道进度时，自动将其添加到已解锁大道数组中
        if (path.startsWith('三千大道.大道进度.')) {
          try {
            const daoName = path.substring('三千大道.大道进度.'.length);
            const unlockedDaos = get(saveData, '三千大道.已解锁大道', []);
            if (Array.isArray(unlockedDaos) && !unlockedDaos.includes(daoName)) {
              unlockedDaos.push(daoName);
              set(saveData, '三千大道.已解锁大道', unlockedDaos);
              console.log(`[executeCommand] 特例：已自动解锁大道 "${daoName}"`);
            }
          } catch (e) {
            console.error('[executeCommand] 自动解锁大道失败:', e);
          }
        }
        break;
        
      case 'add':
        const currentValue = get(saveData, path, 0);
        set(saveData, path, Number(currentValue) + Number(value || 0));
        break;
        
      case 'push':
        const array = get(saveData, path, []);
        if (Array.isArray(array)) {
          array.push(value);
        } else {
          set(saveData, path, [value]);
        }
        break;
        
      case 'pull':
        const pullArray = get(saveData, path, []);
        if (Array.isArray(pullArray)) {
          const index = pullArray.indexOf(value);
          if (index > -1) {
            pullArray.splice(index, 1);
          }
        }
        break;
        
      case 'delete':
        unset(saveData, path);
        break;
        
      default:
        console.warn('[executeCommand] 未知命令类型:', action);
    }
  } catch (error) {
    console.error('[executeCommand] 命令执行失败:', error);
  }

  return saveData;
}

/**
 * 同步数据到酒馆变量
 * @param saveData 存档数据
 * @param scope 变量作用域
 */
export async function syncToTavern(saveData: any, scope: 'global' | 'chat' = 'chat'): Promise<void> {
  try {
    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[syncToTavern] 酒馆助手不可用');
      return;
    }

    await helper.insertOrAssignVariables({
      'character.saveData': saveData
    }, { type: scope });

    console.log('[syncToTavern] 数据同步完成');
  } catch (error) {
    console.error('[syncToTavern] 数据同步失败:', error);
  }
}

/**
 * 从酒馆变量获取数据
 * @param scope 变量作用域
 * @returns 变量数据
 */
export async function getFromTavern(scope: 'global' | 'chat' = 'chat'): Promise<any> {
  try {
    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[getFromTavern] 酒馆助手不可用');
      return null;
    }

    const variables = await helper.getVariables({ type: scope });
    return variables['character.saveData'] || null;
  } catch (error) {
    console.error('[getFromTavern] 获取数据失败:', error);
    return null;
  }
}
