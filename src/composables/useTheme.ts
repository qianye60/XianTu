import { ref, onMounted, watch } from 'vue'

type Theme = 'light' | 'dark'

const theme = ref<Theme>('light')

export function useTheme() {
  const initializeTheme = () => {
    const storedTheme = localStorage.getItem('theme') as Theme | null

    if (storedTheme) {
      theme.value = storedTheme
    } else {
      // Auto-detect based on time of day (e.g., 6 PM to 6 AM is dark)
      const currentHour = new Date().getHours()
      theme.value = currentHour >= 18 || currentHour < 6 ? 'dark' : 'light'
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
