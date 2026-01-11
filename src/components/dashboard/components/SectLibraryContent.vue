<template>
  <div class="sect-library">
    <!-- 玩家信息栏 -->
    <div class="player-info-bar">
      <div class="info-item">
        <span class="info-label">职位</span>
        <span class="info-value position">{{ playerPosition }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">贡献点</span>
        <span class="info-value contribution">{{ playerContribution }}</span>
      </div>
    </div>

    <!-- 藏经阁分层 -->
    <div class="library-floors">
      <div
        v-for="floor in libraryFloors"
        :key="floor.level"
        class="floor-section"
        :class="{ locked: !floor.accessible, expanded: expandedFloor === floor.level }"
      >
        <div class="floor-header" @click="toggleFloor(floor)">
          <div class="floor-info">
            <span class="floor-icon">{{ floor.icon }}</span>
            <span class="floor-name">{{ floor.name }}</span>
            <span class="floor-requirement">{{ floor.requirement }}</span>
          </div>
          <div class="floor-status">
            <Lock v-if="!floor.accessible" :size="16" />
            <ChevronDown v-else :size="16" :class="{ rotated: expandedFloor === floor.level }" />
          </div>
        </div>

        <transition name="slide">
          <div v-if="expandedFloor === floor.level && floor.accessible" class="floor-content">
            <div v-if="floor.techniques.length === 0" class="empty-floor">
              <BookOpen :size="32" class="empty-icon" />
              <p>此层暂无可学功法</p>
              <p class="hint">功法将由AI根据剧情生成</p>
            </div>
            <div v-else class="technique-list">
              <div
                v-for="tech in floor.techniques"
                :key="tech.id"
                class="technique-card"
                :class="{ owned: tech.owned, 'can-afford': tech.canAfford && !tech.owned }"
              >
                <div class="tech-header">
                  <span class="tech-name">{{ tech.name }}</span>
                  <span class="tech-quality" :class="getQualityClass(tech.quality)">
                    {{ tech.quality }}
                  </span>
                </div>
                <p class="tech-desc">{{ tech.description }}</p>
                <div class="tech-footer">
                  <span class="tech-cost">
                    <Coins :size="14" />
                    {{ tech.cost }} 贡献
                  </span>
                  <button
                    v-if="!tech.owned"
                    class="learn-btn"
                    :disabled="!tech.canAfford"
                    @click="learnTechnique(tech)"
                  >
                    {{ tech.canAfford ? '学习' : '贡献不足' }}
                  </button>
                  <span v-else class="owned-badge">已学习</span>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="library-tips">
      <Info :size="14" />
      <span>功法需要通过游戏剧情获取或让AI生成，此处展示已有功法供兑换学习</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { Lock, ChevronDown, BookOpen, Coins, Info } from 'lucide-vue-next';
import { toast } from '@/utils/toast';
import { sendChat } from '@/utils/chatBus';

const gameStateStore = useGameStateStore();
const expandedFloor = ref<number | null>(1);

// 职位等级映射
const positionLevels: Record<string, number> = {
  '记名弟子': 0,
  '外门弟子': 1,
  '内门弟子': 2,
  '真传弟子': 3,
  '核心弟子': 4,
  '长老': 5,
  '太上长老': 6
};

// 玩家宗门信息
const playerSectInfo = computed(() => gameStateStore.sectMemberInfo);
const playerPosition = computed(() => playerSectInfo.value?.职位 || '散修');
const playerContribution = computed(() => playerSectInfo.value?.贡献 || 0);
const playerPositionLevel = computed(() => positionLevels[playerPosition.value] ?? -1);

// 获取背包中的功法
const ownedTechniqueIds = computed(() => {
  const items = gameStateStore.inventory?.物品 || {};
  return Object.values(items)
    .filter((item: any) => item.类型 === '功法')
    .map((item: any) => item.物品ID);
});

// 藏经阁分层数据
const libraryFloors = computed(() => {
  const techniques = getAvailableTechniques();

  return [
    {
      level: 1,
      name: '第一层',
      icon: '📖',
      requirement: '外门弟子可入',
      minPosition: 1,
      accessible: playerPositionLevel.value >= 1,
      techniques: techniques.filter(t => ['凡', '黄'].includes(t.qualityTier))
    },
    {
      level: 2,
      name: '第二层',
      icon: '📚',
      requirement: '内门弟子可入',
      minPosition: 2,
      accessible: playerPositionLevel.value >= 2,
      techniques: techniques.filter(t => t.qualityTier === '玄')
    },
    {
      level: 3,
      name: '第三层',
      icon: '📜',
      requirement: '真传弟子可入',
      minPosition: 3,
      accessible: playerPositionLevel.value >= 3,
      techniques: techniques.filter(t => t.qualityTier === '地')
    },
    {
      level: 4,
      name: '禁区密库',
      icon: '🔮',
      requirement: '核心弟子+长老令牌',
      minPosition: 4,
      accessible: playerPositionLevel.value >= 4,
      techniques: techniques.filter(t => ['天', '仙', '神'].includes(t.qualityTier))
    }
  ];
});

type LibraryTechnique = {
  id: string;
  name: string;
  quality: string;
  qualityTier: string;
  cost: number;
  description: string;
  owned: boolean;
  canAfford: boolean;
};

const extractQualityTier = (quality: string) => {
  const match = quality.match(/[凡黄玄地天仙神]/);
  return match ? match[0] : '凡';
};

// 获取可用功法列表（来自宗门系统）
function getAvailableTechniques(): LibraryTechnique[] {
  const sectName = playerSectInfo.value?.宗门名称;
  if (!sectName) return [];

  const rawTechniques = gameStateStore.sectSystem?.宗门藏经阁?.[sectName];
  if (!Array.isArray(rawTechniques)) return [];

  return rawTechniques.map((raw: any, index: number) => {
    const id = raw?.id || raw?.物品ID || `sect_tech_${index}`;
    const name = raw?.name || raw?.名称 || '未知功法';
    const quality = raw?.quality || raw?.品质 || '凡品';
    const qualityTier = raw?.qualityTier || extractQualityTier(String(quality));
    const cost = Number(raw?.cost ?? raw?.价格 ?? 0);
    const description = raw?.description || raw?.描述 || '';

    return {
      id,
      name,
      quality,
      qualityTier,
      cost,
      description,
      owned: ownedTechniqueIds.value.includes(id),
      canAfford: playerContribution.value >= cost,
    };
  });
}

function toggleFloor(floor: { level: number; accessible: boolean }) {
  if (!floor.accessible) {
    toast.warning('职位不足，无法进入此层');
    return;
  }
  expandedFloor.value = expandedFloor.value === floor.level ? null : floor.level;
}

function getQualityClass(quality: string): string {
  if (quality.includes('凡')) return 'quality-common';
  if (quality.includes('黄')) return 'quality-yellow';
  if (quality.includes('玄')) return 'quality-xuan';
  if (quality.includes('地')) return 'quality-earth';
  if (quality.includes('天')) return 'quality-heaven';
  return 'quality-common';
}

function learnTechnique(tech: { id: string; name: string; cost: number }) {
  const promptText = `我想用${tech.cost}贡献点在藏经阁学习「${tech.name}」`;
  sendChat(promptText);
  toast.success('已发送到对话');
}
</script>

<style scoped>
.sect-library {
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

.info-value.position {
  color: #9333ea;
}

.info-value.contribution {
  color: #f59e0b;
}

.library-floors {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.floor-section {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.floor-section.locked {
  opacity: 0.6;
}

.floor-section.expanded {
  border-color: rgba(147, 51, 234, 0.3);
}

.floor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--color-background);
  cursor: pointer;
  transition: background 0.2s;
}

.floor-header:hover {
  background: var(--color-surface);
}

.floor-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.floor-icon {
  font-size: 1.25rem;
}

.floor-name {
  font-weight: 600;
  color: var(--color-text);
}

.floor-requirement {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.floor-status {
  color: var(--color-text-secondary);
}

.floor-status svg.rotated {
  transform: rotate(180deg);
}

.floor-content {
  padding: 1rem;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.empty-floor {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 0.5rem;
}

.hint {
  font-size: 0.8rem;
  opacity: 0.7;
}

.technique-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.technique-card {
  padding: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.technique-card.can-afford {
  border-color: rgba(34, 197, 94, 0.3);
}

.technique-card.owned {
  opacity: 0.7;
  border-color: rgba(147, 51, 234, 0.3);
}

.tech-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.tech-name {
  font-weight: 600;
  color: var(--color-text);
}

.tech-quality {
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}

.quality-common { background: rgba(156, 163, 175, 0.2); color: #6b7280; }
.quality-yellow { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.quality-xuan { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.quality-earth { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.quality-heaven { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.tech-desc {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.tech-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tech-cost {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #f59e0b;
  font-weight: 500;
}

.learn-btn {
  padding: 0.35rem 0.75rem;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.learn-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.learn-btn:disabled {
  background: #6b7280;
  cursor: not-allowed;
}

.owned-badge {
  font-size: 0.75rem;
  color: #9333ea;
  font-weight: 500;
}

.library-tips {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  font-size: 0.75rem;
  color: #3b82f6;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding: 0 1rem;
}
</style>
