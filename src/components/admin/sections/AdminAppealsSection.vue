<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">申诉管理</div>
      <div class="section-sub">仅显示待处理的申诉</div>
    </div>

    <div class="toolbar">
      <button class="btn" :disabled="busy" @click="loadBanRecords">加载</button>
      <span class="pill">待处理：{{ pendingAppeals.length }}</span>
    </div>

    <div v-if="banError" class="error">{{ banError }}</div>
    <div v-else-if="banLoading" class="loading">加载中…</div>
    <div v-else class="table">
      <div class="row header" style="min-width: 860px;">
        <div class="cell id">ID</div>
        <div class="cell">玩家ID</div>
        <div class="cell desc">申诉理由</div>
        <div class="cell time">申诉时间</div>
        <div class="cell actions">操作</div>
      </div>
      <div v-for="r in pendingAppeals" :key="String((r as any).id)" class="row" style="min-width: 860px;">
        <div class="cell id">#{{ (r as any).id }}</div>
        <div class="cell">{{ (r as any).player_id }}</div>
        <div class="cell desc">{{ (r as any).appeal_reason || '-' }}</div>
        <div class="cell time">{{ formatDate(String((r as any).appeal_time || '')) }}</div>
        <div class="cell actions">
          <button class="btn sm" :disabled="busy" @click="handleAppeal(Number((r as any).id), true)">通过</button>
          <button class="btn sm danger" :disabled="busy" @click="handleAppeal(Number((r as any).id), false)">拒绝</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { adminRequest } from '@/services/adminRequest';
import { toast } from '@/utils/toast';
import { formatDate } from '@/components/admin/adminUtils';

const props = defineProps<{
  active: boolean;
  busy: boolean;
  setBusy: (next: boolean) => void;
}>();

const banLoading = ref(false);
const banError = ref('');
const banRecords = ref<Record<string, any>[]>([]);

const loadBanRecords = async () => {
  const tabActive = props.active;
  banLoading.value = true;
  banError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/ban/ban_records?limit=200&offset=0');
    if (!tabActive) return;
    banRecords.value = Array.isArray(rows) ? rows : [];
  } catch (e: any) {
    banError.value = e?.message || '加载失败';
  } finally {
    banLoading.value = false;
  }
};

const pendingAppeals = computed(() =>
  banRecords.value.filter((r) => String((r as any)?.appeal_status || '') === 'pending')
);

const handleAppeal = async (banRecordId: number, approve: boolean) => {
  props.setBusy(true);
  try {
    await adminRequest.post(`/api/v1/ban/handle_appeal/${banRecordId}?approve=${approve ? 'true' : 'false'}`, {});
    toast.success(approve ? '已通过申诉' : '已拒绝申诉');
    await loadBanRecords();
  } catch (e: any) {
    toast.error(e?.message || '处理失败');
  } finally {
    props.setBusy(false);
  }
};

defineExpose({
  refresh: loadBanRecords
});

watch(
  () => props.active,
  (value) => {
    if (value && banRecords.value.length === 0 && !banLoading.value) loadBanRecords();
  },
  { immediate: true }
);
</script>
