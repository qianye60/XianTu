import { ref, shallowRef, watch, type Component, computed } from 'vue';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import { useCharacterStore } from '@/stores/characterStore';
import type { WorldMap } from '@/types/game';
import { toast } from '@/utils/toast';

// 引入视图组件
import MessagePanel from '@/components/game-view/MessagePanel.vue';
import MapView from '@/components/game-view/MapView.vue';

export function useGameView() {
  const creationStore = useCharacterCreationStore();
  const characterStore = useCharacterStore();
  
  const activeSaveSlot = computed(() => characterStore.activeSaveSlot);

  const messages = ref<string[]>([]);
  const mainViewComponent = shallowRef<Component>(MessagePanel);
  const mapData = ref<WorldMap | null | undefined>(null);

  // --- 初始化消息 ---
  const initializeMessages = () => {
    messages.value = []; // 清空旧消息
    if (creationStore.initialGameMessage) {
      messages.value.push(creationStore.initialGameMessage);
      creationStore.setInitialGameMessage('');
    } else {
      messages.value.push('你睁开双眼，一段新的因果，就此开始。');
    }
  };

  // --- 事件处理函数 ---
  const handleInteraction = async (actionId: string) => {
    console.log(`[useGameView] 接到指令: ${actionId}`);
    
    switch (actionId) {
      case 'explore':
        if (mainViewComponent.value === MessagePanel) {
          if (mapData.value) {
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
        messages.value.push(`你执行了【${actionId}】指令...（此法门尚未实现）`);
        break;
    }
  };

  const handleSendMessage = (message: string) => {
    console.log(`[useGameView] 接到传音: ${message}`);
    messages.value.push(`你说道: "${message}"`);
  };

  const handleMapDataUpdate = async (newMapData: WorldMap) => {
    console.log('[useGameView] 更新地图数据:', newMapData);
    mapData.value = newMapData;
    
    if (activeSaveSlot.value) {
      activeSaveSlot.value.世界地图 = newMapData;
      try {
        // 直接调用 store 的 action 来持久化
        characterStore.commitToStorage();
      } catch (error) {
        console.error('[useGameView] 保存地图数据失败:', error);
      }
    }
  };
  
  // 监听 activeSaveSlot 的变化来初始化或更新地图和消息
  watch(activeSaveSlot, (newSlot) => {
    if (newSlot) {
      mapData.value = newSlot.世界地图;
      console.log('[useGameView] 侦测到世界实例变化，已更新地图数据');
      initializeMessages();
    }
  }, { immediate: true });


  return {
    messages,
    mainViewComponent,
    mapData,
    handleInteraction,
    handleSendMessage,
    handleMapDataUpdate,
  };
}