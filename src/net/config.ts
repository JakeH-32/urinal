// Crowd stats backend (Supabase) config, read from the build environment.
// Both values are public by design: the anon/publishable key can only do what the database's
// row-level security allows (insert picks and finishes, call day_stats). See docs/STATS.md.
// The feature is on only when BOTH are set; otherwise it stays invisible and makes no requests.

export interface CommunityConfig {
  /** Project URL with no trailing slash, e.g. https://abcd1234.supabase.co */
  url: string;
  /** The project's anon (legacy) or publishable key. */
  key: string;
}

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

const HTTPS_URL = /^https:\/\/[^\s/?#]+(\/[^\s?#]*)?$/i;
const LOCAL_URL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
/** Header-safe: printable ASCII, no spaces. */
const KEY_RE = /^[\x21-\x7e]+$/;

/** Read at call time (not module load) so tests can stub the env. Never throws. */
export function communityConfig(): CommunityConfig | null {
  try {
    const url = clean(import.meta.env.VITE_SUPABASE_URL)
      .replace(/\/+$/, '')
      .replace(/\/rest\/v1$/i, '');
    const key = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);
    if (!url || !key) return null;
    if (!HTTPS_URL.test(url) && !LOCAL_URL.test(url)) return null;
    if (!KEY_RE.test(key)) return null;
    return { url, key };
  } catch {
    return null;
  }
}
