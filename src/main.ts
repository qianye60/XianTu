import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'ol/ol.css';
import './style.css'
import './styles/panel-theme.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

