<template>
  <div class="admin-page">
    <VideoBackground />
    <AdminConsole />
  </div>
</template>

<script setup lang="ts">
import VideoBackground from '@/components/common/VideoBackground.vue';
import AdminConsole from '@/components/admin/AdminConsole.vue';
</script>

<style scoped>
.admin-page {
  width: 100%;
  height: 100vh;
  height: 100svh;
  height: 100dvh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(var(--color-background-rgb), 0.95), rgba(var(--color-surface-rgb), 0.86));
  padding: 0;
  box-sizing: border-box;
}

.admin-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 8%, rgba(var(--color-primary-rgb), 0.18), transparent 45%),
    radial-gradient(circle at 85% 0%, rgba(var(--color-accent-rgb), 0.12), transparent 55%);
  opacity: 0.7;
  pointer-events: none;
  z-index: 0;
}

.admin-page > * {
  position: relative;
  z-index: 1;
}
</style>
