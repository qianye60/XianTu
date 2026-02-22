<template>
  <div class="region-map-panel">
    <!-- 顶部标题栏 -->
    <div class="region-header">
      <button class="back-btn" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="back-icon">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        返回世界地图
      </button>
      <div class="region-title">
        <span class="region-name">{{ regionMap.name }}</span>
        <span class="region-scale">{{ scaleLabel }}</span>
      </div>
    </div>

    <!-- 格子地图 -->
    <div class="grid-container">
      <div
        class="grid-map"
        :style="{
          display: 'grid',
          gridTemplateColumns: `repeat(${regionMap.gridWidth}, 1fr)`,
          gridTemplateRows: `repeat(${regionMap.gridHeight}, 1fr)`,
        }"
      >
        <!-- 按 y 从大到小、x 从小到大渲染（保证左下角为 1,1） -->
        <template v-for="row in renderRows" :key="row">
          <template v-for="col in regionMap.gridWidth" :key="`${col}-${row}`">
            <div
              class="grid-cell"
              :class="getCellClass(col, row)"
              @click="handleCellClick(col, row)"
            >
              <!-- 建筑内容 -->
              <template v-if="getBuildingAt(col, row)">
                <div class="building-content">
                  <div class="building-icon">{{ getBuildingIcon(getBuildingAt(col, row)!.type) }}</div>
                  <div class="building-name">{{ getBuildingAt(col, row)!.name }}</div>
                  <!-- 玩家图标 -->
                  <div v-if="isPlayerHere(col, row)" class="player-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="player-icon">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                  <!-- NPC 图标叠加 -->
                  <div v-if="getNpcsAt(col, row).length > 0" class="npc-badges">
                    <div
                      v-for="npc in getNpcsAt(col, row).slice(0, 3)"
                      :key="npc"
                      class="npc-dot"
                      :title="npc"
                    ></div>
                    <div v-if="getNpcsAt(col, row).length > 3" class="npc-dot more-npc">
                      +{{ getNpcsAt(col, row).length - 3 }}
                    </div>
                  </div>
                </div>
              </template>
              <!-- 空格子 -->
              <template v-else>
                <div class="empty-cell-inner"></div>
              </template>
            </div>
          </template>
        </template>
      </div>
    </div>

    <!-- 建筑详情浮窗 -->
    <Transition name="popup-fade">
      <div v-if="selectedBuilding" class="building-popup">
        <div class="popup-header">
          <span class="popup-icon">{{ getBuildingIcon(selectedBuilding.type) }}</span>
          <h4>{{ selectedBuilding.name }}</h4>
          <button class="popup-close" @click="selectedBuilding = null">×</button>
        </div>
        <div class="popup-body">
          <p v-if="selectedBuilding.description" class="popup-desc">{{ selectedBuilding.description }}</p>
          <p class="popup-type">{{ getBuildingTypeName(selectedBuilding.type) }}</p>
          <!-- NPC 列表 -->
          <div v-if="getNpcsByBuilding(selectedBuilding.id).length > 0" class="popup-npcs">
            <div class="popup-npcs-title">当前在此：</div>
            <div
              v-for="npc in getNpcsByBuilding(selectedBuilding.id)"
              :key="npc"
              class="popup-npc-tag"
            >{{ npc }}</div>
          </div>
          <!-- 玩家提示 -->
          <div v-if="isPlayerInBuilding(selectedBuilding.id)" class="popup-player-hint">
            📍 你当前在此
          </div>
        </div>
      </div>
    </Transition>

    <!-- 图例 -->
    <div class="map-legend">
      <div class="legend-item" v-for="item in legendItems" :key="item.type">
        <span class="legend-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </div>
      <div class="legend-item">
        <span class="legend-icon player-legend-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" class="player-icon-small">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </span>
        <span>你的位置</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import type { RegionMap, RegionBuilding, RegionBuildingType } from '@/types/gameMap';

