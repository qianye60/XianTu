<!-- src/components/game-view/WorldHeader.vue -->
<template>
  <div class="world-status">
    <span>{{ state.time }}</span>
    <span>|</span>
    <span>{{ state.location }}</span>
  </div>
</template>

<script setup lang="ts">
export interface WorldState {
  time: string;
  location: string;
}

const props = defineProps<{
  state: WorldState;
}>();
</script>

<style scoped>
.world-status {
  display: flex;
  gap: 1rem;
  font-size: 0.9em;
  color: #a0a0a0;
}
</style>