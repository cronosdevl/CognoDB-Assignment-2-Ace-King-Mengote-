/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Wayfinder API. Empty in development (the Vite proxy handles /api). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
