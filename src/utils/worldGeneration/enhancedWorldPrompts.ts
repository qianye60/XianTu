import { WorldMapConfig } from '@/types/worldMap';

/**
 * 增强的世界生成提示词系统
 * 解决势力重复、命名固化、规模不合理等问题
 * 支持不同修仙世界背景适配
 * 使用游戏坐标系统 (可配置范围)
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

    // 🔥 检测是否为"仅生成大陆"模式
    const continentsOnly = finalFactionCount === 0 && finalLocationCount === 0;

    if (continentsOnly) {
      // 仅生成大陆的简化提示词
      return this.buildContinentsOnlyPrompt(config);
    }

    // 完整世界生成提示词（原有逻辑）
    // 动态计算地点分布 - 不再强制每个势力都有总部
    const cities = Math.max(2, Math.floor(finalLocationCount * 0.25));
    const specialSites = Math.max(2, Math.floor(finalLocationCount * 0.25));
    const dangerZones = Math.max(1, Math.floor(finalLocationCount * 0.15));
    const naturalLandmarks = Math.max(2, Math.floor(finalLocationCount * 0.2));
    const otherSites = Math.max(0, finalLocationCount - cities - specialSites - dangerZones - naturalLandmarks);

    // 动态计算特殊属性分布
    const opportunityRealms = Math.floor(finalSecretRealmCount * (0.3 + Math.random() * 0.3));
    const heritageRealms = Math.floor(finalSecretRealmCount * (0.2 + Math.random() * 0.3));
    const dangerousRealms = Math.max(0, finalSecretRealmCount - opportunityRealms - heritageRealms);

    const backgroundInfo = config.characterBackground ? `\n角色出身: ${config.characterBackground}` : '';
    const worldBackgroundInfo = config.worldBackground ? `\n世界背景: ${config.worldBackground}` : '';
    const worldEraInfo = config.worldEra ? `\n世界时代: ${config.worldEra}` : '';
    const worldNameInfo = config.worldName ? `\n世界名称: ${config.worldName}` : '';

    const mapConfig = config.mapConfig;
    const fallbackWidth = 10000;
    const fallbackHeight = 10000;
    const minX = Number(mapConfig?.minLng ?? 0);
    const minY = Number(mapConfig?.minLat ?? 0);
    const width = Number(mapConfig?.width) || fallbackWidth;
    const height = Number(mapConfig?.height) || fallbackHeight;
    const maxX = Number(mapConfig?.maxLng ?? (minX + width));
    const maxY = Number(mapConfig?.maxLat ?? (minY + height));
    const mapWidth = Math.max(1, Math.floor(maxX - minX));
    const mapHeight = Math.max(1, Math.floor(maxY - minY));
    const scale = Math.max(0.6, Math.min(mapWidth, mapHeight) / 10000);
    const territoryMin = Math.max(120, Math.round(150 * scale));
    const territoryMax = Math.max(240, Math.round(400 * scale));
    const continentMin = Math.max(1000, Math.round(2000 * scale));
    const continentMax = Math.max(2400, Math.round(5000 * scale));

    const uniqueSeed = Date.now() + Math.floor(Math.random() * 1000000);
    const sessionId = Math.random().toString(36).substring(7);


    // 计算网格分割
    const gridRows = Math.ceil(Math.sqrt(finalContinentCount));
    const gridCols = Math.ceil(finalContinentCount / gridRows);
    const xStep = Math.floor(mapWidth / gridCols);
    const yStep = Math.floor(mapHeight / gridRows);
    const sampleX = Math.floor(minX + mapWidth * 0.25);
    const sampleY = Math.floor(minY + mapHeight * 0.15);
    const sampleXMin = Math.floor(minX + mapWidth * 0.23);
    const sampleXMax = Math.floor(minX + mapWidth * 0.27);
    const sampleYMin = Math.floor(minY + mapHeight * 0.13);
    const sampleYMax = Math.floor(minY + mapHeight * 0.17);

    return `# 诸天万界势力地图生成任务

会话ID: ${sessionId} | 随机种子: ${uniqueSeed}

## 🎮 游戏坐标系统说明
**重要**：本项目使用游戏坐标系统，不是经纬度！
- 坐标范围：x: ${minX}-${maxX}, y: ${minY}-${maxY}（像素坐标）
- 原点(${minX},${minY})在左上角，x向右增加，y向下增加
- 所有位置、边界、范围都必须使用此坐标系统
- 禁止使用经纬度或任何地理坐标系统

## 🚨 最高优先级要求
必须生成完整JSON：
1. continents数组：${finalContinentCount}个大洲（边界不重叠）
2. factions数组：${finalFactionCount}个势力（不能为空）
3. locations数组：${finalLocationCount}个地点（不能为空）

## 📐 分布与散点要求（强制）
- 禁止聚集：势力/地点坐标不得都挤在地图中心或同一区域
- 覆盖全部大洲：每个大洲都要有势力和地点，不能只出现在单个大洲
- 边距留白：坐标需距离地图边缘≥2%宽高，避免贴边
- 网格散点：各大洲内部按网格/象限取样坐标，确保南北/东西方向都有点位
- 坐标随机但分散：同一大洲的势力/地点使用不同象限的随机值，避免坐标重叠

## 世界设定
${backgroundInfo}${worldBackgroundInfo}${worldEraInfo}${worldNameInfo}

## 🚨 世界风格适配（重要）
**必须根据上述世界背景，自行判断并选择合适的风格：**
- 命名风格：势力、地点的命名必须符合世界背景设定
- 境界体系：根据世界背景选择合适的境界体系（如武道世界用后天/先天/宗师，修仙世界用炼气/筑基/金丹等）
- 势力类型：根据世界背景选择合适的势力类型（如武侠用门派/帮会，修仙用宗门/世家等）
- 保持一致性：整个世界的风格必须统一，不要混搭

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
   - 左上角: (${minX}, ${minY})
   - 右上角: (${minX + xStep}, ${minY})
   - 右下角: (${minX + xStep}, ${minY + yStep})
   - 左下角: (${minX}, ${minY + yStep})
   - 可在中间添加1-2个点形成自然形状

2. **其他大洲**：
   - 必须与相邻大洲共享边界点
   - 网格边界的四个角点必须精确对齐
   - 可在边界中间添加1-2个点形成自然曲线
   - 总点数：4-6个（推荐4-5个）

### 大洲要求
- 边界: 4-5个坐标点（最多6个），形成简单多边形
- 坐标格式: {"x": 整数, "y": 整数}，范围${minX}-${maxX}
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
- ✅ 网格角点必须对齐（如 (${minX + xStep}, ${minY}) 必须是两个大洲的共同顶点）
- ✅ 边界点按顺时针或逆时针顺序排列
- ✅ 形状简洁，不要奇形怪状
- ❌ 禁止：边界中间断开、留有空隙
- ❌ 禁止：跨越网格边界
- ❌ 禁止：过于复杂的形状（超过6个点）

## 势力生成要求（${finalFactionCount}个）
### 势力等级与规模
- 超级势力：势力范围跨度≈${Math.round(territoryMax * 1.2)} 像素，占大洲核心区
- 一流势力：≈${Math.round((territoryMin + territoryMax) / 2)} 像素
- 二流势力：≈${Math.round(territoryMin * 0.9)} 像素
- 三流势力：≈${Math.round(territoryMin * 0.7)} 像素（面积最小）
- 勿随意使用超大范围，必须与等级匹配

### 规模关系（游戏坐标）
- 大洲: 超大地理板块，跨度${continentMin}-${continentMax}像素（游戏坐标）
- **势力范围: 占大洲3%-8%，跨度${territoryMin}-${territoryMax}像素（游戏坐标）** ⚠️ 不要太大！
- 势力位置: 必须在对应大洲边界内，使用游戏坐标{"x": 数字, "y": 数字}
- 势力范围形状: 简单的4-5边形，不要复杂形状

### 必需字段
1. **基础信息**
   - 名称、类型、等级（超级/一流/二流/三流）
   - 描述、历史背景
   - 特色专长（数组格式）

2. **领导层字段**（前端直接显示）
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

3. **成员数量字段**（前端显示）
\`\`\`json
{
  "总数": 总人数,
  "按境界": {
    // 🚨 境界不能超过领导层.最强修为
    // 境界等级：练气期 < 筑基期 < 金丹期 < 元婴期 < 化神期 < 炼虚期 < 合体期 < 渡劫期
    "练气期": 数量,
    "筑基期": 数量
  },
  "按职位": {
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
- 总数 = 按职位所有职位总和
- 按境界总和 = 总数
- 按境界境界 ≤ 最强修为
- 所有数值必须是数字类型

### 人名要求
- 具体中式姓名（欧阳烈风、司徒云雅、独孤剑心）
- 2-3个汉字，符合传统命名
- 每个人名唯一，不重复

## 地点生成要求（${finalLocationCount}个）
### 分布
- 名山大川: ${naturalLandmarks}个
- 城镇坊市: ${cities}个
- 特殊地点: ${specialSites}个
- 危险区域: ${dangerZones}个
- 其他地点: ${otherSites}个
- 均匀散点：各大洲都要有地点，禁止所有地点集中在地图中心或单一大洲
- 坐标象限：同一大洲的地点请分布在不同象限，保持东西/南北方向的平衡

### 6种标准类型（全部使用中文）
1. 名山大川 - 自然地标（山川湖泊）
2. 城镇坊市 - 城镇聚居地（坊市、城池）
3. 洞天福地 - 修炼圣地（灵气充沛之地）
4. 奇珍异地 - 资源宝地（矿脉、药园）
5. 凶险之地 - 危险区域（妖兽巢穴、禁地）
6. 其他特殊 - 特殊地点（遗迹、秘境入口）

### 特殊属性（${finalSecretRealmCount}个）
- 机遇之地: ${opportunityRealms}个
- 传承遗迹: ${heritageRealms}个
- 危险禁地: ${dangerousRealms}个

### 地点坐标要求（重要）
- 坐标格式: "坐标": {"x": 数字, "y": 数字}
- 坐标范围: x和y必须在${minX}-${maxX}之间（游戏坐标）
- 地点位置必须在对应大洲边界内
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
- 领导层（完整）
- 成员数量（完整）

**地点**：
- 坐标（对象，游戏坐标）: {"x": 数字, "y": 数字}
- 名称（字符串）
- 类型（7种类型之一）
- 描述（详细描述）

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
        {"x": ${minX}, "y": ${minY}},
        {"x": ${minX + xStep}, "y": ${minY}},
        {"x": ${minX + xStep}, "y": ${minY + yStep}},
        {"x": ${minX}, "y": ${minY + yStep}}
      ],
      // ⚠️ 游戏坐标系统：x: ${minX}-${maxX}, y: ${minY}-${maxY}（像素坐标，不是经纬度）
      // ⚠️ 大洲边界必须按顺时针或逆时针顺序排列，相邻点连接形成闭合多边形
      // ⚠️ 相邻大洲必须共享边界点，确保无缝对接！
      // ⚠️ 网格角点必须精确对齐（如第一个大洲的右上角 (${minX + xStep}, ${minY}) 必须是第二个大洲的左上角）
      // ⚠️ 推荐4-5个点，最多6个点，保持形状简洁
      // ⚠️ 示例：矩形变体可以在右边中间加一个点 {"x": ${minX + xStep}, "y": ${minY + Math.floor(yStep/2)}} 形成凸起
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
      "位置": {"x": ${sampleX}, "y": ${sampleY}},
      // ⚠️ 位置使用游戏坐标 (${minX}-${maxX})，不是经纬度
      "势力范围": [
        {"x": ${sampleXMin}, "y": ${sampleYMin}},
        {"x": ${sampleXMax}, "y": ${sampleYMin}},
        {"x": ${sampleXMax}, "y": ${sampleYMax}},
        {"x": ${sampleXMin}, "y": ${sampleYMax}}
      ],
      // ⚠️ 势力范围坐标必须在游戏坐标系统内 (${minX}-${maxX})，不是经纬度
      // ⚠️ 势力范围必须按顺时针或逆时针顺序排列
      // ⚠️ 势力范围必须在对应大洲边界内
      // ⚠️ 势力范围不要太大！跨度建议${territoryMin}-${territoryMax}像素，占大洲3%-8%
      // ⚠️ 形状简单：4-5个点的矩形或五边形即可
      "领导层": {
        "宗主": "欧阳烈风",
        "宗主修为": "化神中期",
        "副宗主": "王明月",
        "最强修为": "化神大圆满",
        "综合战力": 85,
        "核心弟子数": 50,
        "内门弟子数": 300,
        "外门弟子数": 1200
      },
      "成员数量": {
        "总数": 1565,
        "按境界": {
          "练气期": 1200,
          "筑基期": 300,
          "金丹期": 50,
          "元婴期": 10,
          "化神期": 5
        },
        "按职位": {
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
      "所属大洲": "continent_1"
    }
  ],
  "locations": [
    {
      "id": "loc_1",
      "名称": "地点名称",
      "类型": "城镇坊市",
      "坐标": {"x": 2500, "y": 1500},
      // ⚠️ 地点坐标使用游戏坐标系统 (${minX}-${maxX})，不是经纬度
      // ⚠️ 地点坐标必须在对应大洲边界内
      // ⚠️ 类型必须是中文：名山大川/城镇坊市/洞天福地/奇珍异地/凶险之地/其他特殊
      "描述": "地点详细描述",
      "安全等级": "安全",
      "适合境界": ["筑基期以上"],
      "所属势力": "青云宗",
      "特殊特征": ["护山大阵", "灵气充沛"],
      "特殊属性": []
    }
  ]
}
\`\`\`

## 最终检查清单
生成前必须确认：
1. ✅ continents数组有${finalContinentCount}个对象，边界不重叠
2. ✅ factions数组有${finalFactionCount}个对象（不是0个）
3. ✅ locations数组有${finalLocationCount}个对象（不是0个）
4. ✅ 每个势力有完整领导层和成员数量
5. ✅ 每个势力范围≥4个坐标点
6. ✅ 每个大洲边界4-8个坐标点
7. ✅ 所有坐标为数字类型，范围在${minX}-${maxX}之间
8. ✅ 成员数量数据一致性
9. ✅ 按境界境界≤最强修为
10. ✅ 避免重复名称

🔥 核心目标：创造独一无二的世界，包含完整势力组织架构！

现在请生成完整JSON数据，确保所有数组都不为空！
`;
  }

  /**
   * 仅生成大陆的简化提示词
   * 用于开局优化模式，不生成势力和地点
   */
  static buildContinentsOnlyPrompt(config: WorldPromptConfig): string {
    const finalContinentCount = config.continentCount;

    const backgroundInfo = config.characterBackground ? `\n角色出身: ${config.characterBackground}` : '';
    const worldBackgroundInfo = config.worldBackground ? `\n世界背景: ${config.worldBackground}` : '';
    const worldEraInfo = config.worldEra ? `\n世界时代: ${config.worldEra}` : '';
    const worldNameInfo = config.worldName ? `\n世界名称: ${config.worldName}` : '';

    const mapConfig = config.mapConfig;
    const fallbackWidth = 10000;
    const fallbackHeight = 10000;
    const minX = Number(mapConfig?.minLng ?? 0);
    const minY = Number(mapConfig?.minLat ?? 0);
    const width = Number(mapConfig?.width) || fallbackWidth;
    const height = Number(mapConfig?.height) || fallbackHeight;
    const maxX = Number(mapConfig?.maxLng ?? (minX + width));
    const maxY = Number(mapConfig?.maxLat ?? (minY + height));
    const mapWidth = Math.max(1, Math.floor(maxX - minX));
    const mapHeight = Math.max(1, Math.floor(maxY - minY));

    const uniqueSeed = Date.now() + Math.floor(Math.random() * 1000000);
    const sessionId = Math.random().toString(36).substring(7);

    // 计算网格分割
    const gridRows = Math.ceil(Math.sqrt(finalContinentCount));
    const gridCols = Math.ceil(finalContinentCount / gridRows);
    const xStep = Math.floor(mapWidth / gridCols);
    const yStep = Math.floor(mapHeight / gridRows);

    return `# 世界大陆框架生成任务（简化模式）

会话ID: ${sessionId} | 随机种子: ${uniqueSeed}

## 🎮 游戏坐标系统说明
**重要**：本项目使用游戏坐标系统，不是经纬度！
- 坐标范围：x: ${minX}-${maxX}, y: ${minY}-${maxY}（像素坐标）
- 原点(${minX},${minY})在左上角，x向右增加，y向下增加
- 所有边界都必须使用此坐标系统
- 禁止使用经纬度或任何地理坐标系统

## 🚨 最高优先级要求
**仅生成大陆框架，不生成势力和地点！**

必须生成的JSON结构：
1. continents数组：${finalContinentCount}个大洲
2. factions数组：空数组 []
3. locations数组：空数组 []

## 世界设定
${backgroundInfo}${worldBackgroundInfo}${worldEraInfo}${worldNameInfo}

## 🚨 世界风格适配（重要）
**必须根据上述世界背景，自行判断并选择合适的风格：**
- 命名风格：大陆命名必须符合世界背景设定
- 保持一致性：整个世界的风格必须统一

**禁用词根**：本心、问心、见性、归一、太玄、太虚、紫薇、天机、青霞、无量、昊天、玄天、太清、太上、无极、九天

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
   - 左上角: (${minX}, ${minY})
   - 右上角: (${minX + xStep}, ${minY})
   - 右下角: (${minX + xStep}, ${minY + yStep})
   - 左下角: (${minX}, ${minY + yStep})
   - 可在中间添加1-2个点形成自然形状

2. **其他大洲**：
   - 必须与相邻大洲共享边界点
   - 网格边界的四个角点必须精确对齐
   - 总点数：4-6个（推荐4-5个）

### 大洲要求
- 边界: 4-5个坐标点（最多6个），形成简单多边形
- 坐标格式: {"x": 整数, "y": 整数}，范围${minX}-${maxX}
- **覆盖: 必须完全覆盖地图，相邻大洲边界必须精确对接，不留空隙**
- 命名: 独特名称，避免方位词，符合世界背景
- 描述: 详细描述大陆的地理特征、气候、文化特色
- 特色: 独特地理特征（雪域、沙漠、森林、山脉、海洋等）
- 主要势力: 空数组 []（势力将在游戏中动态生成）

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
        {"x": ${minX}, "y": ${minY}},
        {"x": ${minX + xStep}, "y": ${minY}},
        {"x": ${minX + xStep}, "y": ${minY + yStep}},
        {"x": ${minX}, "y": ${minY + yStep}}
      ],
      "主要势力": []
    }
  ],
  "factions": [],
  "locations": []
}
\`\`\`

## 最终检查清单
生成前必须确认：
1. ✅ continents数组有${finalContinentCount}个对象，边界不重叠且完全覆盖地图
2. ✅ factions数组为空 []
3. ✅ locations数组为空 []
4. ✅ 每个大洲边界4-6个坐标点
5. ✅ 所有坐标为数字类型，范围在${minX}-${maxX}之间
6. ✅ 相邻大洲边界精确对接

🔥 核心目标：快速生成大陆框架，势力和地点将在游戏中动态探索生成！

现在请生成JSON数据，只包含大陆信息！
`;
  }
}


