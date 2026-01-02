/// <reference types="webpack-env" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // Use broad types here so TS doesn't over-restrict props in templates
  const component: DefineComponent<any, any, any>
  export default component
}

declare const APP_VERSION: string;
declare const BACKEND_BASE_URL: string;

// Augment Window with TavernHelper from tavernCore
type TavernHelper = import('./utils/tavernCore').TavernHelper;
interface Window {
  TavernHelper?: TavernHelper;

  // Cloudflare Turnstile
  turnstile?: {
    render: (container: HTMLElement, params: Record<string, unknown>) => string;
    reset: (widgetId?: string) => void;
    remove?: (widgetId: string) => void;
  };
  turnstileCallbacks?: Array<() => void>;
  onTurnstileLoad?: () => void;
}
