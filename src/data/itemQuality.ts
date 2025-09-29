/**
 * 物品品质系统定义
 * 品质等级：神、仙、天、地、玄、黄、凡
 * 品级：0 残缺；1-3 下品；4-6 中品；7-9 上品；10 极品
 */

export interface QualityInfo {
  color: string;
  rarity: string; // 文案描述
}

export interface GradeInfo {
  name: string; // 残缺/下品/中品/上品/极品
  description: string;
  effect: string; // 可用于UI特效描述
}

export interface ItemQualitySystem {
  // 品质等级（神、仙、天、地、玄、黄、凡）
  qualities: {
    神: QualityInfo;
    仙: QualityInfo;
    天: QualityInfo;
    地: QualityInfo;
    玄: QualityInfo;
    黄: QualityInfo;
    凡: QualityInfo;
  };

  // 品级（0 残缺；1-3 下品；4-6 中品；7-9 上品；10 极品）
  grades: {
    0: GradeInfo;
    1: GradeInfo;
    2: GradeInfo;
    3: GradeInfo;
    4: GradeInfo;
    5: GradeInfo;
    6: GradeInfo;
    7: GradeInfo;
    8: GradeInfo;
    9: GradeInfo;
    10: GradeInfo;
  };
}

export const ITEM_QUALITY_SYSTEM: ItemQualitySystem = {
  qualities: {
    神: { color: '#9932CC', rarity: '亘古未有，蕴含大道法则，三界之内绝无仅有之神物。' },
    仙: { color: '#FFD700', rarity: '源自顶级仙家圣地，汇聚天地灵气，是修士梦寐以求的瑰宝。' },
    天: { color: '#FF69B4', rarity: '由超级宗门或顶尖势力倾力打造，威能赫赫，足以镇压一方气运。' },
    地: { color: '#00CED1', rarity: '产自大型地级宗门，材质与工艺俱佳，是修真界的中坚力量。' },
    玄: { color: '#9370DB', rarity: '出自玄门修士之手，蕴含奇特功效，是行走江湖的必备秘宝。' },
    黄: { color: '#DAA520', rarity: '修真界广泛流通的珍品，虽不顶尖，但已具备不凡效力。' },
    凡: { color: '#808080', rarity: '世俗凡人所用之物，未入修行门槛，仅具基本功能。' },
  },

  grades: {
    0: { name: '残缺', description: '破损不堪', effect: '破损效果' },
    1: { name: '下品', description: '品质一般', effect: '淡色光效' },
    2: { name: '下品', description: '品质一般', effect: '淡色光效' },
    3: { name: '下品', description: '品质一般', effect: '淡色光效' },
    4: { name: '中品', description: '品质中等', effect: '中等光效' },
    5: { name: '中品', description: '品质中等', effect: '中等光效' },
    6: { name: '中品', description: '品质中等', effect: '中等光效' },
    7: { name: '上品', description: '品质上乘', effect: '强烈光效' },
    8: { name: '上品', description: '品质上乘', effect: '强烈光效' },
    9: { name: '上品', description: '品质上乘', effect: '强烈光效' },
    10: { name: '极品', description: '完美无瑕', effect: '炫目特效' },
  },
};

export type QualityType = keyof typeof ITEM_QUALITY_SYSTEM.qualities;
export type GradeType = keyof typeof ITEM_QUALITY_SYSTEM.grades;

export function getQualityInfo(quality: QualityType): QualityInfo {
  return ITEM_QUALITY_SYSTEM.qualities[quality];
}

export function getGradeInfo(grade: GradeType): GradeInfo {
  return ITEM_QUALITY_SYSTEM.grades[grade];
}

export function getFullQualityDescription(quality: QualityType, grade: GradeType): string {
  const qualityInfo = getQualityInfo(quality);
  const gradeInfo = getGradeInfo(grade);
  return `${quality}·${gradeInfo.name} - ${qualityInfo.rarity}`;
}

export function getItemColor(quality: QualityType, grade: GradeType): string {
  if (grade === 0) return '#666666';
  return getQualityInfo(quality).color;
}

export function getGradeRange(grade: number): string {
  if (grade === 0) return '残缺';
  if (grade >= 1 && grade <= 3) return '下品';
  if (grade >= 4 && grade <= 6) return '中品';
  if (grade >= 7 && grade <= 9) return '上品';
  if (grade === 10) return '极品';
  return '未知';
}

export function generateQualitySystemPrompt(): string {
  return `
## 物品品质系统 (重要参考)
此世界的物品分为两个维度：品质等级 与 品级

### 品质等级 (从低到高):
- 凡品: ${ITEM_QUALITY_SYSTEM.qualities.凡.rarity}
- 黄品: ${ITEM_QUALITY_SYSTEM.qualities.黄.rarity}
- 玄品: ${ITEM_QUALITY_SYSTEM.qualities.玄.rarity}
- 地品: ${ITEM_QUALITY_SYSTEM.qualities.地.rarity}
- 天品: ${ITEM_QUALITY_SYSTEM.qualities.天.rarity}
- 仙品: ${ITEM_QUALITY_SYSTEM.qualities.仙.rarity}
- 神品: ${ITEM_QUALITY_SYSTEM.qualities.神.rarity}

### 品级 (物品完美程度):
- 残缺 (0): 破损不堪，效果大减
- 下品 (1-3): 品质一般，淡色光效
- 中品 (4-6): 品质中等，中等光效
- 上品 (7-9): 品质上乘，强烈光效
- 极品 (10): 完美无瑕，炫目特效

### 物品命名规则 (建议):
两种推荐的命名格式：

格式1 - 简洁版（推荐）: [物品名]
示例：
- "引气丹" (凡品下品的引气丹)
- "聚灵丹" (凡品中品的聚灵丹)
- "铁剑" (凡品下品的铁剑)
- "玄铁剑" (玄品中品的玄铁剑)

格式2 - 完整版（特殊情况）: [品质][品级][物品名]
示例：
- "凡品下品引气丹"
- "玄品中品聚灵丹"
- "天品上品破虚剑"
- "仙品极品九转金丹"

命名建议：
- 日常物品使用简洁版命名
- 高品质或特殊物品可使用完整版
- 避免使用 "凡下" 这种连写格式
- 如需标注品级，使用 "凡品下品" 的分离格式

重要提示：初始角色通常只有凡品或黄品的下品物品，高品质物品极其稀少。
`;
}

