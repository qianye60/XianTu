<template>
  <div class="sect-members">
    <!-- 我的宗门身份 -->
    <div class="my-sect-identity">
      <div class="identity-header">
        <Crown :size="16" />
        <span>我的宗门身份</span>
      </div>
      <div class="identity-content">
        <div class="identity-stats">
          <div class="stat-item">
            <span class="stat-label">所属宗门</span>
            <span class="stat-value sect-name">{{ playerSectName }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">职位</span>
            <span class="stat-value position">{{ playerPosition }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">贡献点</span>
            <span class="stat-value contribution">{{ playerContribution }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">声望</span>
            <span class="stat-value reputation">{{ playerReputation }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">加入时间</span>
            <span class="stat-value join-date">{{ formatJoinDate(playerJoinDate) }}</span>
          </div>
        </div>
        <div class="identity-actions">
          <button class="quick-action-btn" @click="goToTab('SectContribution')">
            <Coins :size="14" />
            <span>贡献兑换</span>
          </button>
          <button class="quick-action-btn" @click="goToTab('SectLibrary')">
            <BookOpen :size="14" />
            <span>宗门藏书</span>
          </button>
          <button class="leave-sect-btn" @click="requestLeaveSect">
            <LogOut :size="14" />
            <span>退出宗门</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 宗门领导层（来自势力信息/宗门档案，不依赖NPC关系） -->
    <div class="leadership-card" v-if="playerSectName !== '未加入宗门'">
      <div class="leadership-header">
        <div class="leadership-title">
          <Crown :size="14" />
          <span>宗门高层</span>
        </div>
        <button v-if="!sectLeadership" class="ask-btn small" @click="sendPrompt(`请告诉我${playerSectName}的宗主、副宗主、太上长老、主要长老，以及他们的修为与性格特点`)">
          <MessageCircle :size="14" />
          <span>询问高层</span>
        </button>
      </div>

      <div v-if="sectLeadership" class="leadership-grid">
        <div class="leader-item primary">
          <span class="role">宗主</span>
          <span class="name">{{ sectLeadership.宗主 }}</span>
          <span class="realm" v-if="sectLeadership.宗主修为">{{ sectLeadership.宗主修为 }}</span>
          <button class="link" @click="sendPrompt(`我想拜见${playerSectName}宗主「${sectLeadership.宗主}」`)">拜见</button>
        </div>
        <div class="leader-item" v-if="sectLeadership.副宗主">
          <span class="role">副宗主</span>
          <span class="name">{{ sectLeadership.副宗主 }}</span>
          <button class="link" @click="sendPrompt(`我想向${playerSectName}副宗主「${sectLeadership.副宗主}」请教`)">请教</button>
        </div>
        <div class="leader-item" v-if="sectLeadership.太上长老">
          <span class="role">太上长老</span>
          <span class="name">{{ sectLeadership.太上长老 }}</span>
          <span class="realm" v-if="sectLeadership.太上长老修为">{{ sectLeadership.太上长老修为 }}</span>
          <button class="link" @click="sendPrompt(`我想拜见${playerSectName}太上长老「${sectLeadership.太上长老}」`)">拜见</button>
        </div>
        <div class="leader-item" v-if="sectLeadership.长老数量">
          <span class="role">长老数量</span>
          <span class="name">{{ sectLeadership.长老数量 }}位</span>
        </div>
        <div class="leader-item" v-if="sectLeadership.最强修为">
          <span class="role">最强修为</span>
          <span class="name">{{ sectLeadership.最强修为 }}</span>
        </div>
        <div class="leader-item" v-if="sectLeadership.综合战力">
          <span class="role">战力</span>
          <span class="name">{{ sectLeadership.综合战力 }}/100</span>
        </div>
      </div>

      <div v-else class="leadership-empty">
        <span>暂无宗门高层信息（可在“宗门概览”生成势力信息，或点击上方“询问高层”）</span>
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


    <!-- 提示信息 -->
    <div class="members-notice">
      <Info :size="14" />
      <span>同门关系会影响游戏发展，可在对话中与同门互动</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStateStore } from '@/stores/gameStateStore';
import {
  Users, MessageCircle, ChevronRight, Zap, Heart, Info,
  Crown, User, UserCircle, Coins, BookOpen, LogOut
} from 'lucide-vue-next';
import { toast } from '@/utils/toast';
import { sendChat } from '@/utils/chatBus';

const router = useRouter();
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
const playerContribution = computed(() => playerSectInfo.value?.贡献 || 0);
const playerReputation = computed(() => playerSectInfo.value?.声望 || 0);
const playerJoinDate = computed(() => playerSectInfo.value?.加入日期 || '');

// 格式化加入日期
function formatJoinDate(dateStr: string | undefined): string {
  if (!dateStr) return '未知';
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return dateStr;
  }
}

// 跳转到指定标签页
function goToTab(tabName: string) {
  router.push({ name: tabName });
}

// 退出宗门
function requestLeaveSect() {
  if (!playerSectInfo.value?.宗门名称) {
    toast.error('你还未加入任何宗门');
    return;
  }
  // 清空宗门信息
  gameStateStore.sectMemberInfo = null;
  toast.success('已退出宗门');
}

const currentSectFaction = computed(() => {
  const sectName = String(playerSectName.value || '').trim();
  if (!sectName || sectName === '未加入宗门') return null;
  const fromSystem = (gameStateStore.sectSystem as any)?.宗门档案?.[sectName] ?? null;
  if (fromSystem) return fromSystem;
  const list = gameStateStore.worldInfo?.势力信息;
  if (!Array.isArray(list)) return null;
  return (list as any[]).find((f) => f?.名称 === sectName) ?? null;
});

const sectLeadership = computed(() => {
  const leadership = currentSectFaction.value?.领导层;
  if (!leadership || typeof leadership !== 'object') return null;
  const master = String((leadership as any).宗主 || '').trim();
  if (!master) return null;
  return leadership as any;
});

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
  if (position.includes('宗主') || position.includes('掌门')) return '长老';
  if (position.includes('副宗主') || position.includes('副掌门')) return '长老';
  if (position.includes('长老') || position.includes('太上')) return '长老';
  if (position.includes('真传') || position.includes('核心')) return '真传';
  return '同辈';
}

// 职位样式
function getPositionClass(position: string): string {
  if (position.includes('宗主') || position.includes('掌门')) return 'position-leader';
  if (position.includes('副宗主') || position.includes('副掌门')) return 'position-leader';
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
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 8px;
}

/* 我的宗门身份卡片 - 紧凑版 */
.my-sect-identity {
  border: 1px solid rgba(147, 51, 234, 0.25);
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.08), rgba(168, 85, 247, 0.03));
  border-radius: 8px;
  padding: 8px 10px;
  flex-shrink: 0;
}

