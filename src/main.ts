import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'ol/ol.css'
import './style.css'
import './styles/panel-theme.css'
import './styles/theme-overrides.css'
import './utils/consolePatch'
import { migrateData } from './utils/indexedDBManager'
import { useI18n } from './i18n'

async function initializeApp() {
  console.log('【应用启动】开始初始化流程...');

  // 首先执行数据迁移检查
  await migrateData();

  console.log('【应用启动】数据迁移检查完成，开始挂载Vue应用');
  const app = createApp(App);

  // 全局注册 i18n
  const { t } = useI18n();
  app.config.globalProperties.$t = t;

  // 全局混入，让所有组件都能使用 t 函数
  app.mixin({
    methods: {
      t(key: string): string {
        return t(key);
      }
    }
  });

  app.use(createPinia());
  app.use(router);
  app.mount('#app');

  console.log('【应用启动】✅ Vue应用已成功挂载');
}

initializeApp();



