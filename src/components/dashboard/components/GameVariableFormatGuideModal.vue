<template>
  <div class="format-guide-modal-overlay" @click.self="$emit('close')">
    <div class="format-guide-modal">
      <div class="modal-header">
        <h3 class="modal-title">
          <BookOpen :size="20" />
          数据格式说明
        </h3>
        <button class="close-btn" @click="$emit('close')" title="关闭">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div class="format-guide-content">
          <!-- 快速导航 -->
          <div class="quick-nav">
            <button
              v-for="section in sections"
              :key="section.id"
              :class="['nav-btn', { active: activeSection === section.id }]"
              @click="scrollToSection(section.id)"
            >
              {{ section.title }}
            </button>
          </div>

          <!-- 格式说明内容 -->
          <div class="format-sections">
            <!-- 角色信息 -->
            <section id="character" class="format-section">
              <h4 class="section-title">1. 角色与状态</h4>
              <div class="section-content">
                <h5>1.1 角色（基础档案）</h5>
                <pre class="code-block">名字: string (只读)
性别: "男"|"女"|"其他" (只读)
年龄: number (自动计算)
出生日期: {年, 月, 日, 小时?, 分钟?} (只读)
先天六司: {根骨, 灵性, 悟性, 气运, 魅力, 心性} (只读，1-10)
后天六司: {根骨, 灵性, 悟性, 气运, 魅力, 心性} (可修改，用add)</pre>

                <h5>1.2 属性（可修改）</h5>
                <pre class="code-block">境界: {名称, 阶段, 当前进度, 下一级所需, 突破描述}
  → 用set更新整个对象
  → 突破时必须更新突破描述

气血/灵气/神识: {当前, 上限}
  → 当前用add，上限突破时用add

寿命: {当前, 上限}
  → 当前用add/或在时间推进时由系统更新，上限突破时用add

声望: number
  → 用add增减或set覆盖

位置: {描述:"大陆·地点", x, y}
  → 顶级字段 key="位置"，用set更新整个对象，三个字段必须同时设置

效果: [{状态名称, 类型, 生成时间, 持续时间分钟, 状态描述}]
  → 只能用push添加
  → 类型必须是"buff"或"debuff"（全小写）
  → 生成时间使用当前游戏时间
  → 持续时间分钟：数值类型（99999表示永久）</pre>

                <div class="example-box">
                  <strong>示例：</strong>
                  <pre class="code-block">// 添加增益状态
{
  "action": "push",
  "key": "效果",
  "value": {
    "状态名称": "灵气充盈",
    "类型": "buff",
    "生成时间": {"年": 1000, "月": 3, "日": 15, "小时": 10, "分钟": 30},
    "持续时间分钟": 120,
    "状态描述": "灵气恢复速度提升50%"
  }
}</pre>
                </div>
              </div>
            </section>

            <!-- 三千大道 -->
            <section id="dao" class="format-section">
              <h4 class="section-title">2. 大道</h4>
              <div class="section-content">
                <pre class="code-block">大道列表: {道名: DaoData对象}
  - 道名: string
  - 描述: string
  - 阶段列表: [{名称, 描述, 突破经验}]
  - 是否解锁: boolean
  - 当前阶段: number
  - 当前经验: number
  - 总经验: number</pre>

                <div class="example-box">
                  <strong>示例：</strong>
                  <pre class="code-block">// 解锁并初始化大道
{
  "action": "set",
  "key": "大道.大道列表.剑道",
  "value": {
    "道名": "剑道",
    "描述": "以剑入道，剑气纵横",
    "是否解锁": true,
    "当前阶段": 0,
    "当前经验": 0,
    "总经验": 0,
    "阶段列表": [
      {"名称": "初窥门径", "描述": "...", "突破经验": 100},
      {"名称": "小有所成", "描述": "...", "突破经验": 500}
    ]
  }
}

// 增加经验
{
  "action": "add",
  "key": "大道.大道列表.剑道.当前经验",
  "value": 50
}</pre>
                </div>
              </div>
            </section>

            <!-- 背包与物品 -->
            <section id="inventory" class="format-section">
              <h4 class="section-title">3. 背包与物品</h4>
              <div class="section-content">
                <pre class="code-block">背包:
  - 灵石: {下品, 中品, 上品, 极品} (用add增减)
  - 物品: {物品ID: Item对象}

