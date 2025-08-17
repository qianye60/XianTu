<!-- src/views/MapView.vue -->
<template>
  <div id="map-container" ref="mapContainer"></div>
  <!-- 新增：初始消息展示面板 -->
  <div v-if="initialMessage" class="initial-message-panel">
    <h4 class="message-title">--- 降世法旨 ---</h4>
    <p class="message-body" v-html="formattedMessage"></p>
    <!-- 建议按钮暂时移除，等待后续交互系统 -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { generateMapData, generateInitialMessage } from '@/utils/tavernAI';
import { processGmResponse } from '@/utils/AIGameMaster'; // 引入指令处理器
import { getTavernHelper } from '@/utils/tavern';
import { toast } from '@/utils/toast';
import type { CharacterData } from '@/types';
import type { GM_Response } from '@/types/AIGameMaster';

// 接收从 App.vue 传来的角色信息和创角摘要
const props = defineProps<{
  character: CharacterData | null,
  summary: { name: string; origin: string; spiritRoot: string; age: number; } | null
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
const initialMessage = ref<GM_Response | null>(null);

const formattedMessage = computed(() => {
  return initialMessage.value?.text.replace(/\\n/g, '<br />') || '';
});

onMounted(async () => {
  if (mapContainer.value) {
    try {
      // 1. 初始化坤舆图
      map = L.map(mapContainer.value).setView([20, 0], 2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      toast.info('正在向天机阁请求舆图...');
      // 2. 从AI获取地图数据
      const geoJsonData = await generateMapData();

      if (!geoJsonData) {
        toast.error('获取舆图失败，无法绘制山河。');
        return;
      }

      toast.success('舆图绘制成功！');
      // 3. 渲染数据
      renderMapFeatures(geoJsonData);
      
      // 4. 将舆图存入酒馆变量
      try {
        const helper = getTavernHelper();
        if (helper && helper.setVariable) {
          await helper.setVariable('chat', 'world.mapData', geoJsonData);
          toast.info('当前世界舆图已铭刻入本会话。');
        }
      } catch (e) {
        console.error("铭刻舆图失败:", e);
        toast.error("舆图铭刻失败，或与酒馆灵脉连接不畅。");
      }

      // 5. 如果有角色和创角摘要，则生成降世法旨并执行
      if (props.character && props.summary) {
        toast.info('天地初开，正在为你衍化第一缕天机...');
        
        // 构造新的 creationDetails 对象
        const creationDetails = {
          age: props.summary.age,
          originName: props.summary.origin,
          spiritRootName: props.summary.spiritRoot,
        };

        // 调用新的GM模式创世函数
        const gmResponse = await generateInitialMessage(props.character, creationDetails, geoJsonData);
        
        if (gmResponse && gmResponse.text) {
          initialMessage.value = gmResponse;
          toast.success('请查收你的降世法旨！');

          // 关键：执行AI返回的指令
          // 传入角色上下文，以便指令处理器进行后端同步
          if (props.character) {
            await processGmResponse(gmResponse, props.character);
          } else {
             // 理论上不应发生，因为前面已有检查
            toast.error("执行创世指令失败：角色上下文丢失。");
          }

        } else {
          toast.error('天机紊乱，降世失败。');
        }
      }

    } catch (error) {
      console.error("地图初始化或数据获取失败:", error);
      toast.error('坤舆图志开辟失败，请检查天机阁连接。');
    }
  }
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

function renderMapFeatures(geoJsonData: any) {
  // ... (此函数内容与之前相同，保持不变)
  if (!map) return;
  const geoJsonLayer = L.geoJSON(geoJsonData, {
    style: (feature) => {
      if (feature?.geometry.type === 'Polygon' && feature.properties.style) {
        return feature.properties.style;
      }
      return { color: '#ffffff', weight: 1, opacity: 0.6, fillColor: '#888888', fillOpacity: 0.2 };
    },
    pointToLayer: (feature, latlng) => L.marker(latlng),
    onEachFeature: (feature, layer) => {
      if (feature.properties && feature.properties.name) {
        const popupContent = `
          <div class="map-popup">
            <h4 class="popup-title">${feature.properties.name}</h4>
            <p class="popup-description">${feature.properties.description || '暂无描述'}</p>
          </div>
        `;
        layer.bindPopup(popupContent);
      }
    }
  }).addTo(map);
  if (geoJsonLayer.getBounds().isValid()) {
    map.fitBounds(geoJsonLayer.getBounds().pad(0.1));
  }
}
</script>

<style>
#map-container {
  width: 100%;
  height: 100vh;
  background-color: #1a1a1a;
  z-index: 1;
}
.initial-message-panel {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 700px;
  background: rgba(20, 20, 20, 0.85);
  border: 1px solid #555;
  border-radius: 12px;
  padding: 20px 25px;
  color: #e0e0e0;
  backdrop-filter: blur(10px);
  z-index: 1000;
  box-shadow: 0 0 30px rgba(0,0,0,0.5);
  animation: slide-up 0.5s ease-out;
}
@keyframes slide-up {
  from {
    transform: translate(-50%, 100px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%);
    opacity: 1;
  }
}
.message-title {
  text-align: center;
  color: #e5c07b;
  font-size: 1.1em;
  margin: 0 0 15px 0;
  letter-spacing: 2px;
}
.message-location {
  text-align: center;
  font-size: 1.2em;
  font-weight: bold;
  color: #fff;
  margin: 0 0 15px 0;
}
.message-body {
  text-indent: 2em;
  line-height: 1.7;
  margin: 0 0 20px 0;
}
.suggestions {
  display: flex;
  justify-content: center;
  gap: 15px;
}
.suggestion-button {
  background: rgba(229, 192, 123, 0.2);
  border: 1px solid #e5c07b;
  color: #e5c07b;
  padding: 8px 15px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.suggestion-button:hover {
  background: #e5c07b;
  color: #1a1a1a;
}
/* ... (弹窗样式与之前相同) ... */
.map-popup { font-family: 'Microsoft YaHei', sans-serif; color: #e0e0e0; }
.popup-title { margin: 0 0 8px 0; padding-bottom: 5px; border-bottom: 1px solid #444; color: #f59e0b; font-size: 1.1em; }
.popup-description { margin: 0; font-size: 0.95em; line-height: 1.5; }
.leaflet-popup-content-wrapper { background: #2a2a2a; color: #fff; border-radius: 8px; box-shadow: 0 3px 14px rgba(0,0,0,0.4); }
.leaflet-popup-content { margin: 13px 19px; line-height: 1.4; }
.leaflet-popup-tip { background: #2a2a2a; }
.leaflet-container a.leaflet-popup-close-button { color: #ccc; }
</style>