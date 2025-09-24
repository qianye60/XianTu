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
      `\n世界背景(参考): ${config.worldBackground}` : '';
    const worldEraInfo = config.worldEra ?
      `\n世界时代(参考): ${config.worldEra}` : '';
    const worldNameInfo = config.worldName ?
      `\n世界名称(参考): ${config.worldName}` : '';

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

    // 生成真正随机的创意词汇，每次都不同
    const creativeWords = [
      ['破晓', '星河', '玄冥', '洪荒', '无极', '太初', '九幽', '苍穹'],
      ['神剑', '仙门', '道宫', '灵山', '秘境', '圣地', '仙岛', '宝阁'],
      ['真武', '天机', '混元', '太乙', '无量', '玄天', '紫霄', '金光']
    ];

    const randomWord1 = creativeWords[0][Math.floor(Math.random() * creativeWords[0].length)];
    const randomWord2 = creativeWords[1][Math.floor(Math.random() * creativeWords[1].length)];
    const randomWord3 = creativeWords[2][Math.floor(Math.random() * creativeWords[2].length)];

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

    // 基于世界名称/背景，生成风格适配指导
    const bgRaw = `${(config.worldName || '')} ${(config.worldBackground || '')}`;
    const has = (re: RegExp) => re.test(bgRaw);
    const isHongHuang = has(/洪荒|上古|巫妖|盘古|女娲|三皇五帝/);
    const isEarth = has(/地球|现实|现代|都市|蓝星|人间/);
    const isSciFi = has(/星际|太空|科幻|联邦|宇宙/);
    const isWuxiaXianxia = has(/仙侠|玄幻|修仙|道门|宗门/);
    let styleGuide = `\n## 世界风格适配指引（根据背景自动调整）\n`;
    if (isHongHuang) {
      styleGuide += `\n- 地理格局：参考“九州四海/洪荒大陆”式宏观板块，边界呈巨型自然断裂（神山、天海、天堑）。\n- 势力类型：减少现代宗门套路，增加“天庭/地府/部族/圣地/妖族祖庭”等神话势力；仍需保持 leadership/memberCount 等结构字段。\n- 地点类型：神山、仙岛、天河、祖脉、上古战场、封神遗迹、剑阵遗址等。\n- 资源与危险：灵脉密布，远古禁区/凶地危险等级更高。\n`;
    } else if (isEarth) {
      styleGuide += `\n- 地理格局：抽象化现实大洲/国家；用“结界/秘境/地脉节点”连接超自然地点。\n- 势力类型：隐世宗门/古老世家/修行协会/研究院/安保机构，字段结构不变但语境贴近现代。\n- 地点类型：都市秘境、古迹遗址、自然保护区、地下遗迹、海沟秘境、卫星基地等。\n- 隐蔽性：多数超自然地点以结界遮蔽，分层安全与可达性。\n`;
    } else if (isSciFi) {
      styleGuide += `\n- 地理格局：多星系/行星板块，用“扇区/环带/引力井”描述边界；多边形严禁重叠。\n- 势力类型：联邦/星盟/舰队修会/遗迹看护所/环轨道门派，保留组织字段。\n- 地点类型：母港、环轨道城、星门、遗迹舰坟、恒星观测站、暗物质脉点等。\n`;
    } else if (isWuxiaXianxia) {
      styleGuide += `\n- 地理格局：传统仙侠大陆与群山河谷结合，灵脉走向决定势力边界；禁区与圣地相间分布。\n- 势力类型：宗门/世家/魔道/商会/散修联盟/妖族部落等多元并存。\n- 地点类型：宗门山门、坊市、炼丹谷、秘境入口、古战场、洞天福地、试炼地等。\n`;
    } else {
      styleGuide += `\n- 保持多样与独特性，根据背景自由发挥，同时遵守数量与边界不重叠的硬性约束。\n`;
    }

    // 调试日志
    console.log('[增强世界生成器] 最终数量 - 势力:', finalFactionCount, '地点:', finalLocationCount, '特殊属性:', finalSecretRealmCount);
    console.log('[增强世界生成器] 随机坐标范围:', `经度${minLng}-${maxLng}, 纬度${minLat}-${maxLat}`);
    console.log('[增强世界生成器] 生成种子:', uniqueSeed, '会话ID:', sessionId);
    console.log('[增强世界生成器] 选择的大洲形状:', selectedShapes);

    return `# 诸天万界势力地图生成任务

**生成会话ID**: ${sessionId}
**随机种子**: ${uniqueSeed}
**坐标范围**: 经度${minLng}-${maxLng}, 纬度${minLat}-${maxLat}
**关键要求**: 创造独特多样的修仙世界，每次生成必须显著不同，避免重复固化的势力和地名
**边界随机性**: 严格要求每个大洲和势力的边界形状都必须随机生成，绝不能重复之前的多边形形状！
**数量限制**: 严格按照配置生成，势力${finalFactionCount}个、地点${finalLocationCount}个，绝不可超出此数量

## ⚠️ 创意命名核心要求 - 严格执行

**命名创新原则**:
- **本次创意引导**: 使用${randomWord1}、${randomWord2}、${randomWord3}等词汇为创意基础
- **古典修仙美学**: 体现深厚文化底蕴和修仙理念
- **自然地理融合**: 融入山川、星辰、五行等自然元素
- **独特性保证**: 每个名称都必须原创，避免常见套路组合
- **随机种子${uniqueSeed}**: 确保本次生成完全不同于以往

**积极的命名策略** (推荐模式):
- **自然景观** + **修行理念**: 如"望星"+"悟道" = 望星悟道宗
- **五行元素** + **宗门特色**: 如"烈火"+"炼体" = 烈火炼体门
- **地貌特征** + **传承历史**: 如"断崖"+"古传" = 断崖古传派
- **哲学思想** + **组织结构**: 如"无为"+"真门" = 无为真门

**命名风格要求**:
- 宗门名称：3-4字，体现传承与理念
- 世家名称：姓氏+地域/特色，如"东海王家"、"北山李氏"
- 魔道势力：偏向霸气或神秘，如"血月殿"、"九幽门"
- 商会组织：体现商业特色，如"万宝阁"、"通天商行"

## 世界设定信息（仅供参考，不要在JSON输出中重复这些元数据）
${backgroundInfo}${worldBackgroundInfo}${worldEraInfo}${worldNameInfo}
${styleGuide}

重要：
- 只生成地图相关数据（大洲边界、多边形、势力范围、地点坐标与类型）。
- 严禁在JSON中输出 world_name / world_background / world_era / generation_info / player_spawn 等非地图字段。

注意：以下词根及其同义/变体严禁出现在任何势力或地名中：
本心、问心、见性、归一、太玄、太虚、紫薇、天机、青霞、无量、昊天、玄天、太清、太上、无极、九天。

## 🎯 核心生成原则

### 1. 【修仙世界基础】

核心要求：
- **核心体系**: 修仙、境界、功法、丹药、法宝等传统修仙元素
- **权力结构**: 强者为尊的修仙世界等级秩序

### 2. 【多样性第一】- 避免固化模式
- **势力多样化**: 每次生成不同类型的势力组合。
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
为了营造更宏大的世界观，需要创造6-11个大洲级别的地理区域来包裹各个势力：

**大洲创造要求**：
- **数量控制**: 必须创造6-11个大洲，增加板块数量，让世界更丰富复杂
- **命名创新**: 创造独特的大洲名称，避免使用"东西南北"等方位词
- **地理特色**: 每个大洲要有独特的地理特征（如：雪域、沙漠、森林、海岛等）
- **势力分布**: 由于大洲增多，每个大洲包含1-2个主要势力，形成更细致的地缘政治格局
- **边界设计**: 大洲边界用中型多边形表示（8-15个坐标点），让更多大洲能够合理分布
- **紧密分布**: 🔥**关键要求**🔥 大洲之间必须紧密相邻，几乎无缝连接，形成完整连贯的世界地图
- **🚫 重叠禁令**: 绝对禁止大陆边界重叠！每个大洲边界多边形必须完全独立，互不交叉
- **📏 边界间距**: 大洲之间必须保持至少0.3-0.5经纬度的安全距离，避免重叠
- **🗺️ 分布策略**:
  * 在经度${minLng}-${maxLng}，纬度${minLat}-${maxLat}范围内合理分布大洲
  * 建议将地图区域划分为3x3或2x4网格，每个网格区域放置1个大洲
  * 确保每个大洲的中心点之间有足够距离
- **📐 边界生成规则**:
  * 每个大洲的经度跨度不超过(${maxLng - minLng}/3)度
  * 每个大洲的纬度跨度不超过(${maxLat - minLat}/3)度
  * 边界坐标必须在指定的经纬度范围内

**本次大洲形状指导**（每个大洲选择不同的形状类型）:
${selectedShapes.map((shape, index) => `- 大洲${index + 1}: ${shape}`).join('\n')}

**重要**: 每次生成时，每个大洲的边界形状都必须有显著差异，不能生成相似的多边形！

## ⚠️ 数据结构完整性要求 - 必须严格遵守

**势力数据必需字段检查单**:
- ✓ **位置**: 必须是对象格式 {"longitude": 数值, "latitude": 数值}
- ✓ **势力范围**: ⚠️**严禁空数组**⚠️ 必须是坐标点数组，至少4个点形成封闭多边形，每个势力都必须有势力范围！
- ✓ **leadership**: 必须包含宗主姓名和修为等完整信息
- ✓ **memberCount**: 必须包含total、byRealm、byPosition完整统计

**地点数据必需字段检查单**:
- ✓ **coordinates**: 必须是对象格式 {"longitude": 数值, "latitude": 数值}
- ✓ **name**: 必须是具体地点名称，不能为空
- ✓ **type**: 必须是7种标准类型之一
- ✓ **description**: 必须包含地点描述

**严禁输出的错误格式**:
- ✗ 空数组: "势力范围": [] ⚠️**这是绝对禁止的！每个势力必须有具体的势力范围坐标！**
- ✗ 空数组: "大洲边界": [] ⚠️**这是绝对禁止的！每个大洲必须有具体的边界坐标！**
- ✗ 空数组: "地理特征": [] ⚠️**这是绝对禁止的！每个大洲必须有具体的地理特征！**
- ✗ 空数组: "天然屏障": [] ⚠️**这是绝对禁止的！每个大洲必须有具体的天然屏障！**
- ✗ 无效坐标: "位置": "初始地"
- ✗ 缺失字段: 任何必需字段为null或undefined
- ✗ 势力范围少于4个点: 至少需要4个坐标点形成封闭区域
- ✗ 大洲边界少于6个点: 至少需要6个坐标点形成复杂的大洲形状

## 📊 本次生成参数 (严格按照配置)
- **势力总数**: 必须精确生成${finalFactionCount}个势力，不多不少
- **地点总数**: 必须精确生成${finalLocationCount}个地点，不多不少
- **特殊属性**: 从${finalLocationCount}个地点中选择${finalSecretRealmCount}个添加特殊属性

**重要**: factions数组必须包含${finalFactionCount}个对象，locations数组必须包含${finalLocationCount}个对象！

### 🏛️ 势力生成要求 (${finalFactionCount}个) - 完整组织架构

**宗门完整数据结构要求**:
每个宗门势力都必须生成完整的组织架构信息，包括：

**1. 基础信息**:
- 宗门名称、类型、等级（超级/一流/二流/三流）
- 宗门等级以一流/二流/三流/末流区分（不需要数值化实力）
- 宗门描述和历史背景
- 宗门特色和专长（必须是数组格式）

**2. 领导层信息** (leadership字段) - **必须完整生成，前端会直接显示**:
\`\`\`json
"leadership": {
  "宗主": "具体姓名（必填，如：欧阳烈风）",
  "宗主修为": "具体境界（必填，如：化神中期、元婴后期等）",
  "副宗主": "姓名（可选，如：王明月）",
  "太上长老": "姓名（可选，通常是退隐的前任掌门或德高望重者，如：玄机老祖）",
  "太上长老修为": "境界（可选，如果有太上长老则必填，通常高于或等于宗主修为）",
  "长老数量": 具体数字（必填，如：15），
  "最强修为": "宗门内最高修为境界（必填，可能是太上长老或宗主的修为）",
  "综合战力": 数字1-100（必填，如：85），
  "核心弟子数": 具体数字（必填，如：50），
  "内门弟子数": 具体数字（必填，如：300），
  "外门弟子数": 具体数字（必填，如：1200）
}
\`\`\`

**⚠️ 太上长老说明：**
- 太上长老是可选职位，不是所有宗门都有
- 通常出现在历史悠久的超级或一流宗门中
- 太上长老一般不参与日常管理，但在重大决策时有发言权
- 太上长老的修为可能高于现任宗主，也可能相当
- 如果设置了太上长老，其修为应体现在"最强修为"字段中

**⚠️ 重要：leadership字段是前端显示的核心数据，绝对不能省略或留空！**

**⚠️ 人名生成要求（严格执行）：**
- 宗主姓名：必须是具体的中式姓名（如：欧阳烈风、司徒云雅、独孤剑心）
- 副宗主姓名：如果设置，必须是具体姓名（如：南宫月华、赵无极、白素贞）
- 太上长老姓名：如果设置，必须是具体姓名（如：云中子、太极真人、无量道君）
- 每个人名都必须是唯一的，不能重复
- 人名格式要求：2-3个汉字，符合中华传统命名习惯

**3. 成员统计信息** (memberCount字段) - **必须完整生成，前端宗门页面会显示**:
\`\`\`json
"memberCount": {
  "total": 总人数（必填数字，如：1565），
  "byRealm": {
    // 重要：境界分布必须与最强修为保持一致！
    // 第一步：确定最强修为（可以是练气到渡劫的任何境界）
    // 第二步：只能包含不高于最强修为的境界
    // 例如：最强修为是化神圆满 → 只能有练气期、筑基期、金丹期、元婴期、化神期
    // 例如：最强修为是渡劫后期 → 可以有练气期到渡劫期的所有境界
    "练气期": 数量（如：1400），
    "筑基期": 数量（如：900），
    "金丹期": 数量（如：400），
    "元婴期": 数量（如：200），
    "化神期": 数量（如：70），
    "炼虚期": 数量（如：20），
    "合体期": 数量（如：8），
    "渡劫期": 数量（如：2）
  },
  "byPosition": {
    "散修": 0,
    "外门弟子": 数量（必填，如：1200），
    "内门弟子": 数量（必填，如：300），
    "核心弟子": 数量（必填，如：50），
    "传承弟子": 数量（必填，如：10），
    "执事": 数量（必填，如：20），
    "长老": 数量（必填，如：15），
    "太上长老": 数量（可选，数量极少，根据宗门势力和规模决定，小势力没有，大势力也只有几个），
    "副掌门": 数量（必填，如：1，一般只有一个），
    "掌门": 1
  }
}
\`\`\`

**⚠️ 数据一致性要求：**
- memberCount.total 必须等于 byPosition 所有职位的总和
- byRealm 各境界总和必须等于 total
- 所有数值必须是数字类型，不能是字符串
- **前端会根据这些数据显示境界分布图表和成员统计！**

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

## 📋 JSON输出格式 (严格数量控制, 仅地图字段)

**数量检查清单**:
- ✅ continents数组包含6-11个大洲对象，彼此边界不重叠
- ✅ 每个大洲的"大洲边界"数组包含至少8个坐标点，绝不为空
- ✅ 每个大洲的"地理特征"数组包含至少3个特征，绝不为空
- ✅ 每个大洲的"天然屏障"数组包含至少2个屏障，绝不为空
- ✅ factions数组包含${finalFactionCount}个势力对象
- ✅ 每个势力的"势力范围"数组包含至少4个坐标点，绝不为空
- ✅ locations数组包含${finalLocationCount}个地点对象
- ✅ 其中${finalSecretRealmCount}个地点有special_attributes
- ✅ 每个势力都分配到某个大洲

**重要提醒**:
- ⚠️ 所有坐标字段必须为数字：longitude/latitude 均为 number 类型，严禁使用诸如 "105.3-110.2" 这样的范围字符串或文本。
- 仅输出 continents/factions/locations 三个顶级字段！
- factions数组必须恰好包含${finalFactionCount}个元素，locations数组必须恰好包含${finalLocationCount}个元素！
- 大陆边界绝对不能重叠，必须相互独立且保持安全距离

\`\`\`json
{
  "continents": [
    {
      "id": "continent_1",
      "名称": "大洲名称",
      "描述": "大洲地理特征和文化描述",
      "气候": "气候类型",
      "地理特征": ["主要地貌特征1", "主要地貌特征2", "主要地貌特征3"],
      "天然屏障": ["与其他大洲的天然屏障1", "天然屏障2"],
      "大洲边界": [
        {"longitude":  ${minLng + 0.1}, "latitude": ${minLat + 0.1}},
        {"longitude":  ${minLng + 0.9}, "latitude": ${minLat + 0.4}},
        {"longitude":  ${minLng + 1.6}, "latitude": ${minLat + 1.1}},
        {"longitude":  ${minLng + 2.2}, "latitude": ${minLat + 1.8}},
        {"longitude":  ${minLng + 3.1}, "latitude": ${minLat + 2.0}},
        {"longitude":  ${minLng + 4.0}, "latitude": ${minLat + 1.3}},
        {"longitude":  ${minLng + 4.6}, "latitude": ${minLat + 0.6}},
        {"longitude":  ${minLng + 3.8}, "latitude": ${minLat + 0.2}}
      ],
      "主要势力": ["在此大洲的主要势力ID列表"]
    }
  ],
  "factions": [
    {
      "id": "faction_1",
      "名称": "势力名称",
      "类型": "势力类型（修仙宗门/修仙世家/魔道势力等）",
      "等级": "宗门等级（超级/一流/二流/三流）",
      "描述": "势力背景描述，体现独特文化",
      "特色": ["独特专长1", "独特专长2"],
      "与玩家关系": "中立",
      "声望值": "程序自动计算，无需填写",
      "位置": {"longitude": ${minLng + 2.5}, "latitude": ${minLat + 1.5}},
      "势力范围": [
        // ⚠️ 关键要求：每个势力都必须有具体的势力范围，绝对不能是空数组！
        // 至少需要4个坐标点形成一个封闭的多边形区域
        {"longitude": ${minLng + 1.2}, "latitude": ${minLat + 0.8}},
        {"longitude": ${minLng + 2.8}, "latitude": ${minLat + 1.1}},
        {"longitude": ${minLng + 2.0}, "latitude": ${minLat + 2.0}},
        {"longitude": ${minLng + 1.2}, "latitude": ${minLat + 0.8}}
      ],
      "leadership": {
        "宗主": "具体姓名（必填，如：欧阳烈风）",
        "宗主修为": "具体境界（必填，如：化神中期、元婴后期等）",
        "副宗主": "姓名（可选，如：王明月或null）",
        "长老数量": 具体数字（必填，如：15），
        "最强修为": "宗门内最高修为境界（必填，如：化神大圆满）",
        "综合战力": 数字1-100（必填，如：85），
        "核心弟子数": 具体数字（必填，如：50），
        "内门弟子数": 具体数字（必填，如：300），
        "外门弟子数": 具体数字（必填，如：1200）
      },
      "memberCount": {
        "total": 总人数（必填数字，如：1565），
        "byRealm": {
          // 重要：根据上面的"最强修为"动态调整境界分布！
          // 如果最强修为是化神期 → 只能有练气期到化神期
          // 如果最强修为是渡劫期 → 可以有练气期到渡劫期
          // 如果最强修为是炼虚期 → 只能有练气期到炼虚期
          "练气期": 数量（如：1400），
          "筑基期": 数量（如：900），
          "金丹期": 数量（如：400），
          "元婴期": 数量（如：200），
          "化神期": 数量（如：70），
          "炼虚期": 数量（如：20），
          "合体期": 数量（如：8），
          "渡劫期": 数量（如：2）
        },
        "byPosition": {
          "散修": 0,
          "外门弟子": 数量（必填，如：1200），
          "内门弟子": 数量（必填，如：300），
          "核心弟子": 数量（必填，如：50），
          "传承弟子": 数量（必填，如：10），
          "执事": 数量（必填，如：20），
          "长老": 数量（必填，如：15），
          "太上长老": 数量（可选，如：0或1），
          "副掌门": 1，
          "掌门": 1
        }
      },
      "continent_id": "所属大洲的ID"
    }
  ],
  "locations": [
    {
      "id": "loc_1",
      "name": "地点名称",
      "type": "7种标准类型之一",
      "coordinates": {"longitude": ${minLng + 2.0}, "latitude": ${minLat + 1.0}},
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
- ✅ **必须生成完整的leadership字段** - 包含宗主、宗主修为、长老数量、最强修为、弟子数量等
- ✅ **必须生成完整的memberCount字段** - 包含total、byRealm、byPosition等完整统计信息
- ✅ **数据类型正确** - 所有数量字段必须是数字，不能是字符串
- ✅ **数据一致性** - memberCount.total必须等于byPosition各职位总和

**🚨 前端显示依赖警告：**
势力宗门页面会直接使用leadership和memberCount字段显示宗门信息！
缺少这些字段将导致页面显示"暂无宗门信息"！

**核心目标**: 创造一个独一无二的修仙世界，包含完整的宗门组织架构信息！
`;
  }
}
