import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useTheme } from './composables/useTheme'
import './style.css'

// Initialize theme before creating the app
const { initializeTheme } = useTheme()
initializeTheme()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

