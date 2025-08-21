<template>
  <div class="video-background-container">
    <video
      ref="videoRef"
      autoplay
      muted
      loop
      playsinline
      class="video-background"
      @loadstart="onLoadStart"
      @canplaythrough="onCanPlayThrough"
      @error="onError"
    ></video>
    <div class="video-overlay"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { VideoCache } from '@/utils/videoCache'

const props = withDefaults(defineProps<{
  src?: string
  autoPreload?: boolean
}>(), {
  src: 'http://38.55.124.252:13145/1394774d3043156d.mp4',
  autoPreload: true
})

const videoRef = ref<HTMLVideoElement>()
const cache = VideoCache.getInstance()
let isLoading = false

const loadVideoWithCache = async (url: string) => {
  if (isLoading) {
    console.log('[VideoBackground] 已在加载中，跳过重复请求')
    return
  }
  
  if (!videoRef.value) {
    console.warn('[VideoBackground] video元素未准备好')
    return
  }

  // 检查是否已缓存
  if (cache.isVideoCached(url)) {
    console.log(`[VideoBackground] 使用已缓存的视频: ${url}`)
    try {
      const cachedVideo = await cache.getVideo(url)
      videoRef.value.src = cachedVideo.src
      videoRef.value.currentTime = 0 // 重置到开头
      
      try {
        await videoRef.value.play()
        console.log(`[VideoBackground] 缓存视频开始播放`)
      } catch (playError) {
        console.warn('[VideoBackground] 自动播放被阻止，这是正常现象')
      }
    } catch (error) {
      console.error('[VideoBackground] 使用缓存视频失败:', error)
    }
    return
  }

  // 加载新视频
  isLoading = true
  try {
    console.log(`[VideoBackground] 开始缓存新视频: ${url}`)
    const cachedVideo = await cache.getVideo(url)
    
    if (videoRef.value) {
      videoRef.value.src = cachedVideo.src
      videoRef.value.currentTime = 0
      
      try {
        await videoRef.value.play()
        console.log(`[VideoBackground] 新视频缓存完成并开始播放`)
      } catch (playError) {
        console.warn('[VideoBackground] 自动播放被阻止，这是正常现象')
      }
    }
  } catch (error) {
    console.error('[VideoBackground] 视频缓存失败，使用直接加载:', error)
    // 回退方案：直接设置src
    if (videoRef.value) {
      videoRef.value.src = url
      videoRef.value.load()
    }
  } finally {
    isLoading = false
  }
}

onMounted(async () => {
  await loadVideoWithCache(props.src)
})

// 监听src变化
watch(() => props.src, async (newSrc) => {
  if (newSrc) {
    await loadVideoWithCache(newSrc)
  }
})

onUnmounted(() => {
  if (videoRef.value) {
    videoRef.value.pause()
  }
  isLoading = false
})

// 事件处理
const onLoadStart = () => {
  console.log('[VideoBackground] 开始加载视频')
}

const onCanPlayThrough = () => {
  console.log('[VideoBackground] 视频可以流畅播放')
}

const onError = (event: Event) => {
  console.error('[VideoBackground] 视频播放错误:', event)
  isLoading = false
}

// 导出缓存管理器供外部使用
defineExpose({
  preloadVideo: (url: string) => cache.preloadVideo(url),
  clearCache: () => cache.clearCache(),
  reloadVideo: () => loadVideoWithCache(props.src)
})
</script>

<style scoped>
.video-background-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -2;
}

.video-background {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: translate(-50%, -50%);
  z-index: -2;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(10, 15, 24, 0.2);
  z-index: -1;
}
</style>