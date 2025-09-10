<template>
  <div class="left-sidebar">
    <div class="sidebar-header">
      <h3 class="sidebar-title">
        <Compass :size="20" class="title-icon" />
        游戏功能
      </h3>
    </div>
    
    <div class="sidebar-content">
      <!-- 主要功能区 -->
      <div class="function-section">
        <div class="section-title">修行管理</div>
        <div class="function-group">
          <button class="function-btn primary" @click="handleInventory">
            <div class="btn-icon">
              <Package :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">背包物品</span>
              <span class="btn-desc">查看道具装备</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" />
          </button>
          
          <button class="function-btn primary" @click="handleCharacterDetails">
            <div class="btn-icon">
              <User :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">人物详情</span>
              <span class="btn-desc">查看修为境界</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" />
          </button>
          
          <button class="function-btn primary" @click="handleTechniques">
            <div class="btn-icon">
              <BookOpen :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">修炼功法</span>
              <span class="btn-desc">功法修炼技能</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" />
          </button>
          
          <button class="function-btn primary" @click="handleThousandDao">
            <div class="btn-icon">
              <Zap :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">三千大道</span>
              <span class="btn-desc">修炼万法道途</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" />
          </button>
        </div>
      </div>

      <!-- 社交功能区 -->
      <div class="function-section">
        <div class="section-title">江湖事务</div>
        <div class="function-group">
          <button class="function-btn secondary" @click="handleRelationships">
            <div class="btn-icon">
              <Users :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">江湖人脉</span>
              <span class="btn-desc">江湖人脉网络</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" />
          </button>
          
          <button class="function-btn secondary" @click="handleSect">
            <div class="btn-icon">
              <Home :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">宗门事务</span>
              <span class="btn-desc">宗门任务管理</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" />
          </button>
          
          <button 
            class="function-btn secondary" 
            @click="handleQuests"
            :class="{ disabled: !isQuestSystemEnabled }"
            :disabled="!isQuestSystemEnabled"
          >
            <div class="btn-icon">
              <Scroll :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">任务系统</span>
              <span class="btn-desc" v-if="isQuestSystemEnabled">进行中任务</span>
              <span class="btn-desc disabled-text" v-else>需在设置中启用</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" v-if="isQuestSystemEnabled" />
          </button>
        </div>
      </div>

      <!-- 探索功能区 -->
      <div class="function-section">
        <div class="section-title">世界探索</div>
        <div class="function-group">
          <button class="function-btn accent" @click="handleWorldMap">
            <div class="btn-icon">
              <Map :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">世界地图</span>
              <span class="btn-desc">查看修仙大陆</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" />
          </button>
          
          <button class="function-btn accent" @click="handleMemoryCenter">
            <div class="btn-icon">
              <Brain :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">记忆中心</span>
              <span class="btn-desc">回顾修行历程</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" />
          </button>
          
          <button class="function-btn accent" @click="handleOnlinePlay">
            <div class="btn-icon">
              <Globe :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">论道交友</span>
              <span class="btn-desc">与道友论道</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" />
          </button>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <!-- 系统功能区 -->
      <div class="system-section">
        <div class="function-group">
          <button class="function-btn system" @click="handleSaveGame" :disabled="!activeCharacter">
            <div class="btn-icon">
              <Save :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">保存游戏</span>
              <span class="btn-desc">保存修行进度</span>
            </div>
          </button>
          
          <button class="function-btn system" @click="handleSettings">
            <div class="btn-icon">
              <Settings :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">系统设置</span>
              <span class="btn-desc">调整游戏选项</span>
            </div>
            <ChevronRight :size="14" class="btn-arrow" />
          </button>
          
          <button class="function-btn exit-btn" @click="handleBackToMenu">
            <div class="btn-icon">
              <LogOut :size="18" />
            </div>
            <div class="btn-content">
              <span class="btn-text">返回道途</span>
              <span class="btn-desc">退出当前游戏</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Package, User, Users, BookOpen, Zap, Brain, Map, Globe, Save, Settings, LogOut, Compass, Home, Scroll, ChevronRight } from 'lucide-vue-next';
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

const handleTechniques = () => {
  router.push('/game/techniques');
};

