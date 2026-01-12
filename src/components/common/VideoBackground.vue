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
import { getVideo, setVideo } from '@/utils/videoCache'

const props = withDefaults(defineProps<{
  src?: string
}>(), {
  src: 'https://ddct.top/backgroundvedio.mp4'
})

const videoRef = ref<HTMLVideoElement>()

const loadVideo = async (originalUrl: string) => {
  if (!videoRef.value) return

  // 在加载新视频前，如果存在旧的 object URL，先释放掉
  if (videoRef.value.src.startsWith('blob:')) {
    URL.revokeObjectURL(videoRef.value.src)
  }

  try {
    // 使用原始 URL 作为缓存的键
    const cachedVideo = await getVideo(originalUrl)
    if (!videoRef.value) return // 组件可能已卸载

    if (cachedVideo) {
      const objectURL = URL.createObjectURL(cachedVideo)
      videoRef.value.src = objectURL
    } else {
      const response = await fetch(originalUrl);
      if (!response.ok) {
        throw new Error(`网络响应错误: ${response.statusText}`);
      }
      const videoBlob = await response.blob();
      if (!videoRef.value) return // 组件可能已卸载

      // 存入缓存
      await setVideo(originalUrl, videoBlob);

      if (!videoRef.value) return // 组件可能已卸载
      const objectURL = URL.createObjectURL(videoBlob);
      videoRef.value.src = objectURL;
    }
    videoRef.value.load();
  } catch (_error) {
    // 如果发生错误（很可能是CORS错误），则直接使用原始URL
    if (!videoRef.value) return
    videoRef.value.src = originalUrl;
    videoRef.value.load();
  }

  if (!videoRef.value) return

  // 使用用户交互来启动播放
  const tryPlay = async () => {
    if (!videoRef.value) return
    try {
      await videoRef.value.play()
    } catch {
      // 监听用户交互来启动播放
      const handleUserInteraction = async () => {
        if (!videoRef.value) return
        try {
          await videoRef.value.play()
          document.removeEventListener('click', handleUserInteraction)
          document.removeEventListener('keydown', handleUserInteraction)
          document.removeEventListener('touchstart', handleUserInteraction)
        } catch {
          // 忽略播放错误
        }
      }

      document.addEventListener('click', handleUserInteraction, { once: true })
      document.addEventListener('keydown', handleUserInteraction, { once: true })
      document.addEventListener('touchstart', handleUserInteraction, { once: true })
    }
  }

  // 等待视频数据加载后尝试播放
  if (videoRef.value.readyState >= 3) {
    await tryPlay()
  } else {
    videoRef.value.addEventListener('canplay', tryPlay, { once: true })
  }
}

onMounted(async () => {
  await loadVideo(props.src)
})

// 监听src变化
watch(() => props.src, async (newSrc) => {
  if (newSrc) {
    await loadVideo(newSrc)
  }
})

onUnmounted(() => {
  if (videoRef.value) {
    videoRef.value.pause()
    // 组件卸载时，释放 object URL
    if (videoRef.value.src.startsWith('blob:')) {
      URL.revokeObjectURL(videoRef.value.src)
    }
  }
})

// 事件处理
const onLoadStart = () => {}
const onCanPlayThrough = () => {}
const onError = () => {}
</script>

<style scoped>
.video-background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -10;
  pointer-events: none;
  background-color: #1a1b26; /* 简单的暗色背景作为备用 */
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
  filter: brightness(1.15) saturate(1.1);
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(10, 15, 24, 0);
  z-index: -1;
}
</style>