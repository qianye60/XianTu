<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">核心规则</div>
      <div class="section-sub">/api/v1/rules/settings</div>
    </div>

    <div class="toolbar">
      <button class="btn" :disabled="busy" @click="loadRules">加载</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="loading">加载中…</div>
    <textarea v-else class="textarea mono" rows="12" readonly :value="rulesText"></textarea>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { adminRequest } from '@/services/adminRequest';
import { toast } from '@/utils/toast';

const props = defineProps<{
  active: boolean;
  busy: boolean;
  setBusy: (next: boolean) => void;
}>();

const loading = ref(false);
const error = ref('');
const rules = ref<Record<string, any> | null>(null);

const rulesText = computed(() => (rules.value ? JSON.stringify(rules.value, null, 2) : ''));

const loadRules = async () => {
  loading.value = true;
  error.value = '';
  try {
    rules.value = await adminRequest.get<Record<string, any>>('/api/v1/rules/settings');
  } catch (e: any) {
    error.value = e?.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

defineExpose({
  refresh: loadRules
});

watch(
  () => props.active,
  (value) => {
    if (value && !rules.value && !loading.value) loadRules();
  },
  { immediate: true }
);
</script>
