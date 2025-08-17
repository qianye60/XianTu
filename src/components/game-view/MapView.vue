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
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import Map from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Stroke, Fill } from 'ol/style';
import Overlay from 'ol/Overlay';
import Projection from 'ol/proj/Projection';
import { getCenter } from 'ol/extent';
import 'ol/ol.css';

const store = useCharacterCreationStore();
const mapContainerRef = ref<HTMLElement | null>(null);
let mapInstance: Map | null = null;

const mapData = computed(() => store.mapData);

const initializeMap = () => {
  if (mapInstance || !mapContainerRef.value || !mapData.value) {
    return;
  }

  // 1. 定义"太初道图"的范围 (Extent)
  const mapExtent = [0, 0, 4096, 4096];

  // 2. 创建一个自定义的像素坐标系 (Projection)
  const projection = new Projection({
    code: 'xkcd-image',
    units: 'pixels',
    extent: mapExtent,
  });

  // 3. 创建 GeoJSON 图层
  const vectorSource = new VectorSource({
    features: new GeoJSON().readFeatures(mapData.value, {
      // 确保 GeoJSON 数据使用我们自定义的像素坐标系
      featureProjection: projection,
    }),
  });

  // 4. 定义图层的样式
  const vectorLayer = new VectorLayer({
    source: vectorSource,
    style: (feature: any) => {
      const featureType = feature.get('type') || 'default';
      let strokeColor = '#e5c07b'; // 金色
      let fillColor = 'rgba(136, 192, 208, 0.2)'; // 淡蓝色
      let strokeWidth = 2;

      switch (featureType) {
        case 'continent':
          fillColor = 'rgba(65, 72, 104, 0.4)';
          strokeColor = '#a9b1d6';
          strokeWidth = 3;
          break;
        case 'mountain_range':
          fillColor = 'rgba(187, 154, 247, 0.3)';
          strokeColor = '#bb9af7';
          break;
        case 'river':
          fillColor = 'rgba(122, 162, 247, 0.5)';
          strokeColor = '#7aa2f7';
          strokeWidth = 4;
          break;
        case 'sect':
        case 'city':
          // 对于点状要素，可以设置不同的样式，这里暂时不做区分
          break;
      }

      return new Style({
        stroke: new Stroke({
          color: strokeColor,
          width: strokeWidth,
        }),
        fill: new Fill({
          color: fillColor,
        }),
      });
    }
  });

  // 5. 初始化地图实例
  mapInstance = new Map({
    target: mapContainerRef.value,
    layers: [vectorLayer],
    view: new View({
      projection: projection,
      center: getCenter(mapExtent), // 地图中心
      zoom: 2,
      minZoom: 1,
      maxZoom: 8,
      extent: mapExtent, // 限制视图范围
    }),
  });

  // 6. 添加交互：鼠标悬浮时显示名称
  const popupElement = document.createElement('div');
  popupElement.className = 'ol-popup';
  const popup = new Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    stopEvent: false,
    offset: [0, -15],
  });
  mapInstance.addOverlay(popup);

  mapInstance.on('pointermove', (evt: any) => {
    if (evt.dragging) {
      return;
    }
    const feature = mapInstance!.forEachFeatureAtPixel(evt.pixel, (f: any) => f);
    popupElement.style.display = feature ? '' : 'none';
    if (feature && feature.get('name')) {
      popup.setPosition(evt.coordinate);
      popupElement.innerHTML = `<h4>${feature.get('name')}</h4>${feature.get('description') || ''}`;
    }
  });
};

onMounted(() => {
  initializeMap();
});

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.setTarget(undefined);
    mapInstance = null;
  }
});

// 如果 mapData 是异步加载的，需要监听它的变化
watch(mapData, (newData) => {
  if (newData && !mapInstance) {
    initializeMap();
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
  background-color: #1a1b26; /* 深色背景，与主题匹配 */
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
  color: #c0caf5;
}

/* 自定义弹出框样式 */
.ol-popup {
  position: absolute;
  background-color: #24283b;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  padding: 10px 15px;
  border-radius: 10px;
  border: 1px solid #414868;
  bottom: 12px;
  left: -50px;
  min-width: 180px;
  color: #c0caf5;
  font-size: 14px;
  white-space: nowrap;
  transform: translateX(-50%);
}
.ol-popup:after, .ol-popup:before {
  top: 100%;
  border: solid transparent;
  content: " ";
  height: 0;
  width: 0;
  position: absolute;
  pointer-events: none;
}
.ol-popup:after {
  border-top-color: #24283b;
  border-width: 10px;
  left: 50%;
  margin-left: -10px;
}
.ol-popup:before {
  border-top-color: #414868;
  border-width: 11px;
  left: 50%;
  margin-left: -11px;
}
.ol-popup h4 {
  margin: 0 0 5px 0;
  color: #bb9af7;
  font-size: 16px;
}
</style>