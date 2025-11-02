/**
 * 授权验证服务
 * 用于游戏内定期验证授权状态
 */

import { AUTH_CONFIG } from '@/config/authConfig';
import { generateMachineCode } from '@/utils/machineCode';
import { toast } from '@/utils/toast';

class AuthService {
  private intervalId: number | null = null;
  private readonly VERIFY_INTERVAL = 30 * 60 * 1000; // 30分钟验证一次

  /**
   * 启动定期验证
   */
  startPeriodicVerification() {
    if (!AUTH_CONFIG.ENABLE_AUTH) {
      console.log('[AuthService] 授权验证未启用');
      return;
    }

    // 清除之前的定时器
    this.stopPeriodicVerification();

    console.log('[AuthService] 启动定期验证，间隔:', this.VERIFY_INTERVAL / 1000 / 60, '分钟');

    // 立即验证一次
    this.verifyAuth();

    // 设置定时验证
    this.intervalId = window.setInterval(() => {
      this.verifyAuth();
    }, this.VERIFY_INTERVAL);
  }

  /**
   * 停止定期验证
   */
  stopPeriodicVerification() {
    if (this.intervalId !== null) {
      console.log('[AuthService] 停止定期验证');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 执行授权验证
   */
  private async verifyAuth() {
    try {
      const machineCode = localStorage.getItem('auth_machine_code');
      const appId = localStorage.getItem('auth_app_id');

      if (!machineCode || !appId) {
        console.warn('[AuthService] 本地授权信息不完整');
        this.handleAuthFailure('本地授权信息不完整');
        return;
      }

      console.log('[AuthService] 开始定期验证...');

      const response = await fetch(`${AUTH_CONFIG.SERVER_URL}/server.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          app_id: appId,
          machine_code: machineCode
        })
      });

      if (!response.ok) {
        console.warn('[AuthService] 服务器返回错误:', response.status);
        this.handleAuthFailure('服务器验证失败');
        return;
      }

      const result = await response.json();

      if (result.success && result.data?.authorized) {
        // 验证成功
        console.log('[AuthService] 定期验证通过');
        localStorage.setItem('auth_verified', 'true');
        localStorage.setItem('auth_expires_at', result.data.expires_at || '');
      } else {
        // 验证失败
        console.warn('[AuthService] 授权已失效');
        this.handleAuthFailure('授权已失效');
      }
    } catch (error) {
      console.error('[AuthService] 验证异常:', error);
      this.handleAuthFailure('网络错误');
    }
  }

  /**
   * 处理授权失败
   */
  private handleAuthFailure(reason: string) {
    console.warn('[AuthService] 授权失败:', reason);

    // 清除本地授权
    localStorage.removeItem('auth_verified');
    localStorage.removeItem('auth_app_id');
    localStorage.removeItem('auth_machine_code');
    localStorage.removeItem('auth_expires_at');

    // 停止定期验证
    this.stopPeriodicVerification();

    // 提示用户
    toast.error(`授权验证失败：${reason}，请重新登录`);

    // 跳转到首页
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  }
}

// 导出单例
export const authService = new AuthService();
