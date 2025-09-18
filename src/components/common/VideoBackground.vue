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

const props = withDefaults(defineProps<{
  src?: string
}>(), {
  src: 'http://38.55.124.252:13145/1394774d3043156d.mp4'
})

const videoRef = ref<HTMLVideoElement>()

const loadVideo = async (url: string) => {
  if (!videoRef.value) {
    console.warn('[VideoBackground] video元素未准备好')
    return
  }

  console.log(`[VideoBackground] 直接加载视频: ${url}`)
  videoRef.value.src = url
  videoRef.value.load()

  // 使用用户交互来启动播放
  const tryPlay = async () => {
    try {
      await videoRef.value!.play()
      console.log(`[VideoBackground] 视频播放成功`)
    } catch (error) {
      console.log('[VideoBackground] 自动播放失败，等待用户交互')
      // 监听用户交互来启动播放
      const handleUserInteraction = async () => {
        try {
          await videoRef.value!.play()
          console.log(`[VideoBackground] 用户交互后视频播放成功`)
          // 移除事件监听器
          document.removeEventListener('click', handleUserInteraction)
          document.removeEventListener('keydown', handleUserInteraction)
          document.removeEventListener('touchstart', handleUserInteraction)
        } catch (playError) {
          console.warn('[VideoBackground] 即使用户交互后仍无法播放:', playError)
        }
      }

      // 添加多种用户交互事件监听
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
  }
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
}
</script>

<style scoped>
.video-background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
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
