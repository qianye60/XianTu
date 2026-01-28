/**
 * 仙途 (XianTu) - AI驱动的沉浸式修仙文字冒险游戏
 *
 * @author 千夜 (qianye60)
 * @license CC BY-NC-SA 4.0
 * @copyright Copyright (c) 2024-2026 千夜. All rights reserved.
 *
 * 本项目采用 CC BY-NC-SA 4.0 协议开源
 * 商业使用需经作者授权，转载请注明出处
 *
 * GitHub: https://github.com/qianye60
 * Bilibili: https://space.bilibili.com/477576651
 *
 * This project is licensed under CC BY-NC-SA 4.0
 * Commercial use requires author's permission.
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import './styles/panel-theme.css'
import './styles/theme-overrides.css'
import './styles/design-system.css'
import './utils/consolePatch'
import { migrateData } from './utils/indexedDBManager'
import { useI18n } from './i18n'
import { flushPendingTravelNotes } from '@/services/onlineLogQueue'

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

  // 尝试补发联机穿越日志（网络波动/短暂掉线时的兜底）
  void flushPendingTravelNotes();

  console.log('【应用启动】✅ Vue应用已成功挂载');
}

initializeApp();


