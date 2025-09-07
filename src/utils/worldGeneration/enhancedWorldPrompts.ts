/**
 * 增强的世界生成提示词系统
 * 解决势力重复、命名固化、规模不合理等问题
 * 支持不同修仙世界背景适配
 */

export interface WorldPromptConfig {
  factionCount: number;
  totalLocations: number;
  secretRealms: number;
  characterBackground?: string;
  worldBackground?: string;
  worldEra?: string;
  worldName?: string;
}

export class EnhancedWorldPromptBuilder {
  static buildPrompt(config: WorldPromptConfig): string {
    
    // 使用用户配置的精确数量，不添加随机变化避免数量失控
    // 严格按照配置值生成，确保AI看到的数字是正确的
    const finalFactionCount = config.factionCount;
    const finalLocationCount = config.totalLocations; 
    const finalSecretRealmCount = Math.min(config.secretRealms, finalLocationCount); // 特殊属性不能超过总地点数
    
    // 删除固定的势力分级限制，让AI自然生成有影响力的大势力
    
    // 动态计算地点分布
    const headquarters = finalFactionCount; // 每个势力一个总部
    const remainingLocations = finalLocationCount - headquarters;
    const cities = Math.floor(remainingLocations * (0.2 + Math.random() * 0.3)); // 20%-50%
    const specialSites = Math.floor(remainingLocations * (0.15 + Math.random() * 0.25)); // 15%-40%
    const dangerZones = Math.floor(remainingLocations * (0.1 + Math.random() * 0.2)); // 10%-30%
    const otherSites = Math.max(0, remainingLocations - cities - specialSites - dangerZones);
    
    // 动态计算特殊属性分布
    const opportunityRealms = Math.floor(finalSecretRealmCount * (0.3 + Math.random() * 0.3)); // 30%-60%
    const heritageRealms = Math.floor(finalSecretRealmCount * (0.2 + Math.random() * 0.3)); // 20%-50%
    const dangerousRealms = Math.max(0, finalSecretRealmCount - opportunityRealms - heritageRealms);
    
    const backgroundInfo = config.characterBackground ? 
      `\n角色出身: ${config.characterBackground}` : '';
    
    // 世界背景信息
    const worldBackgroundInfo = config.worldBackground ? 
      `\n世界背景: ${config.worldBackground}` : '';
    const worldEraInfo = config.worldEra ? 
      `\n世界时代: ${config.worldEra}` : '';
    const worldNameInfo = config.worldName ? 
      `\n世界名称: ${config.worldName}` : '';

    // 生成真正随机的坐标范围 - 每次生成都不同
    const baseMinLng = 100 + Math.random() * 20;  // 100-120 范围随机选择基础经度
    const baseMaxLng = baseMinLng + 5 + Math.random() * 10; // 基础经度 + 5-15 度
    const baseMinLat = 25 + Math.random() * 15;  // 25-40 范围随机选择基础纬度  
    const baseMaxLat = baseMinLat + 3 + Math.random() * 8; // 基础纬度 + 3-11 度
    
    // 四舍五入到一位小数，便于阅读
    const minLng = Math.round(baseMinLng * 10) / 10;
    const maxLng = Math.round(baseMaxLng * 10) / 10;
    const minLat = Math.round(baseMinLat * 10) / 10;
    const maxLat = Math.round(baseMaxLat * 10) / 10;

    // 生成唯一的随机种子确保每次都不同
    const uniqueSeed = Date.now() + Math.floor(Math.random() * 1000000);
    const sessionId = Math.random().toString(36).substring(7);
    
    // 生成大洲形状变化指导
    const continentShapes = [
      '狭长型（如南北向的长条形）',
      '椭圆型（东西向的宽椭圆）',
      '不规则多角形（8-12个随机分布的顶点）',
      '群岛型（多个连接的岛屿）',
      '半月型（弯曲的月牙形状）',
      '三角形（大致呈三角形分布）',
      '葫芦型（两个圆形区域连接）',
      '星形（从中心向外延伸的多个尖角）'
    ];
    
    // 随机选择几种形状用于不同大洲
    const selectedShapes = continentShapes.sort(() => Math.random() - 0.5).slice(0, 4);

    // 调试日志
    console.log('[增强世界生成器] 最终数量 - 势力:', finalFactionCount, '地点:', finalLocationCount, '特殊属性:', finalSecretRealmCount);
    console.log('[增强世界生成器] 随机坐标范围:', `经度${minLng}-${maxLng}, 纬度${minLat}-${maxLat}`);
    console.log('[增强世界生成器] 生成种子:', uniqueSeed, '会话ID:', sessionId);
    console.log('[增强世界生成器] 选择的大洲形状:', selectedShapes);

    return `
# 诸天万界势力地图生成任务

**生成会话ID**: ${sessionId}
**随机种子**: ${uniqueSeed}
**坐标范围**: 经度${minLng}-${maxLng}, 纬度${minLat}-${maxLat}
**关键要求**: 创造独特多样的修仙世界，每次生成必须显著不同，避免重复固化的势力和地名
**边界随机性**: 严格要求每个大洲和势力的边界形状都必须随机生成，绝不能重复之前的多边形形状！
**数量限制**: 严格按照配置生成，势力${finalFactionCount}个、地点${finalLocationCount}个，绝不可超出此数量

## 世界设定信息
${backgroundInfo}${worldBackgroundInfo}${worldEraInfo}${worldNameInfo}

## 🎯 核心生成原则

### 1. 【修仙世界基础】

核心要求：
- **核心体系**: 修仙、境界、功法、丹药、法宝等传统修仙元素
- **权力结构**: 强者为尊的修仙世界等级秩序

### 2. 【多样性第一】- 避免固化模式
- **势力多样化**: 每次生成不同类型的势力组合，避免总是"青云宗、天剑门、万花谷"等重复名称
- **地名创新**: 完全避免使用模板化地名，每个名称都要有特色且独一无二
- **规模平衡**: 修仙世界中宗门为主，但要根据背景调整表现形式

### 3. 【势力规模】- 符合修仙体系设定
根据修仙世界的基本规律和世界背景调整势力分布：

**修仙世界的合理势力分布**:
- 🏔️ **各大宗门** (40-50%): 修仙世界的主体势力
- 🏛️ **修仙世家** (20-30%): 血脉传承，底蕴深厚
- ⚔️ **魔道势力** (10-20%): 与正道对立的黑暗力量
- 🏮 **散修联盟** (10-15%): 自由修士的松散组织
- 💰 **商会组织** (5-15%): 贸易流通，中立势力
- 🌿 **妖族部落** (5-10%): 非人种族，自然势力

**重要**: 根据世界背景调整具体表现形式，但保持修仙体系的核心！

## 🌍 地理层级结构

### 大洲级别区域
为了营造更宏大的世界观，需要创造2-8个大洲级别的地理区域来包裹各个势力：

**大洲创造要求**：
- **数量随机**: 根据势力数量和世界背景，自由决定创造2-8个大洲
- **命名创新**: 创造独特的大洲名称，避免使用"东西南北"等方位词
- **地理特色**: 每个大洲要有独特的地理特征（如：雪域、沙漠、森林、海岛等）
- **势力分布**: 每个大洲包含1-3个主要势力，形成地缘政治格局
- **边界设计**: 大洲边界用大型不规则多边形表示（8-15个坐标点），形状要有显著变化
- **屏障设置**: 大洲之间要有天然屏障（山脉、海峡、瘴气、结界等）

**本次大洲形状指导**（每个大洲选择不同的形状类型）:
${selectedShapes.map((shape, index) => `- 大洲${index + 1}: ${shape}`).join('\n')}

**重要**: 每次生成时，每个大洲的边界形状都必须有显著差异，不能生成相似的多边形！

**大洲示例风格**：
- 传统修仙：如"青霞大陆"、"紫薇星域"、"九天玄境"
- 都市修仙：如"东亚修仙区"、"欧洲灵能带"、"美洲觉醒地带"
- 神话古典：如"太古神域"、"洪荒大地"、"混沌边疆"

## 📊 本次生成参数 (严格按照配置)
- **势力总数**: 必须精确生成${finalFactionCount}个势力，不多不少
- **地点总数**: 必须精确生成${finalLocationCount}个地点，不多不少  
- **特殊属性**: 从${finalLocationCount}个地点中选择${finalSecretRealmCount}个添加特殊属性

**重要**: factions数组必须包含${finalFactionCount}个对象，locations数组必须包含${finalLocationCount}个对象！

### 🏛️ 势力生成要求 (${finalFactionCount}个)

**势力实力原则**:
- 能够载入世界史册的势力本身就应该有相当实力
- 不强制固定分级比例，让势力实力自然分布
- 实力范围建议70-100分，体现这些都是有影响力的大势力
- 可以有1-2个绝顶势力(95-100分)，其余势力实力自然分布

**势力类型和实力要求**:
1. **背景适配**: 所有势力类型必须符合修仙本质
2. **避免重复**: 绝对不能生成相同或相似的势力名称
3. **风格统一**: 采用符合世界背景的命名风格
4. **修仙核心**: 所有势力都要有修仙体系相关的专长和特色
5. **实力体现**: 作为知名势力，实力应该体现其影响力和地位
6. **势力边界**: 每个势力必须有territory_bounds定义其控制范围，生成规整合理的边界形状：
   - 大势力：5-7个坐标点，形成相对规整的多边形（如椭圆形、矩形、六边形等）
   - 中等势力：4-6个坐标点，形成规整的四边形、五边形、六边形
   - 小势力：4-5个坐标点，形成简单的矩形、菱形等规整形状
   - **重要**：避免奇形怪状的边界，优先生成圆形、椭圆形、矩形、六边形等常见规整形状

### 🗺️ 地点生成要求 (${finalLocationCount}个)

**地点分布**:
- 🏯 **势力总部**: ${headquarters}个 (对应各势力)
- 🏘️ **城镇坊市**: ${cities}个
- ⚡ **特殊地点**: ${specialSites}个
- ⚠️ **危险区域**: ${dangerZones}个
- 🌄 **自然景观**: ${otherSites}个

**地点类型** (必须使用以下7种标准类型):
1. **natural_landmark** - 🏔️ 自然地标 (符合背景的自然景观)
2. **sect_power** - 🏯 势力总部 (各修仙势力的总部)
3. **city_town** - 🏘️ 城镇聚居地 (符合背景风格的城镇)  
4. **blessed_land** - ⛩️ 修炼圣地 (适合修仙的灵气充沛之地)
5. **treasure_land** - 💎 资源宝地 (天材地宝、灵石矿脉等)
6. **dangerous_area** - ⚔️ 危险区域 (凶兽巢穴、魔域险地等)
7. **special_other** - 🌟 特殊地点 (传送阵、秘境入口等)

### ✨ 特殊属性增强 (${finalSecretRealmCount}个地点)

从基础地点中选择${finalSecretRealmCount}个添加特殊属性:
- 🎯 **机遇之地**: ${opportunityRealms}个
- 📜 **传承遗迹**: ${heritageRealms}个  
- ☠️ **危险禁地**: ${dangerousRealms}个

## 🎨 创新变化要求

**每次生成必须不同**:
1. **势力组合**: 不同的势力类型搭配
2. **命名风格**: 变化命名的文化背景和风格特色
3. **地理布局**: 不同的势力分布模式
4. **专长重点**: 相同类型势力也要有不同的专长侧重
5. **冲突关系**: 各势力间的恩怨情仇要有变化
6. **⭐ 边界形状**: 每个大洲和势力的边界形状都必须完全不同，使用以下随机化策略：
   - 随机选择顶点数量（8-15个顶点）
   - 随机分布顶点位置（不要规律排列）
   - 根据指定的形状类型生成对应的边界
   - 每个坐标点都要在指定范围内随机选择，不要固定数值
   - 同一世界内的不同大洲边界形状差异要非常明显

**重要**: 使用随机种子 ${uniqueSeed} 来确保所有随机选择都是不同的！

## 📋 JSON输出格式 (严格数量控制)

**数量检查清单**:
- ✅ continents数组包含2-8个大洲对象
- ✅ factions数组包含${finalFactionCount}个势力对象
- ✅ locations数组包含${finalLocationCount}个地点对象
- ✅ 其中${finalSecretRealmCount}个地点有special_attributes
- ✅ 每个势力都分配到某个大洲

**重要提醒**: factions数组必须恰好包含${finalFactionCount}个元素，locations数组必须恰好包含${finalLocationCount}个元素！

\`\`\`json
{
  "world_name": "${config.worldName || '修仙界'}",
  "world_background": "${config.worldBackground || ''}",
  "world_era": "${config.worldEra || ''}",
  "generation_info": {
    "session_id": "${sessionId}",
    "seed": ${uniqueSeed},
    "world_type": "修仙世界",
    "generation_notes": "本次生成的独特特色和创新点"
  },
  "continents": [
    {
      "id": "continent_1",
      "name": "大洲名称",
      "description": "大洲地理特征和文化描述",
      "climate": "气候类型",
      "terrain_features": ["主要地貌特征"],
      "natural_barriers": ["与其他大洲的天然屏障"],
      "continent_bounds": [
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}}
      ],
      "dominant_factions": ["在此大洲的主要势力ID列表"]
    }
  ],
  "factions": [
    {
      "id": "faction_1",
      "name": "势力名称",
      "type": "势力类型",
      "description": "势力背景描述，体现独特文化",
      "territory": "控制的地域范围",
      "strength": 60-100,
      "leader": "领导者称谓",
      "specialties": ["独特专长1", "独特专长2"],
      "culture_notes": "该势力的文化特色",
      "continent_id": "所属大洲的ID",
      "headquarters": {
        "name": "总部名称",
        "coordinates": {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}}
      },
      "territory_bounds": [
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
        {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}}
      ]
    }
  ],
  "locations": [
    {
      "id": "loc_1",
      "name": "地点名称",
      "type": "7种标准类型之一",
      "coordinates": {"longitude": ${minLng}-${maxLng}, "latitude": ${minLat}-${maxLat}},
      "description": "地点详细描述", 
      "danger_level": "安全/普通/危险/极危险",
      "suitable_for": ["适合群体"],
      "controlled_by": "控制势力(可选)",
      "special_features": ["地点特色"],
      "special_attributes": ["特殊属性(可选)"]
    }
  ]
}
\`\`\`

## ⚠️ 最终检查要求
- ✅ 避免重复或相似的势力/地点名称
- ✅ 保持修仙体系核心，强者为尊
- ✅ 势力类型和专长符合修仙背景
- ✅ JSON格式完整，坐标在指定范围内 (经度${minLng}-${maxLng}，纬度${minLat}-${maxLat})

**核心目标**: 创造一个独一无二的修仙世界！
`;
  }
}