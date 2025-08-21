// 全局视频缓存管理
export class VideoCache {
  private static instance: VideoCache
  private cachedVideos: Map<string, HTMLVideoElement> = new Map()
  private loadingPromises: Map<string, Promise<HTMLVideoElement>> = new Map()
  private preloadStarted: Set<string> = new Set() // 记录已开始预加载的URL
  
  // 默认视频URL
  static readonly DEFAULT_VIDEO_URL = 'http://38.55.124.252:13145/1394774d3043156d.mp4'

  static getInstance(): VideoCache {
    if (!VideoCache.instance) {
      VideoCache.instance = new VideoCache()
      console.log('[VideoCache] 创建缓存实例')
    }
    return VideoCache.instance
  }

  private constructor() {
    // 私有构造函数确保单例
    // 立即开始预加载默认视频，但只预加载一次
    this.preloadVideo(VideoCache.DEFAULT_VIDEO_URL)
  }

  async getVideo(url: string): Promise<HTMLVideoElement> {
    console.log(`[VideoCache] 请求视频: ${url}`)
    
    // 如果已经缓存，直接返回克隆
    if (this.cachedVideos.has(url)) {
      const cachedVideo = this.cachedVideos.get(url)!
      console.log(`[VideoCache] 返回已缓存视频: ${url}`)
      return this.cloneVideo(cachedVideo)
    }

    // 如果正在加载，等待加载完成
    if (this.loadingPromises.has(url)) {
      console.log(`[VideoCache] 等待正在加载的视频: ${url}`)
      const loadedVideo = await this.loadingPromises.get(url)!
      return this.cloneVideo(loadedVideo)
    }

    // 创建新的加载Promise
    console.log(`[VideoCache] 开始加载新视频: ${url}`)
    const loadingPromise = this.loadVideo(url)
    this.loadingPromises.set(url, loadingPromise)

    try {
      const video = await loadingPromise
      this.cachedVideos.set(url, video)
      this.loadingPromises.delete(url)
      console.log(`[VideoCache] 视频加载并缓存完成: ${url}`)
      
      return this.cloneVideo(video)
    } catch (error) {
      this.loadingPromises.delete(url)
      console.error(`[VideoCache] 视频加载失败: ${url}`, error)
      throw error
    }
  }

  private cloneVideo(originalVideo: HTMLVideoElement): HTMLVideoElement {
    const clonedVideo = originalVideo.cloneNode(true) as HTMLVideoElement
    clonedVideo.currentTime = 0 // 重置到开头
    return clonedVideo
  }

  private loadVideo(url: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.src = url
      video.muted = true
      video.loop = true
      video.playsInline = true
      video.preload = 'auto'
      video.crossOrigin = 'anonymous'

      const cleanup = () => {
        video.removeEventListener('canplaythrough', onSuccess)
        video.removeEventListener('error', onError)
        video.removeEventListener('abort', onError)
      }

      const onSuccess = () => {
        cleanup()
        console.log(`[VideoCache] 视频预加载成功: ${url}`)
        resolve(video)
      }

      const onError = (e: Event) => {
        cleanup()
        console.error(`[VideoCache] 视频预加载失败: ${url}`, e)
        reject(new Error(`Failed to load video: ${url}`))
      }

      video.addEventListener('canplaythrough', onSuccess, { once: true })
      video.addEventListener('error', onError, { once: true })
      video.addEventListener('abort', onError, { once: true })

      // 开始加载
      video.load()
    })
  }

  // 预加载视频 - 避免重复预加载
  preloadVideo(url: string): void {
    if (this.preloadStarted.has(url)) {
      console.log(`[VideoCache] 跳过重复预加载: ${url}`)
      return
    }
    
    if (this.cachedVideos.has(url)) {
      console.log(`[VideoCache] 视频已缓存，跳过预加载: ${url}`)
      return
    }
    
    if (this.loadingPromises.has(url)) {
      console.log(`[VideoCache] 视频正在加载，跳过预加载: ${url}`)
      return
    }

    console.log(`[VideoCache] 开始预加载视频: ${url}`)
    this.preloadStarted.add(url)
    
    this.getVideo(url).catch(err => {
      console.warn(`[VideoCache] 预加载失败: ${url}`, err)
      this.preloadStarted.delete(url) // 失败时允许重试
    })
  }

  // 检查是否已缓存
  isVideoCached(url: string): boolean {
    const isCached = this.cachedVideos.has(url)
    console.log(`[VideoCache] 检查缓存状态 ${url}: ${isCached ? '已缓存' : '未缓存'}`)
    return isCached
  }

  // 检查是否正在加载
  isVideoLoading(url: string): boolean {
    return this.loadingPromises.has(url)
  }

  // 清理缓存
  clearCache(): void {
    this.cachedVideos.forEach((video, url) => {
      console.log(`[VideoCache] 清理缓存视频: ${url}`)
      video.pause()
      video.src = ''
      video.load()
    })
    this.cachedVideos.clear()
    this.loadingPromises.clear()
    this.preloadStarted.clear()
    console.log('[VideoCache] 所有缓存已清理')
  }

  // 获取缓存统计信息
  getCacheStats(): { cached: number, loading: number, preloadStarted: number } {
    return {
      cached: this.cachedVideos.size,
      loading: this.loadingPromises.size,
      preloadStarted: this.preloadStarted.size
    }
  }
}