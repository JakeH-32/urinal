// Copy for the crowd-stats lines (rendered by src/ui/Crowd.tsx). Pure, so it's tested without a DOM.
// Deadpan, per docs/VOICE.md. Says "players", uses 1-based spot numbers, and stays sensible with 1-5 players.
import { betterThan, withFinish, withPick, type DayCrowd, type RoundCrowd } from './community';

const spot = (i: number) => `#${i + 1}`;
const fmt = (n: number) => n.toLocaleString('en-US');

/** "38%", never a misleading "0%" or "100%" for a share that isn't zero or everyone. */
export function pctText(n: number, total: number): string {
  if (!(total > 0) || !(n > 0)) return '0%';
  const p = (n / total) * 100;
  if (p < 1) return '<1%';
  if (n < total && p >= 99.5) return '99%';
  return `${Math.round(p)}%`;
}

/** Most-picked slot other than `pick`. Ties go to a Clear spot, then the lower number. */
function topOther(bySlot: readonly number[], pick: number, greens: readonly number[]): { i: number; n: number } {
  let best = { i: -1, n: 0 };
  bySlot.forEach((n, i) => {
    if (i === pick || !(n > 0)) return;
    if (n > best.n || (n === best.n && greens.includes(i) && !greens.includes(best.i))) best = { i, n };
  });
  return best;
}

const validPick = (pick: number) => Number.isInteger(pick) && pick >= 0;

/** One line under the round verdict. '' when there's nothing sensible to say. */
export function roundCrowdText(crowd: RoundCrowd, pick: number, greens: readonly number[] = []): string {
  if (!validPick(pick)) return '';
  const c = withPick(crowd, pick);
  const total = c.total;
  const mine = c.bySlot[pick] ?? 0;
  const you = spot(pick);
  if (total <= 1) return 'You’re the first one in today.';
  if (mine >= total) return total === 2 ? `The other player picked ${you} too.` : `All ${fmt(total)} players picked ${you}.`;
  const top = topOther(c.bySlot, pick, greens);
  if (top.i < 0) return '';
  if (total === 2) return `The other player went with ${spot(top.i)}.`;
  const myPct = pctText(mine, total);
  if (mine > top.n) return `You picked with the crowd: ${myPct} chose ${you}.`;
  if (mine === top.n) return `${myPct} of players picked this spot. Just as many went with ${spot(top.i)}.`;
  const found = greens.includes(pick);
  const lead =
    mine <= 1
      ? found
        ? 'Nobody else found this spot.'
        : 'Nobody else picked this spot.'
      : found
        ? `Only ${myPct} of players found this spot.`
        : `${myPct} of players picked this spot.`;
  const topPct = pctText(top.n, total);
  const tail = top.n * 2 > total ? `Most went with ${spot(top.i)} (${topPct}).` : `The crowd favorite was ${spot(top.i)} (${topPct}).`;
  return `${lead} ${tail}`;
}

/** Results card: a main line plus a small "N players" note (null when there's no one else to count). */
export function daySummaryText(crowd: DayCrowd, points: number): { main: string; note: string | null } {
  const hist = withFinish(crowd.points, points);
  const finished = hist.reduce((a, b) => a + b, 0);
  const players = Math.max(crowd.players, finished);
  const pct = betterThan(points, hist);
  if (pct === null) {
    return {
      main: 'You’re the first one done today. Check back later.',
      note: players > 1 ? `${fmt(players)} players so far today` : null,
    };
  }
  let main: string;
  if (finished === 2) {
    main =
      pct >= 100
        ? 'Better hydrated than the other player today.'
        : pct <= 0
          ? 'The other player was better hydrated today.'
          : 'Exactly as hydrated as the other player today.';
  } else {
    main = `Better hydrated than ${pct}% of players today.`;
  }
  const note = finished >= players ? `${fmt(players)} players today` : `${fmt(finished)} of ${fmt(players)} players finished`;
  return { main, note };
}

/** One review row: "You: #4 · Most: #7 (80%)". */
export function reviewCrowdText(crowd: RoundCrowd, pick: number): string {
  if (!validPick(pick)) return '';
  const c = withPick(crowd, pick);
  const mine = c.bySlot[pick] ?? 0;
  const you = `You: ${spot(pick)}`;
  if (c.total <= 1) return `${you} · Nobody else yet`;
  if (mine >= c.total) return `${you} · Everyone (${pctText(mine, c.total)})`;
  const top = topOther(c.bySlot, pick, []);
  if (top.i < 0) return '';
  if (mine > top.n) return `${you} · With the crowd (${pctText(mine, c.total)})`;
  if (mine === top.n) return `${you} · Tied with ${spot(top.i)} (${pctText(top.n, c.total)})`;
  return `${you} · Most: ${spot(top.i)} (${pctText(top.n, c.total)})`;
}
