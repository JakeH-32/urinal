# 🚽 Urinal

> There is a correct urinal.

**Play it: https://jakeh-32.github.io/urinal/**

A daily puzzle about the urinal code: you don't take the urinal next to another man. Each day has six bathrooms, from easy to hard, and everyone gets the same six. Tap a spot, walk in, and get graded:

- ⬜ Clear: the urinal code's answer
- 🟨 Lemonade: legal, but not the best spot
- 🟧 Apple Juice: you broke the urinal code
- 🟫 See a Doctor: you broke it badly

Finish all six to get a score out of 6, a rank and a share card. Practice mode has endless bathrooms, each with a share code (`#/practice/K7Q2XM`).

The rules are written down in `src/types.ts` and implemented in `src/engine/code.ts`.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest
npm run build      # typecheck + production build into dist/
```

It's a static site (Vite + React + TypeScript) with no backend. Progress is saved in `localStorage`. Every push to `main` is tested, built and deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Layout

| Path | What |
|---|---|
| `src/engine` | The urinal code (grading), the seeded bathroom generator, daily numbering, share text |
| `src/content` | Names, venues, verdict lines, rank titles, how-to-play copy |
| `src/scene` | The side-view SVG bathroom (`#/dev/scene` shows a gallery) |
| `src/modes` | Daily and Practice |
| `src/ui` | Menu, How to play, Stats, Settings and shared components |
| `src/state` | Save data, migration, streaks |
| `src/audio` | WebAudio sound effects, synthesized at runtime |
