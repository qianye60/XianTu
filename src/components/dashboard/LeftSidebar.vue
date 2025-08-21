<template>
  <div class="immortal-left-sidebar" :class="{ 'is-collapsed': collapsed }">
    <div class="sidebar-content" v-show="!collapsed">
      <!-- 功能导航 -->
      <div class="function-section">
        <div class="section-title">功能导航</div>
        <div class="function-grid">
          <div class="function-item" @click="handleInventory">
            <span class="function-icon">◇</span>
            <span class="function-text">背包</span>
          </div>
          <div class="function-item" @click="handleCharacterDetails">
            <span class="function-icon">◈</span>
            <span class="function-text">人物详情</span>
          </div>
          <div class="function-item" @click="handleRelationships">
            <span class="function-icon">◎</span>
            <span class="function-text">人物关系</span>
          </div>
          <div class="function-item" @click="handleCultivationSystem">
            <span class="function-icon">◐</span>
            <span class="function-text">功法系统</span>
          </div>
          <div class="function-item" @click="handleSkillsArts">
            <span class="function-icon">◑</span>
            <span class="function-text">道法技艺</span>
          </div>
          <div class="function-item" @click="handleMemoryCenter">
            <span class="function-icon">◒</span>
            <span class="function-text">记忆中心</span>
          </div>
        </div>
      </div>

      <!-- 世界管理 -->
      <div class="world-section">
        <div class="section-title">世界管理</div>
        <div class="world-actions">
          <div class="action-item" @click="handleWorldMap">
            <span class="action-text">世界地图</span>
          </div>
          <div class="action-item" @click="handleMultiplayer">
            <span class="action-text">联机角色</span>
          </div>
          <div class="action-item" @click="handleWorldDevelopment">
            <span class="action-text">开发世界</span>
          </div>
        </div>
      </div>

      <!-- 系统操作 -->
      <div class="system-section">
        <div class="section-title">系统操作</div>
        <div class="system-actions">
          <div class="action-item" @click="handleSaveGame" :class="{ 'disabled': !activeCharacter }">
            <span class="action-text">存档</span>
          </div>
          <div class="action-item" @click="handleSettings">
            <span class="action-text">设置</span>
          </div>
          <div class="action-item exit-item" @click="handleBackToMenu">
            <span class="action-text">返回道途</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 收缩状态显示 -->
    <div class="collapsed-content" v-show="collapsed">
      <div class="collapsed-icons">
        <div class="collapsed-icon" @click="handleInventory" title="背包">◇</div>
        <div class="collapsed-icon" @click="handleCharacterDetails" title="人物详情">◈</div>
        <div class="collapsed-icon" @click="handleSettings" title="设置">⚙</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { toast } from '@/utils/toast';

const props = defineProps<{
  collapsed?: boolean;
}>();

const emit = defineEmits<{
  'toggle-collapse': []
}>();

const characterStore = useCharacterStore();

// 使用 store 的 getters 获取数据
const activeCharacter = computed(() => characterStore.activeCharacterProfile);

const handleSaveGame = async () => {
  if (activeCharacter.value) {
    await characterStore.saveCurrentGame();
  } else {
    toast.warning('当前没有激活的角色，无法存档。');
  }
};

const handleInventory = () => {
  toast.info('背包功能开发中...');
};

const handleCharacterDetails = () => {
  toast.info('人物详情功能开发中...');
};

const handleRelationships = () => {
  toast.info('人物关系功能开发中...');
};

const handleCultivationSystem = () => {
  toast.info('功法系统功能开发中...');
};

const handleSkillsArts = () => {
  toast.info('道法技艺功能开发中...');
};

const handleMemoryCenter = () => {
  toast.info('记忆中心功能开发中...');
};

const handleWorldMap = () => {
  toast.info('世界地图功能开发中...');
};

const handleMultiplayer = () => {
  toast.info('联机功能开发中...');
};

const handleWorldDevelopment = () => {
  toast.info('世界开发功能开发中...');
};

const handleSettings = () => {
  toast.info('设置功能开发中...');
};

const handleBackToMenu = () => {
  if (confirm('确定要返回主菜单吗？当前游戏进度将会保存。')) {
    characterStore.saveCurrentGame();
    // 这里需要路由跳转回主菜单，暂时用window.location
    window.location.href = '#/';
  }
};
</script>

<style scoped>
/* 左侧栏 - 简约风格 */
.immortal-left-sidebar {
  width: 100%;
  height: 100%;
  background: inherit;
  padding: 8px;
  box-sizing: border-box;
  font-family: 'SimSun', 'NSimSun', 'STSong', '宋体', serif;
  overflow: hidden;
}

.immortal-left-sidebar.is-collapsed {
  width: 100%;
  overflow: hidden;
}

.sidebar-content {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-content::-webkit-scrollbar {
  width: 3px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(139, 115, 85, 0.3);
}

/* 区块标题 */
.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #8b7355;
  margin-bottom: 6px;
  padding-bottom: 2px;
  border-bottom: 1px solid rgba(139, 115, 85, 0.2);
  text-align: center;
}

