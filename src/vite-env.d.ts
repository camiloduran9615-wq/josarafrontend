/// <reference types="vite/client" />

// Branding expuesto al build (single source of truth en runtime: GET /api/platform)
interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_SHORT_NAME?: string
  readonly VITE_APP_TAGLINE?: string
  readonly VITE_APP_DESCRIPTION?: string
  readonly VITE_APP_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.css' {
  const content: string
  export default content
}
