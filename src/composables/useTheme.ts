import { ref, onMounted, watch } from 'vue'

type Theme = 'light' | 'dark'

const theme = ref<Theme>('dark') // 遵道友法旨，默认为“月映寒潭”（暗色主题）

export function useTheme() {
  const initializeTheme = () => {
    const storedTheme = localStorage.getItem('theme') as Theme | null

    if (storedTheme) {
      theme.value = storedTheme
    } else {
      // 遵道友法旨，若无记忆，则此界默认为“月映寒潭”（暗色主题）
      theme.value = 'dark'
    }
  }

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  watch(
    theme,
    (newTheme) => {
      if (newTheme === 'dark') {
        document.body.classList.add('dark-theme')
      } else {
        document.body.classList.remove('dark-theme')
      }
    },
    { immediate: true },
  )

  return {
    theme,
    toggleTheme,
    initializeTheme,
  }
}
