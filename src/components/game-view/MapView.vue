<!-- src/components/game-view/MapView.vue -->
<template>
  <div class="map-view-container">
    <div id="map-instance" ref="mapContainerRef"></div>
    <div v-if="!mapData" class="map-loading">
      <p>舆图数据缺失，无法衍化山河...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import 'leaflet/dist/leaflet.css'; // 虽然CDN加载了，但为了Vite构建有时需要显式导入
import L from 'leaflet';

const store = useCharacterCreationStore();
const mapContainerRef = ref<HTMLElement | null>(null);
let mapInstance: L.Map | null = null;

const mapData = computed(() => store.mapData);

onMounted(() => {
  if (mapContainerRef.value && mapData.value) {
    // 1. 初始化地图
    mapInstance = L.map(mapContainerRef.value, {
      crs: L.CRS.Simple, // 使用简单的坐标系，因为这不是真实世界地图
      center: [0, 0], // 默认中心
      zoom: 1,
      zoomControl: true,
    });

    // 2. 添加深色底图 (使用CartoDB的暗色瓦片)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapInstance);

    // 3. 渲染GeoJSON数据
    const geoJsonLayer = L.geoJSON(mapData.value, {
      style: (feature) => {
        // 根据特征类型或其他属性设置不同样式
        return {
          color: '#e5c07b', // 边框颜色 - 金色
          weight: 2,
          opacity: 0.8,
          fillColor: '#88c0d0', // 填充颜色 - 淡蓝色
          fillOpacity: 0.2
        };
      },
      onEachFeature: (feature, layer) => {
        // 为每个区域绑定一个弹出窗口
        if (feature.properties && feature.properties.name) {
          let popupContent = `<h4>${feature.properties.name}</h4>`;
          if (feature.properties.description) {
            popupContent += `<p>${feature.properties.description}</p>`;
          }
          layer.bindPopup(popupContent);
        }
      }
    }).addTo(mapInstance);

    // 4. 自动缩放到合适的视野
    mapInstance.fitBounds(geoJsonLayer.getBounds());
  }
});

onUnmounted(() => {
  // 销毁地图实例，防止内存泄漏
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<style scoped>
.map-view-container {
  width: 100%;
  height: 100%;
  position: relative;
}

#map-instance {
  width: 100%;
  height: 100%;
  background-color: #1a1a1a;
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(26, 26, 26, 0.8);
  color: #a0a0a0;
}
</style>