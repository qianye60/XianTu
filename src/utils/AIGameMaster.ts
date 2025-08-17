/**
 * AI Game Master (游戏主控) 核心工具集
 * 此文件负责构建发送给AI的请求，并解析AI返回的结构化响应。
 */

import { toast } from './toast';
import { getTavernHelper } from './tavern';
import type { CharacterData } from '../types';
import type { GM_Request, GM_Response } from '../types/AIGameMaster';
import { syncCharacterAttribute } from '../services/characterSync';

/**
 * 构建一个标准的游戏主控请求 (GM_Request) 对象。
 * 这是发送给AI的“天道请求”。
 * @param character - 当前的角色数据。
 * @param mapData - 当前世界的地图数据。
 * @returns {GM_Request} - 构建完成的请求对象。
 */
export function buildGmRequest(
  character: CharacterData & { age: number; description: string; },
  mapData: any
): GM_Request {
  // TODO: 在未来，从酒馆变量中获取更丰富的世界状态和记忆信息。
  const request: GM_Request = {
    character: character,
    world: {
      lorebook: "...", // TODO: 注入核心世界书内容
      mapInfo: mapData,
      time: "开元元年春" // TODO: 实现动态时间系统
    },
    memory: {
      short_term: [], // TODO: 注入近期对话
      mid_term: [],   // TODO: 注入中期记忆
      long_term: []   // TODO: 注入长期记忆
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
  if (!character) {
    toast.error("执行指令失败：未提供角色上下文。");
    return;
  }
  if (!response.tavern_commands || response.tavern_commands.length === 0) {
    console.log("AI响应中无 tavern_commands 指令。");
    return;
  }

  const helper = getTavernHelper();
  toast.info(`接收到 ${response.tavern_commands.length} 条天道法旨，开始同步世界状态...`);

  try {
    for (const command of response.tavern_commands) {
      console.log(`执行指令:`, command);
      switch (command.action) {
        case 'set':
          await helper.insertOrAssignVariables({ [command.key]: command.value }, { type: command.scope });
          toast.success(`[SET] ${command.key} = ${JSON.stringify(command.value)}`);
          break;
        case 'add':
          {
            const allVars = helper.getVariables({ type: command.scope }) || {};
            const currentValue = Number(allVars[command.key] || 0);
            const newValue = currentValue + Number(command.value);
            await helper.insertOrAssignVariables({ [command.key]: newValue }, { type: command.scope });
            toast.success(`[ADD] ${command.key} = ${newValue}`);
          }
          break;
        case 'push':
          {
            const allVars = helper.getVariables({ type: command.scope }) || {};
            const currentArray = allVars[command.key] || [];
            if (Array.isArray(currentArray)) {
              const newArray = [...currentArray, command.value];
              await helper.insertOrAssignVariables({ [command.key]: newArray }, { type: command.scope });
              toast.success(`[PUSH] 向 ${command.key} 添加 ${JSON.stringify(command.value)}`);
            } else {
              toast.error(`[PUSH-ERROR] ${command.key} 不是一个数组。`);
            }
          }
          break;
        case 'pull':
          {
            const allVars = helper.getVariables({ type: command.scope }) || {};
            const currentArray = allVars[command.key] || [];
            if (Array.isArray(currentArray)) {
              const newArray = currentArray.filter((item: any) => JSON.stringify(item) !== JSON.stringify(command.value));
              await helper.insertOrAssignVariables({ [command.key]: newArray }, { type: command.scope });
              toast.success(`[PULL] 从 ${command.key} 移除 ${JSON.stringify(command.value)}`);
            } else {
              toast.error(`[PULL-ERROR] ${command.key} 不是一个数组。`);
            }
          }
          break;
        case 'delete':
          await helper.deleteVariable(command.key, { type: command.scope });
          toast.success(`[DELETE] ${command.key}`);
          break;
        default:
          toast.info(`[警告] 未知的指令动作: ${command.action}`);
      }

      // [核心改造] 天道同步法则
      // 在执行完指令后，检查是否需要同步到后端
      if (character.id && character.source === 'cloud' && command.scope === 'chat' && command.key.startsWith('character.')) {
        const attributeKey = command.key.substring('character.'.length);
        // 调用同步服务，此为异步操作，但不阻塞后续指令执行
        syncCharacterAttribute(character.id, attributeKey, command.value)
          .then(() => {
            console.log(`[SYNC] 属性 ${attributeKey} 已成功触发后端同步。`);
          })
          .catch(syncError => {
            console.error(`[SYNC-ERROR] 同步属性 ${attributeKey} 失败:`, syncError);
            toast.error(`同步角色属性 ${attributeKey} 至云端失败。`);
          });
      }
    }
  } catch (error: any) {
    console.error("执行AI指令时发生错误:", error);
    toast.error(`执行天道法旨失败: ${error.message}`);
  }
}