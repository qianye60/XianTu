import { ref, readonly } from 'vue';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string | number;
  type: ToastType;
  message: string;
  duration?: number;
}

const toasts = ref<Toast[]>([]);

let toastCounter = 0;

const hide = (id: string | number) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
};

const addToast = (type: ToastType, message: string, options: { id?: string | number, duration?: number } = {}) => {
  const id = options.id || `toast-${toastCounter++}`;
  hide(id);

  const duration = options.duration ?? (type === 'loading' ? undefined : 3000);

  const newToast: Toast = {
    id,
    type,
    message,
    duration,
  };

  toasts.value.push(newToast);

  if (duration !== undefined) {
    setTimeout(() => {
      hide(id);
    }, duration);
  }

  return id;
};

const success = (message: string, options: { id?: string | number, duration?: number } = {}) => {
  return addToast('success', message, options);
};

const error = (message: string, options: { id?: string | number, duration?: number } = {}) => {
  return addToast('error', message, options);
};

const warning = (message: string, options: { id?: string | number, duration?: number } = {}) => {
  return addToast('warning', message, options);
};

const info = (message: string, options: { id?: string | number, duration?: number } = {}) => {
  return addToast('info', message, options);
};

const loading = (message: string, options: { id?: string | number, duration?: number } = {}) => {
  const duration = options.duration === undefined ? undefined : options.duration;
  return addToast('loading', message, { ...options, duration });
};


export const toast = {
  success,
  error,
  warning,
  info,
  loading,
  hide,
};

export const toastsReadonly = readonly(toasts);
