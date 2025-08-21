<!-- src/views/GameView.vue -->
<template>
  <div class="immortal-dashboard">
    <!-- 传统边框装饰 -->
    <div class="corner-decoration top-left"></div>
    <div class="corner-decoration top-right"></div>
    <div class="corner-decoration bottom-left"></div>
    <div class="corner-decoration bottom-right"></div>
    
    <!-- 顶部栏 -->
    <TopBar class="dashboard-header" />
    
    <!-- 主体五栏布局：左栏+左按钮+主面板+右按钮+右栏 -->
    <div class="dashboard-content" :class="layoutClass">
      <!-- 左侧功能栏 -->
      <aside class="left-panel" v-show="!leftCollapsed">
        <div class="sidebar-container">
          <LeftSidebar :collapsed="leftCollapsed" />
        </div>
      </aside>
      
      <!-- 左收缩按钮列 -->
      <div class="collapse-button-left">
        <button class="collapse-toggle" @click="handleLeftToggle">
          {{ leftCollapsed ? '▷' : '◁' }}
        </button>
      </div>
      
      <!-- 中间主游戏区域 -->
      <main class="main-panel">
        <MainGamePanel />
      </main>
      
      <!-- 右收缩按钮列 -->
      <div class="collapse-button-right">
        <button class="collapse-toggle" @click="handleRightToggle">
          {{ rightCollapsed ? '◁' : '▷' }}
        </button>
      </div>
      
      <!-- 右侧信息栏 -->
      <aside class="right-panel" v-show="!rightCollapsed">
        <div class="sidebar-container">
          <RightSidebar :collapsed="rightCollapsed" @show-realm-details="handleShowRealmDetails" />
        </div>
      </aside>
    </div>

    <!-- 境界详情模态框 -->
    <RealmModal 
      :isVisible="showRealmModal" 
      :realmData="realmModalData" 
      :currentProgress="currentRealmProgress"
      :maxProgress="maxRealmProgress"
      :breakthroughDescription="breakthroughDescription"
      @close="showRealmModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import TopBar from '@/components/dashboard/TopBar.vue';
import LeftSidebar from '@/components/dashboard/LeftSidebar.vue';
import MainGamePanel from '@/components/dashboard/MainGamePanel.vue';
import RightSidebar from '@/components/dashboard/RightSidebar.vue';
import RealmModal from '@/components/common/RealmModal.vue';
import { onMounted, computed, ref } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { REALM_DEFINITIONS } from '@/data/realms';

const characterStore = useCharacterStore();
const showRealmModal = ref(false);
const leftCollapsed = ref(false);
const rightCollapsed = ref(false);

onMounted(() => {
  if (!characterStore.activeCharacterProfile) {
    console.warn("【游戏视图】没有检测到激活的角色，数据可能不会显示。");
  }
});

// 从 store 中获取数据以供模板使用
const activeCharacter = computed(() => characterStore.activeCharacterProfile);
const activeSave = computed(() => characterStore.activeSaveSlot);

// 境界相关的计算属性
const currentRealmProgress = computed(() => {
  const save = activeSave.value;
  return save?.存档数据?.玩家角色状态?.境界?.当前进度 || 0;
});

const maxRealmProgress = computed(() => {
  const save = activeSave.value;
  return save?.存档数据?.玩家角色状态?.境界?.下一级所需 || 1;
});

const breakthroughDescription = computed(() => {
  const save = activeSave.value;
  return save?.存档数据?.玩家角色状态?.境界?.突破描述 || '';
});

const realmModalData = computed(() => {
  const save = activeSave.value;
  const realmLevel = save?.存档数据?.玩家角色状态?.境界?.等级;
  
  if (realmLevel) {
    const realmDef = REALM_DEFINITIONS.find(r => r.level === realmLevel);
    if (realmDef) {
      return {
        name: realmDef.name,
        title: realmDef.title,
        coreFeature: realmDef.coreFeature,
        lifespan: realmDef.lifespan,
        activityScope: realmDef.activityScope,
        gapDescription: realmDef.gapDescription,
      };
    }
  }
  
  return {
    name: '凡人',
    title: '初入尘世',
    coreFeature: '平凡之躯',
    lifespan: '数十载',
    activityScope: '凡间俗世',
    gapDescription: '尚未踏入修炼门径，需寻求仙缘。',
  };
});

