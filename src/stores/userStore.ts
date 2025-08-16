import { defineStore } from 'pinia';
import { ref } from 'vue';
import { request } from '@/services/request';

interface User {
  id: number;
  user_name: string;
  is_banned: boolean;
  // Add other user properties as needed
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);

  async function loadUserInfo() {
    try {
      // The request function should handle the full URL construction
      const response = await request<User>('/api/v1/auth/me');
      user.value = response;
    } catch (error) {
      console.error('加载用户信息失败:', error);
      user.value = null;
    }
  }

  return {
    user,
    loadUserInfo,
  };
});