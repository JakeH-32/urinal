/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL for crowd stats (public). Unset = the feature is off. See docs/STATS.md. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/publishable key for crowd stats (public by design). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
