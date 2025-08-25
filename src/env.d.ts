/// <reference types="vite/client" />
/// <reference types="webpack-env" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
