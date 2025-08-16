# 大道朝天修仙游戏 - UI页面设计计划表

## 🎯 总体设计目标

基于现有的角色创建和管理系统，扩展完整的修仙游戏体验，打造沉浸式的古典修仙世界，重点关注：
- **AI驱动的开局体验**：首次对话、世界生成、角色背景故事
- **动态地图系统**：Leaflet.js驱动的可交互修仙世界地图
- **深度记忆系统**：三层记忆机制和人物关系网络
- **修仙百艺体系**：炼丹、炼器、画符、阵法等传统修仙技能

## 📱 设计原则

- **古典修仙美学**：延续现有的"水墨青松"和"月映寒潭"设计语言
- **沉浸式体验**：保持视频背景和古典UI元素的一致性
- **响应式设计**：适配多种设备尺寸
- **渐进式增强**：在现有基础上逐步添加功能
- **AI集成优先**：每个系统都考虑AI辅助和自动化

## 🏗️ 页面架构规划

### 一期开发（核心游戏体验 - 开局与基础系统）

#### 0. 游戏开局界面 (GameStartView.vue) ⭐NEW⭐
**优先级：🔥 最高**
```
位置：src/views/GameStartView.vue
功能：角色创建后的首次游戏体验，AI引导开局
```

**主要组件：**
- AI对话窗口 (src/components/gamestart/AIDialogWindow.vue)
- 世界地图生成器 (src/components/gamestart/WorldMapGenerator.vue)
- 角色背景故事生成 (src/components/gamestart/CharacterStoryGenerator.vue)
- 初始位置选择 (src/components/gamestart/StartingLocationSelector.vue)

**AI提示词系统：**
```typescript
// 开局AI系统提示词模板
interface GameStartPrompts {
  // 世界观构建提示词
  worldBuilding: {
    template: "基于角色的世界背景 {{world_background}}，生成具体的地理环境、当前位置、周围环境描述"
    parameters: ["world_background", "character_origin", "starting_location"]
  }
  
  // 角色背景故事生成
  characterStory: {
    template: "结合出身{{origin}}、天资{{talent_tier}}、灵根{{spirit_root}}，生成角色的详细个人经历和初始状态"
    parameters: ["origin", "talent_tier", "spirit_root", "selected_talents"]
  }
  
  // 首次AI对话建立
  firstDialog: {
    template: "作为修仙世界的引导者，与新入门的修士{{character_name}}建立初始对话关系"
    parameters: ["character_name", "personality_traits"]
  }
  
  // 引导任务生成
  questGuidance: {
    template: "根据角色当前状态和所在环境，生成第一个适合的引导任务"
    difficulty_levels: ["普通", "中等", "困难"]
  }
}
```

**设计特色：**
- 山水画风格的地图显示
- 实时AI对话生成
- 无缝衔接到主游戏界面

#### 1. 世界地图系统 (WorldMapView.vue) ⭐UPGRADED⭐
**优先级：🔥 最高**
```
位置：src/views/WorldMapView.vue
功能：基于Leaflet.js的可交互修仙世界地图
```

**主要组件：**
- Leaflet地图容器 (src/components/map/LeafletMapContainer.vue)
- 地点标记系统 (src/components/map/LocationMarkers.vue)
- 传送点管理 (src/components/map/TeleportSystem.vue)
- 探索进度追踪 (src/components/map/ExplorationTracker.vue)
- 地图图层切换 (src/components/map/LayerSwitcher.vue)

**地图功能详述：**
```typescript
interface LeafletMapFeatures {
  // 基础地图
  baseMaps: {
    style: "古典山水画风格瓦片图层"
    customTiles: "自定义修仙世界地图素材"
    zoomLevels: "支持多级缩放查看细节"
  }
  
  // 标记系统
  markers: {
    sects: "宗门山门 - 不同等级用不同图标"
    cities: "凡人城镇 - 贸易、任务中心"
    caves: "洞府秘境 - 修炼、探险地点"
    dangers: "险地妖窟 - 危险区域警示"
    resources: "灵脉矿点 - 资源采集点"
    npcs: "重要人物位置标记"
  }
  
  // 交互功能
  interactions: {
    click: "点击标记查看详情和可用操作"
    rightClick: "右键菜单显示传送、标注等"
    drawing: "使用leaflet-draw绘制势力范围、探索路线"
    realTimeUpdates: "其他玩家位置实时更新（联机模式）"
  }
  
  // 神识探查系统
  spiritSense: {
    mechanism: "根据角色神识属性决定探查范围"
    visualEffect: "圆形半透明区域显示感知范围"
    hiddenReveals: "神识足够强可发现隐藏地点"
  }
}
```

