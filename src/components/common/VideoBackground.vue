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
  if (!videoRef.value) {
    console.warn('[VideoBackground] video元素未准备好')
    return
  }

  // 在加载新视频前，如果存在旧的 object URL，先释放掉
  if (videoRef.value.src.startsWith('blob:')) {
    console.log(`[VideoBackground] 释放旧的 Object URL: ${videoRef.value.src}`)
    URL.revokeObjectURL(videoRef.value.src)
  }

  try {
    // 使用原始 URL 作为缓存的键
    const cachedVideo = await getVideo(originalUrl)
    if (cachedVideo) {
      console.log(`[VideoBackground] 从IndexedDB加载视频: ${originalUrl}`)
      const objectURL = URL.createObjectURL(cachedVideo)
      console.log(`[VideoBackground] 创建新的 Object URL: ${objectURL}`)
      videoRef.value.src = objectURL
    } else {
      // 直接尝试从原始 URL 获取
      console.log(`[VideoBackground] 尝试从网络加载视频: ${originalUrl}`);
      const response = await fetch(originalUrl);
      if (!response.ok) {
        throw new Error(`网络响应错误: ${response.statusText}`);
      }
      const videoBlob = await response.blob();

      // 存入缓存
      await setVideo(originalUrl, videoBlob);
      console.log(`[VideoBackground] 视频已成功存入缓存: ${originalUrl}`);

      const objectURL = URL.createObjectURL(videoBlob);
      console.log(`[VideoBackground] 创建新的 Object URL: ${objectURL}`);
      videoRef.value.src = objectURL;
    }
    videoRef.value.load();
  } catch (error) {
    console.warn(`[VideoBackground] 加载或缓存视频失败:`, error);
    console.log(`[VideoBackground] 可能是跨域（CORS）问题，无法缓存。正在回退到直接播放模式...`);
    // 如果发生错误（很可能是CORS错误），则直接使用原始URL
    videoRef.value.src = originalUrl;
    videoRef.value.load();
  }

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
    // 组件卸载时，释放 object URL
    if (videoRef.value.src.startsWith('blob:')) {
      console.log(`[VideoBackground] 组件卸载，释放 Object URL: ${videoRef.value.src}`)
      URL.revokeObjectURL(videoRef.value.src)
    }
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