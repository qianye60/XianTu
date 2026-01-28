import type { CharacterBaseInfo, SaveData, PlayerStatus } from '@/types/game';
import type { World } from '@/types';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { calculateInitialAttributes } from './characterInitialization';

/**
 * 单机模式下的本地初始化（不依赖酒馆/AI）
 * 创建一个结构正确、包含基础物品的存档
 * 注意：记忆为空，将在游戏主界面通过 AI 生成真正的开局文本
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
    baseInfo.后天六司 = { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 };
    console.log('[离线初始化] 初始化后天六司为全0');
  }

  // 1) 计算基础属性
  const playerStatus: PlayerStatus = calculateInitialAttributes(baseInfo, age);

  // 2) 设置一个合理的默认位置（离线模式临时位置，会被AI初始化覆盖）
  playerStatus.位置 = {
    描述: '临时位置（等待AI初始化）',
    x: 115.0,
    y: 35.0,
  };

  // 3) 直接构建 V3（五域）存档（离线初始化不再生成旧key/不再走运行期迁移）
  const nowIso = new Date().toISOString();
  const gameTime = { 年: 1000, 月: 1, 日: 1, 小时: 8, 分钟: 0 };

  const saveData: SaveData = {
    元数据: {
      版本号: 3,
      存档ID: `save_${charId}_${Date.now()}`,
      存档名: `${baseInfo.名字}（离线开局）`,
      创建时间: nowIso,
      更新时间: nowIso,
      游戏时长秒: 0,
      时间: gameTime,
    },
    角色: {
      身份: baseInfo,
      属性: {
        境界: playerStatus.境界,
        声望: playerStatus.声望,
        气血: playerStatus.气血,
        灵气: playerStatus.灵气,
        神识: playerStatus.神识,
        寿命: playerStatus.寿命,
      },
      位置: playerStatus.位置 as any,
      效果: [],
      背包: {
        灵石: { 下品: 10, 中品: 0, 上品: 0, 极品: 0 },
        物品: {
          consumable_xinshou_danyao_01: {
            物品ID: 'consumable_xinshou_danyao_01',
            名称: '新手丹药',
            类型: '其他',
            数量: 3,
            品质: { quality: '凡', grade: 1 },
            描述: '一颗普通的丹药，能恢复少量气血。',
          },
          equipment_cubuyi_01: {
            物品ID: 'equipment_cubuyi_01',
            名称: '粗布衣',
            类型: '装备',
            数量: 1,
            品质: { quality: '凡', grade: 1 },
            描述: '一件朴素的粗布衣服，能提供微不足道的防御。',
          },
        },
      },
      装备: { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null },
      功法: { 当前功法ID: null, 功法进度: {}, 功法套装: { 主修: null, 辅修: [] } },
      修炼: { 修炼功法: null, 修炼状态: { 模式: '未修炼' } },
      大道: createEmptyThousandDaoSystem(),
      技能: { 掌握技能: [], 装备栏: [], 冷却: {} },
    },
    社交: {
      关系: {},
      宗门: null,
      事件: {
        配置: {
          启用随机事件: true,
          最小间隔年: 1,
          最大间隔年: 10,
          事件提示词: '',
        },
        下次事件时间: null,
        事件记录: [],
      },
      记忆: { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] },
    },
    世界: {
      信息: {
        世界名称: world.name,
        大陆信息: [],
        势力信息: [],
        地点信息: [],
        生成时间: nowIso,
        世界背景: world.description ?? '',
        世界纪元: world.era || '未知纪元',
        特殊设定: [],
        版本: 'offline-1.1',
      } as any,
      状态: {},
    },
    系统: {
      配置: {
        规则: { 属性上限: { 先天六司: { 每项上限: 10 } } },
        提示: [
          '系统规则：先天六司每项上限为10（NPC同样适用），如超限需裁剪至上限。',
          '系统会根据时间自动计算当前年龄，无需手动更新寿命.当前字段。',
        ],
      } as any,
      缓存: { 掌握技能: [] },
      历史: { 叙事: [] },
      扩展: {
        离线初始化: {
          初始年龄: age,
          开局时间: { 年: 1000 - age, 月: 1, 日: 1, 小时: 8, 分钟: 0 },
        },
      },
      联机: { 模式: '单机', 房间ID: null, 玩家ID: null, 只读路径: ['世界'], 世界曝光: false, 冲突策略: '服务器' },
    },
  };

  console.log('[离线初始化] 本地角色创建完成:', saveData);
  return saveData;
}
