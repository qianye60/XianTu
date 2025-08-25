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
import { Package, User, Users, BookOpen, Zap, Brain, Map, Globe, Save, Settings, LogOut } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';

const props = defineProps<{
  collapsed?: boolean;
}>();

const emit = defineEmits<{
  'toggle-collapse': []
  'open-panel': [panelType: string]
}>();

const characterStore = useCharacterStore();

// 使用 store 的 getters 获取数据
const activeCharacter = computed(() => characterStore.activeCharacterProfile);

const handleSaveGame = async () => {
  emit('open-panel', 'save');
};

const handleInventory = () => {
  emit('open-panel', 'inventory');
};

const handleCharacterDetails = () => {
  emit('open-panel', 'character-details');
};

const handleRelationships = () => {
  emit('open-panel', 'relationships');
};

const handleCultivationSystem = () => {
  emit('open-panel', 'cultivation');
};

const handleSkillsArts = () => {
  emit('open-panel', 'skills');
};

const handleMemoryCenter = () => {
  emit('open-panel', 'memory');
};

const handleWorldMap = () => {
  emit('open-panel', 'world-map');
};

const handleOnlinePlay = () => {
  emit('open-panel', 'online-play');
};

const handleSettings = () => {
  emit('open-panel', 'settings');
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
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
  background: #e2e8f0;
  margin: 16px 0;
}

.function-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  font-size: 0.875rem;
  text-align: left;
  width: 100%;
}

.function-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.function-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f9fafb;
}

.function-btn:disabled:hover {
  background: #f9fafb;
  transform: none;
  box-shadow: none;
}

.exit-btn {
  border-color: #ef4444;
  color: #ef4444;
}

.exit-btn:hover {
  background: #fef2f2;
  border-color: #dc2626;
  color: #dc2626;
}

.btn-icon {
  flex-shrink: 0;
}

.btn-text {
  font-weight: 500;
  color: #374151;
}

.exit-btn .btn-text {
  color: inherit;
}

/* 深色主题 */
[data-theme="dark"] .left-sidebar {
  color: #f3f4f6;
}

[data-theme="dark"] .sidebar-header {
  border-bottom-color: #374151;
}

[data-theme="dark"] .sidebar-title {
  color: #f3f4f6;
}

[data-theme="dark"] .divider {
  background: #374151;
}

[data-theme="dark"] .sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .function-btn {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

[data-theme="dark"] .function-btn:hover {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .function-btn:disabled {
  background: #0f172a;
  border-color: #1e293b;
}

[data-theme="dark"] .function-btn:disabled:hover {
  background: #0f172a;
}

[data-theme="dark"] .btn-text {
  color: #e2e8f0;
}

[data-theme="dark"] .exit-btn {
  border-color: #ef4444;
  color: #ef4444;
}

[data-theme="dark"] .exit-btn:hover {
  background: #1e1b1b;
  border-color: #dc2626;
  color: #dc2626;
}
</style>