.identity-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.85rem;
  color: #9333ea;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(147, 51, 234, 0.15);
}

.identity-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.identity-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--color-background);
  border-radius: 4px;
  border: 1px solid var(--color-border);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.stat-value {
  font-weight: 600;
  font-size: 0.78rem;
}

.stat-value.sect-name { color: var(--color-text); }
.stat-value.position { color: #9333ea; }
.stat-value.contribution { color: #f59e0b; }
.stat-value.reputation { color: #3b82f6; }
.stat-value.join-date { color: var(--color-text-secondary); font-size: 0.72rem; }

.identity-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-action-btn:hover {
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}

.leave-sect-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
  color: #ef4444;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: auto;
}

.leave-sect-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.5);
}

.leadership-card {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.leadership-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.leadership-title {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.leadership-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.leader-item {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
}

.leader-item.primary {
  border-color: rgba(168, 85, 247, 0.35);
  background: rgba(168, 85, 247, 0.06);
}

.leader-item .role {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.leader-item .name {
  font-weight: 700;
  color: var(--color-text);
}

.leader-item .realm {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.leader-item .link {
  border: none;
  background: transparent;
  color: #9333ea;
  cursor: pointer;
  font-size: 0.72rem;
  padding: 0;
  margin-left: 4px;
}

.leader-item .link:hover {
  text-decoration: underline;
}

.leadership-empty {
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.ask-btn.small {
  padding: 4px 8px;
  font-size: 0.72rem;
}

.position-leader {
  background: rgba(168, 85, 247, 0.12);
  border-color: rgba(168, 85, 247, 0.35);
  color: #a855f7;
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
  gap: 4px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 4px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-size: 0.72rem;
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
  font-size: 0.65rem;
  padding: 0 0.3rem;
  border-radius: 8px;
  font-weight: 600;
}

.member-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.empty-state {
  text-align: center;
  padding: 1.5rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 0.4rem;
}

.empty-text {
  font-weight: 600;
  margin-bottom: 0.2rem;
  font-size: 0.85rem;
}

.empty-hint {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-bottom: 0.75rem;
}

.ask-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.8rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 0.78rem;
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
  gap: 4px;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 6px 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
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
  width: 32px;
  height: 32px;
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
  font-size: 0.85rem;
}

.gender-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 0.55rem;
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
  gap: 0.4rem;
  margin-bottom: 0.15rem;
}

.member-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.82rem;
}

.member-position {
  font-size: 0.65rem;
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
  font-weight: 500;
}

.position-elder { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.position-true { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.position-inner { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.position-outer { background: rgba(107, 114, 128, 0.1); color: #6b7280; }

.member-details {
  display: flex;
  gap: 0.6rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.7rem;
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
  gap: 0.4rem;
  padding: 4px 8px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
  font-size: 0.7rem;
  color: #3b82f6;
  flex-shrink: 0;
}
</style>
