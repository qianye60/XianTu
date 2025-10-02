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

  // 🔥 注意：这里不同步到酒馆，由调用方决定何时同步
  // 初始化时会在最后一次性同步完整saveData
  // 游戏中会增量同步变更
  console.log('[executeCommands] 命令执行完成，共', changes.length, '个变更（未同步）');

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
    console.log(`[processGmResponse] 🎯 收到 ${response.tavern_commands.length} 个酒馆命令，开始执行...`);
    console.log('[processGmResponse] 命令详情:', response.tavern_commands);
    const result = await executeCommands(response.tavern_commands, updatedSaveData);
    updatedSaveData = result.saveData;
    stateChanges = result.stateChanges;
    // 将本次变更增量同步到酒馆，确保环境状态与本地一致
    try {
      if (stateChanges?.changes?.length) {
        await syncChangesToTavern(stateChanges.changes, 'chat');
        console.log('[processGmResponse] 已同步变更到 Tavern character.saveData');
      }
    } catch (syncErr) {
      console.error('[processGmResponse] 同步变更到酒馆失败:', syncErr);
    }
    console.log('[processGmResponse] ✅ 所有命令执行完成');
  } else {
    console.log('[processGmResponse] ⚠️ 没有 tavern_commands 需要执行');
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

  // 工具：限制数值到0-10（用于先天六司）
  const clamp = (n: unknown, min = 0, max = 10): number => {
    const v = typeof n === 'number' ? n : parseFloat(String(n));
    if (Number.isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  };

  // 若是先天六司路径，按规则裁剪
  const normalizeInnateSet = (p: string, val: any) => {
    if (!String(p).includes('先天六司')) return val;
    try {
      // 整体对象写入
      if (typeof val === 'object' && val !== null && (String(p).endsWith('先天六司') || String(p).endsWith('先天六司.')) ) {
        const obj = { ...val } as any;
        if ('根骨' in obj) obj['根骨'] = clamp(obj['根骨']);
        if ('灵性' in obj) obj['灵性'] = clamp(obj['灵性']);
        if ('悟性' in obj) obj['悟性'] = clamp(obj['悟性']);
        if ('气运' in obj) obj['气运'] = clamp(obj['气运']);
        if ('魅力' in obj) obj['魅力'] = clamp(obj['魅力']);
        if ('心性' in obj) obj['心性'] = clamp(obj['心性']);
        return obj;
      }
      // 单字段写入
      if (typeof val === 'number') return clamp(val);
      return val;
    } catch { return val; }
  };

  // 位置描述规范化：将任意叙事式地点描述，统一为「大陆名·区域·地点」结构
  const normalizeLocationDescription = (raw: any, dataRoot: any): any => {
    const worldName = (dataRoot?.['角色基础信息']?.['世界']) || '朝天大陆';

    const normalizeStr = (s: string): string => {
      let t = String(s || '').trim();
      if (!t) return `${worldName}·未知之地`;
      // 统一分隔符为 ·
      t = t
        .replace(/[，,、/\\|>]+/g, '·')
        .replace(/\s*[-—–]\s*/g, '·')
        .replace(/\s*·\s*/g, '·')
        .replace(/。/g, '')
        .replace(/\.\s*/g, '·');

      // 若仍无层级分隔，尽量从语句中抽取短语
      if (!t.includes('·')) {
        // 将句读转为层级，再去噪
        t = t.replace(/\s+/g, '·');
      }

      // 去掉常见虚词与尾缀（仅处理末段，避免破坏地名）
      const cleanup = (seg: string): string => {
        let u = seg.trim();
        u = u.replace(/的/g, '');
        u = u.replace(/[之的]?([上中下里内外处间旁畔边]{1})$/g, '');
        return u;
      };

      let parts = t.split('·').map(x => x.trim()).filter(Boolean).map(cleanup);
      // 去重空段
      parts = parts.filter(Boolean);

      // 确保首段为大陆名
      if (parts.length === 0) parts = ['未知之地'];
      if (parts[0] !== worldName) {
        parts.unshift(worldName);
      }

      // 限制总段数为 2~3（含大陆名）
      if (parts.length > 3) {
        parts = parts.slice(0, 3);
      }

      return parts.join('·');
    };

    // 支持直接字符串或对象 { 描述: string }
    if (typeof raw === 'string') {
      return normalizeStr(raw);
    }
    if (raw && typeof raw === 'object' && typeof raw['描述'] === 'string') {
      return { ...raw, 描述: normalizeStr(raw['描述']) };
    }
    return raw;
  };

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
          // 当写入位置时，做格式化：「大陆名·区域·地点」
          if (String(path).endsWith('玩家角色状态.位置.描述') || String(path).endsWith('位置.描述')) {
            set(saveData, path, normalizeLocationDescription(value, saveData));
          } else if (String(path).endsWith('玩家角色状态.位置')) {
            set(saveData, path, normalizeLocationDescription(value, saveData));
          } else {
            // 先天六司写入时裁剪到<=10（NPC与玩家均适用）
            const finalVal = normalizeInnateSet(path, value);
            set(saveData, path, finalVal);
          }
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
        let added = Number(currentValue) + Number(value || 0);
        // 若针对先天六司，裁剪到<=10
        if (String(path).includes('先天六司')) added = clamp(added);
        set(saveData, path, added);
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
        {
          const pullArray = get(saveData, path, []);
          if (Array.isArray(pullArray)) {
            const deepEqual = (a: any, b: any): boolean => {
              try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; }
            };
            let removed = false;
            // 1) 直接匹配（适用于原始类型，或同引用的对象）
            let idx = pullArray.indexOf(value as any);
            if (idx > -1) {
              pullArray.splice(idx, 1);
              removed = true;
            }
            // 2) 深度相等匹配（用于对象值）
            if (!removed && typeof value === 'object' && value !== null) {
              idx = pullArray.findIndex((it: any) => deepEqual(it, value));
              if (idx > -1) {
                pullArray.splice(idx, 1);
                removed = true;
              }
            }
            // 3) 通过标识符匹配（常见：物品ID/名称/状态名称）
            if (!removed && (typeof value === 'string' || typeof value === 'number')) {
              const v = String(value);
              const keyCandidates = ['物品ID', '名称', '状态名称', 'id', 'name'];
              idx = pullArray.findIndex((it: any) => {
                if (it && typeof it === 'object') {
                  return keyCandidates.some(k => String(it[k] ?? '') === v);
                }
                return String(it) === v;
              });
              if (idx > -1) {
                pullArray.splice(idx, 1);
                removed = true;
              }
            }
          }
        }
        break;

      case 'delete':
        {
          // 支持删除数组索引（以 [...][index] 结尾时使用 splice 保持数组紧凑）
          const arrayIndexMatch = String(path).match(/^(.*)\[(\d+)\]$/);
          if (arrayIndexMatch) {
            const basePath = arrayIndexMatch[1];
            const index = parseInt(arrayIndexMatch[2], 10);
            const arr = get(saveData, basePath, undefined);
            if (Array.isArray(arr) && index >= 0 && index < arr.length) {
              arr.splice(index, 1);
            } else {
              unset(saveData, path);
            }
          } else {
            unset(saveData, path);
          }
        }
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
 * 增量同步变更到酒馆（只同步变更的字段）
 * @param changes 变更列表
 * @param scope 变量作用域
 */
export async function syncChangesToTavern(changes: any[], scope: 'global' | 'chat' = 'chat'): Promise<void> {
  try {
    const helper = getTavernHelper();
    if (!helper) {
      console.warn('[syncChangesToTavern] 酒馆助手不可用');
      return;
    }

    if (changes.length === 0) {
      console.log('[syncChangesToTavern] 无变更需要同步');
      return;
    }

    // 🔥 关键修复：获取当前saveData，如果不存在则使用空对象
    let currentSaveData = await helper.getVariable('character.saveData', { type: scope });

    // 如果酒馆中还没有saveData（初始化场景），使用空对象
    if (!currentSaveData || typeof currentSaveData !== 'object' || Object.keys(currentSaveData as object).length === 0) {
      console.log('[syncChangesToTavern] 酒馆中无saveData，将创建新的');
      currentSaveData = {};
    }

    // 应用所有变更到saveData
    for (const change of changes) {
      set(currentSaveData as object, change.key, change.newValue);
    }

    // 只更新一个变量：character.saveData
    await helper.setVariable('character.saveData', currentSaveData, { type: scope });
    console.log('[syncChangesToTavern] 同步完成，更新了', changes.length, '个字段到character.saveData');
  } catch (error) {
    console.error('[syncChangesToTavern] 同步失败:', error);
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
