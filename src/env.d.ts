/// <reference types="vite/client" />
/// <reference types="webpack-env" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // Use broad types here so TS doesn't over-restrict props in templates
  const component: DefineComponent<any, any, any>
  export default component
}
