<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">封号管理</div>
      <div class="section-sub">查看封号记录（含申诉状态）</div>
    </div>

    <div class="toolbar">
      <input v-model="playerIdQuery" class="input" placeholder="玩家ID（可选）" />
      <label class="pill" style="display:flex; gap:8px; align-items:center;">
        <input v-model="onlyActive" type="checkbox" />
        仅生效记录
      </label>
      <button class="btn" :disabled="busy" @click="loadBanRecords">加载</button>
      <span class="pill">记录：{{ banRecords.length }}</span>
    </div>

    <div v-if="banError" class="error">{{ banError }}</div>
    <div v-else-if="banLoading" class="loading">加载中…</div>
    <div v-else class="table">
      <div class="row header" style="min-width: 980px;">
        <div class="cell id">ID</div>
        <div class="cell">玩家ID</div>
        <div class="cell">类型</div>
        <div class="cell desc">原因</div>
        <div class="cell time">开始</div>
        <div class="cell time">结束</div>
        <div class="cell">申诉</div>
        <div class="cell actions">操作</div>
      </div>
      <div v-for="r in banRecords" :key="String((r as any).id)" class="row" style="min-width: 980px;">
        <div class="cell id">#{{ (r as any).id }}</div>
        <div class="cell">{{ (r as any).player_id }}</div>
        <div class="cell">{{ (r as any).ban_type || '-' }}</div>
        <div class="cell desc">{{ (r as any).reason || '-' }}</div>
        <div class="cell time">{{ formatDate(String((r as any).ban_start_time || '')) }}</div>
        <div class="cell time">{{ formatDate(String((r as any).ban_end_time || '')) }}</div>
        <div class="cell">
          <span class="pill">{{ (r as any).appeal_status || 'none' }}</span>
        </div>
        <div class="cell actions">
          <button
            v-if="String((r as any).appeal_status || '') === 'pending'"
            class="btn sm"
            :disabled="busy"
            @click="handleAppeal(Number((r as any).id), true)"
          >
            通过
          </button>
          <button
            v-if="String((r as any).appeal_status || '') === 'pending'"
            class="btn sm danger"
            :disabled="busy"
            @click="handleAppeal(Number((r as any).id), false)"
          >
            拒绝
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
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
const playerIdQuery = ref('');
const onlyActive = ref(false);

const loadBanRecords = async () => {
  const tabActive = props.active;
  banLoading.value = true;
  banError.value = '';
  try {
    const params = new URLSearchParams();
    params.set('limit', '200');
    params.set('offset', '0');
    if (playerIdQuery.value.trim()) params.set('player_id', playerIdQuery.value.trim());
    if (onlyActive.value) params.set('is_active', 'true');
    const rows = await adminRequest.get<any[]>(`/api/v1/ban/ban_records?${params.toString()}`);
    if (!tabActive) return;
    banRecords.value = Array.isArray(rows) ? rows : [];
  } catch (e: any) {
    banError.value = e?.message || '加载失败';
  } finally {
    banLoading.value = false;
  }
};

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
