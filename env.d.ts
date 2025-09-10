/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface TavernHelper {
  // 根据实际使用情况定义更具体的类型
  post: (message: { type: string; [key: string]: unknown }) => void;
  // 其他可能的方法...
}

// 为 Window 接口添加 TavernHelper 属性
interface Window {
  TavernHelper?: TavernHelper;
}

// Global declarations for Tavern-Helper and lodash
declare const triggerSlash: (command: string) => Promise<void>;

// @types/lodash 应该会自动提供全局 _ 的类型, 所以这里不再需要显式声明
// declare const _: any;

declare const APP_VERSION: string;