物品类型:
  - 装备: {物品ID, 名称, 类型:"装备", 品质, 数量, 描述, 装备增幅, 特殊效果}
  - 功法: {物品ID, 名称, 类型:"功法", 品质, 数量, 描述, 功法效果, 功法技能[], 修炼进度, 已解锁技能[]}
  - 消耗品/材料: {物品ID, 名称, 类型:"丹药"|"材料"|"其他", 品质, 数量, 描述, 使用效果?}

品质格式: {quality:"凡"|"黄"|"玄"|"地"|"天"|"仙"|"神", grade:0-10}</pre>

                <div class="warning-box">
                  <strong>⚠️ 重要：</strong>
                  <ul>
                    <li>修炼进度和已解锁技能存储在<strong>角色.背包.物品.{功法ID}</strong>中</li>
                    <li>❌ 错误：修改"角色.修炼.修炼功法"字段（这是引用槽位，不是进度来源）</li>
                    <li>✅ 正确：修改"角色.背包.物品.{功法ID}.修炼进度"</li>
                  </ul>
                </div>

                <div class="example-box">
                  <strong>示例：</strong>
                  <pre class="code-block">// 增加功法修炼进度
{
  "action": "add",
  "key": "角色.背包.物品.gongfa_001.修炼进度",
  "value": 10
}

// 解锁新技能
{
  "action": "push",
  "key": "角色.背包.物品.gongfa_001.已解锁技能",
  "value": "御剑术"
}</pre>
                </div>
              </div>
            </section>

            <!-- 人物关系 -->
            <section id="relationships" class="format-section">
              <h4 class="section-title">4. 关系</h4>
              <div class="section-content">
                <pre class="code-block">关系: {NPC名字: NPC档案对象}
  - 名字: string
  - 性别: "男"|"女"|"其他"
  - 境界: {名称, 阶段} (⚠️ NPC境界是简化结构，严禁添加"当前进度"等玩家专属字段)
  - 与玩家关系: string
  - 好感度: number (-100~100，用add)
  - 记忆: [string] (用push添加)
  - 当前外貌状态: string (用set实时更新)
  - 当前内心想法: string (用set实时更新)</pre>

                <div class="warning-box">
                  <strong>⚠️ NPC境界格式：</strong>
                  <ul>
                    <li>✅ 正确：{"名称": "筑基", "阶段": "中期"}</li>
                    <li>❌ 错误：{"名称": "筑基", "阶段": "中期", "当前进度": 0}</li>
                  </ul>
                </div>

                <div class="example-box">
                  <strong>示例：</strong>
                  <pre class="code-block">// 增加好感度
{
  "action": "add",
  "key": "关系.张三.好感度",
  "value": 10
}

// 添加记忆
{
  "action": "push",
  "key": "关系.张三.记忆",
  "value": "【1000年3月15日】与玩家一起修炼，感觉很愉快"
}

// 更新关系
{
  "action": "set",
  "key": "关系.张三.与玩家关系",
  "value": "朋友"
}</pre>
                </div>
              </div>
            </section>

            <!-- 世界信息 -->
            <section id="world" class="format-section">
              <h4 class="section-title">5. 世界</h4>
              <div class="section-content">
                <pre class="code-block">世界:
  - 势力信息: [{名称, 类型, 等级, 位置, 与玩家关系, 声望值, ...}]
  - 地点信息: [{名称, 类型, 位置, coordinates, ...}]

势力信息字段:
  - 名称: string
  - 类型: "修仙宗门"|"魔道宗门"|"修仙世家"
  - 等级: "超级"|"一流"|"二流"|"三流"
  - 与玩家关系: "敌对"|"中立"|"友好"
  - 声望值: number
  - 领导层: {宗主, 宗主修为, 综合战力}
  - 成员数量: {总数, 按境界, 按职位}</pre>

                <div class="example-box">
                  <strong>示例：</strong>
                  <pre class="code-block">// 修改宗主
{
  "action": "set",
  "key": "世界.势力信息[0].领导层.宗主",
  "value": "新宗主名字"
}

// 增加声望
{
  "action": "add",
  "key": "世界.势力信息[2].声望值",
  "value": 50
}

// 添加新地点
{
  "action": "push",
  "key": "世界.地点信息",
  "value": {
    "名称": "xx秘境",
    "类型": "秘境",
    "位置": "东玄大陆·北部",
    "coordinates": {"x": 108.5, "y": 28.3},
    "描述": "...",
    "安全等级": "危险"
  }
}</pre>
                </div>
              </div>
            </section>

            <!-- 世界事件系统 -->
            <section id="event" class="format-section">
              <h4 class="section-title">6. 事件</h4>
              <div class="section-content">
                <pre class="code-block">社交.事件:
  - 配置: {启用随机事件, 最小间隔年, 最大间隔年, 事件提示词}
  - 下次事件时间: {年, 月, 日, 小时, 分钟} | null
  - 事件记录: [事件对象]

