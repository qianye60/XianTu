/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // Use broad types here so TS doesn't over-restrict props in templates
  const component: DefineComponent<any, any, any>
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