**AI地图生成：**
- 根据角色背景和世界设定动态生成初始地图
- AI分析角色出身决定起始位置合理性
- 自动放置符合世界观的地点和NPCs

#### 2. 记忆系统界面 (MemorySystemView.vue) ⭐NEW⭐
**优先级：🔥 最高**
```
位置：src/views/MemorySystemView.vue
功能：三层记忆机制和人物关系管理
```

**记忆三层架构：**
1. **短期记忆** (最近0-5条交互)
   - 完整对话记录
   - 最近行为和选择
   - 临时状态变化
   - 存储周期：当前会话

2. **中期记忆** (重要事件摘要，约15条)
   - 重要对话和事件摘要
   - 人物关系变化记录
   - 关键选择的后果
   - 存储周期：近期游戏进程

3. **长期记忆** (核心设定和背景，无上限，所有记忆存储)
   - 角色基础信息和性格
   - 世界观核心设定
   - 重要人物关系网络
   - 重大事件里程碑
   - 存储周期：角色生命周期

**记忆转化机制：**
```typescript
interface MemorySystem {
  // 记忆转化触发条件
  conversionTriggers: {
    shortToMid: "1-5短期记忆不需要总结，是正文全部内容，每次到达极限后最后一条的简短内容自动转化为中期记忆，因为AI返回的时候每次都有正文和中期记忆，所以中期记忆直接转化"
    midToLong: "每积累10-20条中期记忆时触发"
    preserveBuffer: "转化时保留5-10条最新记忆保持连续性"
  }
  
  // 双接口设计
  apis: {
    mainTavern: "主对话接口 - 快速响应，低延迟"
    summaryConversion: "异步记忆总结接口 - 用户可配置API地址"
  }
}
```

**主要组件：**
- 记忆时间线 (src/components/memory/MemoryTimeline.vue)
- 人物关系图 (src/components/memory/RelationshipGraph.vue)
- 记忆搜索器 (src/components/memory/MemorySearch.vue)
- 记忆标签系统 (src/components/memory/MemoryTags.vue)

#### 3. 游戏主界面 (GameDashboard.vue) ⭐ENHANCED⭐
**优先级：🔥 最高**
```
位置：src/views/GameDashboard.vue
功能：游戏的核心操作中心，集成AI助手
```

**主要组件：**
- 角色状态面板（境界、修为、生命值等）
- AI助手窗口 (src/components/dashboard/AIAssistant.vue)
- 快捷操作按钮（修炼、任务、背包等）
- 消息通知区域
- 天气/时间显示
- 快速导航菜单
- 地图小窗口预览

**设计特色：**
- 仿古卷轴布局
- 实时数据更新
- 流畅的动画过渡
- AI助手常驻侧边

#### 4. 修炼系统界面 (CultivationView.vue) ⭐ENHANCED⭐
**优先级：🔥 最高**
```
位置：src/views/CultivationView.vue
功能：角色修炼和境界突破，AI辅助修炼
```

**主要组件：**
- 功法选择器 (src/components/cultivation/TechniqueSelector.vue)
- 修炼进度显示 (src/components/cultivation/ProgressDisplay.vue)
- 灵气吸收动画 (src/components/cultivation/SpiritEnergyAnimation.vue)
- 突破挑战界面 (src/components/cultivation/BreakthroughChallenge.vue)
- AI修炼指导 (src/components/cultivation/AIGuidance.vue)

**AI功能：**
- 修炼方法推荐
- 突破时机提醒
- 功法搭配建议
- 瓶颈解决方案

### 修仙百艺系统 ⭐NEW SECTION⭐

#### 5. 炼丹系统界面 (AlchemyView.vue)
**优先级：🔥 高**
```
位置：src/views/AlchemyView.vue
功能：炼制丹药，AI辅助配方优化
```

**主要组件：**
- 炼丹炉界面 (src/components/alchemy/AlchemyFurnace.vue)
- 药材管理 (src/components/alchemy/HerbInventory.vue)
- 丹方大全 (src/components/alchemy/RecipeLibrary.vue)
- 炼制过程动画 (src/components/alchemy/RefinementAnimation.vue)
- AI配方助手 (src/components/alchemy/AIRecipeAssistant.vue)

#### 6. 炼器系统界面 (CraftingView.vue)
**优先级：🔥 高**
```
位置：src/views/CraftingView.vue
功能：炼制法宝装备，AI辅助设计
```

