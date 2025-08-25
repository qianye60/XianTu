/**
 * AI Game Master (游戏主控) 核心工具集
 * 此文件负责构建发送给AI的请求，并解析AI返回的结构化响应。
 */

import { toast } from './toast';
import { getTavernHelper } from './tavern';
import type { CharacterData } from '../types';
import { useCharacterStore } from '@/stores/characterStore';
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
export function buildGmRequest(
  initialCharacter: CharacterData,
  creationDetails: { age: number; originName: string; spiritRootName: string; },
  mapData: any
): GM_Request {

  // 将基础数据转换为完整的 GameCharacter 结构
  const character: GameCharacter = {
    identity: {
      name: initialCharacter.character_name,
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
    attributes: { // 直接从创建数据中获取
      STR: 'root_bone' in initialCharacter ? initialCharacter.root_bone : 0,
      CON: 'temperament' in initialCharacter ? initialCharacter.temperament : 0,
      DEX: 'spirituality' in initialCharacter ? initialCharacter.spirituality : 0,
      INT: 'comprehension' in initialCharacter ? initialCharacter.comprehension : 0,
      SPI: 'spirituality' in initialCharacter ? initialCharacter.spirituality : 0, // 神魂暂用灵性替代
      LUK: 'fortune' in initialCharacter ? initialCharacter.fortune : 0,
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
 * 解析并执行来自AI的游戏主控响应 (GM_Response)。
 * 这是接收并执行“天道响应”的核心指令引擎。
 * @param response - AI返回的GM_Response对象。
 * @param character - 当前正在操作的角色对象，用于判断是否需要后端同步。
 */
export async function processGmResponse(response: GM_Response, character: CharacterData) {
  const characterStore = useCharacterStore(); // 获取Store实例

  if (!character) {
    toast.error("执行指令失败：未提供角色上下文。");
    return;
  }
  if (!response.tavern_commands || response.tavern_commands.length === 0) {
    console.log("AI响应中无 tavern_commands 指令。");
    return;
  }

  const helper = getTavernHelper();
  if (!helper) {
    toast.error("无法连接到酒馆助手，指令执行中断。");
    return;
  }
  toast.info(`接收到 ${response.tavern_commands.length} 条天道法旨，开始同步世界状态...`);

  try {
    for (const command of response.tavern_commands) {
      console.log(`执行指令:`, command);
      switch (command.action) {
        case 'set':
          await helper.insertOrAssignVariables({ [command.key]: command.value } as any, { type: command.scope } as any);
          toast.success(`[SET] ${command.key} = ${JSON.stringify(command.value)}`);
          break;
        case 'add':
          {
            const allVars = await helper.getVariables({ type: command.scope } as any) || {};
            const currentValue = Number(allVars[command.key] || 0);
            const newValue = currentValue + Number(command.value);
            await helper.insertOrAssignVariables({ [command.key]: newValue } as any, { type: command.scope } as any);
            toast.success(`[ADD] ${command.key} = ${newValue}`);
          }
          break;
        case 'push':
          {
            const allVars = await helper.getVariables({ type: command.scope } as any) || {};
            const currentArray = allVars[command.key] || [];
            if (Array.isArray(currentArray)) {
              const newArray = [...currentArray, command.value];
              await helper.insertOrAssignVariables({ [command.key]: newArray } as any, { type: command.scope } as any);
              toast.success(`[PUSH] 向 ${command.key} 添加 ${JSON.stringify(command.value)}`);
            } else {
              toast.error(`[PUSH-ERROR] ${command.key} 不是一个数组。`);
            }
          }
          break;
        case 'pull':
          {
            const allVars = await helper.getVariables({ type: command.scope } as any) || {};
            const currentArray = allVars[command.key] || [];
            if (Array.isArray(currentArray)) {
              const newArray = currentArray.filter((item: any) => JSON.stringify(item) !== JSON.stringify(command.value));
              await helper.insertOrAssignVariables({ [command.key]: newArray } as any, { type: command.scope } as any);
              toast.success(`[PULL] 从 ${command.key} 移除 ${JSON.stringify(command.value)}`);
            } else {
              toast.error(`[PULL-ERROR] ${command.key} 不是一个数组。`);
            }
          }
          break;
        case 'delete':
          // 封印：deleteVariable 或 deleteVariables 方法在 TavernHelper 类型上似乎不存在。
          // 在找到确切的API之前，暂时禁用此功能以避免编译和运行时错误。
          // await helper.deleteVariables([command.key], { type: command.scope } as any);
          toast.warning(`[DELETE-SEALED] 删除指令 "${command.key}" 已被暂时封印。`);
          break;
        default:
          toast.info(`[警告] 未知的指令动作: ${command.action}`);
      }

      // [核心改造] 天道同步法则
      // 在执行完指令后，检查是否需要同步到后端
      // 【已废除】云同步逻辑已移除
    }

    // 【核心改造】在所有指令执行完毕后，将AI响应中的核心状态更新到本地存档
    // 【已废除】map_data 逻辑已移除

  } catch (error: any) {
    console.error("执行AI指令时发生错误:", error);
    toast.error(`执行天道法旨失败: ${error.message}`);
  }
}