// 计算布局类名
const layoutClass = computed(() => {
  if (leftCollapsed.value && rightCollapsed.value) return 'both-collapsed';
  if (leftCollapsed.value) return 'left-collapsed';
  if (rightCollapsed.value) return 'right-collapsed';
  return '';
});

// 处理境界详情显示
const handleShowRealmDetails = () => {
  showRealmModal.value = true;
};

// 处理侧栏收缩
const handleLeftToggle = () => {
  leftCollapsed.value = !leftCollapsed.value;
};

const handleRightToggle = () => {
  rightCollapsed.value = !rightCollapsed.value;
};
</script>

<style scoped>
/* 修仙界面 - 云台书院浅色主题 */
.immortal-dashboard {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  background: #F8F5F2; /* 暖白宣纸 */
  font-family: 'SimSun', 'NSimSun', 'STSong', '宋体', serif;
  display: flex;
  flex-direction: column;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
}

/* 传统边框装饰 - 天青色 */
.corner-decoration {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 1px solid #87CEEB; /* 天青色 */
  z-index: 1;
}

.top-left {
  top: 4px;
  left: 4px;
  border-right: none;
  border-bottom: none;
}

.top-right {
  top: 4px;
  right: 4px;
  border-left: none;
  border-bottom: none;
}

.bottom-left {
  bottom: 4px;
  left: 4px;
  border-right: none;
  border-top: none;
}

.bottom-right {
  bottom: 4px;
  right: 4px;
  border-left: none;
  border-top: none;
}

/* 顶部栏 - 清透白玉，无圆角 */
.dashboard-header {
  height: 48px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.95); /* 清透白玉 */
  border: 1px solid #87CEEB; /* 天青色边框 */
  margin-bottom: 0;
}

/* 主体内容区域 - 五列布局：左栏+左按钮+主面板+右按钮+右栏 */
.dashboard-content {
  flex: 1;
  display: grid;
  grid-template-columns: 240px 40px 1fr 40px 280px;
  gap: 0;
  min-height: 0;
  transition: grid-template-columns 0.3s ease;
}

.dashboard-content.left-collapsed {
  grid-template-columns: 0px 40px 1fr 40px 280px;
}

.dashboard-content.right-collapsed {
  grid-template-columns: 240px 40px 1fr 40px 0px;
}

.dashboard-content.both-collapsed {
  grid-template-columns: 0px 40px 1fr 40px 0px;
}

