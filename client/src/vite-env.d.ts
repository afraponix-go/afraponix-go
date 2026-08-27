/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth Client ID for "Sign in with Google" (optional). */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
