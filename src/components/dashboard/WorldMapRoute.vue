<template>
  <OnlineTravelMapPanel v-if="isOnlineTraveling" />
  <GameMapPanel v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import GameMapPanel from '@/components/dashboard/GameMapPanel.vue';
import OnlineTravelMapPanel from '@/components/dashboard/OnlineTravelMapPanel.vue';

const gameStateStore = useGameStateStore();

const isOnlineTraveling = computed(() => {
  const online = gameStateStore.onlineState as any;
  return online?.模式 === '联机' && !!online?.房间ID;
});
</script>

