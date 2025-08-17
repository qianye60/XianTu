import { message as antMessage } from 'ant-design-vue';

// 定义消息类型的联合类型
type MessageType = 'success' | 'error' | 'warning' | 'info';

/**
 * @description 封装 Ant Design Vue message 的 Toast 管理器
 * 保持与旧版 toast 对象相同的 API，以便无缝替换
 */
class ToastManager {
  /**
   * 内部核心方法，用于调用 antd message
   * @param type - 消息类型
   * @param content - 消息内容
   * @param duration - 显示时长（秒）
   */
  private show(type: MessageType, content: string, duration: number = 3) {
    antMessage[type]({
      content: content,
      duration: duration,
    });
  }

  /**
   * 显示成功提示
   * @param message - 消息内容
   * @param duration - 显示时长（秒）
   */
  success(message: string, duration?: number) {
    this.show('success', message, duration);
  }

  /**
   * 显示错误提示
   * @param message - 消息内容
   * @param duration - 显示时长（秒）
   */
  error(message: string, duration?: number) {
    this.show('error', message, duration);
  }

  /**
   * 显示警告提示
   * @param message - 消息内容
   * @param duration - 显示时长（秒）
   */
  warning(message: string, duration?: number) {
    this.show('warning', message, duration);
  }

  /**
   * 显示信息提示
   * @param message - 消息内容
   * @param duration - 显示时长（秒）
   */
  info(message: string, duration?: number) {
    this.show('info', message, duration);
  }
}

// 导出单例，供全局使用
export const toast = new ToastManager();