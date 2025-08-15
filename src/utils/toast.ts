import { createApp, h } from 'vue';
import Toast from '../components/SystemToast.vue';

export interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

class ToastManager {
  show(options: ToastOptions | string) {
    const props = typeof options === 'string' 
      ? { message: options } 
      : options;

    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp({
      render() {
        return h(Toast, {
          ...props,
          onClose: () => {
            app.unmount();
            document.body.removeChild(container);
          }
        });
      }
    });

    app.mount(container);
  }

  success(message: string, duration?: number) {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration?: number) {
    this.show({ message, type: 'error', duration });
  }

  warning(message: string, duration?: number) {
    this.show({ message, type: 'warning', duration });
  }

  info(message: string, duration?: number) {
    this.show({ message, type: 'info', duration });
  }
}

export const toast = new ToastManager();