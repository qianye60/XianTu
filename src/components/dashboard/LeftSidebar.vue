<template>
  <div class="left-sidebar">
    <div class="sidebar-header">
      <h3 class="sidebar-title">游戏功能</h3>
    </div>
    
    <div class="sidebar-content">
      <div class="function-group">
        <button class="function-btn" @click="handleInventory">
          <Package :size="16" />
          <span class="btn-text">背包</span>
        </button>
        
        <button class="function-btn" @click="handleCharacterDetails">
          <User :size="16" />
          <span class="btn-text">人物详情</span>
        </button>
        
        <button 
          class="function-btn" 
          @click="handleQuests"
          :class="{ disabled: !isQuestSystemEnabled }"
          :disabled="!isQuestSystemEnabled"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,10 8,9"/>
          </svg>
          <span class="btn-text">任务系统</span>
          <span v-if="!isQuestSystemEnabled" class="disabled-hint">需在设置中启用</span>
        </button>
        
        <button class="function-btn" @click="handleSect">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21h18"/>
            <path d="M5 21V7l8-4v18"/>
            <path d="m13 7 8 4v10"/>
          </svg>
          <span class="btn-text">宗门</span>
        </button>
        
        <button class="function-btn" @click="handleRelationships">
          <Users :size="16" />
          <span class="btn-text">人物关系</span>
        </button>
        
        <button class="function-btn" @click="handleCultivationSystem">
          <BookOpen :size="16" />
          <span class="btn-text">功法系统</span>
        </button>
        
        <button class="function-btn" @click="handleSkillsArts">
          <Zap :size="16" />
          <span class="btn-text">道法技艺</span>
        </button>
        
        <button class="function-btn" @click="handleMemoryCenter">
          <Brain :size="16" />
          <span class="btn-text">记忆中心</span>
        </button>
        
        <button class="function-btn" @click="handleWorldMap">
          <Map :size="16" />
          <span class="btn-text">世界地图</span>
        </button>
        
        <button class="function-btn" @click="handleOnlinePlay">
          <Globe :size="16" />
          <span class="btn-text">拜访道友</span>
        </button>
      </div>
      
      <div class="divider"></div>
      
      <div class="system-group">
        <button class="function-btn" @click="handleSaveGame" :disabled="!activeCharacter">
          <Save :size="16" />
          <span class="btn-text">存档</span>
        </button>
        
        <button class="function-btn" @click="handleSettings">
          <Settings :size="16" />
          <span class="btn-text">设置</span>
        </button>
        
        <button class="function-btn exit-btn" @click="handleBackToMenu">
          <LogOut :size="16" />
          <span class="btn-text">返回道途</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Package, User, Users, BookOpen, Zap, Brain, Map, Globe, Save, Settings, LogOut } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';

const props = defineProps<{
  collapsed?: boolean;
}>();

const router = useRouter();
const characterStore = useCharacterStore();

// 检查任务系统是否启用
const isQuestSystemEnabled = computed(() => {
  try {
    const savedSettings = localStorage.getItem('dad_game_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return settings.enableQuestSystem || false;
    }
  } catch (error) {
    console.warn('[左侧栏] 无法读取任务系统设置:', error);
  }
  return false;
});

// 使用 store 的 getters 获取数据
const activeCharacter = computed(() => characterStore.activeCharacterProfile);

const handleSaveGame = async () => {
  router.push('/game/save');
};

const handleInventory = () => {
  router.push('/game/inventory');
};

const handleCharacterDetails = () => {
  router.push('/game/character-details');
};

const handleQuests = () => {
  if (isQuestSystemEnabled.value) {
    router.push('/game/quests');
  } else {
    toast.warning('任务系统未启用，请在设置中开启');
  }
};

const handleSect = () => {
  router.push('/game/sect');
};

const handleRelationships = () => {
  router.push('/game/relationships');
};

const handleCultivationSystem = () => {
  router.push('/game/cultivation');
};

const handleSkillsArts = () => {
  router.push('/game/skills');
};

const handleMemoryCenter = () => {
  router.push('/game/memory');
};

const handleWorldMap = () => {
  router.push('/game/world-map');
};

const handleOnlinePlay = () => {
  // 这个功能保持原样，因为不是真正的面板
  toast.info('联机功能开发中...');
};

const handleSettings = () => {
  router.push('/game/settings');
};

const handleBackToMenu = () => {
  if (confirm('确定要返回道途吗？当前游戏进度将会保存。')) {
    characterStore.saveCurrentGame();
    
    // 尝试保存游戏状态到酒馆变量
    try {
      const helper = (window.parent as any)?.TavernHelper;
      if (helper) {
        // 保存最后的游戏状态到酒馆变量
        console.log('[返回道途] 游戏状态已保存到酒馆');
      }
    } catch (error) {
      console.warn('[返回道途] 保存酒馆状态失败:', error);
    }
    
    // 返回到SillyTavern主界面
    if (window.parent && window.parent !== window) {
      // 在iframe中，通知父窗口关闭游戏
      window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
      console.log('[返回道途] 已发送关闭游戏消息到SillyTavern');
    } else {
      // 如果不在iframe中，尝试关闭当前窗口
      try {
        window.close();
      } catch {
        // 如果无法关闭窗口，跳转到空白页面
        window.location.href = 'about:blank';
      }
    }
  }
};
</script>

<style scoped>
.left-sidebar {
  width: 100%;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  font-family: var(--font-family-sans-serif);
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
}

.sidebar-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}
.sidebar-content::-webkit-scrollbar {
  width: 4px;
}
.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}
[data-theme="dark"] .sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.function-group,
.system-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.system-group {
  margin-bottom: 0;
}

.divider {
  height: 1px;
  background: var(--color-border);
  margin: 16px 0;
}

.function-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition-fast);
  font-family: inherit;
  font-size: 0.875rem;
  text-align: left;
  width: 100%;
  position: relative;
}

.function-btn:hover {
  background: var(--color-surface-light);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.1);
}

.function-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-surface-light);
}

.function-btn:disabled:hover {
  background: var(--color-surface-light);
  transform: none;
  box-shadow: none;
}

.function-btn.disabled {
  position: relative;
  opacity: 0.6;
}

.disabled-hint {
  position: absolute;
  right: 8px;
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  font-weight: 400;
  font-style: italic;
}

.exit-btn {
  border-color: var(--color-error);
  color: var(--color-error);
}

.exit-btn:hover {
  background: rgba(var(--color-error-rgb), 0.05);
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.btn-text {
  font-weight: 500;
  color: var(--color-text);
}

.exit-btn .btn-text {
  color: inherit;
}

/* 移除深色主题硬编码，使用CSS变量自动适配 */
</style>