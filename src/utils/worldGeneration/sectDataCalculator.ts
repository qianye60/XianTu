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
  // 基础境界
  '练气初期': 5, '练气中期': 8, '练气后期': 12, '练气圆满': 15, '练气极境': 18,
  '筑基初期': 20, '筑基中期': 25, '筑基后期': 30, '筑基圆满': 35, '筑基极境': 40,
  '金丹初期': 45, '金丹中期': 52, '金丹后期': 60, '金丹圆满': 68, '金丹极境': 75,
  '元婴初期': 80, '元婴中期': 88, '元婴后期': 95, '元婴圆满': 102, '元婴极境': 110,
  '化神初期': 115, '化神中期': 125, '化神后期': 135, '化神圆满': 145, '化神极境': 155,
  '炼虚初期': 160, '炼虚中期': 170, '炼虚后期': 180, '炼虚圆满': 190, '炼虚极境': 200,
  '合体初期': 210, '合体中期': 225, '合体后期': 240, '合体圆满': 255, '合体极境': 270,
  '大乘初期': 280, '大乘中期': 300, '大乘后期': 320, '大乘圆满': 340, '大乘极境': 360,
  '渡劫初期': 380, '渡劫中期': 410, '渡劫后期': 440, '渡劫圆满': 470, '渡劫极境': 500,
  '真仙初期': 550, '真仙中期': 600, '真仙后期': 650, '真仙圆满': 700, '真仙极境': 750,
  
  // 简化境界（兼容性）
  '练气': 10, '筑基': 25, '金丹': 55, '元婴': 90, '化神': 130,
  '炼虚': 175, '合体': 235, '大乘': 310, '渡劫': 425, '真仙': 625
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
  '魔道宗门': 1.1,  // 魔道势力通常更强
  '魔道势力': 1.1,
  '修仙世家': 0.9,   // 世家偏保守
  '世家': 0.9,
  '商会': 0.7,       // 商会重商轻武
  '商会组织': 0.7,
  '中立宗门': 0.85,  // 中立势力相对较弱
  '散修联盟': 0.75   // 散修联盟松散
};

/**
 * 计算宗门综合战力
 */
function calculateSectPower(data: SectCalculationData): number {
  // 基础战力：主要看最强修为
  let basePower = 50; // 默认基础值
  
  if (data.最强修为) {
    basePower = REALM_POWER_MAP[data.最强修为] || 
                REALM_POWER_MAP[data.最强修为.replace(/[初中后圆极][期满境]/g, '')] || 
                50;
  } else if (data.宗主修为) {
    basePower = REALM_POWER_MAP[data.宗主修为] || 
                REALM_POWER_MAP[data.宗主修为.replace(/[初中后圆极][期满境]/g, '')] || 
                50;
  }
  
  // 规模修正：基于成员数量
  let scaleFactor = 1.0;
  const totalMembers = (data.核心弟子数 || 0) + (data.内门弟子数 || 0) + (data.外门弟子数 || 0);
  const elderCount = data.长老数量 || 0;
  
  if (totalMembers > 0) {
    // 成员数量对战力的影响（对数关系，避免线性爆炸）
    scaleFactor += Math.log10(Math.max(1, totalMembers)) * 0.1;
  }
  
  if (elderCount > 0) {
    // 长老数量的影响
    scaleFactor += Math.log10(Math.max(1, elderCount)) * 0.15;
  }
  
  // 宗门等级修正
  const levelMultiplier = SECT_LEVEL_MULTIPLIER[data.等级] || 0.8;
  
  // 宗门类型修正
  const typeModifier = SECT_TYPE_MODIFIER[data.类型] || 1.0;
  
  // 计算最终战力
  let finalPower = basePower * scaleFactor * levelMultiplier * typeModifier;
  
  // 转换为1-100的评分系统
  const powerScore = Math.min(100, Math.max(1, Math.round(finalPower / 8))); // 除8将500+的数值压缩到100以内
  
  return powerScore;
}

/**
 * 计算宗门声望值
 */
function calculateSectReputation(data: SectCalculationData): number {
  // 基础声望：根据宗门等级
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
  
  // 类型修正
  const typeBonus = SECT_TYPE_MODIFIER[data.类型] || 1.0;
  
  // 规模修正（小幅影响）
  let scaleBonus = 0;
  const elderCount = data.长老数量 || 0;
  if (elderCount >= 10) scaleBonus += 3;
  else if (elderCount >= 5) scaleBonus += 2;
  else if (elderCount >= 3) scaleBonus += 1;
  
  // 随机波动（±20%）
  const randomFactor = 0.8 + Math.random() * 0.4;
  
  const finalReputation = Math.round((baseReputation * typeBonus + scaleBonus) * randomFactor);
  
  // 限制在合理范围内
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