<!-- src/views/GameView.vue -->
<template>
  <GameLayout>
    <template #header>
      <WorldHeader :state="worldState" />
    </template>

    <template #left-sidebar>
      <InteractionPanel @action="handleInteraction" />
    </template>

    <template #main-content>
      <Transition name="fade" mode="out-in">
        <component :is="mainViewComponent" :messages="messages" />
      </Transition>
    </template>

    <template #right-sidebar>
      <StatusPanel :status="characterStatus" />
    </template>

    <template #footer>
      <InputBar @send="handleSendMessage" />
    </template>
  </GameLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, shallowRef, type Component } from 'vue';
import { useCharacterCreationStore } from '../stores/characterCreationStore';
import { loadLocalCharacters, loadWorldInstance, saveLocalCharacter, type LocalCharacterWithGameData, type WorldInstanceData } from '../data/localData';
import { toast } from '@/utils/toast';

// 引入所有新组件
import GameLayout from '@/components/game-view/GameLayout.vue';
import WorldHeader, { type WorldState } from '@/components/game-view/WorldHeader.vue';
import InteractionPanel from '@/components/game-view/InteractionPanel.vue';
import MessagePanel from '@/components/game-view/MessagePanel.vue';
import StatusPanel, { type CharacterStatus } from '@/components/game-view/StatusPanel.vue';
import InputBar from '@/components/game-view/InputBar.vue';
import MapView from '@/components/game-view/MapView.vue';

const props = defineProps<{
  characterId: number;
}>();

const creationStore = useCharacterCreationStore();

// --- 核心数据状态 ---
const character = ref<LocalCharacterWithGameData | null>(null);
const worldInstance = ref<WorldInstanceData | null>(null);
const messages = ref<string[]>([]);
const mainViewComponent = shallowRef<Component>(MessagePanel);

// --- 计算属性，用于传递给子组件 ---
const characterStatus = computed<CharacterStatus | null>(() => {
  if (!character.value) return null;
  return {
    name: character.value.character_name,
    realm: character.value.realm,
    hp: `${character.value.hp} / ${character.value.hp_max}`,
    mana: `${character.value.mana} / ${character.value.mana_max}`,
    spirit: `${character.value.spirit} / ${character.value.spirit_max}`,
    lifespan: character.value.lifespan,
    reputation: character.value.reputation,
    // 注入修为数据
    cultivation_exp: character.value.cultivation_exp,
    cultivation_exp_max: character.value.cultivation_exp_max,
    // 注入六维命格
    root_bone: character.value.root_bone,
    spirituality: character.value.spirituality,
    comprehension: character.value.comprehension,
    fortune: character.value.fortune,
    charm: character.value.charm,
    temperament: character.value.temperament,
  };
});

const worldState = ref<WorldState>({
  time: '开元元年春', // TODO: 动态化
  location: '未知之地', // TODO: 动态化
});

// --- 事件处理函数 ---
const handleInteraction = async (actionId: string) => {
  console.log(`[GameView] 接到指令: ${actionId}`);
  
  if (!character.value) {
    toast.error('角色数据尚未加载，无法执行动作。');
    return;
  }

  // --- 动作分发 ---
  switch (actionId) {
    case 'explore':
      if (mainViewComponent.value === MessagePanel) {
        if (creationStore.mapData) {
          mainViewComponent.value = MapView;
          toast.info('打开坤舆图志...');
        } else {
          toast.error('此方天地尚未衍化舆图！');
        }
      } else {
        mainViewComponent.value = MessagePanel;
        toast.info('返回通天玄镜...');
      }
      break;
      
    default:
      // TODO: 在此处理其他按钮点击事件
      messages.value.push(`你执行了【${actionId}】指令...（此法门尚未实现）`);
      break;
  }
};

const handleSendMessage = (message: string) => {
  console.log(`[GameView] 接到传音: ${message}`);
  // TODO: 在此处理用户输入，发送给AI
  messages.value.push(`你说道: "${message}"`);
};

// --- 初始化逻辑 ---
onMounted(async () => {
  try {
    const allCharacters = await loadLocalCharacters();
    const currentChar = allCharacters.find(c => c.id === props.characterId);
    
    if (currentChar) {
      character.value = currentChar;
      
      const instanceData = loadWorldInstance(currentChar.world_id);
      if (instanceData) {
        worldInstance.value = instanceData;
        worldState.value.location = instanceData.continentName || '未知大陆';
        creationStore.setMapData(instanceData.mapInfo);
      } else {
        toast.error(`找不到ID为 ${currentChar.world_id} 的世界数据！`);
      }
    } else {
      toast.error('找不到角色存档！');
      return;
    }
  } catch (error) {
    toast.error('加载存档失败！');
  }

  if (creationStore.initialGameMessage) {
    messages.value.push(creationStore.initialGameMessage);
  } else {
    messages.value.push('你睁开双眼，一段新的因果，就此开始。');
  }
  
  console.log('游戏道场已重构完成，并注入了初始灵气。');
});
</script>

<style scoped>
/* --- 视图切换过渡动画 --- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>