<template>
  <g class="map-icon">
    <!-- 名山大川 -->
    <g v-if="type === 'natural_landmark'">
      <path d="M3 20h18L12 4z" :fill="color" opacity="0.6" />
      <path d="M5 16l4-8 3 6 4-4 3 6H5z" :fill="color" />
    </g>
    <!-- 宗门势力 -->
    <g v-else-if="type === 'sect_power'">
      <rect x="2" y="8" width="20" height="12" :fill="color" />
      <path d="M2 8L12 2l10 6" :fill="color" opacity="0.7" />
      <rect x="10" y="12" width="4" height="8" fill="white" />
    </g>
    <!-- 城镇坊市 -->
    <g v-else-if="type === 'city_town'">
      <rect x="2" y="10" width="20" height="10" :fill="color" />
      <path d="M2 10L12 4l10 6" :fill="color" opacity="0.7" />
      <circle cx="12" cy="10" r="3" fill="white" />
    </g>
    <!-- 洞天福地 -->
    <g v-else-if="type === 'blessed_land'">
      <circle cx="12" cy="12" r="10" :fill="color" opacity="0.5" />
      <path d="M12 2l2.35 7.16h7.53l-6.09 4.42 2.35 7.16L12 16.32l-6.14 4.42 2.35-7.16-6.09-4.42h7.53z" fill="white" />
    </g>
    <!-- 奇珍异地 -->
    <g v-else-if="type === 'treasure_land'">
      <path d="M6 2L12 12 18 2z M6 22L12 12 18 22z" :fill="color" />
    </g>
    <!-- 凶险之地 -->
    <g v-else-if="type === 'dangerous_area'">
      <circle cx="12" cy="12" r="10" :fill="color" />
      <path d="M12 7v6m0 4v-2" stroke="white" stroke-width="2" />
    </g>
    <!-- 其他特殊 -->
    <g v-else-if="type === 'special_other'">
      <path d="M13 2L3 14h9l-1 8 9-12h-9z" :fill="color" />
    </g>
    <!-- 默认图标 -->
    <g v-else>
      <circle cx="12" cy="12" r="8" :fill="color" />
      <text x="12" y="16" text-anchor="middle" fill="white" font-size="12">?</text>
    </g>
  </g>
</template>

<script setup lang="ts">
defineProps<{
  type: string;
  color: string;
}>();
</script>

<style scoped>
.map-icon {
  width: 24px;
  height: 24px;
}
</style>