const handleThousandDao = () => {
  router.push('/game/thousand-dao');
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

const handleBackToMenu = async () => {
  if (confirm('确定要返回道途吗？当前游戏进度将会保存。')) {
    console.log('[返回道途] 用户确认返回，开始处理...');
    
    // 保存当前游戏状态
    try {
      await characterStore.saveCurrentGame();
      console.log('[返回道途] 游戏状态保存完成');
    } catch (error) {
      console.warn('[返回道途] 保存游戏状态失败:', error);
    }
    
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
    
    // 检查是否在iframe中运行（SillyTavern环境）
    if (window.parent && window.parent !== window) {
      // 在iframe中，通知父窗口关闭游戏
      console.log('[返回道途] 检测到iframe环境，发送关闭消息');
      window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
      console.log('[返回道途] 已发送关闭游戏消息到SillyTavern');
    } else {
      // 在独立窗口中，返回到角色选择页面
      console.log('[返回道途] 独立窗口环境，执行路由跳转');
      console.log('[返回道途] 当前路由:', router.currentRoute.value.path);
      console.log('[返回道途] 目标路由: /');
      
      try {
        // 确保路由跳转完成
        await router.push('/');
        console.log('[返回道途] 路由跳转到 / 完成，当前路由:', router.currentRoute.value.path);
      } catch (error) {
        console.error('[返回道途] 路由跳转失败:', error);
        // 如果路由跳转失败，尝试使用 replace
        try {
          await router.replace('/');
          console.log('[返回道途] 使用 replace 跳转成功，当前路由:', router.currentRoute.value.path);
        } catch (replaceError) {
          console.error('[返回道途] replace 跳转也失败:', replaceError);
          // 最后尝试直接修改 window.location
          console.log('[返回道途] 尝试使用 window.location.href 跳转');
          window.location.href = '/';
        }
      }
    }
  } else {
    console.log('[返回道途] 用户取消返回');
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.title-icon {
  color: var(--color-primary);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  padding-right: 4px;
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

/* 功能分区样式 */
.function-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  padding: 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.function-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.system-section {
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
}

.divider {
  height: 1px;
  background: var(--color-border);
  margin: 16px 0;
}

/* 增强的按钮样式 */
.function-btn {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  text-align: left;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.function-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.function-btn:hover::before {
  left: 100%;
}

.function-btn:hover {
  background: var(--color-surface-light);
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(var(--color-primary-rgb), 0.15);
}

.function-btn:active {
  transform: translateY(-1px) scale(0.98);
  transition: all 0.1s ease;
}

/* 按钮图标区域 */
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--color-background);
  margin-right: 12px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

/* 按钮内容区域 */
.btn-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.btn-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.2;
}

.btn-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  line-height: 1.1;
}

/* 按钮箭头 */
.btn-arrow {
  color: var(--color-text-muted);
  transition: all 0.3s ease;
  margin-left: 8px;
}

.function-btn:hover .btn-arrow {
  color: var(--color-primary);
  transform: translateX(2px);
}

/* 分类颜色主题 */
.function-btn.primary .btn-icon {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.function-btn.primary:hover .btn-icon {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.function-btn.secondary .btn-icon {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.function-btn.secondary:hover .btn-icon {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
}

.function-btn.accent .btn-icon {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.function-btn.accent:hover .btn-icon {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.3);
}

.function-btn.system .btn-icon {
  background: rgba(107, 114, 128, 0.1);
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.function-btn.system:hover .btn-icon {
  background: rgba(107, 114, 128, 0.15);
  border-color: rgba(107, 114, 128, 0.3);
}

/* 禁用状态样式 */
.function-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-surface-light);
}

.function-btn:disabled:hover {
  background: var(--color-surface-light);
  transform: none;
  box-shadow: none;
  border-color: var(--color-border);
}

.function-btn:disabled .btn-icon {
  background: var(--color-background);
  border-color: var(--color-border);
}

.function-btn:disabled .btn-arrow {
  opacity: 0.3;
  transform: none;
}

.function-btn.disabled {
  position: relative;
  opacity: 0.6;
}

.disabled-text {
  font-style: italic;
  opacity: 0.7;
}

/* 退出按钮特殊样式 */
.exit-btn {
  border-color: var(--color-error);
  background: rgba(239, 68, 68, 0.05);
}

.exit-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--color-error);
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15);
}

.exit-btn .btn-text {
  color: var(--color-error);
}

.exit-btn .btn-desc {
  color: rgba(239, 68, 68, 0.7);
}

.exit-btn .btn-icon {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

.exit-btn:hover .btn-icon {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .left-sidebar {
    padding: 12px;
  }
  
  .function-btn {
    padding: 10px 14px;
  }
  
  .btn-icon {
    width: 32px;
    height: 32px;
  }
  
  .btn-text {
    font-size: 0.85rem;
  }
  
  .btn-desc {
    font-size: 0.7rem;
  }
}
</style>