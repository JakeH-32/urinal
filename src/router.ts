import { useEffect, useState } from 'react';

export type Route =
  | { name: 'menu' }
  | { name: 'daily' }
  | { name: 'practice'; code?: string }
  | { name: 'how' }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'devScene' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  const [head, arg, ...rest] = path.split('/');
  switch (head) {
    case 'daily':
      return { name: 'daily' };
    case 'practice': {
      const code = arg ? safeDecode(arg).trim() : '';
      return code ? { name: 'practice', code } : { name: 'practice' };
    }
    case 'how':
      return { name: 'how' };
    case 'stats':
      return { name: 'stats' };
    case 'settings':
      return { name: 'settings' };
    case 'dev':
      return arg === 'scene' && rest.length === 0 ? { name: 'devScene' } : { name: 'menu' };
    default:
      return { name: 'menu' };
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'menu':
      return '#/';
    case 'practice':
      return route.code ? `#/practice/${encodeURIComponent(route.code)}` : '#/practice';
    case 'devScene':
      return '#/dev/scene';
    default:
      return `#/${route.name}`;
  }
}

/** Absolute shareable URL for a route (used by share buttons). */
export function routeUrl(route: Route): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${routeToHash(route)}`;
}

export function navigate(route: Route, opts: { replace?: boolean } = {}): void {
  const hash = routeToHash(route);
  if (window.location.hash === hash) return;
  if (opts.replace) {
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', `${pathname}${search}${hash}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
