

import type { SaveData, MasteredSkill, TechniqueItem } from '@/types/game';
import { debug } from './debug';

/**
 * 根据背包中功法的修炼进度，自动计算已掌握的技能列表
 * @param saveData 存档数据
 * @returns 已掌握的技能数组
 */
export function calculateMasteredSkills(saveData: SaveData): MasteredSkill[] {
  debug.log('掌握技能计算', '开始计算已掌握技能...');

  const masteredSkills: MasteredSkill[] = [];

  // 检查背包物品是否存在
  const itemsMap = (saveData as any)?.角色?.背包?.物品;
  if (!itemsMap) {
    debug.warn('掌握技能计算', '背包物品不存在，返回空数组');
    return masteredSkills;
  }

  // 优先仅从“已装备/修炼中/当前功法引用”中提取掌握技能；若无法判定当前功法，则回退为扫描全部功法
  const activeTechniqueIds = new Set<string>();
  const refTechniqueId =
    ((saveData as any)?.角色?.修炼?.修炼功法?.物品ID as string | undefined) ??
    ((saveData as any)?.角色?.功法?.当前功法ID as string | undefined);
  if (typeof refTechniqueId === 'string' && refTechniqueId) {
    activeTechniqueIds.add(refTechniqueId);
  }

  // 遍历背包中的所有物品
  for (const [itemId, item] of Object.entries(itemsMap as Record<string, any>)) {
    // 只处理功法类型的物品
    if ((item as any)?.类型 !== '功法') {
      continue;
    }

    const technique = item as TechniqueItem;

    // 若可确定当前功法：只采集当前/已装备/修炼中的功法，避免把未装备功法的技能也算进“掌握技能”
    if (activeTechniqueIds.size > 0) {
      const equipped = (technique as any)?.已装备 === true || (technique as any)?.修炼中 === true;
      const isActive = equipped || activeTechniqueIds.has(itemId) || activeTechniqueIds.has((technique as any)?.物品ID);
      if (!isActive) continue;
    }

    // 检查功法是否有技能定义
    if (!technique.功法技能 || typeof technique.功法技能 !== 'object') {
      debug.log('掌握技能计算', `功法 ${technique.名称} 没有技能定义`);
      continue;
    }

    // 获取当前功法的修炼进度
    const currentProgress = technique.修炼进度 || 0;

    debug.log('掌握技能计算', `检查功法 ${technique.名称}，修炼进度: ${currentProgress}`);

    // 🔥 修复：功法技能是数组，不是对象
    // 初始化已解锁技能数组
    if (!technique.已解锁技能) {
      technique.已解锁技能 = [];
    }

    // 遍历功法的所有技能（数组）
    for (const skill of technique.功法技能) {
      const skillName = skill.技能名称;
      // 获取技能解锁所需的熟练度阈值
      const unlockThreshold = skill.熟练度要求 || 0;

      debug.log('掌握技能计算', `  技能 ${skillName}，解锁阈值: ${unlockThreshold}`);

      // 判断是否已解锁该技能
      if (currentProgress >= unlockThreshold) {
        // 🔥 同步更新功法的已解锁技能数组
        if (!technique.已解锁技能.includes(skillName)) {
          technique.已解锁技能.push(skillName);
          debug.log('掌握技能计算', `  ✅ 添加到已解锁技能: ${skillName}`);
        }

        // 查找技能是否已存在于掌握技能列表中
        const existingSkill = masteredSkills.find(s =>
          s.技能名称 === skillName && s.来源 === technique.名称
        );

        if (!existingSkill) {
          // 添加新技能到掌握技能列表
          masteredSkills.push({
            技能名称: skillName,
            技能描述: skill.技能描述 || '',
            来源: technique.名称,
            消耗: skill.消耗 || '',
            熟练度: 0, // 技能独立的熟练度，初始为0
            使用次数: 0
          });

          debug.log('掌握技能计算', `  ✅ 解锁技能: ${skillName} (来自 ${technique.名称})`);
        }
      } else {
        debug.log('掌握技能计算', `  ❌ 技能 ${skillName} 未解锁 (${currentProgress}/${unlockThreshold})`);
      }
    }
  }

  debug.log('掌握技能计算', `计算完成，共掌握 ${masteredSkills.length} 个技能`);
  return masteredSkills;
}

/**
 * 更新存档数据中的掌握技能数组
 * 这个函数会自动计算并更新 saveData.掌握技能
 * @param saveData 存档数据（会被直接修改）
 * @returns 更新后的掌握技能数组
 */
export function updateMasteredSkills(saveData: SaveData): MasteredSkill[] {
  const calculatedSkills = calculateMasteredSkills(saveData);

  // 🔥 保留现有技能的熟练度和使用次数
  // 如果技能之前就已经掌握，保留其熟练度和使用次数
  const existingSkills =
    (((saveData as any).角色?.技能?.掌握技能 as MasteredSkill[] | undefined) ||
      ((saveData as any).系统?.缓存?.掌握技能 as MasteredSkill[] | undefined) ||
      []) as MasteredSkill[];

  for (const newSkill of calculatedSkills) {
    const existingSkill = existingSkills.find((s: MasteredSkill) =>
      s.技能名称 === newSkill.技能名称 && s.来源 === newSkill.来源
    );

    if (existingSkill) {
      // 保留已有的熟练度和使用次数
      newSkill.熟练度 = existingSkill.熟练度;
      newSkill.使用次数 = existingSkill.使用次数;
    }
  }

  // 更新存档数据（V3：角色.技能.掌握技能 为主；系统.缓存.* 为兼容旧逻辑的镜像）
  if (!(saveData as any).角色) (saveData as any).角色 = {};
  if (!(saveData as any).角色.技能 || typeof (saveData as any).角色.技能 !== 'object') {
    (saveData as any).角色.技能 = { 掌握技能: [], 装备栏: [], 冷却: {} };
  } else {
    if (!Array.isArray((saveData as any).角色.技能.掌握技能)) (saveData as any).角色.技能.掌握技能 = [];
    if (!Array.isArray((saveData as any).角色.技能.装备栏)) (saveData as any).角色.技能.装备栏 = [];
    if (!(saveData as any).角色.技能.冷却 || typeof (saveData as any).角色.技能.冷却 !== 'object') {
      (saveData as any).角色.技能.冷却 = {};
    }
  }
  (saveData as any).角色.技能.掌握技能 = calculatedSkills;

  if (!(saveData as any).系统) (saveData as any).系统 = {};
  if (!(saveData as any).系统.缓存) (saveData as any).系统.缓存 = {};
  (saveData as any).系统.缓存.掌握技能 = calculatedSkills;

  debug.log('掌握技能计算', '已更新存档数据中的掌握技能数组');
  return calculatedSkills;
}
