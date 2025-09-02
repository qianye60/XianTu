import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router' // 导入路由
import 'ol/ol.css';
import './style.css'
import './styles/panel-theme.css'

const app = createApp(App)
app.use(createPinia())
app.use(router) // 使用路由
app.mount('#app')

