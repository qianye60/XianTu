/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'leaflet.markercluster' {
  import * as L from 'leaflet'
  export = L
}

// 全局属性声明
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  // 在此处添加更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}