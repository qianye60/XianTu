/**
 * 此文件定义了与 AI Game Master (游戏主控) 交互的核心数据结构。
 * 它是整个动态交互系统的“天道法则”。
 */

import type { CharacterData } from './index';

/**
 * 定义单条酒馆变量操作指令的结构。
 * 遵循 `AI指令集方案.md` 的规范。
 */
export interface TavernCommand {
  action: "set" | "add" | "delete" | "push" | "pull";
  scope: "global" | "chat" | "character" | "message";
  key: string;
  value?: any;
}

/**
 * 发送给 AI Game Master 的结构化请求对象 (天道请求)。
 * 它在基础角色数据之上，扩展了AI推演所必需的额外信息。
 */
export interface GM_Request {
  /** 角色数据，是基础CharacterData与额外信息的结合体 */
  character: CharacterData & {
    age: number;
    description: string; // 例如，由出身、灵根等信息组合而成的描述
  };
  world: {
    lorebook: string; // 世界书核心内容
    mapInfo: any;     // 当前地图信息 (GeoJSON)
    time: string;     // 当前游戏时间
  };
  memory: {
    short_term: string[]; // 近期对话历史
    mid_term: string[];   // 中期记忆摘要
    long_term: string[];  // 长期关键记忆
  };
  // 可根据后续需求扩展更多字段...
}

/**
 * AI Game Master 返回的结构化响应对象 (天道响应)。
 */
export interface GM_Response {
  /** AI生成的主要叙事内容，用于展示给用户。 */
  text: string;
  /** 叙事的摘要，可用于存入中期记忆。 */
  text_min?: string;
  /** 对周围环境、人物、声音的详细描述。 */
  around?: string;
  /**
   * 一个包含所有状态变更指令的数组。
   * 前端需要解析并执行这些指令。
   */
  tavern_commands?: TavernCommand[];
}