import { createApp } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import App from './app.vue';
import Diary from './日记.vue';
import RoleplayOptions from './选择框.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/日记', component: Diary },
    { path: '/选择框', component: RoleplayOptions },
  ],
});
router.replace('/日记');

$(() => {
  createApp(App).use(router).mount('#app');
});