事件对象结构:
  - 事件ID: string (格式: event_时间戳_随机数)
  - 事件名称: string
  - 事件类型: string (宗门大战/世界变化/异宝降世/秘境现世/好友遭遇等)
  - 事件描述: string
  - 影响等级: "轻微"|"中等"|"重大"|"灾难"
  - 影响范围: string
  - 相关人物: string[]
  - 相关势力: string[]
  - 事件来源: "随机"|"玩家行为"|"剧情"
  - 发生时间: {年, 月, 日, 小时, 分钟}</pre>

                <div class="example-box">
                  <strong>示例：</strong>
                  <pre class="code-block">// 添加一条刚刚发生的世界事件
{
  "action": "push",
  "key": "社交.事件.事件记录",
  "value": {
    "事件ID": "event_1700000000000_42",
    "事件名称": "青冥宗与赤炎谷开战",
    "事件类型": "宗门大战",
    "事件描述": "……",
    "影响等级": "重大",
    "影响范围": "东玄大陆北境",
    "相关人物": [],
    "相关势力": ["青冥宗", "赤炎谷"],
    "事件来源": "随机",
    "发生时间": {"年": 12, "月": 3, "日": 18, "小时": 14, "分钟": 0}
  }
}</pre>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="copy-btn" @click="copyAllFormats">
          <Copy :size="16" />
          复制全部格式
        </button>
        <button class="close-footer-btn" @click="$emit('close')">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BookOpen, X, Copy } from 'lucide-vue-next'
import { toast } from '@/utils/toast'
import { getSaveDataStructureForEnv } from '@/utils/prompts/definitions/dataDefinitions'
import { isTavernEnv } from '@/utils/tavern'

defineEmits<{
  close: []
}>()

const activeSection = ref('character')
const saveDataStructure = getSaveDataStructureForEnv(isTavernEnv())

const sections = [
  { id: 'character', title: '角色/状态' },
  { id: 'dao', title: '大道' },
  { id: 'inventory', title: '背包物品' },
  { id: 'relationships', title: '关系' },
  { id: 'world', title: '世界' },
  { id: 'event', title: '事件' }
]

const scrollToSection = (sectionId: string) => {
  activeSection.value = sectionId
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const copyAllFormats = async () => {
  try {
    await navigator.clipboard.writeText(saveDataStructure)
    toast.success('已复制完整数据格式说明')
  } catch (error) {
    console.error('复制失败:', error)
    toast.error('复制失败')
  }
}
</script>

<style scoped>
.format-guide-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
  padding: 20px;
}

.format-guide-modal {
  background: var(--color-surface);
  border-radius: 12px;
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.format-guide-content {
  display: flex;
  height: 100%;
}

.quick-nav {
  width: 180px;
  border-right: 1px solid var(--color-border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

.nav-btn {
  padding: 0.6rem 1rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  text-align: left;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.nav-btn.active {
  background: var(--color-primary);
  color: white;
}

.format-sections {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.format-section {
  margin-bottom: 2rem;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-primary);
  padding-bottom: 0.5rem;
}

.section-content h5 {
  margin: 1rem 0 0.5rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.code-block {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 1rem;
  margin: 0.5rem 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--color-text);
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.example-box {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-left: 3px solid var(--color-primary);
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
}

.example-box strong {
  color: var(--color-primary);
  display: block;
  margin-bottom: 0.5rem;
}

.warning-box {
  background: rgba(255, 193, 7, 0.1);
  border-left: 3px solid #ffc107;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
}

.warning-box strong {
  color: #ffc107;
  display: block;
  margin-bottom: 0.5rem;
}

.warning-box ul {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
}

.warning-box li {
  margin: 0.3rem 0;
  color: var(--color-text);
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

.copy-btn,
.close-footer-btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.copy-btn {
  background: var(--color-primary);
  color: white;
}

.copy-btn:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

.close-footer-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  margin-left: auto;
}

.close-footer-btn:hover {
  background: var(--color-surface-hover);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .format-guide-modal {
    max-width: 95vw;
    max-height: 95vh;
  }

  .format-guide-content {
    flex-direction: column;
  }

  .quick-nav {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    flex-direction: row;
    overflow-x: auto;
    padding: 0.75rem;
  }

  .nav-btn {
    white-space: nowrap;
  }

  .format-sections {
    padding: 1rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .close-footer-btn {
    margin-left: 0;
  }
}
</style>