// Props
const props = defineProps<{
  regionMap: RegionMap;
}>();

// Emits
const emit = defineEmits<{
  (e: 'close'): void;
}>();

const gameStateStore = useGameStateStore();

// 当前选中建筑
const selectedBuilding = ref<RegionBuilding | null>(null);

// ─── 坐标系转换（y 轴翻转：CSS Grid 从上到下，但游戏坐标 y 向上增大）

// 渲染行序（从 gridHeight 到 1，保证左下角为 1,1）
const renderRows = computed(() => {
  const rows: number[] = [];
  for (let y = props.regionMap.gridHeight; y >= 1; y--) {
    rows.push(y);
  }
  return rows;
});

// ─── 建筑查询

const buildingMap = computed(() => {
  const map = new Map<string, RegionBuilding>();
  for (const b of props.regionMap.buildings) {
    map.set(`${b.gridX},${b.gridY}`, b);
  }
  return map;
});

function getBuildingAt(x: number, y: number): RegionBuilding | null {
  return buildingMap.value.get(`${x},${y}`) ?? null;
}

// ─── 玩家 & NPC 位置

const playerBuildingId = computed(() => {
  const loc = gameStateStore.location as any;
  if (!loc?.regionId) return null;
  // regionId 可能是 linkedLocationId（地点名），也可能是旧格式的 regionMap.id
  const rid = loc.regionId;
  const isMatch = rid === props.regionMap.linkedLocationId || rid === props.regionMap.id;
  if (!isMatch) return null;
  return loc.buildingId ?? null;
});

function isPlayerHere(x: number, y: number): boolean {
  const building = getBuildingAt(x, y);
  if (!building || !playerBuildingId.value) return false;
  return building.id === playerBuildingId.value;
}

function isPlayerInBuilding(buildingId: string): boolean {
  return playerBuildingId.value === buildingId;
}

// 入口建筑 id（NPC 无精确 buildingId 时的默认落点）
const entranceBuildingId = computed(() => {
  return props.regionMap.buildings.find((b) => b.isEntrance)?.id
    ?? props.regionMap.buildings[0]?.id
    ?? null;
});

// NPC 按 buildingId 分组
// 匹配优先级：
//   1. 有 regionId + buildingId → 精确显示在对应格子
//   2. 有 regionId 匹配本区域但无 buildingId → 显示在入口
//   3. 无 regionId 但位置描述含地点名 → 显示在入口（世界地图 NPC 降级）
const npcsByBuilding = computed(() => {
  const map = new Map<string, string[]>();
  const relationships = gameStateStore.relationships;
  if (!relationships) return map;

  const locationName = props.regionMap.linkedLocationId; // 地点名，如"望海城"

  for (const [npcName, npcData] of Object.entries(relationships)) {
    const loc = (npcData as any)?.当前位置;
    if (!loc) continue;

    let targetBuildingId: string | null = null;

    if (loc.regionId) {
      // 情况 1 & 2：有 regionId
      const rid = loc.regionId;
      const isMatch = rid === locationName || rid === props.regionMap.id;
      if (!isMatch) continue;
      targetBuildingId = loc.buildingId ?? entranceBuildingId.value;
    } else {
      // 情况 3：无 regionId，通过位置描述判断是否在此地点
      // 描述格式：大陆·地点·建筑名，取最后一段作为建筑名匹配
      const desc: string = loc['描述'] ?? loc['description'] ?? '';
      if (!locationName || !desc.includes(locationName)) continue;

      // 尝试精确匹配建筑名（描述末段）
      const parts = desc.split('·');
      const buildingNameHint = parts[parts.length - 1]?.trim();
      const matched = buildingNameHint
        ? props.regionMap.buildings.find((b) => b.name === buildingNameHint || b.name.includes(buildingNameHint) || buildingNameHint.includes(b.name))
        : null;
      targetBuildingId = matched?.id ?? entranceBuildingId.value;
    }

    if (!targetBuildingId) continue;
    if (!map.has(targetBuildingId)) map.set(targetBuildingId, []);
    map.get(targetBuildingId)!.push(npcName);
  }
  return map;
});

