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
      规则: {
        属性上限: {
          先天六司: { 每项上限: 10 }
        }
      },
      提示: [
        '系统规则：先天六司每项上限为10（NPC同样适用），如超限需裁剪至上限。'
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

  // 注入 _AI 元数据提示（与联机初始化一致）
  try {
    if (saveData.角色基础信息) {
      (saveData.角色基础信息 as any)._AI说明 = '角色基础信息为创建时的静态设定，严禁修改（名字/性别/世界/天资/出身/灵根/先天六司）。';
      (saveData.角色基础信息 as any)._AI重要提醒 = '先天六司每项上限10；任何超过上限的写入都必须裁剪为10。';
    }
    (saveData.玩家角色状态 as any)._AI说明 = '玩家实时状态。位置仅更新“描述”；气血/灵气/神识/寿命/修为字段为{当前,最大}结构，任何数值变更必须通过 tavern_commands 实现。';
    (saveData.玩家角色状态 as any)._AI重要提醒 = '当气血≤0应设置已死亡/死亡时间/死亡原因';
    (saveData.背包 as any)._AI说明 = '背包.物品为数组；物品必须包含 物品ID/名称/类型/品质({quality,grade})/数量/描述；灵石存放于 背包.灵石 下。';
    (saveData.装备栏 as any)._AI说明 = '装备栏包含装备1..6槽，值为 {物品ID, 名称} 或 null；装备状态需与 背包.物品[*].已装备 同步。';
    (saveData.修炼功法 as any)._AI说明 = '修炼功法包含 功法/熟练度/已解锁技能[]/修炼时间/突破次数/正在修炼/修炼进度。变更需与剧情一致。';
    (saveData.三千大道 as any)._AI说明 = '三千大道系统：所有解锁、进度与路径定义应保持一致，写入大道进度时需确保加入 已解锁大道。';
    (saveData.记忆 as any)._AI说明 = '记忆模块由系统维护：短期/中期/长期；AI禁止直接修改，仅可通过叙事触发系统更新。';
    (saveData.记忆 as any)._AI重要提醒 = '由系统维护，严禁直接修改记忆数组';
    (saveData.游戏时间 as any)._AI说明 = '每次回应必须推进游戏时间（年/月/日/小时/分钟）。';
    (saveData.宗门系统 as any)._AI说明 = '宗门系统：记录可加入宗门与关系、历史，字段应为结构化文本，不要混入数值型“实力评估”。';
    (saveData.系统 as any)._AI说明 = '系统.规则 为全局限制；系统.提示 为约束提示集合，AI在生成前应读取并遵守。';
  } catch {}

  console.log('[离线初始化] 本地角色创建完成:', saveData);
  return saveData;
}
