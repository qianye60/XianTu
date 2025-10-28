/**
 * 宗门数据自动计算器
 * 用算法确保数据的一致性和合理性，不依赖AI生成
 */

export interface SectCalculationData {
  名称: string;
  类型: string;
  等级: string;
  宗主修为?: string;
  最强修为?: string;
  长老数量?: number;
  核心弟子数?: number;
  内门弟子数?: number;
  外门弟子数?: number;
}

export interface CalculatedSectData {
  声望值: number;
  综合战力: number;
}

/**
 * 境界实力映射表 - 用于计算战力
 */
const REALM_POWER_MAP: Record<string, number> = {
  '练气初期': 5, '练气中期': 8, '练气后期': 12, '练气圆满': 15, '练气极境': 18,
  '筑基初期': 20, '筑基中期': 25, '筑基后期': 30, '筑基圆满': 35, '筑基极境': 40,
  '金丹初期': 45, '金丹中期': 52, '金丹后期': 60, '金丹圆满': 68, '金丹极境': 75,
  '元婴初期': 80, '元婴中期': 88, '元婴后期': 95, '元婴圆满': 102, '元婴极境': 110,
  '化神初期': 115, '化神中期': 125, '化神后期': 135, '化神圆满': 145, '化神极境': 155,
  '炼虚初期': 160, '炼虚中期': 170, '炼虚后期': 180, '炼虚圆满': 190, '炼虚极境': 200,
  '合体初期': 210, '合体中期': 225, '合体后期': 240, '合体圆满': 255, '合体极境': 270,
  '渡劫初期': 280, '渡劫中期': 310, '渡劫后期': 340, '渡劫圆满': 370, '渡劫极境': 400,
  '练气': 10, '筑基': 25, '金丹': 55, '元婴': 90, '化神': 130,
  '炼虚': 175, '合体': 235, '渡劫': 325
};

/**
 * 宗门等级基础倍数
 */
const SECT_LEVEL_MULTIPLIER: Record<string, number> = {
  '超级': 1.2,
  '超级宗门': 1.2,
  '一流': 1.0,
  '一流宗门': 1.0,
  '二流': 0.8,
  '二流宗门': 0.8,
  '三流': 0.6,
  '三流宗门': 0.6,
  '末流': 0.4,
  '末流宗门': 0.4
};

/**
 * 宗门类型修正系数
 */
const SECT_TYPE_MODIFIER: Record<string, number> = {
  '修仙宗门': 1.0,
  '正道宗门': 1.0,
  '魔道宗门': 1.1,
  '魔道势力': 1.1,
  '修仙世家': 0.9,
  '世家': 0.9,
  '商会': 0.7,
  '商会组织': 0.7,
  '中立宗门': 0.85,
  '散修联盟': 0.75
};

/**
 * 计算宗门综合战力 - 重新设计更合理的评分系统
 */
function calculateSectPower(data: SectCalculationData): number {
  let baseScore = 0;
  const maxRealm = data.最强修为 || data.宗主修为 || '';
  
  if (maxRealm.includes('练气')) baseScore = 5;
  else if (maxRealm.includes('筑基')) baseScore = 15;
  else if (maxRealm.includes('金丹')) baseScore = 25;
  else if (maxRealm.includes('元婴')) baseScore = 35;
  else if (maxRealm.includes('化神')) baseScore = 45;
  else if (maxRealm.includes('炼虚')) baseScore = 55;
  else if (maxRealm.includes('合体')) baseScore = 65;
  else if (maxRealm.includes('渡劫')) baseScore = 75;
  else baseScore = 20;
  
  const elderCount = data.长老数量 || 0;
  const totalMembers = (data.核心弟子数 || 0) + (data.内门弟子数 || 0) + (data.外门弟子数 || 0);
  
  let scaleScore = 0;
  if (elderCount >= 50) scaleScore += 15;
  else if (elderCount >= 30) scaleScore += 12;
  else if (elderCount >= 20) scaleScore += 10;
  else if (elderCount >= 10) scaleScore += 7;
  else if (elderCount >= 5) scaleScore += 4;
  else scaleScore += Math.max(0, elderCount);
  
  if (totalMembers >= 10000) scaleScore += 10;
  else if (totalMembers >= 5000) scaleScore += 8;
  else if (totalMembers >= 2000) scaleScore += 6;
  else if (totalMembers >= 1000) scaleScore += 4;
  else if (totalMembers >= 500) scaleScore += 2;
  else scaleScore += Math.max(0, Math.floor(totalMembers / 250));
  
  let levelBonus = 0;
  switch (data.等级) {
    case '超级':
    case '超级宗门':
      levelBonus = 10;
      break;
    case '一流':
    case '一流宗门':
      levelBonus = 7;
      break;
    case '二流':
    case '二流宗门':
      levelBonus = 4;
      break;
    case '三流':
    case '三流宗门':
      levelBonus = 2;
      break;
    default:
      levelBonus = 0;
  }
  
  let typeBonus = 0;
  switch (data.类型) {
    case '魔道宗门':
    case '魔道势力':
      typeBonus = 3;
      break;
    case '正道宗门':
    case '修仙宗门':
      typeBonus = 1;
      break;
    case '修仙世家':
    case '世家':
      typeBonus = -1;
      break;
    case '商会':
    case '商会组织':
      typeBonus = -3;
      break;
    case '散修联盟':
      typeBonus = -2;
      break;
    default:
      typeBonus = 0;
  }
  
  let finalScore = baseScore + scaleScore + levelBonus + typeBonus;
  
  if (maxRealm.includes('渡劫')) finalScore = Math.max(finalScore, 85);
  else if (maxRealm.includes('合体')) finalScore = Math.max(finalScore, 75);
  else if (maxRealm.includes('炼虚')) finalScore = Math.max(finalScore, 65);
  else if (maxRealm.includes('化神')) finalScore = Math.max(finalScore, 55);
  
  return Math.min(100, Math.max(1, Math.round(finalScore)));
}

/**
 * 计算宗门声望值
 */
function calculateSectReputation(data: SectCalculationData): number {
  let baseReputation = 5;
  
  switch (data.等级) {
    case '超级':
    case '超级宗门':
      baseReputation = 25;
      break;
    case '一流':
    case '一流宗门':
      baseReputation = 20;
      break;
    case '二流':
    case '二流宗门':
      baseReputation = 15;
      break;
    case '三流':
    case '三流宗门':
      baseReputation = 10;
      break;
    default:
      baseReputation = 5;
  }
  
  const typeBonus = SECT_TYPE_MODIFIER[data.类型] || 1.0;
  
  let scaleBonus = 0;
  const elderCount = data.长老数量 || 0;
  if (elderCount >= 10) scaleBonus += 3;
  else if (elderCount >= 5) scaleBonus += 2;
  else if (elderCount >= 3) scaleBonus += 1;
  
  const randomFactor = 0.8 + Math.random() * 0.4;
  const finalReputation = Math.round((baseReputation * typeBonus + scaleBonus) * randomFactor);
  
  return Math.min(30, Math.max(0, finalReputation));
}

/**
 * 计算宗门数据的主函数
 */
export function calculateSectData(data: SectCalculationData): CalculatedSectData {
  return {
    声望值: calculateSectReputation(data),
    综合战力: calculateSectPower(data)
  };
}

/**
 * 批量计算多个宗门数据
 */
export function batchCalculateSectData(sectList: SectCalculationData[]): (SectCalculationData & CalculatedSectData)[] {
  return sectList.map(sect => ({
    ...sect,
    ...calculateSectData(sect)
  }));
}