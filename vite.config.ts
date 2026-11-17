import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The crowd-stats backend's origin (https://xyz.supabase.co) for the CSP connect-src, or null when it's
 * unset or isn't a plain https/localhost URL (src/net/config.ts refuses those too, so nothing is lost).
 */
function backendOrigin(raw: string | undefined): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    const local = u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    if (u.protocol !== 'https:' && !local) return null;
    // URL.origin is already normalized (no path, no quotes or spaces), so it can't break out of the policy.
    return /^[a-z]+:\/\/[a-z0-9.\-:[\]]+$/i.test(u.origin) ? u.origin : null;
  } catch {
    return null;
  }
}

/**
 * Production builds get a Content-Security-Policy <meta> (GitHub Pages can't send headers). Dev is left
 * alone: Vite's dev server needs inline scripts and a websocket for hot reload.
 * Allowed: our own scripts and styles, Google Fonts, data:/blob: images (the share cards), and the
 * Supabase origin from the build env. Everything else, including inline <script>, is blocked.
 * (frame-ancestors, X-Frame-Options and other header-only protections can't be set from a meta tag.)
 */
function contentSecurityPolicy(supabaseUrl: string | undefined): Plugin {
  const backend = backendOrigin(supabaseUrl);
  const policy = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data: blob:",
    `connect-src 'self'${backend ? ` ${backend}` : ''}`,
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
  return {
    name: 'urinal-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }],
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    // Relative asset paths: the site is served from a subpath on GitHub Pages (/urinal/).
    base: './',
    plugins: [react(), contentSecurityPolicy(env.VITE_SUPABASE_URL)],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  };
});
