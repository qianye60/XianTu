/**
 * 宗门数据验证器
 * 确保AI生成的宗门数据逻辑一致性
 */

// 境界等级映射 - 支持带"期"和不带"期"的格式
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

  console.log('[宗门验证] 开始验证宗门数据:', sectData.名称);

  // 获取最强修为等级
  const maxRealm = sectData.leadership?.最强修为 || sectData.最强修为;
  const maxLevel = getRealmLevel(maxRealm);
  
  console.log('[宗门验证] 最强修为:', maxRealm, '等级:', maxLevel);

  // 修复境界分布
  if (sectData.memberCount?.byRealm) {
    const realmDist = sectData.memberCount.byRealm;
    const originalDist = { ...realmDist };
    
    // 移除超过最强修为的境界
    Object.keys(realmDist).forEach(realm => {
      const realmLevel = getRealmLevel(realm);
      if (realmLevel > maxLevel) {
        console.log(`[宗门验证] 移除超越最强修为的境界: ${realm} (等级${realmLevel} > ${maxLevel})`);
        delete realmDist[realm];
      }
    });

    console.log('[宗门验证] 修复前境界分布:', originalDist);
    console.log('[宗门验证] 修复后境界分布:', realmDist);
  }

  // 验证长老数量与高境界修士数量的一致性
  if (sectData.leadership?.长老数量 && sectData.memberCount?.byRealm) {
    const elderCount = sectData.leadership.长老数量;
    const realmDist = sectData.memberCount.byRealm;
    
    // 计算元婴期及以上的修士总数（通常长老都是元婴期以上）
    let highRealmCount = 0;
    Object.keys(realmDist).forEach(realm => {
      const realmLevel = getRealmLevel(realm);
      if (realmLevel >= 4) { // 元婴期及以上
        highRealmCount += realmDist[realm] || 0;
      }
    });

    console.log(`[宗门验证] 长老数量: ${elderCount}, 高境界修士: ${highRealmCount}`);

    // 如果高境界修士数量明显超过长老数量，进行调整
    if (highRealmCount > elderCount * 1.5) {
      console.log('[宗门验证] 高境界修士数量过多，进行调整');
      
      // 按比例缩减高境界修士数量
      const ratio = elderCount * 1.2 / highRealmCount;
      Object.keys(realmDist).forEach(realm => {
        const realmLevel = getRealmLevel(realm);
        if (realmLevel >= 4) {
          const originalCount = realmDist[realm];
          realmDist[realm] = Math.max(1, Math.round(originalCount * ratio));
          console.log(`[宗门验证] 调整${realm}: ${originalCount} -> ${realmDist[realm]}`);
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
  const maxRealm = sectData.leadership?.最强修为 || sectData.最强修为;
  const maxLevel = getRealmLevel(maxRealm);

  if (sectData.memberCount?.byRealm) {
    Object.keys(sectData.memberCount.byRealm).forEach(realm => {
      const realmLevel = getRealmLevel(realm);
      if (realmLevel > maxLevel) {
        errors.push(`境界分布错误: 存在${realm}期修士，但最强修为仅为${maxRealm}`);
      }
    });
  }

  // 检查长老数量与高境界修士的合理性
  const elderCount = sectData.leadership?.长老数量;
  if (elderCount && sectData.memberCount?.byRealm) {
    let highRealmCount = 0;
    Object.keys(sectData.memberCount.byRealm).forEach(realm => {
      const realmLevel = getRealmLevel(realm);
      if (realmLevel >= 4) {
        highRealmCount += sectData.memberCount.byRealm[realm] || 0;
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