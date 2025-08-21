<template>
  <div class="top-bar-container">
    <div class="location-section">
      <div class="location-item">
        <span class="location-text">{{ currentLocation }}</span>
      </div>
    </div>
    
    <div class="time-section">
      <div class="time-display">
        <span class="time-text">{{ formattedGameTime }}</span>
      </div>
    </div>

    <div class="actions-section">
      <label class="theme-toggle-container" @click.prevent="toggleTheme">
        <input type="checkbox" ref="themeCheckbox" :checked="!isDarkMode">
        <svg viewBox="0 0 384 512" height="1em" xmlns="http://www.w3.org/2000/svg" class="moon">
          <path d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"></path>
        </svg>
        <svg viewBox="0 0 512 512" height="1em" xmlns="http://www.w3.org/2000/svg" class="sun">
          <path d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.8 4.6 11.9 9.6s1.5 10.7-1.6 15.2L446.9 256l62.3 90.3c3.1 4.5 3.7 10.2 1.6 15.2s-6.6 8.6-11.9 9.6L391 391 371.1 498.9c-1 5.3-4.6 9.8-9.6 11.9s-10.7 1.5-15.2-1.6L256 446.9l-90.3 62.3c-4.5 3.1-10.2 3.7-15.2 1.6s-8.6-6.6-9.6-11.9L121 391 13.1 371.1c-5.3-1-9.8-4.6-11.9-9.6s-1.5-10.7 1.6-15.2L65.1 256 2.8 165.7c-3.1-4.5-3.7-10.2-1.6-15.2s6.6-8.6 11.9-9.6L121 121 140.9 13.1c1-5.3 4.6-9.8 9.6-11.9s10.7-1.5 15.2 1.6L256 65.1 346.3 2.8c4.5-3.1 10.2-3.7 15.2-1.6zM160 256a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zm224 0a128 128 0 1 0 -256 0 128 128 0 1 0 256 0z"></path>
        </svg>
      </label>
      
      <label class="fullscreen-toggle-container" @click.prevent="toggleFullscreen">
        <input type="checkbox" ref="fullscreenCheckbox">
        <svg viewBox="0 0 448 512" height="1em" xmlns="http://www.w3.org/2000/svg" class="expand">
          <path d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z"></path>
        </svg>
        <svg viewBox="0 0 448 512" height="1em" xmlns="http://www.w3.org/2000/svg" class="compress">
          <path d="M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V64zM32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32H96v64c0 17.7 14.3 32 32 32s32-14.3 32-32V352c0-17.7-14.3-32-32-32H32zM352 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H352V64zM320 320c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32s32-14.3 32-32V384h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320z"></path>
        </svg>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { getTavernHelper } from '@/utils/tavern';

const store = useCharacterStore();
const themeCheckbox = ref<HTMLInputElement>();
const fullscreenCheckbox = ref<HTMLInputElement>();

// 跟踪当前主题状态
const isDarkMode = computed(() => {
  return document.documentElement.getAttribute('data-theme') === 'dark';
});

const currentLocation = computed(() => {
  const save = store.activeSaveSlot;
  if (save?.存档数据?.玩家角色状态?.位置?.描述) {
    return save.存档数据.玩家角色状态.位置.描述;
  }
  return '青云镇';
});

// 从酒馆变量获取世界背景时代信息
const worldEra = ref<string>('仙道');

const loadWorldEraFromTavern = async () => {
  try {
    const helper = getTavernHelper();
    if (helper) {
      const tavernVars = await helper.getVariables({ type: 'global' });
      const worldBackground = tavernVars['world_background'];
      if (worldBackground && worldBackground.era) {
        worldEra.value = worldBackground.era;
      }
    }
  } catch (error) {
    console.warn('无法从酒馆读取世界背景时代信息:', error);
  }
};

const formattedGameTime = computed(() => {
  const save = store.activeSaveSlot;
  if (save?.存档数据?.游戏时间) {
    const time = save.存档数据.游戏时间;
    const formattedMinutes = time.分钟.toString().padStart(2, '0');
    const formattedHours = time.小时.toString().padStart(2, '0');
    
    return `${worldEra.value}${time.年}年${time.月}月${time.日}日 - ${formattedHours}:${formattedMinutes}`;
  }
  return `${worldEra.value}元年1月1日 - 00:00`;
});