**主要组件：**
- 炼器台 (src/components/crafting/CraftingBench.vue)
- 材料仓库 (src/components/crafting/MaterialStorage.vue)
- 法宝设计器 (src/components/crafting/WeaponDesigner.vue)
- 炼器火候控制 (src/components/crafting/HeatControl.vue)

#### 7. 画符阵法系统 (FormationView.vue)
**优先级：🔥 高**
```
位置：src/views/FormationView.vue
功能：绘制符咒，布置阵法
```

**主要组件：**
- 符纸绘制台 (src/components/formation/TalismanDrawer.vue)
- 阵法布置器 (src/components/formation/FormationBuilder.vue)
- 符文库 (src/components/formation/RuneLibrary.vue)
- 阵法效果预览 (src/components/formation/EffectPreview.vue)

#### 8. 背包系统界面 (InventoryView.vue) ⭐ENHANCED⭐
**优先级：🔥 高**
```
位置：src/views/InventoryView.vue
功能：物品管理和装备系统，支持修仙物品分类
```

**主要组件：**
- 物品网格显示 (src/components/inventory/ItemGrid.vue)
- 装备栏 (src/components/inventory/EquipmentSlots.vue)
- 物品详情卡片 (src/components/inventory/ItemDetailCard.vue)
- 修仙物品分类筛选 (src/components/inventory/CultivationItemFilter.vue)
- 法宝绑定系统 (src/components/inventory/TreasureBinding.vue)

**修仙特色分类：**
- 丹药：各类丹药按品级分类
- 法宝：飞剑、护甲、饰品等
- 材料：药材、矿石、妖兽材料
- 符箓：攻击符、防御符、辅助符
- 功法：功法秘籍、剑谱、心法

#### 9. 任务系统界面 (QuestView.vue) ⭐ENHANCED⭐
**优先级：🔥 高**
```
位置：src/views/QuestView.vue
功能：任务接取和进度追踪，可选开启
```

**主要组件：**
- 任务开关控制 (src/components/quest/QuestToggle.vue)
- 任务列表 (src/components/quest/QuestList.vue)
- 任务详情面板 (src/components/quest/QuestDetail.vue)
- 任务进度追踪 (src/components/quest/ProgressTracker.vue)
- 奖励预览 (src/components/quest/RewardPreview.vue)
- AI任务推荐 (src/components/quest/AIQuestSuggestions.vue)

**任务系统特点：**
- 完全可选，可随时开启/关闭
- 有奖励激励机制
- AI根据角色状态推荐合适任务
- 与修仙百艺系统联动

### 二期开发（社交与进阶系统）

#### 10. 战斗系统界面 (BattleView.vue) ⭐ENHANCED⭐
**优先级：🟡 中等**
```
位置：src/views/BattleView.vue
功能：PVP和PVE战斗，AI辅助战斗策略
```

**主要组件：**
- 战斗场景 (src/components/battle/BattleScene.vue)
- 技能栏 (src/components/battle/SkillBar.vue)
- 战斗日志 (src/components/battle/BattleLog.vue)
- AI战斗助手 (src/components/battle/AIBattleAssistant.vue)
- 法术释放动画 (src/components/battle/SpellAnimation.vue)

#### 11. 宗门系统界面 (SectView.vue) ⭐ENHANCED⭐
**优先级：🟡 中等**
```
位置：src/views/SectView.vue
功能：宗门管理和活动，AI管理辅助
```

**主要组件：**
- 宗门信息面板 (src/components/sect/SectInfo.vue)
- 成员管理 (src/components/sect/MemberManagement.vue)
- 宗门建筑 (src/components/sect/Buildings.vue)
- 宗门任务 (src/components/sect/SectQuests.vue)
- AI宗门顾问 (src/components/sect/AISectAdvisor.vue)

#### 12. 商店/交易界面 (MarketView.vue)
**优先级：🟡 中等**
```
位置：src/views/MarketView.vue
功能：物品买卖和玩家交易
```

#### 13. 社交系统界面 (SocialView.vue)
**优先级：🟡 中等**
```
位置：src/views/SocialView.vue
功能：好友、聊天、组队
```

#### 14. 成就系统界面 (AchievementView.vue)
**优先级：🔵 较低**
```
位置：src/views/AchievementView.vue
功能：成就展示和奖励领取
```

## 🤖 AI系统架构设计

### 核心AI交互系统

