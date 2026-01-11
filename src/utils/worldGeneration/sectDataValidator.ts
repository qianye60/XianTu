/**
 * 宗门数据验证器
 * 确保AI生成的宗门数据逻辑一致性
 */

// 境界等级映射 - 支持带"期"和不带"期"的格式
// 注意：同一境界的不同阶段（初期、中期、后期、圆满、极境）都算同一等级
const REALM_LEVELS: Record<string, number> = {
  // 不带期的格式
  '练气': 1, '练气初期': 1, '练气中期': 1, '练气后期': 1, '练气圆满': 1, '练气极境': 1,
  '筑基': 2, '筑基初期': 2, '筑基中期': 2, '筑基后期': 2, '筑基圆满': 2, '筑基极境': 2,
  '金丹': 3, '金丹初期': 3, '金丹中期': 3, '金丹后期': 3, '金丹圆满': 3, '金丹极境': 3,
  '元婴': 4, '元婴初期': 4, '元婴中期': 4, '元婴后期': 4, '元婴圆满': 4, '元婴极境': 4,
  '化神': 5, '化神初期': 5, '化神中期': 5, '化神后期': 5, '化神圆满': 5, '化神极境': 5,
  '炼虚': 6, '炼虚初期': 6, '炼虚中期': 6, '炼虚后期': 6, '炼虚圆满': 6, '炼虚极境': 6,
  '合体': 7, '合体初期': 7, '合体中期': 7, '合体后期': 7, '合体圆满': 7, '合体极境': 7,
  '渡劫': 8, '渡劫初期': 8, '渡劫中期': 8, '渡劫后期': 8, '渡劫圆满': 8, '渡劫极境': 8,

  // 带期的格式
  '练气期': 1, '筑基期': 2, '金丹期': 3, '元婴期': 4, '化神期': 5,
  '炼虚期': 6, '合体期': 7, '渡劫期': 8
};

/**
 * 获取境界等级
 */
function getRealmLevel(realm: string): number {
  return REALM_LEVELS[realm] || 0;
}

/**
 * 验证并修复宗门境界分布数据
 */
