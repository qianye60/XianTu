<template>
  <div class="sect-members">
    <!-- 玩家信息栏 -->
    <div class="player-info-bar">
      <div class="info-item">
        <span class="info-label">所属宗门</span>
        <span class="info-value sect-name">{{ playerSectName }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">我的职位</span>
        <span class="info-value position">{{ playerPosition }}</span>
      </div>
    </div>

    <!-- 成员分类 -->
    <div class="member-tabs">
      <button
        v-for="tab in memberTabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" :size="14" />
        <span>{{ tab.label }}</span>
        <span v-if="getMemberCount(tab.key) > 0" class="count-badge">{{ getMemberCount(tab.key) }}</span>
      </button>
    </div>

    <!-- 成员列表 -->
    <div class="member-list">
      <div v-if="filteredMembers.length === 0" class="empty-state">
        <Users :size="48" class="empty-icon" />
        <p class="empty-text">暂无同门信息</p>
        <p class="empty-hint">同门信息由AI根据剧情生成</p>
        <button class="ask-btn" @click="sendPrompt('请告诉我宗门有哪些师兄弟姐妹')">
          <MessageCircle :size="14" />
          <span>询问同门信息</span>
        </button>
      </div>

      <div v-else class="members">
        <div
          v-for="member in filteredMembers"
          :key="member.id"
          class="member-card"
          :class="{ 'is-self': member.isSelf }"
          @click="selectMember(member)"
        >
          <div class="member-avatar">
            <span class="avatar-text">{{ member.name.charAt(0) }}</span>
            <span class="gender-badge" :class="member.gender === '女' ? 'female' : 'male'">
              {{ member.gender === '女' ? '♀' : '♂' }}
            </span>
          </div>

          <div class="member-info">
            <div class="member-header">
              <span class="member-name">{{ member.name }}</span>
              <span class="member-position" :class="getPositionClass(member.position)">
                {{ member.position }}
              </span>
            </div>
            <div class="member-details">
              <span class="detail-item realm">
                <Zap :size="12" />
                {{ member.realm }}
              </span>
              <span class="detail-item relation" :class="getRelationClass(member.relation)">
                <Heart :size="12" />
                {{ member.relation }}
              </span>
            </div>
          </div>

          <ChevronRight :size="16" class="arrow-icon" />
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <h4 class="actions-title">
        <MessageCircle :size="14" />
        <span>快捷对话</span>
      </h4>
      <div class="action-buttons">
        <button class="action-btn" @click="sendPrompt('我想找同门切磋修炼')">
          <Swords :size="14" />
          <span>邀请切磋</span>
        </button>
        <button class="action-btn" @click="sendPrompt('我想请教师兄修炼心得')">
          <BookOpen :size="14" />
          <span>请教修炼</span>
        </button>
        <button class="action-btn" @click="sendPrompt('我想和同门一起探险')">
          <Compass :size="14" />
          <span>组队探险</span>
        </button>
        <button class="action-btn" @click="sendPrompt('我想了解宗门最近有什么消息')">
          <Bell :size="14" />
          <span>宗门消息</span>
        </button>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="members-notice">
      <Info :size="14" />
      <span>同门关系会影响游戏发展，可在对话中与同门互动</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import {
  Users, MessageCircle, ChevronRight, Zap, Heart, Info,
  Swords, BookOpen, Compass, Bell, Crown, User, UserCircle
} from 'lucide-vue-next';
import { toast } from '@/utils/toast';
import { sendChat } from '@/utils/chatBus';

const gameStateStore = useGameStateStore();
const activeTab = ref<string>('all');

// 成员分类
const memberTabs = [
  { key: 'all', label: '全部', icon: Users },
  { key: '长老', label: '长老', icon: Crown },
  { key: '真传', label: '真传', icon: UserCircle },
  { key: '同辈', label: '同辈', icon: User }
];

// 玩家宗门信息
const playerSectInfo = computed(() => gameStateStore.sectMemberInfo);
const playerSectName = computed(() => playerSectInfo.value?.宗门名称 || '未加入宗门');
const playerPosition = computed(() => playerSectInfo.value?.职位 || '散修');

// 从人物关系中获取同门
const sectMembers = computed(() => {
  const relations = gameStateStore.relationships || {};

  // 筛选同门NPC
  return Object.entries(relations)
    .filter(([_, npc]: [string, any]) => {
      // 检查是否属于同一宗门
      const npcSect = npc.势力归属 || npc.宗门;
      return npcSect === playerSectName.value;
    })
    .map(([name, npc]: [string, any]) => ({
      id: name,
      name: npc.名字 || name,
      gender: npc.性别 || '男',
      position: npc.职位 || '弟子',
      realm: formatRealm(npc.境界),
      relation: getRelationText(npc.好感度),
      favorability: npc.好感度 || 50,
      isSelf: false,
      category: getCategory(npc.职位)
    }));
});

// 过滤后的成员
const filteredMembers = computed(() => {
  if (activeTab.value === 'all') return sectMembers.value;
  return sectMembers.value.filter(m => m.category === activeTab.value);
});

// 获取各分类成员数量
function getMemberCount(tabKey: string): number {
  if (tabKey === 'all') return sectMembers.value.length;
  return sectMembers.value.filter(m => m.category === tabKey).length;
}

// 格式化境界
function formatRealm(realm: any): string {
  if (!realm) return '未知';
  if (typeof realm === 'string') return realm;
  if (typeof realm === 'object') {
    return `${realm.名称 || ''}${realm.阶段 || ''}`;
  }
  return '未知';
}

// 好感度转关系文本
function getRelationText(favorability: number | undefined): string {
  const fav = favorability || 50;
  if (fav >= 90) return '挚友';
  if (fav >= 75) return '好友';
  if (fav >= 60) return '友好';
  if (fav >= 40) return '普通';
  if (fav >= 20) return '冷淡';
  return '敌视';
}

// 获取成员分类
function getCategory(position: string | undefined): string {
  if (!position) return '同辈';
  if (position.includes('长老') || position.includes('太上')) return '长老';
  if (position.includes('真传') || position.includes('核心')) return '真传';
  return '同辈';
}

// 职位样式
function getPositionClass(position: string): string {
  if (position.includes('长老')) return 'position-elder';
  if (position.includes('真传')) return 'position-true';
  if (position.includes('内门')) return 'position-inner';
  return 'position-outer';
}

// 关系样式
function getRelationClass(relation: string): string {
  const classMap: Record<string, string> = {
    '挚友': 'relation-best',
    '好友': 'relation-good',
    '友好': 'relation-friendly',
    '普通': 'relation-normal',
    '冷淡': 'relation-cold',
    '敌视': 'relation-hostile'
  };
  return classMap[relation] || 'relation-normal';
}

// 选择成员
function selectMember(member: { name: string }) {
  const prompt = `我想和${member.name}交谈`;
  sendPrompt(prompt);
}

function sendPrompt(text: string) {
  sendChat(text);
  toast.success('已发送到对话');
}
</script>

<style scoped>
.sect-members {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 60vh;
  overflow-y: auto;
}

.player-info-bar {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(168, 85, 247, 0.05));
  border-radius: 8px;
  border: 1px solid rgba(147, 51, 234, 0.2);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.info-value {
  font-weight: 600;
  font-size: 0.9rem;
}

.info-value.sect-name { color: var(--color-text); }
.info-value.position { color: #9333ea; }

.member-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: rgba(59, 130, 246, 0.3);
  color: var(--color-text);
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));
  border-color: rgba(59, 130, 246, 0.4);
  color: #3b82f6;
}

