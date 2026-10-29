import { useMemo } from 'react';
import { useSave } from '../state/SaveContext';
import { displayStreak, toDateKey } from '../state/dailyStreak';
import { dailyStats } from '../modes/roundLogic';
import { LinkButton } from './Button';
import { HydrationBar } from './HydrationChart';

export function Stats() {
  const { save } = useSave();
  const todayKey = toDateKey(new Date());
  const st = useMemo(() => dailyStats(save, todayKey), [save, todayKey]);
  const max = Math.max(1, ...st.distribution);
  const p = save.practice;

  const tiles: [string, string][] = [
    ['Played', String(st.played)],
    ['Perfect days', String(st.perfect)],
    ['Avg clears', st.played ? st.avgClears.toFixed(1) : '–'],
    ['Streak', String(displayStreak(save.daily, todayKey))],
    ['Best streak', String(save.daily.bestStreak)],
  ];

  return (
    <div className="stats">
      <h1 className="page-title">Stats</h1>

      <section className="card">
        <dl className="stat-grid">
          {tiles.map(([label, value]) => (
            <div key={label} className="stat">
              <dd className="stat-value">{value}</dd>
              <dt className="stat-label">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="card">
        <h2 className="h3">Clears per day</h2>
        {st.played === 0 ? (
          <p className="muted">Finish a daily to see this.</p>
        ) : (
          <ol className="dist" aria-label="Distribution of clears per finished day">
            {st.distribution.map((n, g) => (
              <li key={g} className={`dist-row${st.todayClears === g ? ' is-today' : ''}`}>
                <span className="dist-label">{g}</span>
                <span className="dist-track">
                  <span className="dist-bar" style={{ width: `${Math.max(7, (n / max) * 100)}%` }}>
                    {n}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card">
        <h2 className="h3">Every daily pick</h2>
        <HydrationBar counts={st.lifetime} />
      </section>

      <section className="card">
        <h2 className="h3">Endless</h2>
        <dl className="stat-grid">
          <div className="stat">
            <dd className="stat-value">{p.played}</dd>
            <dt className="stat-label">Bathrooms</dt>
          </div>
          <div className="stat">
            <dd className="stat-value">{p.played ? `${Math.round((p.greens / p.played) * 100)}%` : '–'}</dd>
            <dt className="stat-label">Clear</dt>
          </div>
          <div className="stat">
            <dd className="stat-value">{p.bestRun}</dd>
            <dt className="stat-label">Best run</dt>
          </div>
        </dl>
      </section>

      <div className="row row--center">
        <LinkButton href="#/">Menu</LinkButton>
      </div>
    </div>
  );
}