/* 收缩按钮列 */
.collapse-button-left,
.collapse-button-right {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 侧边面板容器 - 简化设计 */
.left-panel,
.right-panel {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #87CEEB;
  overflow: hidden;
  transition: all 0.3s ease;
}

.left-panel {
  border-left: 2px solid #87CEEB;
}

.right-panel {
  border-right: 2px solid #87CEEB;
}

/* 侧栏内容区域 - 收缩时完全隐藏 */
.sidebar-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* 主面板 - 清透白玉 */
.main-panel {
  background: rgba(255, 255, 255, 0.95); /* 清透白玉 */
  border: 1px solid #87CEEB; /* 天青色边框 */
  position: relative;
  overflow: hidden;
}

/* 收缩按钮 - 紧贴侧栏设计，无圆角无阴影 */
.collapse-toggle {
  width: 32px;
  height: 80px;
  background: linear-gradient(135deg, #F8F5F2 0%, #FFFFFF 50%, #F8F5F2 100%);
  border: 2px solid #87CEEB;
  cursor: pointer;
  color: #3A3A3A;
  font-weight: 900;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  box-shadow: 
    0 2px 8px rgba(135, 206, 235, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  letter-spacing: 2px;
}

/* 左按钮紧贴左侧栏 */
.collapse-button-left {
  margin-left: -1px;
}

/* 右按钮紧贴右侧栏 */
.collapse-button-right {
  margin-right: -1px;
}

.collapse-toggle:hover {
  background: linear-gradient(135deg, #87CEEB 0%, #B0E0E6 50%, #87CEEB 100%);
  color: #FFFFFF;
  border-color: #6495ED;
  box-shadow: 
    0 4px 16px rgba(135, 206, 235, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: scale(1.02);
}

.collapse-toggle:active {
  background: linear-gradient(135deg, #6495ED 0%, #87CEEB 50%, #6495ED 100%);
  transform: scale(0.98);
  box-shadow: 
    0 2px 8px rgba(135, 206, 235, 0.3),
    inset 0 2px 4px rgba(100, 149, 237, 0.2);
}

/* 深色主题 - 寒渊星府 */
[data-theme="dark"] .immortal-dashboard {
  background: #1A1C23; /* 玄青星野 */
}

[data-theme="dark"] .corner-decoration {
  border-color: #6A83A1; /* 凛冽寒钢 */
}

[data-theme="dark"] .dashboard-header {
  background: rgba(37, 40, 50, 0.95); /* 磨砂玄铁 */
  border-color: #6A83A1; /* 凛冽寒钢 */
}

[data-theme="dark"] .left-panel,
[data-theme="dark"] .right-panel,
[data-theme="dark"] .main-panel {
  background: rgba(37, 40, 50, 0.95); /* 磨砂玄铁 */
  border-color: #6A83A1; /* 凛冽寒钢 */
}

[data-theme="dark"] .left-panel {
  border-left-color: #6A83A1; /* 凛冽寒钢 */
}

[data-theme="dark"] .right-panel {
  border-right-color: #6A83A1; /* 凛冽寒钢 */
}

[data-theme="dark"] .collapse-toggle {
  background: linear-gradient(135deg, #252832 0%, #1A1C23 50%, #252832 100%);
  border-color: #6A83A1;
  color: #D1D5DB;
  box-shadow: 
    0 2px 8px rgba(106, 131, 161, 0.2),
    inset 0 1px 0 rgba(209, 213, 219, 0.1);
}

[data-theme="dark"] .collapse-toggle:hover {
  background: linear-gradient(135deg, #6A83A1 0%, #5A7298 50%, #6A83A1 100%);
  border-color: #5A7298;
  color: #FFFFFF;
  box-shadow: 
    0 4px 16px rgba(106, 131, 161, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .collapse-toggle:active {
  background: linear-gradient(135deg, #3A4A63 0%, #6A83A1 50%, #3A4A63 100%);
  box-shadow: 
    0 2px 8px rgba(106, 131, 161, 0.3),
    inset 0 2px 4px rgba(58, 74, 99, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    gap: 4px;
  }
  
  .left-panel,
  .right-panel {
    width: auto;
    height: 120px;
    flex-direction: column;
  }
  
  .left-panel.collapsed,
  .right-panel.collapsed {
    height: 40px;
    width: auto;
  }
  
  .collapse-toggle {
    writing-mode: horizontal-tb;
    text-orientation: upright;
    height: 20px;
    width: 100%;
    border-top: 1px solid #d0d7de;
    border-left: none;
    border-right: none;
  }
  
  .right-panel .collapse-toggle {
    border-bottom: 1px solid #d0d7de;
    border-top: none;
  }
  
  .immortal-dashboard {
    padding: 4px;
  }
  
  .dashboard-header {
    height: 40px;
    margin-bottom: 4px;
  }
  
  .corner-decoration {
    width: 16px;
    height: 16px;
  }
}

@media (max-width: 480px) {
  .immortal-dashboard {
    padding: 2px;
  }
  
  .dashboard-content {
    gap: 2px;
  }
  
  .dashboard-header {
    height: 36px;
    margin-bottom: 2px;
  }
  
  .left-panel,
  .right-panel {
    height: 100px;
  }
  
  .left-panel.collapsed,
  .right-panel.collapsed {
    height: 30px;
  }
  
  .corner-decoration {
    width: 12px;
    height: 12px;
  }
}
</style>