export function validateAndFixSectRealmData(sectData: any): any {
  if (!sectData) return sectData;

  // 字段名兼容：将英文字段名转换为中文字段名
  if (sectData.leadership && !sectData.领导层) {
    sectData.领导层 = sectData.leadership;
    delete sectData.leadership;
  }

  // 特殊规则：合欢宗若缺失“圣女”，自动补齐（避免只生成宗门不生成关键职位）
  const sectName = String(sectData.名称 || sectData.name || '');
  if (sectName.includes('合欢')) {
    if (!sectData.领导层) {
      sectData.领导层 = {
        宗主: '合欢老魔',
        宗主修为: sectData.最强修为 || '化神期',
        最强修为: sectData.最强修为 || '化神期',
        圣女: '灰夫人(合欢圣女)'
      };
    } else if (!sectData.领导层.圣女) {
      sectData.领导层.圣女 = '灰夫人(合欢圣女)';
    }
  } else if (sectData.领导层) {
    // 彩蛋限定：其他宗门不应出现“圣女/圣子”字段（即便AI生成了也移除）
    if ('圣女' in sectData.领导层) delete sectData.领导层.圣女;
    if ('圣子' in sectData.领导层) delete sectData.领导层.圣子;
  }

  // 处理 memberCount 字段
  if (sectData.memberCount && !sectData.成员数量) {
    sectData.成员数量 = {
      总数: sectData.memberCount.total,
      按境界: sectData.memberCount.byRealm,
      按职位: sectData.memberCount.byPosition
    };
    delete sectData.memberCount;
  }

  // 处理已存在的成员数量字段中的英文子字段
  if (sectData.成员数量) {
    const memberCount = sectData.成员数量;

    // 转换 total -> 总数
    if (memberCount.total !== undefined && memberCount.总数 === undefined) {
      memberCount.总数 = memberCount.total;
    }

    // 转换 byRealm -> 按境界
    if (memberCount.byRealm && !memberCount.按境界) {
      memberCount.按境界 = memberCount.byRealm;
    }

    // 转换 byPosition -> 按职位
    if (memberCount.byPosition && !memberCount.按职位) {
      memberCount.按职位 = memberCount.byPosition;
    }
  }

  // 获取最强修为等级
  const maxRealm = sectData.领导层?.最强修为 || sectData.最强修为;
  const maxLevel = getRealmLevel(maxRealm);

  console.log(`[宗门验证] ${sectData.名称}: 最强修为="${maxRealm}" → 等级=${maxLevel}`);
  console.log(`[宗门验证] ${sectData.名称}: 原始境界分布=`, sectData.成员数量?.按境界);

  // 🔥 智能修复：根据境界分布自动设置最强修为
  if (sectData.成员数量?.按境界) {
    const realmDist = sectData.成员数量.按境界;

    // 找出境界分布中的最高境界
    let highestRealmLevel = 0;
    let highestRealmName = '';

    Object.keys(realmDist).forEach(realm => {
      const count = realmDist[realm];
      if (count > 0) {
        const realmLevel = getRealmLevel(realm);
        if (realmLevel > highestRealmLevel) {
          highestRealmLevel = realmLevel;
          highestRealmName = realm;
        }
      }
    });

    // 如果找到了最高境界，用它来更新最强修为
    if (highestRealmLevel > 0 && highestRealmName) {
      // 将"练气期"转换为"练气圆满"等更合理的描述
      const realmNameWithoutSuffix = highestRealmName.replace('期', '');
      const correctedMaxRealm = `${realmNameWithoutSuffix}圆满`;

      // 更新leadership中的最强修为
      if (sectData.领导层) {
        const oldMaxRealm = sectData.领导层.最强修为;
        sectData.领导层.最强修为 = correctedMaxRealm;
        console.log(`[宗门验证] ${sectData.名称}: 根据境界分布自动修正最强修为: "${oldMaxRealm}" → "${correctedMaxRealm}"`);

        // 如果宗主修为低于最强修为，也更新宗主修为
        const masterRealmLevel = getRealmLevel(sectData.领导层.宗主修为 || '');
        if (masterRealmLevel < highestRealmLevel) {
          sectData.领导层.宗主修为 = correctedMaxRealm;
          console.log(`[宗门验证] ${sectData.名称}: 同时更新宗主修为为: "${correctedMaxRealm}"`);
        }
      }
    }

    console.log(`[宗门验证] ${sectData.名称}: 境界分布包含:`, Object.keys(realmDist).filter(r => realmDist[r] > 0));
  }

  console.log(`[宗门验证] ${sectData.名称}: 验证后境界分布=`, sectData.成员数量?.按境界);

  // 验证长老数量与高境界修士数量的一致性
  if (sectData.领导层?.长老数量 && sectData.成员数量?.按境界) {
    const elderCount = sectData.领导层.长老数量;
    const realmDist = sectData.成员数量.按境界;
    
    // 计算元婴期及以上的修士总数
    let highRealmCount = 0;
    Object.keys(realmDist).forEach(realm => {
      const realmLevel = getRealmLevel(realm);
      if (realmLevel >= 4) {
        highRealmCount += realmDist[realm] || 0;
      }
    });

    if (highRealmCount > elderCount * 1.5) {
      const ratio = elderCount * 1.2 / highRealmCount;
      Object.keys(realmDist).forEach(realm => {
        const realmLevel = getRealmLevel(realm);
        if (realmLevel >= 4) {
          const originalCount = realmDist[realm];
          realmDist[realm] = Math.max(1, Math.round(originalCount * ratio));
        }
      });
    }
  }

  return sectData;
}

/**
 * 验证宗门数据的整体一致性
 */
export function validateSectConsistency(sectData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!sectData) {
    errors.push('宗门数据为空');
    return { isValid: false, errors };
  }

  // 检查最强修为与境界分布的一致性
  const maxRealm = sectData.领导层?.最强修为 || sectData.最强修为;
  const maxLevel = getRealmLevel(maxRealm);

  if (sectData.成员数量?.按境界) {
    Object.keys(sectData.成员数量.按境界).forEach(realm => {
      const realmLevel = getRealmLevel(realm);
      if (realmLevel > maxLevel) {
        errors.push(`境界分布错误: 存在${realm}期修士，但最强修为仅为${maxRealm}`);
      }
    });
  }

  // 检查长老数量与高境界修士的合理性
  const elderCount = sectData.领导层?.长老数量;
  if (elderCount && sectData.成员数量?.按境界) {
    let highRealmCount = 0;
    Object.keys(sectData.成员数量.按境界).forEach(realm => {
      const realmLevel = getRealmLevel(realm);
      if (realmLevel >= 4) {
        highRealmCount += sectData.成员数量.按境界[realm] || 0;
      }
    });

    if (highRealmCount > elderCount * 2) {
      errors.push(`人员配置不合理: 长老${elderCount}位，但元婴期以上修士${highRealmCount}人`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * 批量验证并修复宗门数据列表
 */
export function validateAndFixSectDataList(sects: any[]): any[] {
  if (!Array.isArray(sects)) return sects;

  return sects.map(sect => {
    const fixedSect = validateAndFixSectRealmData(sect);
    const validation = validateSectConsistency(fixedSect);
    
    if (!validation.isValid) {
      console.warn(`[宗门验证] ${sect.名称 || '未知宗门'}存在问题:`, validation.errors);
    }
    
    return fixedSect;
  });
}
