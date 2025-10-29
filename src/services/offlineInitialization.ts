import type { CharacterBaseInfo, SaveData, PlayerStatus, QuestType } from '@/types/game';
import type { World } from '@/types';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { calculateInitialAttributes } from './characterInitialization';
import { ITEM_QUALITY_SYSTEM } from '@/data/itemQuality';

/**
 * 单机模式下的本地初始化（不依赖酒馆/AI）
 * 创建一个结构正确、包含基础物品的存档
 * 注意：现在记忆为空，将在游戏主界面通过AI生成真正的开局文本
 */
export async function initializeCharacterOffline(
  charId: string,
  baseInfo: CharacterBaseInfo,
  world: World,
  age: number
): Promise<SaveData> {
  console.log('[离线初始化] 开始执行本地角色创建...');

  // 确保后天六司存在，开局默认全为0
  if (!baseInfo.后天六司) {
    baseInfo.后天六司 = {
      根骨: 0,
      灵性: 0,
      悟性: 0,
      气运: 0,
      魅力: 0,
      心性: 0
    };
    console.log('[离线初始化] 初始化后天六司为全0');
  }

  // 1. 计算基础属性
  const playerStatus: PlayerStatus = calculateInitialAttributes(baseInfo, age);

  // 2. 设置一个合理的默认位置（离线模式临时位置，会被AI初始化覆盖）
  // 使用世界地图的中心坐标作为临时位置
  playerStatus.位置 = {
    描述: '临时位置（等待AI初始化）',
    x: 115.0,  // 地图中心经度
    y: 35.0     // 地图中心纬度
  };

  // 4. 构建一个符合最新数据结构的完整 SaveData 对象
  const saveData: SaveData = {
    角色基础信息: baseInfo,
    玩家角色状态: playerStatus,
    装备栏: {
      装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null,
    },
    三千大道: createEmptyThousandDaoSystem(),
    背包: {
      灵石: { 下品: 10, 中品: 0, 上品: 0, 极品: 0 }, // 给予10个下品灵石作为启动资金
      物品: {
        'consumable_xinshou_danyao_01': {
          物品ID: 'consumable_xinshou_danyao_01',
          名称: '新手丹药',
          类型: '其他',
          数量: 3,
          品质: { quality: '凡', grade: 1 },
          描述: '一颗普通的丹药，能恢复少量气血。',
        },
        'equipment_cubuyi_01': {
          物品ID: 'equipment_cubuyi_01',
          名称: '粗布衣',
          类型: '装备',
          数量: 1,
          品质: { quality: '凡', grade: 1 },
          描述: '一件朴素的粗布衣服，能提供微不足道的防御。',
        }
      },
    },
    人物关系: {},
    任务系统: {
      配置: {
        启用系统任务: false,
        系统任务类型: '修仙辅助系统',
        系统任务提示词: '',
        自动刷新: false,
        默认任务数量: 3
      },
      当前任务列表: [],
      已完成任务: [],
      任务统计: {
        完成总数: 0,
        各类型完成: {} as Record<QuestType, number>
      }
    },
    记忆: {
      短期记忆: [], // 初始为空，让AI生成真正的开局文本
      中期记忆: [],
      长期记忆: [],
    },
    // 🔥 修复：使用合理的游戏时间，确保角色不会因为默认值而出现异常年龄
    // 开局年龄18岁，游戏时间从18年开始，出生日期就是0年
    游戏时间: {
      年: 1000, 月: 1, 日: 1, 小时: 8, 分钟: 0,
    },
    修炼功法: null, // 初始无修炼功法，数据结构已改为：功法数据和进度合并为一个对象或null
    掌握技能: [], // 初始化为空数组
    系统: {
      初始年龄: age, // 开局年龄，用于自动计算寿命
      开局时间: { 年: 1000 - age, 月: 1, 日: 1, 小时: 8, 分钟: 0 }, // 开局游戏时间，与当前游戏时间一致
      规则: {
        属性上限: {
          先天六司: { 每项上限: 10 }
        }
      },
      提示: [
        '系统规则：先天六司每项上限为10（NPC同样适用），如超限需裁剪至上限。',
        '系统会根据游戏时间自动计算当前年龄，无需手动更新寿命.当前字段。'
      ]
    },
    世界信息: {
      世界名称: world.name,
      大陆信息: [],
      势力信息: [],
      地点信息: [],
      // 扁平化生成信息
      生成时间: new Date().toISOString(),
      世界背景: world.description,
      世界纪元: world.era || '未知纪元',
      特殊设定: [],
      版本: 'offline-1.1' // 版本号提升
    }
  };
  console.log('[离线初始化] 本地角色创建完成:', saveData);
  return saveData;
}
