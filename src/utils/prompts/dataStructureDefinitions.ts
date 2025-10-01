/**
 * 数据结构定义（仅结构，不含操作说明）
 */

export const DATA_STRUCTURE_DEFINITIONS = `
# 数据结构定义

## 基础类型

### 境界
0=凡人, 1=练气, 2=筑基, 3=金丹, 4=元婴, 5=化神, 6=炼虚, 7=合体, 8=渡劫

### 阶段
"初期"|"中期"|"后期"|"圆满"|"极道"

### 品质
{quality: "凡"|"黄"|"玄"|"地"|"天"|"仙"|"神", grade: 1-10}

### 灵根
名称: "金/木/水/火/土灵根"|"XX双灵根"|"天灵根"|"废灵根"等
品级: "凡品"|"下品"|"中品"|"上品"|"极品"|"天品"|"神品"|"特殊"

### 先天六司
{根骨: 0-10, 灵性: 0-10, 悟性: 0-10, 气运: 0-10, 魅力: 0-10, 心性: 0-10}
说明: 2=普通凡人, 10=通神, 0=废弃

## 核心数据结构

### 玩家角色状态
\`\`\`
{
  境界: 0-8,
  阶段: string,
  位置: {世界: string, 区域: string, 描述: string},
  气血: {当前: number, 最大: number},
  灵气: {当前: number, 最大: number},
  修为: {当前: number, 最大: number},
  神识: {当前: number, 最大: number},
  寿命: {当前: number, 最大: number},
  状态效果: string[],
  已死亡: boolean
}
\`\`\`

### 背包
\`\`\`
{
  灵石: {下品: number, 中品: number, 上品: number, 极品: number},
  物品: Record<物品ID, Item>  // ⚠️ 对象非数组
}
\`\`\`

### Item对象
\`\`\`
{
  物品ID: string,
  名称: string,
  类型: "装备"|"功法"|"其他",
  品质: {quality, grade},
  数量: number,
  描述: string,
  已装备?: boolean,
  可叠加?: boolean,

  // 装备特有
  装备增幅?: {
    气血上限?: number,
    灵气上限?: number,
    神识上限?: number,
    后天六司?: {根骨?, 灵性?, 悟性?, 气运?, 魅力?, 心性?}
  },

  // 功法特有
  修炼进度?: number,
  修炼中?: boolean,
  功法效果?: {修炼速度加成?: number},
  技能?: Record<技能名, {技能类型: string, 技能描述: string}>,

  // 其他物品
  使用效果?: string
}
\`\`\`

### 装备栏
\`\`\`
{
  装备1: {物品ID: string, 名称: string} | null,
  装备2: ...,
  ...
  装备6: ...
}
// 注: 仅存引用，完整数据在背包.物品中
\`\`\`

### NpcProfile
\`\`\`
{
  角色基础信息: {
    名字: string,
    性别: "男"|"女"|"其他",
    年龄: number,
    世界: string,
    天资: string,
    出生: string,
    灵根: {名称: string, 品级: string, 描述: string},
    天赋: string[],
    先天六司: {根骨, 灵性, 悟性, 气运, 魅力, 心性},
    境界: 0-8,
    阶段: string
  },
  外貌描述: string,
  人物关系: string,
  人物好感度: number,  // -100~100
  人物记忆: Array<{时间: string, 事件: string}>,
  所属势力?: string,
  当前位置?: string
}
\`\`\`

### 地图配置
\`\`\`
{
  大陆信息: Record<大陆ID, {
    名称: string,
    描述: string,
    边界: {minX: number, minY: number, maxX: number, maxY: number},
    势力分布: {
      宗门势力: string[],
      魔道势力: string[],
      中立势力: string[]
    },
    区域划分: Record<区域名, {
      描述: string,
      范围: {minX, minY, maxX, maxY},
      控制势力: string
    }>
  }>,

  点位信息: Record<点位ID, {
    名称: string,
    类型: "宗门"|"城镇"|"秘境"|"险地"|"资源点"|"遗迹",
    所属大陆: string,
    坐标: {x: number, y: number},
    描述: string,
    所属势力: string | null,
    点位等级: "小型"|"中型"|"大型"|"顶级",
    可见性: "公开"|"隐藏"|"秘密",
    子区域?: Record<子区域名, {
      描述: string,
      重要建筑: string[]
    }>,
    相关NPC?: string[],
    特殊资源?: string[],
    危险等级: 0-10
  }>
}
\`\`\`

### 势力
\`\`\`
{
  势力名称: string,
  势力类型: "宗门"|"家族"|"商会"|"魔道"|"散修联盟"|"其他",
  势力等级: "小型"|"中型"|"大型"|"顶级",
  所在区域: string,
  势力关系: number,  // -100~100
  势力描述: string
}
\`\`\`

### 任务
\`\`\`
{
  任务ID: string,
  任务名称: string,
  任务类型: "主线"|"支线"|"宗门任务"|"历练任务"|"日常任务",
  任务状态: "进行中"|"已完成"|"已失败",
  任务描述: string,
  任务目标: Array<{描述: string, 当前进度: number, 目标进度: number}>,
  任务奖励: {
    修为?: number,
    灵石?: {下品?, 中品?, 上品?, 极品?},
    物品?: string[]
  }
}
\`\`\`

### 功法
\`\`\`
{
  功法ID: string,
  名称: string,
  功法类型: "心法"|"武技"|"神通"|"秘术"|"炼丹术"|"炼器术"|"阵法"|"符篆",
  品质: {quality, grade},
  修炼要求: {
    最低境界?: number,
    灵根要求?: string,
    前置功法?: string
  },
  当前层数: number,
  最大层数: number,
  描述: string
}
\`\`\`
`.trim();
