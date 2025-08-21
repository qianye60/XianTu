/**
 * @fileoverview 物品品质系统定义
 * 包含物品的品质等级（神、仙、天、地、玄、黄、凡）和品级（残缺、下品、中品、上品、极品）
 */

export interface QualityInfo {
  color: string;
  rarity: string;
}

export interface GradeInfo {
  name: string;
  description: string;
  effect: string;
}

export interface ItemQualitySystem {
  // 品质等级（神、仙、天、地、玄、黄、凡）
  qualities: {
    神阶: QualityInfo;
    仙阶: QualityInfo;
    天阶: QualityInfo;
    地阶: QualityInfo;
    玄阶: QualityInfo;
    黄阶: QualityInfo;
    凡阶: QualityInfo;
  };
  
  // 品级（0残缺，1-3下品，4-6中品，7-9上品，10极品）
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
    神阶: { color: "#9932CC", rarity: "亘古未有，蕴含大道法则，三界之内绝无仅有之神物。" },
    仙阶: { color: "#FFD700", rarity: "源自顶级仙家圣地，汇聚天地灵气，是修士梦寐以求的瑰宝。" },
    天阶: { color: "#FF69B4", rarity: "由超级宗门或顶尖势力倾力打造，威能赫赫，足以镇压一方气运。" },
    地阶: { color: "#00CED1", rarity: "产自大型地级宗门，材质与工艺俱佳，是修真界的中坚力量。" },
    玄阶: { color: "#9370DB", rarity: "出自玄门修士之手，蕴含奇特功效，是行走江湖的必备秘宝。" },
    黄阶: { color: "#FFD700", rarity: "修真界广泛流通的珍品，虽不顶尖，但已具备不凡效力。" },
    凡阶: { color: "#808080", rarity: "世俗凡人所用之物，未入修行门槛，仅具基本功能。" }
  },
  
  grades: {
    0: { name: "残缺", description: "破损不堪", effect: "破损效果" },
    1: { name: "下品", description: "品质一般", effect: "淡色光效" },
    2: { name: "下品", description: "品质一般", effect: "淡色光效" },
    3: { name: "下品", description: "品质一般", effect: "淡色光效" },
    4: { name: "中品", description: "品质中等", effect: "中等光效" },
    5: { name: "中品", description: "品质中等", effect: "中等光效" },
    6: { name: "中品", description: "品质中等", effect: "中等光效" },
    7: { name: "上品", description: "品质上乘", effect: "强烈光效" },
    8: { name: "上品", description: "品质上乘", effect: "强烈光效" },
    9: { name: "上品", description: "品质上乘", effect: "强烈光效" },
    10: { name: "极品", description: "完美无瑕", effect: "炫目特效" }
  }
};

/**
 * 品质类型联合类型
 */
export type QualityType = keyof typeof ITEM_QUALITY_SYSTEM.qualities;

/**
 * 品级类型联合类型
 */
export type GradeType = keyof typeof ITEM_QUALITY_SYSTEM.grades;

/**
 * 获取物品品质信息
 */
export function getQualityInfo(quality: QualityType): QualityInfo {
  return ITEM_QUALITY_SYSTEM.qualities[quality];
}

/**
 * 获取物品品级信息
 */
export function getGradeInfo(grade: GradeType): GradeInfo {
  return ITEM_QUALITY_SYSTEM.grades[grade];
}

/**
 * 获取完整的物品品质描述
 */
export function getFullQualityDescription(quality: QualityType, grade: GradeType): string {
  const qualityInfo = getQualityInfo(quality);
  const gradeInfo = getGradeInfo(grade);
  return `${quality}阶${gradeInfo.name} - ${qualityInfo.rarity}`;
}

/**
 * 根据品质和品级获取物品颜色
 */
export function getItemColor(quality: QualityType, grade: GradeType): string {
  const qualityInfo = getQualityInfo(quality);
  const gradeInfo = getGradeInfo(grade);
  
  // 残缺品使用灰色
  if (grade === 0) {
    return "#666666";
  }
  
  return qualityInfo.color;
}

/**
 * 判断品级范围
 */
export function getGradeRange(grade: number): string {
  if (grade === 0) return "残缺";
  if (grade >= 1 && grade <= 3) return "下品";
  if (grade >= 4 && grade <= 6) return "中品";
  if (grade >= 7 && grade <= 9) return "上品";
  if (grade === 10) return "极品";
  return "未知";
}

/**
 * 生成用于AI的品质系统说明文档
 */
export function generateQualitySystemPrompt(): string {
  return `
## **物品品质系统 (重要参考):**
此世界的物品分为两个维度：**品质等级**和**品级**

### **品质等级 (从低到高):**
- **凡阶**: ${ITEM_QUALITY_SYSTEM.qualities.凡阶.rarity}
- **黄阶**: ${ITEM_QUALITY_SYSTEM.qualities.黄阶.rarity}
- **玄阶**: ${ITEM_QUALITY_SYSTEM.qualities.玄阶.rarity}
- **地阶**: ${ITEM_QUALITY_SYSTEM.qualities.地阶.rarity}
- **天阶**: ${ITEM_QUALITY_SYSTEM.qualities.天阶.rarity}
- **仙阶**: ${ITEM_QUALITY_SYSTEM.qualities.仙阶.rarity}
- **神阶**: ${ITEM_QUALITY_SYSTEM.qualities.神阶.rarity}

### **品级 (物品完美程度):**
- **残缺 (0级)**: 破损不堪，效果大减
- **下品 (1-3级)**: 品质一般，淡色光效
- **中品 (4-6级)**: 品质中等，中等光效
- **上品 (7-9级)**: 品质上乘，强烈光效
- **极品 (10级)**: 完美无瑕，炫目特效

### **物品命名规则:**
格式：[品质][品级][物品名]
示例：
- "凡阶下品铁剑" (普通武器)
- "玄阶中品聚灵丹" (不错的丹药)
- "天阶上品破虚剑" (顶级法宝)
- "仙阶极品九转金丹" (传说级丹药)

**重要提示**: 初始角色通常只有凡阶或黄阶的下品物品，高品质物品极其稀少。
`;
}