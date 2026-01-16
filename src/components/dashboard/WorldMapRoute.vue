<template>
  <div class="world-map-route">
    <!-- 默认显示图形地图，可切换到文字模式 -->
    <GameMapPanel
      v-if="!showTextMode"
      :is-online="isOnlineTraveling"
      @toggle-text-mode="showTextMode = true"
    />
    <OnlineTravelMapPanel
      v-else
      @toggle-graphic-mode="showTextMode = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import GameMapPanel from '@/components/dashboard/GameMapPanel.vue';
import OnlineTravelMapPanel from '@/components/dashboard/OnlineTravelMapPanel.vue';

const gameStateStore = useGameStateStore();

// 默认显示图形地图
const showTextMode = ref(false);

const isOnlineTraveling = computed(() => {
  const online = gameStateStore.onlineState as any;
  const result = online?.模式 === '联机' && !!online?.房间ID;
  console.log('[WorldMapRoute] isOnlineTraveling:', result, { 模式: online?.模式, 房间ID: online?.房间ID });
  return result;
});
</script>

<style scoped>
.world-map-route {
  width: 100%;
  height: 100%;
}
</style>