function getNpcsByBuilding(buildingId: string): string[] {
  return npcsByBuilding.value.get(buildingId) ?? [];
}

function getNpcsAt(x: number, y: number): string[] {
  const building = getBuildingAt(x, y);
  if (!building) return [];
  return getNpcsByBuilding(building.id);
}

// ─── 格子样式

function getCellClass(x: number, y: number) {
  const building = getBuildingAt(x, y);
  const classes: Record<string, boolean> = {
    'has-building': !!building,
    'is-entrance': !!building?.isEntrance,
    'is-player': isPlayerHere(x, y),
    'has-npc': getNpcsAt(x, y).length > 0,
    'is-selected': !!building && selectedBuilding.value?.id === building.id,
  };
  if (building) {
    classes[`type-${building.type}`] = true;
  }
  return classes;
}

function handleCellClick(x: number, y: number) {
  const building = getBuildingAt(x, y);
  if (!building) {
    selectedBuilding.value = null;
    return;
  }
  selectedBuilding.value = selectedBuilding.value?.id === building.id ? null : building;
}

// ─── 图标 & 文字

const buildingIcons: Record<RegionBuildingType, string> = {
  entrance: '🚪',
  main: '🏛️',
  residential: '🏠',
  functional: '⚗️',
  restricted: '🔒',
  wilderness: '🌿',
};

const buildingTypeNames: Record<RegionBuildingType, string> = {
  entrance: '入口',
  main: '主体建筑',
  residential: '居所',
  functional: '功能建筑',
  restricted: '禁区',
  wilderness: '自然地形',
};

function getBuildingIcon(type: RegionBuildingType): string {
  return buildingIcons[type] ?? '🏠';
}

function getBuildingTypeName(type: RegionBuildingType): string {
  return buildingTypeNames[type] ?? type;
}

const legendItems = [
  { type: 'entrance', icon: '🚪', label: '入口' },
  { type: 'main', icon: '🏛️', label: '主体建筑' },
  { type: 'residential', icon: '🏠', label: '居所' },
  { type: 'functional', icon: '⚗️', label: '功能建筑' },
  { type: 'restricted', icon: '🔒', label: '禁区' },
  { type: 'wilderness', icon: '🌿', label: '自然地形' },
];

const scaleLabel = computed(() => `${props.regionMap.gridWidth}×${props.regionMap.gridHeight} 格`);
</script>

<style scoped>
/* ─── 整体面板 ─────────────────────────────────────────────────────── */
.region-map-panel {
  position: absolute;
  inset: 0;
  background: var(--color-bg-primary, #0d1117);
  display: flex;
  flex-direction: column;
  z-index: 100;
  border-radius: 8px;
  overflow: hidden;
}

/* ─── 顶部标题栏 ───────────────────────────────────────────────────── */
.region-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
.back-icon {
  width: 15px;
  height: 15px;
}

.region-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.region-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}
.region-scale {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

/* ─── 格子地图容器 ─────────────────────────────────────────────────── */
.grid-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: auto;
}

.grid-map {
  width: min(90%, 540px);
  aspect-ratio: 1;
  gap: 3px;
}

/* ─── 格子单元 ─────────────────────────────────────────────────────── */
.grid-cell {
  position: relative;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
}

.grid-cell:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
}

.grid-cell.has-building {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
}
.grid-cell.has-building:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.02);
}

