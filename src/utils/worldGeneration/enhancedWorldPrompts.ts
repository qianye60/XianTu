import { WorldMapConfig } from '@/types/worldMap';

/**
 * 增强的世界生成提示词系统
 * 解决势力重复、命名固化、规模不合理等问题
 * 支持不同修仙世界背景适配
 * 使用游戏坐标系统 (0-10000)
 */

export interface WorldPromptConfig {
  factionCount: number;
  totalLocations: number;
  secretRealms: number;
  continentCount: number;
  characterBackground?: string;
  worldBackground?: string;
  worldEra?: string;
  worldName?: string;
  mapConfig?: WorldMapConfig;
}

export class EnhancedWorldPromptBuilder {
  static buildPrompt(config: WorldPromptConfig): string {
    const finalFactionCount = config.factionCount;
    const finalLocationCount = config.totalLocations;
    const finalContinentCount = config.continentCount;
    const finalSecretRealmCount = Math.min(config.secretRealms, finalLocationCount);

    // 动态计算地点分布
    const headquarters = finalFactionCount;
    const remainingLocations = finalLocationCount - headquarters;
    const cities = Math.max(1, Math.floor(remainingLocations * 0.2));
    const specialSites = Math.max(1, Math.floor(remainingLocations * 0.2));
    const dangerZones = Math.max(1, Math.floor(remainingLocations * 0.1));
    const otherSites = Math.max(0, remainingLocations - cities - specialSites - dangerZones);

    // 动态计算特殊属性分布
    const opportunityRealms = Math.floor(finalSecretRealmCount * (0.3 + Math.random() * 0.3));
    const heritageRealms = Math.floor(finalSecretRealmCount * (0.2 + Math.random() * 0.3));
    const dangerousRealms = Math.max(0, finalSecretRealmCount - opportunityRealms - heritageRealms);

    const backgroundInfo = config.characterBackground ? `\n角色出身: ${config.characterBackground}` : '';
    const worldBackgroundInfo = config.worldBackground ? `\n世界背景: ${config.worldBackground}` : '';
    const worldEraInfo = config.worldEra ? `\n世界时代: ${config.worldEra}` : '';
    const worldNameInfo = config.worldName ? `\n世界名称: ${config.worldName}` : '';

    // 游戏坐标系统配置 (0-10000)
    const minX = 0;
    const maxX = 10000;
    const minY = 0;
    const maxY = 10000;

    const uniqueSeed = Date.now() + Math.floor(Math.random() * 1000000);
    const sessionId = Math.random().toString(36).substring(7);

    // 大洲形状指导（简化版）
    const continentShapes = [
      '矩形（四个角点）',
      '梯形（上窄下宽或上宽下窄）',
      '五边形（矩形切角）',
      '矩形变体（某边中间有凸起）',
      '不规则四边形（略微倾斜的矩形）'
    ];
    const selectedShapes = continentShapes.sort(() => Math.random() - 0.5).slice(0, Math.min(finalContinentCount, 5));

    // 世界风格适配
    const bgRaw = `${(config.worldName || '')} ${(config.worldBackground || '')}`;
    const has = (re: RegExp) => re.test(bgRaw);
    const isHongHuang = has(/洪荒|上古|巫妖|盘古|女娲|三皇五帝/);
    const isEarth = has(/地球|现实|现代|都市|蓝星|人间/);
    const isSciFi = has(/星际|太空|科幻|联邦|宇宙/);
    const isWuxiaXianxia = has(/仙侠|玄幻|修仙|道门|宗门/);

    let styleGuide = `\n## 世界风格适配指引\n`;
    if (isHongHuang) {
      styleGuide += `- 命名: 洪荒神话风格（不周山、瑶池圣地、巫族、妖庭）\n- 灵气: 极高（先天灵气充沛）\n- 境界: 可达仙人、圣人\n- 地理: 九州四海式宏观板块，巨型自然断裂\n- 势力: 天庭/地府/部族/圣地/妖族祖庭\n- 地点: 神山、仙岛、天河、祖脉、上古战场\n`;
    } else if (isEarth) {
      styleGuide += `- 命名: 现代现实风格（龙虎山、武当派、国际异能者协会），严禁"XX宗"、"XX阁"\n- 灵气: 极低（末法时代）\n- 境界: 严格限制筑基期及以下，禁止金丹期以上\n- 地理: 抽象化现实大洲，结界/秘境连接\n- 势力: 隐世门派、古老世家、修行者协会\n- 地点: 隐秘道场、古迹遗址、地下遗迹\n- 隐蔽性: 所有超凡力量高度隐蔽\n`;
    } else if (isSciFi) {
      styleGuide += `- 命名: 科幻风格（星际联邦、银河帝国、火种公司）\n- 灵气: 可变（高灵能星球/科技星球）\n- 境界: 基因锁、灵能等级体系\n- 地理: 多星系板块，扇区/环带/引力井\n- 势力: 联邦/星盟/舰队修会\n- 地点: 母港、环轨道城、星门、遗迹舰坟\n`;
    } else if (isWuxiaXianxia) {
      styleGuide += `- 命名: 传统仙侠（青云门、天机阁、蜀山剑派）\n- 灵气: 中到高\n- 境界: 可达渡劫期、大乘期\n- 地理: 传统仙侠大陆，灵脉走向决定边界\n- 势力: 宗门/世家/魔道/商会/散修联盟\n- 地点: 山门、坊市、炼丹谷、秘境、洞天福地\n`;
    } else {
      styleGuide += `- 命名: 保持多样性，紧密关联世界背景\n- 灵气: 中等\n- 境界: 默认渡劫期\n- 风格: 根据背景自由发挥\n`;
    }

    // 计算网格分割
    const gridRows = Math.ceil(Math.sqrt(finalContinentCount));
    const gridCols = Math.ceil(finalContinentCount / gridRows);
    const xStep = Math.floor((maxX - minX) / gridCols);
    const yStep = Math.floor((maxY - minY) / gridRows);

    return `# 诸天万界势力地图生成任务

会话ID: ${sessionId} | 随机种子: ${uniqueSeed}

## 🎮 游戏坐标系统说明
**重要**：本项目使用游戏坐标系统，不是经纬度！
- 坐标范围：x: 0-10000, y: 0-10000（像素坐标）
- 原点(0,0)在左上角，x向右增加，y向下增加
- 所有位置、边界、范围都必须使用此坐标系统
- 禁止使用经纬度或任何地理坐标系统

## 🚨 最高优先级要求
必须生成完整JSON：
1. continents数组：${finalContinentCount}个大洲（边界不重叠）
2. factions数组：${finalFactionCount}个势力（不能为空）
3. locations数组：${finalLocationCount}个地点（不能为空）

## 命名规则
${backgroundInfo}${worldBackgroundInfo}${worldEraInfo}${worldNameInfo}
${styleGuide}
**禁用词根**：本心、问心、见性、归一、太玄、太虚、紫薇、天机、青霞、无量、昊天、玄天、太清、太上、无极、九天

**重要**：
- 只生成continents/factions/locations三个字段
- 严禁输出world_name/world_background/generation_info/player_spawn
- 每次生成必须显著不同，避免固化

## 核心原则
### 修仙世界基础
- 核心体系: 修仙、境界、功法、丹药、法宝
- 权力结构: 强者为尊

### 多样性与创新
- 势力多样化: 每次不同类型组合
- 地名创新: 避免模板化
- 规模平衡: 根据背景调整

### 势力分布参考
宗门(40-50%) | 世家(20-30%) | 魔道(10-20%) | 散修联盟(10-15%) | 商会(5-15%) | 妖族(5-10%)

## 大洲生成要求（${finalContinentCount}个）
### 🚨 关键要求：大洲必须完全覆盖地图，边界必须相连！

### 网格分割法（强制执行）
- 网格布局: ${gridRows}行 × ${gridCols}列
- X轴分段: 每段${xStep}像素（游戏坐标）
- Y轴分段: 每段${yStep}像素（游戏坐标）
- 每个大洲占据一个网格单元

### 大洲边界生成规则（重要！）
**必须使用以下方法确保边界相连：**

1. **第一个大洲（左上角）**：
   - 左上角: (0, 0)
   - 右上角: (${xStep}, 0)
   - 右下角: (${xStep}, ${yStep})
   - 左下角: (0, ${yStep})
   - 可在中间添加1-2个点形成自然形状

2. **其他大洲**：
   - 必须与相邻大洲共享边界点
   - 网格边界的四个角点必须精确对齐
   - 可在边界中间添加1-2个点形成自然曲线
   - 总点数：4-6个（推荐4-5个）

### 大洲要求
- 边界: 4-5个坐标点（最多6个），形成简单多边形
- 坐标格式: {"x": 整数, "y": 整数}，范围0-10000
- **覆盖: 必须完全覆盖地图，相邻大洲边界必须精确对接，不留空隙**
- 命名: 独特名称，避免方位词，符合世界背景
- 描述: 详细描述大陆的地理特征、气候、文化特色
- 特色: 独特地理特征（雪域、沙漠、森林、山脉、海洋等）
- 势力: 每个大洲1-3个主要势力

### 推荐形状（简单规则）
- **矩形变体**：在矩形基础上，某条边中间加1个点形成凸起或凹陷
- **梯形**：上下边不等长的四边形
- **五边形**：在矩形基础上切掉一个角
- ❌ 禁止：复杂的多角星形、不规则锯齿状

### 边界铁律
- ✅ 相邻大洲必须共享边界点（精确到像素）
- ✅ 网格角点必须对齐（如 (${xStep}, 0) 必须是两个大洲的共同顶点）
- ✅ 边界点按顺时针或逆时针顺序排列
- ✅ 形状简洁，不要奇形怪状
- ❌ 禁止：边界中间断开、留有空隙
- ❌ 禁止：跨越网格边界
- ❌ 禁止：过于复杂的形状（超过6个点）

## 势力生成要求（${finalFactionCount}个）
### 规模关系（游戏坐标）
- 大洲: 超大地理板块，跨度2000-5000像素（游戏坐标）
- **势力范围: 占大洲3%-8%，跨度150-400像素（游戏坐标）** ⚠️ 不要太大！
- 势力位置: 必须在对应大洲边界内，使用游戏坐标{"x": 数字, "y": 数字}
- 势力范围形状: 简单的4-5边形，不要复杂形状

### 必需字段
1. **基础信息**
   - 名称、类型、等级（超级/一流/二流/三流）
   - 描述、历史背景
   - 特色专长（数组格式）

2. **leadership字段**（前端直接显示）
\`\`\`json
{
  "宗主": "具体姓名（如：欧阳烈风）",
  "宗主修为": "具体境界（如：化神中期）",
  "最强修为": "宗门最高境界（必填）",
  "综合战力": 数字1-100,
  "核心弟子数": 数字,
  "内门弟子数": 数字,
  "外门弟子数": 数字
}
\`\`\`

3. **memberCount字段**（前端显示）
\`\`\`json
{
  "total": 总人数,
  "byRealm": {
    // 🚨 境界不能超过leadership.最强修为
    // 境界等级：练气期 < 筑基期 < 金丹期 < 元婴期 < 化神期 < 炼虚期 < 合体期 < 渡劫期
    "练气期": 数量,
    "筑基期": 数量
  },
  "byPosition": {
    "散修": 0,
    "外门弟子": 数量,
    "内门弟子": 数量,
    "核心弟子": 数量,
    "传承弟子": 数量,
    "执事": 数量,
    "长老": 数量,
    "太上长老": 数量（可选，大势力才有）,
    "副掌门": 1,
    "掌门": 1
  }
}
\`\`\`

### 数据一致性
- total = byPosition所有职位总和
- byRealm总和 = total
- byRealm境界 ≤ 最强修为
- 所有数值必须是数字类型

### 人名要求
- 具体中式姓名（欧阳烈风、司徒云雅、独孤剑心）
- 2-3个汉字，符合传统命名
- 每个人名唯一，不重复

## 地点生成要求（${finalLocationCount}个）
### 分布
- 势力总部: ${headquarters}个
- 城镇坊市: ${cities}个
- 特殊地点: ${specialSites}个
- 危险区域: ${dangerZones}个
- 自然景观: ${otherSites}个

### 7种标准类型
1. natural_landmark - 自然地标（名山大川）
2. sect_power - 势力总部（宗门山门）
3. city_town - 城镇聚居地（坊市、城池）
4. blessed_land - 修炼圣地（洞天福地）
5. treasure_land - 资源宝地（奇珍异地）
6. dangerous_area - 危险区域（凶险之地）
7. special_other - 特殊地点（其他特殊）

### 特殊属性（${finalSecretRealmCount}个）
- 机遇之地: ${opportunityRealms}个
- 传承遗迹: ${heritageRealms}个
- 危险禁地: ${dangerousRealms}个

### 地点坐标要求（重要）
- 坐标格式: "coordinates": {"x": 数字, "y": 数字}
- 坐标范围: x和y必须在0-10000之间（游戏坐标）
- 地点位置必须在对应大洲边界内
- 势力总部地点坐标应该与势力"位置"坐标相同或接近
- 可在势力范围内外
- 中立地点可不属于任何势力
- 禁止使用经纬度或其他坐标系统

## 数据结构检查
### 严禁错误格式
- ✗ 空数组: "势力范围": []
- ✗ 空数组: "大洲边界": []
- ✗ 空数组: "地理特征": []
- ✗ 空数组: "天然屏障": []
- ✗ 无效坐标: "位置": "初始地"
- ✗ 缺失必需字段
- ✗ 势力范围少于4个点
- ✗ 大洲边界少于4个点或超过8个点
- ✗ 大洲边界点顺序错误（必须按顺时针或逆时针排列，相邻点连接）

### 必需字段
**势力**：
- 位置（对象，游戏坐标）: {"x": 数字, "y": 数字}
- 势力范围（≥4点，按顺时针或逆时针顺序，游戏坐标）
- leadership（完整）
- memberCount（完整）

**地点**：
- coordinates（对象，游戏坐标）: {"x": 数字, "y": 数字}
- name（字符串）
- type（7种类型之一）
- description（详细描述）

**大洲**：
- 大洲边界（4-6点，推荐4-5点，**必须按顺时针或逆时针顺序排列形成闭合多边形**，游戏坐标）
- 地理特征（≥3个）
- 天然屏障（≥2个）
- 描述（详细的地理和文化描述）

## JSON输出格式
\`\`\`json
{
  "continents": [
    {
      "id": "continent_1",
      "名称": "大洲名称",
      "描述": "地理特征和文化描述",
      "气候": "气候类型",
      "地理特征": ["特征1", "特征2", "特征3"],
      "天然屏障": ["屏障1", "屏障2"],
      "大洲边界": [
        {"x": 0, "y": 0},
        {"x": ${xStep}, "y": 0},
        {"x": ${xStep}, "y": ${yStep}},
        {"x": 0, "y": ${yStep}}
      ],
      // ⚠️ 游戏坐标系统：x: 0-10000, y: 0-10000（像素坐标，不是经纬度）
      // ⚠️ 大洲边界必须按顺时针或逆时针顺序排列，相邻点连接形成闭合多边形
      // ⚠️ 相邻大洲必须共享边界点，确保无缝对接！
      // ⚠️ 网格角点必须精确对齐（如第一个大洲的右上角 (${xStep}, 0) 必须是第二个大洲的左上角）
      // ⚠️ 推荐4-5个点，最多6个点，保持形状简洁
      // ⚠️ 示例：矩形变体可以在右边中间加一个点 {"x": ${xStep}, "y": ${Math.floor(yStep/2)}} 形成凸起
      "主要势力": ["势力ID列表"]
    }
  ],
  "factions": [
    {
      "id": "faction_1",
      "名称": "势力名称",
      "类型": "修仙宗门/修仙世家/魔道势力等",
      "等级": "超级/一流/二流/三流",
      "描述": "势力背景描述",
      "特色": ["专长1", "专长2"],
      "与玩家关系": "中立",
      "声望值": "程序自动计算",
      "位置": {"x": 2500, "y": 1500},
      // ⚠️ 位置使用游戏坐标 (0-10000)，不是经纬度
      "势力范围": [
        {"x": 2300, "y": 1300},
        {"x": 2700, "y": 1300},
        {"x": 2700, "y": 1700},
        {"x": 2300, "y": 1700}
      ],
      // ⚠️ 势力范围坐标必须在游戏坐标系统内 (0-10000)，不是经纬度
      // ⚠️ 势力范围必须按顺时针或逆时针顺序排列
      // ⚠️ 势力范围必须在对应大洲边界内
      // ⚠️ 势力范围不要太大！跨度建议150-400像素，占大洲3%-8%
      // ⚠️ 形状简单：4-5个点的矩形或五边形即可
      "leadership": {
        "宗主": "欧阳烈风",
        "宗主修为": "化神中期",
        "副宗主": "王明月",
        "最强修为": "化神大圆满",
        "综合战力": 85,
        "核心弟子数": 50,
        "内门弟子数": 300,
        "外门弟子数": 1200
      },
      "memberCount": {
        "total": 1565,
        "byRealm": {
          "练气期": 1200,
          "筑基期": 300,
          "金丹期": 50,
          "元婴期": 10,
          "化神期": 5
        },
        "byPosition": {
          "散修": 0,
          "外门弟子": 1200,
          "内门弟子": 300,
          "核心弟子": 50,
          "传承弟子": 10,
          "执事": 20,
          "长老": 15,
          "太上长老": 1,
          "副掌门": 1,
          "掌门": 1
        }
      },
      "continent_id": "continent_1"
    }
  ],
  "locations": [
    {
      "id": "loc_1",
      "name": "地点名称",
      "type": "sect_power",
      "coordinates": {"x": 2500, "y": 1500},
      // ⚠️ 地点坐标使用游戏坐标系统 (0-10000)，不是经纬度
      // ⚠️ 地点坐标必须在对应大洲边界内
      // ⚠️ 势力总部地点坐标应与势力"位置"坐标相同
      "description": "地点详细描述",
      "danger_level": "安全",
      "suitable_for": ["筑基期以上"],
      "controlled_by": "青云宗",
      "special_features": ["护山大阵", "灵气充沛"],
      "special_attributes": []
    }
  ]
}
\`\`\`

## 最终检查清单
生成前必须确认：
1. ✅ continents数组有${finalContinentCount}个对象，边界不重叠
2. ✅ factions数组有${finalFactionCount}个对象（不是0个）
3. ✅ locations数组有${finalLocationCount}个对象（不是0个）
4. ✅ 每个势力有完整leadership和memberCount
5. ✅ 每个势力范围≥4个坐标点
6. ✅ 每个大洲边界4-8个坐标点
7. ✅ 所有坐标为数字类型，范围在0-10000之间
8. ✅ memberCount数据一致性
9. ✅ byRealm境界≤最强修为
10. ✅ 避免重复名称

🔥 核心目标：创造独一无二的世界，包含完整势力组织架构！

现在请生成完整JSON数据，确保所有数组都不为空！
`;
  }
}