const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // 更新checkbox状态
  if (themeCheckbox.value) {
    themeCheckbox.value.checked = newTheme === 'light';
  }
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      if (fullscreenCheckbox.value) {
        fullscreenCheckbox.value.checked = true;
      }
    }).catch(err => {
      console.error('无法进入全屏模式:', err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => {
        if (fullscreenCheckbox.value) {
          fullscreenCheckbox.value.checked = false;
        }
      }).catch(err => {
        console.error('无法退出全屏模式:', err);
      });
    }
  }
};

onMounted(() => {
  // Initialize theme checkbox state
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (themeCheckbox.value) {
    themeCheckbox.value.checked = currentTheme === 'light';
  }
  
  // Initialize fullscreen checkbox state
  if (fullscreenCheckbox.value) {
    fullscreenCheckbox.value.checked = !!document.fullscreenElement;
  }
  
  // Load world era from tavern
  loadWorldEraFromTavern();
  
  // Listen for fullscreen changes
  const handleFullscreenChange = () => {
    if (fullscreenCheckbox.value) {
      fullscreenCheckbox.value.checked = !!document.fullscreenElement;
    }
  };
  
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
});
</script>

<style scoped>
.top-bar-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  font-family: 'SimSun', 'NSimSun', 'STSong', '宋体', serif;
}

.location-section {
  flex: 1;
}

.location-item {
  display: flex;
  align-items: center;
}

.location-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-primary, #66BB6A);
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.time-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 2;
}

.time-display {
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: #424242;
  font-family: 'SimSun', 'NSimSun', 'STSong', '宋体', serif;
  text-align: center;
  letter-spacing: 0.5px;
}

.actions-section {
  display: flex;
  gap: 1rem;
  flex: 1;
  justify-content: flex-end;
  align-items: center;
}

/* Theme Toggle Styles */
.theme-toggle-container {
  --color: #a5a5b0;
  --size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
  font-size: var(--size);
  user-select: none;
  fill: var(--color);
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.theme-toggle-container:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.9);
}

.theme-toggle-container .moon {
  position: absolute;
  animation: toggle-fill .5s;
}

.theme-toggle-container .sun {
  position: absolute;
  display: none;
  animation: toggle-fill .5s;
}

.theme-toggle-container input:checked ~ .moon {
  display: none;
}

.theme-toggle-container input:checked ~ .sun {
  display: block;
}

/* Fullscreen Toggle Styles */
.fullscreen-toggle-container {
  --color: #a5a5b0;
  --size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
  font-size: var(--size);
  user-select: none;
  fill: var(--color);
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.fullscreen-toggle-container:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.9);
}

.fullscreen-toggle-container .expand {
  position: absolute;
  animation: fullscreen-fill .5s;
}

.fullscreen-toggle-container .compress {
  position: absolute;
  display: none;
  animation: fullscreen-fill .5s;
}

.fullscreen-toggle-container input:checked ~ .expand {
  display: none;
}

.fullscreen-toggle-container input:checked ~ .compress {
  display: block;
}

/* Hide the default checkbox */
.theme-toggle-container input,
.fullscreen-toggle-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

/* Toggle Animation */
@keyframes toggle-fill {
  0% {
    transform: rotate(-360deg) scale(0);
    opacity: 0;
  }
  75% {
    transform: rotate(25deg);
  }
  100% {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
}

@keyframes fullscreen-fill {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 暗色主题适配 */
[data-theme="dark"] .top-bar-container {
  background: rgba(41, 51, 72, 0.9);
}

[data-theme="dark"] .location-text {
  color: var(--color-primary, #82A3F5);
}

[data-theme="dark"] .time-text {
  color: #ffffff;
}

[data-theme="dark"] .theme-toggle-container {
  --color: #82A3F5;
  background: rgba(41, 51, 72, 0.8);
  border: 1px solid rgba(130, 163, 245, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .theme-toggle-container:hover {
  background: rgba(41, 51, 72, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

[data-theme="dark"] .fullscreen-toggle-container {
  --color: #82A3F5;
  background: rgba(41, 51, 72, 0.8);
  border: 1px solid rgba(130, 163, 245, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .fullscreen-toggle-container:hover {
  background: rgba(41, 51, 72, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
</style>