/* 功能导航区块 - 修仙风格重构 */
.function-section {
  background: rgba(248, 245, 242, 0.8);
  border: 1px solid #87CEEB;
  padding: 8px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.function-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.function-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  cursor: pointer;
  border: 2px solid #87CEEB;
  background: linear-gradient(135deg, #FFFFFF 0%, #F8F5F2 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 6px;
  box-shadow: 
    0 2px 4px rgba(135, 206, 235, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
  overflow: hidden;
}

.function-item:hover {
  background: linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%);
  border-color: #6495ED;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 
    0 6px 16px rgba(135, 206, 235, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.function-icon {
  font-size: 1.2rem;
  color: #3A3A3A;
  font-weight: 900;
  transition: all 0.3s ease;
}

.function-text {
  font-size: 0.75rem;
  color: #3A3A3A;
  font-weight: 700;
  text-align: center;
  line-height: 1.2;
  transition: all 0.3s ease;
}

.function-item:active {
  transform: translateY(-1px) scale(1.01);
  box-shadow: 
    0 3px 8px rgba(135, 206, 235, 0.2),
    inset 0 2px 4px rgba(100, 149, 237, 0.1);
}

.function-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s ease;
}

.function-item:hover::before {
  left: 100%;
}

.function-item:hover .function-icon {
  color: #FFFFFF;
  transform: scale(1.1);
}

.function-item:hover .function-text {
  color: #FFFFFF;
  transform: translateY(-1px);
}

/* 世界管理区块 - 修仙风格 */
.world-section {
  background: rgba(255, 248, 240, 0.8);
  border: 1px solid #87CEEB;
  padding: 8px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.world-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 系统操作区块 - 修仙风格 */
.system-section {
  background: rgba(240, 248, 240, 0.8);
  border: 1px solid #87CEEB;
  padding: 8px;
  margin-top: auto;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.system-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 通用动作项目 - 修仙风格重构 */
.action-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  cursor: pointer;
  border: 2px solid #87CEEB;
  background: linear-gradient(135deg, #FFFFFF 0%, #F8F5F2 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 3px;
  border-radius: 4px;
  box-shadow: 
    0 2px 4px rgba(135, 206, 235, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
  overflow: hidden;
}

.action-item:hover {
  background: linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%);
  border-color: #6495ED;
  transform: translateY(-1px) scale(1.02);
  box-shadow: 
    0 4px 12px rgba(135, 206, 235, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.action-item.disabled {
  color: #9e9e9e;
  cursor: not-allowed;
  background: #f8f8f8;
  opacity: 0.6;
}

.action-item.disabled:hover {
  background: #f8f8f8;
}

.action-item.exit-item {
  border-color: rgba(218, 54, 51, 0.3);
  background: #fff5f5;
}

.action-item.exit-item:hover {
  background: #ffeaea;
  border-color: rgba(218, 54, 51, 0.5);
}

.action-text {
  font-size: 0.8rem;
  color: #3A3A3A;
  font-weight: 700;
  text-align: center;
  transition: all 0.3s ease;
}

.action-item:hover .action-text {
  color: #FFFFFF;
}

.action-item.exit-item {
  border-color: #D94F44;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE8E8 100%);
}

.action-item.exit-item:hover {
  background: linear-gradient(135deg, #D94F44 0%, #B8433E 100%);
  border-color: #B8433E;
  box-shadow: 
    0 4px 12px rgba(217, 79, 68, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.exit-item .action-text {
  color: #D94F44;
  font-weight: 800;
}

.action-item.exit-item:hover .action-text {
  color: #FFFFFF;
}

/* 收缩状态样式 */
.collapsed-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 16px 0;
}

.collapsed-icons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.collapsed-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: #8b7355;
  cursor: pointer;
  border: 1px solid rgba(139, 115, 85, 0.3);
  background: #fff;
  transition: all 0.2s ease;
}

.collapsed-icon:hover {
  background: #f0f0f0;
  border-color: rgba(139, 115, 85, 0.5);
  color: #6f5633;
}

/* 暗色主题 */
[data-theme="dark"] .immortal-left-sidebar {
  color: #f0f6fc;
}

[data-theme="dark"] .sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(125, 133, 144, 0.3);
}

[data-theme="dark"] .section-title {
  color: #7d8590;
  border-bottom-color: rgba(125, 133, 144, 0.2);
}

[data-theme="dark"] .function-section {
  background: #21262d;
  border-color: rgba(125, 133, 144, 0.2);
}

[data-theme="dark"] .world-section {
  background: #1c2128;
  border-color: rgba(125, 133, 144, 0.2);
}

[data-theme="dark"] .system-section {
  background: #1a1f24;
  border-color: rgba(125, 133, 144, 0.2);
}

[data-theme="dark"] .function-item,
[data-theme="dark"] .action-item {
  border-color: rgba(125, 133, 144, 0.2);
  background: #161b22;
}

[data-theme="dark"] .function-item:hover,
[data-theme="dark"] .action-item:hover {
  background: #21262d;
  border-color: rgba(125, 133, 144, 0.4);
}

[data-theme="dark"] .function-icon {
  color: #7d8590;
}

[data-theme="dark"] .function-text,
[data-theme="dark"] .action-text {
  color: #f0f6fc;
}

[data-theme="dark"] .action-item.disabled {
  color: #656d76;
  background: #21262d;
}

[data-theme="dark"] .action-item.exit-item {
  border-color: rgba(248, 81, 73, 0.3);
  background: #2d1b1e;
}

[data-theme="dark"] .action-item.exit-item:hover {
  background: #3c1e1e;
  border-color: rgba(248, 81, 73, 0.5);
}

[data-theme="dark"] .exit-item .action-text {
  color: #f85149;
}

[data-theme="dark"] .collapsed-icon {
  color: #7d8590;
  border-color: rgba(125, 133, 144, 0.3);
  background: #161b22;
}

[data-theme="dark"] .collapsed-icon:hover {
  background: #21262d;
  border-color: rgba(125, 133, 144, 0.5);
  color: #f0f6fc;
}
</style>