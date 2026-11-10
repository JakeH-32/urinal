// Small lines for the end-of-day results screen: what was spotted today, tomorrow's venue, a saved streak.
import { useMemo } from 'react';
import type { Round } from '../types';
import { dailyRounds } from '../engine/generate';
import { useSave } from '../state/SaveContext';
import { shiftDateKey, streakSavedYesterday } from '../state/dailyStreak';
import { daySightings } from '../state/sightings';
import './DayExtras.css';

/** The rare characters and rooms in today's bathrooms. Renders nothing on an ordinary day. */
export function DaySightings({ rounds, label = 'Spotted today' }: { rounds: readonly Round[]; label?: string }) {
  const seen = useMemo(() => daySightings(rounds), [rounds]);
  if (seen.length === 0) return null;
  return (
    <p className="day-extra day-sightings">
      <span className="day-extra-lead">
        <span aria-hidden="true">👀 </span>
        {label}:
      </span>
      {seen.map((s) => (
        <span key={s.id} className="day-sighting" title={s.rarity}>
          <span aria-hidden="true">{s.emoji} </span>
          {s.label}
        </span>
      ))}
    </p>
  );
}

/** Where tomorrow's last bathroom is. The venue only: never the room, who's in it or what's going on. */
export function TomorrowTease({ todayKey }: { todayKey: string }) {
  const venue = useMemo(() => {
    try {
      const rounds = dailyRounds(shiftDateKey(todayKey, 1));
      return rounds[rounds.length - 1]?.venue ?? '';
    } catch {
      return '';
    }
  }, [todayKey]);
  if (!venue) return null;
  return (
    <p className="day-extra day-tease">
      <span className="day-extra-lead">Tomorrow:</span>
      <span className="day-tease-venue">{venue}</span>
    </p>
  );
}

/** One line on the day a missed yesterday was forgiven. Renders nothing otherwise. */
export function StreakSaved({ todayKey }: { todayKey: string }) {
  const { save } = useSave();
  if (!streakSavedYesterday(save, todayKey)) return null;
  return <p className="day-extra day-streak-saved">Missed yesterday. Streak saved.</p>;
}