#### 双接口设计
```typescript
interface AISystemConfig {
  // 主对话接口（酒馆模式）
  tavernAPI: {
    endpoint: string // 用户配置的主要AI接口
    apiKey: string   // 用户的API密钥
    model: string    // 使用的模型（如gpt-4, claude-3等）
    maxTokens: number // 响应长度限制
    temperature: number // 创意度控制
  }
  
  // 记忆总结接口（可选配置）
  summaryAPI: {
    endpoint?: string // 可选的专用总结接口
    apiKey?: string   // 独立的API密钥
    enabled: boolean  // 是否启用异步总结
  }
}
```

#### AI提示词管理系统
```typescript
interface PromptSystem {
  // 系统级别提示词（最高权限）
  systemPrompts: {
    difficulty: "普通" | "中等" | "困难"  // 难度影响合理性审查
    worldBook: string    // 当前世界书内容
    coreRules: string    // 核心游戏规则
    antiCheat: string    // 防作弊检查提示词
  }
  
  // 角色相关提示词
  characterPrompts: {
    attributes: CharacterAttributes  // 六维属性和核心属性
    memory: MemoryContext           // 三层记忆内容
    location: LocationInfo          // 当前位置信息
    inventory: InventoryState       // 背包和装备状态
  }
  
  // 场景判定提示词
  judgmentPrompts: {
    combat: string      // 战斗判定
    cultivation: string // 修炼判定
    social: string      // 社交判定
    exploration: string // 探索判定
  }
}
```

### 记忆系统数据结构

#### 数据库表设计
```sql
-- 角色记忆表
CREATE TABLE character_memories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    character_id INT NOT NULL,
    memory_type ENUM('short', 'mid', 'long') NOT NULL,
    content TEXT NOT NULL,
    metadata JSON, -- 存储标签、重要度、关联人物等
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_character_type (character_id, memory_type)
);

-- NPC关系表
CREATE TABLE character_relationships (
    id INT PRIMARY KEY AUTO_INCREMENT,
    character_id INT NOT NULL,
    npc_name VARCHAR(255) NOT NULL,
    relationship_type VARCHAR(100), -- 师父、朋友、敌人等
    favor_level INT DEFAULT 0,      -- 好感度 -100到100
    last_interaction TIMESTAMP,
    memory_summary TEXT,            -- 关系摘要
    UNIQUE KEY unique_relationship (character_id, npc_name)
);

-- 世界事件记录表
CREATE TABLE world_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    character_id INT NOT NULL,
    event_type VARCHAR(100),        -- 战斗、修炼、探索等
    location VARCHAR(255),
    participants JSON,              -- 参与的NPC
    outcome TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 设计规范

### 核心属性UI设计（基于基础、核心属性.txt）

#### 三元属性可视化
根据您的设定，采用古典修仙的UI设计理念：

```typescript
interface CoreAttributesUI {
  // 气血 - 血玉如意设计
  vitality: {
    component: "BloodJadeDisplay.vue"
    design: "玉如意造型，满血时红光内敛，受伤时出现裂痕"
    position: "界面右下角"
    animations: ["裂痕扩散", "红光脉动", "愈合闪烁"]
  }
  
  // 灵气 - 丹田气旋设计  
  spiritualPower: {
    component: "SpiritualWhirlpool.vue"
    design: "太极气旋，旋转速度反映灵气充盈度"
    position: "界面左下角或角色丹田位置"
    animations: ["气旋旋转", "光点汇聚", "能量流转"]
  }
  
  // 神识 - 眉心祖窍设计
  consciousness: {
    component: "ThirdEyeDisplay.vue"
    design: "眉心竖眼或莲花印记，使用时微微张开"
    position: "角色立绘眉心或界面顶端中央"
    animations: ["光芒闪烁", "印记绽放", "波纹扩散"]
  }
}
```

#### 先天六命属性面板
```typescript
interface SixFatesDisplay {
  attributes: {
    rootBone: "根骨 - 影响气血和寿命"
    spirituality: "灵性 - 决定灵气亲和力"
    comprehension: "悟性 - 学习和领悟能力"
    fortune: "福缘 - 机缘和运气"
    charm: "魅力 - 社交和初始好感"
    temperament: "心性 - 道心和意志力"
  }
  
