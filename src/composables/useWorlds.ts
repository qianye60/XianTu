import { ref, onMounted } from 'vue'
import { getWorlds } from '@/services/api'
import type { World } from '@/services/api'

export function useWorlds() {
  const worlds = ref<World[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchWorlds = async () => {
    isLoading.value = true
    error.value = null
    try {
      console.log('【寰宇图】开始从云端获取世界列表...')
      const response = await getWorlds()
      worlds.value = response
      console.log(`【寰宇图】成功获取 ${response.length} 个世界。`)
    } catch (e: any) {
      console.error('【寰宇图】获取世界列表失败:', e)
      error.value = e.message || '获取世界列表失败，请检查网络或联系方士。'
    } finally {
      isLoading.value = false
    }
  }

  return {
    worlds,
    isLoading,
    error,
    fetchWorlds,
  }
}
