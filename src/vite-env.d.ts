/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/info" />

// Injected at build time by `define` in vite.config.ts.
declare const __APP_VERSION__: string
declare const __BUILD_SHA__: string
declare const __BUILD_TIME__: string
