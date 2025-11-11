export const characterInitializationCotPrompt = `
# 角色初始化思维链 (Character Initialization COT)

## [注意] 输出格式要求（最高优先级）

**你必须严格按照以下顺序输出：**

1. **第一步：输出 <thinking> 标签和思维链分析**
2. **第二步：输出 </thinking> 结束标签**
3. **第三步：输出 JSON 响应（用 \`\`\`json 包裹）**

**示例格式：**
\`\`\`
<thinking>
[思维链分析内容...]
</thinking>

\`\`\`json
{
  "text": "...",
  "mid_term_memory": "...（必填）",
  "tavern_commands": [...]
}
\`\`\`

\`\`\`

---

## 思维链分析步骤（用英文简洁填写）

<thinking>

### 1) Player Setup Analysis
World: XYZ | Talent: XYZ | Origin: XYZ | Spirit root: XYZ | Age: XYZ岁
Special talents: XYZ (如何在开局体现？)
Random replacements needed: YES/NO (灵根/出身)

### 2) Opening Scene Design
Location: XYZ (x=XYZ, y=XYZ)
Atmosphere: XYZ (符合世界观和出身)
Initial realm: 凡人/炼气X期/筑基初期 (based on story content)
Story hook: XYZ (开局吸引点，埋下伏笔)

### 3) Resources & Items
Spirit stones: XYZ下品 (Poor:0-50 | Common:20-100 | Sect:50-300 | Rich:100-500+)
Items (1-6): item_001=XYZ, item_002=XYZ, ...
Techniques (0-3): 功法1=XYZ (技能2-5个，首个熟练度要求=0), ...

### 4) NPCs (0-3个，只创建文本中明确提到的)
NPC list: 名字1(性别,境界,关系), 名字2(...), ... or "None"
NSFW check: nsfwMode=XYZ, filter=XYZ → 私密信息 YES/NO

### 5) Commands Count
Time(2) + Location(1) + Reputation(1) + Random(X) + Resources(X) + NPCs(X) + Daos(X) = Total: X

### 6) Final Check
✓ Text: 1200-2500字 | ✓ 禁用词 | ✓ 境界匹配 | ✓ 坐标范围 | ✓ 数据结构完整

</thinking>

---

## 关键规则速查

### 初始境界判定
- **有修炼内容**（功法/灵气/术法/宗门弟子）→ 炼气初期/中期/后期 或 筑基初期
- **完全无修炼内容** → 凡人

### 初始资源范围
- **灵石**：贫穷 0-50，普通 20-100，宗门 50-300，富裕 100-500+
- **物品**：1-6 件（基于故事逻辑）
- **功法**：0-3 部（基于出身和故事）

### NPC 创建原则
- **只创建文本中明确提到的 NPC**（有名字、对话、互动）
- **NPC 境界对象**：只有 {名称, 阶段} 两个字段
- **实时关注**：初始化时全部设为 false
- **NSFW**：检查 nsfwMode 和 nsfwGenderFilter，符合条件才生成私密信息

### 随机项替换
- **随机灵根**：根据天资等级确定品质，根据世界观确定主题（五行/特殊）
- **随机出身**：根据世界观类型（仙侠/都市/玄幻）和天资等级设计背景故事

### 指令顺序
1. 时间初始化
2. 位置设置
3. 声望设置
4. 随机项替换（灵根/出身）
5. 初始资源（灵石/物品）
6. NPC 创建
7. 大道解锁（如有）

### 数据结构要点
- **功法技能**：数组长度 2-5，第一个技能熟练度要求=0
- **三千大道**：是否解锁=true，阶段列表至少2个阶段对象
- **物品对象**：{物品ID:"类型_数字", 名称, 类型, 品质:{quality,grade}, 数量, 描述}
- **NPC背包**：{灵石:{下品,中品,上品,极品}, 物品:{}}

### JSON 输出要求
- **必须包含 3 个字段**：text, mid_term_memory, tavern_commands
- **text**：1200-2500 个中文字符
- **mid_term_memory**：50-100 字符摘要（必填，不能为空）
- **tavern_commands**：数组，包含所有初始化指令
- **格式**：用 \`\`\`json 包裹，纯 JSON，双引号，无尾随逗号

**严格遵循这些规则，确保角色初始化的完整性和一致性。**
`.trim();
