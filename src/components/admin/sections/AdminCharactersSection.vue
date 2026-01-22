<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">角色管理</div>
      <div class="section-sub">查看所有角色信息</div>
    </div>

    <div class="toolbar">
      <input v-model="characterQuery" class="input" placeholder="搜索角色名/道号/ID..." />
      <button class="btn" :disabled="busy" @click="loadCharacters">加载</button>
      <span class="pill">总数：{{ characters.length }}</span>
    </div>

    <div v-if="charactersError" class="error">{{ charactersError }}</div>
    <div v-else-if="charactersLoading" class="loading">加载中…</div>
    <div v-else class="table characters">
      <div class="row header">
        <div class="cell id">ID</div>
        <div class="cell name">道号</div>
        <div class="cell name">角色</div>
        <div class="cell">世界</div>
        <div class="cell">境界</div>
        <div class="cell num">年龄</div>
        <div class="cell time">创建时间</div>
      </div>
      <div v-for="c in filteredCharacters" :key="c.id" class="row">
        <div class="cell id">#{{ c.id }}</div>
        <div class="cell name">{{ c.user_name }}</div>
        <div class="cell name">{{ c.character_name }}</div>
        <div class="cell">{{ c.world }}</div>
        <div class="cell">{{ c.realm }}</div>
        <div class="cell num">{{ c.age }}</div>
        <div class="cell time">{{ formatDate(c.created_at) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { adminRequest } from '@/services/adminRequest';
import { formatDate } from '@/components/admin/adminUtils';

type CharacterRow = {
  id: number;
  user_name: string;
  character_name: string;
  world: string;
  realm: string;
  age: number;
  created_at: string;
};

const props = defineProps<{
  active: boolean;
  busy: boolean;
}>();

const charactersLoading = ref(false);
const charactersError = ref('');
const characterQuery = ref('');
const characters = ref<CharacterRow[]>([]);

const loadCharacters = async () => {
  const tabActive = props.active;
  charactersLoading.value = true;
  charactersError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/admin/characters');
    if (!tabActive) return;
    characters.value = (rows || []).map((r) => ({
      id: Number(r?.id),
      user_name: String(r?.user_name ?? ''),
      character_name: String(r?.character_name ?? ''),
      world: String(r?.world ?? ''),
      realm: String(r?.realm ?? ''),
      age: Number(r?.age ?? 0),
      created_at: String(r?.created_at ?? '')
    } satisfies CharacterRow));
  } catch (e: any) {
    charactersError.value = e?.message || '加载失败';
  } finally {
    charactersLoading.value = false;
  }
};

const filteredCharacters = computed(() => {
  const q = characterQuery.value.trim();
  if (!q) return characters.value;
  return characters.value.filter(c =>
    c.user_name.includes(q) ||
    c.character_name.includes(q) ||
    String(c.id).includes(q)
  );
});

defineExpose({
  refresh: loadCharacters
});

watch(
  () => props.active,
  (value) => {
    if (value && characters.value.length === 0 && !charactersLoading.value) loadCharacters();
  },
  { immediate: true }
);
</script>
