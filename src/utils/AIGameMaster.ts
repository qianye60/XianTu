/**
 * AI Game Master (游戏主控) 核心工具集
 * 此文件负责构建发送给AI的请求，并解析AI返回的结构化响应。
 */

import { toast } from './toast';
import { set, get, unset, cloneDeep } from 'lodash';
import type { GameCharacter, GM_Request, GM_Response } from '../types/AIGameMaster';

/**
 * 构建一个标准的游戏主控请求 (GM_Request) 对象。
 * 这是发送给AI的“天道请求”。
 * 它负责将创建时的基础角色数据，转换为AI需要的完整 GameCharacter 结构。
 * @param initialCharacter - 创建时保存的基础角色数据
 * @param creationDetails - 包含年龄和描述来源的创建详情
 * @param mapData - 当前世界的地图数据
 * @returns {GM_Request} - 构建完成的请求对象
 */
import type { CharacterBaseInfo } from '@/types/game';

/**
 * 【已废弃/待重构】
 * 构建一个标准的游戏主控请求 (GM_Request) 对象。
 * 这是发送给AI的“天道请求”。
 * 它负责将创建时的基础角色数据，转换为AI需要的完整 GameCharacter 结构。
 * @param baseInfo - 角色的基础静态信息
 * @param creationDetails - 包含年龄和描述来源的创建详情
 * @param mapData - 当前世界的地图数据
 * @returns {GM_Request} - 构建完成的请求对象
 */
export function buildGmRequest(
  baseInfo: CharacterBaseInfo,
  creationDetails: { age: number; originName: string; spiritRootName: string; },
  mapData: any
): GM_Request {

  // 将基础数据转换为完整的 GameCharacter 结构
  const character: GameCharacter = {
    identity: {
      name: baseInfo.名字,
      title: undefined,
      age: creationDetails.age,
      apparent_age: creationDetails.age > 25 ? 25 : creationDetails.age, // 假设25岁后可驻颜
      gender: '未知', // 初始性别未知，待AI设定或玩家选择
      description: '一位初入修行之道的新晋道友。',
    },
    cultivation: {
      realm: '凡人', // 初始境界
      realm_progress: 0,
      lifespan_remaining: 80 - creationDetails.age, // 凡人基础寿命
      breakthrough_bottleneck: '未曾修行',
    },
    attributes: { // 直接从创建数据中获取，添加安全访问
      STR: baseInfo.先天六司?.根骨 || 10,
      CON: baseInfo.先天六司?.心性 || 10,
      DEX: baseInfo.先天六司?.灵性 || 10,
      INT: baseInfo.先天六司?.悟性 || 10,
      SPI: baseInfo.先天六司?.灵性 || 10, // 神魂暂用灵性替代
      LUK: baseInfo.先天六司?.气运 || 10,
    },
    resources: {
      qi: { current: 100, max: 100 }, // 气血
      ling: { current: 0, max: 0 },   // 灵气
      shen: { current: 10, max: 10 },  // 神识
    },
    qualities: {
      origin: { name: creationDetails.originName, effects: [] },
      spiritRoot: { name: creationDetails.spiritRootName, quality: '未知', attributes: [] },
      talents: [], // 初始天赋待AI生成
    },
    skills: {}, // 初始无任何技艺
    cultivation_arts: {}, // 初始无功法
    equipment: {
      accessories: [],
      treasures: [],
      consumables: [],
    },
    social: {
      relationships: {},
      reputation: {},
    },
    hidden_state: {
      karma: { righteous: 0, demonic: 0, heavenly_favor: 0 },
      dao_heart: { stability: 50, demons: [], enlightenment: 0 },
      special_marks: [],
    },
    status: {
      conditions: ['健康'],
      location: '未知',
      activity: '等待降世',
      mood: '迷茫',
    },
  };

  const request: GM_Request = {
    character: character,
    world: {
      lorebook: "...", // TODO: 注入核心世界书内容
      mapInfo: mapData,
      time: "开元元年春" // TODO: 实现动态时间系统
    },
    memory: {
      short_term: [],
      mid_term: [],
      long_term: []
    }
  };
  return request;
}

/**
 * 解析来自AI的游戏主控响应 (GM_Response)，并将其指令应用到一个内存中的 saveData 对象上。
 * 这是“天道响应”的防火墙和解释器，确保所有AI驱动的状态变更都被收敛到单一数据源。
 * @param response - AI返回的GM_Response对象。
 * @param currentSaveData - 当前从酒馆读取的 character.saveData 对象。
 * @returns {Promise<any>} - 返回一个被指令修改过的、新的 saveData 对象。
 */
export async function processGmResponse<T extends object>(response: GM_Response, currentSaveData: T): Promise<T> {
  if (!response.tavern_commands || response.tavern_commands.length === 0) {
    console.log('AI响应中无 tavern_commands 指令，无需处理。');
    return currentSaveData; // 没有指令，直接返回原始对象
  }

  // 创建一个深拷贝，以避免修改原始的 Pinia store 状态或传入的对象引用
  const newSaveData = cloneDeep(currentSaveData);

  console.log(`接收到 ${response.tavern_commands.length} 条天道法旨，开始在内存中模拟执行...`);

  try {
    for (const command of response.tavern_commands) {
      console.log(`内存执行: ${command.action} ${command.key}`, command.value);

      switch (command.action) {
        case 'set':
          set(newSaveData, command.key, command.value);
          break;

        case 'add': {
          const currentValue = Number(get(newSaveData, command.key, 0));
          const valueToAdd = Number(command.value);
          set(newSaveData, command.key, currentValue + valueToAdd);
          break;
        }

        case 'push': {
          const currentArray = get(newSaveData, command.key, []) as any[];
          if (Array.isArray(currentArray)) {
            currentArray.push(command.value);
            // set(newSaveData, command.key, currentArray); // set is not strictly necessary due to mutation, but good for clarity
          } else {
            console.error(`[PROCESS-GM-ERROR] Key "${command.key}" is not an array, cannot push.`);
          }
          break;
        }

        case 'pull': {
          let currentArray = get(newSaveData, command.key, []) as any[];
          if (Array.isArray(currentArray)) {
            const valueToRemove = JSON.stringify(command.value);
            currentArray = currentArray.filter((item: any) => JSON.stringify(item) !== valueToRemove);
            set(newSaveData, command.key, currentArray);
          } else {
            console.error(`[PROCESS-GM-ERROR] Key "${command.key}" is not an array, cannot pull.`);
          }
          break;
        }

        case 'delete':
          unset(newSaveData, command.key);
          break;

        default:
          console.warn(`[PROCESS-GM-WARNING] 未知的指令动作: ${command.action}`);
      }
    }

    console.log("内存执行完毕，返回更新后的 saveData。", newSaveData);
    return newSaveData;

  } catch (error: any) {
    console.error("在内存中执行AI指令时发生严重错误:", error);
    toast.error(`执行天道法旨失败: ${error.message}`);
    // 如果发生错误，返回原始对象，避免状态被污染
    return currentSaveData;
  }
}