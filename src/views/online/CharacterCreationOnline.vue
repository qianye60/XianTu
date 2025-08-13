<template>
  <CharacterCreationCore
    :character-name="userName"
    :steps="steps"
    :worlds="characterData.worlds"
    :origins="characterData.origins"
    :talents="characterData.talents"
    :spirit-roots="characterData.spiritRoots"
    :is-loading="isLoading"
    loading-text="正在连接天宫灵脉，请稍候..."
    @finalize="handleFinalize"
    @back="handleBack"
  >
    <template #header-extension>
      <div class="code-redemption-section">
        <input type="text" v-model="redemptionCode" placeholder="输入兑换码，获取专属机缘" class="input-field" />
        <button @click="redeemCode" :disabled="isRedeeming" class="btn btn-secondary">
          {{ isRedeeming ? '验证中...' : '使用兑换码' }}
        </button>
      </div>
    </template>
  </CharacterCreationCore>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  getWorldBackgrounds,
  getOrigins,
  getTalents,
  getSpiritRoots,
  createCharacter,
  redeemCodeForCreationData,
  type CharacterCreatePayload,
} from '@/services/api'
import { useGameMode } from '@/composables/useGameMode'
import { useAuth } from '@/composables/useAuth'
import type { World, Origin, Talent, SpiritRoot, CharacterSheet } from '@/core/rules/characterCreation'

import CharacterCreationCore from '@/components/character-creation/CharacterCreationCore.vue'


const { clearGameMode } = useGameMode()
const { currentUser } = useAuth()

const isLoading = ref(true)
const isRedeeming = ref(false)
const redemptionCode = ref('')
const userName = ref('道友')
const selectedWorld = ref<World | null>(null)

const steps = [
  { id: 'world', name: '择世界', icon: 'fas fa-globe' },
  { id: 'origin', name: '择出身', icon: 'fas fa-scroll' },
  { id: 'spirit-root', name: '觅灵根', icon: 'fas fa-seedling' },
  { id: 'talents', name: '选天赋', icon: 'fas fa-star' },
  { id: 'attributes', name: '定根骨', icon: 'fas fa-fist-raised' },
  { id: 'preview', name: '观命盘', icon: 'fas fa-book-open' },
]

const characterData = reactive<{
  worlds: World[]
  origins: Origin[]
  talents: Talent[]
  spiritRoots: SpiritRoot[]
}>({
  worlds: [],
  origins: [],
  talents: [],
  spiritRoots: [],
})

const handleFinalize = async (finalSheet: CharacterSheet) => {
  if (!currentUser.value || !selectedWorld.value) {
    console.error('用户信息或世界信息丢失，无法创建角色');
    return
  }

  const payload: CharacterCreatePayload = {
    user_id: currentUser.value.id,
    world_id: selectedWorld.value.id,
    character_name: finalSheet.name,
    character_data: {
      origin: finalSheet.origin,
      talents: finalSheet.talents,
      spiritRoot: finalSheet.spiritRoot,
      attributes: finalSheet.attributes,
    },
  }

  try {
    isLoading.value = true
    await createCharacter(payload);
    console.log(`命盘【${finalSheet.name}】已成功缔造！`);
    clearGameMode() // Go back to world selector or main game
  } catch (e) {
    console.error('角色创建失败，请稍后再试', e);
  } finally {
    isLoading.value = false
  }
}

const handleBack = () => {
  clearGameMode()
}

const redeemCode = async () => {
  if (!redemptionCode.value) return
  isRedeeming.value = true
  try {
    const customData = await redeemCodeForCreationData(redemptionCode.value);
    characterData.origins = [...characterData.origins, ...customData.origins];
    characterData.talents = [...characterData.talents, ...customData.talents];
    characterData.spiritRoots = [...characterData.spiritRoots, ...customData.spiritRoots];
    console.log('专属机缘已到账！');
  } catch (e) {
    console.error('兑换码无效或已使用', e);
  } finally {
    isRedeeming.value = false
  }
}

onMounted(async () => {
  isLoading.value = true;
  // This would ideally get the user name from the auth composable
  if (currentUser.value) {
    userName.value = currentUser.value.user_name;
  }
  try {
    const [worldsData, originsData, talentsData, spiritRootsData] = await Promise.all([
      getWorldBackgrounds(),
      getOrigins(),
      getTalents(),
      getSpiritRoots(),
    ]);
    characterData.worlds = worldsData;
    characterData.origins = originsData;
    characterData.talents = talentsData;
    characterData.spiritRoots = spiritRootsData;
  } catch (error) {
    console.error("Failed to load creation data:", error);
    console.error("无法从天宫灵脉获取数据，请稍后重试");
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.code-redemption-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: rgba(var(--color-primary-rgb), 0.05);
  border-radius: 8px;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.input-field {
    flex-grow: 1;
    /* Styles copied from LoginView for consistency */
    padding: 0.75rem 1rem;
    font-size: 1rem;
    background-color: var(--color-background);
    border: 1px solid var(--color-border-hover);
    border-radius: 8px;
    color: var(--color-text);
}
</style>