/* 建筑类型色彩 */
.grid-cell.type-entrance  { border-color: rgba(100, 200, 120, 0.5); background: rgba(100, 200, 120, 0.06); }
.grid-cell.type-main      { border-color: rgba(200, 160,  60, 0.5); background: rgba(200, 160,  60, 0.06); }
.grid-cell.type-residential{ border-color: rgba(100, 160, 230, 0.5); background: rgba(100, 160, 230, 0.06); }
.grid-cell.type-functional { border-color: rgba(180,  90, 220, 0.5); background: rgba(180,  90, 220, 0.06); }
.grid-cell.type-restricted { border-color: rgba(220,  80,  80, 0.5); background: rgba(220,  80,  80, 0.06); }
.grid-cell.type-wilderness { border-color: rgba(80, 180, 100, 0.4);  background: rgba(40, 120,  60, 0.08); }

.grid-cell.is-selected {
  transform: scale(1.04);
  border-color: rgba(255, 220, 80, 0.8) !important;
  box-shadow: 0 0 8px rgba(255, 220, 80, 0.3);
  z-index: 2;
}

.grid-cell.is-player {
  box-shadow: 0 0 10px rgba(100, 200, 255, 0.5);
}

/* ─── 建筑内容 ─────────────────────────────────────────────────────── */
.building-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 2px;
  padding: 2px;
  position: relative;
}

.building-icon {
  font-size: clamp(14px, 3vw, 22px);
  line-height: 1;
}

.building-name {
  font-size: clamp(8px, 1.2vw, 11px);
  color: rgba(255, 255, 255, 0.75);
  text-align: center;
  word-break: break-all;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
}

/* ─── 玩家图标 ──────────────────────────────────────────────────────── */
.player-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(100, 200, 255, 0.9);
  border-radius: 50%;
  width: clamp(12px, 2vw, 18px);
  height: clamp(12px, 2vw, 18px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.player-icon {
  width: 70%;
  height: 70%;
  fill: #fff;
}

/* ─── NPC 头像 ──────────────────────────────────────────────────────── */
.npc-badges {
  position: absolute;
  bottom: 2px;
  right: 2px;
  display: flex;
  gap: 1px;
}
.npc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 180, 80, 0.9);
}
.more-npc {
  background: rgba(200, 120, 50, 0.9);
  width: auto;
  border-radius: 3px;
  padding: 0 2px;
  font-size: 8px;
  color: #fff;
  line-height: 6px;
}

/* ─── 建筑浮窗 ──────────────────────────────────────────────────────── */
.building-popup {
  position: absolute;
  bottom: 56px;
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  background: rgba(20, 28, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  backdrop-filter: blur(12px);
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.popup-icon { font-size: 18px; }
.popup-header h4 {
  margin: 0;
  flex: 1;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}
.popup-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
}
.popup-close:hover { color: rgba(255, 255, 255, 0.9); }

.popup-body { padding: 10px 12px; }
.popup-type {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0 0 6px;
}
.popup-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 8px;
  line-height: 1.5;
}

.popup-npcs-title {
  font-size: 11px;
  color: rgba(255, 180, 80, 0.8);
  margin-bottom: 4px;
}
.popup-npcs { margin-bottom: 6px; }
.popup-npc-tag {
  display: inline-block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 180, 80, 0.12);
  border: 1px solid rgba(255, 180, 80, 0.3);
  border-radius: 4px;
  padding: 1px 6px;
  margin: 2px 2px 0 0;
}

.popup-player-hint {
  font-size: 11px;
  color: rgba(100, 200, 255, 0.8);
  margin-top: 4px;
}

/* ─── 图例 ──────────────────────────────────────────────────────────── */
.map-legend {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}
.legend-icon { font-size: 13px; }
.player-legend-icon {
  display: flex;
  align-items: center;
  width: 14px;
  height: 14px;
  background: rgba(100, 200, 255, 0.9);
  border-radius: 50%;
}
.player-icon-small {
  width: 10px;
  height: 10px;
  fill: #fff;
  margin: auto;
}

/* ─── 动画 ──────────────────────────────────────────────────────────── */
.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
