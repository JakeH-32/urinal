// App shell: providers, top bar, hash-route switch.
import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { routeToHash, useRoute, type Route } from './router';
import { sfx } from './audio/sfx';
import { SaveProvider, useSave } from './state/SaveContext';
import { ToastProvider } from './ui/Toast';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { useReducedMotion } from './ui/hooks';
import { Menu } from './ui/Menu';
import { HowToPlay } from './ui/HowToPlay';
import { Stats } from './ui/Stats';
import { Settings } from './ui/Settings';
import { Daily } from './modes/Daily';
import { Practice } from './modes/Practice';

// Hidden dev route (#/dev/scene). import.meta.glob resolves to {} if the file doesn't exist,
// so the build doesn't depend on the Scene agent shipping a gallery.
type GalleryModule = { SceneGallery?: ComponentType; default?: ComponentType };
const galleryLoaders = import.meta.glob<GalleryModule>('./scene/SceneGallery.tsx');
const loadGallery = galleryLoaders['./scene/SceneGallery.tsx'];
const SceneGallery = loadGallery
  ? lazy(async () => {
      const m = await loadGallery();
      const C = m.SceneGallery ?? m.default;
      return { default: C ?? (() => <p>SceneGallery has no export.</p>) };
    })
  : null;

const TITLES: Record<Route['name'], string> = {
  menu: 'Urinal',
  daily: 'Daily · Urinal',
  practice: 'Practice · Urinal',
  how: 'How to play · Urinal',
  stats: 'Stats · Urinal',
  settings: 'Settings · Urinal',
  devScene: 'Scene gallery · Urinal',
};

export function App() {
  return (
    <ToastProvider>
      <SaveProvider>
        <Shell />
      </SaveProvider>
    </ToastProvider>
  );
}

function RouteView({ route }: { route: Route }) {
  switch (route.name) {
    case 'menu':
      return <Menu />;
    case 'daily':
      return <Daily />;
    case 'practice':
      return <Practice key={route.code ?? ''} code={route.code} />;
    case 'how':
      return <HowToPlay />;
    case 'stats':
      return <Stats />;
    case 'settings':
      return <Settings />;
    case 'devScene':
      return SceneGallery ? (
        <Suspense fallback={<p className="center muted">Loading scene gallery…</p>}>
          <SceneGallery />
        </Suspense>
      ) : (
        <p className="center muted">No scene gallery in this build.</p>
      );
  }
}

function Shell() {
  const route = useRoute();
  const { save, update } = useSave();
  const reducedMotion = useReducedMotion();
  const sound = save.settings.sound;

  useEffect(() => {
    sfx.setMuted(!sound);
  }, [sound]);

  // Mobile browsers only allow audio after a user gesture.
  useEffect(() => {
    const unlock = () => {
      sfx.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  useEffect(() => {
    document.title = TITLES[route.name];
  }, [route.name]);

  const toggleSound = () => {
    const next = !sound;
    sfx.setMuted(!next);
    if (next) sfx.play('click');
    update((s) => ({ ...s, settings: { ...s.settings, sound: next } }));
  };

  return (
    <div className={`app${reducedMotion ? ' reduce-motion' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {/* Two buttons each side so the title sits dead center at every width. */}
      <header className="topbar">
        <div className="topbar-side topbar-left">
          <a className="topbar-btn" href="#/" aria-label="Menu">
            <span aria-hidden="true">🚽</span>
          </a>
          <button
            type="button"
            className="topbar-btn"
            onClick={toggleSound}
            aria-pressed={!sound}
            aria-label={sound ? 'Mute sound' : 'Unmute sound'}
            title={sound ? 'Mute' : 'Unmute'}
          >
            <span aria-hidden="true">{sound ? '🔊' : '🔇'}</span>
          </button>
        </div>
        <a className="topbar-title" href="#/">
          URINAL
        </a>
        <div className="topbar-side topbar-right">
          <a className="topbar-btn" href="#/how" aria-label="How to play">
            <span aria-hidden="true">?</span>
          </a>
          <a className="topbar-btn" href="#/stats" aria-label="Stats">
            <span aria-hidden="true">📊</span>
          </a>
        </div>
      </header>
      <main className={`page page--${route.name}`} id="main" tabIndex={-1}>
        <ErrorBoundary resetKey={routeToHash(route)}>
          <RouteView route={route} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
