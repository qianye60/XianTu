import { WorldMapConfig } from '@/types/worldMap';

/**
 * 增强的世界生成提示词系统
 * 解决势力重复、命名固化、规模不合理等问题
 * 支持不同修仙世界背景适配
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

    // 坐标范围配置
    let minLng, maxLng, minLat, maxLat;
    if (config.mapConfig) {
      minLng = config.mapConfig.minLng;
      maxLng = config.mapConfig.maxLng;
      minLat = config.mapConfig.minLat;
      maxLat = config.mapConfig.maxLat;
    } else {
      const baseMinLng = 100 + Math.random() * 20;
      const baseMaxLng = baseMinLng + 5 + Math.random() * 10;
      const baseMinLat = 25 + Math.random() * 15;
      const baseMaxLat = baseMinLat + 3 + Math.random() * 8;
      minLng = Math.round(baseMinLng * 10) / 10;
      maxLng = Math.round(baseMaxLng * 10) / 10;
      minLat = Math.round(baseMinLat * 10) / 10;
      maxLat = Math.round(baseMaxLat * 10) / 10;
    }

    const uniqueSeed = Date.now() + Math.floor(Math.random() * 1000000);
    const sessionId = Math.random().toString(36).substring(7);

    // 大洲形状指导
    const continentShapes = [
      '狭长型（南北向长条形）', '椭圆型（东西向宽椭圆）', '不规则多角形（8-12个顶点）',
      '群岛型（多个连接岛屿）', '半月型（弯曲月牙）', '三角形', '葫芦型', '星形（多尖角）'
    ];
    const selectedShapes = continentShapes.sort(() => Math.random() - 0.5).slice(0, 4);

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

    const gridRows = Math.ceil(Math.sqrt(finalContinentCount));
    const gridCols = Math.ceil(finalContinentCount / gridRows);
    const lngStep = Math.round(((maxLng - minLng) / gridCols) * 10) / 10;
    const latStep = Math.round(((maxLat - minLat) / gridRows) * 10) / 10;

    return `# 诸天万界势力地图生成任务

会话ID: ${sessionId} | 随机种子: ${uniqueSeed}
坐标范围: 经度${minLng}-${maxLng}, 纬度${minLat}-${maxLat}

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
### 网格分割法（强制执行）
- 网格布局: ${gridRows}行 × ${gridCols}列
- 经度分段: 每段${lngStep}度
- 纬度分段: 每段${latStep}度
- 每个大洲只能在专属网格单元内生成边界

### 大洲要求
- 边界: 4-8个坐标点的简单多边形，严禁重叠
- 覆盖: 必须完全覆盖地图区域，无空隙
- 命名: 独特名称，避免方位词
- 特色: 独特地理特征（雪域、沙漠、森林等）
- 势力: 每个大洲1-3个主要势力

### 形状指导
${selectedShapes.map((shape, index) => `- 大洲${index + 1}: ${shape}`).join('\n')}

### 边界铁律
- 严格限制在专属网格单元内
- 所有坐标点必须在专属经纬度范围内
- 禁止跨越网格边界
- 相邻大洲可共享边界线但绝不重叠

## 势力生成要求（${finalFactionCount}个）
### 规模关系
- 大洲: 超大地理板块，跨度5-10经纬度
- 势力范围: 占大洲8%-25%，跨度0.5-1.5经纬度

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
1. natural_landmark - 自然地标
2. sect_power - 势力总部
3. city_town - 城镇聚居地
4. blessed_land - 修炼圣地
5. treasure_land - 资源宝地
6. dangerous_area - 危险区域
7. special_other - 特殊地点

### 特殊属性（${finalSecretRealmCount}个）
- 机遇之地: ${opportunityRealms}个
- 传承遗迹: ${heritageRealms}个
- 危险禁地: ${dangerousRealms}个

### 地点原则
- 不强制每势力有地点
- 地点位置在对应大洲范围内
- 可在势力范围内外
- 中立地点可不属于任何势力

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

### 必需字段
**势力**：位置（对象）、势力范围（≥4点）、leadership（完整）、memberCount（完整）
**地点**：coordinates（对象）、name、type、description
**大洲**：大洲边界（4-8点）、地理特征（≥3个）、天然屏障（≥2个）

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
        {"x": ${minLng}, "y": ${minLat}},
        {"x": ${minLng + lngStep}, "y": ${minLat}},
        {"x": ${minLng + lngStep}, "y": ${minLat + latStep}},
        {"x": ${minLng}, "y": ${minLat + latStep}}
      ],
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
      "位置": {"x": ${minLng + 2.5}, "y": ${minLat + 1.5}},
      "势力范围": [
        {"x": ${minLng + 2.0}, "y": ${minLat + 1.0}},
        {"x": ${minLng + 3.5}, "y": ${minLat + 1.2}},
        {"x": ${minLng + 3.2}, "y": ${minLat + 2.5}},
        {"x": ${minLng + 1.8}, "y": ${minLat + 2.0}}
      ],
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
      "coordinates": {"x": ${minLng + 2.0}, "y": ${minLat + 1.0}},
      "description": "地点详细描述",
      "danger_level": "安全/普通/危险/极危险",
      "suitable_for": ["适合群体"],
      "controlled_by": "控制势力",
      "special_features": ["地点特色"],
      "special_attributes": ["特殊属性（可选）"]
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
7. ✅ 所有坐标为数字类型
8. ✅ memberCount数据一致性
9. ✅ byRealm境界≤最强修为
10. ✅ 避免重复名称

🔥 核心目标：创造独一无二的世界，包含完整势力组织架构！

现在请生成完整JSON数据，确保所有数组都不为空！
`;
  }
}