  visualStyle: {
    layout: "六芒星或六边形排列"
    colors: "每个属性用不同的古典颜色表示"
    effects: "根据数值高低显示不同的光效强度"
  }
}
```

### 物品品质系统UI

#### 七品十级系统可视化
```typescript
interface ItemQualitySystem {
  // 品质等级（神、仙、天、地、玄、黄、凡）
  qualities: {
    神: { color: "#9932CC", rarity: "举世无有", glow: "紫金神光" }
    仙: { color: "#FFD700", rarity: "顶级圣地", glow: "金色仙芒" }
    天: { color: "#FF69B4", rarity: "超级势力", glow: "粉色天光" }
    地: { color: "#00CED1", rarity: "地级宗门", glow: "青色地气" }
    玄: { color: "#9370DB", rarity: "玄门秘宝", glow: "紫色玄光" }
    黄: { color: "#FFD700", rarity: "黄级珍品", glow: "淡金黄芒" }
    凡: { color: "#808080", rarity: "凡品", glow: "无光效" }
  }
  
  // 品级（0残缺，1-3下品，4-6中品，7-9上品，10极品）
  grades: {
    0: "残缺 - 破损效果"
    "1-3": "下品 - 淡色光效"
    "4-6": "中品 - 中等光效" 
    "7-9": "上品 - 强烈光效"
    10: "极品 - 炫目特效"
  }
}
```
- **主色调**：延续现有的月下碧 (#88c0d0) 和星辉金 (#e5c07b)
- **背景色**：保持暮夜 (#2e3440) 的深色基调
- **强调色**：朱砂色 (#c65552) 用于重要提示

#### 字体规范
- **标题**：使用 Noto Serif SC 宋体，体现古典气质
- **正文**：无衬线字体确保可读性
- **数值**：等宽字体用于数据显示

#### 布局原则
- **卡片化设计**：所有功能模块采用卡片容器
- **网格系统**：响应式12列网格布局
- **间距统一**：使用8px基准间距系统

### 交互设计

#### 动画效果
- **过渡动画**：0.3s ease-in-out 标准过渡
- **悬停效果**：微妙的发光和阴影变化
- **加载动画**：太极图旋转和粒子效果

#### 反馈机制
- **操作反馈**：按钮点击涟漪效果
- **状态提示**：Toast消息系统
- **进度显示**：渐变进度条和百分比

## 🔧 技术实现

### 状态管理
```typescript
// 新增Store模块
- cultivationStore.ts  // 修炼系统状态
- inventoryStore.ts    // 背包系统状态
- questStore.ts        // 任务系统状态
- gameStore.ts         // 全局游戏状态
```

### API接口扩展
```python
# 后端新增接口模块
- cultivation.py       // 修炼相关接口
- inventory.py         // 物品管理接口
- quest.py            // 任务系统接口
- battle.py           // 战斗系统接口
```

### 工具函数
```typescript
// 新增工具函数
- gameCalculations.ts  // 游戏数值计算
- animationHelpers.ts  // 动画辅助函数
- formatters.ts        // 数据格式化
```

## 📅 开发时间线

### 第一阶段（2-3周）
- [ ] GameDashboard.vue - 游戏主界面
- [ ] CultivationView.vue - 修炼系统
- [ ] 相关Store和API接口

### 第二阶段（2-3周）
- [ ] InventoryView.vue - 背包系统
- [ ] QuestView.vue - 任务系统
- [ ] 物品和任务数据管理

### 第三阶段（3-4周）
- [ ] MarketView.vue - 交易系统
- [ ] SocialView.vue - 社交功能
- [ ] SectView.vue - 宗门系统

### 第四阶段（4-5周）
- [ ] BattleView.vue - 战斗系统
- [ ] WorldMapView.vue - 世界地图
- [ ] AchievementView.vue - 成就系统

## 🎮 用户体验流程

### 新玩家引导
1. 完成角色创建（现有功能）
2. 进入游戏主界面
3. 引导教程：基础修炼→背包使用→任务接取
4. 逐步解锁高级功能

### 核心游戏循环
1. **日常修炼**：提升境界和属性
2. **任务完成**：获取资源和经验
3. **物品管理**：装备升级和资源配置
4. **社交互动**：与其他玩家交流合作

## 📝 后续优化方向

### 性能优化
- 虚拟滚动处理大量数据
- 图片懒加载和压缩
- 代码分包和按需加载

### 体验提升
- 离线数据缓存
- 实时数据同步
- 个性化推荐系统

### 功能扩展
- 移动端适配
- 多语言支持
- 无障碍访问优化

---

**总结**：本计划表基于现有的优秀基础架构，循序渐进地构建完整的修仙游戏体验。优先开发核心玩法，后续逐步丰富社交和高级功能，确保每个阶段都能为玩家提供完整的游戏体验。



# 重构版


当然，非常抱. 我深刻理解了您的意思，您需要的是在 **不删减任何功能模块** 的前提下，对**品质颜色体系**进行更有层次感的重构，并保留之前所有讨论过的优秀设计（如双主题、四元属性、AI格式化响应等）。

是我之前的精简操作误解了您的意图。现在，我将为您呈现一份**内容完整、细节丰富、完全符合您所有要求**的经典重构版蓝图。

---

## **大道朝天 · UI/UX 设计与开发蓝图 (v5.0 经典重构版)**

### 🎯 核心愿景

打造一个由AI驱动、深度沉浸的古典修仙世界。在现有技术栈基础上，重点构建**AI开局引导**、**动态交互地图**、**三层记忆系统**及**修仙百艺体系**。

### 🎨 设计哲学

*   **双主题古风美学**: 提供“**晴窗临帖**”(日间)与“**星河入梦**”(夜间)两种视觉主题，玩家可随时切换，以适应不同光线环境和心境。
*   **AI驱动的确定性**: AI的响应必须包含**格式化数据(JSON)**，前端将基于这些结构化数据进行状态更新，确保游戏逻辑的稳定与精确。
*   **沉浸体验**：全局视频背景与仿古UI元素保持一致。
*   **渐进式开发**：在稳定基础上，分阶段、模块化地添加新功能。

---

### 🏗️ 开发路线图 (Phased Development)

我们将项目分为三个核心阶段，确保每个阶段都有可交付的核心体验。

### **第一阶段：开局与核心玩法 (Priority: Critical 🔥)**

此阶段的目标是让玩家能完整地从创建角色无缝进入一个有基础玩法循环的修仙世界。

#### 1. **游戏开局 (GameStartView.vue)**
*   **目标**: 承接角色创建，通过AI生成独一无二的开局体验，包括世界背景、角色故事和首次交互。
*   **核心组件**: AI对话窗口、世界书与地图生成器、角色背景故事生成器。
*   **AI集成**: 使用模板化提示词，根据玩家选择，动态生成世界描述、个人经历、引导任务和首次对话。

#### 2. **游戏主界面 (GameDashboard.vue) - 增强**
*   **目标**: 作为游戏的核心中枢，集成所有关键信息和操作入口。
*   **核心组件**: 角色核心四元属性（气血、灵气、神识、寿命）、AI常驻助手窗口、快捷导航（修炼、背包、任务）、世界时间/天气模块。
*   **设计**: 采用仿古卷轴布局，所有数据实时更新。

#### 3. **修炼系统 (CultivationView.vue) - 增强**
*   **目标**: 提供角色成长的核心途径——修炼与境界突破。
*   **核心组件**: 功法选择与切换、灵气吐纳动画与进度显示、境界突破挑战界面。
*   **AI集成**: AI可提供功法搭配建议、提醒突破时机、分析修炼瓶颈。

#### 4. **背包系统 (InventoryView.vue) - 增强**
*   **目标**: 管理所有修仙资源，支持高度定制化的物品分类与装备。
*   **核心组件**: 物品分类筛选（丹药、法宝、材料、符箓、功法）、角色装备栏、法宝绑定与详情展示。
*   **设计**: 引入全新的七阶品质UI系统，通过颜色和光效直观展示物品稀有度。

### **第二阶段：世界探索与深度交互 (Priority: High 🚀)**

此阶段专注于拓展游戏世界的可玩性，引入探索和更复杂的系统。

#### 1. **世界地图 (WorldMapView.vue) - 升级**
*   **目标**: 基于`Leaflet.js`打造一个可交互、动态生成的修仙大陆。
*   **核心功能**:
    *   **地图**: 定制化古典山水画风格瓦片图层。
    *   **标记**: 宗门、城镇、秘境、险地、资源点等。
    *   **交互**: 点击标记查看详情，右键菜单，绘制路线。
    *   **神识系统**: 根据角色神识属性决定地图探查范围，可发现隐藏地点。
*   **AI集成**: AI根据世界书和玩家位置，动态生成地图上的随机事件与次要地点。

#### 2. **记忆系统 (MemorySystemView.vue)**
*   **目标**: 实现三层记忆架构，让AI拥有长期、连贯的记忆，并可视化人物关系。
*   **核心组件**: 记忆时间线（短期、中期、长期）、人物关系图谱（显示好感度与关系）、记忆检索与标签系统。
*   **技术**: 采用主/副双API接口设计，确保主对话流畅，记忆总结在后台异步进行。

#### 3. **任务系统 (QuestView.vue) - 增强**
*   **目标**: 提供一个完全可选、有奖励激励的任务系统。
*   **核心组件**: 任务系统开关、任务列表与详情、进度追踪与奖励预览。
*   **AI集成**: AI可根据玩家当前状态、位置和记忆，动态生成个性化任务。

#### 4. **修仙百艺系统 (Alchemy, Crafting, Formation Views)**
*   **目标**: 引入炼丹、炼器、画符/阵法等经典修仙技艺。
*   **通用架构**: 操作台界面（炼丹炉、炼器台）、材料/配方管理、过程交互/动画。
*   **AI集成**: AI可辅助优化配方、推荐材料、设计法宝图纸。

### **第三阶段：社交与战斗 (Priority: Medium 🟡)**

此阶段完善多人互动和核心战斗体验。

*   **战斗系统 (BattleView.vue)**: PVE与PVP战斗，AI辅助战斗策略。
*   **宗门系统 (SectView.vue)**: 宗门管理、贡献、任务与活动。
*   **交易系统 (MarketView.vue)**: NPC商店与玩家间交易。
*   **社交系统 (SocialView.vue)**: 好友、聊天、组队系统。
*   **成就系统 (AchievementView.vue)**: 记录玩家里程碑。

---

### 🎨 UI/UX 设计语言

#### **双主题设计**

提供两套完整的色彩与风格方案，确保视觉统一性和沉浸感。

| 主题元素 | **主题一：晴窗临帖 (日间)** | **主题二：星河入梦 (夜间)** |
| :--- | :--- | :--- |
| **背景色** | `米白 (#F5F5DC)` - 温暖、舒适，如宣纸般质感 | `暮夜 (#2E3440)` - 深邃、静谧的夜空基调 |
| **容器/卡片** | `宣纸灰 (#EAEAEA)` - 与背景形成柔和对比 | `玄铁黑 (#4C566A)` - 更具层次感的暗色容器 |
| **主要强调色** | `朱砂 (#C65552)` - 醒目而不刺眼，用于关键按钮和提示 | `月下碧 (#88C0D0)` - 清冷、宁静，用于主要交互元素 |
| **次要强调色** | `赭石 (#A52A2A)` - 更深的红色，用于次要信息 | `星辉金 (#E5C07B)` - 明亮、高贵，用于稀有奖励和高亮 |
| **文本颜色** | `墨色 (#3A3A3A)` - 深灰，清晰易读 | `月白 (#E5E9F0)` - 柔和的白色，在暗色背景上不刺眼 |

#### **核心四元属性可视化**

*   **气血**: **【血玉如意】** - 玉如意造型，满血时红光内敛。受伤时，玉身出现裂痕，光泽黯淡。
*   **灵气**: **【丹田气旋】** - 太极图样式的动态气旋，灵气越充盈，旋转速度越快，光效越盛。
*   **神识**: **【眉心祖窍】** - 眉心处的莲花印记。使用神识探查时，莲花会微微绽放，并散发出波纹。
*   **寿命**: **【魂灯】** - 古典样式的魂灯。寿元充沛时，灯火**明亮**稳定；寿元将尽时，灯火会剧烈**摇曳**。

#### **物品品质系统 (灵能光谱版 - 最终方案)**

此体系的视觉核心是“能量光谱”，严格遵循“越往上越艳丽”的递进原则，为玩家带来强烈的视觉正反馈。

| 品质 | 名称 | 代表色 | HEX | 色彩预览 |
| :--- | :--- | :--- | :--- | :--- |
| **神** | **皓白** | 无瑕神光 | `#FFFFFF` | <span style="background-color: #FFFFFF; color: #3A3A3A; padding: 5px 15px; border-radius: 5px; display: inline-block; border: 1px solid #ddd;">**万法归一**</span> |
| **仙** | **鎏金** | 不朽仙辉 | `#FFD700` | <span style="background-color: #FFD700; color: #3A3A3A; padding: 5px 15px; border-radius: 5px; display: inline-block;">**金身不朽**</span> |
| **天** | **赤红** | 烈日真火 | `#C62828` | <span style="background-color: #C62828; color: #FFFFFF; padding: 5px 15px; border-radius: 5px; display: inline-block;">**天道之巅**</span> |
| **地** | **紫晶** | 奥法之源 | `#8E24AA` | <span style="background-color: #8E24AA; color: #FFFFFF; padding: 5px 15px; border-radius: 5px; display: inline-block;">**地脉之晶**</span> |
| **玄** | **靛蓝** | 深海之秘 | `#303F9F` | <span style="background-color: #303F9F; color: #FFFFFF; padding: 5px 15px; border-radius: 5px; display: inline-block;">**玄妙之始**</span> |
| **黄** | **烟晶** | 浑浊石英 | `#A1887F` | <span style="background-color: #A1887F; color: #FFFFFF; padding: 5px 15px; border-radius: 5px; display: inline-block;">**初蕴灵光**</span> |
| **凡** | **岩灰** | 凡俗顽石 | `#696969` | <span style="background-color: #696969; color: #FFFFFF; padding: 5px 15px; border-radius: 5px; display: inline-block;">**凡尘俗物**</span> |

**天品红色调整说明:**
*   **赤红 (#C62828)**: 采用了更加纯粹、饱和度更高的红色，去除了之前的洋红/粉色调。它如同太阳核心的真火，或神兽朱雀的本命之炎，充满了无可匹敌的力量感和至高无上的权威，视觉冲击力已提升至顶点。

---

### 🤖 核心系统架构

#### **AI格式化响应与处理流程**

这是确保AI驱动的游戏逻辑稳定可靠的核心机制。

**1. AI输出规范 (提示词强制要求)**

在每一次发送给AI的提示词末尾，都必须附加强制性指令，要求其返回包含JSON代码块的格式化响应。

**示例AI返回内容:**
````markdown
这是根据你的行动生成的剧情描述...（故事文本）...

```json
{
  "narrative": "你催动灵力，丹炉发出嗡鸣，一股浓郁的药香弥漫开来。看起来，这次炼丹就要成功了。",
  "updates": [
    {
      "action": "set_value",
      "target": "player.ling_qi.current",
      "value": 85
    },
    {
      "action": "add_item",
      "target": "player.inventory",
      "value": { "name": "下品凝气丹", "quantity": 3, "quality": "黄品" }
    }
  ],
  "events": ["炼丹成功", "获得丹药"],
  "options": ["继续炼丹", "离开丹房"]
}
```
````

**2. 前端稳健处理流程**

前端必须设计一个能够应对AI可能出错的稳健解析与执行流程。

```typescript
// composables/useAIResponseHandler.ts

// 1. 正则表达式提取JSON字符串
const extractJson = (rawText: string): string | null => {
  const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
  return match ? match[1] : null;
};

// 2. 安全解析与执行
const processAIResponse = (response: string) => {
  const jsonString = extractJson(response);
  const narrativeText = response.split('```json')[0].trim(); // 提取叙事文本

  if (!jsonString) {
    // **应急预案 1: 未找到JSON**
    displayNarrative(narrativeText); // 只显示故事文本
    triggerSelfCorrection("JSON块缺失"); // 准备下一次请求时修正AI
    return;

  }

  try {
    const data = JSON.parse(jsonString);
  
    // **成功路径: 执行状态更新**
    displayNarrative(data.narrative || narrativeText);
    if (data.updates) {
      gameStore.applyUpdates(data.updates); // 通过Store批量更新
    }
    // ...处理 events 和 options

  } catch (error) {
    // **应急预案 2: JSON格式错误**
    displayNarrative(narrativeText);
    displayErrorToast("AI状态更新指令解析失败");
    triggerSelfCorrection("JSON语法错误");
  }
};

// 3. AI自我修正机制
let correctionPrompt = "";
const triggerSelfCorrection = (errorType: string) => {
    correctionPrompt = `[系统指令：你上次的响应存在一个问题（${errorType}）。请严格遵守在回复末尾附加一个完整且语法正确的JSON代码块的规则。]`;
};

// 在下一次构建发送给AI的Prompt时，附加修正指令
// ...
```

此流程确保了：
*   **体验不中断**: 即使AI返回的JSON格式错误，玩家依然能看到叙事文本，游戏不会卡住。
*   **数据强类型**: 只有在JSON成功解析后，游戏状态才会被修改，杜绝了因AI“口胡”导致的游戏逻辑错误。
*   **自动纠错**: 通过向AI反馈错误，引导其在后续的交互中进行自我修正，提高长期稳定性。

#### **数据库核心表设计**

*   `character_memories`: 存储角色的三层记忆，包含类型和元数据。
*   `character_relationships`: 记录玩家与所有NPC的关系、好感度和关键互动摘要。
*   `world_events`: 记录角色在世界中触发的重大事件里程碑。