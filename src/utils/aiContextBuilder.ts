/**
 * @fileoverview AI上下文构建器
 *
 * 新架构：不再使用酒馆变量存储游戏状态
 * 而是在每次AI请求时，将必要的游戏状态作为prompt的一部分发送
 *
 * 优势：
 * - 数据流简单：Pinia ↔ IndexedDB（不再有酒馆变量）
 * - 减少同步开销：不需要频繁同步到酒馆
 * - 状态一致：Pinia是唯一数据源
 */

import type { SaveData } from '@/types/game';

/**
 * 精简的游戏状态（只包含AI需要的核心信息）
 * 用于减少token消耗
 */
export interface CompactGameState {
  // 角色基础信息
  角色: {
    名字: string;
    性别: string;
    年龄: number;
    种族: string;
  };

  // 境界和属性
  境界: {
    名称: string;
    阶段: string;
    当前进度: number;
  };

  属性: {
    气血: { 当前: number; 上限: number };
    灵气: { 当前: number; 上限: number };
    神识: { 当前: number; 上限: number };
    寿命: { 当前: number; 上限: number };
  };

  // 位置和时间
  位置: {
    描述: string;
    坐标?: { x: number; y: number };
  };

  游戏时间: {
    年: number;
    月: number;
    日: number;
    小时: number;
    分钟: number;
  };

  // 修炼状态
  修炼功法?: {
    名称: string;
    品质: string;
    修炼进度?: number;
  };

  // 背包（简化）
  背包: {
    灵石: {
      下品: number;
      中品: number;
      上品: number;
      极品: number;
    };
    物品数量: number;
    重要物品: string[]; // 只列出名称
  };

  // 人物关系（简化）
  人物关系: {
    [名字: string]: {
      关系: string;
      好感度: number;
    };
  };

  // 最近记忆（只传最近的几条）
  最近记忆: string[];
}

/**
 * 将完整SaveData压缩为精简的游戏状态
 * 大幅减少token消耗（预计从20k降至2-3k）
 */
export function buildCompactState(saveData: SaveData): CompactGameState {
  const baseInfo = saveData.角色基础信息;
  const playerStatus = saveData.玩家角色状态;
  const cultivationRef = saveData.修炼功法;

  // 获取修炼功法完整信息
  let cultivationInfo: CompactGameState['修炼功法'] = undefined;
  if (cultivationRef?.物品ID) {
    const technique = saveData.背包?.物品?.[cultivationRef.物品ID];
    if (technique && technique.类型 === '功法') {
      cultivationInfo = {
        名称: technique.名称,
        品质: technique.品质?.quality || '未知',
        修炼进度: (technique as any).修炼进度 || 0
      };
    }
  }

  // 精简背包信息
  const inventory = saveData.背包?.物品 || {};
  const importantItems = Object.values(inventory)
    .filter(item => item.品质?.quality !== '凡' || item.已装备)
    .map(item => item.名称)
    .slice(0, 10); // 最多10个重要物品

  // 精简人物关系
  const relationships: CompactGameState['人物关系'] = {};
  const npcRelations = saveData.人物关系 || {};
  Object.entries(npcRelations).forEach(([key, npc]) => {
    if (npc && npc.名字) {
      relationships[npc.名字] = {
        关系: npc.与玩家关系 || '陌生人',
        好感度: npc.好感度 || 0
      };
    }
  });

  // 只取最近5条短期记忆
  const recentMemories = (saveData.记忆?.短期记忆 || []).slice(0, 5);

  return {
    角色: {
      名字: baseInfo.名字,
      性别: baseInfo.性别,
      年龄: baseInfo.年龄 || playerStatus.寿命?.当前 || 0,
      种族: baseInfo.种族 || '人族'
    },
    境界: {
      名称: playerStatus.境界?.名称 || '凡人',
      阶段: playerStatus.境界?.阶段 || '',
      当前进度: playerStatus.境界?.当前进度 || 0
    },
    属性: {
      气血: playerStatus.气血 || { 当前: 100, 上限: 100 },
      灵气: playerStatus.灵气 || { 当前: 50, 上限: 50 },
      神识: playerStatus.神识 || { 当前: 30, 上限: 30 },
      寿命: playerStatus.寿命 || { 当前: 18, 上限: 80 }
    },
    位置: {
      描述: playerStatus.位置?.描述 || '未知之地',
      坐标: playerStatus.位置?.x !== undefined && playerStatus.位置?.y !== undefined
        ? { x: playerStatus.位置.x, y: playerStatus.位置.y }
        : undefined
    },
    游戏时间: saveData.游戏时间 || { 年: 1000, 月: 1, 日: 1, 小时: 0, 分钟: 0 },
    修炼功法: cultivationInfo,
    背包: {
      灵石: saveData.背包?.灵石 || { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
      物品数量: Object.keys(inventory).length,
      重要物品: importantItems
    },
    人物关系: relationships,
    最近记忆: recentMemories
  };
}

/**
 * 将精简游戏状态格式化为AI可读的文本
 */
export function formatStateForAI(state: CompactGameState): string {
  const lines: string[] = [];

  lines.push('=== 当前游戏状态 ===\n');

  // 角色信息
  lines.push(`【角色】${state.角色.名字}（${state.角色.性别}，${state.角色.种族}，${state.角色.年龄}岁）`);
  lines.push(`【境界】${state.境界.名称}${state.境界.阶段 ? ` - ${state.境界.阶段}` : ''} (进度: ${state.境界.当前进度}%)`);

  // 属性
  lines.push(`【气血】${state.属性.气血.当前}/${state.属性.气血.上限}`);
  lines.push(`【灵气】${state.属性.灵气.当前}/${state.属性.灵气.上限}`);
  lines.push(`【神识】${state.属性.神识.当前}/${state.属性.神识.上限}`);

  // 位置和时间
  lines.push(`【位置】${state.位置.描述}`);
  lines.push(`【时间】仙历${state.游戏时间.年}年${state.游戏时间.月}月${state.游戏时间.日}日 ${String(state.游戏时间.小时).padStart(2, '0')}:${String(state.游戏时间.分钟).padStart(2, '0')}`);

  // 修炼功法
  if (state.修炼功法) {
    lines.push(`【修炼功法】《${state.修炼功法.名称}》(${state.修炼功法.品质}品，进度: ${state.修炼功法.修炼进度}%)`);
  }

  // 背包
  lines.push(`【灵石】下品×${state.背包.灵石.下品} 中品×${state.背包.灵石.中品} 上品×${state.背包.灵石.上品} 极品×${state.背包.灵石.极品}`);
  if (state.背包.重要物品.length > 0) {
    lines.push(`【重要物品】${state.背包.重要物品.join('、')}`);
  }

  // 人物关系
  const importantNPCs = Object.entries(state.人物关系)
    .filter(([_, rel]) => rel.好感度 > 50 || rel.好感度 < -20)
    .slice(0, 5);
  if (importantNPCs.length > 0) {
    lines.push(`【人物关系】`);
    importantNPCs.forEach(([name, rel]) => {
      lines.push(`  - ${name} (${rel.关系}, 好感度: ${rel.好感度})`);
    });
  }

  // 最近记忆
  if (state.最近记忆.length > 0) {
    lines.push(`\n【最近发生】`);
    state.最近记忆.forEach((memory, i) => {
      lines.push(`${i + 1}. ${memory.substring(0, 200)}${memory.length > 200 ? '...' : ''}`);
    });
  }

  lines.push('\n========================\n');

  return lines.join('\n');
}

