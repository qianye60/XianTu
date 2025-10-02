import type { CharacterBaseInfo, SaveData, PlayerStatus } from '@/types/game';
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

  // 1. 计算基础属性
  const playerStatus: PlayerStatus = calculateInitialAttributes(baseInfo, age);

  // 2. 设置一个合理的默认位置
  playerStatus.位置 = { 描述: '一个宁静的凡人村落' };

  // 3. 构建一个符合最新数据结构的完整 SaveData 对象
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
    宗门系统: {
      availableSects: [], sectRelationships: {}, sectHistory: [],
    },
    记忆: {
      短期记忆: [], // 初始为空，让AI生成真正的开局文本
      中期记忆: [],
      长期记忆: [],
    },
    游戏时间: {
      年: 1, 月: 1, 日: 1, 小时: 8, 分钟: 0,
    },
    修炼功法: {
      功法: null, 熟练度: 0, 已解锁技能: [], 修炼时间: 0, 突破次数: 0, 正在修炼: false, 修炼进度: 0,
    },
    系统: {
      初始年龄: age, // 开局年龄，用于自动计算寿命
      开局时间: { 年: 1, 月: 1, 日: 1, 小时: 8, 分钟: 0 }, // 开局游戏时间
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
