import { ComponentCustomProperties } from 'vue'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: (key: string) => string
  }
}

// 扩展全局 Window 接口
declare global {
  interface Window {
    __mainGamePanel_eventListenersRegistered__?: boolean;
    __mainGamePanel_eventHandlers__?: {
      onGenerationStarted?: (generationId: string) => void;
      onStreamToken?: (chunk: string, generationId: string) => void;
      onGenerationEnded?: (generationId: string) => void;
    };
    TavernHelper?: {
      iframe_events: {
        [key: string]: string;
      };
    };
    eventOn?: (event: string, handler: (...args: any[]) => void) => void;
    eventOff?: (event: string, handler: (...args: any[]) => void) => void;
  }
}

export {}