.count-badge {
  background: #3b82f6;
  color: white;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-weight: 600;
}

.member-list {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 0.5rem;
}

.empty-text {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.empty-hint {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 1rem;
}

.ask-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ask-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.members {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.member-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  background: var(--color-surface);
}

.member-card.is-self {
  border-color: rgba(147, 51, 234, 0.3);
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.05), rgba(168, 85, 247, 0.02));
}

.member-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  color: white;
  font-weight: 600;
  font-size: 1rem;
}

.gender-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-background);
}

.gender-badge.male {
  background: #3b82f6;
  color: white;
}

.gender-badge.female {
  background: #ec4899;
  color: white;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.member-name {
  font-weight: 600;
  color: var(--color-text);
}

.member-position {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}

.position-elder { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.position-true { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.position-inner { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.position-outer { background: rgba(107, 114, 128, 0.1); color: #6b7280; }

.member-details {
  display: flex;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.detail-item.realm { color: #8b5cf6; }

.relation-best { color: #ec4899 !important; }
.relation-good { color: #f59e0b !important; }
.relation-friendly { color: #22c55e !important; }
.relation-normal { color: var(--color-text-secondary) !important; }
.relation-cold { color: #6b7280 !important; }
.relation-hostile { color: #ef4444 !important; }

.arrow-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.quick-actions {
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.actions-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.05);
  color: #3b82f6;
}

.members-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  font-size: 0.75rem;
  color: #3b82f6;
}
</style>
