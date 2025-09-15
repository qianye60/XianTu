import { ref } from 'vue';

export type MessageType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: MessageType;
  message: string;
  duration?: number;
}

// 响应式状态，存储所有活动的 toast
const toasts = ref<Toast[]>([]);

// 短时去重：在很短时间窗口内阻止相同消息重复弹出
const RECENT_WINDOW_MS = 1500;
const recentToastMap: Map<string, number> = new Map();
const makeDedupKey = (type: MessageType, message: string) => `${type}::${message}`;
const shouldDedup = (type: MessageType, message: string) => {
  const key = makeDedupKey(type, message);
  const now = Date.now();
  const last = recentToastMap.get(key) || 0;
  if (now - last < RECENT_WINDOW_MS) return true;
  recentToastMap.set(key, now);
  // 清理过期记录
  for (const [k, t] of recentToastMap) {
    if (now - t > RECENT_WINDOW_MS * 4) recentToastMap.delete(k);
  }
  return false;
};

// --- 内部辅助函数 ---
let toastCounter = 0;
const generateId = () => `toast-${Date.now()}-${toastCounter++}`;

/**
 * 移除一个 toast
 * @param id 要移除的 toast 的ID
 */
const removeToast = (id: string) => {
  toasts.value = toasts.value.filter(t => t.id !== id);
};

/**
 * @description 新版 Toast 管理器，基于响应式状态
 */
class ToastManager {
  /**
   * 核心方法，用于显示或更新 Toast
   * @param type - 消息类型
   * @param content - 消息内容
   * @param options - 选项，包含 duration / id
   */
  private show(type: MessageType, message: string, options: { duration?: number; id?: string } = {}) {
    // 减少默认显示时间为2.5秒
    const { duration = 2500, id } = options;

    // 去重：同类型同文案的消息在短时间内仅显示一次
    if (!id && shouldDedup(type, message)) {
      return;
    }

    // 如果提供了 id，则尝试查找并更新现有 toast
    if (id) {
      const existingToast = toasts.value.find(t => t.id === id);
      if (existingToast) {
        // 更新内容和类型
        existingToast.message = message;
        existingToast.type = type;
        
        // 如果不是 loading，重新设置销毁计时器
        if (type !== 'loading') {
          setTimeout(() => removeToast(id), duration);
        }
        return;
      }
    }

    // 创建新的 toast
    const newToast: Toast = {
      id: id || generateId(),
      type,
      message,
      duration,
    };

    toasts.value.push(newToast);

    // 如果不是 loading 类型，则在指定时间后自动销毁
    if (type !== 'loading') {
      setTimeout(() => removeToast(newToast.id), duration);
    }
  }

  success(message: string, options: { duration?: number; id?: string } = {}) {
    this.show('success', message, options);
  }

  error(message: string, options: { duration?: number; id?: string } = {}) {
    this.show('error', message, options);
  }

  warning(message: string, options: { duration?: number; id?: string } = {}) {
    this.show('warning', message, options);
  }

  info(message: string, options: { duration?: number; id?: string } = {}) {
    this.show('info', message, options);
  }

  /**
   * 显示一个持续的 loading 提示
   * @param message - 消息内容
   * @param options - 必须包含一个唯一的 id
   */
  loading(message: string, options: { id: string }) {
    this.show('loading', message, { ...options, duration: 999999 }); // loading 持续时间很长
  }

  /**
   * 通过 id 隐藏一个 toast，主要用于 loading
   * @param id 要隐藏的 toast 的 id
   */
  hide(id: string) {
    removeToast(id);
  }
}

// 导出响应式数组，供 Vue 组件使用
export { toasts };

// 导出单例管理器，供业务逻辑使用
export const toast = new ToastManager();
